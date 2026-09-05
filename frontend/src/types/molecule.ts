export interface Atom3D {
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
}
