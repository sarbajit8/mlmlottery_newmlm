import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';

const senderSelect = { id: true, name: true, role: true } as const;

export interface SendMessageInput {
  message: string;
  agentId?: number;
}

/** One shared thread per agent — any admin can reply, and a reply from any admin marks the whole
 *  thread read-by-admin (it's a shared inbox, not per-admin). Agents can only ever write to their
 *  own thread; admins must say which agent's thread they're replying to. */
export async function sendMessage(sender: { id: number; role: 'AGENT' | 'SUPER_ADMIN' }, input: SendMessageInput) {
  let agentId: number;
  if (sender.role === 'AGENT') {
    agentId = sender.id;
  } else {
    if (!input.agentId) throw ApiError.badRequest('agentId is required when an admin sends a support message');
    const agent = await prisma.user.findUnique({ where: { id: input.agentId }, select: { id: true, role: true } });
    if (!agent || agent.role !== 'AGENT') throw ApiError.badRequest('Agent not found');
    agentId = agent.id;
  }

  const isAgent = sender.role === 'AGENT';
  return prisma.supportMessage.create({
    data: {
      agentId,
      senderId: sender.id,
      message: input.message,
      readByAgent: isAgent,
      readByAdmin: !isAgent,
    },
    include: { sender: { select: senderSelect } },
  });
}

export interface ListMessagesQuery {
  page: number;
  pageSize: number;
}

/** Full thread for one agent, oldest first (chat order). Agents are always scoped to their own
 *  thread by the caller; admins pass whichever agentId they're viewing. */
export async function listThreadMessages(agentId: number, query: ListMessagesQuery) {
  const [rows, total] = await Promise.all([
    prisma.supportMessage.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { sender: { select: senderSelect } },
    }),
    prisma.supportMessage.count({ where: { agentId } }),
  ]);
  return { items: rows.reverse(), total, page: query.page, pageSize: query.pageSize };
}

export async function markThreadRead(agentId: number, side: 'AGENT' | 'ADMIN') {
  const field = side === 'AGENT' ? 'readByAgent' : 'readByAdmin';
  await prisma.supportMessage.updateMany({ where: { agentId, [field]: false }, data: { [field]: true } });
}

/** Unread count for one agent's own inbox badge (messages from admins they haven't read). */
export async function getAgentUnreadCount(agentId: number) {
  return prisma.supportMessage.count({ where: { agentId, readByAgent: false } });
}

/** Total unread count across every thread, for the admin nav badge. */
export async function getAdminUnreadCount() {
  return prisma.supportMessage.count({ where: { readByAdmin: false } });
}

export interface ListThreadsQuery {
  page: number;
  pageSize: number;
}

/** One row per agent who has ever messaged support, most recently active first, with a preview of
 *  the last message and how many are unread on the admin side. */
export async function listThreads(query: ListThreadsQuery) {
  const grouped = await prisma.supportMessage.groupBy({ by: ['agentId'], _max: { createdAt: true } });
  const sorted = grouped.sort((a, b) => (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0));
  const total = sorted.length;
  const pageAgentIds = sorted.slice((query.page - 1) * query.pageSize, query.page * query.pageSize).map((g) => g.agentId);

  if (pageAgentIds.length === 0) return { items: [], total, page: query.page, pageSize: query.pageSize };

  const [agents, lastMessages, unreadCounts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: pageAgentIds } }, select: { id: true, name: true, referralCode: true, mobile: true } }),
    prisma.supportMessage.findMany({
      where: { agentId: { in: pageAgentIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['agentId'],
      select: { agentId: true, message: true, createdAt: true, senderId: true },
    }),
    prisma.supportMessage.groupBy({ by: ['agentId'], where: { agentId: { in: pageAgentIds }, readByAdmin: false }, _count: true }),
  ]);

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const lastMsgMap = new Map(lastMessages.map((m) => [m.agentId, m]));
  const unreadMap = new Map(unreadCounts.map((u) => [u.agentId, u._count]));

  const items = pageAgentIds
    .map((id) => ({ agent: agentMap.get(id)!, lastMessage: lastMsgMap.get(id)!, unreadCount: unreadMap.get(id) ?? 0 }))
    .filter((row) => row.agent);

  return { items, total, page: query.page, pageSize: query.pageSize };
}
