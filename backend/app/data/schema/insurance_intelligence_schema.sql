-- CareNav AI - Insurance & Medical Intelligence Schema
-- Compatible with PostgreSQL (12+) and SQLite (3.24+)

-- 1. Disease Knowledge Base with WHO ICD-11
CREATE TABLE IF NOT EXISTS diseases_icd11 (
    disease_id VARCHAR(64) PRIMARY KEY,
    icd11_code VARCHAR(32) NOT NULL UNIQUE,
    icd11_title VARCHAR(255) NOT NULL,
    icd11_chapter VARCHAR(128) NOT NULL,
    icd11_uri TEXT,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(128) NOT NULL,
    synonyms TEXT, -- JSON Array in SQLite / text in PostgreSQL
    etiology_and_causes TEXT NOT NULL,
    cardinal_symptoms TEXT NOT NULL,
    emergency_symptoms TEXT,
    diagnostic_workup TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Official Health Insurance Policies Master
CREATE TABLE IF NOT EXISTS insurance_policies_master (
    policy_id VARCHAR(64) PRIMARY KEY,
    insurer_id VARCHAR(64) NOT NULL,
    insurer_name VARCHAR(255) NOT NULL,
    policy_name VARCHAR(255) NOT NULL,
    uin VARCHAR(64) NOT NULL UNIQUE,
    policy_type VARCHAR(64) NOT NULL,
    ped_waiting_period_months INT DEFAULT 36,
    initial_waiting_days INT DEFAULT 30,
    specific_illness_waiting_months INT DEFAULT 24,
    room_rent_limit TEXT NOT NULL,
    copay_percentage NUMERIC(5, 2) DEFAULT 0.0,
    restoration_benefit TEXT,
    official_document_url TEXT,
    last_verified DATE DEFAULT CURRENT_DATE
);

-- 3. Extracted Policy Clauses (Insurance Document Intelligence)
CREATE TABLE IF NOT EXISTS policy_clauses (
    clause_id VARCHAR(64) PRIMARY KEY,
    policy_id VARCHAR(64) NOT NULL REFERENCES insurance_policies_master(policy_id),
    policy_name VARCHAR(255) NOT NULL,
    uin VARCHAR(64) NOT NULL,
    insurer_name VARCHAR(255) NOT NULL,
    clause_category VARCHAR(64) NOT NULL, -- waiting_period, room_rent, exclusion, copayment, sublimit, restoration
    clause_title VARCHAR(255) NOT NULL,
    section_reference VARCHAR(128),
    page_number INT NOT NULL,
    source_document VARCHAR(255) NOT NULL,
    source_document_url TEXT,
    clause_text TEXT NOT NULL,
    numeric_limit NUMERIC(12, 2) DEFAULT 0,
    limit_unit VARCHAR(64),
    impact_summary TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(128),
    verification_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Insurance RAG Document Chunks & Embeddings
CREATE TABLE IF NOT EXISTS policy_document_chunks (
    chunk_id VARCHAR(64) PRIMARY KEY,
    policy_id VARCHAR(64) NOT NULL,
    clause_id VARCHAR(64) REFERENCES policy_clauses(clause_id),
    page_number INT NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INT,
    embedding_vector TEXT, -- Vector string / pgvector vector(768)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Hospital-to-Insurer Empanelment Registry
CREATE TABLE IF NOT EXISTS hospital_network_empanelment (
    empanelment_id VARCHAR(64) PRIMARY KEY,
    hospital_id VARCHAR(64) NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    insurer_id VARCHAR(64) NOT NULL,
    insurer_name VARCHAR(255) NOT NULL,
    network_status VARCHAR(64) NOT NULL, -- Confirmed Cashless Network, Reimbursement Empanelled, Unverified
    cashless_available BOOLEAN DEFAULT TRUE,
    tpa_desk_contact VARCHAR(128),
    turnaround_hours INT DEFAULT 2,
    last_verified DATE DEFAULT CURRENT_DATE
);

-- Indexes for lightning fast multi-faceted lookup
CREATE INDEX IF NOT EXISTS idx_clauses_policy ON policy_clauses(policy_id);
CREATE INDEX IF NOT EXISTS idx_clauses_category ON policy_clauses(clause_category);
CREATE INDEX IF NOT EXISTS idx_clauses_verified ON policy_clauses(is_verified);
CREATE INDEX IF NOT EXISTS idx_empanelment_hosp ON hospital_network_empanelment(hospital_id, insurer_id);

