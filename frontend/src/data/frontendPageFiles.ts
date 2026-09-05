/**
 * Unabridged source code for master landing and product guide pages in Pharm AI Synapse.
 * 100% complete — zero lines truncated.
 */

export const FRONTEND_PAGE_FILES: Record<string, { language: string; desc: string; metrics: string; code: string }> = {
  'frontend/src/pages/LandingShowcase.tsx': {
    language: 'TypeScript / React',
    desc: 'Master landing showcase featuring 3D pillars, architectural breakdown, and unabridged CodeSpace explorer.',
    metrics: '484 lines • Master Showcase • CodeSpace Explorer',
    code: `import React, { useState } from 'react';
import { FILE_SOURCE_CODES, COMPLETE_CODEBASE_TREE, FileTreeNode } from '../data/codebaseTreeData';

interface LandingShowcaseProps {
  onNavigateToGuide: () => void;
  onNavigateToStudio: () => void;
  onOpenDossier: () => void;
}

export const LandingShowcase: React.FC<LandingShowcaseProps> = ({
  onNavigateToGuide,
  onNavigateToStudio,
  onOpenDossier,
}) => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>('backend/app/chemistry/rdkit_utils.py');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  const [expandFullCode, setExpandFullCode] = useState<boolean>(false);
  const [wrapCode, setWrapCode] = useState<boolean>(true);
  const codeContainerRef = React.useRef<HTMLDivElement>(null);

  const activeFileData = FILE_SOURCE_CODES[selectedFilePath] || FILE_SOURCE_CODES['backend/app/chemistry/rdkit_utils.py'] || {
    language: 'Code',
    desc: 'Repository source file',
    metrics: 'Production File',
    code: '// File content loading...',
  };

  const codeLines = (activeFileData?.code || '').split('\\n');
  const totalLineCount = codeLines.length;

  React.useEffect(() => {
    codeContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedFilePath]);

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [path]: !(prev[path] ?? allExpanded),
    }));
  };

  const handleToggleAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    setExpandedNodes({});
  };

  const handleCopyCode = () => {
    if (activeFileData?.code) {
      navigator.clipboard.writeText(activeFileData.code);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const scrollToTop = () => {
    codeContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (codeContainerRef.current) {
      codeContainerRef.current.scrollTo({ top: codeContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const hasMatchingChild = (node: FileTreeNode, query: string): boolean => {
    if (!query) return true;
    if (node.name.toLowerCase().includes(query.toLowerCase())) return true;
    if (node.children) {
      return node.children.some((child) => hasMatchingChild(child, query));
    }
    return false;
  };

  const renderTree = (nodes: FileTreeNode[], depth = 0): React.ReactNode => {
    return (
      <div className="space-y-0.5 text-xs">
        {nodes.map((node) => {
          const isFolder = node.type === 'folder';
          const isExpanded = expandedNodes[node.path] ?? allExpanded;
          const isSelected = selectedFilePath === node.path;

          if (searchQuery && !hasMatchingChild(node, searchQuery)) {
            return null;
          }

          return (
            <div key={node.path} style={{ paddingLeft: \`\${depth * 10}px\` }}>
              <div
                onClick={() => {
                  if (isFolder) {
                    toggleNode(node.path);
                  } else {
                    setSelectedFilePath(node.path);
                  }
                }}
                className={\`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all \${
                  isSelected
                    ? 'bg-indigo-600/40 border border-indigo-500/60 text-white font-bold shadow'
                    : isFolder
                    ? 'hover:bg-slate-800/60 font-semibold text-slate-200'
                    : 'hover:bg-slate-800/40 text-slate-400 hover:text-white'
                }\`}
              >
                <span className="text-sm">{isFolder ? (isExpanded ? '📂' : '📁') : '📄'}</span>
                <span className={\`truncate \${isFolder ? 'text-indigo-300' : isSelected ? 'text-cyan-300' : 'text-slate-300'}\`}>
                  {node.name}
                </span>
                {isSelected && (
                  <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    OPEN
                  </span>
                )}
              </div>

              {isFolder && isExpanded && node.children && (
                <div className="border-l border-slate-700/50 ml-2.5">
                  {renderTree(node.children, depth + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 md:p-12 space-y-16 max-w-7xl mx-auto animate-fade-in text-slate-100">
      {/* ─── HERO SECTION ─── */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-bold tracking-wide shadow-lg shadow-indigo-500/10">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Autonomous 3D Drug Discovery & Molecular CAD Platform</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
          PHARM AI{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400">
            SYNAPSE
          </span>
        </h1>

        <div className="flex items-center justify-center gap-3">
          <span className="text-lg md:text-xl text-cyan-300 font-semibold">
            Architected & Engineered by A.P. Anirudh
          </span>
          <a
            href="https://github.com/AP-Anirudh87"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all cursor-pointer"
          >
            <span>🐙 GitHub: @AP-Anirudh87</span>
          </a>
        </div>

        <p className="text-sm md:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
          A biochemical exploration engine operating like <strong>Chess.com for chemical synthesis</strong>. 
          Navigate modification branches in real-time 3D WebGL, predict multi-objective therapeutic properties with QSAR models, 
          and synthesize drug candidates with interactive Ghost Hypothesis editing.
        </p>

        {/* Primary Call-to-Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onNavigateToGuide}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>🚀 Getting Started</span>
            <span className="text-xs text-indigo-200">→ Feature Guide</span>
          </button>

          <button
            onClick={onNavigateToStudio}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-600 text-white font-black text-sm tracking-wide shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>💬 Move to Direct Chat</span>
            <span className="text-xs text-cyan-100">→ 3D CAD Studio</span>
          </button>

          <button
            onClick={onOpenDossier}
            className="px-5 py-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-indigo-400 text-slate-200 hover:text-white font-bold text-sm transition-all cursor-pointer"
          >
            📄 Resume & Project Dossier
          </button>
        </div>
      </section>

      {/* ─── 3 CORE PILLARS OVERVIEW ─── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-indigo-500/30 shadow-xl space-y-3 backdrop-blur-md hover:border-indigo-400/60 transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl">
            🌐
          </div>
          <h3 className="text-base font-bold text-white">Hardware 3D WebGL CAD</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Three.js chemical visualization with RDKit ETKDGv3 conformers, atom hover raycasting, receptor pocket cavity backdrop, and CPK space-filling modes.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-purple-500/30 shadow-xl space-y-3 backdrop-blur-md hover:border-purple-400/60 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-2xl">
            ♟️
          </div>
          <h3 className="text-base font-bold text-white">Chess-Style Decision Tree</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Evaluates chemical modifications like grandmaster chess moves, displaying centipawn-style therapeutic scores, brilliant move annotations, and Pareto frontier optimization.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-cyan-500/30 shadow-xl space-y-3 backdrop-blur-md hover:border-cyan-400/60 transition-all">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-2xl">
            🔬
          </div>
          <h3 className="text-base font-bold text-white">Ghost Hypothesis Synthesis</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Interactive atom editing displaying lighter-shade holographic ghost branches of potential isomer combinations before committing permanent chemical bonds.
          </p>
        </div>
      </section>

      {/* ─── ARCHITECTURE & INTERACTIVE CODE SPACE EXPLORER ─── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span className="text-indigo-400">⚡</span> Interactive Code Space & Architecture
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Every single file in the repository is inspectable below with 100% genuine, unabridged production source code.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              {activeFileData.language}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              {activeFileData.metrics.split('•')[0]}
            </span>
          </div>
        </div>

        {/* Dual-Pane Code Space: Complete File Tree (Left) + Source Code Viewer (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden min-h-[580px]">
          {/* Left Pane: Complete File Tree Explorer (4 cols) */}
          <div className="lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#080d19]/90 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">Repository Files</span>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                {Object.keys(FILE_SOURCE_CODES).length} Production Files
              </span>
            </div>

            {/* Quick File Search Box & Folder Expand/Collapse Toggle */}
            <div className="mb-2.5 flex items-center gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 53 files (e.g. routes, rdkit, api, editor)..."
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleToggleAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer"
                title={allExpanded ? 'Collapse all folders' : 'Expand all folders'}
              >
                {allExpanded ? '📁 Collapse' : '📂 Expand'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] pr-1">
              {renderTree(COMPLETE_CODEBASE_TREE)}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Lead Architect:</span>
              <a 
                href="https://github.com/AP-Anirudh87" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-cyan-400 hover:underline font-bold"
              >
                A.P. Anirudh
              </a>
            </div>
          </div>

          {/* Right Pane: Interactive Source Code Viewer (8 cols) */}
          <div className="lg:col-span-8 flex flex-col bg-[#050811]">
            {/* Editor Tab Bar */}
            <div className="px-4 py-2.5 bg-[#090e1c] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                <span className="ml-3 text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <span>📄</span> {selectedFilePath.split('/').pop()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  ({selectedFilePath})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Word Wrap Toggle Button */}
                <button
                  onClick={() => setWrapCode(!wrapCode)}
                  className={\`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer \${
                    wrapCode
                      ? 'bg-purple-900/60 border border-purple-500/50 text-purple-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }\`}
                  title={wrapCode ? 'Disable word wrapping' : 'Enable word wrap so code lines never overflow horizontally'}
                >
                  <span>{wrapCode ? '↩ Wrap: ON' : '⇥ Wrap: OFF'}</span>
                </button>

                {/* Expand / View All Lines Toggle Button */}
                <button
                  onClick={() => setExpandFullCode(!expandFullCode)}
                  className={\`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer \${
                    expandFullCode
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                  }\`}
                  title={expandFullCode ? 'Collapse to scrollable window' : 'Expand viewer to display all lines continuously'}
                >
                  {expandFullCode ? (
                    <>
                      <span>↕</span>
                      <span>Compact View</span>
                    </>
                  ) : (
                    <>
                      <span>⤢</span>
                      <span>View All {totalLineCount} Lines</span>
                    </>
                  )}
                </button>

                {!expandFullCode && (
                  <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={scrollToTop}
                      className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      title="Scroll to Top"
                    >
                      Top ↑
                    </button>
                    <button
                      onClick={scrollToBottom}
                      className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      title="Scroll to Bottom"
                    >
                      Bottom ↓
                    </button>
                  </div>
                )}

                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                >
                  {copySuccess ? <span className="text-emerald-400">✓ Copied</span> : <span>📋 Copy Code</span>}
                </button>
              </div>
            </div>

            {/* File Description Header */}
            <div className="p-3.5 bg-indigo-950/20 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-slate-300 max-w-xl">
                <strong className="text-indigo-300">Role: </strong>
                {activeFileData.desc}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Showing all {totalLineCount} lines • Unabridged
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-1 rounded-md border border-cyan-500/20">
                  {activeFileData.metrics}
                </span>
              </div>
            </div>

            {/* Code Content View with Aligned Line Numbers & Full-Line Expansion */}
            <div 
              ref={codeContainerRef}
              className={\`flex-1 overflow-y-auto \${expandFullCode ? 'max-h-none' : 'max-h-[640px]'} p-3 font-mono text-xs text-slate-300 select-text bg-[#03060f]\`}
            >
              <div className="min-w-full inline-block">
                {codeLines.map((line, idx) => (
                  <div 
                    key={idx} 
                    className="flex hover:bg-slate-900/80 leading-5 group transition-colors rounded-sm"
                  >
                    <span className="w-12 shrink-0 select-none text-right pr-4 text-slate-600 group-hover:text-indigo-400 font-mono text-[11px] border-r border-slate-800/80">
                      {idx + 1}
                    </span>
                    <span className={\`pl-4 pr-6 flex-1 font-mono text-[11px] text-emerald-300/90 \${wrapCode ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-visible'}\`}>
                      {line || ' '}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BOTTOM QUICK LAUNCH BAR ─── */}
      <section className="p-8 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900/80 border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">Ready to Synthesize & Explore Molecules?</h3>
          <p className="text-xs text-slate-300">
            Choose whether to review the product usage guide or dive straight into the AI Chatbot & 3D CAD Studio.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onNavigateToGuide}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            🚀 View How-To Guide
          </button>
          <button
            onClick={onNavigateToStudio}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            💬 Open Direct Chat Studio
          </button>
        </div>
      </section>

      {/* ─── PORTFOLIO / RESUME ATTRIBUTION FOOTER ─── */}
      <footer className="pt-8 pb-12 border-t border-slate-800/80 text-center space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>FastAPI 0.115 Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Three.js r128 Hardware CAD</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>RDKit 2024.09 & QSAR ML</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Multi-Objective Pareto Ranker</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Pharm AI Synapse is designed, architected, and engineered by{' '}
          <a
            href="https://github.com/AP-Anirudh87"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 font-bold underline transition-colors"
          >
            A.P. Anirudh (@AP-Anirudh87)
          </a>
          . Open-source under the MIT License.
        </p>

        <div className="flex items-center justify-center gap-4 text-xs font-mono">
          <a
            href="https://github.com/AP-Anirudh87"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <span>GitHub Profile</span>
            <span className="text-cyan-400">↗</span>
          </a>
          <button
            onClick={onOpenDossier}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-indigo-400 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Technical Dossier</span>
            <span className="text-indigo-400">↗</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LandingShowcase;`,
  },

  'frontend/src/pages/ProductGuide.tsx': {
    language: 'TypeScript / React',
    desc: 'Commercial-grade interactive user guide & feature tour with animated UI simulations.',
    metrics: '236 lines • Interactive Product Guide • Visual Tour',
    code: `import React from 'react';

interface ProductGuideProps {
  onNavigateToStudio: () => void;
  onNavigateToLanding: () => void;
}

interface GuideStep {
  number: string;
  title: string;
  badge: string;
  description: string;
  features: string[];
  visualTag: string;
  icon: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    number: '01',
    title: 'Input Pharmacophore & Optimization Goals',
    badge: 'Input Phase',
    icon: '💊',
    visualTag: 'Compound Selector & Sliders',
    description:
      'Enter any compound name (e.g. Ampicillin, Aspirin) or custom SMILES string. Alternatively, click any 1-Click Research Preset. Customize optimization weights across Absorption, Activity, Solubility, and Toxicity penalties.',
    features: [
      'Automatic PubChem name-to-SMILES resolution',
      'Normalized multi-objective priority sliders (summing to 100%)',
      'Preset library for beta-lactams, NSAIDs, and analgesics',
    ],
  },
  {
    number: '02',
    title: 'Hardware 3D WebGL Molecular Simulation',
    badge: '3D Simulation',
    icon: '🌐',
    visualTag: 'Three.js 3D Conformer',
    description:
      'Inspect true 3D spatial conformations generated by RDKit ETKDGv3 and optimized with MMFF94 force-field energy minimization. Switch dynamically between Ball & Stick, Space-Filling CPK, and Wireframe.',
    features: [
      'Mouse drag rotation, mouse wheel zoom, and auto-spin controls',
      'Atom raycaster hover HUD displaying Element, 3D (X,Y,Z) coords, and formal charge',
      'Toggleable 3D Receptor Pocket cavity simulating target active sites',
    ],
  },
  {
    number: '03',
    title: 'Ghost Hypothesis Chemical Synthesis',
    badge: 'CAD Editor',
    icon: '✨',
    visualTag: 'Lighter Shade Isomers',
    description:
      'Edit atoms or synthesize new chemical branches like a CAD software. Clicking any atom displays holographic lighter-shade "Ghost" branches indicating available structural isomers before permanently bonding.',
    features: [
      'Lighter-shade translucent preview of structural isomers',
      'Reactive palette: Hydroxyl, Amine, Carboxyl, Prodrug Esters (POM), Fluorophenyl',
      'Click "Solidify Bond" to commit changes with instant QSAR score recalculation',
    ],
  },
  {
    number: '04',
    title: 'Chess-Style Decision Tree & Evidence Mapping',
    badge: 'Evaluation Engine',
    icon: '♟️',
    visualTag: 'React Flow Tree & Move Eval',
    description:
      'Explore candidate branches through a strategic decision tree. Each transformation receives a chess-style evaluation (e.g. Brilliant Move +2.85 for prodrug esterification) and cross-checks PubChem, ChEMBL, and BindingDB.',
    features: [
      'Grandmaster centipawn-style move evaluation annotations',
      'Pareto frontier radar charts comparing all candidates simultaneously',
      'Triple-database verification distinguishing experimentally reported vs novel candidates',
    ],
  },
];

export const ProductGuide: React.FC<ProductGuideProps> = ({
  onNavigateToStudio,
  onNavigateToLanding,
}) => {
  return (
    <div className="min-h-screen p-6 md:p-12 space-y-16 max-w-7xl mx-auto animate-fade-in text-slate-100">
      {/* Header */}
      <section className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold tracking-wide">
          <span>📖 Commercial Platform Guide & Feature Tour</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
          How to Use <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">Pharm AI Synapse</span>
        </h1>

        <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Master the complete AI drug discovery workflow, from 3D molecular CAD manipulation to QSAR Pareto ranking and evidence verification.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onNavigateToStudio}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 transition-all cursor-pointer"
          >
            🚀 Launch AI Chatbot & 3D CAD Studio →
          </button>
          <button
            onClick={onNavigateToLanding}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-all cursor-pointer"
          >
            ← Back to Showcase
          </button>
        </div>
      </section>

      {/* Step-by-Step Interactive Guide Cards */}
      <section className="space-y-8">
        {GUIDE_STEPS.map((step, idx) => (
          <div
            key={step.number}
            className="p-6 md:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 shadow-2xl space-y-6 backdrop-blur-xl transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                  {step.number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{step.title}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {step.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{step.description}</p>
                </div>
              </div>

              <span className="text-3xl hidden md:block">{step.icon}</span>
            </div>

            {/* Visual Simulated Mockup Box */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/20 shadow-inner space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Interface Simulation: {step.visualTag}
                  </span>
                  <span className="font-mono text-cyan-300 text-[10px]">Pharm AI Synapse 3D UI</span>
                </div>

                {idx === 0 && (
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-slate-300">Target Compound:</span>
                      <span className="font-mono text-indigo-300 font-bold">Ampicillin (CID 6249)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="p-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-bold">Oral Absorption (40%)</div>
                      <div className="p-2 rounded bg-purple-950/40 border border-purple-500/30 text-purple-300 font-bold">Activity (30%)</div>
                      <div className="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-300 font-bold">Low Toxicity (20%)</div>
                    </div>
                  </div>
                )}

                {idx === 1 && (
                  <div className="h-32 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex items-center justify-center relative overflow-hidden">
                    <div className="w-16 h-16 rounded-full border border-indigo-400/40 animate-ping absolute" />
                    <div className="flex items-center gap-3 text-xs font-bold text-white z-10">
                      <span className="px-2.5 py-1 rounded bg-indigo-600 text-[10px]">3D Ball & Stick</span>
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300">Space-Fill CPK</span>
                      <span className="px-2.5 py-1 rounded bg-cyan-950 text-[10px] text-cyan-300 border border-cyan-500/40">Receptor Pocket [ON]</span>
                    </div>
                  </div>
                )}

                {idx === 2 && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">Ghost Hypothesis: -POM Prodrug Ester</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">3 Isomers Formed</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Lighter-shade holographic bonds displayed in 3D canvas. Click "Solidify Bond" to commit changes.
                    </p>
                  </div>
                )}

                {idx === 3 && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                      <span className="font-bold text-emerald-300 text-[11px] block">🌟 Brilliant Move (+2.85 Eval)</span>
                      <p className="text-[10px] text-slate-300">Pivampicillin: Lipophilicity prodrug solves bioavailability barrier.</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 space-y-1">
                      <span className="font-bold text-indigo-300 text-[11px] block">Triangulated Evidence: Reported</span>
                      <p className="text-[10px] text-slate-300">Found in PubChem & ChEMBL experimental bioassays.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bullet points */}
              <div className="lg:col-span-5 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Key Capabilities</h4>
                <div className="space-y-2">
                  {step.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Call to Action Footer */}
      <section className="text-center p-8 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-cyan-900/60 border border-indigo-500/30 shadow-2xl space-y-4">
        <h3 className="text-2xl font-black text-white">Experience the 3D Synthesis Laboratory</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Try the Gemini-style chatbot, upload files, modify atoms with ghost hypothesis, and view side-by-side 3D models.
        </p>
        <button
          onClick={onNavigateToStudio}
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white font-black text-sm tracking-wide shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          🚀 Launch AI Chatbot & 3D CAD Studio Now
        </button>
      </section>
    </div>
  );
};

export default ProductGuide;`,
  },
};
