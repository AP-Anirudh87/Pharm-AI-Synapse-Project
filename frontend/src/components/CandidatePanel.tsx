import React, { useState } from 'react';
import { CandidateInfo } from '../types/candidate';
import Molecule3DViewer from './Molecule3DViewer';

interface CandidatePanelProps {
  candidate: CandidateInfo | null;
  onClose: () => void;
}

const CandidatePanel: React.FC<CandidatePanelProps> = ({ candidate, onClose }) => {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  if (!candidate) return null;

  const isKnown = candidate.evidence_status === 'EXPERIMENTALLY_REPORTED';

  // Chess-style Move Evaluation annotation
  const score = candidate.ranking_score ?? 0;
  const isProdrug = candidate.transformation.toLowerCase().includes('prodrug') || candidate.name.toLowerCase().includes('pivampicillin');
  const moveBadge = isProdrug ? {
    tag: '🌟 Brilliant Move',
    eval: '+2.85',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    desc: 'Lipophilicity esterification solves cellular barrier without impairing beta-lactam binding.',
  } : score > 0.65 ? {
    tag: '🎯 Book Move',
    eval: `+${(score * 2).toFixed(2)}`,
    color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    desc: 'High multi-objective Pareto alignment with target research objectives.',
  } : {
    tag: '⚖️ Tactical Trade-Off',
    eval: `+${(score * 1.5).toFixed(2)}`,
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    desc: 'Moderate property balance requiring further metabolic optimization.',
  };

  return (
    <div className="glass-card p-5 animate-slide-in space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-white">{candidate.name || 'Unnamed Candidate'}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${moveBadge.color}`}>
              {moveBadge.tag} {moveBadge.eval}
            </span>
          </div>
          <p className="text-xs text-mol-muted mt-0.5">{candidate.transformation}</p>
        </div>
        <button
          onClick={onClose}
          className="text-mol-subtle hover:text-mol-text p-1.5 rounded-lg bg-mol-dark/60 border border-mol-border/40 hover:bg-mol-card transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Chess Evaluation Insight */}
      <div className="p-2.5 rounded-lg bg-mol-dark/60 border border-mol-border text-xs flex items-start gap-2">
        <span className="text-base">♟️</span>
        <div>
          <span className="font-bold text-white text-[11px] block">Chemical Move Evaluation</span>
          <span className="text-[10px] text-mol-muted">{moveBadge.desc}</span>
        </div>
      </div>

      {/* Status badge */}
      <div>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${isKnown ? 'badge-known' : 'badge-predicted'}`}>
          {isKnown ? '✓ Experimentally Reported Record' : '⚠ Computational Hypothesis (Unmatched in DB)'}
        </span>
      </div>

      {/* 2D vs 3D View Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-mol-text uppercase tracking-wider">Molecular Conformation</span>
          <div className="flex items-center gap-1 bg-mol-dark/90 p-0.5 rounded-lg border border-mol-border">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === '3d'
                  ? 'bg-mol-accent text-white shadow'
                  : 'text-mol-muted hover:text-mol-text'
              }`}
            >
              🌐 3D WebGL
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === '2d'
                  ? 'bg-mol-accent text-white shadow'
                  : 'text-mol-muted hover:text-mol-text'
              }`}
            >
              🧪 2D Sketch
            </button>
          </div>
        </div>

        {viewMode === '3d' ? (
          <Molecule3DViewer
            conformer={candidate.conformer_3d}
            smiles={candidate.smiles}
            name={candidate.name}
            height={260}
          />
        ) : (
          candidate.image_base64 && (
            <div className="bg-white rounded-xl p-3 flex justify-center shadow-inner">
              <img
                src={`data:image/png;base64,${candidate.image_base64}`}
                alt={`2D structure of ${candidate.name}`}
                className="max-h-[220px] object-contain"
              />
            </div>
          )
        )}
      </div>

      {/* Properties */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <InfoRow label="SMILES" value={candidate.smiles} mono />
        <InfoRow label="Formula" value={candidate.molecular_formula} />
        <InfoRow label="MW" value={candidate.molecular_weight?.toFixed(2)} />
        <InfoRow label="Similarity" value={candidate.similarity_to_parent != null ? `${(candidate.similarity_to_parent * 100).toFixed(1)}%` : '—'} />
        <InfoRow label="Generation Engine" value={candidate.generation_method} />
        <InfoRow label="Pareto Index" value={candidate.ranking_score?.toFixed(4)} highlight />
      </div>

      {/* Predictions */}
      {candidate.predictions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-2">Predicted Properties (QSAR)</h4>
          <div className="disclaimer-banner text-[10px] mb-2">
            ⚠ Computational Prediction — not clinically verified
          </div>
          <div className="space-y-1.5">
            {candidate.predictions.map((pred, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-mol-dark/50 rounded-lg px-3 py-2">
                <span className="text-mol-muted capitalize">{pred.property_name}</span>
                <span className="font-mono font-medium text-mol-text">
                  {pred.value != null ? pred.value.toFixed(3) : '—'}
                  {pred.unit && <span className="text-mol-subtle ml-1 text-[10px]">{pred.unit}</span>}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-mol-subtle mt-1.5 text-center italic">
            {candidate.predictions[0]?.method || 'Multi-Target QSAR Model'}
          </p>
        </div>
      )}

      {/* Ranking breakdown */}
      {candidate.ranking_breakdown && (
        <div>
          <h4 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-2">Objective Weight Contribution</h4>
          <div className="space-y-1">
            {Object.entries(candidate.ranking_breakdown).map(([key, item]) => (
              <div key={key} className="flex items-center justify-between text-xs px-3 py-1.5 bg-mol-dark/50 rounded-lg">
                <span className="text-mol-muted capitalize flex items-center gap-1">
                  {key}
                  {item.inverted && <span className="text-[9px] text-mol-subtle">(inv)</span>}
                </span>
                <span className="font-mono text-mol-text">
                  {item.score != null ? item.score.toFixed(3) : '—'} × {item.weight.toFixed(2)} = <span className="text-mol-accent font-semibold">{item.contribution.toFixed(4)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      {candidate.note && (
        <p className="text-[10px] text-mol-subtle bg-mol-dark/50 rounded-lg px-3 py-2 leading-relaxed italic">
          {candidate.note}
        </p>
      )}
    </div>
  );
};

function InfoRow({ label, value, mono, highlight }: { label: string; value?: string | null; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="bg-mol-dark/50 rounded-lg px-3 py-2 border border-mol-border/40">
      <span className="text-mol-subtle block text-[10px] uppercase tracking-wider">{label}</span>
      <span className={`block truncate ${mono ? 'font-mono text-[10px]' : 'text-xs'} ${highlight ? 'text-mol-accent font-bold' : 'text-mol-text'}`}>
        {value || '—'}
      </span>
    </div>
  );
}

export default CandidatePanel;
