"""
API routes for Molecule Explorer.

All endpoints follow proper error handling and never fabricate data.
"""
from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, HTTPException

from app.chemistry.rdkit_utils import (
    RDKIT_AVAILABLE,
    calculate_similarity,
    draw_molecule,
    generate_3d_coordinates,
    get_molecular_descriptors,
    validate_smiles,
)
from app.chemistry.candidate_generator import generate_candidates
from app.data import pubchem, chembl, bindingdb
from app.database.database import (
    AMPICILLIN_SMILES,
    PIVAMPICILLIN_SMILES,
    SessionLocal,
    CandidateRecord,
    MoleculeRecord,
)
from app.ml.qsar import predict_all_properties
from app.ml.ranking import rank_candidates, normalize_priorities
from app.models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    CandidateGenerateRequest,
    CandidateInfo,
    CandidatePredictRequest,
    EvidenceRecord as EvidenceRecordSchema,
    EvidenceStatus,
    GenerationMethod,
    HealthResponse,
    MoleculeInfo,
    Priorities,
    RankingRequest,
    RankingResponse,
    ErrorResponse,
)
from app.services.evidence_service import search_all_sources
from app.services.prediction_service import get_all_predictions, get_prediction_status
from app.services.ai_research_service import execute_ai_research
from pydantic import BaseModel

class ResearchRequest(BaseModel):
    query: str
    compound_name: str | None = None
    compound_smiles: str | None = None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# =========================================================================
# Health
# =========================================================================

@router.get("/health", response_model=HealthResponse)
async def health():
    pred_status = get_prediction_status()
    return HealthResponse(
        status="ok",
        version="0.1.0",
        rdkit_available=RDKIT_AVAILABLE,
        demo_mode=pred_status["qsar_demo_mode"],
    )


# =========================================================================
# AI Research & Intelligence
# =========================================================================

@router.post("/research")
@router.post("/research/query")
@router.post("/ai/chat")
async def ai_research_endpoint(request: ResearchRequest):
    """
    Autonomous AI Chemical & Pharmacological Research endpoint.
    Performs deep entity extraction, literature and bioactivity triangulation,
    QSAR predictive modeling, and 3D spatial conformer generation.
    """
    return await execute_ai_research(
        query=request.query,
        compound_name=request.compound_name,
        compound_smiles=request.compound_smiles,
    )


# =========================================================================
# Molecule
# =========================================================================

@router.post("/molecule/analyze", response_model=AnalysisResponse)
async def analyze_molecule(request: AnalysisRequest):
    """
    Main analysis endpoint. Resolves a molecule, generates candidates,
    checks evidence, predicts properties, and ranks results.
    """
    smiles = request.smiles.strip()
    name = request.name.strip()

    # --- Resolve SMILES ---
    if not smiles and name:
        # Try to find SMILES from name via PubChem
        try:
            pc = await pubchem.search_by_name(name)
            if pc and pc.get("canonical_smiles"):
                smiles = pc["canonical_smiles"]
        except Exception:
            pass

        # Try demo data
        if not smiles:
            smiles = _check_demo_smiles(name)

    if not smiles:
        raise HTTPException(
            status_code=400,
            detail="Could not resolve molecule. Please provide a valid SMILES string or a molecule name found in PubChem.",
        )

    # Validate SMILES
    valid, canonical = validate_smiles(smiles)
    if not valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid SMILES string: {smiles}",
        )
    smiles = canonical or smiles

    # --- Get molecule info ---
    mol_info = _build_molecule_info(name, smiles)

    # --- Generate candidates ---
    candidates = generate_candidates(smiles, name=name, max_candidates=6)

    # --- Add historical candidates from demo ---
    demo_candidates = _get_demo_candidates(smiles, name)
    candidates = demo_candidates + candidates

    # --- For each candidate: evidence + predictions + 3D in parallel ---
    async def _enrich_candidate(cand: CandidateInfo):
        # Evidence check
        try:
            evidence_result = await search_all_sources(cand.name or cand.smiles)
            cand.evidence_status = evidence_result["status"]
            cand.evidence = evidence_result["records"]
        except Exception as exc:
            logger.error("Evidence search failed for %s: %s", cand.id, exc)

        # Predictions
        try:
            cand.predictions = get_all_predictions(cand.smiles, include_admet=False)
        except Exception as exc:
            logger.error("Prediction failed for %s: %s", cand.id, exc)

        # 2D Image & 3D Conformer
        try:
            cand.image_base64 = draw_molecule(cand.smiles)
            cand.conformer_3d = generate_3d_coordinates(cand.smiles)
        except Exception as exc:
            logger.error("Visual generation failed for %s: %s", cand.id, exc)
        return cand

    await asyncio.gather(*[_enrich_candidate(cand) for cand in candidates])

    # --- Rank ---
    candidates = rank_candidates(candidates, request.priorities)

    return AnalysisResponse(
        molecule=mol_info,
        candidates=candidates,
    )


