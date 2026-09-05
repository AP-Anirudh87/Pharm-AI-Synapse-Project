import { AnalysisRequest, MoleculeInfo } from '../types/molecule';
import { AnalysisResponse, CandidateInfo, RankingResponse } from '../types/candidate';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// ---- Molecule ----

export async function analyzeMolecule(request: AnalysisRequest): Promise<AnalysisResponse> {
  return fetchJson<AnalysisResponse>(`${API_BASE}/molecule/analyze`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getMolecule(identifier: string): Promise<MoleculeInfo> {
  return fetchJson<MoleculeInfo>(`${API_BASE}/molecule/${encodeURIComponent(identifier)}`);
}

export async function get3DConformer(smiles: string): Promise<import('../types/molecule').Conformer3D> {
  return fetchJson<import('../types/molecule').Conformer3D>(`${API_BASE}/molecule/3d/${encodeURIComponent(smiles)}`);
}

// ---- Candidates ----

export async function generateCandidates(smiles: string, name: string = '', goal: string = ''): Promise<{ candidates: CandidateInfo[] }> {
  return fetchJson(`${API_BASE}/candidates/generate`, {
    method: 'POST',
    body: JSON.stringify({ smiles, name, goal, max_candidates: 6 }),
  });
}

export async function predictCandidates(candidates: CandidateInfo[]): Promise<{ candidates: CandidateInfo[] }> {
  return fetchJson(`${API_BASE}/candidates/predict`, {
    method: 'POST',
    body: JSON.stringify({ candidates }),
  });
}

export async function rankCandidates(
  candidates: CandidateInfo[],
  priorities: AnalysisRequest['priorities']
): Promise<RankingResponse> {
  return fetchJson<RankingResponse>(`${API_BASE}/candidates/rank`, {
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
  return fetchJson(`${API_BASE}/evidence/${encodeURIComponent(identifier)}`);
}

// ---- External Search ----

export async function searchPubChem(query: string) {
  return fetchJson(`${API_BASE}/search/pubchem/${encodeURIComponent(query)}`);
}

export async function searchChEMBL(query: string) {
  return fetchJson(`${API_BASE}/search/chembl/${encodeURIComponent(query)}`);
}

export async function searchBindingDB(query: string) {
  return fetchJson(`${API_BASE}/search/bindingdb/${encodeURIComponent(query)}`);
}

// ---- Health ----

export async function getHealth(): Promise<{
  status: string;
  version: string;
  rdkit_available: boolean;
  demo_mode: boolean;
}> {
  return fetchJson(`${API_BASE}/health`);
}
