import json
from pathlib import Path
from typing import Any, Optional
from app.healthcare_paths import BACKEND_ROOT
from app.models.disease import Disease, ProcedureItem, DiseaseDetailResponse
from app.services.hospital_service import HospitalService

DATASETS_DIR = BACKEND_ROOT / "app" / "data" / "datasets"

class DiseaseService:
    _diseases: list[dict[str, Any]] = []

    @classmethod
    def _load_data(cls):
        if not cls._diseases:
            path = DATASETS_DIR / "diseases_procedures_data.json"
            if path.is_file():
                cls._diseases = json.loads(path.read_text(encoding="utf-8"))

    @classmethod
    def list_diseases(
        cls,
        search: Optional[str] = None,
        specialty: Optional[str] = None
    ) -> list[Disease]:
        cls._load_data()
        results = []
        for item in cls._diseases:
            if specialty and item.get("specialty", "").lower() != specialty.lower():
                continue
            if search:
                s = search.lower()
                name_match = s in item.get("name", "").lower()
                spec_match = s in item.get("specialty", "").lower()
                desc_match = s in item.get("description", "").lower()
                proc_match = any(s in p.get("name", "").lower() for p in item.get("procedures", []))
                if not (name_match or spec_match or desc_match or proc_match):
                    continue
            results.append(Disease(**item))
        return results

    @classmethod
    def get_disease_by_id(cls, disease_id: str) -> Optional[DiseaseDetailResponse]:
        cls._load_data()
        for item in cls._diseases:
            if item.get("disease_id") == disease_id:
                disease = Disease(**item)
                # Fetch recommended hospitals
                hosp_ids = set()
                for p in disease.procedures:
                    hosp_ids.update(p.recommended_hospital_ids)

                recommended = []
                for hid in hosp_ids:
                    hosp = HospitalService.get_hospital_by_id(hid)
                    if hosp:
                        recommended.append(hosp.model_dump())

                return DiseaseDetailResponse(
                    disease=disease,
                    procedures=disease.procedures,
                    recommended_hospitals=recommended
                )
        return None

    @classmethod
    def list_procedures(
        cls,
        specialty: Optional[str] = None,
        disease_id: Optional[str] = None
    ) -> list[ProcedureItem]:
        cls._load_data()
        procs = []
        for item in cls._diseases:
            if disease_id and item.get("disease_id") != disease_id:
                continue
            if specialty and item.get("specialty", "").lower() != specialty.lower():
                continue
            for p in item.get("procedures", []):
                procs.append(ProcedureItem(**p))
        return procs

    @classmethod
    def get_procedure_by_id(cls, procedure_id: str) -> Optional[ProcedureItem]:
        cls._load_data()
        for item in cls._diseases:
            for p in item.get("procedures", []):
                if p.get("procedure_id") == procedure_id:
                    return ProcedureItem(**p)
        return None
