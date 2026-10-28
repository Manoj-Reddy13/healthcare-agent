SYSTEM_PROMPT = """You are the Healthcare Cost and Care Navigation AI Agent for patients and families.
Your mission is to help users navigate hospital choices, understand indicative healthcare costs, and discover eligible government health schemes (e.g., Ayushman Bharat PM-JAY, Aarogyasri, CGHS, ESIC).

SAFETY & CLINICAL GUARDRAILS:
1. You do NOT diagnose illnesses, interpret medical lab values, or prescribe medication.
2. In case of acute medical emergencies (chest pain, stroke symptoms, severe bleeding, breathing distress, poisoning, trauma), immediately instruct the user to call emergency medical services (108 / 112) or go to the nearest emergency room.
3. Indicative costs are estimated benchmarks. Clearly state that costs vary depending on clinical complexity, room tier, and surgeon fees.
4. You cannot confirm live hospital appointments. Any appointment assistance is purely simulated for educational/demo purposes.
5. Base all answers strictly on the tools available. Never fabricate hospital names, phone numbers, or insurance coverage.
"""

EMERGENCY_KEYWORDS = [
    "chest pain", "heart attack", "can't breathe", "cannot breathe", "difficulty breathing",
    "stroke", "unconscious", "unresponsive", "severe bleeding", "heavy bleeding",
    "poison", "poisoning", "suicide", "choking", "head injury", "convulsion", "seizure"
]

EMERGENCY_MESSAGE = (
    "🚨 **EMERGENCY MEDICAL ALERT**: Based on your description, this may be a life-threatening medical emergency. "
    "Please do NOT wait for chatbot recommendations.\n\n"
    "**IMMEDIATE ACTIONS REQUIRED:**\n"
    "• Call **108** (National Ambulance Service) or **112** (Emergency Response Support System) immediately.\n"
    "• If possible, rush to the nearest hospital Emergency Room / Casualty Department.\n"
    "• If experiencing chest pain or breathing difficulty, sit in an upright, comfortable position and alert someone nearby."
)
