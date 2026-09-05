import React from 'react';

interface HeaderProps {
  demoMode?: boolean;
  onOpenDossier: () => void;
  background3DEnabled?: boolean;
  onToggleBackground3D?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  demoMode = true,
  onOpenDossier,
  background3DEnabled = true,
  onToggleBackground3D,
}) => {
  return (
    <header className="border-b border-mol-border/80 bg-mol-darker/90 backdrop-blur-xl sticky top-0 z-40 transition-all shadow-xl">
      <div className="flex flex-wrap items-center justify-between px-6 py-3 gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <circle cx="5" cy="6" r="2" />
              <circle cx="19" cy="6" r="2" />
              <circle cx="5" cy="18" r="2" />
              <circle cx="19" cy="18" r="2" />
              <line x1="7" y1="7" x2="10" y2="10" />
              <line x1="14" y1="10" x2="17" y2="7" />
              <line x1="7" y1="17" x2="10" y2="14" />
              <line x1="14" y1="14" x2="17" y2="17" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                PHARM AI SYNAPSE
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                3D Engine
              </span>
            </div>
            <p className="text-xs text-mol-muted">
              Autonomous Molecular Evolution & Multi-Objective Evidence Platform
            </p>
          </div>
        </div>

        {/* Lead Engineer / Resume Attribution & Controls */}
        <div className="flex items-center gap-3">
          {/* Author Badge that opens the Resume Dossier Modal */}
          <button
            onClick={onOpenDossier}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-900/60 via-purple-900/50 to-indigo-900/60 border border-indigo-500/40 text-indigo-200 hover:text-white hover:border-indigo-400 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            title="Click to view full architecture & resume credentials"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Architect: <strong className="text-white font-bold">A.P. Anirudh</strong></span>
            <span className="text-[10px] text-indigo-300 ml-1 underline underline-offset-2">Resume Dossier ↗</span>
          </button>

          {/* 3D Background Toggle */}
          {onToggleBackground3D && (
            <button
              onClick={onToggleBackground3D}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                background3DEnabled
                  ? 'bg-mol-card/80 border-cyan-500/30 text-cyan-300 shadow-sm'
                  : 'bg-mol-card/40 border-mol-border text-mol-subtle hover:text-mol-text'
              }`}
              title="Toggle 3D Synaptic Mesh in background"
            >
              🌐 3D Synapse: {background3DEnabled ? 'ON' : 'OFF'}
            </button>
          )}

          {/* Status indicators */}
          {demoMode && (
            <span className="px-3 py-1 rounded-full text-xs font-medium badge-predicted">
              QSAR Active
            </span>
          )}
        </div>
      </div>

      {/* Scientific Transparency Disclaimer */}
      <div className="px-6 pb-2">
        <div className="disclaimer-banner text-center text-[11px]">
          ⚠️ <strong>Research Prototype</strong>: Computational predictions are heuristic estimations calibrated for molecular evolution, not clinical medical advice or proof of in vitro drug efficacy.
        </div>
      </div>
    </header>
  );
};

export default Header;
