import React, { useState } from 'react';

interface MoleculeInputProps {
  onSubmit: (name: string, smiles: string) => void;
  loading?: boolean;
}

const PRESETS = [
  { name: 'Ampicillin', smiles: 'CC1(C)SC2C(NC(=O)C(N)c3ccccc3)C(=O)N2C1C(=O)O', desc: 'Oral Bioavailability Prodrug' },
  { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O', desc: 'Anti-Inflammatory Analgesic' },
  { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(C(C)C(=O)O)cc1', desc: 'Gastric Tolerance Optimization' },
  { name: 'Paracetamol', smiles: 'CC(=O)Nc1ccc(O)cc1', desc: 'Hepatotoxicity Mitigation' },
];

const MoleculeInput: React.FC<MoleculeInputProps> = ({ onSubmit, loading = false }) => {
  const [name, setName] = useState('');
  const [smiles, setSmiles] = useState('');

  const handleSubmit = () => {
    if (!name.trim() && !smiles.trim()) return;
    onSubmit(name.trim(), smiles.trim());
  };

  const handleSelectPreset = (presetName: string, presetSmiles: string) => {
    setName(presetName);
    setSmiles(presetSmiles);
    onSubmit(presetName, presetSmiles);
  };

  return (
    <div className="space-y-3.5">
      <h2 className="text-xs font-bold text-mol-text uppercase tracking-wider flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-mol-accent">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Target Compound
      </h2>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-medium text-mol-muted mb-1">Compound Name</label>
          <input
            id="molecule-name-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ampicillin"
            className="w-full px-3 py-2 bg-mol-dark/80 border border-mol-border rounded-lg text-xs text-mol-text placeholder-mol-subtle focus:border-mol-accent focus:ring-1 focus:ring-mol-accent/40 outline-none transition-all"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-mol-muted mb-1">SMILES Representation</label>
          <input
            id="molecule-smiles-input"
            type="text"
            value={smiles}
            onChange={e => setSmiles(e.target.value)}
            placeholder="e.g. CC1(C)SC2C(NC(=O)..."
            className="w-full px-3 py-2 bg-mol-dark/80 border border-mol-border rounded-lg text-[11px] text-mol-text font-mono placeholder-mol-subtle focus:border-mol-accent focus:ring-1 focus:ring-mol-accent/40 outline-none transition-all"
            disabled={loading}
          />
        </div>
      </div>

      <button
        id="load-molecule-btn"
        onClick={handleSubmit}
        disabled={loading || (!name.trim() && !smiles.trim())}
        className="w-full py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-mol-accent via-indigo-500 to-purple-600 text-white shadow-lg shadow-mol-accent/20 hover:shadow-mol-accent/35 active:scale-[0.98] cursor-pointer"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Generating 3D Simulation…
          </span>
        ) : (
          '⚡ Analyze & Synthesize Branches'
        )}
      </button>

      {/* Fast Compound Presets */}
      <div className="pt-2 border-t border-mol-border/60">
        <label className="block text-[10px] font-semibold text-mol-subtle uppercase tracking-wider mb-2">
          One-Click Research Presets
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(p.name, p.smiles)}
              disabled={loading}
              className="text-left p-2 rounded-lg bg-mol-card/60 hover:bg-mol-card border border-mol-border/80 hover:border-indigo-500/40 text-mol-muted hover:text-white transition-all disabled:opacity-40 cursor-pointer"
            >
              <div className="text-[11px] font-bold text-indigo-300">{p.name}</div>
              <div className="text-[9px] text-mol-subtle truncate">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoleculeInput;
