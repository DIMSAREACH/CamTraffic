-- CamTraffic — create user_preferences + login_events in PostgreSQL (pgAdmin Query Tool)
-- Run on database: camtraffic_db
--
-- STEP 1: Check users.id type (run this first):
--   SELECT data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';
--
-- If result = 'uuid'  → run SECTION A below
-- If result = 'bigint' → run SECTION B below

-- =============================================================================
-- SECTION A — users.id is UUID (after migration users.0007_uuid_schema_alignment)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notify_fines            BOOLEAN NOT NULL DEFAULT TRUE,
    notify_detections       BOOLEAN NOT NULL DEFAULT TRUE,
    notify_alerts           BOOLEAN NOT NULL DEFAULT TRUE,
    notify_system           BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    login_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
    suspicious_alerts       BOOLEAN NOT NULL DEFAULT TRUE,
    muted_until             TIMESTAMP WITH TIME ZONE NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address      INET NULL,
    user_agent      TEXT NOT NULL DEFAULT '',
    device_label    VARCHAR(120) NOT NULL DEFAULT '',
    status          VARCHAR(20) NOT NULL DEFAULT 'success',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS login_events_user_id_idx ON login_events (user_id);
CREATE INDEX IF NOT EXISTS idx_login_user_created ON login_events (user_id, created_at DESC);

-- Mark Django migrations as applied (only if rows do not exist yet):
INSERT INTO django_migrations (app, name, applied)
SELECT 'users', '0004_user_preferences_login_events', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM django_migrations WHERE app = 'users' AND name = '0004_user_preferences_login_events'
);
INSERT INTO django_migrations (app, name, applied)
SELECT 'users', '0005_user_preference_muted_until', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM django_migrations WHERE app = 'users' AND name = '0005_user_preference_muted_until'
);


-- =============================================================================
-- SECTION B — users.id is BIGINT (older schema, before UUID migration)
-- Comment out SECTION A above and run this block instead if users.id = bigint
-- =============================================================================
/*
CREATE TABLE IF NOT EXISTS user_preferences (
    id              BIGSERIAL PRIMARY KEY,
    notify_fines            BOOLEAN NOT NULL DEFAULT TRUE,
    notify_detections       BOOLEAN NOT NULL DEFAULT TRUE,
    notify_alerts           BOOLEAN NOT NULL DEFAULT TRUE,
    notify_system           BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    login_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
    suspicious_alerts       BOOLEAN NOT NULL DEFAULT TRUE,
    muted_until             TIMESTAMP WITH TIME ZONE NULL,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id                 BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_events (
    id              BIGSERIAL PRIMARY KEY,
    ip_address      INET NULL,
    user_agent      TEXT NOT NULL DEFAULT '',
    device_label    VARCHAR(120) NOT NULL DEFAULT '',
    status          VARCHAR(20) NOT NULL DEFAULT 'success',
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS login_events_user_id_idx ON login_events (user_id);
CREATE INDEX IF NOT EXISTS idx_login_user_created ON login_events (user_id, created_at DESC);

INSERT INTO django_migrations (app, name, applied)
SELECT 'users', '0004_user_preferences_login_events', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM django_migrations WHERE app = 'users' AND name = '0004_user_preferences_login_events'
);
INSERT INTO django_migrations (app, name, applied)
SELECT 'users', '0005_user_preference_muted_until', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM django_migrations WHERE app = 'users' AND name = '0005_user_preference_muted_until'
);
*/
