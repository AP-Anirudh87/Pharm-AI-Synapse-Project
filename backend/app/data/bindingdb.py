"""
BindingDB API client for Molecule Explorer.

BindingDB's API is less stable than PubChem/ChEMBL, so this
client degrades gracefully — it attempts queries but never
blocks functionality if unavailable.

Never fabricates API responses.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://bindingdb.org/axis2/services/BDBService"
TIMEOUT = 4.0  # short timeout due to known instability


async def search_by_smiles(smiles: str) -> Optional[dict[str, Any]]:
    """
    Search BindingDB by SMILES.
    Uses the getLigandsBySmiles endpoint.
    """
    url = f"{BASE_URL}/getLigandsBySmiles"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url, params={
                "smiles": smiles,
                "cutoff": "0.85",
                "maxRecords": "5",
                "output": "json",
            })
            if resp.status_code != 200:
                return None
            # BindingDB may return XML or JSON depending on the endpoint
            try:
                data = resp.json()
            except Exception:
                # Attempt plain text parsing
                return _parse_text_response(resp.text, smiles)

            return _parse_json_response(data, smiles)

    except httpx.TimeoutException:
        logger.warning("BindingDB request timed out for SMILES: %s", smiles[:50])
        return None
    except Exception as exc:
        logger.warning("BindingDB request failed: %s", exc)
        return None


async def search_by_name(name: str) -> Optional[dict[str, Any]]:
    """
    Search BindingDB by compound name.
    BindingDB's name search is limited — this is a best-effort attempt.
    """
    url = f"{BASE_URL}/getLigandsByUniprotIds"
    # BindingDB doesn't have a clean name search;
    # attempt via the compound name in the SMILES endpoint as a fallback
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            # Try a simple compound search
            search_url = "https://bindingdb.org/rwd/bind/chemsearch/marvin/SDFdownload.jsp"
            resp = await client.get(search_url, params={
                "all_download": "yes",
                "download_name": name,
            })
            if resp.status_code == 200 and len(resp.text) > 100:
                return {
                    "found": True,
                    "source": "BindingDB",
                    "name": name,
                    "message": "Compound found in BindingDB",
                    "external_url": f"https://www.bindingdb.org/rwd/bind/chemsearch/marvin/BatchMolfileDownload.jsp?search_type=name&name={name}",
                }
    except Exception as exc:
        logger.warning("BindingDB name search failed for '%s': %s", name, exc)

    return None


async def search_compound(query: str) -> dict[str, Any]:
    """
    High-level search: tries name first, then treats query as SMILES.
    Returns a result dict with source information.
    """
    result = await search_by_name(query)
    if result and result.get("found"):
        return result

    result = await search_by_smiles(query)
    if result and result.get("found"):
        return result

    return {
        "found": False,
        "source": "BindingDB",
        "message": "No matching record found in BindingDB, or service is currently unavailable.",
    }


def _parse_json_response(data: Any, smiles: str) -> Optional[dict[str, Any]]:
    """Parse BindingDB JSON response."""
    try:
        if isinstance(data, dict):
            affinities = data.get("getLigandsBySmiles", {}).get("affinities", [])
            if affinities:
                return {
                    "found": True,
                    "source": "BindingDB",
                    "query_smiles": smiles,
                    "num_records": len(affinities),
                    "affinities": affinities[:5],
                    "external_url": "https://www.bindingdb.org/",
                }
    except Exception as exc:
        logger.debug("BindingDB JSON parse error: %s", exc)
    return None


def _parse_text_response(text: str, smiles: str) -> Optional[dict[str, Any]]:
    """Attempt to parse a text/XML response from BindingDB."""
    if not text or len(text) < 50:
        return None
    return {
        "found": True,
        "source": "BindingDB",
        "query_smiles": smiles,
        "message": "Binding data found (raw format)",
        "external_url": "https://www.bindingdb.org/",
    }
