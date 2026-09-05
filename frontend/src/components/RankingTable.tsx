import React from 'react';
import { CandidateInfo } from '../types/candidate';

interface RankingTableProps {
  candidates: CandidateInfo[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
}

const RankingTable: React.FC<RankingTableProps> = ({ candidates, selectedCandidateId, onSelectCandidate }) => {
  if (candidates.length === 0) {
    return (
      <div className="glass-card p-4 flex items-center justify-center h-[200px]">
        <p className="text-mol-subtle text-sm">No candidates to rank</p>
      </div>
    );
  }

  const getPredValue = (cand: CandidateInfo, prop: string): string => {
    const pred = cand.predictions.find(p => p.property_name === prop);
    if (!pred || pred.value == null) return '—';
    return pred.value.toFixed(3);
  };

  // Sort by ranking_score descending
  const sorted = [...candidates].sort((a, b) => (b.ranking_score ?? 0) - (a.ranking_score ?? 0));

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 pb-2">
        <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-accent">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Candidate Ranking
        </h3>
        <p className="text-[10px] text-mol-subtle mt-1">
          Rankings based on weighted computational predictions. Not clinical recommendations.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-mol-border text-mol-subtle">
              <th className="text-left py-2 px-4 font-medium">#</th>
              <th className="text-left py-2 px-4 font-medium">Candidate</th>
              <th className="text-left py-2 px-4 font-medium">Status</th>
              <th className="text-right py-2 px-4 font-medium">Activity</th>
              <th className="text-right py-2 px-4 font-medium">Absorption</th>
              <th className="text-right py-2 px-4 font-medium">Solubility</th>
              <th className="text-right py-2 px-4 font-medium">Toxicity</th>
              <th className="text-right py-2 px-4 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cand, i) => {
              const isKnown = cand.evidence_status === 'EXPERIMENTALLY_REPORTED';
              const isSelected = cand.id === selectedCandidateId;

              return (
                <tr
                  key={cand.id}
                  onClick={() => onSelectCandidate(cand.id)}
                  className={`border-b border-mol-border/50 cursor-pointer transition-colors
                    ${isSelected ? 'bg-mol-accent/10' : 'hover:bg-mol-card/80'}`}
                >
                  <td className="py-2.5 px-4 font-bold text-mol-accent">{i + 1}</td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-mol-text">{cand.name || `Candidate ${i + 1}`}</div>
                    <div className="text-[10px] text-mol-subtle truncate max-w-[180px]">{cand.transformation}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isKnown ? 'badge-known' : 'badge-predicted'}`}>
                      {isKnown ? 'Known' : 'Predicted'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'activity')}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'absorption')}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'solubility')}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-mol-text">{getPredValue(cand, 'toxicity')}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className="font-mono font-bold text-mol-accent">
                      {cand.ranking_score?.toFixed(4) ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RankingTable;
