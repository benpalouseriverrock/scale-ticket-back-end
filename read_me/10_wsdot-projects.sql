-- Migration 10: Create wsdot_projects table
-- Stores reusable WSDOT project templates so operators can pre-fill
-- all WSDOT fields by selecting a project from a dropdown.

CREATE TABLE IF NOT EXISTS wsdot_projects (
  project_id            SERIAL PRIMARY KEY,
  project_name          VARCHAR(255) NOT NULL,
  contract_number       VARCHAR(50),
  dot_code              VARCHAR(50),
  job_number            VARCHAR(50),
  mix_id                VARCHAR(50),
  phase_code            VARCHAR(50),
  phase_description     VARCHAR(255),
  dispatch_number       VARCHAR(50),
  purchase_order_number VARCHAR(50),
  weighmaster           VARCHAR(100),
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMP DEFAULT NOW()
);
