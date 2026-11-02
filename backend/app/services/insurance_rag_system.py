import math
import re
from typing import Any, Optional
from pydantic import BaseModel, Field
from app.services.insurance_document_intelligence import InsuranceDocumentIntelligence, PolicyClauseModel

class RetrievedClauseChunk(BaseModel):
    clause_id: str
    policy_id: str
    policy_name: str
    uin: str
    insurer_name: str
    clause_title: str
    section_reference: Optional[str] = None
    page_number: int
    source_document: str
    source_document_url: Optional[str] = None
    verbatim_excerpt: str
    impact_summary: str
    relevance_score: float
    relevance_reason: str
    citation: str

class InsuranceRAGSystem:
    """
    RAG engine for verified Indian health insurance policies.
    Provides semantic & lexical chunk retrieval with exact page citations.
    """

    @classmethod
    def _compute_bow_embedding(cls, text: str) -> dict[str, float]:
        """Compute normalized term-frequency vector."""
        tokens = re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', text.lower())
        if not tokens:
            return {}
        counts: dict[str, float] = {}
        for t in tokens:
            counts[t] = counts.get(t, 0.0) + 1.0

        # L2 normalize
        magnitude = math.sqrt(sum(v * v for v in counts.values()))
        if magnitude == 0:
            return counts
        return {k: v / magnitude for k, v in counts.items()}

    @classmethod
    def _cosine_similarity(cls, vec1: dict[str, float], vec2: dict[str, float]) -> float:
        score = 0.0
        for k, v in vec1.items():
            if k in vec2:
                score += v * vec2[k]
        return score

    @classmethod
    def retrieve_clauses(
        cls,
        query: str,
        policy_id: Optional[str] = None,
        disease_name: Optional[str] = None,
        procedure_name: Optional[str] = None,
        top_k: int = 4
    ) -> list[RetrievedClauseChunk]:
        """
        Retrieve the most relevant verified policy clauses matching the query,
        disease, procedure, and selected policy.
        """
        all_clauses = InsuranceDocumentIntelligence.list_clauses()
        if not all_clauses:
            return []

        search_query = f"{query} {disease_name or ''} {procedure_name or ''}".strip().lower()
        query_vec = cls._compute_bow_embedding(search_query)

        scored_results: list[tuple[float, PolicyClauseModel, str]] = []

        for c in all_clauses:
            # Policy scoping: if user specifically asked for a policy
            if policy_id and policy_id != "all":
                if c.policy_id != policy_id and c.policy_id != "all-retail-policies":
                    continue

            # Build chunk corpus text
            chunk_text = f"{c.policy_name} {c.clause_title} {c.section_reference or ''} {c.clause_category} {c.clause_text} {c.impact_summary}"
            chunk_vec = cls._compute_bow_embedding(chunk_text)

            sim = cls._cosine_similarity(query_vec, chunk_vec)

            # Boost exact keyword matches
            boost = 0.0
            reasons = []

            # 1. Waiting period boost
            if any(term in search_query for term in ["waiting", "ped", "pre-existing", "diabetes", "hypertension", "prior"]):
                if c.clause_category == "waiting_period":
                    boost += 0.35
                    reasons.append("Relevant to waiting period / pre-existing conditions")

            # 2. Room rent boost
            if any(term in search_query for term in ["room", "rent", "deluxe", "icu", "capping", "proportionate"]):
                if c.clause_category == "room_rent":
                    boost += 0.40
                    reasons.append("Governs room category limits and proportionate deductions")

            # 3. Cataract / specific illness boost
            if any(term in search_query for term in ["cataract", "lens", "eye"]):
                if "cataract" in c.clause_title.lower() or "cataract" in c.clause_text.lower():
                    boost += 0.50
                    reasons.append("Specific sublimit applies to cataract procedures")

            # 4. Angioplasty / CAD boost
            if any(term in search_query for term in ["angioplasty", "stent", "heart", "cardio", "coronary"]):
                if c.clause_category in ["waiting_period", "room_rent", "exclusion"]:
                    boost += 0.25
                    reasons.append("Applies to inpatient surgical and cardiac interventions")

            # 5. Non-payable exclusions boost
            if any(term in search_query for term in ["consumables", "exclusion", "not covered", "deduction", "out-of-pocket"]):
                if c.clause_category == "exclusion":
                    boost += 0.35
                    reasons.append("Official IRDAI non-payable consumables exclusion")

            final_score = min(0.99, sim + boost)
            if final_score > 0.15:
                reason_str = "; ".join(reasons) if reasons else "Semantic and keyword match with policy wordings"
                scored_results.append((final_score, c, reason_str))

        # Sort descending by relevance score
        scored_results.sort(key=lambda x: x[0], reverse=True)

        results: list[RetrievedClauseChunk] = []
        for score, c, reason in scored_results[:top_k]:
            citation = f"{c.policy_name} ({c.uin}), {c.section_reference or c.clause_title}, Page {c.page_number}"
            results.append(RetrievedClauseChunk(
                clause_id=c.clause_id,
                policy_id=c.policy_id,
                policy_name=c.policy_name,
                uin=c.uin,
                insurer_name=c.insurer_name,
                clause_title=c.clause_title,
                section_reference=c.section_reference,
                page_number=c.page_number,
                source_document=c.source_document,
                source_document_url=c.source_document_url,
                verbatim_excerpt=c.clause_text,
                impact_summary=c.impact_summary,
                relevance_score=round(score, 3),
                relevance_reason=reason,
                citation=citation
            ))

        return results

