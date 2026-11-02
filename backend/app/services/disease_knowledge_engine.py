import json
from pathlib import Path
from typing import Any, Optional
from pydantic import BaseModel, Field
from app.healthcare_paths import BACKEND_ROOT

DATASETS_DIR = BACKEND_ROOT / "app" / "data" / "datasets"

class DiseaseRecord(BaseModel):
    icd11_code: str
    icd11_title: str
    icd11_chapter: str
    icd11_uri: Optional[str] = None
    name: str
    synonyms: list[str] = Field(default_factory=list)
    specialty: str
    etiology_and_causes: str
    symptoms: dict[str, list[str]]
    diagnostic_workup: list[str] = Field(default_factory=list)
    related_procedures: list[dict[str, Any]] = Field(default_factory=list)
    trusted_sources: list[dict[str, Any]] = Field(default_factory=list)

class DiseaseKnowledgeEngine:
    _records: list[dict[str, Any]] = []

    @classmethod
    def _load(cls):
        if not cls._records:
            path = DATASETS_DIR / "who_icd11_diseases.json"
            if path.is_file():
                cls._records = json.loads(path.read_text(encoding="utf-8"))

    @classmethod
    def list_all(cls, specialty: Optional[str] = None) -> list[DiseaseRecord]:
        cls._load()
        results = []
        for r in cls._records:
            if specialty and r.get("specialty", "").lower() != specialty.lower():
                continue
            results.append(DiseaseRecord(**r))
        return results

    @classmethod
    def get_by_code(cls, icd11_code: str) -> Optional[DiseaseRecord]:
        cls._load()
        code_norm = icd11_code.strip().upper()
        for r in cls._records:
            if r.get("icd11_code", "").upper() == code_norm:
                return DiseaseRecord(**r)
        return None

    @classmethod
    def find_by_query(cls, query: str) -> Optional[DiseaseRecord]:
        cls._load()
        q = query.strip().lower()
        if not q:
            return None

        # 1. Exact or partial ICD-11 code match
        for r in cls._records:
            if r.get("icd11_code", "").lower() == q:
                return DiseaseRecord(**r)

        # 2. Exact or substring match in name
        for r in cls._records:
            name = r.get("name", "").lower()
            if q in name or name in q:
                return DiseaseRecord(**r)

        # 3. Match in synonyms
        for r in cls._records:
            for syn in r.get("synonyms", []):
                syn_low = syn.lower()
                if q in syn_low or syn_low in q:
                    return DiseaseRecord(**r)

        # 4. Keyword token match
        tokens = [t for t in q.split() if len(t) > 3]
        for t in tokens:
            for r in cls._records:
                if t in r.get("name", "").lower():
                    return DiseaseRecord(**r)
                if any(t in s.lower() for s in r.get("synonyms", [])):
                    return DiseaseRecord(**r)
                if t in r.get("specialty", "").lower():
                    return DiseaseRecord(**r)

        return None

    @classmethod
    def map_disease_to_procedures(cls, query_or_code: str) -> list[dict[str, Any]]:
        disease = cls.find_by_query(query_or_code)
        if not disease:
            return []
        return disease.related_procedures

    @classmethod
    def get_trusted_sources(cls, query_or_code: str) -> list[dict[str, Any]]:
        disease = cls.find_by_query(query_or_code)
        if not disease:
            return []
        return disease.trusted_sources

