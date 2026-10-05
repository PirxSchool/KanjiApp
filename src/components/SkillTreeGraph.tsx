import React, { memo, useEffect, useMemo, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { ReactFlow, ReactFlowProvider, useReactFlow, Controls, Background, MiniMap, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Layers } from 'lucide-react';
import type { KanjiNodeData, NodeStatus } from '../types/kanji';
import { KanjiNodeComponent } from './KanjiNode';

interface Props {
  nodes: KanjiNodeData[];
  selectedNodeId: string | null;
  getNodeStatus: (node: KanjiNodeData) => NodeStatus;
  onSelectNode: (node: KanjiNodeData) => void;
}

type KanjiGroup = {
  id: string;
  label: string;
  description: string;
  members: KanjiNodeData[];
};

const MIN_COMPONENT_USAGE = 5;
const MAX_SHOWN = 6;
const MAX_EDGES_PER_GROUP = 2;

function buildGroups(nodes: KanjiNodeData[]): KanjiGroup[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const usage = new Map<string, number>();

  for (const n of nodes) {
    if (n.isRadicalOnly) continue;
    for (const p of n.parents) if (byId.has(p)) usage.set(p, (usage.get(p) ?? 0) + 1);
  }

  const anchors = new Set(
    [...usage.entries()].filter(([, count]) => count >= MIN_COMPONENT_USAGE).map(([id]) => id),
  );

  const keyFor = (n: KanjiNodeData) => {
    if (n.isRadicalOnly && anchors.has(n.id)) return n.id;
    const candidates = n.parents
      .filter(p => anchors.has(p))
      .sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0));
    return candidates[0] ?? `foundation_${n.jlpt}`;
  };

  const map = new Map<string, KanjiGroup>();

  for (const n of nodes) {
    const key = keyFor(n);
    const anchor = byId.get(key);
    const foundation = key.startsWith('foundation_');

    if (!map.has(key)) {
      map.set(key, {
        id: `group_${key}`,
        label: foundation ? `${n.jlpt} · Fundamenty` : anchor?.kanji ?? n.kanji,
        description: foundation ? 'Podstawowe kanji' : anchor?.name ?? 'Rodzina komponentu',
        members: [],
      });
    }
    map.get(key)!.members.push(n);
  }

  // Groups with only 1–2 kanji are merged into a JLPT foundation bucket.
  for (const [key, group] of [...map.entries()]) {
    if (key.startsWith('foundation_') || group.members.length >= 3) continue;
    map.delete(key);

    for (const member of group.members) {
      const foundationKey = `foundation_${member.jlpt}`;
      const existing = map.get(foundationKey);
      if (existing) existing.members.push(member);
      else {
        map.set(foundationKey, {
          id: `group_${foundationKey}`,
          label: `${member.jlpt} · Fundamenty`,
          description: 'Podstawowe kanji',
          members: [member],
        });
      }
    }
  }

  return [...map.values()];
}

function makeLayout(groups: KanjiGroup[], nodes: KanjiNodeData[]) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 110 });

  const groupOf = new Map<string, string>();
  const groupsById = new Map(groups.map(g => [g.id, g]));

  for (const group of groups) {
    for (const member of group.members) groupOf.set(member.id, group.id);
    graph.setNode(group.id, { width: 190, height: 155 });
  }

  // Many kanji edges -> one weighted group edge.
  const relations = new Map<string, number>();

  for (const node of nodes) {
    const target = groupOf.get(node.id);
    if (!target) continue;

    for (const parent of node.parents) {
      const source = groupOf.get(parent);
      if (!source || source === target) continue;
      const key = `${source}__${target}`;
      relations.set(key, (relations.get(key) ?? 0) + 1);
    }
  }

  const incoming = new Map<string, { key: string; count: number }[]>();
  for (const [key, count] of relations) {
    const target = key.split('__')[1];
    const list = incoming.get(target) ?? [];
    list.push({ key, count });
    incoming.set(target, list);
  }

  const edges: { id: string; source: string; target: string; count: number }[] = [];
  for (const list of incoming.values()) {
    list.sort((a, b) => b.count - a.count);
    for (const item of list.slice(0, MAX_EDGES_PER_GROUP)) {
      const [source, target] = item.key.split('__');
      graph.setEdge(source, target);
      edges.push({ id: `ge-${source}-${target}`, source, target, count: item.count });
    }
  }

  dagre.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  for (const group of groups) {
    const p = graph.node(group.id);
    if (p) positions.set(group.id, { x: p.x - 95, y: p.y - 77.5 });
  }

  return { positions, edges, groupsById };
}

