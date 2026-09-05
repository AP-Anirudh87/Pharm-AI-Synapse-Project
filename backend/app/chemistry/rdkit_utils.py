"""
RDKit utility functions for Molecule Explorer.
Provides SMILES validation, descriptor calculation, fingerprints,
similarity, and 2D depiction.

Falls back to a mock mode if RDKit is not installed, so the frontend
can still function.
"""
from __future__ import annotations

import base64
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Try to import RDKit; set a flag if unavailable
# ---------------------------------------------------------------------------
RDKIT_AVAILABLE = False
try:
    from rdkit import Chem
    from rdkit.Chem import (
        AllChem,
        Descriptors,
        Draw,
        rdMolDescriptors,
        DataStructs,
    )
    RDKIT_AVAILABLE = True
    logger.info("RDKit loaded successfully.")
except ImportError:
    logger.warning(
        "RDKit is not installed. Running in mock/fallback mode. "
        "Install rdkit-pypi for full functionality."
    )


# =========================================================================
# Core functions (with fallback)
# =========================================================================

def validate_smiles(smiles: str) -> tuple[bool, Optional[str]]:
    """
    Validate a SMILES string.
    Returns (is_valid, canonical_smiles_or_None).
    """
    if not smiles or not smiles.strip():
        return False, None
    if RDKIT_AVAILABLE:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return False, None
        return True, Chem.MolToSmiles(mol)
    else:
        # Fallback: basic heuristic — accept anything that looks SMILES-ish
        smiles = smiles.strip()
        if len(smiles) > 0 and any(c.isalpha() for c in smiles):
            return True, smiles
        return False, None


def get_molecular_descriptors(smiles: str) -> dict:
    """
    Calculate molecular descriptors from a SMILES string.
    Returns a dict of properties, or a dict with an error key.
    """
    if not RDKIT_AVAILABLE:
        return _mock_descriptors(smiles)

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"error": f"Could not parse SMILES: {smiles}"}

    try:
        return {
            "molecular_weight": round(Descriptors.MolWt(mol), 2),
            "molecular_formula": rdMolDescriptors.CalcMolFormula(mol),
            "logp": round(Descriptors.MolLogP(mol), 2),
            "hbd": Descriptors.NumHDonors(mol),
            "hba": Descriptors.NumHAcceptors(mol),
            "tpsa": round(Descriptors.TPSA(mol), 2),
            "rotatable_bonds": Descriptors.NumRotatableBonds(mol),
            "num_atoms": mol.GetNumAtoms(),
            "num_rings": Descriptors.RingCount(mol),
            "num_aromatic_rings": Descriptors.NumAromaticRings(mol),
        }
    except Exception as exc:
        logger.error("Descriptor calculation failed for %s: %s", smiles, exc)
        return {"error": str(exc)}


def get_fingerprint(smiles: str, radius: int = 2, n_bits: int = 2048):
    """
    Compute a Morgan fingerprint (ECFP-like).
    Returns an RDKit DataStructs bit vector, or None on failure.
    """
    if not RDKIT_AVAILABLE:
        return None
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    return AllChem.GetMorganFingerprintAsBitVect(mol, radius, nBits=n_bits)


def get_fingerprint_list(smiles: str, radius: int = 2, n_bits: int = 2048) -> list[int]:
    """
    Return fingerprint as a plain list of 0/1 ints (for ML).
    """
    fp = get_fingerprint(smiles, radius, n_bits)
    if fp is None:
        return [0] * n_bits
    return list(fp)


def calculate_similarity(smiles_a: str, smiles_b: str) -> Optional[float]:
    """
    Tanimoto similarity between two molecules.
    """
    if not RDKIT_AVAILABLE:
        return _mock_similarity(smiles_a, smiles_b)
    fp_a = get_fingerprint(smiles_a)
    fp_b = get_fingerprint(smiles_b)
    if fp_a is None or fp_b is None:
        return None
    return round(DataStructs.TanimotoSimilarity(fp_a, fp_b), 4)


def draw_molecule(smiles: str, size: tuple[int, int] = (350, 300)) -> Optional[str]:
    """
    Render a 2D depiction of the molecule.
    Returns a base64-encoded PNG string, or None.
    """
    if not RDKIT_AVAILABLE:
        return None
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    try:
        AllChem.Compute2DCoords(mol)
        img = Draw.MolToImage(mol, size=size)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")
    except Exception as exc:
        logger.error("draw_molecule failed for %s: %s", smiles, exc)
        return None


# =========================================================================
# Fallback / mock helpers
# =========================================================================

