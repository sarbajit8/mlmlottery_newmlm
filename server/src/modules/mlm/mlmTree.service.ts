import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/apiError.js';
import { startOfBusinessDay, startOfBusinessMonth } from '../../lib/datetime.js';

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

const treeNodeSelect = {
  id: true,
  name: true,
  referralCode: true,
  role: true,
  status: true,
  sponsorId: true,
} satisfies Prisma.UserSelect;

/**
 * Breadth-first walk of the sponsor tree, one query per depth level. Deliberately NOT a recursive
 * CTE — those need MySQL 8 / MariaDB 10.2+ (Amazon Linux's bundled MariaDB can be older) and Prisma
 * returns the CTE's computed depth as a BigInt on some engines, which broke the `depth === 0` root
 * check. Realistic MLM downlines are small, so ≤15 indexed lookups on `sponsor_id` is cheap.
 */
async function fetchSubtree(rootUserId: number, maxDepth = 15): Promise<FlatNode[]> {
  const root = await prisma.user.findUnique({ where: { id: rootUserId }, select: treeNodeSelect });
  if (!root) throw ApiError.notFound('User not found');

  const out: FlatNode[] = [{ ...root, depth: 0 }];
  const seen = new Set<number>([rootUserId]);
  let frontier = [rootUserId];

  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
    const children = await prisma.user.findMany({
      where: { sponsorId: { in: frontier } },
      select: treeNodeSelect,
      orderBy: { id: 'asc' },
    });
    const next: number[] = [];
    for (const c of children) {
      if (seen.has(c.id)) continue; // guard against a sponsor cycle
      seen.add(c.id);
      out.push({ ...c, depth });
      next.push(c.id);
    }
    frontier = next;
  }

  return out;
}

async function buildTree(flat: FlatNode[]): Promise<TreeNode> {
  const ids = flat.map((f) => f.id);

  const [todayAgg, monthAgg] = await Promise.all([
    prisma.ticket.groupBy({
      by: ['soldByAgentId'],
      where: { soldByAgentId: { in: ids }, status: { in: ['SOLD', 'WINNER'] }, soldAt: { gte: startOfBusinessDay() } },
      _sum: { semValue: true },
    }),
    prisma.ticket.groupBy({
      by: ['soldByAgentId'],
      where: { soldByAgentId: { in: ids }, status: { in: ['SOLD', 'WINNER'] }, soldAt: { gte: startOfBusinessMonth() } },
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
