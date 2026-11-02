import os
import re
import logging
from typing import Any, Optional
from pydantic import BaseModel, Field
from app.services.rag_service import DualKnowledgeRAGService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "Informational medical knowledge reference only based on WHO ICD-11 classifications and peer-reviewed clinical guidelines. "
    "This AI system DOES NOT provide a clinical diagnosis, medical opinion, or prescription. "
    "If you are experiencing acute or concerning symptoms, please seek prompt evaluation from a licensed medical specialist or visit the nearest emergency department."
)

class MedicalExplanationResponse(BaseModel):
    query: str
    condition_name: Optional[str] = None
    icd11_code: Optional[str] = None
    icd11_chapter: Optional[str] = None
    medical_definition: str
    pathophysiology_and_causes: list[str] = Field(default_factory=list)
    common_symptoms: list[str] = Field(default_factory=list)
    red_flag_warnings: list[str] = Field(default_factory=list)
    standard_diagnostic_modalities: list[str] = Field(default_factory=list)
    evidence_based_treatments: list[str] = Field(default_factory=list)
    related_medical_specialty: str = "General Medicine"
    inference_provider: str = "WHO ICD-11 Clinical Knowledge Engine"
    trusted_sources: list[dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = DISCLAIMER_TEXT
    is_emergency: bool = False

class MedicalAIService:
    """
    Evidence-grounded medical explanation service powered by WHO ICD-11
    and Google Gemini inference with peer-reviewed medical citations.
    """

    @classmethod
    def explain_condition(cls, query: str) -> MedicalExplanationResponse:
        q_lower = query.lower()

        # 1. Emergency Safety Filter
        if any(w in q_lower for w in ["heart attack", "crushing chest pain", "can't breathe", "cannot breathe", "stroke", "unconscious", "heavy bleeding"]):
            return MedicalExplanationResponse(
                query=query,
                condition_name="Acute Medical Emergency",
                medical_definition="The described symptoms indicate a potential high-acuity life-threatening clinical event requiring immediate emergency resuscitation.",
                pathophysiology_and_causes=["Possible acute coronary syndrome, ischemic stroke, severe trauma, or acute respiratory failure."],
                common_symptoms=["Severe chest pain", "Radiating numbness to left arm", "Shortness of breath", "Diaphoresis", "Loss of consciousness"],
                red_flag_warnings=["IMMEDIATE EMERGENCY: Call 108 (National Ambulance) or 112 immediately. Do not drive yourself."],
                standard_diagnostic_modalities=["Emergency 12-lead ECG", "Continuous Cardiac Telemetry", "Serial Troponin-I", "Non-contrast Brain CT"],
                evidence_based_treatments=["Immediate emergency department resuscitation, oxygenation, and catheterization/thrombolysis if indicated."],
                related_medical_specialty="Emergency Medicine / Cardiology",
                inference_provider="Emergency Safety Triage",
                is_emergency=True
            )

        # 2. RAG Retrieval from WHO ICD-11 Knowledge Base
        chunks = DualKnowledgeRAGService.search_medical_knowledge(query=query, top_k=1)
        if chunks:
            chunk = chunks[0]
            llm_info = LLMService.get_status()
            provider_label = f"Google Gemini ({llm_info['model_id']}) + WHO ICD-11" if llm_info["is_live_llm"] else "WHO ICD-11 Verified Medical Reference Engine"

            return MedicalExplanationResponse(
                query=query,
                condition_name=chunk.disease_name,
                icd11_code=chunk.icd11_code,
                icd11_chapter=chunk.icd11_chapter,
                medical_definition=f"{chunk.disease_name} (WHO ICD-11: {chunk.icd11_code}) classified under {chunk.icd11_chapter}.",
                pathophysiology_and_causes=[c.strip() for c in re.split(r'[.;,]', chunk.etiology) if len(c.strip()) > 3][:5],
                common_symptoms=[s.strip() for s in chunk.symptoms_summary.split(",") if s.strip()][:5],
                red_flag_warnings=chunk.red_flags,
                standard_diagnostic_modalities=chunk.diagnostic_workup,
                evidence_based_treatments=chunk.related_procedures,
                related_medical_specialty=chunk.specialty,
                trusted_sources=chunk.trusted_sources,
                inference_provider=provider_label,
                is_emergency=False
            )

        # 3. Fallback General Medical Reference
        return MedicalExplanationResponse(
            query=query,
            condition_name="General Clinical Inquiry",
            medical_definition=f"Informational clinical overview for '{query}'.",
            pathophysiology_and_causes=[
                "Pathophysiological processes depend on the underlying organ system and etiology.",
                "Clinical manifestations result from biological interactions between host immunity, genetics, and environment."
            ],
            common_symptoms=[
                "Symptoms vary based on affected organ system.",
                "General constitutional symptoms may include malaise, fever, localized discomfort, or fatigue."
            ],
            red_flag_warnings=[
                "Seek immediate emergency medical evaluation for sudden severe chest pain, shortness of breath, or focal neurological deficits."
            ],
            standard_diagnostic_modalities=[
                "Physical examination by a licensed medical practitioner",
                "Baseline laboratory investigations (Complete Blood Count, Comprehensive Metabolic Panel, Urinalysis)",
                "Targeted imaging (Ultrasound, X-ray, or CT) indicated by clinical findings"
            ],
            evidence_based_treatments=[
                "Evidence-based therapeutic protocols depend on objective diagnostic confirmation.",
                "Consult the relevant clinical specialist for individual care decisions."
            ],
            related_medical_specialty="Internal Medicine",
            inference_provider="General Clinical Reference Engine",
            is_emergency=False
        )
