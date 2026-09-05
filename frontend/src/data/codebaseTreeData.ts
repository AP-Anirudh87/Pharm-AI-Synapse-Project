import { BACKEND_FILE_CODES } from './backendFiles';
import { FRONTEND_FILE_CODES } from './frontendFiles';

export interface FileTreeNode {
  name: string;
  type: 'folder' | 'file';
  desc?: string;
  path: string;
  children?: FileTreeNode[];
}

export const COMPLETE_CODEBASE_TREE: FileTreeNode[] = [
  {
    name: 'Pharm AI Synapse',
    type: 'folder',
    path: 'root',
    children: [
      {
        name: 'backend',
        type: 'folder',
        desc: 'FastAPI Python 3.13 backend with RDKit & QSAR ML',
        path: 'backend',
        children: [
          {
            name: 'app',
            type: 'folder',
            path: 'backend/app',
            children: [
              { name: 'main.py', type: 'file', path: 'backend/app/main.py', desc: 'FastAPI entry point, modern lifespan lifecycle, CORS & startup seed' },
              { name: '__init__.py', type: 'file', path: 'backend/app/__init__.py', desc: 'Backend Python package initialization module' },
              {
                name: 'api',
                type: 'folder',
                path: 'backend/app/api',
                desc: 'REST endpoints and parallel candidate enrichment',
                children: [
                  { name: 'routes.py', type: 'file', path: 'backend/app/api/routes.py', desc: 'Core REST endpoints & 3D conformer service' },
                ],
              },
              {
                name: 'chemistry',
                type: 'folder',
                path: 'backend/app/chemistry',
                desc: 'RDKit integration & 3D ETKDGv3 conformer generation',
                children: [
                  { name: 'rdkit_utils.py', type: 'file', path: 'backend/app/chemistry/rdkit_utils.py', desc: 'ETKDGv3 3D conformer, MMFF94 force field & descriptors' },
                  { name: 'candidate_generator.py', type: 'file', path: 'backend/app/chemistry/candidate_generator.py', desc: 'SMARTS-based medicinal chemistry transformation rules' },
                ],
              },
              {
                name: 'ml',
                type: 'folder',
                path: 'backend/app/ml',
                desc: 'Machine learning & Multi-objective Pareto evaluation',
                children: [
                  { name: 'qsar.py', type: 'file', path: 'backend/app/ml/qsar.py', desc: 'Random Forest QSAR regression models with Morgan bit fingerprints' },
                  { name: 'ranking.py', type: 'file', path: 'backend/app/ml/ranking.py', desc: 'Multi-objective Pareto frontier scoring with inverted cytotoxicity penalties' },
                ],
              },
              {
                name: 'data',
                type: 'folder',
                path: 'backend/app/data',
                desc: 'Live biomedical database reconciliation clients',
                children: [
                  { name: 'pubchem.py', type: 'file', path: 'backend/app/data/pubchem.py', desc: 'PubChem PUG REST client with async rate-limiting' },
                  { name: 'chembl.py', type: 'file', path: 'backend/app/data/chembl.py', desc: 'ChEMBL REST API client for bioactivity data' },
                  { name: 'bindingdb.py', type: 'file', path: 'backend/app/data/bindingdb.py', desc: 'BindingDB target affinity query client' },
                ],
              },
              {
                name: 'database',
                type: 'folder',
                path: 'backend/app/database',
                children: [
                  { name: 'database.py', type: 'file', path: 'backend/app/database/database.py', desc: 'SQLite & SQLAlchemy ORM models with historical prodrug demo seeds' },
                ],
              },
              {
                name: 'models',
                type: 'folder',
                path: 'backend/app/models',
                children: [
                  { name: 'schemas.py', type: 'file', path: 'backend/app/models/schemas.py', desc: 'Pydantic v2 data models for 3D coordinates, candidates & predictions' },
                ],
              },
              {
                name: 'services',
                type: 'folder',
                path: 'backend/app/services',
                desc: 'Evidence aggregation & prediction service orchestration',
                children: [
                  { name: 'evidence_service.py', type: 'file', path: 'backend/app/services/evidence_service.py', desc: 'Multi-database evidence triangulation (PubChem, ChEMBL, BindingDB)' },
                  { name: 'prediction_service.py', type: 'file', path: 'backend/app/services/prediction_service.py', desc: 'Prediction orchestration service combining QSAR & ADMET' },
                ],
              },
            ],
          },
          { name: 'requirements.txt', type: 'file', path: 'backend/requirements.txt', desc: 'Python dependencies (RDKit, FastAPI, Scikit-Learn)' },
          { name: 'Dockerfile', type: 'file', path: 'backend/Dockerfile', desc: 'FastAPI backend container specification with Python 3.11-slim' },
          { name: 'pyrightconfig.json', type: 'file', path: 'backend/pyrightconfig.json', desc: 'Backend Pyright language server configuration' },
        ],
      },
      {
        name: 'frontend',
        type: 'folder',
        desc: 'React 18 + Vite + TypeScript + Three.js 3D WebGL Workstation',
        path: 'frontend',
        children: [
          {
            name: 'src',
            type: 'folder',
            path: 'frontend/src',
            children: [
              {
                name: 'components',
                type: 'folder',
                path: 'frontend/src/components',
                desc: 'All 12 production UI components',
                children: [
                  { name: 'CADMolecularEditor.tsx', type: 'file', path: 'frontend/src/components/CADMolecularEditor.tsx', desc: 'Interactive Three.js 3D CAD editor with Ghost Hypothesis branching' },
                  { name: 'CandidatePanel.tsx', type: 'file', path: 'frontend/src/components/CandidatePanel.tsx', desc: 'Candidate inspection drawer with chess move annotations & 2D/3D viewer' },
                  { name: 'ChemicalTree.tsx', type: 'file', path: 'frontend/src/components/ChemicalTree.tsx', desc: 'React Flow decision-tree chemical branching canvas' },
                  { name: 'EvidencePanel.tsx', type: 'file', path: 'frontend/src/components/EvidencePanel.tsx', desc: 'Triangulated database evidence verification panel' },
                  { name: 'GoalSelector.tsx', type: 'file', path: 'frontend/src/components/GoalSelector.tsx', desc: 'Multi-objective research priority sliders' },
                  { name: 'Header.tsx', type: 'file', path: 'frontend/src/components/Header.tsx', desc: 'Branded header with status indicators & A.P. Anirudh attribution' },
                  { name: 'Molecule3DViewer.tsx', type: 'file', path: 'frontend/src/components/Molecule3DViewer.tsx', desc: 'Hardware-accelerated 3D WebGL conformer simulator' },
                  { name: 'MoleculeInput.tsx', type: 'file', path: 'frontend/src/components/MoleculeInput.tsx', desc: 'SMILES and compound name input with quick presets' },
                  { name: 'PropertyChart.tsx', type: 'file', path: 'frontend/src/components/PropertyChart.tsx', desc: 'Recharts multi-dimensional radar and bar charts' },
                  { name: 'RankingTable.tsx', type: 'file', path: 'frontend/src/components/RankingTable.tsx', desc: 'Pareto multi-objective candidate ranking table' },
                  { name: 'ResumeDossierModal.tsx', type: 'file', path: 'frontend/src/components/ResumeDossierModal.tsx', desc: 'A.P. Anirudh resume and technical credentials modal' },
                  { name: 'Synaptic3DBackground.tsx', type: 'file', path: 'frontend/src/components/Synaptic3DBackground.tsx', desc: 'Ambient WebGL synaptic particle field' },
                ],
              },
              {
                name: 'pages',
                type: 'folder',
                path: 'frontend/src/pages',
                children: [
                  { name: 'LandingShowcase.tsx', type: 'file', path: 'frontend/src/pages/LandingShowcase.tsx', desc: 'Master showcase with 3D pillars & 43-file unabridged CodeSpace browser' },
                  { name: 'ProductGuide.tsx', type: 'file', path: 'frontend/src/pages/ProductGuide.tsx', desc: 'Commercial-grade interactive user guide & feature tour' },
                  { name: 'StudioChatCAD.tsx', type: 'file', path: 'frontend/src/pages/StudioChatCAD.tsx', desc: 'Gemini-style biotech chatbot & 3D chemical CAD studio' },
                ],
              },
              {
                name: 'services',
                type: 'folder',
                path: 'frontend/src/services',
                children: [
                  { name: 'api.ts', type: 'file', path: 'frontend/src/services/api.ts', desc: 'FastAPI client communicating with backend' },
                ],
              },
              {
                name: 'types',
                type: 'folder',
                path: 'frontend/src/types',
                children: [
                  { name: 'candidate.ts', type: 'file', path: 'frontend/src/types/candidate.ts', desc: 'CandidateInfo, EvidenceRecord, and PredictionResult interfaces' },
                  { name: 'molecule.ts', type: 'file', path: 'frontend/src/types/molecule.ts', desc: 'Conformer3D, Atom3D, and descriptor data structures' },
                ],
              },
              { name: 'App.tsx', type: 'file', path: 'frontend/src/App.tsx', desc: 'Main React application entry & spatial dock router' },
              { name: 'main.tsx', type: 'file', path: 'frontend/src/main.tsx', desc: 'React 18 DOM mount and root renderer' },
              { name: 'index.css', type: 'file', path: 'frontend/src/index.css', desc: 'Design system tokens, glassmorphism & micro-animations' },
            ],
          },
          { name: 'package.json', type: 'file', path: 'frontend/package.json', desc: 'Frontend npm dependencies: Three.js, React Flow, Vite' },
          { name: 'vite.config.ts', type: 'file', path: 'frontend/vite.config.ts', desc: 'Vite bundler configuration and reverse proxy' },
          { name: 'index.html', type: 'file', path: 'frontend/index.html', desc: 'Main HTML5 entry template with SEO metadata' },
          { name: 'Dockerfile', type: 'file', path: 'frontend/Dockerfile', desc: 'Multi-stage Docker container with Node builder and Nginx alpine' },
          { name: 'nginx.conf', type: 'file', path: 'frontend/nginx.conf', desc: 'Production Nginx reverse proxy configuration' },
          { name: 'tailwind.config.js', type: 'file', path: 'frontend/tailwind.config.js', desc: 'Tailwind CSS design token system and bioluminescent color themes' },
          { name: 'postcss.config.js', type: 'file', path: 'frontend/postcss.config.js', desc: 'PostCSS processor configuration' },
          { name: 'tsconfig.json', type: 'file', path: 'frontend/tsconfig.json', desc: 'TypeScript compiler configuration' },
        ],
      },
      { name: 'Pharm_AI_Synapse_Logo.png', type: 'file', path: 'Pharm_AI_Synapse_Logo.png', desc: 'Official Project Logo & Bioluminescent Synaptic Brand Emblem' },
      { name: 'start.bat', type: 'file', path: 'start.bat', desc: '1-Click Windows launcher for backend, frontend & browser' },
      { name: 'start.ps1', type: 'file', path: 'start.ps1', desc: 'PowerShell 1-click execution script' },
      { name: 'docker-compose.yml', type: 'file', path: 'docker-compose.yml', desc: 'Multi-container production deployment orchestration' },
      { name: 'LICENSE', type: 'file', path: 'LICENSE', desc: 'MIT License attributing Copyright (c) 2026 A.P. Anirudh' },
      { name: '.gitignore', type: 'file', path: '.gitignore', desc: 'Git repository exclusion rules' },
      { name: '.env.example', type: 'file', path: '.env.example', desc: 'Environment variables template for database URL & timeouts' },
      { name: 'pyrightconfig.json', type: 'file', path: 'pyrightconfig.json', desc: 'Root workspace Pyright language server configuration' },
    ],
  },
];

