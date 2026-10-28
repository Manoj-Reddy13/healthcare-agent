from app.data.mock_costs import PROCEDURE_BENCHMARKS, ROOM_MULTIPLIERS
from app.models.cost import CostEstimate

class CostService:
    @staticmethod
    def estimate_treatment_cost(
        procedure: str,
        city: str = "Hyderabad",
        room_type: str = "Semi-Private"
    ) -> CostEstimate:
        norm_proc = procedure.strip().lower()
        multiplier = ROOM_MULTIPLIERS.get(room_type, 1.0)

        # Match procedure against benchmarks
        matched_key = None
        for key in PROCEDURE_BENCHMARKS:
            if key in norm_proc or norm_proc in key:
                matched_key = key
                break

        if matched_key:
            bench = PROCEDURE_BENCHMARKS[matched_key]
            disp_name = bench["display_name"]
            min_val = round(bench["base_min"] * multiplier)
            max_val = round(bench["base_max"] * multiplier)
            avg_val = round((min_val + max_val) / 2)
            factors = bench["factors"]
            covered_schemes = bench["covered_schemes"]
        else:
            # Fallback estimation heuristic
            disp_name = procedure.title()
            base_min = 25000
            base_max = 60000
            min_val = round(base_min * multiplier)
            max_val = round(base_max * multiplier)
            avg_val = round((min_val + max_val) / 2)
            factors = [
                "Hospital tier (Corporate vs Trust/Govt)",
                "Specific surgical instruments & consumable implants used",
                "Comorbidities and post-operative ICU recovery duration"
            ]
            covered_schemes = ["Ayushman Bharat (PM-JAY)", "Aarogyasri (subject to package list)"]

        return CostEstimate(
            procedure=disp_name,
            city=city.title(),
            room_type=room_type,
            indicative_range_min=min_val,
            indicative_range_max=max_val,
            average_cost=avg_val,
            room_multiplier=multiplier,
            factors=factors,
            covered_under_schemes=covered_schemes,
            disclaimer=(
                "Indicative estimate only based on regional tertiary hospital benchmarks. "
                "Actual hospital charges depend on surgeon fees, length of ICU stay, medications, "
                "and unexpected clinical complications."
            ),
            data_mode="estimated"
        )
