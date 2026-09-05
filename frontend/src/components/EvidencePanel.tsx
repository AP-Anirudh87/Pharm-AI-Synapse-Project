import React from 'react';
import { EvidenceRecord } from '../types/candidate';

interface EvidencePanelProps {
  evidence: EvidenceRecord[];
  candidateName: string;
}

const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence, candidateName }) => {
  if (evidence.length === 0) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-cyan">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Evidence for {candidateName}
        </h3>
        <p className="text-xs text-mol-subtle">No evidence records available for this compound.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-xs font-semibold text-mol-text uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mol-cyan">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Evidence for {candidateName}
      </h3>

      <div className="space-y-2">
        {evidence.map((rec, i) => (
          <div
            key={i}
            className={`rounded-lg px-4 py-3 border transition-all ${
              rec.is_experimental
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-mol-dark/50 border-mol-border'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${rec.is_experimental ? 'bg-emerald-500' : 'bg-mol-subtle'}`} />
                <span className="text-xs font-semibold text-mol-text">{rec.source}</span>
                <span className="text-[10px] text-mol-subtle">({rec.database})</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                rec.is_experimental ? 'badge-known' : 'badge-predicted'
              }`}>
                {rec.is_experimental ? 'Experimental' : 'No Match'}
              </span>
            </div>

            <p className="text-xs text-mol-muted leading-relaxed">{rec.description}</p>

            {rec.external_url && (
              <a
                href={rec.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-mol-accent hover:text-mol-accent2 mt-1.5 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                View in {rec.source} →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvidencePanel;