export const FILE_SOURCE_CODES: Record<string, { language: string; desc: string; metrics: string; code: string }> = {
  ...BACKEND_FILE_CODES,
  ...FRONTEND_FILE_CODES,
  'Pharm_AI_Synapse_Logo.png': {
    language: 'PNG Image Asset',
    desc: 'Official Project Logo & Bioluminescent Synaptic Brand Emblem',
    metrics: 'Media Asset • 1.68 MB • 1024x1024',
    code: `/**
 * ============================================================================
 * PHARM AI SYNAPSE — OFFICIAL BRAND LOGO & VISUAL IDENTITY
 * ============================================================================
 * Architect & Engineer: A.P. Anirudh (@AP-Anirudh87)
 * File: Pharm_AI_Synapse_Logo.png
 * Format: 32-bit RGBA High-Definition PNG (1024 x 1024 px)
 *
 * Core Visual Elements:
 * 1. Synaptic Neural Cortex: Represents deep learning AI and heuristic reasoning.
 * 2. Molecular Bond Networks: Represents RDKit cheminformatics & chemical graphs.
 * 3. Dual-Chamber Prodrug Capsule: Symbolizes pharmaceutical targeted delivery.
 * 4. Electrocardiogram (ECG) Pulse: Embodies vital clinical safety & better health.
 * 5. Medical Cross Heart Icon: Core emblem of therapeutic patient care.
 *
 * Brand Slogan:
 * "INTELLIGENT INSIGHTS • SMARTER DISCOVERY • BETTER HEALTH"
 * ============================================================================
 */`,
  },
};
