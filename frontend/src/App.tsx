import React, { useState } from 'react';
import LandingShowcase from './pages/LandingShowcase';
import ProductGuide from './pages/ProductGuide';
import StudioChatCAD from './pages/StudioChatCAD';
import ResumeDossierModal from './components/ResumeDossierModal';
import Synaptic3DBackground from './components/Synaptic3DBackground';

type ActivePage = 'landing' | 'guide' | 'studio';

function App() {
  const [activePage, setActivePage] = useState<ActivePage>('landing');
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [bg3DEnabled, setBg3DEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden font-sans select-none">
      {/* 3D WebGL Synaptic Background Particle Canvas */}
      <Synaptic3DBackground enabled={bg3DEnabled} />

      {/* A.P. Anirudh Executive Resume Dossier Modal */}
      <ResumeDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
      />

      {/* Global Floating Navigation Bar (Allows infinite-sheet style switching) */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0c1222]/90 backdrop-blur-xl px-4 py-2 rounded-2xl border border-indigo-500/40 shadow-2xl flex items-center gap-2">
        <div className="flex items-center gap-2 mr-2 pr-3 border-r border-slate-700/60">
          <img
            src="/Pharm_AI_Synapse_Logo.png"
            alt="Pharm AI Synapse"
            className="w-6 h-6 rounded-full object-cover shadow-md shadow-indigo-500/50 border border-indigo-400/50 hover:scale-110 transition-transform cursor-pointer"
            onClick={() => setActivePage('landing')}
          />
          <span className="font-black text-xs text-white tracking-wider">PHARM AI SYNAPSE</span>
        </div>

        <button
          onClick={() => setActivePage('landing')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePage === 'landing'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🪐 Page 1: Showcase
        </button>

        <button
          onClick={() => setActivePage('guide')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePage === 'guide'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📖 Page 2: Guide
        </button>

        <button
          onClick={() => setActivePage('studio')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePage === 'studio'
              ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🧪 Page 3: 3D Studio & Chat
        </button>

        <div className="ml-2 pl-3 border-l border-slate-700/60 flex items-center gap-2">
          <button
            onClick={() => setIsDossierOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-[11px] font-bold text-indigo-300 hover:text-white transition-all cursor-pointer"
            title="A.P. Anirudh Resume & Engineering Dossier"
          >
            Architect: A.P. Anirudh
          </button>
        </div>
      </nav>

      {/* ─── PAGE RENDERING WITH SPATIAL TRANSITIONS ─── */}
      <main className="pt-16 min-h-screen">
        {activePage === 'landing' && (
          <LandingShowcase
            onNavigateToGuide={() => setActivePage('guide')}
            onNavigateToStudio={() => setActivePage('studio')}
            onOpenDossier={() => setIsDossierOpen(true)}
          />
        )}

        {activePage === 'guide' && (
          <ProductGuide
            onNavigateToStudio={() => setActivePage('studio')}
            onNavigateToLanding={() => setActivePage('landing')}
          />
        )}

        {activePage === 'studio' && (
          <StudioChatCAD
            onOpenDossier={() => setIsDossierOpen(true)}
            onNavigateToGuide={() => setActivePage('guide')}
            onNavigateToLanding={() => setActivePage('landing')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
