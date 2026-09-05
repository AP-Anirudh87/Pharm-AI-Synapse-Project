/**
 * Complete, unabridged source code aggregator for all frontend components, pages,
 * services, types, configs, and scripts in Pharm AI Synapse.
 *
 * Combines:
 * - FRONTEND_COMPONENT_FILES (12 production UI components, including 693-line CADMolecularEditor)
 * - FRONTEND_PAGE_FILES (LandingShowcase, ProductGuide)
 * - FRONTEND_STUDIO_FILE (1,373-line StudioChatCAD)
 * - FRONTEND_CORE_FILES (api.ts, candidate.ts, molecule.ts, App.tsx, main.tsx, index.css, package.json, vite.config.ts, index.html, Dockerfile, nginx.conf, tailwind.config.js, postcss.config.js, tsconfig.json, start.bat, start.ps1, docker-compose.yml, LICENSE, .gitignore, .env.example, pyrightconfig.json)
 *
 * Total: 36 unabridged frontend and root project files (53 total repository files). Zero lines truncated.
 * Note: README.md is intentionally excluded as it is designated for GitHub.
 */

import { FRONTEND_COMPONENT_FILES } from './frontendComponentFiles';
import { FRONTEND_PAGE_FILES } from './frontendPageFiles';
import { FRONTEND_STUDIO_FILE } from './frontendStudioFile';
import { FRONTEND_CORE_FILES } from './frontendCoreFiles';

export const FRONTEND_FILE_CODES: Record<string, { language: string; desc: string; metrics: string; code: string }> = {
  ...FRONTEND_COMPONENT_FILES,
  ...FRONTEND_PAGE_FILES,
  ...FRONTEND_STUDIO_FILE,
  ...FRONTEND_CORE_FILES,
};
