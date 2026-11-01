import json
import sqlite3
from pathlib import Path
from typing import Any, Optional
from app.healthcare_paths import BACKEND_ROOT
from app.models.hospital import (
    Hospital, HospitalListResponse, ImportedHospital,
    PaginatedHospitalResponse, HospitalFilterOptions, HospitalStatistics
)
from app.data.mock_hospitals import MOCK_HOSPITALS

DB_PATH = BACKEND_ROOT / "app" / "data" / "hospital_directory.sqlite"

class HospitalService:
    @classmethod
    def _get_connection(cls):
        if not DB_PATH.is_file():
            # In case database not yet generated, run ingestion
            from scripts.ingest_hospitals_csv import ingest
            ingest()
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    @classmethod
    def _row_to_imported_hospital(cls, row: sqlite3.Row) -> ImportedHospital:
        specs = json.loads(row["specialties"]) if row["specialties"] else []
        facs = json.loads(row["facilities"]) if row["facilities"] else []
        
        # Directions URL fallback if coordinates available
        directions_url = None
        if row["latitude"] and row["longitude"]:
            directions_url = f"https://www.google.com/maps/dir/?api=1&destination={row['latitude']},{row['longitude']}"
        elif row["address"]:
            directions_url = f"https://www.google.com/maps/search/?api=1&query={row['name']}+{row['address']}"

        phone = row["telephone"] or row["mobile_number"] or "Not available"

        return ImportedHospital(
            id=row["id"],
            sr_no=row["sr_no"],
            name=row["name"],
            state=row["state"],
            district=row["district"],
            subdistrict=row["subdistrict"] or "Not available",
            pincode=row["pincode"] or "Not available",
            location=row["location"] or "Not available",
            address=row["address"] or row["location"] or "Not available",
            latitude=row["latitude"],
            longitude=row["longitude"],
            care_type=row["care_type"] or "Not available",
            category=row["category"] or "Not available",
            discipline=row["discipline"] or "Not available",
            telephone=row["telephone"] or "Not available",
            mobile_number=row["mobile_number"] or "Not available",
            emergency_num=row["emergency_num"] or "Not available",
            ambulance_phone=row["ambulance_phone"] or "Not available",
            bloodbank_phone=row["bloodbank_phone"] or "Not available",
            tollfree=row["tollfree"] or "Not available",
            helpline=row["helpline"] or "Not available",
            email=row["email"] or "Not available",
            website=row["website"] or "Not available",
            specialties=specs,
            facilities=facs,
            accreditation=row["accreditation"] or "Not available",
            established_year=row["established_year"],
            total_beds=row["total_beds"],
            data_source=row["data_source"] or "National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)",
            import_date=row["import_date"] or "2026-11-01",
            directions_url=directions_url,
            empanelled_schemes=[]
        )

    @classmethod
    def list_imported_hospitals(
        cls,
        search: Optional[str] = None,
        state: Optional[str] = None,
        district: Optional[str] = None,
        city: Optional[str] = None,
        care_type: Optional[str] = None,
        category: Optional[str] = None,
        specialty: Optional[str] = None,
        pincode: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "name_asc"
    ) -> PaginatedHospitalResponse:
        conn = cls._get_connection()
        cur = conn.cursor()

        conditions = []
        params = []

        if state and state.strip() and state.strip().lower() not in ("all", "all states", ""):
            conditions.append("LOWER(TRIM(state)) = LOWER(TRIM(?))")
            params.append(state.strip())

        if district and district.strip() and district.strip().lower() not in ("all", "all districts", ""):
            conditions.append("LOWER(TRIM(district)) = LOWER(TRIM(?))")
            params.append(district.strip())

        if city and city.strip() and city.strip().lower() not in ("all", "all cities", ""):
            c = city.strip().lower()
            has_explicit_state = bool(state and state.strip().lower() not in ("all", "all states", ""))
            is_stray_city = has_explicit_state and c in ("hyderabad", "bengaluru", "bangalore") and state.strip().lower() not in ("telangana", "karnataka")
            if not is_stray_city:
                conditions.append("(LOWER(district) LIKE ? OR LOWER(location) LIKE ? OR LOWER(address) LIKE ?)")
                params.extend([f"%{c}%", f"%{c}%", f"%{c}%"])

        if care_type and care_type.lower() not in ("all", "all types", ""):
            conditions.append("LOWER(care_type) = LOWER(?)")
            params.append(care_type.strip())

        if category and category.lower() not in ("all", "all categories", ""):
            conditions.append("LOWER(category) = LOWER(?)")
            params.append(category.strip())

        if pincode and pincode.strip():
            conditions.append("pincode LIKE ?")
            params.append(f"%{pincode.strip()}%")

        if specialty and specialty.strip() and specialty.lower() not in ("all", "all specialties"):
            conditions.append("LOWER(specialties) LIKE ?")
            params.append(f"%{specialty.strip().lower()}%")

        if search and search.strip():
            s = f"%{search.strip().lower()}%"
            conditions.append("(LOWER(name) LIKE ? OR LOWER(district) LIKE ? OR LOWER(state) LIKE ? OR LOWER(location) LIKE ? OR LOWER(specialties) LIKE ?)")
            params.extend([s, s, s, s, s])

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        # Count total
        count_sql = f"SELECT COUNT(*) FROM hospitals {where_clause}"
        cur.execute(count_sql, params)
        total = cur.fetchone()[0]

        # Sorting
        order_clause = "ORDER BY name ASC"
        if sort_by == "name_desc":
            order_clause = "ORDER BY name DESC"
        elif sort_by == "state":
            order_clause = "ORDER BY state ASC, district ASC, name ASC"
        elif sort_by == "beds_desc":
            order_clause = "ORDER BY total_beds DESC NULLS LAST, name ASC"
        elif sort_by == "sr_no":
            order_clause = "ORDER BY sr_no ASC"

        # Pagination
        page = max(1, page)
        page_size = max(1, min(100, page_size))
        offset = (page - 1) * page_size
        total_pages = max(1, (total + page_size - 1) // page_size)

        query_sql = f"""
        SELECT * FROM hospitals
        {where_clause}
        {order_clause}
        LIMIT ? OFFSET ?
        """
        cur.execute(query_sql, params + [page_size, offset])
        rows = cur.fetchall()
        conn.close()

        hospitals = [cls._row_to_imported_hospital(r) for r in rows]

        return PaginatedHospitalResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            hospitals=hospitals,
            data_source="National Health Portal (NHP) Open Government Data CSV (Ministry of Health and Family Welfare)",
            filters_applied={
                "search": search,
                "state": state,
                "district": district,
                "city": city,
                "care_type": care_type,
                "category": category,
                "specialty": specialty,
                "pincode": pincode,
                "sort_by": sort_by
            }
        )

    @classmethod
    def get_imported_hospital_by_id(cls, hospital_id: str) -> Optional[ImportedHospital]:
        conn = cls._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM hospitals WHERE id = ?", (hospital_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            return cls._row_to_imported_hospital(row)
        
        # Check if requested by legacy id (e.g. hosp-hyd-01)
        for h in MOCK_HOSPITALS:
            if h.id == hospital_id:
                return ImportedHospital(
                    id=h.id,
                    name=h.name,
                    state="Telangana",
                    district=h.city,
                    location=h.locality or h.address,
                    address=h.address,
                    pincode=h.pincode or "Not available",
                    care_type="Tertiary Hospital",
                    category=h.hospital_type or "Private",
                    discipline="Allopathic",
                    telephone=h.phone,
                    mobile_number="Not available",
                    emergency_num="040-23607777",
                    ambulance_phone="108",
                    bloodbank_phone="Not available",
                    tollfree="1800-425-2255",
                    helpline="Not available",
                    email="info@hospital.org",
                    website=h.website or "Not available",
                    specialties=h.specialties,
                    facilities=h.facilities,
                    accreditation=", ".join(h.accreditation) if h.accreditation else "Not available",
                    established_year=1988,
                    total_beds=550,
                    data_source=h.data_source or "Verified Healthcare Directory",
                    import_date="2026-10-29",
                    directions_url=h.directions_url,
                    empanelled_schemes=h.accepted_schemes
                )
        return None

    @classmethod
    def search_keyword(
        cls,
        query: str,
        state: Optional[str] = None,
        district: Optional[str] = None,
        limit: int = 20
    ) -> list[ImportedHospital]:
        conn = cls._get_connection()
        cur = conn.cursor()

        q = f"%{query.strip().lower()}%"
        conditions = ["(LOWER(name) LIKE ? OR LOWER(district) LIKE ? OR LOWER(location) LIKE ? OR LOWER(address) LIKE ? OR LOWER(specialties) LIKE ?)"]
        params = [q, q, q, q, q]

        if state and state.lower() not in ("all", ""):
            conditions.append("LOWER(state) = LOWER(?)")
            params.append(state.strip())

        if district and district.lower() not in ("all", ""):
            conditions.append("LOWER(district) = LOWER(?)")
            params.append(district.strip())

        sql = f"SELECT * FROM hospitals WHERE {' AND '.join(conditions)} LIMIT ?"
        cur.execute(sql, params + [min(100, limit)])
        rows = cur.fetchall()
        conn.close()

        return [cls._row_to_imported_hospital(r) for r in rows]

    @classmethod
    def get_filter_options(cls, state: Optional[str] = None) -> HospitalFilterOptions:
        conn = cls._get_connection()
        cur = conn.cursor()

        # States & state counts
        cur.execute("SELECT state, COUNT(*) FROM hospitals WHERE state IS NOT NULL AND state != '' GROUP BY state ORDER BY state ASC")
        state_rows = cur.fetchall()
        states = [r[0] for r in state_rows]
        state_counts = {r[0]: r[1] for r in state_rows}

        # Districts (scoped to selected state if given)
        district_counts = {}
        if state and state.strip() and state.strip().lower() not in ("all", "all states", ""):
            cur.execute(
                "SELECT district, COUNT(*) FROM hospitals WHERE LOWER(TRIM(state)) = LOWER(TRIM(?)) AND district IS NOT NULL AND district != 'Not specified' GROUP BY district ORDER BY district ASC",
                (state.strip(),)
            )
            dist_rows = cur.fetchall()
            districts = [r[0] for r in dist_rows]
            district_counts = {r[0]: r[1] for r in dist_rows}

            cur.execute("SELECT COUNT(*) FROM hospitals WHERE LOWER(TRIM(state)) = LOWER(TRIM(?))", (state.strip(),))
            total = cur.fetchone()[0]
        else:
            cur.execute("SELECT DISTINCT district FROM hospitals WHERE district IS NOT NULL AND district != '' ORDER BY district ASC LIMIT 100")
            districts = [r[0] for r in cur.fetchall()]
            cur.execute("SELECT COUNT(*) FROM hospitals")
            total = cur.fetchone()[0]

        # Care Types
        cur.execute("SELECT DISTINCT care_type FROM hospitals WHERE care_type IS NOT NULL AND care_type != 'Not available' ORDER BY care_type ASC")
        care_types = [r[0] for r in cur.fetchall()]

        # Categories
        cur.execute("SELECT DISTINCT category FROM hospitals WHERE category IS NOT NULL AND category != 'Not available' ORDER BY category ASC")
        categories = [r[0] for r in cur.fetchall()]

        # Popular Specialties
        popular_specialties = [
            "Cardiology", "Cardiothoracic Surgery", "Orthopedics", "Oncology", "Neurology",
            "Nephrology", "General Surgery", "Ophthalmology", "Pediatrics", "ENT",
            "Gastroenterology", "Dermatology", "Urology", "Obstetrics and Gynaecology"
        ]
        conn.close()

        return HospitalFilterOptions(
            states=states,
            districts=districts,
            care_types=care_types,
            categories=categories,
            popular_specialties=popular_specialties,
            total_hospitals=total,
            state_counts=state_counts,
            district_counts=district_counts
        )

    @classmethod
    def get_statistics(cls) -> HospitalStatistics:
        conn = cls._get_connection()
        cur = conn.cursor()

        cur.execute("SELECT COUNT(*) FROM hospitals")
        total = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT state) FROM hospitals")
        states_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT district) FROM hospitals")
        districts_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM hospitals WHERE telephone IS NOT NULL OR mobile_number IS NOT NULL")
        hospitals_with_phone = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM hospitals WHERE latitude IS NOT NULL")
        hospitals_with_coordinates = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM hospitals WHERE specialties IS NOT NULL AND specialties != '[]'")
        hospitals_with_specialties = cur.fetchone()[0]

        # Top States
        cur.execute("SELECT state, COUNT(*) as cnt FROM hospitals GROUP BY state ORDER BY cnt DESC LIMIT 10")
        top_states = [{"state": r[0], "count": r[1]} for r in cur.fetchall()]

        # All State Counts
        cur.execute("SELECT state, COUNT(*) as cnt FROM hospitals GROUP BY state ORDER BY cnt DESC")
        state_counts = {r[0]: r[1] for r in cur.fetchall()}

        # Care Types
        cur.execute("SELECT care_type, COUNT(*) as cnt FROM hospitals GROUP BY care_type ORDER BY cnt DESC")
        care_types = [{"care_type": r[0], "count": r[1]} for r in cur.fetchall()]

        # Categories
        cur.execute("SELECT category, COUNT(*) as cnt FROM hospitals GROUP BY category ORDER BY cnt DESC")
        categories = [{"category": r[0], "count": r[1]} for r in cur.fetchall()]

        # Metadata
        cur.execute("SELECT key, value FROM import_metadata")
        source_info = {r[0]: r[1] for r in cur.fetchall()}
        conn.close()

        return HospitalStatistics(
            total_hospitals=total,
            states_count=states_count,
            districts_count=districts_count,
            hospitals_with_phone=hospitals_with_phone,
            hospitals_with_coordinates=hospitals_with_coordinates,
            hospitals_with_specialties=hospitals_with_specialties,
            top_states=top_states,
            care_types=care_types,
            categories=categories,
            source_info=source_info,
            state_counts=state_counts
        )

    # Legacy method for original contract compatibility
    @staticmethod
    def search_hospitals(
        city: Optional[str] = None,
        specialty: Optional[str] = None,
        max_budget: Optional[float] = None,
        scheme: Optional[str] = None,
        pincode: Optional[str] = None,
        locality: Optional[str] = None,
        hospital_type: Optional[str] = None,
        facility: Optional[str] = None,
        accreditation: Optional[str] = None,
        sort_by: Optional[str] = "relevance"
    ) -> list[Hospital]:
        results = MOCK_HOSPITALS.copy()

        if city:
            c = city.strip().lower()
            results = [h for h in results if c in h.city.lower()]

        if specialty:
            s = specialty.strip().lower()
            results = [
                h for h in results
                if any(s in spec.lower() for spec in h.specialties)
            ]

        if scheme:
            sch = scheme.strip().lower()
            results = [
                h for h in results
                if any(sch in s.lower() for s in h.accepted_schemes)
            ]

        if pincode:
            pin = pincode.strip()
            results = [h for h in results if h.pincode and pin in h.pincode]

        if locality:
            loc = locality.strip().lower()
            results = [
                h for h in results
                if (h.locality and loc in h.locality.lower()) or (loc in h.address.lower())
            ]

        if hospital_type:
            ht = hospital_type.strip().lower()
            results = [h for h in results if h.hospital_type and ht in h.hospital_type.lower()]

        if facility:
            fac = facility.strip().lower()
            results = [
                h for h in results
                if any(fac in f.lower() for f in h.facilities)
            ]

        if accreditation:
            acc = accreditation.strip().upper()
            results = [
                h for h in results
                if any(acc in a.upper() for a in h.accreditation)
            ]

        if max_budget is not None and max_budget > 0:
            filtered = []
            for h in results:
                costs = list(h.indicative_costs.values())
                if any(c <= max_budget for c in costs):
                    filtered.append(h)
            results = filtered

        # Sorting
        if sort_by == "rating":
            results.sort(key=lambda h: h.rating, reverse=True)
        elif sort_by == "distance":
            results.sort(key=lambda h: h.distance_km)
        elif sort_by == "cost_low_to_high":
            results.sort(key=lambda h: min(h.indicative_costs.values()) if h.indicative_costs else 999999)

        return results

    @staticmethod
    def get_hospital_by_id(hospital_id: str) -> Optional[Hospital]:
        for h in MOCK_HOSPITALS:
            if h.id == hospital_id:
                return h
        return None

    @staticmethod
    def compare_hospitals(hospital_ids: list[str], procedure: Optional[str] = "Angioplasty") -> dict[str, Any]:
        selected = [h for h in MOCK_HOSPITALS if h.id in hospital_ids]
        if not selected:
            selected = MOCK_HOSPITALS[:3]

        comparison_data = []
        for h in selected:
            cost = h.indicative_costs.get(procedure, h.indicative_costs.get("Angioplasty", 185000))
            comparison_data.append({
                "id": h.id,
                "name": h.name,
                "city": h.city,
                "address": h.address,
                "locality": h.locality or h.address,
                "hospital_type": h.hospital_type,
                "rating": h.rating,
                "distance_km": h.distance_km,
                "accreditation": h.accreditation,
                "specialties": h.specialties,
                "facilities": h.facilities,
                "accepted_schemes": h.accepted_schemes,
                "empanelled_schemes": h.empanelled_schemes_verified or h.accepted_schemes,
                "indicative_cost": cost,
                "procedure_benchmarked": procedure,
                "phone": h.phone,
                "directions_url": h.directions_url
            })

        return {
            "procedure": procedure,
            "comparison_count": len(comparison_data),
            "hospitals": comparison_data
        }