def _mock_descriptors(smiles: str) -> dict:
    """Very rough heuristic-based estimates when RDKit is unavailable."""
    n = len(smiles)
    return {
        "molecular_weight": round(n * 8.5, 2),  # very rough
        "molecular_formula": "unavailable (RDKit not installed)",
        "logp": round(n * 0.05, 2),
        "hbd": max(0, smiles.count("N") + smiles.count("O") - smiles.count("n")),
        "hba": smiles.count("N") + smiles.count("O"),
        "tpsa": round(n * 2.5, 2),
        "rotatable_bonds": max(0, smiles.count("-") + n // 10),
        "num_atoms": n // 2,
        "num_rings": smiles.count("1") + smiles.count("2"),
        "num_aromatic_rings": smiles.lower().count("c1"),
        "_note": "Estimates only — RDKit not available",
    }


def _mock_similarity(a: str, b: str) -> float:
    """Character-level Jaccard similarity as a crude fallback."""
    set_a = set(a)
    set_b = set(b)
    if not set_a and not set_b:
        return 1.0
    intersection = set_a & set_b
    union = set_a | set_b
    return round(len(intersection) / len(union), 4)


def generate_3d_coordinates(smiles: str) -> dict:
    """
    Generate real 3D (X, Y, Z) coordinates and bond connectivity using RDKit.
    Uses ETKDGv3 conformer generation with MMFF energy minimization.
    Falls back gracefully to procedural coordinates if needed.
    """
    if not smiles or not smiles.strip():
        return {"atoms": [], "bonds": [], "method": "none"}

    if RDKIT_AVAILABLE:
        try:
            mol = Chem.MolFromSmiles(smiles.strip())
            if mol is not None:
                mol_3d = Chem.AddHs(mol)
                params = AllChem.ETKDGv3()
                params.randomSeed = 42
                res = AllChem.EmbedMolecule(mol_3d, params)
                if res == -1:
                    AllChem.EmbedMolecule(mol_3d, randomSeed=42)
                try:
                    AllChem.MMFFOptimizeMolecule(mol_3d, maxIters=200)
                except Exception:
                    pass

                conf = mol_3d.GetConformer()
                atoms = []
                for atom in mol_3d.GetAtoms():
                    pos = conf.GetAtomPosition(atom.GetIdx())
                    atoms.append({
                        "id": atom.GetIdx(),
                        "element": atom.GetSymbol(),
                        "x": round(float(pos.x), 4),
                        "y": round(float(pos.y), 4),
                        "z": round(float(pos.z), 4),
                        "charge": round(float(atom.GetFormalCharge()), 2),
                        "aromatic": atom.GetIsAromatic(),
                    })

                bonds = []
                for bond in mol_3d.GetBonds():
                    bonds.append({
                        "source": bond.GetBeginAtomIdx(),
                        "target": bond.GetEndAtomIdx(),
                        "order": int(bond.GetBondTypeAsDouble()),
                    })

                # Center around center of mass
                if atoms:
                    cx = sum(a["x"] for a in atoms) / len(atoms)
                    cy = sum(a["y"] for a in atoms) / len(atoms)
                    cz = sum(a["z"] for a in atoms) / len(atoms)
                    for a in atoms:
                        a["x"] = round(a["x"] - cx, 4)
                        a["y"] = round(a["y"] - cy, 4)
                        a["z"] = round(a["z"] - cz, 4)

                return {
                    "atoms": atoms,
                    "bonds": bonds,
                    "num_atoms": len(atoms),
                    "num_bonds": len(bonds),
                    "method": "RDKit ETKDGv3 + MMFF94",
                }
        except Exception as exc:
            logger.warning("RDKit 3D conformer generation failed: %s", exc)

    return _procedural_3d_coordinates(smiles)


def _procedural_3d_coordinates(smiles: str) -> dict:
    """
    Procedural 3D coordinate layout for previewing when RDKit 3D is unavailable.
    """
    import math
    import re
    # Extract elemental symbols from SMILES
    tokens = re.findall(r"Cl|Br|[A-Z][a-z]?|\d|[\(\)=#@\+\-\]]", smiles)
    atoms = []
    atom_id = 0
    angle = 0.0

    for token in tokens:
        if token in ["C", "N", "O", "S", "P", "F", "Cl", "Br", "I"]:
            r = 1.4 + 0.3 * (atom_id % 3)
            pitch = 0.45 * atom_id
            x = math.cos(angle) * (1.2 + 0.3 * atom_id)
            y = math.sin(angle) * (1.2 + 0.3 * atom_id)
            z = math.sin(pitch) * 1.5
            atoms.append({
                "id": atom_id,
                "element": token,
                "x": round(x, 4),
                "y": round(y, 4),
                "z": round(z, 4),
                "charge": 0.0,
                "aromatic": False,
            })
            atom_id += 1
            angle += 1.05

    bonds = []
    for i in range(len(atoms) - 1):
        bonds.append({"source": i, "target": i + 1, "order": 1})

    return {
        "atoms": atoms,
        "bonds": bonds,
        "num_atoms": len(atoms),
        "num_bonds": len(bonds),
        "method": "Procedural 3D Lattice",
    }
