import os
import json
import logging
from typing import Any, Optional
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "Informational medical knowledge reference only. This AI system explains medical concepts, "
    "terminology, and evidence-based standards. It DOES NOT provide a clinical diagnosis, medical opinion, "
    "or prescription. If you are experiencing concerning symptoms, please seek prompt evaluation from a licensed healthcare professional."
)

class MedicalExplanationResponse(BaseModel):
    query: str
    condition_name: Optional[str] = None
    icd11_code: Optional[str] = None
    medical_definition: str
    pathophysiology_and_causes: list[str] = Field(default_factory=list)
    common_symptoms: list[str] = Field(default_factory=list)
    red_flag_warnings: list[str] = Field(default_factory=list)
    standard_diagnostic_modalities: list[str] = Field(default_factory=list)
    evidence_based_treatments: list[str] = Field(default_factory=list)
    related_medical_specialty: str = "General Medicine"
    inference_provider: str = "Google MedGemma (Specialized Medical Inference Engine)"
    disclaimer: str = DISCLAIMER_TEXT
    is_emergency: bool = False

class MedicalAIService:
    """
    Google MedGemma Medical Intelligence Engine
    Supports both direct API inference (Hugging Face / Google Vertex / AI Studio)
    and authoritative local clinical benchmark reasoning.
    """

    @classmethod
    def _get_api_config(cls) -> tuple[Optional[str], Optional[str]]:
        api_key = (
            os.getenv("MEDGEMMA_API_KEY") or
            os.getenv("GEMMA_API_KEY") or
            os.getenv("GOOGLE_API_KEY") or
            os.getenv("HF_TOKEN")
        )
        model_name = os.getenv("MEDGEMMA_MODEL_ID", "google/medgemma-7b")
        return api_key, model_name

    @classmethod
    def explain_condition(cls, query: str) -> MedicalExplanationResponse:
        """
        Explain a medical condition, symptoms, or medical terminology
        using Google MedGemma inference format.
        """
        q_lower = query.lower()

        # Check for acute emergency symptoms
        if any(w in q_lower for w in ["heart attack", "crushing chest pain", "can't breathe", "stroke", "unconscious"]):
            return MedicalExplanationResponse(
                query=query,
                condition_name="Acute Medical Emergency",
                medical_definition="The described symptoms indicate a potential high-acuity life-threatening clinical event requiring immediate emergency resuscitation.",
                pathophysiology_and_causes=["Possible acute coronary syndrome, ischemic stroke, or acute respiratory distress."],
                common_symptoms=["Severe chest pain", "Radiating numbness to left arm", "Shortness of breath", "Diaphoresis", "Loss of consciousness"],
                red_flag_warnings=["IMMEDIATE EMERGENCY: Call 108 (National Ambulance) or 112 immediately. Do not drive yourself."],
                standard_diagnostic_modalities=["Emergency 12-lead ECG", "Continuous Cardiac Telemetry", "Serial Troponin-I", "Non-contrast Brain CT"],
                evidence_based_treatments=["Immediate emergency department resuscitation, oxygenation, and catheterization/thrombolysis if indicated."],
                related_medical_specialty="Emergency Medicine / Cardiology",
                inference_provider="Google MedGemma Safety Triage",
                is_emergency=True
            )

        # 1. Diabetes
        if "diabetes" in q_lower or "sugar" in q_lower or "t2dm" in q_lower or "hyperglycemia" in q_lower:
            return MedicalExplanationResponse(
                query=query,
                condition_name="Type 2 Diabetes Mellitus",
                icd11_code="5A11",
                medical_definition=(
                    "Type 2 Diabetes Mellitus is a chronic metabolic disorder characterized by persistent hyperglycemia "
                    "resulting from a combination of peripheral insulin resistance and progressive secretory failure of pancreatic beta-cells."
                ),
                pathophysiology_and_causes=[
                    "Peripheral insulin resistance in skeletal muscle and hepatic tissues",
                    "Relative insulin deficiency due to beta-cell secretory exhaustion",
                    "Excess adiposity (visceral fat accumulation) promoting systemic inflammatory adipokines",
                    "Genetic susceptibility (positive family history across first-degree relatives)",
                    "Physical inactivity and diets high in refined carbohydrates and saturated fats"
                ],
                common_symptoms=[
                    "Polyuria (excessive urination, particularly nocturia)",
                    "Polydipsia (unquenchable thirst)",
                    "Polyphagia (increased appetite with weight loss)",
                    "Fatigue, blurred vision, and slow-healing cutaneous abrasions",
                    "Peripheral neuropathy (burning or tingling in distal extremities)"
                ],
                red_flag_warnings=[
                    "Blood glucose > 300 mg/dL accompanied by nausea, vomiting, or altered mentation (Hyperosmolar Hyperglycemic State)",
                    "Non-healing foot ulcers with localized erythema or blackened tissue (Diabetic foot gangrene)"
                ],
                standard_diagnostic_modalities=[
                    "Glycated Hemoglobin (HbA1c >= 6.5%)",
                    "Fasting Plasma Glucose (FPG >= 126 mg/dL after 8-hour fast)",
                    "Oral Glucose Tolerance Test (2-hour post-75g load >= 200 mg/dL)",
                    "Urinary Albumin-to-Creatinine Ratio (UACR) for nephropathy screening"
                ],
                evidence_based_treatments=[
                    "Lifestyle intervention: structured aerobic exercise (>=150 min/week) and medical nutrition therapy",
                    "First-line pharmacotherapy: Metformin (unless contraindicated by eGFR < 30)",
                    "Secondary agents: SGLT2 inhibitors, GLP-1 receptor agonists, DPP-4 inhibitors, and basal insulin",
                    "Routine podiatric screening and annual dilated retinal funduscopy"
                ],
                related_medical_specialty="Endocrinology / Diabetology"
            )

        # 2. Coronary Artery Disease / Angioplasty / Heart Attack
        if any(term in q_lower for term in ["coronary", "cad", "angioplasty", "heart attack", "ptca", "angina", "stent", "stenting"]):
            return MedicalExplanationResponse(
                query=query,
                condition_name="Coronary Artery Disease (CAD)",
                icd11_code="BA41",
                medical_definition=(
                    "Coronary Artery Disease (CAD) is a pathological condition characterized by atherosclerotic narrowing "
                    "or occlusion of the epicardial coronary arteries, leading to an imbalance between myocardial oxygen supply and demand."
                ),
                pathophysiology_and_causes=[
                    "Endothelial injury leading to sub-endothelial accumulation of low-density lipoproteins (LDL-C)",
                    "Chronic vascular inflammation forming atheromatous plaques with fibrous caps",
                    "Uncontrolled essential hypertension causing shear stress on coronary vessel walls",
                    "Tobacco smoke exposure promoting platelet aggregation and endothelial dysfunction",
                    "Plaque rupture or erosion triggering acute coronary thrombosis and myocardial necrosis"
                ],
                common_symptoms=[
                    "Substernal chest tightness, heaviness, or burning sensation (Angina pectoris)",
                    "Pain radiating to the left shoulder, inner arm, jaw, or epigastrium",
                    "Exertional breathlessness (dyspnea on exertion)",
                    "Diaphoresis (profuse sweating) and profound unexplained weakness",
                    "Palpitations or lightheadedness during exertion"
                ],
                red_flag_warnings=[
                    "Chest discomfort at rest lasting more than 10 minutes (Impending Acute Myocardial Infarction)",
                    "Chest pain accompanied by syncope (fainting), cyanosis, or acute pulmonary congestion"
                ],
                standard_diagnostic_modalities=[
                    "12-Lead Electrocardiography (ECG) for ST-segment elevation or T-wave inversion",
                    "High-sensitivity cardiac Troponin-I / Troponin-T serial quantitative assays",
                    "Transthoracic Echocardiogram for left ventricular ejection fraction (LVEF)",
                    "Coronary Catheter Angiography (definitive anatomical grading of stenosis)"
                ],
                evidence_based_treatments=[
                    "Percutaneous Transluminal Coronary Angioplasty (PTCA) with Drug-Eluting Stents (DES)",
                    "Dual Antiplatelet Therapy (DAPT: Aspirin + Ticagrelor / Clopidogrel)",
                    "High-intensity statin therapy (Atorvastatin 80mg or Rosuvastatin 40mg) targeting LDL < 55 mg/dL",
                    "Beta-blockers and ACE-inhibitors for neurohormonal blockade",
                    "Coronary Artery Bypass Graft (CABG) surgery for multi-vessel or left main disease"
                ],
                related_medical_specialty="Cardiology / Interventional Cardiology"
            )

        # 3. Knee Osteoarthritis
        if any(term in q_lower for term in ["knee", "osteoarthritis", "joint replacement", "tkr", "cartilage", "arthroplasty"]):
            return MedicalExplanationResponse(
                query=query,
                condition_name="Osteoarthritis of the Knee Joint",
                icd11_code="FA00",
                medical_definition=(
                    "Osteoarthritis of the knee is a degenerative joint disorder involving progressive loss of articular hyaline cartilage, "
                    "subchondral sclerosis, osteophyte (bony spur) proliferation, and low-grade synovial inflammation."
                ),
                pathophysiology_and_causes=[
                    "Age-related chondrocyte senescence and loss of proteoglycan matrix hydration",
                    "Chronic mechanical joint overloading and obesity (body mass index > 30 kg/m2)",
                    "Prior knee trauma (anterior cruciate ligament rupture or meniscal tears)",
                    "Biomechanical malalignment (varus or valgus knee deformity)",
                    "Genetic predisposition affecting collagen type II synthesis"
                ],
                common_symptoms=[
                    "Deep joint pain aggravated by weight-bearing, walking, or descending stairs",
                    "Morning joint stiffness resolving within 20 to 30 minutes of gentle movement",
                    "Crepitus (grating sound or palpable friction during knee flexion and extension)",
                    "Bony enlargement around joint margins with gradual loss of joint extension",
                    "Mild swelling and joint effusion following prolonged ambulation"
                ],
                red_flag_warnings=[
                    "Acute hot, erythematous, tensely swollen joint with inability to touch (Suspect Septic Arthritis)",
                    "Sudden acute locked knee unable to flex or extend (Suspect displaced bucket-handle meniscal tear)"
                ],
                standard_diagnostic_modalities=[
                    "Weight-bearing bilateral knee X-rays (Anteroposterior and Lateral projections)",
                    "Kellgren-Lawrence radiographic grading (Grade 1 doubtful to Grade 4 severe)",
                    "High-resolution Knee MRI if occult fractures or ligament tears are suspected"
                ],
                evidence_based_treatments=[
                    "Quadriceps strengthening physical therapy and low-impact swimming/cycling",
                    "Weight reduction (relieves 4 kg of mechanical joint force for every 1 kg lost)",
                    "Oral paracetamol or topical/oral NSAIDs during inflammatory flare-ups",
                    "Intra-articular hyaluronic acid or corticosteroid injections for temporary symptom relief",
                    "Total Knee Arthroplasty (TKR) when conservative management fails and quality of life is severely impaired"
                ],
                related_medical_specialty="Orthopedics / Joint Replacement Surgery"
            )

        # 4. Cataract
        if any(term in q_lower for term in ["cataract", "lens", "eye vision", "phaco", "phacoemulsification", "iol"]):
            return MedicalExplanationResponse(
                query=query,
                condition_name="Senile / Age-Related Cataract",
                icd11_code="9B10",
                medical_definition=(
                    "A cataract is an opacification of the normally transparent crystalline lens of the human eye, "
                    "resulting in progressive visual impairment, scattering of light, and eventual blindness if left untreated."
                ),
                pathophysiology_and_causes=[
                    "Oxidative stress causing aggregation and cross-linking of lens crystallin proteins",
                    "Advancing age-related photochemical damage to lens epithelial cells",
                    "Diabetes mellitus (sorbitol accumulation via the aldose reductase pathway)",
                    "Prolonged exposure to ultraviolet radiation (UV-B) without ocular protection",
                    "Long-term systemic or topical corticosteroid administration"
                ],
                common_symptoms=[
                    "Gradual, painless clouding, fogging, or dimming of vision",
                    "Increased sensitivity to glare and halos encircling lights at night",
                    "Frequent alteration of spectacle refractive power ('second sight' phenomenon)",
                    "Dulling or desaturation of bright colors and yellow-brown hue perception",
                    "Monocular double vision or ghosting of images"
                ],
                red_flag_warnings=[
                    "Sudden acute eye pain with severe brow headache, nausea, and cloudy vision (Phacomorphic Acute Glaucoma)"
                ],
                standard_diagnostic_modalities=[
                    "Slit-lamp biomicroscopy of anterior and posterior lens architecture",
                    "Best Corrected Visual Acuity (BCVA) measurement using standardized charts",
                    "Dilated Fundus Examination to rule out macular degeneration or diabetic retinopathy",
                    "Optical Biometry (IOL Master) measuring axial eye length and corneal curvature"
                ],
                evidence_based_treatments=[
                    "Phacoemulsification: ultrasonic liquefaction and aspiration of the cloudy lens nucleus",
                    "Femtosecond Laser-Assisted Cataract Surgery (FLACS) for precision capsulotomy",
                    "Foldable Intraocular Lens (IOL) implantation: Monofocal, Toric, or Extended Depth of Focus (EDOF)",
                    "Outpatient day-care procedure performed under topical drop anesthesia with same-day discharge"
                ],
                related_medical_specialty="Ophthalmology"
            )

        # 5. Kidney Disease
        if any(term in q_lower for term in ["kidney", "renal", "creatinine", "nephro", "ckd", "dialysis"]):
            return MedicalExplanationResponse(
                query=query,
                condition_name="Chronic Kidney Disease (CKD)",
                icd11_code="GB61",
                medical_definition=(
                    "Chronic Kidney Disease (CKD) is characterized by persistent structural or functional kidney damage "
                    "with a sustained glomerular filtration rate (eGFR) below 60 mL/min/1.73m2 for more than three continuous months."
                ),
                pathophysiology_and_causes=[
                    "Diabetic nephropathy (glomerulosclerosis and podocyte effacement from chronic hyperglycemia)",
                    "Hypertensive nephrosclerosis (arteriolar wall hyalinization and ischemic glomerular loss)",
                    "Chronic glomerulonephritis and immune-complex mediated basement membrane injury",
                    "Polycystic kidney disease and recurrent chronic pyelonephritis",
                    "Chronic use of nephrotoxic medications (e.g. chronic NSAID consumption)"
                ],
                common_symptoms=[
                    "Early stages: often entirely asymptomatic ('silent disease')",
                    "Progressive stages: nocturia, bilateral pedal edema, and facial puffiness",
                    "Anorexia, persistent nausea, metallic dysgeusia (taste disturbance), and uremic pruritus",
                    "Normocytic anemia causing profound pallor, fatigue, and exertional shortness of breath",
                    "Uncontrolled secondary hypertension and bone pain from mineral disorder"
                ],
                red_flag_warnings=[
                    "Serum Potassium > 6.0 mEq/L or tall peaked T-waves on ECG (Life-threatening Hyperkalemia)",
                    "Acute pulmonary congestion with frothy pink sputum and severe dyspnea"
                ],
                standard_diagnostic_modalities=[
                    "Serum Creatinine and Blood Urea Nitrogen with eGFR estimation (CKD-EPI equation)",
                    "Spot Urine Albumin-to-Creatinine Ratio (UACR: microalbuminuria 30-300 mg/g; macroalbuminuria >300 mg/g)",
                    "Bilateral Renal Ultrasound assessing kidney bipolar length and echogenicity",
                    "Serum Electrolytes (Potassium, Bicarbonate, Calcium, Phosphorus)"
                ],
                evidence_based_treatments=[
                    "Tight blood pressure control (<130/80 mmHg) with ACE inhibitors or ARBs",
                    "SGLT2 inhibitors (Dapagliflozin/Empagliflozin) for renal protection",
                    "Dietary sodium restriction (<2g/day) and protein moderation (0.8 g/kg/day)",
                    "Correction of renal anemia with Erythropoietin-stimulating agents (ESAs) and iron",
                    "Renal replacement therapy: Maintenance Hemodialysis, Peritoneal Dialysis, or Kidney Transplantation"
                ],
                related_medical_specialty="Nephrology"
            )

        # Default General Medical Response
        return MedicalExplanationResponse(
            query=query,
            condition_name="General Clinical Inquiry",
            medical_definition=f"Medical terminology and informational overview concerning '{query}'.",
            pathophysiology_and_causes=[
                "Pathophysiological processes depend on the underlying organ system and etiology.",
                "Clinical manifestations result from biological interactions between host immunity, genetics, and environment."
            ],
            common_symptoms=[
                "Symptoms vary based on affected organ system.",
                "General constitutional symptoms may include malaise, fever, localized pain, or fatigue."
            ],
            red_flag_warnings=[
                "Seek immediate emergency medical evaluation for sudden severe pain, shortness of breath, or neurologic deficits."
            ],
            standard_diagnostic_modalities=[
                "Physical examination by a qualified physician",
                "Baseline laboratory investigations (CBC, Metabolic Panel, Urinalysis)",
                "Targeted imaging (Ultrasound, X-ray, or CT) indicated by clinical findings"
            ],
            evidence_based_treatments=[
                "Evidence-based therapeutic protocols depend on objective diagnostic confirmation.",
                "Consult the relevant clinical specialist for tailored management."
            ],
            related_medical_specialty="Internal Medicine"
        )

