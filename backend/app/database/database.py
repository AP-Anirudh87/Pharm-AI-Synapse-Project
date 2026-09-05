"""
SQLAlchemy database setup with SQLite.
Includes table definitions and seed data for the Ampicillin demo.
Structured so it can later be migrated to PostgreSQL.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    Boolean,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


# ---------------------------------------------------------------------------
# Database configuration
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./molecule_explorer.db")

# For SQLite we need check_same_thread=False
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Table definitions
# ---------------------------------------------------------------------------

class MoleculeRecord(Base):
    __tablename__ = "molecules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(256), index=True)
    smiles = Column(String(1024), index=True)
    canonical_smiles = Column(String(1024))
    molecular_weight = Column(Float, nullable=True)
    molecular_formula = Column(String(128), nullable=True)
    logp = Column(Float, nullable=True)
    hbd = Column(Integer, nullable=True)
    hba = Column(Integer, nullable=True)
    tpsa = Column(Float, nullable=True)
    rotatable_bonds = Column(Integer, nullable=True)
    pubchem_cid = Column(Integer, nullable=True)
    chembl_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CandidateRecord(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String(64), unique=True, index=True)
    name = Column(String(256))
    smiles = Column(String(1024))
    canonical_smiles = Column(String(1024))
    parent_smiles = Column(String(1024))
    parent_name = Column(String(256))
    transformation = Column(String(256))
    generation_method = Column(String(64))
    evidence_status = Column(String(64))
    molecular_weight = Column(Float, nullable=True)
    molecular_formula = Column(String(128), nullable=True)
    similarity_to_parent = Column(Float, nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String(64), index=True)
    property_name = Column(String(128))
    value = Column(Float, nullable=True)
    unit = Column(String(32), default="")
    confidence = Column(String(64))
    method = Column(String(128))
    label = Column(String(256), default="Prediction — not experimentally validated")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class EvidenceRecord(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_id = Column(String(64), index=True)
    source = Column(String(128))
    database = Column(String(128))
    is_experimental = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    external_url = Column(String(512), nullable=True)
    data_json = Column(Text, nullable=True)  # JSON string of extra data
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ExperimentRecord(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), index=True)
    molecule_name = Column(String(256))
    molecule_smiles = Column(String(1024))
    goal = Column(String(256))
    priorities_json = Column(Text)
    result_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RankingRecord(Base):
    __tablename__ = "rankings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_id = Column(Integer, index=True)
    candidate_id = Column(String(64), index=True)
    rank = Column(Integer)
    overall_score = Column(Float)
    breakdown_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Database lifecycle
# ---------------------------------------------------------------------------

def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for FastAPI — yields a session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Seed / demo data
# ---------------------------------------------------------------------------

# Ampicillin SMILES (well-known)
AMPICILLIN_SMILES = "CC1([C@@H](N2[C@H](S1)[C@@H](C2=O)NC(=O)[C@@H](C3=CC=CC=C3)N)C(=O)O)C"
# Pivampicillin SMILES (well-known prodrug of ampicillin)
PIVAMPICILLIN_SMILES = "CC(C)(C)C(=O)OCOC(=O)[C@@H]1N2[C@H](SC1(C)C)[C@@H](C2=O)NC(=O)[C@@H](N)C3=CC=CC=C3"


def seed_demo_data(db: Session):
    """
    Insert demonstration data for the Ampicillin showcase.
    This data is explicitly marked as demonstration / historical.
    No experimental measurements are invented.
    """
    # Check if already seeded
    existing = db.query(MoleculeRecord).filter_by(name="Ampicillin").first()
    if existing:
        return

    # -- Ampicillin --
    amp = MoleculeRecord(
        name="Ampicillin",
        smiles=AMPICILLIN_SMILES,
        canonical_smiles=AMPICILLIN_SMILES,
        molecular_weight=349.41,
        molecular_formula="C16H19N3O4S",
        logp=1.35,
        hbd=3,
        hba=4,
        tpsa=112.73,
        rotatable_bonds=4,
        pubchem_cid=6249,
        chembl_id="CHEMBL174",
    )
    db.add(amp)

    # -- Pivampicillin (historical example) --
    piv = MoleculeRecord(
        name="Pivampicillin",
        smiles=PIVAMPICILLIN_SMILES,
        canonical_smiles=PIVAMPICILLIN_SMILES,
        molecular_weight=463.57,
        molecular_formula="C22H29N3O6S",
        logp=2.48,
        hbd=2,
        hba=5,
        tpsa=131.96,
        rotatable_bonds=8,
        pubchem_cid=33685,
        chembl_id="CHEMBL1461",
    )
    db.add(piv)

    # -- Pivampicillin as a historical candidate of Ampicillin --
    piv_candidate = CandidateRecord(
        candidate_id="hist_pivampicillin",
        name="Pivampicillin",
        smiles=PIVAMPICILLIN_SMILES,
        canonical_smiles=PIVAMPICILLIN_SMILES,
        parent_smiles=AMPICILLIN_SMILES,
        parent_name="Ampicillin",
        transformation="Pivaloyloxymethyl ester prodrug (historical)",
        generation_method="HISTORICAL",
        evidence_status="EXPERIMENTALLY_REPORTED",
        molecular_weight=463.57,
        molecular_formula="C22H29N3O6S",
        similarity_to_parent=0.48,
        note=(
            "Pivampicillin is shown as a historical example of a prodrug "
            "modification of Ampicillin. This prototype does not claim to "
            "have discovered it."
        ),
    )
    db.add(piv_candidate)

    # -- Historical evidence for Pivampicillin --
    evidence = EvidenceRecord(
        candidate_id="hist_pivampicillin",
        source="PubChem",
        database="PubChem",
        is_experimental=True,
        description=(
            "Pivampicillin (CID 33685) is a well-documented pivaloyloxymethyl "
            "ester prodrug of ampicillin, developed to improve oral absorption. "
            "It is hydrolyzed in vivo to release ampicillin."
        ),
        external_url="https://pubchem.ncbi.nlm.nih.gov/compound/33685",
        data_json=json.dumps({"pubchem_cid": 33685, "type": "historical_record"}),
    )
    db.add(evidence)

    db.commit()
