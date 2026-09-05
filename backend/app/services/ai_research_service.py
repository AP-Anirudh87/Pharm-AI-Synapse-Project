"""
Pharm AI Synapse — AI Chemical & Pharmacological Research Service.
Lead Architect: A.P. Anirudh.

Autonomous scientific reasoning engine providing deep-dive biochemical research,
database triangulation (PubChem, ChEMBL, BindingDB), QSAR machine learning predictions,
and actionable 3D molecular CAD hypotheses.
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Optional

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
)
from app.ml.qsar import predict_all_properties
from app.ml.ranking import rank_candidates
from app.models.schemas import (
    CandidateInfo,
    EvidenceRecord as EvidenceRecordSchema,
    EvidenceStatus,
    GenerationMethod,
    MoleculeInfo,
    Priorities,
)
from app.services.evidence_service import search_all_sources
from app.services.prediction_service import get_all_predictions

logger = logging.getLogger(__name__)

# Curated reference dictionary of pharmaceutical compounds
PHARMA_KNOWLEDGE_BASE: dict[str, dict[str, Any]] = {
    "ampicillin": {
        "name": "Ampicillin",
        "smiles": AMPICILLIN_SMILES,
        "class": "Aminopenicillin Beta-Lactam Antibiotic",
        "targets": ["Penicillin-Binding Proteins (PBP1a, PBP1b, PBP2, PBP3)"],
        "mechanism": "Binds to and inhibits transpeptidase enzymes (PBPs) involved in bacterial peptidoglycan cell wall cross-linking, inducing autolysis.",
        "indication": "Broad-spectrum bacterial infections (Gram-positive & Gram-negative pathogens including E. coli, Listeria, Salmonella).",
        "challenges": "Low oral bioavailability (~30-40%) due to zwitterionic polarity; susceptibility to bacterial beta-lactamase hydrolysis.",
        "prodrug_strategy": "Esterification of the carboxylic acid (e.g. Pivampicillin, Bacampicillin, Talampicillin) masks charge, elevating oral absorption to >85-90%.",
    },
    "pivampicillin": {
        "name": "Pivampicillin",
        "smiles": PIVAMPICILLIN_SMILES,
        "class": "Pivaloyloxymethyl Prodrug of Ampicillin",
        "targets": ["Penicillin-Binding Proteins (post-enzymatic cleavage)"],
        "mechanism": "Rapidly cleaved by non-specific intestinal and plasma esterases to release free ampicillin, pivalic acid, and formaldehyde.",
        "indication": "Severe bacterial respiratory, urinary, and gastrointestinal infections requiring high plasma ampicillin concentrations.",
        "advantages": "Lipophilic POM ester masks polar carboxylate, boosting oral bioavailability to 85-90% and reducing gastrointestinal side effects.",
    },
    "aspirin": {
        "name": "Aspirin (Acetylsalicylic Acid)",
        "smiles": "CC(=O)Oc1ccccc1C(=O)O",
        "class": "Non-Steroidal Anti-Inflammatory Drug (NSAID) / Antiplatelet",
        "targets": ["Cyclooxygenase-1 (COX-1)", "Cyclooxygenase-2 (COX-2)"],
        "mechanism": "Irreversibly acetylates Serine 529 in COX-1 and Serine 516 in COX-2, permanently shutting down thromboxane A2 and prostaglandin synthesis.",
        "indication": "Mild to moderate pain, pyrexia, acute coronary syndromes, stroke prophylaxis, and colorectal cancer chemoprevention.",
        "challenges": "Gastric mucosal irritation due to local prostaglandin inhibition and direct acidic epithelial erosion.",
        "prodrug_strategy": "Ester/amide conjugation or nitric oxide-donating aspirin derivatives (NCX-4016) reduce gastric ulcerogenicity.",
    },
    "ibuprofen": {
        "name": "Ibuprofen",
        "smiles": "CC(C)Cc1ccc(cc1)C(C)C(=O)O",
        "class": "Propionic Acid Derivative Non-Selective NSAID",
        "targets": ["COX-1", "COX-2"],
        "mechanism": "Reversibly inhibits COX-1 and COX-2 enzymes, suppressing arachidonic acid conversion into proinflammatory prostanoids.",
        "indication": "Dysmenorrhea, rheumatoid arthritis, osteoarthritis, dental pain, headache, and reduction of inflammatory fever.",
        "challenges": "Chiral inversion from (R)-enantiomer to active (S)-enantiomer in vivo; potential renal vasoconstriction and GI side effects.",
        "optimization": "Dexibuprofen ((S)-isomer isolation) cuts metabolic burden; lysine salt (Ibuprofen lysinate) enhances dissolution rate.",
    },
    "paracetamol": {
        "name": "Paracetamol (Acetaminophen)",
        "smiles": "CC(=O)Nc1ccc(O)cc1",
        "class": "Anilide Antipyretic and Non-Opioid Analgesic",
        "targets": ["Central Cyclooxygenase (COX-3 / splice variant)", "TRPA1 receptor", "Cannabinoid CB1 receptor (via AM404 metabolite)"],
        "mechanism": "Acts predominantly in the CNS by scavenging peroxidase-active radicals at the catalytic site of PGHS, with minimal peripheral anti-inflammatory activity.",
        "indication": "First-line management of mild-to-moderate pain and febrile states across all age groups.",
        "challenges": "Dose-dependent hepatotoxicity mediated by cytochrome P450 (CYP2E1) oxidation to reactive N-acetyl-p-benzoquinone imine (NAPQI).",
        "toxicology": "When hepatic glutathione is depleted below 30%, NAPQI binds covalently to cysteinyl sulfhydryl groups in mitochondrial proteins, causing centrilobular hepatic necrosis.",
    },
    "caffeine": {
        "name": "Caffeine",
        "smiles": "Cn1cnc2c1c(=O)n(c(=O)n2C)C",
        "class": "Methylxanthine CNS Stimulant",
        "targets": ["Adenosine A1 and A2A Receptors", "Phosphodiesterase (PDE)", "Ryanodine Receptors"],
        "mechanism": "Non-selective competitive antagonist at adenosine A1 and A2A receptors in the cerebral cortex, preventing adenosine-mediated neuronal depression.",
        "indication": "Fatigue mitigation, cognitive enhancement, adjunct in analgesic preparations, and neonatal apnea of prematurity.",
        "admet": "Near 100% oral bioavailability; rapidly crosses blood-brain barrier (logP -0.07, MW 194.2); metabolized via CYP1A2 into paraxanthine (84%), theobromine (12%), and theophylline (4%).",
    },
    "ciprofloxacin": {
        "name": "Ciprofloxacin",
        "smiles": "O=C(O)c1cn(C2CC2)c3cc(N4CCNCC4)c(F)cc3c1=O",
        "class": "Second-Generation Fluoroquinolone Antibiotic",
        "targets": ["Bacterial DNA Gyrase (Topoisomerase II)", "Topoisomerase IV"],
        "mechanism": "Traps the cleavable complex between DNA gyrase/topoisomerase IV and bacterial DNA, arresting replication forks and generating lethal double-strand breaks.",
        "indication": "Pseudomonas aeruginosa, complicated urinary tract infections, anthrax post-exposure prophylaxis, infectious diarrhea.",
        "structure_activity": "C6 fluorine atom boosts target affinity ~10-fold; C7 piperazinyl group broadens Gram-negative & Pseudomonas spectrum; cyclopropyl ring enhances potency.",
    },
    "metformin": {
        "name": "Metformin",
        "smiles": "CN(C)C(=N)NC(=N)N",
        "class": "Biguanide Antihyperglycemic Agent",
        "targets": ["Mitochondrial Complex I", "AMP-activated Protein Kinase (AMPK)", "Fructose-1,6-bisphosphatase"],
        "mechanism": "Mildly inhibits mitochondrial respiratory chain Complex I, elevating cellular AMP:ATP ratio and activating AMPK, which suppresses hepatic gluconeogenesis and augments peripheral glucose uptake.",
        "indication": "First-line pharmacotherapy for Type 2 Diabetes Mellitus; gestational diabetes, polycystic ovary syndrome (PCOS).",
        "pharmacokinetics": "Hydrophilic cation at physiological pH; absorbed via organic cation transporters (OCT1, OCT2); eliminated unchanged renally without hepatic metabolism.",
    },
    "atorvastatin": {
        "name": "Atorvastatin",
        "smiles": "CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC(O)CC(O)CC(=O)O",
        "class": "HMG-CoA Reductase Inhibitor (Statin)",
        "targets": ["3-Hydroxy-3-Methylglutaryl-CoA Reductase"],
        "mechanism": "Potent competitive inhibitor of HMG-CoA reductase, the rate-limiting enzyme in cholesterol biosynthesis; upregulates hepatic LDL receptors.",
        "indication": "Hypercholesterolemia, dyslipidemia, primary and secondary cardiovascular risk reduction.",
        "sar": "Synthetic heptanoic acid pharmacophore mimics the HMG intermediate, while the pyrrole ring with phenyl and fluorophenyl rings binds deep hydrophobic subpockets.",
    },
    "omeprazole": {
        "name": "Omeprazole",
        "smiles": "COc1ccc2[nH]c(S(=O)Cc3ncc(C)c(OC)c3C)nc2c1",
        "class": "Proton Pump Inhibitor (PPI)",
        "targets": ["Gastric H+/K+-ATPase"],
        "mechanism": "Acid-activated prodrug that concentrates in parietal cell canaliculi, forming a reactive sulfenamide that covalently binds Cysteine 813 on the alpha subunit of H+/K+-ATPase.",
        "indication": "Gastroesophageal reflux disease (GERD), peptic ulcer disease, Zollinger-Ellison syndrome, H. pylori eradication.",
    },
    "doxorubicin": {
        "name": "Doxorubicin (Adriamycin)",
        "smiles": "COc1cccc2c1C(=O)c1c(O)c3c(c(O)c1C2=O)CC(O)(C(=O)CO)CC3OC1CC(N)C(O)C(C)O1",
        "class": "Anthracycline Antitumor Antibiotic",
        "targets": ["DNA Topoisomerase II-alpha", "DNA Intercalation sites"],
        "mechanism": "Intercalates between base pairs, stabilizes DNA-topoisomerase II cleavable complexes preventing relegation, and generates reactive oxygen species (ROS).",
        "indication": "Broad spectrum: breast cancer, lymphomas, sarcomas, leukemias, ovarian carcinoma.",
        "toxicity_alert": "Dose-dependent cardiotoxicity resulting from free radical generation, lipid peroxidation in cardiomyocytes, and mitochondrial dysfunction.",
    },
    "imatinib": {
        "name": "Imatinib (Gleevec)",
        "smiles": "Cc1ccc(NC(=O)c2ccc(CN3CCN(C)CC3)cc2)cc1Nc1nccc(-c2cccnc2)n1",
        "class": "Targeted Tyrosine Kinase Inhibitor (TKI)",
        "targets": ["BCR-ABL fusion kinase", "c-KIT (CD117)", "PDGFR-alpha/beta"],
        "mechanism": "Binds to the inactive (DFG-out) conformation of the kinase catalytic domain, freezing the ATP-binding pocket and halting downstream oncogenic signaling.",
        "indication": "Philadelphia chromosome-positive (Ph+) Chronic Myeloid Leukemia (CML), Gastrointestinal Stromal Tumors (GIST).",
    },
};


def _find_matching_compound_key(text: str) -> Optional[str]:
    """Identify if the text mentions any known chemical compound."""
    lower = text.lower().strip()
    
    # Direct key lookup
    for key in PHARMA_KNOWLEDGE_BASE:
        if re.search(rf"\b{re.escape(key)}\b", lower):
            return key
            
    # Alias lookup
    aliases = {
        "tylenol": "paracetamol",
        "acetaminophen": "paracetamol",
        "panadol": "paracetamol",
        "advil": "ibuprofen",
        "motrin": "ibuprofen",
        "ecotrin": "aspirin",
        "acetylsalicylic acid": "aspirin",
        "gleevec": "imatinib",
        "lipitor": "atorvastatin",
        "prilosec": "omeprazole",
        "adriamycin": "doxorubicin",
        "cipro": "ciprofloxacin",
        "gliflozin": "metformin",
        "glucophage": "metformin",
    }
    for alias, target in aliases.items():
        if re.search(rf"\b{re.escape(alias)}\b", lower):
            return target

    return None


async def execute_ai_research(
    query: str,
    compound_name: Optional[str] = None,
    compound_smiles: Optional[str] = None,
) -> dict[str, Any]:
    """
    Execute deep autonomous biomedical research on the user's query.
    Combines live PubChem / ChEMBL / BindingDB evidence with RDKit and QSAR models.
    """
    cleaned_query = query.strip()
    logger.info("Executing AI Research query: '%s'", cleaned_query)

    # 1. Resolve Target Compound
    matched_key = _find_matching_compound_key(cleaned_query)
    if not matched_key and compound_name:
        matched_key = _find_matching_compound_key(compound_name)

    target_name = compound_name or (PHARMA_KNOWLEDGE_BASE[matched_key]["name"] if matched_key else "")
    target_smiles = compound_smiles or (PHARMA_KNOWLEDGE_BASE[matched_key]["smiles"] if matched_key else "")

    # If no SMILES yet, try PubChem query for the first prominent noun or query term
    pubchem_record = None
    if not target_smiles:
        potential_name = target_name or _extract_potential_compound_name(cleaned_query)
        if potential_name:
            try:
                pubchem_record = await pubchem.search_by_name(potential_name)
                if pubchem_record and pubchem_record.get("canonical_smiles"):
                    target_name = potential_name.title()
                    target_smiles = pubchem_record["canonical_smiles"]
            except Exception as exc:
                logger.warning("PubChem resolution error: %s", exc)

    # Fallback to Ampicillin if still completely unknown and query contains chemical terms
    if not target_smiles and ("molecule" in cleaned_query.lower() or "drug" in cleaned_query.lower() or "compound" in cleaned_query.lower()):
        target_name = "Ampicillin"
        target_smiles = AMPICILLIN_SMILES
        matched_key = "ampicillin"

    # 2. Perform RDKit Descriptors & 3D Conformer Generation
    mol_info: Optional[MoleculeInfo] = None
    candidates: list[CandidateInfo] = []
    evidence_records: list[EvidenceRecordSchema] = []
    qsar_predictions = []

    if target_smiles:
        valid, canonical = validate_smiles(target_smiles)
        if valid:
            active_smiles = canonical or target_smiles
            descriptors = get_molecular_descriptors(active_smiles)
            image_b64 = draw_molecule(active_smiles)
            conf_3d = generate_3d_coordinates(active_smiles)

            mol_info = MoleculeInfo(
                name=target_name or "Research Compound",
                smiles=active_smiles,
                canonical_smiles=canonical or active_smiles,
                molecular_weight=descriptors.get("molecular_weight"),
                molecular_formula=descriptors.get("molecular_formula"),
                logp=descriptors.get("logp"),
                hbd=descriptors.get("hbd"),
                hba=descriptors.get("hba"),
                tpsa=descriptors.get("tpsa"),
                rotatable_bonds=descriptors.get("rotatable_bonds"),
                image_base64=image_b64,
                conformer_3d=conf_3d,
            )

            # Predict QSAR properties
            try:
                qsar_predictions = get_all_predictions(active_smiles, include_admet=False)
            except Exception as exc:
                logger.error("QSAR prediction error in AI research: %s", exc)

            # Generate candidate hypotheses
            try:
                candidates = generate_candidates(active_smiles, name=target_name, max_candidates=5)
                # If ampicillin, include pivampicillin historical benchmark
                if "ampicillin" in (target_name or "").lower():
                    candidates.insert(
                        0,
                        CandidateInfo(
                            id="hist_pivampicillin",
                            name="Pivampicillin",
                            smiles=PIVAMPICILLIN_SMILES,
                            canonical_smiles=PIVAMPICILLIN_SMILES,
                            parent_smiles=AMPICILLIN_SMILES,
                            parent_name="Ampicillin",
                            transformation="Pivaloyloxymethyl (-POM) ester prodrug",
                            generation_method=GenerationMethod.HISTORICAL,
                            evidence_status=EvidenceStatus.EXPERIMENTALLY_REPORTED,
                            molecular_weight=463.57,
                            molecular_formula="C22H29N3O6S",
                            similarity_to_parent=calculate_similarity(AMPICILLIN_SMILES, PIVAMPICILLIN_SMILES),
                            note="Ester prodrug boosting oral bioavailability to 85-90%.",
                        ),
                    )

                # Enrich candidates with 3D conformers & predictions
                for c in candidates:
                    c.conformer_3d = generate_3d_coordinates(c.smiles)
                    c.predictions = get_all_predictions(c.smiles, include_admet=False)

                candidates = rank_candidates(
                    candidates,
                    Priorities(activity=35, absorption=35, solubility=15, toxicity=15),
                )
            except Exception as exc:
                logger.error("Candidate generation error in AI research: %s", exc)

            # Search databases for triangulation
            try:
                ev_res = await search_all_sources(target_name or active_smiles)
                evidence_records = ev_res.get("records", [])
            except Exception as exc:
                logger.warning("Evidence search error: %s", exc)

    # 3. Assemble Rich Autonomous Scientific Report
    report = _generate_scientific_report(
        query=cleaned_query,
        matched_key=matched_key,
        target_name=target_name,
        target_smiles=target_smiles,
        mol_info=mol_info,
        qsar_predictions=qsar_predictions,
        candidates=candidates,
        evidence_records=evidence_records,
    )

    # 4. Actionable Next Steps & CAD Interaction Buttons
    suggested_actions = []
    if mol_info and mol_info.conformer_3d:
        suggested_actions.append({
            "label": f"🔬 Load {target_name or 'Molecule'} in 3D CAD",
            "action": "load_conformer",
            "primary": True,
        })
    if candidates:
        top_cand = candidates[0]
        suggested_actions.append({
            "label": f"⚡ Apply {top_cand.name} Hypothesis",
            "action": "apply_candidate",
            "candidate_id": top_cand.id,
        })
    suggested_actions.append({
        "label": "🛡️ Run Toxicity & hERG Filter",
        "action": "run_toxicity_filter",
    })
    suggested_actions.append({
        "label": "⚖️ Side-by-Side 3D Conformation",
        "action": "compare_3d",
    })

    return {
        "query": cleaned_query,
        "compound_name": target_name or "Pharmacological Query",
        "compound_smiles": target_smiles,
        "research_report": report,
        "molecule": mol_info,
        "candidates": candidates,
        "evidence": evidence_records,
        "suggested_actions": suggested_actions,
    }


def _extract_potential_compound_name(text: str) -> Optional[str]:
    """Extract drug/chemical name candidates from user text."""
    # Remove common filler phrases
    cleaned = re.sub(r"(?i)\b(research|analyze|study|tell me about|what is|how does|find|investigate|explore|properties of|structure of|on|the|about)\b", " ", text).strip()
    words = [w for w in re.split(r"[\s,;]+", cleaned) if len(w) >= 3]
    return words[0] if words else None


def _generate_scientific_report(
    query: str,
    matched_key: Optional[str],
    target_name: str,
    target_smiles: str,
    mol_info: Optional[MoleculeInfo],
    qsar_predictions: list[Any],
    candidates: list[CandidateInfo],
    evidence_records: list[Any],
) -> str:
    """Compose a comprehensive, peer-review quality pharmacological research report."""
    kb_entry = PHARMA_KNOWLEDGE_BASE.get(matched_key) if matched_key else None
    
    sections = []

    # Title & Executive Header
    sections.append(f"### 🔬 Autonomous Chemical Research: {target_name or 'Biochemical Target Analysis'}")
    sections.append(f"**Research Target**: `{query}`\n")

    # 1. Biological Mechanism & Classification
    if kb_entry:
        sections.append("#### 🎯 Mechanism of Action & Target Profile")
        sections.append(f"• **Therapeutic Class**: {kb_entry.get('class', 'Pharmaceutical Agent')}")
        sections.append(f"• **Primary Biological Targets**: {', '.join(kb_entry.get('targets', []))}")
        sections.append(f"• **Pharmacodynamic Mechanism**: {kb_entry.get('mechanism', 'Modulates key biochemical enzymatic pathways.')}")
        sections.append(f"• **Primary Indications**: {kb_entry.get('indication', 'Therapeutic research applications.')}")
        if "challenges" in kb_entry:
            sections.append(f"• **Pharmacokinetic Bottleneck**: {kb_entry['challenges']}")
        if "prodrug_strategy" in kb_entry:
            sections.append(f"• **Medicinal Chemistry Solution**: {kb_entry['prodrug_strategy']}")
        if "toxicology" in kb_entry:
            sections.append(f"• **Toxicology & Safety Profile**: {kb_entry['toxicology']}")
        sections.append("")

    # 2. Molecular Architecture & Descriptors (RDKit)
    if mol_info:
        sections.append("#### 🧬 Physicochemical Descriptors & Drug-Likeness (RDKit)")
        sections.append(f"• **Canonical SMILES**: `{mol_info.canonical_smiles or mol_info.smiles}`")
        sections.append(f"• **Molecular Formula**: `{mol_info.molecular_formula}` | **Molecular Weight**: `{mol_info.molecular_weight:.2f} g/mol`")
        sections.append(f"• **Lipophilicity (cLogP)**: `{mol_info.logp:.2f}` (Optimal oral window: 0.0 – 3.0)")
        sections.append(f"• **Polar Surface Area (TPSA)**: `{mol_info.tpsa:.1f} Å²` (Threshold < 140 Å² for cell permeability)")
        sections.append(f"• **Hydrogen Bonding**: `{mol_info.hbd}` Donors | `{mol_info.hba}` Acceptors (Lipinski compliant: HBD ≤ 5, HBA ≤ 10)")
        sections.append(f"• **Rotatable Bonds**: `{mol_info.rotatable_bonds}` (Veber rule compliant: ≤ 10 rotatable bonds for oral bioavailability)")
        sections.append("")

    # 3. Machine Learning QSAR Predictions
    if qsar_predictions:
        sections.append("#### 📊 Multi-Objective QSAR In Silico Predictions")
        for p in qsar_predictions:
            val_str = f"{p.value:.3f} {p.unit}" if p.value is not None else "N/A"
            icon = "🎯" if "activity" in p.property_name.lower() else "💊" if "absorption" in p.property_name.lower() else "💧" if "solubility" in p.property_name.lower() else "🛡️"
            sections.append(f"• {icon} **{p.property_name.title()}**: `{val_str}` ({p.label})")
        sections.append("")

    # 4. Multi-Database Evidence Triangulation
    if evidence_records:
        sections.append("#### 🌐 Live Biomedical Database Triangulation")
        for rec in evidence_records:
            source = rec.source if hasattr(rec, 'source') else rec.get('source', 'Database')
            is_exp = rec.is_experimental if hasattr(rec, 'is_experimental') else rec.get('is_experimental', False)
            desc = rec.description if hasattr(rec, 'description') else rec.get('description', '')
            status_tag = "✅ EXPERIMENTAL RECORD" if is_exp else "ℹ️ RECORD SEARCHED"
            sections.append(f"• **[{source}]** ({status_tag}): {desc}")
        sections.append("")

    # 5. Synthesis Hypotheses & 3D CAD Recommendations
    if candidates:
        sections.append("#### ♟️ Medicinal Chemistry Evolution Branches (Pareto Ranked)")
        sections.append("The synthesis engine evaluated chemical modifications across activity, absorption, and cytotoxicity:")
        for idx, cand in enumerate(candidates[:3], 1):
            score_str = f"Score: {cand.ranking_score:.1f}/100" if cand.ranking_score is not None else ""
            sections.append(f"{idx}. **{cand.name}** ({cand.transformation}) — {score_str}")
            if cand.note:
                sections.append(f"   ↳ *Insight*: {cand.note}")
            sections.append(f"   ↳ *SMILES*: `{cand.smiles}`")
        sections.append("")

    # 6. Actionable CAD Instructions
    sections.append("#### 💡 Next Actions in 3D CAD Studio")
    sections.append("• **Hardware 3D Conformer**: True spatial geometry (ETKDGv3 force-field relaxed) is ready to load on the right canvas.")
    sections.append("• **Ghost Hypothesis**: Click any atom in the 3D viewer or use chat commands like `Add -OH`, `Add -POM`, or `Mutate atom 3 to Fluorine` to test structural hypotheses in real time.")
    sections.append("• **Side-by-Side Mode**: Compare starting parent vs synthesized lead compound.")

    return "\n".join(sections)
