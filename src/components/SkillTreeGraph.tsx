import React, { useMemo, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import {
  ReactFlow, ReactFlowProvider, useReactFlow, Controls, Background, MiniMap, MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import type { KanjiNodeData, NodeStatus } from '../types/kanji';
import { KanjiNodeComponent } from './KanjiNode';

const nodeTypes = { kanjiNode: KanjiNodeComponent };
const W = 110, H = 120;

interface Props {
  nodes: KanjiNodeData[];
  selectedNodeId: string | null;
  getNodeStatus: (node: KanjiNodeData) => NodeStatus;
  onSelectNode: (node: KanjiNodeData) => void;
}

// Układ liczony TYLKO gdy zmienia się zbiór węzłów (filtr JLPT), nie przy każdym kliknięciu.
function computeLayout(kanjiNodes: KanjiNodeData[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 90 });
  const ids = new Set(kanjiNodes.map(n => n.id));
  const links: { id: string; source: string; target: string }[] = [];
  kanjiNodes.forEach(n => g.setNode(n.id, { width: W, height: H }));
  kanjiNodes.forEach(n => n.parents.forEach(p => {
    if (!ids.has(p)) return;
    g.setEdge(p, n.id);
    links.push({ id: `e-${p}-${n.id}`, source: p, target: n.id });
  }));
  dagre.layout(g);
  const pos = new Map<string, { x: number; y: number }>();
  kanjiNodes.forEach(n => {
    const p = g.node(n.id);
    pos.set(n.id, { x: p.x - W / 2, y: p.y - H / 2 });
  });
  return { pos, links };
}

const Inner: React.FC<Props> = ({ nodes: kanjiNodes, selectedNodeId, getNodeStatus, onSelectNode }) => {
  const { setCenter } = useReactFlow();
  const layout = useMemo(() => computeLayout(kanjiNodes), [kanjiNodes]);
  const byId = useMemo(() => new Map(kanjiNodes.map(n => [n.id, n])), [kanjiNodes]);

  const nodes: Node[] = useMemo(() => kanjiNodes.map(node => ({
    id: node.id,
    type: 'kanjiNode',
    position: layout.pos.get(node.id)!,
    draggable: false,
    data: { node, status: getNodeStatus(node), isSelected: node.id === selectedNodeId, onSelect: onSelectNode },
  })), [kanjiNodes, layout, getNodeStatus, selectedNodeId, onSelectNode]);

  const edges: Edge[] = useMemo(() => layout.links.map(l => {
    const ps = getNodeStatus(byId.get(l.source)!);
    const cs = getNodeStatus(byId.get(l.target)!);
    let color = '#334155', animated = false, width = 1.5;
    if (ps === 'MASTERED' && cs === 'MASTERED') { color = '#f59e0b'; width = 3; }
    else if (ps === 'MASTERED' && cs === 'AVAILABLE') { color = '#06b6d4'; width = 2.5; animated = true; }
    return {
      id: l.id, source: l.source, target: l.target, animated,
      style: { stroke: color, strokeWidth: width, strokeDasharray: cs === 'LOCKED' ? '5 5' : 'none' },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    };
  }), [layout, byId, getNodeStatus]);

  // wyszukiwarka / klik → przewiń widok do wybranego kanji
  useEffect(() => {
    if (!selectedNodeId) return;
    const p = layout.pos.get(selectedNodeId);
    if (p) setCenter(p.x + W / 2, p.y + H / 2, { zoom: 1, duration: 400 });
  }, [selectedNodeId, layout, setCenter]);

  return (
    <div className="w-full h-full bg-rpg-bg relative overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onlyRenderVisibleElements
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        maxZoom={2}
        zoomOnDoubleClick={false}
        preventScrolling
      >
        <Background color="#1e293b" gap={24} size={1.5} />
        <Controls />
        <MiniMap
          pannable zoomable
          nodeColor={(n) => {
            const s = (n.data as { status: NodeStatus })?.status;
            return s === 'MASTERED' ? '#f59e0b' : s === 'AVAILABLE' ? '#06b6d4' : '#334155';
          }}
          maskColor="rgba(9, 13, 22, 0.85)"
          className="!bg-rpg-panel !border-rpg-border !rounded-xl overflow-hidden shadow-xl hidden sm:block"
        />
      </ReactFlow>
    </div>
  );
};

export const SkillTreeGraph: React.FC<Props> = (props) => (
  <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>
);
