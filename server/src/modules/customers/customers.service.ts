import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';

export interface ListCustomersQuery {
  search?: string;
  page: number;
  pageSize: number;
}

/** Admin roles see every customer; a plain AGENT only sees their own. */
export async function listCustomers(query: ListCustomersQuery, requester: { id: number; role: string }) {
  const scoped = requester.role === 'AGENT' ? { createdByAgentId: requester.id } : {};
  const where: Prisma.CustomerWhereInput = {
    ...scoped,
    ...(query.search
      ? { OR: [{ name: { contains: query.search } }, { mobile: { contains: query.search } }] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { _count: { select: { tickets: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function findByMobile(mobile: string, agentId: number) {
  return prisma.customer.findUnique({ where: { createdByAgentId_mobile: { createdByAgentId: agentId, mobile } } });
}

export async function getCustomerDetail(id: number) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      receipts: {
        orderBy: { createdAt: 'desc' },
        include: { drawSlot: true, tickets: { select: { ticketNumber: true, status: true } } },
      },
    },
  });
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}
