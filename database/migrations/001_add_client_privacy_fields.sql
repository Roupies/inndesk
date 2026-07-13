BEGIN;

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT FALSE;

UPDATE clients
SET consent_marketing = FALSE
WHERE consent_marketing IS NULL;

ALTER TABLE clients
    ALTER COLUMN consent_marketing SET DEFAULT FALSE,
    ALTER COLUMN consent_marketing SET NOT NULL,
    ALTER COLUMN email DROP NOT NULL;

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS consent_marketing_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;

COMMIT;
