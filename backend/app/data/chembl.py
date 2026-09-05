"""
ChEMBL API client for Molecule Explorer.

Provides search by name, SMILES, and ChEMBL ID with proper
timeout, error, and rate-limit handling.

Never fabricates API responses.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://www.ebi.ac.uk/chembl/api/data"
TIMEOUT = 4.0


async def _get(url: str, params: dict | None = None) -> Optional[dict]:
    """Make a GET request to ChEMBL with error handling."""
    if params is None:
        params = {}
    params["format"] = "json"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
    except httpx.TimeoutException:
        logger.error("ChEMBL request timed out: %s", url)
        return None
    except httpx.HTTPStatusError as exc:
        logger.error("ChEMBL HTTP error %s: %s", exc.response.status_code, url)
        return None
    except Exception as exc:
        logger.error("ChEMBL request failed: %s", exc)
        return None


async def search_by_name(name: str) -> Optional[dict[str, Any]]:
    """
    Search ChEMBL for a molecule by name.
    Uses the molecule search endpoint.
    """
    url = f"{BASE_URL}/molecule/search"
    data = await _get(url, params={"q": name, "limit": 5})
    if data is None:
        return None

    molecules = data.get("molecules", [])
    if not molecules:
        return None

    return _parse_molecule(molecules[0])


async def search_by_chembl_id(chembl_id: str) -> Optional[dict[str, Any]]:
    """Search ChEMBL by ChEMBL ID."""
    url = f"{BASE_URL}/molecule/{chembl_id}"
    data = await _get(url)
    if data is None:
        return None
    return _parse_molecule(data)


async def search_by_smiles(smiles: str) -> Optional[dict[str, Any]]:
    """
    Search ChEMBL by SMILES using the molecule endpoint with
    a similarity/substructure approach.
    """
    url = f"{BASE_URL}/molecule"
    data = await _get(url, params={
        "molecule_structures__canonical_smiles": smiles,
        "limit": 5,
    })
    if data is None:
        return None

    molecules = data.get("molecules", [])
    if not molecules:
        return None

    return _parse_molecule(molecules[0])


async def get_bioactivities(chembl_id: str, limit: int = 10) -> list[dict[str, Any]]:
    """
    Get bioactivity data for a compound.
    """
    url = f"{BASE_URL}/activity"
    data = await _get(url, params={
        "molecule_chembl_id": chembl_id,
        "limit": limit,
    })
    if data is None:
        return []

    activities = data.get("activities", [])
    results = []
    for act in activities:
        results.append({
            "assay_chembl_id": act.get("assay_chembl_id"),
            "assay_description": act.get("assay_description"),
            "target_chembl_id": act.get("target_chembl_id"),
            "target_pref_name": act.get("target_pref_name"),
            "standard_type": act.get("standard_type"),
            "standard_value": act.get("standard_value"),
            "standard_units": act.get("standard_units"),
            "standard_relation": act.get("standard_relation"),
        })
    return results


async def search_compound(query: str) -> dict[str, Any]:
    """
    High-level search: tries name first, then SMILES.
    Returns a result dict with source information.
    """
    result = await search_by_name(query)
    if result:
        result["search_method"] = "name"
        return result

    result = await search_by_smiles(query)
    if result:
        result["search_method"] = "smiles"
        return result

    return {
        "found": False,
        "source": "ChEMBL",
        "message": "No matching record found in ChEMBL.",
    }


def _parse_molecule(data: dict) -> Optional[dict[str, Any]]:
    """Parse a ChEMBL molecule record."""
    try:
        chembl_id = data.get("molecule_chembl_id")
        structures = data.get("molecule_structures") or {}
        properties = data.get("molecule_properties") or {}

        return {
            "found": True,
            "source": "ChEMBL",
            "chembl_id": chembl_id,
            "pref_name": data.get("pref_name"),
            "molecule_type": data.get("molecule_type"),
            "canonical_smiles": structures.get("canonical_smiles"),
            "molecular_formula": properties.get("full_molformula"),
            "molecular_weight": _safe_float(properties.get("full_mwt")),
            "alogp": _safe_float(properties.get("alogp")),
            "hbd": _safe_int(properties.get("hbd")),
            "hba": _safe_int(properties.get("hba")),
            "psa": _safe_float(properties.get("psa")),
            "rtb": _safe_int(properties.get("rtb")),
            "max_phase": data.get("max_phase"),
            "external_url": f"https://www.ebi.ac.uk/chembl/compound_report_card/{chembl_id}/" if chembl_id else None,
        }
    except Exception as exc:
        logger.error("Failed to parse ChEMBL molecule: %s", exc)
        return None


def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None
