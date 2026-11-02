import json
import math
import re
from pathlib import Path
from typing import Any, Optional
from pydantic import BaseModel, Field
from app.healthcare_paths import BACKEND_ROOT

DATASETS_DIR = BACKEND_ROOT / "app" / "data" / "datasets"

class MedicalKnowledgeChunk(BaseModel):
    chunk_id: str
    disease_name: str
    icd11_code: str
    icd11_chapter: str
    icd11_uri: Optional[str] = None
    specialty: str
    content: str
    etiology: str
    symptoms_summary: str
    red_flags: list[str] = Field(default_factory=list)
    diagnostic_workup: list[str] = Field(default_factory=list)
    related_procedures: list[str] = Field(default_factory=list)
    trusted_sources: list[dict[str, Any]] = Field(default_factory=list)
    score: float = 0.0

class InsuranceKnowledgeChunk(BaseModel):
    chunk_id: str
    policy_id: str
    policy_name: str
    uin: str
    insurer_name: str
    clause_category: str
    clause_title: str
    section_reference: str
    page_number: int
    source_document: str
    source_document_url: Optional[str] = None
    verbatim_text: str
    impact_summary: str
    numeric_limit: Optional[float] = None
    limit_unit: Optional[str] = None
    is_verified: bool = False
    score: float = 0.0

