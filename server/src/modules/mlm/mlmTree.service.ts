import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';

interface FlatNode {
  id: number;
  name: string;
  referralCode: string;
  role: string;
  status: string;
  sponsorId: number | null;
  depth: number;
}

interface TreeNode extends FlatNode {
  personalSalesToday: number;
  personalSalesMonth: number;
  teamSales: number;
  directCount: number;
  totalDownlineCount: number;
  children: TreeNode[];
}

async function fetchSubtree(rootUserId: number, maxDepth = 15): Promise<FlatNode[]> {
  const root = await prisma.user.findUnique({ where: { id: rootUserId } });
  if (!root) throw ApiError.notFound('User not found');

  const rows = await prisma.$queryRaw<FlatNode[]>`
    WITH RECURSIVE downline AS (
      SELECT id, name, referral_code AS referralCode, role, status, sponsor_id AS sponsorId, 0 AS depth
      FROM users WHERE id = ${rootUserId}
      UNION ALL
      SELECT u.id, u.name, u.referral_code, u.role, u.status, u.sponsor_id, d.depth + 1
      FROM users u
      INNER JOIN downline d ON u.sponsor_id = d.id
      WHERE d.depth < ${maxDepth}
    )
    SELECT * FROM downline ORDER BY depth ASC, id ASC
  `;
  return rows;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function buildTree(flat: FlatNode[]): Promise<TreeNode> {
  const ids = flat.map((f) => f.id);

  const [todayAgg, monthAgg] = await Promise.all([
    prisma.ticket.groupBy({
      by: ['soldByAgentId'],
      where: { soldByAgentId: { in: ids }, status: { in: ['SOLD', 'WINNER'] }, soldAt: { gte: startOfToday() } },
      _sum: { semValue: true },
    }),
    prisma.ticket.groupBy({
      by: ['soldByAgentId'],
      where: { soldByAgentId: { in: ids }, status: { in: ['SOLD', 'WINNER'] }, soldAt: { gte: startOfMonth() } },
      _sum: { semValue: true },
    }),
  ]);

  const todayMap = new Map(todayAgg.map((r) => [r.soldByAgentId, new Prisma.Decimal(r._sum.semValue ?? 0).toNumber()]));
  const monthMap = new Map(monthAgg.map((r) => [r.soldByAgentId, new Prisma.Decimal(r._sum.semValue ?? 0).toNumber()]));

  const nodeMap = new Map<number, TreeNode>();
  for (const f of flat) {
    nodeMap.set(f.id, {
      ...f,
      personalSalesToday: todayMap.get(f.id) ?? 0,
      personalSalesMonth: monthMap.get(f.id) ?? 0,
      teamSales: 0,
      directCount: 0,
      totalDownlineCount: 0,
      children: [],
    });
  }

  let root: TreeNode | undefined;
  for (const f of flat) {
    const node = nodeMap.get(f.id)!;
    if (f.depth === 0) {
      root = node;
      continue;
    }
    const parent = f.sponsorId ? nodeMap.get(f.sponsorId) : undefined;
    if (parent) {
      parent.children.push(node);
      parent.directCount += 1;
    }
  }
  if (!root) throw ApiError.notFound('User not found');

  // Bottom-up accumulation: process deepest nodes first so parents see children totals.
  const byDepthDesc = [...flat].sort((a, b) => b.depth - a.depth);
  for (const f of byDepthDesc) {
    const node = nodeMap.get(f.id)!;
    node.teamSales = round(
      node.personalSalesMonth + node.children.reduce((sum, c) => sum + c.teamSales, 0),
    );
    node.totalDownlineCount = node.children.reduce((sum, c) => sum + c.totalDownlineCount + 1, 0);
  }

  return root;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getTree(rootUserId: number) {
  const flat = await fetchSubtree(rootUserId);
  return buildTree(flat);
}

export async function getFlatDownline(rootUserId: number) {
  const flat = await fetchSubtree(rootUserId);
  // exclude the root itself from the "downline" listing
  return flat.filter((f) => f.depth > 0);
}