@router.get("/molecule/{identifier}")
async def get_molecule(identifier: str):
    """Get molecule information by name or SMILES."""
    # Try demo DB
    db = SessionLocal()
    try:
        record = db.query(MoleculeRecord).filter(
            (MoleculeRecord.name == identifier) |
            (MoleculeRecord.smiles == identifier)
        ).first()

        if record:
            return MoleculeInfo(
                name=record.name or "",
                smiles=record.smiles or "",
                canonical_smiles=record.canonical_smiles or "",
                molecular_weight=record.molecular_weight,
                molecular_formula=record.molecular_formula,
                logp=record.logp,
                hbd=record.hbd,
                hba=record.hba,
                tpsa=record.tpsa,
                rotatable_bonds=record.rotatable_bonds,
                pubchem_cid=record.pubchem_cid,
                chembl_id=record.chembl_id,
                image_base64=draw_molecule(record.smiles) if record.smiles else None,
            )
    finally:
        db.close()

    # Try computing from SMILES
    valid, canonical = validate_smiles(identifier)
    if valid:
        return _build_molecule_info("", canonical or identifier)

    # Check known common drug database
    known_smiles = _check_demo_smiles(identifier)
    if known_smiles:
        return _build_molecule_info(identifier.title(), known_smiles)

    # Try PubChem
    try:
        pc = await pubchem.search_by_name(identifier)
        if pc and pc.get("canonical_smiles"):
            return _build_molecule_info(
                identifier,
                pc["canonical_smiles"],
                pubchem_cid=pc.get("cid"),
            )
    except Exception as exc:
        logger.error("PubChem lookup error for '%s': %s", identifier, exc)

    raise HTTPException(
        status_code=404,
        detail=f"Molecule not found: {identifier}",
    )


@router.get("/molecule/3d/{smiles:path}")
async def get_3d_conformer(smiles: str):
    """
    Generate and return 3D conformer coordinates and bonds for any SMILES string.
    """
    valid, canonical = validate_smiles(smiles)
    if not valid:
        raise HTTPException(status_code=400, detail=f"Invalid SMILES string: {smiles}")
    return generate_3d_coordinates(canonical or smiles)


# =========================================================================
# Candidates
# =========================================================================

@router.post("/candidates/generate")
async def generate_candidates_endpoint(request: CandidateGenerateRequest):
    """Generate candidate branches for a molecule."""
    valid, canonical = validate_smiles(request.smiles)
    if not valid:
        raise HTTPException(status_code=400, detail=f"Invalid SMILES: {request.smiles}")

    smiles = canonical or request.smiles
    candidates = generate_candidates(
        smiles, name=request.name, max_candidates=request.max_candidates
    )

    # Add demo candidates if applicable
    demo_cands = _get_demo_candidates(smiles, request.name)
    candidates = demo_cands + candidates

    return {"candidates": candidates}


@router.post("/candidates/predict")
async def predict_candidates(request: CandidatePredictRequest):
    """Predict properties for a list of candidates."""
    results = []
    for cand in request.candidates:
        try:
            predictions = get_all_predictions(cand.smiles, include_admet=False)
            updated = cand.model_copy()
            updated.predictions = predictions
            results.append(updated)
        except Exception as exc:
            logger.error("Prediction failed for candidate %s: %s", cand.id, exc)
            results.append(cand)

    return {"candidates": results}


@router.post("/candidates/rank", response_model=RankingResponse)
async def rank_candidates_endpoint(request: RankingRequest):
    """Rank candidates according to user priorities."""
    ranked = rank_candidates(request.candidates, request.priorities)
    return RankingResponse(ranked_candidates=ranked)


# =========================================================================
# Evidence
# =========================================================================

@router.get("/evidence/{identifier}")
async def get_evidence(identifier: str):
    """Get evidence for a compound from all available sources."""
    try:
        result = await search_all_sources(identifier)
        return result
    except Exception as exc:
        logger.error("Evidence search error: %s", exc)
        return {
            "status": EvidenceStatus.NO_MATCHING_RECORD_FOUND,
            "records": [],
            "summary": f"Error searching databases: {str(exc)}",
        }


# =========================================================================
# Database search endpoints
# =========================================================================

@router.get("/search/pubchem/{query}")
async def search_pubchem(query: str):
    """Search PubChem for a compound."""
    try:
        result = await pubchem.search_compound(query)
        return result
    except Exception as exc:
        logger.error("PubChem search error: %s", exc)
        return {"found": False, "source": "PubChem", "error": "External database unavailable."}


