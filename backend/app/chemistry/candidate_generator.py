"""
Rule-based candidate generator for Molecule Explorer.

Creates a small number of demonstrative candidate branches from
predefined transformation templates. Each candidate is clearly
labeled as a "Computational candidate."

Architecture supports later integration of real reaction-prediction
models (ASKCOS, Chemformer, etc.) via the CandidateGenerator interface.
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Optional

from app.chemistry.rdkit_utils import (
    RDKIT_AVAILABLE,
    calculate_similarity,
    get_molecular_descriptors,
    validate_smiles,
)
from app.models.schemas import CandidateInfo, EvidenceStatus, GenerationMethod

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Transformation templates
# ---------------------------------------------------------------------------

@dataclass
class TransformationTemplate:
    """A predefined molecular transformation."""
    name: str
    description: str
    smarts_reactant: str  # SMARTS pattern to match
    smarts_product: str   # SMARTS replacement
    category: str         # e.g. "prodrug", "bioisostere", "functional_group"
    rationale: str


# These are well-known medicinal chemistry transformations.
# They are TEMPLATES — not every application is synthetically feasible.
TRANSFORMATION_TEMPLATES: list[TransformationTemplate] = [
    TransformationTemplate(
        name="Methyl ester prodrug",
        description="Convert carboxylic acid to methyl ester",
        smarts_reactant="[CX3:1](=[OX1:2])[OX2H1:3]",
        smarts_product="[C:1](=[O:2])[O:3]C",
        category="prodrug",
        rationale="Ester prodrugs can improve oral absorption by increasing lipophilicity",
    ),
    TransformationTemplate(
        name="Fluorine scan",
        description="Replace aromatic H with F",
        smarts_reactant="[cH1:1]",
        smarts_product="[c:1]F",
        category="bioisostere",
        rationale="Fluorine substitution can improve metabolic stability",
    ),
    TransformationTemplate(
        name="N-methylation",
        description="Add methyl to primary amine",
        smarts_reactant="[NX3H2:1]",
        smarts_product="[N:1](C)",
        category="functional_group",
        rationale="N-methylation can affect lipophilicity and metabolic clearance",
    ),
    TransformationTemplate(
        name="Hydroxyl to methoxy",
        description="Convert hydroxyl to methoxy",
        smarts_reactant="[OX2H1:1]",
        smarts_product="[O:1]C",
        category="bioisostere",
        rationale="Methoxy groups can improve metabolic stability compared to free hydroxyl",
    ),
    TransformationTemplate(
        name="Amide bond formation",
        description="Convert carboxylic acid to primary amide",
        smarts_reactant="[CX3:1](=[OX1:2])[OX2H1]",
        smarts_product="[C:1](=[O:2])N",
        category="functional_group",
        rationale="Amides can improve hydrogen bonding and solubility profiles",
    ),
]


# ---------------------------------------------------------------------------
# Candidate generation
# ---------------------------------------------------------------------------

def _generate_candidate_id(parent_smiles: str, child_smiles: str, transform: str) -> str:
    """Create a deterministic candidate ID."""
    raw = f"{parent_smiles}|{child_smiles}|{transform}"
    return "cand_" + hashlib.md5(raw.encode()).hexdigest()[:12]


def generate_candidates_rdkit(
    smiles: str,
    name: str = "",
    max_candidates: int = 6,
) -> list[CandidateInfo]:
    """
    Apply transformation templates using RDKit SMARTS-based reaction.
    Returns a list of CandidateInfo objects.
    """
    if not RDKIT_AVAILABLE:
        return generate_candidates_fallback(smiles, name, max_candidates)

    from rdkit import Chem
    from rdkit.Chem import AllChem

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        logger.warning("Cannot parse SMILES for candidate generation: %s", smiles)
        return []

    candidates: list[CandidateInfo] = []

    for template in TRANSFORMATION_TEMPLATES:
        if len(candidates) >= max_candidates:
            break

        try:
            rxn_smarts = f"{template.smarts_reactant}>>{template.smarts_product}"
            rxn = AllChem.ReactionFromSmarts(rxn_smarts)
            if rxn is None:
                continue

            products = rxn.RunReactants((mol,))
            if not products:
                continue

            # Take only the first product set
            for product_set in products[:1]:
                for product_mol in product_set[:1]:
                    try:
                        Chem.SanitizeMol(product_mol)
                        product_smiles = Chem.MolToSmiles(product_mol)

                        # Skip if product is same as input
                        if product_smiles == Chem.MolToSmiles(mol):
                            continue

                        valid, canonical = validate_smiles(product_smiles)
                        if not valid:
                            continue

                        descriptors = get_molecular_descriptors(product_smiles)
                        similarity = calculate_similarity(smiles, product_smiles)

                        cand_id = _generate_candidate_id(smiles, product_smiles, template.name)

                        candidates.append(CandidateInfo(
                            id=cand_id,
                            name=f"{template.name} of {name or 'input'}",
                            smiles=product_smiles,
                            canonical_smiles=canonical or product_smiles,
                            parent_smiles=smiles,
                            parent_name=name,
                            transformation=template.name,
                            generation_method=GenerationMethod.RULE_BASED,
                            evidence_status=EvidenceStatus.NO_MATCHING_RECORD_FOUND,
                            molecular_weight=descriptors.get("molecular_weight"),
                            molecular_formula=descriptors.get("molecular_formula"),
                            similarity_to_parent=similarity,
                            note=(
                                f"Computational candidate generated by {template.name} "
                                f"transformation. {template.rationale}. "
                                "Not every generated transformation is synthetically feasible."
                            ),
                        ))
                    except Exception as exc:
                        logger.debug("Product sanitization failed: %s", exc)
                        continue

        except Exception as exc:
            logger.debug("Template %s failed: %s", template.name, exc)
            continue

    return candidates


def generate_candidates_fallback(
    smiles: str,
    name: str = "",
    max_candidates: int = 6,
) -> list[CandidateInfo]:
    """
    Fallback candidate generation when RDKit is not available.
    Produces demonstration candidates with simple string manipulations.
    """
    candidates: list[CandidateInfo] = []
    label = name or "input molecule"

    demo_transforms = [
        ("Methyl ester prodrug", f"{smiles}.OC", "Ester prodrug — demonstration only"),
        ("N-methylation", f"C.{smiles}", "N-methylation — demonstration only"),
        ("Fluorine substitution", smiles.replace("c1ccccc1", "c1ccc(F)cc1", 1) if "c1ccccc1" in smiles else f"{smiles}.F",
         "Fluorine scan — demonstration only"),
    ]

    for transform_name, new_smiles, rationale in demo_transforms[:max_candidates]:
        cand_id = _generate_candidate_id(smiles, new_smiles, transform_name)
        candidates.append(CandidateInfo(
            id=cand_id,
            name=f"{transform_name} of {label}",
            smiles=new_smiles,
            canonical_smiles=new_smiles,
            parent_smiles=smiles,
            parent_name=name,
            transformation=transform_name,
            generation_method=GenerationMethod.RULE_BASED,
            evidence_status=EvidenceStatus.NO_MATCHING_RECORD_FOUND,
            molecular_weight=None,
            molecular_formula=None,
            similarity_to_parent=None,
            note=(
                f"Computational candidate (demo mode, RDKit unavailable). "
                f"{rationale}. Not every generated transformation is synthetically feasible."
            ),
        ))

    return candidates


def generate_candidates(
    smiles: str,
    name: str = "",
    max_candidates: int = 6,
) -> list[CandidateInfo]:
    """
    Main entry point: generate candidates using best available method.
    """
    if RDKIT_AVAILABLE:
        return generate_candidates_rdkit(smiles, name, max_candidates)
    return generate_candidates_fallback(smiles, name, max_candidates)
