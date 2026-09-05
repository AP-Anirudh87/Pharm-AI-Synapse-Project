export type EvidenceStatus = 'EXPERIMENTALLY_REPORTED' | 'NO_MATCHING_RECORD_FOUND';
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
}
