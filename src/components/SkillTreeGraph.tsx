import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Layers, Search, X } from 'lucide-react';
import type { KanjiNodeData, NodeStatus } from '../types/kanji';

interface Props {
  nodes: KanjiNodeData[];
  allNodes: KanjiNodeData[];
  selectedNodeId: string | null;
  getNodeStatus: (node: KanjiNodeData) => NodeStatus;
  onSelectNode: (node: KanjiNodeData) => void;
}

type KanjiGroup = {
  id: string;
  key: string;
  label: string;
  description: string;
  representative: string | null;
  members: KanjiNodeData[];
};

type GroupNodeData = {
  group: KanjiGroup;
  getNodeStatus: (node: KanjiNodeData) => NodeStatus;
  onSelectNode: (node: KanjiNodeData) => void;
  onExpand: () => void;
  selected: boolean;
  visibleMemberIds: Set<string>;
  unlocked: boolean;
};

type GroupRelation = {
  id: string;
  source: string;
  target: string;
  count: number;
};

const MIN_COMPONENT_USAGE = 8;
const GROUP_WIDTH = 230;
const GROUP_HEIGHT = 168;
const GROUP_COLUMN_X = 285;
const GROUP_LAYER_Y = 230;
const MAX_PREVIEW = 6;
const MAX_INCOMING_EDGES = 2;
const SECONDARY_EDGE_MIN_COUNT = 3;
const SECONDARY_EDGE_RATIO = 0.5;

const JLPT_ORDER = new Map([
  ['N5', 0],
  ['N4', 1],
  ['N3', 2],
  ['N2', 3],
  ['N1', 4],
]);

function buildGroups(allNodes: KanjiNodeData[]) {
  const byId = new Map(allNodes.map(node => [node.id, node]));
  const usage = new Map<string, number>();

  for (const node of allNodes) {
    if (node.isRadicalOnly) continue;
    for (const parentId of node.parents) {
      if (byId.has(parentId)) {
        usage.set(parentId, (usage.get(parentId) ?? 0) + 1);
      }
    }
  }

  const anchors = new Set(
    [...usage.entries()]
      .filter(([, count]) => count >= MIN_COMPONENT_USAGE)
      .map(([id]) => id),
  );

  const keyFor = (node: KanjiNodeData) => {
    if (node.isRadicalOnly && anchors.has(node.id)) return node.id;

    const anchorParent = node.parents
      .filter(parentId => anchors.has(parentId))
      .sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0))[0];

    return anchorParent ?? `foundation_${node.jlpt}`;
  };

  const rawGroups = new Map<string, KanjiNodeData[]>();

  for (const node of allNodes) {
    const key = keyFor(node);
    const members = rawGroups.get(key) ?? [];
    members.push(node);
    rawGroups.set(key, members);
  }

  const groups: KanjiGroup[] = [...rawGroups.entries()].map(([key, members]) => {
    const anchor = byId.get(key);
    const foundation = key.startsWith('foundation_');

    const sortedMembers = [...members].sort((a, b) =>
      a.strokeCount - b.strokeCount ||
      a.kanji.localeCompare(b.kanji, 'ja'),
    );

    return {
      id: `group_${key}`,
      key,
      label: foundation ? `Podstawy ${members[0].jlpt}` : `${anchor?.kanji ?? members[0].kanji} · Rodzina`,
      description: foundation
        ? 'Podstawowe elementy bez dominującego wspólnego komponentu.'
        : anchor?.name ?? 'Wspólny komponent budulcowy.',
      representative: foundation ? null : anchor?.kanji ?? null,
      members: sortedMembers,
    };
  });

  const foundationGroups = new Map(
    groups
      .filter(group => group.key.startsWith('foundation_'))
      .map(group => [group.key, group]),
  );

  const normalizedGroups = groups.filter(group => {
    if (!group.key.startsWith('foundation_') && group.members.length === 1) {
      const foundationKey = `foundation_${group.members[0].jlpt}`;
      const foundation = foundationGroups.get(foundationKey);
      if (foundation) {
        foundation.members.push(group.members[0]);
        foundation.members.sort((a, b) => a.strokeCount - b.strokeCount);
        return false;
      }
    }
    return true;
  });

  return normalizedGroups.map(group => ({
    ...group,
    members: [...group.members],
  }));
}

