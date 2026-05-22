-- CamTraffic PostgreSQL Schema
-- Generated from Django models — use migrations in production

CREATE TYPE user_role AS ENUM ('admin', 'police', 'driver');
CREATE TYPE fine_status AS ENUM ('pending', 'paid', 'overdue', 'dismissed');
CREATE TYPE sign_category AS ENUM ('warning', 'prohibitory', 'mandatory', 'informative');
CREATE TYPE notification_type AS ENUM ('fine', 'system', 'detection', 'alert');
CREATE TYPE vehicle_type AS ENUM ('car', 'motorcycle', 'truck', 'bus', 'tuk-tuk');

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMPTZ,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    email VARCHAR(254) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'driver',
    phone VARCHAR(20) DEFAULT '',
    address TEXT DEFAULT '',
    license_no VARCHAR(50),
    profile_image VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_license ON users(license_no);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE traffic_signs (
    id BIGSERIAL PRIMARY KEY,
    sign_name VARCHAR(150) NOT NULL,
    sign_code VARCHAR(20) UNIQUE,
    description TEXT NOT NULL,
    guidance TEXT DEFAULT '',
    image VARCHAR(100),
    category VARCHAR(20) NOT NULL DEFAULT 'warning',
    penalty VARCHAR(255) DEFAULT '',
    rules JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL DEFAULT 'car',
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL DEFAULT 2020,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);

CREATE TABLE fines (
    id BIGSERIAL PRIMARY KEY,
    driver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    police_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    evidence_image VARCHAR(100),
    location VARCHAR(255) NOT NULL DEFAULT '',
    vehicle_plate VARCHAR(20) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_fines_driver ON fines(driver_id);
CREATE INDEX idx_fines_status ON fines(status);

CREATE TABLE ai_detection_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_image VARCHAR(100) NOT NULL,
    detected_sign VARCHAR(150) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    description TEXT DEFAULT '',
    guidance TEXT DEFAULT '',
    processing_time DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(20) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
