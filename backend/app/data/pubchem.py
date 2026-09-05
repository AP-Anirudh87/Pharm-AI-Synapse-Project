"""
PubChem PUG REST API client.

Provides search by name, SMILES, and CID with proper
timeout, error, and rate-limit handling.

Never fabricates API responses — returns clear error messages
if the service is unavailable.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
TIMEOUT = 4.0  # seconds


async def _get(url: str, params: dict | None = None) -> Optional[dict]:
    """Make a GET request to PubChem with error handling."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 404:
                return None
            if resp.status_code == 503:
                logger.warning("PubChem rate-limited (503). Returning None.")
                return None
            resp.raise_for_status()
            return resp.json()
    except httpx.TimeoutException:
        logger.error("PubChem request timed out: %s", url)
        return None
    except httpx.HTTPStatusError as exc:
        logger.error("PubChem HTTP error %s: %s", exc.response.status_code, url)
        return None
    except Exception as exc:
        logger.error("PubChem request failed: %s", exc)
        return None


async def search_by_name(name: str) -> Optional[dict[str, Any]]:
    """
    Search PubChem for a compound by name.
    Returns a normalized dict or None.
    """
    url = f"{BASE_URL}/compound/name/{name}/JSON"
    data = await _get(url)
    if data is None:
        return None
    return _parse_compound(data)


async def search_by_smiles(smiles: str) -> Optional[dict[str, Any]]:
    """Search PubChem by SMILES string."""
    url = f"{BASE_URL}/compound/smiles/{smiles}/JSON"
    data = await _get(url)
    if data is None:
        return None
    return _parse_compound(data)


async def search_by_cid(cid: int) -> Optional[dict[str, Any]]:
    """Search PubChem by CID."""
    url = f"{BASE_URL}/compound/cid/{cid}/JSON"
    data = await _get(url)
    if data is None:
        return None
    return _parse_compound(data)


async def get_properties(cid: int) -> Optional[dict[str, Any]]:
    """
    Get computed properties for a compound by CID.
    """
    props = (
        "MolecularFormula,MolecularWeight,CanonicalSMILES,"
        "IUPACName,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,"
        "RotatableBondCount"
    )
    url = f"{BASE_URL}/compound/cid/{cid}/property/{props}/JSON"
    data = await _get(url)
    if data is None:
        return None

    try:
        table = data.get("PropertyTable", {}).get("Properties", [])
        if not table:
            return None
        return table[0]
    except (KeyError, IndexError):
        return None


async def get_synonyms(cid: int) -> list[str]:
    """Get synonyms for a compound."""
    url = f"{BASE_URL}/compound/cid/{cid}/synonyms/JSON"
    data = await _get(url)
    if data is None:
        return []
    try:
        info = data.get("InformationList", {}).get("Information", [])
        if info:
            return info[0].get("Synonym", [])[:20]
    except (KeyError, IndexError):
        pass
    return []


async def search_compound(query: str) -> dict[str, Any]:
    """
    High-level search: tries name first, then SMILES.
    Returns a result dict with source information.
    """
    # Try name search
    result = await search_by_name(query)
    if result:
        result["search_method"] = "name"
        result["source"] = "PubChem"
        return result

    # Try SMILES search
    result = await search_by_smiles(query)
    if result:
        result["search_method"] = "smiles"
        result["source"] = "PubChem"
        return result

    return {
        "found": False,
        "source": "PubChem",
        "message": "No matching record found in PubChem.",
    }


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

def _parse_compound(data: dict) -> Optional[dict[str, Any]]:
    """Parse PubChem compound JSON into a normalized dict."""
    try:
        compounds = data.get("PC_Compounds", [])
        if not compounds:
            return None

        comp = compounds[0]
        cid = comp.get("id", {}).get("id", {}).get("cid")

        # Extract properties
        props = {}
        for p in comp.get("props", []):
            urn = p.get("urn", {})
            label = urn.get("label", "")
            value_obj = p.get("value", {})

            value = (
                value_obj.get("sval")
                or value_obj.get("ival")
                or value_obj.get("fval")
            )

            if label == "IUPAC Name" and urn.get("name") == "Preferred":
                props["iupac_name"] = value
            elif label == "Molecular Formula":
                props["molecular_formula"] = value
            elif label == "Molecular Weight":
                props["molecular_weight"] = value
            elif label == "SMILES" and urn.get("name") == "Canonical":
                props["canonical_smiles"] = value
            elif label == "Log P":
                props["logp"] = value

        return {
            "found": True,
            "cid": cid,
            "source": "PubChem",
            "external_url": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}" if cid else None,
            **props,
        }
    except Exception as exc:
        logger.error("Failed to parse PubChem response: %s", exc)
        return None
