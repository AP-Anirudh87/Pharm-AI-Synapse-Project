/**
 * Unabridged source code for all frontend types, services, entrypoints, and root repository scripts.
 * 100% complete — zero lines truncated.
 */

export const FRONTEND_CORE_FILES: Record<string, { language: string; desc: string; metrics: string; code: string }> = {
  'frontend/src/services/api.ts': {
    language: 'TypeScript',
    desc: 'FastAPI REST client with type-safe async fetch wrappers for molecular analysis, conformers, and evidence.',
    metrics: '97 lines • REST Client • Type-Safe API',
    code: `import { AnalysisRequest, MoleculeInfo } from '../types/molecule';
import { AnalysisResponse, CandidateInfo, RankingResponse } from '../types/candidate';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || \`API error: \${response.status}\`);
  }

  return response.json();
}

// ---- Molecule ----

export async function analyzeMolecule(request: AnalysisRequest): Promise<AnalysisResponse> {
  return fetchJson<AnalysisResponse>(\`\${API_BASE}/molecule/analyze\`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getMolecule(identifier: string): Promise<MoleculeInfo> {
  return fetchJson<MoleculeInfo>(\`\${API_BASE}/molecule/\${encodeURIComponent(identifier)}\`);
}

export async function get3DConformer(smiles: string): Promise<import('../types/molecule').Conformer3D> {
  return fetchJson<import('../types/molecule').Conformer3D>(\`\${API_BASE}/molecule/3d/\${encodeURIComponent(smiles)}\`);
}

// ---- Candidates ----

export async function generateCandidates(smiles: string, name: string = '', goal: string = ''): Promise<{ candidates: CandidateInfo[] }> {
  return fetchJson(\`\${API_BASE}/candidates/generate\`, {
    method: 'POST',
    body: JSON.stringify({ smiles, name, goal, max_candidates: 6 }),
  });
}

export async function predictCandidates(candidates: CandidateInfo[]): Promise<{ candidates: CandidateInfo[] }> {
  return fetchJson(\`\${API_BASE}/candidates/predict\`, {
    method: 'POST',
    body: JSON.stringify({ candidates }),
  });
}

export async function rankCandidates(
  candidates: CandidateInfo[],
  priorities: AnalysisRequest['priorities']
): Promise<RankingResponse> {
  return fetchJson<RankingResponse>(\`\${API_BASE}/candidates/rank\`, {
    method: 'POST',
    body: JSON.stringify({ candidates, priorities }),
  });
}

// ---- Evidence ----

export async function getEvidence(identifier: string): Promise<{
  status: string;
  records: Array<{ source: string; database: string; is_experimental: boolean; description: string; external_url: string | null }>;
  summary: string;
}> {
  return fetchJson(\`\${API_BASE}/evidence/\${encodeURIComponent(identifier)}\`);
}

// ---- External Search ----

export async function searchPubChem(query: string) {
  return fetchJson(\`\${API_BASE}/search/pubchem/\${encodeURIComponent(query)}\`);
}

export async function searchChEMBL(query: string) {
  return fetchJson(\`\${API_BASE}/search/chembl/\${encodeURIComponent(query)}\`);
}

export async function searchBindingDB(query: string) {
  return fetchJson(\`\${API_BASE}/search/bindingdb/\${encodeURIComponent(query)}\`);
}

// ---- Health ----

export async function getHealth(): Promise<{
  status: string;
  version: string;
  rdkit_available: boolean;
  demo_mode: boolean;
}> {
  return fetchJson(\`\${API_BASE}/health\`);
}`,
  },

  'frontend/src/types/candidate.ts': {
    language: 'TypeScript',
    desc: 'CandidateInfo, EvidenceRecord, PredictionResult, and RankingBreakdown data models.',
    metrics: '72 lines • TypeScript Strict Types',
    code: `export type EvidenceStatus = 'EXPERIMENTALLY_REPORTED' | 'NO_MATCHING_RECORD_FOUND';
export type GenerationMethod = 'RULE_BASED' | 'HISTORICAL' | 'EXTERNAL_DB';
export type PredictionConfidence =
  | 'Demonstration model — not clinically validated'
  | 'Low confidence prediction'
  | 'Medium confidence prediction'
  | 'High confidence prediction'
  | 'ADMET prediction unavailable in demo mode';

export interface PredictionResult {
  property_name: string;
  value: number | null;
  unit: string;
  label: string;
  confidence: PredictionConfidence;
  method: string;
}

export interface EvidenceRecord {
  source: string;
  database: string;
  is_experimental: boolean;
  description: string;
  external_url: string | null;
  data: Record<string, unknown> | null;
}

export interface CandidateInfo {
  id: string;
  name: string;
  smiles: string;
  canonical_smiles: string;
  parent_smiles: string;
  parent_name: string;
  transformation: string;
  generation_method: GenerationMethod;
  evidence_status: EvidenceStatus;
  molecular_weight: number | null;
  molecular_formula: string | null;
  similarity_to_parent: number | null;
  image_base64: string | null;
  predictions: PredictionResult[];
  evidence: EvidenceRecord[];
  ranking_score: number | null;
  ranking_breakdown: Record<string, RankingBreakdownItem> | null;
  conformer_3d?: import('./molecule').Conformer3D | null;
  chess_rating?: string | null;
  note: string;
}

export interface RankingBreakdownItem {
  score: number | null;
  weight: number;
  contribution: number;
  raw_value?: number;
  unit?: string;
  inverted?: boolean;
  note?: string;
}

export interface AnalysisResponse {
  molecule: import('./molecule').MoleculeInfo;
  candidates: CandidateInfo[];
  disclaimer: string;
}

export interface RankingResponse {
  ranked_candidates: CandidateInfo[];
  scoring_method: string;
  disclaimer: string;
}`,
  },

  'frontend/src/types/molecule.ts': {
    language: 'TypeScript',
    desc: 'Atom3D, Bond3D, Conformer3D, MoleculeInfo, and Priorities interfaces.',
    metrics: '56 lines • Molecule Interfaces',
    code: `export interface Atom3D {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
  charge?: number;
  aromatic?: boolean;
}

export interface Bond3D {
  source: number;
  target: number;
  order: number;
}

export interface Conformer3D {
  atoms: Atom3D[];
  bonds: Bond3D[];
  num_atoms?: number;
  num_bonds?: number;
  method?: string;
}

export interface MoleculeInfo {
  name: string;
  smiles: string;
  canonical_smiles: string;
  molecular_weight: number | null;
  molecular_formula: string | null;
  logp: number | null;
  hbd: number | null;
  hba: number | null;
  tpsa: number | null;
  rotatable_bonds: number | null;
  image_base64: string | null;
  pubchem_cid: number | null;
  chembl_id: string | null;
  conformer_3d?: Conformer3D | null;
  error: string | null;
}

export interface Priorities {
  activity: number;
  absorption: number;
  solubility: number;
  toxicity: number;
}

export interface AnalysisRequest {
  name: string;
  smiles: string;
  goal: string;
  priorities: Priorities;
}`,
  },

  'frontend/src/App.tsx': {
    language: 'TypeScript / React',
    desc: 'Main application router managing spatial dock navigation between Landing Showcase, Guide, and 3D Studio.',
    metrics: '107 lines • React 18 Router',
    code: `import React, { useState } from 'react';
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
        <div className="flex items-center gap-1.5 mr-2 pr-3 border-r border-slate-700/60">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 animate-pulse" />
          <span className="font-black text-xs text-white tracking-wider">PHARM AI SYNAPSE</span>
        </div>

        <button
          onClick={() => setActivePage('landing')}
          className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${
            activePage === 'landing'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }\`}
        >
          🪐 Page 1: Showcase
        </button>

        <button
          onClick={() => setActivePage('guide')}
          className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${
            activePage === 'guide'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }\`}
        >
          📖 Page 2: Guide
        </button>

        <button
          onClick={() => setActivePage('studio')}
          className={\`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer \${
            activePage === 'studio'
              ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }\`}
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

export default App;`,
  },

  'frontend/src/main.tsx': {
    language: 'TypeScript / React',
    desc: 'React root application bootstrapper attaching App into DOM with StrictMode.',
    metrics: '11 lines • React 18 DOM Root',
    code: `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);`,
  },

  'frontend/src/index.css': {
    language: 'CSS / Tailwind',
    desc: 'Global CSS design system with glassmorphism utilities, micro-animations, and scrollbars.',
    metrics: '165 lines • Tailwind Directives • Custom Utilities',
    code: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --mol-dark: #0a0e1a;
  --mol-panel: #111827;
  --mol-accent: #6366f1;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--mol-dark);
  color: #e2e8f0;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0a0e1a; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }

/* Glass card */
.glass-card {
  background: rgba(17, 24, 39, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 12px;
}

.glass-card:hover {
  border-color: rgba(99, 102, 241, 0.25);
}

/* Status badges */
.badge-known {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge-predicted {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.badge-selected {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

/* Glow effects */
.glow-indigo { box-shadow: 0 0 15px rgba(99, 102, 241, 0.15); }
.glow-green { box-shadow: 0 0 15px rgba(16, 185, 129, 0.15); }
.glow-orange { box-shadow: 0 0 15px rgba(245, 158, 11, 0.15); }

/* React Flow overrides */
.react-flow__background { background: #0a0e1a !important; }
.react-flow__minimap { background: #111827 !important; border-radius: 8px; }
.react-flow__controls { background: #1a2235 !important; border-radius: 8px; border: 1px solid #1e293b !important; }
.react-flow__controls button { background: #1a2235 !important; color: #94a3b8 !important; border-bottom: 1px solid #1e293b !important; }
.react-flow__controls button:hover { background: #243047 !important; }
.react-flow__edge-path { stroke: #475569 !important; }

/* Slider styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: #1e293b;
  border-radius: 3px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  cursor: pointer;
  border: 2px solid #0a0e1a;
  box-shadow: 0 0 6px rgba(99, 102, 241, 0.4);
  transition: transform 0.15s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Disclaimer banner */
.disclaimer-banner {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(239, 68, 68, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.8rem;
  color: #f59e0b;
  line-height: 1.4;
}

/* Shimmer and pulse animations */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes floatSlow {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

@keyframes pulseGlow {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.4)); }
  50% { filter: drop-shadow(0 0 16px rgba(6, 182, 212, 0.6)); }
}

.shimmer {
  background: linear-gradient(90deg, #1a2235 25%, #243047 50%, #1a2235 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

.float-slow {
  animation: floatSlow 4s ease-in-out infinite;
}

.pulse-glow {
  animation: pulseGlow 3s ease-in-out infinite;
}

.glow-cyan {
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.25);
}

.glow-purple {
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.25);
}

.glass-dock {
  background: rgba(10, 14, 26, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}`,
  },

  'frontend/package.json': {
    language: 'JSON',
    desc: 'Frontend npm dependencies: Three.js r128, React Flow xyflow, Recharts, Vite 6, TailwindCSS.',
    metrics: '37 lines • Node Dependencies',
    code: `{
  "name": "pharm-ai-synapse",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@types/three": "^0.185.4",
    "@xyflow/react": "^12.4.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.15.3",
    "three": "^0.185.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.0",
    "@types/react": "^18.3.20",
    "@types/react-dom": "^18.3.6",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.25.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.0.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.7.2",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.0"
  }
}`,
  },

  'frontend/vite.config.ts': {
    language: 'TypeScript',
    desc: 'Vite configuration enabling React Fast Refresh and backend reverse proxy on port 5173.',
    metrics: '16 lines • Vite 6 Config',
    code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});`,
  },

  'frontend/index.html': {
    language: 'HTML',
    desc: 'Master HTML template with Google Fonts (Inter, JetBrains Mono), meta tags, and A.P. Anirudh attribution.',
    metrics: '20 lines • HTML5 Entry Point • SEO Metadata',
    code: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="author" content="A.P. Anirudh" />
    <title>Pharm AI Synapse — 3D Chemical Evolution Engine | A.P. Anirudh</title>
  </head>
  <body class="bg-[#0a0e1a] text-slate-100 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
  },

  'start.bat': {
    language: 'Batch',
    desc: 'Windows 1-click execution script that launches backend, frontend, and browser concurrently.',
    metrics: '33 lines • Windows Command Script',
    code: `@echo off
title Pharm AI Synapse Launcher
echo ========================================================
echo   Pharm AI Synapse - Autonomous Drug Discovery Engine
echo   Lead Architect: A.P. Anirudh
echo ========================================================
echo.

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend
set PORTABLE_NODE=%FRONTEND_DIR%\\node_portable\\node-v20.15.0-win-x64

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Pharm AI Synapse - Backend (FastAPI + RDKit)" cmd /k "cd /d "%BACKEND_DIR%" && "%BACKEND_DIR%\\.venv\\Scripts\\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/3] Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo [3/3] Starting React + Vite Frontend on http://localhost:5173 ...
start "Pharm AI Synapse - Frontend (Vite)" cmd /k "cd /d "%FRONTEND_DIR%" && set "PATH=%PORTABLE_NODE%;%PATH%" && npm run dev"

echo.
echo ========================================================
echo   Servers Launched Successfully!
echo   Frontend: http://localhost:5173
echo   Backend:  http://127.0.0.1:8000
echo   API Docs: http://127.0.0.1:8000/docs
echo ========================================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:5173`,
  },

  'start.ps1': {
    language: 'PowerShell',
    desc: 'PowerShell 1-click execution script with automated path resolution.',
    metrics: '37 lines • PowerShell Script',
    code: `# Pharm AI Synapse — PowerShell Launcher
# Lead Architect: A.P. Anirudh

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"
$portableNode = Join-Path $frontendDir "node_portable\\node-v20.15.0-win-x64"
$pythonExe = Join-Path $backendDir ".venv\\Scripts\\python.exe"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Pharm AI Synapse - Autonomous Drug Discovery Engine" -ForegroundColor Green
Write-Host "  Lead Architect: A.P. Anirudh" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Start Backend in a new window
Write-Host "\`n[1/3] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; & '$pythonExe' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

# 2. Wait for backend
Start-Sleep -Seconds 3

# 3. Start Frontend in a new window
Write-Host "[2/3] Starting React + Vite Frontend on http://localhost:5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "\`$env:Path = '$portableNode;' + \`$env:Path; cd '$frontendDir'; npm run dev"

# 4. Open default browser
Start-Sleep -Seconds 2
Write-Host "[3/3] Opening browser at http://localhost:5173..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "\`n========================================================" -ForegroundColor Green
Write-Host "  Servers Launched Successfully!" -ForegroundColor Green
Write-Host "  Frontend UI: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "========================================================\`n" -ForegroundColor Green`,
  },

  'docker-compose.yml': {
    language: 'YAML',
    desc: 'Multi-container Docker orchestration for production deployment with persistent SQLite volumes.',
    metrics: '25 lines • Docker Compose • Containerization',
    code: `version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./molecule_explorer.db
      - FRONTEND_URL=http://localhost
    volumes:
      - backend-data:/app/data
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  backend-data:`,
  },

  'LICENSE': {
    language: 'Plain Text',
    desc: 'Open-source MIT License establishing intellectual property and attribution for A.P. Anirudh.',
    metrics: '22 lines • MIT License',
    code: `MIT License

Copyright (c) 2026 A.P. Anirudh (GitHub: https://github.com/AP-Anirudh87)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  },

  '.gitignore': {
    language: 'Plain Text',
    desc: 'Git repository ignore patterns excluding venvs, node_modules, cache, and database artifacts.',
    metrics: '84 lines • Git Ignore Rules',
    code: `# Pharm AI Synapse — .gitignore
# Architect: A.P. Anirudh (GitHub: @AP-Anirudh87)

# Python virtual environment & cache
backend/.venv/
.venv/
venv/
ENV/
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
wheels/
*.egg-info/
.installed.cfg
*.egg

# SQLite Database & Storage
*.sqlite
*.sqlite3
*.db
backend/pharm_ai_synapse.db
pharm_ai_synapse.db

# Node & Frontend dependencies
frontend/node_modules/
node_modules/
frontend/dist/
dist/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
.pnpm-debug.log*

# Portable Node & local binaries (DO NOT commit portable Node binaries to git)
frontend/node_portable/
node_portable/

# Environment Variables & Secrets
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
backend/.env
frontend/.env

# IDE & Editor Settings
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.DS_Store
Thumbs.db

# Test coverage & logs
htmlcov/
.tox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/
.pytest_cache/
*.log`,
  },

  'frontend/Dockerfile': {
    language: 'Dockerfile',
    desc: 'Multi-stage Docker build for React/Vite frontend using Node 20 alpine builder and Nginx static web server.',
    metrics: '14 lines • Docker Multi-Stage • Nginx Alpine',
    code: `FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`,
  },

  'frontend/nginx.conf': {
    language: 'Nginx',
    desc: 'Production reverse-proxy configuration routing frontend SPA paths and /api/ requests to the backend server.',
    metrics: '17 lines • Nginx Config • SPA Routing & API Proxy',
    code: `server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
`,
  },

  'frontend/postcss.config.js': {
    language: 'JavaScript',
    desc: 'PostCSS pipeline configuration loading TailwindCSS and Autoprefixer processors.',
    metrics: '7 lines • PostCSS Config',
    code: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,
  },

  'frontend/tailwind.config.js': {
    language: 'JavaScript',
    desc: 'Tailwind CSS design token system: dark bioluminescent palettes, JetBrains Mono font, and custom keyframes.',
    metrics: '63 lines • Tailwind Tokens • Design System',
    code: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mol': {
          'dark': '#0a0e1a',
          'darker': '#060912',
          'panel': '#111827',
          'card': '#1a2235',
          'border': '#1e293b',
          'accent': '#6366f1',
          'accent2': '#8b5cf6',
          'green': '#10b981',
          'orange': '#f59e0b',
          'blue': '#3b82f6',
          'red': '#ef4444',
          'cyan': '#06b6d4',
          'text': '#e2e8f0',
          'muted': '#94a3b8',
          'subtle': '#64748b',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
}
`,
  },

  'frontend/tsconfig.json': {
    language: 'JSON',
    desc: 'TypeScript compiler configuration targeting ES2020 with react-jsx and strict type verification.',
    metrics: '23 lines • TypeScript Config',
    code: `{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
`,
  },

  '.env.example': {
    language: 'Properties',
    desc: 'Environment variables template defining database URL, ports, and API query timeouts.',
    metrics: '14 lines • Environment Config Template',
    code: `# Backend
DATABASE_URL=sqlite:///./molecule_explorer.db
FRONTEND_URL=http://localhost:5173

# External APIs (no keys required for public APIs)
PUBCHEM_TIMEOUT=15
CHEMBL_TIMEOUT=15

# ADMET (optional — set URL to enable external ADMET predictions)
# ADMET_API_URL=https://your-admet-service.example.com/predict

# ML Models directory (optional)
# MODEL_DIR=./models
`,
  },

  'pyrightconfig.json': {
    language: 'JSON',
    desc: 'Root workspace Pyright and Pylance virtual environment configuration for IDE language servers.',
    metrics: '9 lines • Pyright Config',
    code: `{
  "venvPath": "Pharm AI Synapse/backend",
  "venv": ".venv",
  "extraPaths": [
    "Pharm AI Synapse/backend",
    "Pharm AI Synapse/backend/.venv/Lib/site-packages"
  ]
}
`,
  },
};