const GroupNode = memo(({
  data,
}: {
  data: {
    group: KanjiGroup;
    getNodeStatus: (node: KanjiNodeData) => NodeStatus;
    onSelectNode: (node: KanjiNodeData) => void;
    selected: boolean;
    onExpand: () => void;
  };
}) => {
  const { group, getNodeStatus, onSelectNode, selected, onExpand } = data;
  const statuses = group.members.map(getNodeStatus);
  const mastered = statuses.filter(s => s === 'MASTERED').length;
  const available = statuses.filter(s => s === 'AVAILABLE').length;

  const border = mastered === group.members.length
    ? 'border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
    : available > 0 || mastered > 0
      ? 'border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.25)]'
      : 'border-slate-700';

  return (
    <div onClick={onExpand} className={`w-[190px] h-[155px] cursor-pointer rounded-2xl border-2 bg-slate-950/95 p-3 ${border} ${selected ? 'ring-4 ring-cyan-300/80' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl font-serif text-cyan-200">
          {group.label.split(' ')[0]}
        </div>
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-wider text-cyan-400/70">Kliknij, aby rozwinąć</div>
          <div className="font-bold text-sm text-white truncate">{group.label}</div>
          <div className="text-[10px] text-slate-400 truncate">{group.description}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {group.members.slice(0, MAX_SHOWN).map(member => {
          const status = getNodeStatus(member);
          return (
            <button
              key={member.id}
              title={member.name}
              disabled={status === 'LOCKED'}
              onClick={e => {
                e.stopPropagation();
                onSelectNode(member);
              }}
              className={`w-7 h-7 rounded-lg border text-base font-serif hover:scale-110 transition-transform ${
                status === 'MASTERED'
                  ? 'bg-amber-950 border-amber-500 text-amber-200'
                  : status === 'AVAILABLE'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-600'
              }`}
            >
              {member.kanji}
            </button>
          );
        })}
        {group.members.length > MAX_SHOWN && (
          <span className="text-[10px] text-slate-400 self-center">+{group.members.length - MAX_SHOWN}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
        <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {group.members.length} kanji</span>
        <span>{mastered}/{group.members.length} ✓</span>
      </div>
    </div>
  );
});

GroupNode.displayName = 'GroupNode';

const nodeTypes = { kanjiGroup: GroupNode };

function Inner({ nodes: kanjiNodes, selectedNodeId, getNodeStatus, onSelectNode }: Props) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const { setCenter } = useReactFlow();
  const groups = useMemo(() => buildGroups(kanjiNodes), [kanjiNodes]);
  const layout = useMemo(() => makeLayout(groups, kanjiNodes), [groups, kanjiNodes]);
  const expandedGroup = groups.find(g => g.id === expandedGroupId) ?? null;
  const internalLayout = useMemo(() => {
    if (!expandedGroup) return null;
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: 'TB', nodesep: 35, ranksep: 70 });
    const ids = new Set(expandedGroup.members.map(n => n.id));
    for (const n of expandedGroup.members) graph.setNode(n.id, { width: 110, height: 120 });
    const edges: { id: string; source: string; target: string }[] = [];
    for (const n of expandedGroup.members) for (const p of n.parents) {
      if (!ids.has(p)) continue;
      graph.setEdge(p, n.id);
      edges.push({ id: `local-${p}-${n.id}`, source: p, target: n.id });
    }
    dagre.layout(graph);
    const positions = new Map<string, { x: number; y: number }>();
    for (const n of expandedGroup.members) {
      const p = graph.node(n.id);
      if (p) positions.set(n.id, { x: p.x - 55, y: p.y - 60 });
    }
    return { positions, edges };
  }, [expandedGroup]);

  const nodes: Node[] = useMemo(
    () => expandedGroup && internalLayout
      ? expandedGroup.members.map(node => ({
          id: node.id,
          type: 'kanjiNode',
          position: internalLayout.positions.get(node.id)!,
          draggable: false,
          data: { node, status: getNodeStatus(node), isSelected: node.id === selectedNodeId, onSelect: onSelectNode },
        }))
      : groups.map(group => ({
      id: group.id,
      type: 'kanjiGroup',
      position: layout.positions.get(group.id)!,
      draggable: false,
      data: {
        group,
        getNodeStatus,
        onSelectNode,
        selected: group.members.some(m => m.id === selectedNodeId),
      },
    })),
    [groups, layout, getNodeStatus, onSelectNode, selectedNodeId],
  );

  const edges: Edge[] = useMemo(
    () => expandedGroup && internalLayout
      ? internalLayout.edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          style: { stroke: '#475569', strokeWidth: 1.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#475569', width: 14, height: 14 },
        }))
      : layout.edges.map(edge => {
      const source = layout.groupsById.get(edge.source)!;
      const target = layout.groupsById.get(edge.target)!;
      const sourceMastered = source.members.every(m => getNodeStatus(m) === 'MASTERED');
      const targetAvailable = target.members.some(m => getNodeStatus(m) === 'AVAILABLE');
      const color = sourceMastered ? '#f59e0b' : targetAvailable ? '#06b6d4' : '#475569';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        style: { stroke: color, strokeWidth: Math.min(4, 1.5 + edge.count * 0.5), opacity: 0.8 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
        label: edge.count > 1 ? `${edge.count} zależności` : undefined,
        labelStyle: { fill: '#94a3b8', fontSize: 9 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
      };
    }),
    [layout, getNodeStatus, expandedGroup, internalLayout],
  );

  useEffect(() => {
    if (!selectedNodeId) return;
    if (expandedGroup) {
      const p = internalLayout?.positions.get(selectedNodeId);
      if (p) setCenter(p.x + 55, p.y + 60, { zoom: 1.2, duration: 400 });
      return;
    }

    const group = groups.find(g => g.members.some(m => m.id === selectedNodeId));
    const p = group ? layout.positions.get(group.id) : undefined;
    if (p) setCenter(p.x + 95, p.y + 77.5, { zoom: 1, duration: 400 });
  }, [selectedNodeId, groups, layout, expandedGroup, internalLayout, setCenter]);

  return (
    <div className="w-full h-full bg-rpg-bg relative overflow-hidden">
      {expandedGroup && (
        <button
          onClick={() => setExpandedGroupId(null)}
          className="absolute z-20 top-4 left-4 px-4 py-2 rounded-xl bg-slate-950/95 border border-cyan-400/60 text-cyan-200 text-sm font-semibold shadow-xl hover:bg-slate-900"
        >
          ← Wróć do mapy grup
        </button>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={expandedGroup ? { kanjiNode: KanjiNodeComponent } : nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onlyRenderVisibleElements
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={expandedGroup ? 0.35 : 0.2}
        maxZoom={2}
        zoomOnDoubleClick={false}
        preventScrolling
      >
        <Background color="#1e293b" gap={24} size={1.5} />
        <Controls />
        {!expandedGroup && <MiniMap
          pannable
          zoomable
          nodeColor={n => {
            const group = (n.data as { group?: KanjiGroup })?.group;
            if (!group) return '#334155';
            const statuses = group.members.map(getNodeStatus);
            return statuses.every(s => s === 'MASTERED')
              ? '#f59e0b'
              : statuses.some(s => s === 'AVAILABLE') ? '#06b6d4' : '#334155';
          }}
          maskColor="rgba(9, 13, 22, 0.85)"
          className="!bg-rpg-panel !border-rpg-border !rounded-xl overflow-hidden shadow-xl hidden sm:block"
        />}
      </ReactFlow>
    </div>
  );
}

export const SkillTreeGraph: React.FC<Props> = props => (
  <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>
);
