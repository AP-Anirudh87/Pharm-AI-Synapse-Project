import React, { useState } from 'react';

interface ResumeDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RESUME_BULLETS = [
  "Engineered 'Pharm AI Synapse', a full-stack AI-driven chemical exploration platform featuring real-time 3D conformer simulation, multi-objective QSAR scoring, and automated PubChem/ChEMBL/BindingDB evidence verification.",
  "Designed an interactive 3D WebGL molecular simulation and decision-tree architecture ('Chess.com for chemical synthesis') enabling researchers to navigate chemical modification spaces with real-time Pareto optimization.",
  "Implemented high-throughput Cheminformatics pipelines using RDKit (ETKDGv3 distance geometry & MMFF94 force-field energy minimization) and Scikit-Learn QSAR models with Morgan fingerprint featurization.",
  "Architected concurrent asynchronous backend services with FastAPI, SQLAlchemy ORM, and resilient fallback mechanisms for offline drug research and zero-downtime exploration."
];

export const ResumeDossierModal: React.FC<ResumeDossierModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(RESUME_BULLETS.join('\n\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-mol-darker border border-mol-accent/40 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg bg-mol-card text-mol-muted hover:text-white hover:bg-mol-card/80 transition-colors"
        >
          ✕
        </button>

        {/* Header Profile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-mol-border pb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="/Pharm_AI_Synapse_Logo.png"
                alt="Pharm AI Synapse"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/30"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-white">A.P. Anirudh</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-mol-accent/20 text-mol-accent border border-mol-accent/40">
                  Lead Architect
                </span>
              </div>
              <p className="text-sm text-mol-cyan font-medium mt-0.5">
                AI Drug Discovery & Full-Stack Systems Engineer
              </p>
              <p className="text-xs text-mol-muted mt-1">
                Project: <strong className="text-white">Pharm AI Synapse</strong> — Autonomous Molecular Evolution Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-mol-accent to-mol-accent2 text-white shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2"
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Resume Bullets'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-mol-card border border-mol-border text-mol-muted hover:text-white transition-all"
              title="Print or Save as PDF"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Tech Stack Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-mol-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mol-cyan" />
            Core Engineering Stack
          </h3>
          <div className="flex flex-wrap gap-2">
            {[
              'Python 3.13',
              'FastAPI',
              'RDKit (ETKDGv3 3D & MMFF94)',
              'Three.js (Hardware WebGL)',
              'React 18 + TypeScript',
              'Scikit-Learn QSAR',
              'React Flow (Heuristic Trees)',
              'Recharts (Pareto Radars)',
              'SQLite & SQLAlchemy ORM',
              'PubChem / ChEMBL APIs',
              'TailwindCSS 3',
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-mol-card/80 text-mol-muted border border-mol-border hover:border-mol-accent/40 hover:text-white transition-all"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Executive Highlights (Resume Ready) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-mol-text uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mol-accent" />
            Key Research & Engineering Accomplishments
          </h3>
          <div className="space-y-3">
            {RESUME_BULLETS.map((bullet, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-mol-dark/60 border border-mol-border/60 hover:border-mol-accent/30 transition-all text-xs text-mol-muted leading-relaxed flex items-start gap-3"
              >
                <span className="w-5 h-5 rounded-md bg-mol-accent/15 text-mol-accent font-bold flex items-center justify-center flex-shrink-0 text-[11px] mt-0.5">
                  {idx + 1}
                </span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Theoretical Framework & Scientific Honesty Statement */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/40 border border-indigo-500/20 text-xs space-y-2">
          <div className="font-bold text-white flex items-center gap-2">
            <span>🔬</span>
            Scientific Rigor & Validation Protocol
          </div>
          <p className="text-mol-muted text-[11px] leading-relaxed">
            All computational hypotheses generated by <em>Pharm AI Synapse</em> adhere to strict biomedical transparency. Candidate scores represent multi-objective heuristic estimations (Oral Absorption, Target Affinity, Solubility, and Cytotoxicity Penalties) calibrated against known historical prodrug modifications (such as the Ampicillin → Pivampicillin pathway) without claiming unverified in vitro discovery.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-mol-subtle pt-2 border-t border-mol-border/60">
          <span>Candidate Portfolio Dossier • A.P. Anirudh</span>
          <button
            onClick={onClose}
            className="text-mol-accent hover:underline font-semibold"
          >
            Back to Simulation →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeDossierModal;