function buildGroupRelations(
  groups: KanjiGroup[],
  allNodes: KanjiNodeData[],
): GroupRelation[] {
  const groupOf = new Map<string, string>();

  for (const group of groups) {
    for (const member of group.members) {
      groupOf.set(member.id, group.id);
    }
  }

  const relations = new Map<string, GroupRelation>();

  for (const node of allNodes) {
    const target = groupOf.get(node.id);
    if (!target) continue;

    for (const parentId of node.parents) {
      const source = groupOf.get(parentId);
      if (!source || source === target) continue;

      const id = `ge-${source}-${target}`;
      const current = relations.get(id);
      relations.set(id, current
        ? { ...current, count: current.count + 1 }
        : { id, source, target, count: 1 });
    }
  }

  const incoming = new Map<string, GroupRelation[]>();

  for (const relation of relations.values()) {
    const list = incoming.get(relation.target) ?? [];
    list.push(relation);
    incoming.set(relation.target, list);
  }

  const selected: GroupRelation[] = [];

  for (const list of incoming.values()) {
    list.sort((a, b) => b.count - a.count);

    const strongest = list[0];
    if (!strongest) continue;
    selected.push(strongest);

    const secondary = list[1];
    if (
      secondary &&
      selected.length &&
      secondary.count >= SECONDARY_EDGE_MIN_COUNT &&
      secondary.count >= strongest.count * SECONDARY_EDGE_RATIO
    ) {
      selected.push(secondary);
    }

    if (selected.length > 0 && list.length > MAX_INCOMING_EDGES) {
      // Intentionally keep only the strongest two candidates above.
    }
  }

  return [...new Map(selected.map(relation => [relation.id, relation])).values()];
}

function buildUnlockDepths(allNodes: KanjiNodeData[]) {
  const byId = new Map(allNodes.map(node => [node.id, node]));
  const depths = new Map<string, number>();
  const visiting = new Set<string>();

  const depthOf = (node: KanjiNodeData): number => {
    const saved = depths.get(node.id);
    if (saved !== undefined) return saved;

    if (visiting.has(node.id)) return 0;
    visiting.add(node.id);

    const parentDepths = node.parents
      .map(parentId => byId.get(parentId))
      .filter((parent): parent is KanjiNodeData => parent !== undefined)
      .map(parent => depthOf(parent));

    const depth = parentDepths.length > 0 ? Math.max(...parentDepths) + 1 : 0;
    visiting.delete(node.id);
    depths.set(node.id, depth);
    return depth;
  };

  for (const node of allNodes) {
    depthOf(node);
  }

  return depths;
}

function getGroupUnlockDepth(group: KanjiGroup, unlockDepths: Map<string, number>) {
  return Math.min(...group.members.map(member => unlockDepths.get(member.id) ?? 0));
}

function sortGroupsByLearningOrder(groups: KanjiGroup[], unlockDepths: Map<string, number>) {
  return [...groups].sort((a, b) =>
    getGroupUnlockDepth(a, unlockDepths) - getGroupUnlockDepth(b, unlockDepths) ||
    (JLPT_ORDER.get(a.members[0]?.jlpt) ?? 99) - (JLPT_ORDER.get(b.members[0]?.jlpt) ?? 99) ||
    a.members[0]?.strokeCount - b.members[0]?.strokeCount ||
    a.label.localeCompare(b.label, 'pl'),
  );
}