class DualKnowledgeRAGService:
    """
    Production dual-knowledge-base RAG engine:
    1. Medical Knowledge Base (WHO ICD-11, MedlinePlus, PubMed)
    2. Insurance Knowledge Base (IRDAI Policies, Wordings, CIS, Clauses, Page Numbers)
    """
    _medical_chunks: list[MedicalKnowledgeChunk] = []
    _medical_vectors: list[dict[str, float]] = []

    _insurance_chunks: list[InsuranceKnowledgeChunk] = []
    _insurance_vectors: list[dict[str, float]] = []

    @classmethod
    def _tokenize_vectorize(cls, text: str) -> dict[str, float]:
        tokens = re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', text.lower())
        if not tokens:
            return {}
        counts: dict[str, float] = {}
        for t in tokens:
            counts[t] = counts.get(t, 0.0) + 1.0
        # L2 normalization
        mag = math.sqrt(sum(v * v for v in counts.values()))
        if mag == 0:
            return counts
        return {k: v / mag for k, v in counts.items()}

    @classmethod
    def _cosine_sim(cls, v1: dict[str, float], v2: dict[str, float]) -> float:
        score = 0.0
        for k, v in v1.items():
            if k in v2:
                score += v * v2[k]
        return score

    @classmethod
    def _init_medical_kb(cls) -> None:
        if cls._medical_chunks:
            return
        path = DATASETS_DIR / "who_icd11_diseases.json"
        if not path.is_file():
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        chunks = []
        vectors = []
        for d in data:
            icd = d.get("icd11_code", "")
            name = d.get("name", "")
            spec = d.get("specialty", "")
            causes = d.get("etiology_and_causes", "")
            symptoms = d.get("symptoms", {})
            cardinal = ", ".join(symptoms.get("cardinal", []))
            red_flags = symptoms.get("emergency_red_flags", [])
            workup = d.get("diagnostic_workup", [])
            procs = [p.get("name", "") for p in d.get("related_procedures", [])]
            sources = d.get("trusted_sources", [])

            # Chunk content text for embedding
            chunk_text = f"{name} {icd} {spec} {causes} {cardinal} {' '.join(red_flags)} {' '.join(workup)} {' '.join(procs)}"
            
            chunk = MedicalKnowledgeChunk(
                chunk_id=f"med-{icd.lower()}",
                disease_name=name,
                icd11_code=icd,
                icd11_chapter=d.get("icd11_chapter", ""),
                icd11_uri=d.get("icd11_uri"),
                specialty=spec,
                content=chunk_text,
                etiology=causes,
                symptoms_summary=cardinal,
                red_flags=red_flags,
                diagnostic_workup=workup,
                related_procedures=procs,
                trusted_sources=sources
            )
            chunks.append(chunk)
            vectors.append(cls._tokenize_vectorize(chunk_text))

        cls._medical_chunks = chunks
        cls._medical_vectors = vectors

    @classmethod
    def _init_insurance_kb(cls) -> None:
        if cls._insurance_chunks:
            return
        path = DATASETS_DIR / "extracted_policy_clauses.json"
        if not path.is_file():
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        chunks = []
        vectors = []
        for c in data:
            c_text = (
                f"{c.get('policy_name', '')} {c.get('uin', '')} {c.get('clause_title', '')} "
                f"{c.get('clause_category', '')} {c.get('clause_text', '')} {c.get('impact_summary', '')}"
            )
            chunk = InsuranceKnowledgeChunk(
                chunk_id=c.get("clause_id", ""),
                policy_id=c.get("policy_id", ""),
                policy_name=c.get("policy_name", ""),
                uin=c.get("uin", ""),
                insurer_name=c.get("insurer_name", ""),
                clause_category=c.get("clause_category", ""),
                clause_title=c.get("clause_title", ""),
                section_reference=c.get("section_reference", ""),
                page_number=c.get("page_number", 1),
                source_document=c.get("source_document", ""),
                source_document_url=c.get("source_document_url"),
                verbatim_text=c.get("clause_text", ""),
                impact_summary=c.get("impact_summary", ""),
                numeric_limit=c.get("numeric_limit"),
                limit_unit=c.get("limit_unit"),
                is_verified=c.get("is_verified", False)
            )
            chunks.append(chunk)
            vectors.append(cls._tokenize_vectorize(c_text))

        cls._insurance_chunks = chunks
        cls._insurance_vectors = vectors

    @classmethod
    def search_medical_knowledge(cls, query: str, top_k: int = 3) -> list[MedicalKnowledgeChunk]:
        """Retrieve matching WHO ICD-11 medical chunks with PubMed citations."""
        cls._init_medical_kb()
        q_vec = cls._tokenize_vectorize(query)
        scored = []
        for chunk, vec in zip(cls._medical_chunks, cls._medical_vectors):
            score = cls._cosine_sim(q_vec, vec)
            # Query keyword boost
            q_lower = query.lower()
            if chunk.icd11_code.lower() in q_lower:
                score += 0.5
            if chunk.disease_name.lower() in q_lower:
                score += 0.4
            if chunk.specialty.lower() in q_lower:
                score += 0.2
            if any(p.lower() in q_lower for p in chunk.related_procedures):
                score += 0.3
            scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for s, c in scored[:top_k]:
            c_copy = c.model_copy()
            c_copy.score = round(s, 3)
            results.append(c_copy)
        return results

    @classmethod
    def search_insurance_knowledge(
        cls,
        query: str,
        policy_id: Optional[str] = None,
        category: Optional[str] = None,
        top_k: int = 4
    ) -> list[InsuranceKnowledgeChunk]:
        """Retrieve verbatim IRDAI policy clauses with exact page numbers."""
        cls._init_insurance_kb()
        q_vec = cls._tokenize_vectorize(query)
        scored = []
        for chunk, vec in zip(cls._insurance_chunks, cls._insurance_vectors):
            if policy_id and policy_id != "all" and chunk.policy_id.lower() != policy_id.lower():
                continue
            if category and category != "all" and chunk.clause_category.lower() != category.lower():
                continue

            score = cls._cosine_sim(q_vec, vec)
            q_lower = query.lower()
            if chunk.policy_name.lower() in q_lower or chunk.uin.lower() in q_lower:
                score += 0.3
            if chunk.clause_title.lower() in q_lower:
                score += 0.3
            if "waiting period" in q_lower and chunk.clause_category == "waiting_period":
                score += 0.35
            if ("room rent" in q_lower or "icu" in q_lower) and chunk.clause_category == "room_rent":
                score += 0.35
            if "copay" in q_lower and chunk.clause_category == "copay":
                score += 0.35

            scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for s, c in scored[:top_k]:
            c_copy = c.model_copy()
            c_copy.score = round(s, 3)
            results.append(c_copy)
        return results

