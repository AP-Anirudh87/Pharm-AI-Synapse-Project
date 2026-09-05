"""
Pydantic models for Molecule Explorer API.
All computational predictions are clearly labeled as such.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EvidenceStatus(str, Enum):
    EXPERIMENTALLY_REPORTED = "EXPERIMENTALLY_REPORTED"
    NO_MATCHING_RECORD_FOUND = "NO_MATCHING_RECORD_FOUND"


class GenerationMethod(str, Enum):
    RULE_BASED = "RULE_BASED"
    HISTORICAL = "HISTORICAL"
    EXTERNAL_DB = "EXTERNAL_DB"


class PredictionConfidence(str, Enum):
    DEMO = "Demonstration model — not clinically validated"
    LOW = "Low confidence prediction"
    MEDIUM = "Medium confidence prediction"
    HIGH = "High confidence prediction"
    UNAVAILABLE = "ADMET prediction unavailable in demo mode"


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class Priorities(BaseModel):
    activity: float = Field(default=25.0, ge=0, le=100)
    absorption: float = Field(default=25.0, ge=0, le=100)
    solubility: float = Field(default=25.0, ge=0, le=100)
    toxicity: float = Field(default=25.0, ge=0, le=100)


class AnalysisRequest(BaseModel):
    name: str = ""
    smiles: str = ""
    goal: str = "Improve oral absorption"
    priorities: Priorities = Field(default_factory=Priorities)


class CandidateGenerateRequest(BaseModel):
    smiles: str
    name: str = ""
    goal: str = ""
    max_candidates: int = Field(default=6, ge=1, le=20)


class CandidatePredictRequest(BaseModel):
    candidates: list[CandidateInfo]


class RankingRequest(BaseModel):
    candidates: list[CandidateInfo]
    priorities: Priorities = Field(default_factory=Priorities)


# ---------------------------------------------------------------------------
# Response Models
# ---------------------------------------------------------------------------

class MoleculeInfo(BaseModel):
    name: str = ""
    smiles: str = ""
    canonical_smiles: str = ""
    molecular_weight: Optional[float] = None
    molecular_formula: Optional[str] = None
    logp: Optional[float] = None
    hbd: Optional[int] = None  # H-bond donors
    hba: Optional[int] = None  # H-bond acceptors
    tpsa: Optional[float] = None  # Topological polar surface area
    rotatable_bonds: Optional[int] = None
    image_base64: Optional[str] = None
    pubchem_cid: Optional[int] = None
    chembl_id: Optional[str] = None
    conformer_3d: Optional[dict] = None
    error: Optional[str] = None


class PredictionResult(BaseModel):
    property_name: str
    value: Optional[float] = None
    unit: str = ""
    label: str = "Prediction — not experimentally validated"
    confidence: PredictionConfidence = PredictionConfidence.DEMO
    method: str = "Demonstration model"


class EvidenceRecord(BaseModel):
    source: str  # e.g. "PubChem", "ChEMBL", "BindingDB"
    database: str
    is_experimental: bool = False
    description: str = ""
    external_url: Optional[str] = None
    data: Optional[dict] = None


class CandidateInfo(BaseModel):
    id: str = ""
    name: str = ""
    smiles: str = ""
    canonical_smiles: str = ""
    parent_smiles: str = ""
    parent_name: str = ""
    transformation: str = ""
    generation_method: GenerationMethod = GenerationMethod.RULE_BASED
    evidence_status: EvidenceStatus = EvidenceStatus.NO_MATCHING_RECORD_FOUND
    molecular_weight: Optional[float] = None
    molecular_formula: Optional[str] = None
    similarity_to_parent: Optional[float] = None
    image_base64: Optional[str] = None
    predictions: list[PredictionResult] = Field(default_factory=list)
    evidence: list[EvidenceRecord] = Field(default_factory=list)
    ranking_score: Optional[float] = None
    ranking_breakdown: Optional[dict] = None
    conformer_3d: Optional[dict] = None
    note: str = ""  # e.g. "Computational candidate"


class AnalysisResponse(BaseModel):
    molecule: MoleculeInfo
    candidates: list[CandidateInfo] = Field(default_factory=list)
    disclaimer: str = (
        "This application is a research-support prototype. "
        "Computational predictions are not experimental validation, "
        "clinical recommendations, or proof of drug efficacy or safety."
    )


class RankingResponse(BaseModel):
    ranked_candidates: list[CandidateInfo]
    scoring_method: str = (
        "Weighted sum: score = Σ(property_score × normalized_weight). "
        "Toxicity is inverted (lower toxicity = higher score)."
    )
    disclaimer: str = (
        "Rankings are based on computational predictions from a demonstration model. "
        "They do not constitute clinical recommendations."
    )


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    rdkit_available: bool = False
    demo_mode: bool = True


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