function makeLayout(groups: KanjiGroup[], unlockDepths: Map<string, number>) {
  const layers = new Map<number, KanjiGroup[]>();

  for (const group of sortGroupsByLearningOrder(groups, unlockDepths)) {
    const depth = getGroupUnlockDepth(group, unlockDepths);
    const layer = layers.get(depth) ?? [];
    layer.push(group);
    layers.set(depth, layer);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const orderedDepths = [...layers.keys()].sort((a, b) => a - b);

  orderedDepths.forEach((depth, layerIndex) => {
    const layer = layers.get(depth) ?? [];
    const totalWidth = (layer.length - 1) * GROUP_COLUMN_X;
    const stagger = layer.length > 1 && layerIndex % 2 === 1 ? GROUP_COLUMN_X * 0.18 : 0;

    layer.forEach((group, index) => {
      positions.set(group.id, {
        x: index * GROUP_COLUMN_X - totalWidth / 2 + stagger,
        y: layerIndex * GROUP_LAYER_Y,
      });
    });
  });

  return positions;
}

const GroupNode = memo(({ data }: { data: GroupNodeData }) => {
  const {
    group,
    getNodeStatus,
    onSelectNode,
    onExpand,
    selected,
    visibleMemberIds,
    unlocked,
  } = data;

  const statuses = group.members.map(getNodeStatus);
  const mastered = statuses.filter(status => status === 'MASTERED').length;
  const available = statuses.filter(status => status === 'AVAILABLE').length;
  const visibleMembers = group.members.filter(member => visibleMemberIds.has(member.id));
  const unlockedMembers = group.members.filter(member => getNodeStatus(member) !== 'LOCKED');
  const previewMembers = [...visibleMembers, ...unlockedMembers, ...group.members]
    .filter((member, index, members) => members.findIndex(candidate => candidate.id === member.id) === index)
    .slice(0, MAX_PREVIEW);

  const borderClass = mastered === group.members.length
    ? 'border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
    : available > 0 || mastered > 0
      ? 'border-cyan-400/80 shadow-[0_0_24px_rgba(6,182,212,0.2)]'
      : 'border-slate-700';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={event => {
        event.stopPropagation();
        onExpand();
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
      className={[
        'nodrag nopan w-[230px] h-[168px] box-border rounded-2xl border-2 bg-slate-950/95 p-3',
        'cursor-pointer overflow-hidden select-none transition-all',
        borderClass,
        unlocked ? 'animate-groupUnlock' : '',
        selected ? 'ring-4 ring-cyan-300/80 ring-offset-2 ring-offset-slate-950' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xl font-serif text-cyan-200">
          {group.representative ?? <Layers className="w-5 h-5 text-cyan-300" />}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-[9px] uppercase tracking-wider text-cyan-400/70 font-bold">
            {unlocked ? 'Nowa grupa' : 'Grupa komponentów'}
          </div>
          <div className="text-sm leading-5 font-bold text-white truncate">
            {group.label}
          </div>
          <div className="text-[10px] leading-4 text-slate-400 h-8 overflow-hidden">
            {group.description}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 mt-2 mb-2">
        {previewMembers.map(member => {
          const status = getNodeStatus(member);

          return (
            <button
              key={member.id}
              type="button"
              title={`${member.kanji} — ${member.name}`}
              onClick={event => {
                event.stopPropagation();
                onSelectNode(member);
              }}
              className={[
                'nodrag nopan w-7 h-7 rounded-lg border text-base font-serif',
                'transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-300',
                status === 'MASTERED'
                  ? 'bg-amber-950 border-amber-500 text-amber-200'
                  : status === 'AVAILABLE'
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-500',
              ].join(' ')}
            >
              {member.kanji}
            </button>
          );
        })}
        {group.members.length > MAX_PREVIEW && (
          <span className="text-[9px] text-slate-400 self-center justify-self-center">
            +{group.members.length - MAX_PREVIEW}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-1.5 text-[10px] text-slate-400">
        <span className="flex items-center gap-1 min-w-0">
          <Layers className="w-3 h-3 shrink-0" />
          <span className="truncate">{group.members.length} kanji</span>
        </span>
        <span className="shrink-0">{mastered}/{group.members.length} ✓</span>
      </div>
    </div>
  );
});

GroupNode.displayName = 'GroupNode';

const nodeTypes = { kanjiGroup: GroupNode };

function GroupDetailView({
  group,
  allNodes,
  selectedNodeId,
  getNodeStatus,
  onSelectNode,
  onClose,
}: {
  group: KanjiGroup;
  allNodes: KanjiNodeData[];
  selectedNodeId: string | null;
  getNodeStatus: (node: KanjiNodeData) => NodeStatus;
  onSelectNode: (node: KanjiNodeData) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    setQuery('');
  }, [group.id]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return group.members;

    return group.members.filter(node =>
      node.kanji.includes(q) ||
      node.name.toLowerCase().includes(q) ||
      node.meanings.some(meaning => meaning.toLowerCase().includes(q)) ||
      node.readings.onyomi.some(reading => reading.toLowerCase().includes(q)) ||
      node.readings.kunyomi.some(reading => reading.toLowerCase().includes(q)),
    );
  }, [group.members, query]);

  const stats = useMemo(() => {
    const statuses = group.members.map(getNodeStatus);
    return {
      mastered: statuses.filter(status => status === 'MASTERED').length,
      available: statuses.filter(status => status === 'AVAILABLE').length,
    };
  }, [group.members, getNodeStatus]);

  const memberMap = useMemo(
    () => new Map(allNodes.map(node => [node.id, node])),
    [allNodes],
  );

  return (
    <section className="absolute inset-3 sm:inset-5 z-30 flex flex-col rounded-3xl border border-cyan-400/30 bg-rpg-panel/98 shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden">
      <header className="shrink-0 p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400 transition-colors"
            title="Wróć do mapy grup"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {group.representative && (
                <span className="text-3xl font-serif text-cyan-200 leading-none">
                  {group.representative}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-extrabold text-white truncate">
                  {group.label}
                </h2>
                <p className="text-xs text-slate-400">
                  {group.description}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700">
              {group.members.length} kanji
            </span>
            <span className="px-2 py-1 rounded-lg bg-amber-950/60 border border-amber-500/20 text-amber-300">
              {stats.mastered} opanowanych
            </span>
            <span className="px-2 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/20 text-cyan-300">
              {stats.available} dostępnych
            </span>
          </div>

          <div className="relative sm:ml-auto w-full sm:w-72">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Szukaj w tej grupie…"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                title="Wyczyść wyszukiwanie"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {filteredMembers.length === 0 ? (
          <div className="h-full min-h-40 flex items-center justify-center text-sm text-slate-500">
            Brak kanji pasujących do wyszukiwania.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5 sm:gap-3">
            {filteredMembers.map(member => {
              const status = getNodeStatus(member);
              const parents = member.parents
                .map(parentId => memberMap.get(parentId))
                .filter((node): node is KanjiNodeData => node !== undefined)
                .slice(0, 4);

              const selected = member.id === selectedNodeId;

              return (
                <button
                  type="button"
                  key={member.id}
                  onClick={() => onSelectNode(member)}
                  className={[
                    'min-h-[136px] text-left rounded-2xl border-2 p-3',
                    'bg-slate-950/80 transition-all focus:outline-none',
                    'hover:border-cyan-400/70 hover:-translate-y-0.5',
                    selected ? 'border-cyan-300 ring-2 ring-cyan-300/50' : '',
                    status === 'MASTERED'
                      ? 'border-amber-500/40'
                      : status === 'AVAILABLE'
                        ? 'border-cyan-500/50'
                        : 'border-slate-800',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-4xl font-serif font-bold text-cyan-200 leading-none">
                      {member.kanji}
                    </span>
                    <span className={[
                      'shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold',
                      status === 'MASTERED'
                        ? 'bg-amber-500 text-slate-950'
                        : status === 'AVAILABLE'
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-slate-800 text-slate-500',
                    ].join(' ')}>
                      {status}
                    </span>
                  </div>

                  <div className="mt-2 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {member.name}
                    </div>
                    <div className="text-[10px] text-slate-400 h-8 overflow-hidden">
                      {member.meanings.slice(0, 2).join(' · ')}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800 min-h-6">
                    {parents.length > 0 ? (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[9px] text-slate-500 shrink-0">Wymaga:</span>
                        <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
                          {parents.map(parent => (
                            <span
                              key={parent.id}
                              title={parent.name}
                              className="w-5 h-5 shrink-0 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-[11px] font-serif text-amber-200"
                            >
                              {parent.kanji}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-500">Podstawowy element</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Inner({
  nodes,
  allNodes,
  selectedNodeId,
  getNodeStatus,
  onSelectNode,
}: Props) {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [unlockedGroupIds, setUnlockedGroupIds] = useState<Set<string>>(() => new Set());
  const previousGroupIdsRef = useRef<Set<string> | null>(null);
  const { setCenter } = useReactFlow();

  const groups = useMemo(() => buildGroups(allNodes), [allNodes]);
  const unlockDepths = useMemo(() => buildUnlockDepths(allNodes), [allNodes]);
  const visibleMemberIds = useMemo(
    () => new Set(nodes.map(node => node.id)),
    [nodes],
  );

  const relations = useMemo(
    () => buildGroupRelations(groups, allNodes),
    [groups, allNodes],
  );

  const displayedGroups = useMemo(() => {
    const filteredGroups = groups.filter(group => {
      const visibleMembers = group.members.filter(member => visibleMemberIds.has(member.id));
      return visibleMembers.some(member => getNodeStatus(member) !== 'LOCKED');
    });

    return sortGroupsByLearningOrder(filteredGroups, unlockDepths);
  }, [groups, visibleMemberIds, getNodeStatus, unlockDepths]);

  const displayedGroupIds = useMemo(
    () => new Set(displayedGroups.map(group => group.id)),
    [displayedGroups],
  );

  useEffect(() => {
    const previousGroupIds = previousGroupIdsRef.current;
    previousGroupIdsRef.current = displayedGroupIds;

    if (!previousGroupIds) return;

    const newlyUnlockedIds = displayedGroups
      .filter(group => !previousGroupIds.has(group.id))
      .map(group => group.id);

    if (newlyUnlockedIds.length === 0) return;

    setUnlockedGroupIds(prev => new Set([...prev, ...newlyUnlockedIds]));

    const timeout = window.setTimeout(() => {
      setUnlockedGroupIds(prev => {
        const next = new Set(prev);
        newlyUnlockedIds.forEach(id => next.delete(id));
        return next;
      });
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [displayedGroups, displayedGroupIds]);

  const positions = useMemo(
    () => makeLayout(displayedGroups, unlockDepths),
    [displayedGroups, unlockDepths],
  );

  const expandedGroup = displayedGroups.find(group => group.id === expandedGroupId) ?? null;

  useEffect(() => {
    if (expandedGroupId && !expandedGroup) {
      setExpandedGroupId(null);
    }
  }, [expandedGroupId, expandedGroup]);

  useEffect(() => {
    if (!expandedGroupId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedGroupId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedGroupId]);

  const handleExpand = useCallback((groupId: string) => {
    setExpandedGroupId(groupId);
  }, []);

  const graphNodes: Node[] = useMemo(
    () => displayedGroups.map(group => ({
      id: group.id,
      type: 'kanjiGroup',
      position: positions.get(group.id) ?? { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      data: {
        group,
        getNodeStatus,
        onSelectNode,
        onExpand: () => handleExpand(group.id),
        selected: group.members.some(member => member.id === selectedNodeId),
        visibleMemberIds,
        unlocked: unlockedGroupIds.has(group.id),
      } satisfies GroupNodeData,
    })),
    [
      displayedGroups,
      positions,
      getNodeStatus,
      onSelectNode,
      selectedNodeId,
      visibleMemberIds,
      unlockedGroupIds,
      handleExpand,
    ],
  );

  const graphEdges: Edge[] = useMemo(
    () => relations
      .filter(relation => displayedGroupIds.has(relation.source) && displayedGroupIds.has(relation.target))
      .map(relation => {
        const opacity = relation.count >= 4 ? 0.95 : relation.count >= 2 ? 0.82 : 0.55;
        const strokeWidth = Math.min(5.5, 1.75 + relation.count * 0.45);

        return {
          id: relation.id,
          source: relation.source,
          target: relation.target,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#06b6d4',
            strokeWidth,
            opacity,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#06b6d4',
            width: 15,
            height: 15,
          },
        };
      }),
    [relations, displayedGroupIds],
  );

  useEffect(() => {
    if (!selectedNodeId || expandedGroupId) return;

    const group = displayedGroups.find(candidate =>
      candidate.members.some(member => member.id === selectedNodeId),
    );

    const position = group ? positions.get(group.id) : undefined;
    if (!position) return;

    setCenter(
      position.x + GROUP_WIDTH / 2,
      position.y + GROUP_HEIGHT / 2,
      { zoom: 0.85, duration: 350 },
    );
  }, [selectedNodeId, expandedGroupId, displayedGroups, positions, setCenter]);

  return (
    <div className="relative w-full h-full bg-rpg-bg overflow-hidden">
      {expandedGroup ? (
        <GroupDetailView
          group={expandedGroup}
          allNodes={allNodes}
          selectedNodeId={selectedNodeId}
          getNodeStatus={getNodeStatus}
          onSelectNode={onSelectNode}
          onClose={() => setExpandedGroupId(null)}
        />
      ) : (
        <ReactFlow
          nodes={graphNodes}
          edges={graphEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onlyRenderVisibleElements
          fitView
          fitViewOptions={{ padding: 0.25, minZoom: 0.2, maxZoom: 0.9 }}
          minZoom={0.18}
          maxZoom={1.6}
          zoomOnDoubleClick={false}
          preventScrolling
          panOnScroll
          panOnDrag
        >
          <Background color="#1e293b" gap={24} size={1.5} />
          <Controls
            showInteractive={false}
            className="!bg-rpg-panel !border-rpg-border !rounded-xl overflow-hidden shadow-xl"
          />
          <MiniMap
            pannable
            zoomable
            nodeColor={node => {
              const group = (node.data as GroupNodeData | undefined)?.group;
              if (!group) return '#334155';

              const statuses = group.members.map(getNodeStatus);
              return statuses.every(status => status === 'MASTERED')
                ? '#f59e0b'
                : statuses.some(status => status === 'AVAILABLE')
                  ? '#06b6d4'
                  : '#334155';
            }}
            maskColor="rgba(9, 13, 22, 0.85)"
            className="!bg-rpg-panel !border-rpg-border !rounded-xl overflow-hidden shadow-xl hidden md:block"
          />
        </ReactFlow>
      )}
    </div>
  );
}

export const SkillTreeGraph: React.FC<Props> = props => (
  <ReactFlowProvider>
    <Inner {...props} />
  </ReactFlowProvider>
);
