import { useCallback, useRef, useState, useEffect } from 'react';
import Tree from 'react-d3-tree';
import type { CustomNodeElementProps } from 'react-d3-tree';
import type { TreeNode } from '@/types/api';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/utils/cn';

interface RawNode {
  name: string;
  id: number;
  role: string;
  status: string;
  teamSales: number;
  personalSalesMonth: number;
  directCount: number;
  children?: RawNode[];
}

function toRawNode(node: TreeNode): RawNode {
  return {
    name: node.name,
    id: node.id,
    role: node.role,
    status: node.status,
    teamSales: node.teamSales,
    personalSalesMonth: node.personalSalesMonth,
    directCount: node.directCount,
    children: node.children.map(toRawNode),
  };
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  AGENT: 'Agent',
};

function TreeCard({ nodeDatum, accent, toggleNode }: CustomNodeElementProps & { accent: 'amber' | 'emerald' }) {
  const data = nodeDatum as unknown as RawNode;
  const accentText = accent === 'amber' ? 'text-amber-300' : 'text-emerald-300';
  const accentBorder = accent === 'amber' ? 'border-amber-500/30' : 'border-emerald-500/30';
  const hasChildren = (nodeDatum.children?.length ?? 0) > 0;

  return (
    <foreignObject width={190} height={110} x={-95} y={-20}>
      <div
        className={cn(
          'rounded-xl border bg-neutral-900/95 px-3 py-2 shadow-xl cursor-pointer select-none',
          data.status === 'ACTIVE' ? accentBorder : 'border-white/10 opacity-60',
        )}
        onClick={toggleNode}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-slate-100">{data.name}</p>
          {hasChildren && <span className={cn('text-[10px]', accentText)}>{nodeDatum.__rd3t?.collapsed ? '+' : '−'}</span>}
        </div>
        <p className="text-[10px] text-slate-500">{roleLabel[data.role] ?? data.role}</p>
        <div className="mt-1.5 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">Team: <span className={cn('font-medium', accentText)}>{formatCurrency(data.teamSales)}</span></span>
          <span className="text-slate-600">{data.directCount} direct</span>
        </div>
      </div>
    </foreignObject>
  );
}

export function OrgTree({ root, accent }: { root: TreeNode; accent: 'amber' | 'emerald' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 100, y: 60 });

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 60 });
    }
  }, []);

  const renderNode = useCallback((props: CustomNodeElementProps) => <TreeCard {...props} accent={accent} />, [accent]);

  const data = toRawNode(root);

  return (
    <div ref={containerRef} className="h-full w-full">
      <Tree
        data={data as any}
        translate={translate}
        orientation="vertical"
        pathFunc="step"
        collapsible
        zoomable
        zoom={0.85}
        separation={{ siblings: 1.1, nonSiblings: 1.3 }}
        nodeSize={{ x: 210, y: 130 }}
        renderCustomNodeElement={renderNode}
        pathClassFunc={() => (accent === 'amber' ? 'stroke-amber-500/30' : 'stroke-emerald-500/30')}
      />
    </div>
  );
}
