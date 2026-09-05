import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CandidateInfo } from '../types/candidate';
import { MoleculeInfo } from '../types/molecule';

// ---- Custom Node ----
interface MolNodeData {
  label: string;
  subtitle: string;
  status: 'root' | 'known' | 'predicted' | 'selected';
  similarity?: number | null;
  [key: string]: unknown;
}

function MoleculeNode({ data, selected }: NodeProps<Node<MolNodeData>>) {
  const statusColors: Record<string, { bg: string; border: string; glow: string }> = {
    root: { bg: 'from-mol-accent to-mol-accent2', border: 'border-mol-accent/50', glow: 'shadow-mol-accent/20' },
    known: { bg: 'from-emerald-600 to-emerald-500', border: 'border-emerald-500/50', glow: 'shadow-emerald-500/20' },
    predicted: { bg: 'from-amber-600 to-amber-500', border: 'border-amber-500/50', glow: 'shadow-amber-500/20' },
    selected: { bg: 'from-blue-600 to-blue-500', border: 'border-blue-500/50', glow: 'shadow-blue-500/20' },
  };
  const s = statusColors[data.status as string] || statusColors.predicted;

  return (
    <div className={`relative px-4 py-3 rounded-xl border bg-mol-card ${s.border} ${selected ? 'ring-2 ring-mol-accent shadow-lg ' + s.glow : ''} transition-all cursor-pointer hover:shadow-lg min-w-[140px]`}>
      <Handle type="target" position={Position.Top} className="!bg-mol-subtle !w-2 !h-2 !border-0" />
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r ${s.bg}`} />
      <div className="text-xs font-semibold text-mol-text truncate max-w-[160px]">{data.label}</div>
      <div className="text-[10px] text-mol-muted mt-0.5 truncate max-w-[160px]">{data.subtitle}</div>
      {data.similarity != null && (
        <div className="text-[9px] text-mol-subtle mt-1 font-mono">
          Sim: {(data.similarity * 100).toFixed(1)}%
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-mol-subtle !w-2 !h-2 !border-0" />
    </div>
  );
}

const nodeTypes = { molecule: MoleculeNode };

// ---- Main Component ----
interface ChemicalTreeProps {
  molecule: MoleculeInfo | null;
  candidates: CandidateInfo[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
}

const ChemicalTree: React.FC<ChemicalTreeProps> = ({
  molecule,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node<MolNodeData>[] = [];
    const edges: Edge[] = [];

    if (!molecule) return { initialNodes: nodes, initialEdges: edges };

    // Root node
    nodes.push({
      id: 'root',
      type: 'molecule',
      position: { x: 300, y: 0 },
      data: {
        label: molecule.name || 'Input Molecule',
        subtitle: molecule.molecular_formula || molecule.smiles?.slice(0, 30) || '',
        status: 'root',
      },
    });

    // Candidate nodes
    const spacing = 200;
    const startX = 300 - ((candidates.length - 1) * spacing) / 2;

    candidates.forEach((cand, i) => {
      const isKnown = cand.evidence_status === 'EXPERIMENTALLY_REPORTED';
      const isSelected = cand.id === selectedCandidateId;

      nodes.push({
        id: cand.id,
        type: 'molecule',
        position: { x: startX + i * spacing, y: 140 },
        data: {
          label: cand.name || `Candidate ${i + 1}`,
          subtitle: cand.transformation || cand.molecular_formula || '',
          status: isSelected ? 'selected' : isKnown ? 'known' : 'predicted',
          similarity: cand.similarity_to_parent,
        },
        selected: isSelected,
      });

      edges.push({
        id: `e-root-${cand.id}`,
        source: 'root',
        target: cand.id,
        type: 'smoothstep',
        style: {
          stroke: isKnown ? '#10b981' : '#f59e0b',
          strokeWidth: 2,
          strokeDasharray: isKnown ? undefined : '5,5',
        },
        animated: !isKnown,
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [molecule, candidates, selectedCandidateId]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== 'root') {
        onSelectCandidate(node.id);
      }
    },
    [onSelectCandidate],
  );

  if (!molecule) {
    return (
      <div className="glass-card h-[350px] flex items-center justify-center">
        <p className="text-mol-subtle text-sm">Load a molecule to see the exploration tree</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden" style={{ height: 350 }}>
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex gap-3 bg-mol-dark/80 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-mol-border">
        <span className="flex items-center gap-1.5 text-[10px] text-mol-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500" />
          Known
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-mol-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-600 to-amber-500" />
          Predicted
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-mol-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500" />
          Selected
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as MolNodeData;
            if (d.status === 'root') return '#6366f1';
            if (d.status === 'known') return '#10b981';
            if (d.status === 'selected') return '#3b82f6';
            return '#f59e0b';
          }}
          maskColor="rgba(10,14,26,0.8)"
        />
      </ReactFlow>
    </div>
  );
};

export default ChemicalTree;