@router.get("/search/chembl/{query}")
async def search_chembl(query: str):
    """Search ChEMBL for a compound."""
    try:
        result = await chembl.search_compound(query)
        return result
    except Exception as exc:
        logger.error("ChEMBL search error: %s", exc)
        return {"found": False, "source": "ChEMBL", "error": "External database unavailable."}


@router.get("/search/bindingdb/{query}")
async def search_bindingdb(query: str):
    """Search BindingDB for a compound."""
    try:
        result = await bindingdb.search_compound(query)
        return result
    except Exception as exc:
        logger.error("BindingDB search error: %s", exc)
        return {"found": False, "source": "BindingDB", "error": "External database unavailable."}


# =========================================================================
# Helpers
# =========================================================================

def _build_molecule_info(
    name: str,
    smiles: str,
    pubchem_cid: int | None = None,
    chembl_id: str | None = None,
) -> MoleculeInfo:
    """Build a MoleculeInfo from a SMILES string with 2D and 3D descriptors."""
    descriptors = get_molecular_descriptors(smiles)
    image = draw_molecule(smiles)
    conf_3d = generate_3d_coordinates(smiles)
    _, canonical = validate_smiles(smiles)

    return MoleculeInfo(
        name=name,
        smiles=smiles,
        canonical_smiles=canonical or smiles,
        molecular_weight=descriptors.get("molecular_weight"),
        molecular_formula=descriptors.get("molecular_formula"),
        logp=descriptors.get("logp"),
        hbd=descriptors.get("hbd"),
        hba=descriptors.get("hba"),
        tpsa=descriptors.get("tpsa"),
        rotatable_bonds=descriptors.get("rotatable_bonds"),
        image_base64=image,
        pubchem_cid=pubchem_cid,
        chembl_id=chembl_id,
        conformer_3d=conf_3d,
        error=descriptors.get("error"),
    )


def _check_demo_smiles(name: str) -> str:
    """Check if a molecule name matches demo data or known pharmaceutical reference compounds."""
    name_lower = name.lower().strip()
    demo_map = {
        "ampicillin": AMPICILLIN_SMILES,
        "pivampicillin": PIVAMPICILLIN_SMILES,
        "aspirin": "CC(=O)Oc1ccccc1C(=O)O",
        "acetylsalicylic acid": "CC(=O)Oc1ccccc1C(=O)O",
        "ibuprofen": "CC(C)Cc1ccc(cc1)C(C)C(=O)O",
        "paracetamol": "CC(=O)Nc1ccc(O)cc1",
        "acetaminophen": "CC(=O)Nc1ccc(O)cc1",
        "caffeine": "Cn1cnc2c1c(=O)n(c(=O)n2C)C",
        "penicillin": "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O",
        "penicillin g": "CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O",
        "amoxicillin": "CC1(C)SC2C(NC(=O)C(N)c3ccc(O)cc3)C(=O)N2C1C(=O)O",
        "ciprofloxacin": "O=C(O)c1cn(C2CC2)c3cc(N4CCNCC4)c(F)cc3c1=O",
        "dopamine": "NCCc1ccc(O)c(O)c1",
        "metformin": "CN(C)C(=N)NC(=N)N",
        "omeprazole": "COc1ccc2[nH]c(S(=O)Cc3ncc(C)c(OC)c3C)nc2c1",
        "atorvastatin": "CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC(O)CC(O)CC(=O)O",
    }
    return demo_map.get(name_lower, "")


def _get_demo_candidates(parent_smiles: str, parent_name: str) -> list[CandidateInfo]:
    """
    Return historical demo candidates if the parent is Ampicillin.
    """
    if parent_name.lower().strip() != "ampicillin" and parent_smiles != AMPICILLIN_SMILES:
        return []

    return [
        CandidateInfo(
            id="hist_pivampicillin",
            name="Pivampicillin",
            smiles=PIVAMPICILLIN_SMILES,
            canonical_smiles=PIVAMPICILLIN_SMILES,
            parent_smiles=AMPICILLIN_SMILES,
            parent_name="Ampicillin",
            transformation="Pivaloyloxymethyl ester prodrug (historical)",
            generation_method=GenerationMethod.HISTORICAL,
            evidence_status=EvidenceStatus.EXPERIMENTALLY_REPORTED,
            molecular_weight=463.57,
            molecular_formula="C22H29N3O6S",
            similarity_to_parent=calculate_similarity(AMPICILLIN_SMILES, PIVAMPICILLIN_SMILES),
            note=(
                "Pivampicillin is shown as a historical example of a prodrug "
                "modification of Ampicillin. This prototype does not claim to "
                "have discovered it."
            ),
        ),
    ]
