"""
Evidence service for Molecule Explorer.

Aggregates evidence from PubChem, ChEMBL, and BindingDB.
Classifies compounds as EXPERIMENTALLY_REPORTED or
NO_MATCHING_RECORD_FOUND.

Never fabricates evidence. If a source is unavailable,
clearly reports "External database unavailable."
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.data import pubchem, chembl, bindingdb
from app.models.schemas import EvidenceRecord, EvidenceStatus

logger = logging.getLogger(__name__)

_EVIDENCE_CACHE: dict[str, Any] = {}


async def search_all_sources(query: str) -> dict[str, Any]:
    """
    Search all available databases for evidence of a compound.

    Returns
    -------
    dict with:
      - status: EvidenceStatus
      - records: list[EvidenceRecord]
      - summary: str
    """
    records: list[EvidenceRecord] = []
    found_experimental = False

    # In-memory query cache
    query_key = query.strip().lower()
    if query_key in _EVIDENCE_CACHE:
        return _EVIDENCE_CACHE[query_key]

    # Query all three databases in parallel
    pc_task = pubchem.search_compound(query)
    ch_task = chembl.search_compound(query)
    bdb_task = bindingdb.search_compound(query)

    pc_res, ch_res, bdb_res = await asyncio.gather(
        pc_task, ch_task, bdb_task, return_exceptions=True
    )

    # --- PubChem ---
    if isinstance(pc_res, dict) and pc_res.get("found"):
        found_experimental = True
        records.append(EvidenceRecord(
            source="PubChem",
            database="PubChem Compound",
            is_experimental=True,
            description=_format_pubchem(pc_res),
            external_url=pc_res.get("external_url"),
            data=pc_res,
        ))
    elif isinstance(pc_res, dict):
        records.append(EvidenceRecord(
            source="PubChem",
            database="PubChem Compound",
            is_experimental=False,
            description=pc_res.get("message", "No matching record found in PubChem."),
        ))
    else:
        records.append(EvidenceRecord(
            source="PubChem",
            database="PubChem Compound",
            is_experimental=False,
            description="External database unavailable or timed out.",
        ))

    # --- ChEMBL ---
    if isinstance(ch_res, dict) and ch_res.get("found"):
        found_experimental = True
        records.append(EvidenceRecord(
            source="ChEMBL",
            database="ChEMBL",
            is_experimental=True,
            description=_format_chembl(ch_res),
            external_url=ch_res.get("external_url"),
            data=ch_res,
        ))
    elif isinstance(ch_res, dict):
        records.append(EvidenceRecord(
            source="ChEMBL",
            database="ChEMBL",
            is_experimental=False,
            description=ch_res.get("message", "No matching record found in ChEMBL."),
        ))
    else:
        records.append(EvidenceRecord(
            source="ChEMBL",
            database="ChEMBL",
            is_experimental=False,
            description="External database unavailable or timed out.",
        ))

    # --- BindingDB ---
    if isinstance(bdb_res, dict) and bdb_res.get("found"):
        found_experimental = True
        records.append(EvidenceRecord(
            source="BindingDB",
            database="BindingDB",
            is_experimental=True,
            description=bdb_res.get("message", "Record found in BindingDB."),
            external_url=bdb_res.get("external_url"),
            data=bdb_res,
        ))
    elif isinstance(bdb_res, dict):
        records.append(EvidenceRecord(
            source="BindingDB",
            database="BindingDB",
            is_experimental=False,
            description=bdb_res.get("message", "No matching record found in BindingDB."),
        ))
    else:
        records.append(EvidenceRecord(
            source="BindingDB",
            database="BindingDB",
            is_experimental=False,
            description="External database unavailable or timed out.",
        ))

    # --- Determine status ---
    status = (
        EvidenceStatus.EXPERIMENTALLY_REPORTED
        if found_experimental
        else EvidenceStatus.NO_MATCHING_RECORD_FOUND
    )

    summary = (
        "Matching records found in public databases."
        if found_experimental
        else (
            "No matching record found in searched sources. "
            "Note: absence from our searched databases does not prove novelty."
        )
    )

    return {
        "status": status,
        "records": records,
        "summary": summary,
    }


def _format_pubchem(data: dict) -> str:
    """Format PubChem result into a readable description."""
    parts = []
    if data.get("cid"):
        parts.append(f"PubChem CID: {data['cid']}")
    if data.get("iupac_name"):
        parts.append(f"IUPAC: {data['iupac_name']}")
    if data.get("molecular_formula"):
        parts.append(f"Formula: {data['molecular_formula']}")
    if data.get("molecular_weight"):
        parts.append(f"MW: {data['molecular_weight']}")
    return "; ".join(parts) if parts else "Record found in PubChem."


def _format_chembl(data: dict) -> str:
    """Format ChEMBL result into a readable description."""
    parts = []
    if data.get("chembl_id"):
        parts.append(f"ChEMBL ID: {data['chembl_id']}")
    if data.get("pref_name"):
        parts.append(f"Name: {data['pref_name']}")
    if data.get("max_phase") is not None:
        parts.append(f"Max Phase: {data['max_phase']}")
    if data.get("molecular_weight"):
        parts.append(f"MW: {data['molecular_weight']}")
    return "; ".join(parts) if parts else "Record found in ChEMBL."
