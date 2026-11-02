import json
import sqlite3
import datetime
from pathlib import Path
from typing import Any, Optional
from pydantic import BaseModel, Field
from app.healthcare_paths import BACKEND_ROOT

DATASETS_DIR = BACKEND_ROOT / "app" / "data" / "datasets"
DB_PATH = BACKEND_ROOT / "app" / "data" / "hospital_directory.sqlite"

class PolicyClauseModel(BaseModel):
    clause_id: str
    policy_id: str
    policy_name: str
    uin: str
    insurer_name: str
    clause_category: str
    clause_title: str
    section_reference: Optional[str] = None
    page_number: int
    source_document: str
    source_document_url: Optional[str] = None
    clause_text: str
    numeric_limit: float = 0.0
    limit_unit: Optional[str] = None
    impact_summary: str
    is_verified: bool = False
    verified_by: Optional[str] = None
    verification_timestamp: Optional[str] = None

class ClauseVerificationRequest(BaseModel):
    clause_id: str
    verified_by: str = "Admin Reviewer"
    is_verified: bool = True
    verification_notes: Optional[str] = None

class InsuranceDocumentIntelligence:
    _clauses: list[dict[str, Any]] = []

    @classmethod
    def _init_db(cls):
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS policy_clauses (
                        clause_id TEXT PRIMARY KEY,
                        policy_id TEXT NOT NULL,
                        policy_name TEXT NOT NULL,
                        uin TEXT NOT NULL,
                        insurer_name TEXT NOT NULL,
                        clause_category TEXT NOT NULL,
                        clause_title TEXT NOT NULL,
                        section_reference TEXT,
                        page_number INTEGER NOT NULL,
                        source_document TEXT NOT NULL,
                        source_document_url TEXT,
                        clause_text TEXT NOT NULL,
                        numeric_limit REAL DEFAULT 0,
                        limit_unit TEXT,
                        impact_summary TEXT,
                        is_verified INTEGER DEFAULT 0,
                        verified_by TEXT,
                        verification_timestamp TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_clauses_policy ON policy_clauses(policy_id)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_clauses_category ON policy_clauses(clause_category)")
                conn.commit()
        except Exception as e:
            # Fallback to in-memory if sqlite table creation fails
            pass

    @classmethod
    def _load(cls):
        if not cls._clauses:
            cls._init_db()
            path = DATASETS_DIR / "extracted_policy_clauses.json"
            if path.is_file():
                cls._clauses = json.loads(path.read_text(encoding="utf-8"))

            # Sync to SQLite if empty
            try:
                with sqlite3.connect(DB_PATH) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM policy_clauses")
                    count = cursor.fetchone()[0]
                    if count == 0:
                        for c in cls._clauses:
                            cursor.execute("""
                                INSERT OR REPLACE INTO policy_clauses (
                                    clause_id, policy_id, policy_name, uin, insurer_name,
                                    clause_category, clause_title, section_reference, page_number,
                                    source_document, source_document_url, clause_text,
                                    numeric_limit, limit_unit, impact_summary, is_verified,
                                    verified_by, verification_timestamp
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (
                                c["clause_id"], c["policy_id"], c["policy_name"], c["uin"], c["insurer_name"],
                                c["clause_category"], c["clause_title"], c.get("section_reference"), c["page_number"],
                                c["source_document"], c.get("source_document_url"), c["clause_text"],
                                c.get("numeric_limit", 0), c.get("limit_unit"), c["impact_summary"],
                                1 if c.get("is_verified") else 0,
                                c.get("verified_by"), c.get("verification_timestamp")
                            ))
                        conn.commit()
            except Exception:
                pass

    @classmethod
    def list_clauses(
        cls,
        policy_id: Optional[str] = None,
        category: Optional[str] = None,
        verified_only: bool = False
    ) -> list[PolicyClauseModel]:
        cls._load()
        results = []
        for c in cls._clauses:
            if policy_id and policy_id != "all" and c.get("policy_id") != policy_id and c.get("policy_id") != "all-retail-policies":
                continue
            if category and category != "all" and c.get("clause_category") != category:
                continue
            if verified_only and not c.get("is_verified"):
                continue
            results.append(PolicyClauseModel(**c))
        return results

    @classmethod
    def get_clause_by_id(cls, clause_id: str) -> Optional[PolicyClauseModel]:
        cls._load()
        for c in cls._clauses:
            if c.get("clause_id") == clause_id:
                return PolicyClauseModel(**c)
        return None

    @classmethod
    def verify_clause(cls, req: ClauseVerificationRequest) -> Optional[PolicyClauseModel]:
        cls._load()
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        for c in cls._clauses:
            if c.get("clause_id") == req.clause_id:
                c["is_verified"] = req.is_verified
                c["verified_by"] = req.verified_by
                c["verification_timestamp"] = now_iso

                # Persist to SQLite
                try:
                    with sqlite3.connect(DB_PATH) as conn:
                        cursor = conn.cursor()
                        cursor.execute("""
                            UPDATE policy_clauses
                            SET is_verified = ?, verified_by = ?, verification_timestamp = ?
                            WHERE clause_id = ?
                        """, (1 if req.is_verified else 0, req.verified_by, now_iso, req.clause_id))
                        conn.commit()
                except Exception:
                    pass

                return PolicyClauseModel(**c)
        return None

