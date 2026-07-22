# CamTraffic — Government-Standard Project Structure

**AI-Based Traffic Law Enforcement System**  
**Ministry of Public Works and Transport — Kingdom of Cambodia**

Last Updated: July 23, 2026  
Version: 1.0.0  
Classification: Official Use

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Directory Structure](#directory-structure)
3. [Category Classification](#category-classification)
4. [Governance & Compliance](#governance--compliance)
5. [Security Classification](#security-classification)
6. [Access Control Matrix](#access-control-matrix)

---

## Project Overview

### System Purpose
Nationwide AI-based traffic violation detection, fine management, and enforcement system for the Kingdom of Cambodia.

### Key Stakeholders
- **Owner**: Ministry of Public Works and Transport
- **Operators**: National Police Traffic Department
- **Users**: Police Officers, Court Officials, Citizens
- **Maintainers**: IT Department, AI Team

### Compliance Requirements
- ✅ Data Protection Act (Cambodia)
- ✅ Government IT Security Standards
- ✅ National Digital Infrastructure Policy
- ✅ Personal Data Protection Guidelines
- ✅ Government Cloud Standards

---

## Directory Structure

```
CamTraffic/
│
├── 📁 src/                           # SOURCE CODE (Category: Application)
│   ├── backend/                      # Backend API & Business Logic
│   ├── web/                          # Web Applications
│   └── services/                     # Microservices
│
├── 📁 ai/                            # AI/ML COMPONENTS (Category: Intelligence)
│   ├── datasets/                     # Training Data
│   ├── models/                       # Trained Models
│   ├── weights/                      # Model Weights
│   ├── training/                     # Training Pipelines
│   └── evaluation/                   # Performance Metrics
│
├── 📁 infrastructure/                # INFRASTRUCTURE (Category: Operations)
│   ├── deployment/                   # Deployment Configurations
│   ├── monitoring/                   # System Monitoring
│   ├── security/                     # Security Configurations
│   └── networking/                   # Network Configurations
│
├── 📁 data/                          # DATA MANAGEMENT (Category: Information)
│   ├── schemas/                      # Database Schemas
│   ├── migrations/                   # Database Migrations
│   ├── seeds/                        # Seed Data
│   └── backups/                      # Backup Scripts
│
├── 📁 docs/                          # DOCUMENTATION (Category: Knowledge)
│   ├── technical/                    # Technical Documentation
│   ├── operational/                  # Operations Manuals
│   ├── compliance/                   # Compliance Documents
│   ├── training/                     # Training Materials
│   └── governance/                   # Governance Documents
│
├── 📁 tests/                         # TESTING (Category: Quality Assurance)
│   ├── unit/                         # Unit Tests
│   ├── integration/                  # Integration Tests
│   ├── e2e/                          # End-to-End Tests
│   ├── security/                     # Security Tests
│   └── performance/                  # Performance Tests
│
├── 📁 scripts/                       # AUTOMATION (Category: Tools)
│   ├── deployment/                   # Deployment Scripts
│   ├── maintenance/                  # Maintenance Scripts
│   ├── monitoring/                   # Monitoring Scripts
│   └── utilities/                    # Utility Scripts
│
├── 📁 config/                        # CONFIGURATION (Category: Settings)
│   ├── environments/                 # Environment Configs
│   ├── services/                     # Service Configs
│   └── security/                     # Security Configs
│
├── 📁 reports/                       # REPORTS (Category: Analytics)
│   ├── performance/                  # Performance Reports
│   ├── compliance/                   # Compliance Reports
│   ├── incident/                     # Incident Reports
│   └── analytics/                    # Analytics Reports
│
└── 📁 governance/                    # GOVERNANCE (Category: Management)
    ├── policies/                     # IT Policies
    ├── standards/                    # Technical Standards
    ├── procedures/                   # Standard Operating Procedures
    └── audits/                       # Audit Logs & Reports
```

---

## Detailed Category Classification

### 1️⃣ APPLICATION LAYER (`src/`)

**Purpose**: Core application source code  
**Classification**: Restricted  
**Backup Frequency**: Daily

```
src/
│
├── backend/                          # Backend Services
│   ├── api/                          # REST API Endpoints
│   │   ├── v1/                       # API Version 1
│   │   │   ├── violations/           # Violation Management
│   │   │   ├── fines/                # Fine Processing
│   │   │   ├── appeals/              # Appeal System
│   │   │   ├── payments/             # Payment Gateway
│   │   │   └── users/                # User Management
│   │   └── v2/                       # API Version 2 (Future)
│   │
│   ├── core/                         # Core Business Logic
│   │   ├── authentication/           # Auth & Authorization
│   │   ├── permissions/              # Role-Based Access Control
│   │   ├── audit/                    # Audit Logging
│   │   └── notifications/            # Notification System
│   │
│   ├── integrations/                 # External Integrations
│   │   ├── payment_gateway/          # ABA, Wing Integration
│   │   ├── court_system/             # Court System Integration
│   │   ├── vehicle_registry/         # MVD Integration
│   │   └── sms_gateway/              # SMS Service
│   │
│   ├── workers/                      # Background Jobs
│   │   ├── celery/                   # Celery Tasks
│   │   ├── schedulers/               # Scheduled Jobs
│   │   └── queues/                   # Message Queues
│   │
│   └── middleware/                   # Middleware
│       ├── security/                 # Security Middleware
│       ├── logging/                  # Request Logging
│       └── rate_limiting/            # Rate Limiting
│
├── web/                              # Web Applications
│   ├── admin/                        # Administrator Portal
│   │   ├── src/
│   │   │   ├── pages/                # Page Components
│   │   │   │   ├── dashboard/        # Dashboard
│   │   │   │   ├── violations/       # Violation Management
│   │   │   │   ├── users/            # User Management
│   │   │   │   ├── reports/          # Reporting
│   │   │   │   └── settings/         # System Settings
│   │   │   ├── components/           # Reusable Components
│   │   │   ├── services/             # API Services
│   │   │   ├── hooks/                # Custom Hooks
│   │   │   └── utils/                # Utilities
│   │   ├── public/                   # Static Assets
│   │   └── tests/                    # Frontend Tests
│   │
│   ├── user/                         # Police/Driver Portal
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── dashboard/        # User Dashboard
│   │   │   │   ├── violations/       # My Violations
│   │   │   │   ├── payments/         # Payment History
│   │   │   │   └── appeals/          # Appeal Submission
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── public/
│   │
│   └── citizen/                      # Citizen Self-Service (PWA)
│       ├── app/                      # Next.js App Directory
│       ├── components/
│       ├── services/
│       └── public/
│
└── services/                         # Microservices
    ├── ai-service/                   # AI Detection Service
    │   ├── api/                      # FastAPI Application
    │   ├── models/                   # Model Loading
    │   ├── detection/                # Detection Logic
    │   ├── preprocessing/            # Image Preprocessing
    │   └── postprocessing/           # Result Processing
    │
    ├── mobile-api/                   # Mobile-Optimized API
    │   ├── routes/                   # API Routes
    │   ├── controllers/              # Controllers
    │   └── middleware/               # Mobile Middleware
    │
    ├── ai-vision/                    # Enterprise AI Vision
    │   ├── detection/                # Object Detection
    │   ├── tracking/                 # Multi-Object Tracking
    │   ├── classification/           # Image Classification
    │   └── analytics/                # Video Analytics
    │
    ├── ocr-service/                  # OCR/ANPR Service
    │   ├── engines/                  # OCR Engines
    │   │   ├── tesseract/            # Tesseract OCR
    │   │   ├── easyocr/              # EasyOCR
    │   │   └── paddleocr/            # PaddleOCR
    │   ├── preprocessing/            # Image Enhancement
    │   └── validation/               # Result Validation
    │
    └── stream-gateway/               # RTSP Stream Gateway
        ├── ingest/                   # Stream Ingestion
        ├── processing/               # Frame Processing
        ├── dispatch/                 # Frame Distribution
        └── storage/                  # Video Storage
```

---

### 2️⃣ INTELLIGENCE LAYER (`ai/`)

**Purpose**: AI/ML models and training infrastructure  
**Classification**: Confidential  
**Backup Frequency**: Weekly (models), Daily (configs)

```
ai/
│
├── datasets/                         # Training Datasets
│   ├── raw/                          # Raw/Source Data
│   │   ├── traffic_signs/            # Traffic Sign Images
│   │   │   ├── cambodia/             # Cambodia-specific
│   │   │   ├── asean/                # ASEAN Standards
│   │   │   └── international/        # International Signs
│   │   ├── vehicles/                 # Vehicle Images
│   │   │   ├── cars/
│   │   │   ├── motorcycles/
│   │   │   ├── trucks/
│   │   │   └── buses/
│   │   ├── license_plates/           # License Plate Images
│   │   │   ├── cambodia/             # Khmer Plates
│   │   │   └── foreign/              # Foreign Plates
│   │   ├── violations/               # Violation Scenarios
│   │   │   ├── red_light/
│   │   │   ├── speeding/
│   │   │   ├── no_helmet/
│   │   │   └── illegal_parking/
│   │   └── road_footage/             # Real-world Footage
│   │       ├── urban/                # City Roads
│   │       ├── highway/              # Highways
│   │       ├── rural/                # Rural Roads
│   │       ├── day/                  # Daytime
│   │       └── night/                # Nighttime
│   │
│   ├── processed/                    # Processed Datasets
│   │   ├── yolo_format/              # YOLO Format
│   │   ├── coco_format/              # COCO Format
│   │   └── augmented/                # Augmented Data
│   │
│   ├── annotations/                  # Annotation Files
│   │   ├── cvat_tasks/               # CVAT Annotations
│   │   ├── labelimg/                 # LabelImg Annotations
│   │   └── roboflow/                 # Roboflow Exports
│   │
│   └── splits/                       # Train/Val/Test Splits
│       ├── train/                    # Training Set (70%)
│       ├── val/                      # Validation Set (20%)
│       └── test/                     # Test Set (10%)
│
├── models/                           # Trained Models
│   ├── production/                   # Production Models
│   │   ├── traffic_signs_v1.0.pt     # Traffic Sign Detection
│   │   ├── vehicles_v1.0.pt          # Vehicle Detection
│   │   ├── license_plate_v1.0.pt     # License Plate Detection
│   │   └── violations_v1.0.pt        # Violation Detection
│   ├── staging/                      # Staging Models
│   ├── experimental/                 # Experimental Models
│   └── archived/                     # Archived Models
│
├── weights/                          # Model Weights
│   ├── pretrained/                   # Pre-trained Weights
│   │   ├── yolo11n.pt                # YOLOv11 Nano
│   │   ├── yolov8n.pt                # YOLOv8 Nano
│   │   ├── yolov8s.pt                # YOLOv8 Small
│   │   └── yolov8m.pt                # YOLOv8 Medium
│   └── checkpoints/                  # Training Checkpoints
│
├── training/                         # Training Infrastructure
│   ├── configs/                      # Training Configurations
│   │   ├── traffic_signs.yaml        # Traffic Sign Config
│   │   ├── vehicles.yaml             # Vehicle Config
│   │   └── violations.yaml           # Violation Config
│   ├── runs/                         # Training Runs
│   │   └── detect/
│   │       ├── camtraffic-v1/        # Version 1
│   │       ├── camtraffic-v2/        # Version 2
│   │       └── camtraffic-v3/        # Version 3
│   ├── logs/                         # Training Logs
│   └── metrics/                      # Performance Metrics
│
├── evaluation/                       # Model Evaluation
│   ├── benchmarks/                   # Benchmark Results
│   ├── metrics/                      # Evaluation Metrics
│   ├── reports/                      # Evaluation Reports
│   └── comparisons/                  # Model Comparisons
│
└── scripts/                          # AI Scripts
    ├── train.py                      # Training Script
    ├── evaluate.py                   # Evaluation Script
    ├── export.py                     # Model Export Script
    ├── inference.py                  # Inference Script
    └── data_preparation/             # Data Prep Scripts
        ├── download.py
        ├── augment.py
        └── validate.py
```

---

### 3️⃣ OPERATIONS LAYER (`infrastructure/`)

**Purpose**: Deployment, monitoring, and operations  
**Classification**: Restricted  
**Backup Frequency**: Daily

```
infrastructure/
│
├── deployment/                       # Deployment Configurations
│   ├── docker/                       # Docker Configurations
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   ├── Dockerfile.ai-service
│   │   └── docker-compose.yml
│   ├── kubernetes/                   # Kubernetes Manifests
│   │   ├── deployments/
│   │   ├── services/
│   │   ├── ingress/
│   │   └── configmaps/
│   ├── terraform/                    # Infrastructure as Code
│   │   ├── modules/
│   │   ├── environments/
│   │   └── providers/
│   └── ansible/                      # Configuration Management
│       ├── playbooks/
│       └── roles/
│
├── monitoring/                       # System Monitoring
│   ├── prometheus/                   # Prometheus Config
│   ├── grafana/                      # Grafana Dashboards
│   ├── loki/                         # Log Aggregation
│   └── alerts/                       # Alert Rules
│
├── security/                         # Security Infrastructure
│   ├── ssl/                          # SSL Certificates
│   ├── secrets/                      # Secret Management
│   ├── firewall/                     # Firewall Rules
│   └── waf/                          # Web Application Firewall
│
├── networking/                       # Network Configuration
│   ├── vpn/                          # VPN Configuration
│   ├── load_balancers/               # Load Balancer Config
│   └── dns/                          # DNS Configuration
│
└── backup/                           # Backup & Recovery
    ├── scripts/                      # Backup Scripts
    ├── policies/                     # Backup Policies
    └── recovery/                     # Recovery Procedures
```

---

### 4️⃣ INFORMATION LAYER (`data/`)

**Purpose**: Data management and database operations  
**Classification**: Confidential  
**Backup Frequency**: Hourly (transactional), Daily (full)

```
data/
│
├── schemas/                          # Database Schemas
│   ├── postgresql/                   # PostgreSQL Schemas
│   │   ├── users.sql
│   │   ├── violations.sql
│   │   ├── fines.sql
│   │   └── appeals.sql
│   └── redis/                        # Redis Schemas
│
├── migrations/                       # Database Migrations
│   ├── versions/                     # Migration Versions
│   └── rollback/                     # Rollback Scripts
│
├── seeds/                            # Seed Data
│   ├── development/                  # Development Data
│   ├── staging/                      # Staging Data
│   └── production/                   # Production Data
│
├── backups/                          # Backup Scripts
│   ├── automated/                    # Automated Backups
│   ├── manual/                       # Manual Backups
│   └── restore/                      # Restore Scripts
│
└── etl/                              # ETL Processes
    ├── extract/                      # Data Extraction
    ├── transform/                    # Data Transformation
    └── load/                         # Data Loading
```

---

### 5️⃣ KNOWLEDGE LAYER (`docs/`)

**Purpose**: Documentation and knowledge base  
**Classification**: Official Use  
**Backup Frequency**: Weekly

```
docs/
│
├── technical/                        # Technical Documentation
│   ├── architecture/                 # System Architecture
│   │   ├── overview.md
│   │   ├── backend_architecture.md
│   │   ├── frontend_architecture.md
│   │   ├── ai_architecture.md
│   │   └── integration_architecture.md
│   ├── api/                          # API Documentation
│   │   ├── rest_api.md
│   │   ├── endpoints/
│   │   └── authentication.md
│   ├── database/                     # Database Documentation
│   │   ├── schema_design.md
│   │   ├── entity_relationship.md
│   │   └── optimization.md
│   └── deployment/                   # Deployment Guides
│       ├── installation.md
│       ├── configuration.md
│       └── troubleshooting.md
│
├── operational/                      # Operations Manuals
│   ├── user_manual.md                # End User Manual
│   ├── admin_manual.md               # Administrator Manual
│   ├── maintenance.md                # Maintenance Guide
│   └── incident_response.md          # Incident Response
│
├── compliance/                       # Compliance Documents
│   ├── data_protection.md            # Data Protection
│   ├── privacy_policy.md             # Privacy Policy
│   ├── security_standards.md         # Security Standards
│   └── audit_procedures.md           # Audit Procedures
│
├── training/                         # Training Materials
│   ├── officer_training.md           # Police Officer Training
│   ├── admin_training.md             # Admin Training
│   ├── videos/                       # Training Videos
│   └── presentations/                # Training Presentations
│
├── governance/                       # Governance Documents
│   ├── project_charter.md            # Project Charter
│   ├── stakeholder_register.md       # Stakeholder Register
│   ├── risk_register.md              # Risk Register
│   └── change_management.md          # Change Management
│
└── reports/                          # Project Reports
    ├── status_reports/               # Status Reports
    ├── milestone_reports/            # Milestone Reports
    └── final_report.md               # Final Project Report
```

---

### 6️⃣ QUALITY ASSURANCE LAYER (`tests/`)

**Purpose**: Testing and quality assurance  
**Classification**: Internal  
**Backup Frequency**: Weekly

```
tests/
│
├── unit/                             # Unit Tests
│   ├── backend/                      # Backend Unit Tests
│   │   ├── api/
│   │   ├── services/
│   │   └── utils/
│   └── frontend/                     # Frontend Unit Tests
│       ├── admin/
│       └── user/
│
├── integration/                      # Integration Tests
│   ├── api_integration/              # API Integration
│   ├── database_integration/         # Database Integration
│   └── service_integration/          # Service Integration
│
├── e2e/                              # End-to-End Tests
│   ├── scenarios/                    # Test Scenarios
│   │   ├── officer_workflow.spec.ts
│   │   ├── citizen_workflow.spec.ts
│   │   └── admin_workflow.spec.ts
│   └── fixtures/                     # Test Fixtures
│
├── security/                         # Security Tests
│   ├── penetration/                  # Penetration Tests
│   ├── vulnerability/                # Vulnerability Scans
│   └── compliance/                   # Compliance Tests
│
├── performance/                      # Performance Tests
│   ├── load_tests/                   # Load Testing
│   ├── stress_tests/                 # Stress Testing
│   └── benchmarks/                   # Performance Benchmarks
│
└── acceptance/                       # User Acceptance Tests
    ├── test_plans/                   # Test Plans
    ├── test_cases/                   # Test Cases
    └── results/                      # Test Results
```

---

### 7️⃣ AUTOMATION LAYER (`scripts/`)

**Purpose**: Automation and utility scripts  
**Classification**: Internal  
**Backup Frequency**: Weekly

```
scripts/
│
├── deployment/                       # Deployment Scripts
│   ├── deploy_production.sh
│   ├── deploy_staging.sh
│   └── rollback.sh
│
├── maintenance/                      # Maintenance Scripts
│   ├── database_cleanup.py
│   ├── log_rotation.sh
│   └── cache_clear.py
│
├── monitoring/                       # Monitoring Scripts
│   ├── health_check.py
│   ├── performance_monitor.py
│   └── alert_handler.py
│
├── data/                             # Data Management Scripts
│   ├── backup_database.sh
│   ├── restore_database.sh
│   ├── seed_data.py
│   └── migrate_data.py
│
└── utilities/                        # Utility Scripts
    ├── setup_environment.sh
    ├── generate_ssl.sh
    └── validate_config.py
```

---

### 8️⃣ CONFIGURATION LAYER (`config/`)

**Purpose**: System configuration management  
**Classification**: Confidential  
**Backup Frequency**: Daily

```
config/
│
├── environments/                     # Environment Configs
│   ├── development.env
│   ├── staging.env
│   ├── production.env
│   └── testing.env
│
├── services/                         # Service Configurations
│   ├── backend.yml
│   ├── ai_service.yml
│   ├── database.yml
│   └── redis.yml
│
└── security/                         # Security Configurations
    ├── cors.yml
    ├── rate_limiting.yml
    └── authentication.yml
```

---

### 9️⃣ ANALYTICS LAYER (`reports/`)

**Purpose**: Reports and analytics  
**Classification**: Official Use  
**Backup Frequency**: Monthly

```
reports/
│
├── performance/                      # Performance Reports
│   ├── monthly/
│   ├── quarterly/
│   └── annual/
│
├── compliance/                       # Compliance Reports
│   ├── security_audits/
│   ├── data_protection/
│   └── system_audits/
│
├── incident/                         # Incident Reports
│   ├── security_incidents/
│   ├── system_outages/
│   └── data_breaches/
│
└── analytics/                        # Analytics Reports
    ├── violation_statistics/
    ├── fine_collection/
    └── system_usage/
```

---

### 🔟 GOVERNANCE LAYER (`governance/`)

**Purpose**: IT governance and compliance  
**Classification**: Confidential  
**Backup Frequency**: Monthly

```
governance/
│
├── policies/                         # IT Policies
│   ├── security_policy.md
│   ├── data_retention_policy.md
│   ├── acceptable_use_policy.md
│   └── incident_response_policy.md
│
├── standards/                        # Technical Standards
│   ├── coding_standards.md
│   ├── api_standards.md
│   ├── security_standards.md
│   └── documentation_standards.md
│
├── procedures/                       # Standard Operating Procedures
│   ├── deployment_procedure.md
│   ├── backup_procedure.md
│   ├── incident_handling.md
│   └── change_management.md
│
└── audits/                           # Audit Logs & Reports
    ├── internal_audits/
    ├── external_audits/
    └── compliance_audits/
```

---

## Security Classification

### Classification Levels

| Level | Description | Examples |
|-------|-------------|----------|
| **Public** | Can be shared openly | Public API docs, User guides |
| **Official Use** | For government use | Project reports, Operational docs |
| **Restricted** | Limited access | Source code, Configurations |
| **Confidential** | Highly sensitive | AI models, User data, Credentials |
| **Secret** | Top secret | Encryption keys, Security audits |

### Data Classification Matrix

| Directory | Classification | Access Level |
|-----------|---------------|--------------|
| `src/backend/` | Restricted | Developers, DevOps |
| `src/web/` | Restricted | Frontend Team |
| `src/services/` | Restricted | Service Team |
| `ai/models/` | Confidential | AI Team, Security |
| `ai/datasets/` | Confidential | AI Team |
| `infrastructure/` | Restricted | DevOps, SysAdmin |
| `data/` | Confidential | DBA, Authorized Staff |
| `docs/technical/` | Official Use | Technical Team |
| `docs/compliance/` | Confidential | Compliance Officer |
| `config/` | Confidential | DevOps, SysAdmin |
| `governance/` | Confidential | Management, Auditors |

---

## Access Control Matrix

### Role-Based Access

| Role | Source Code | AI Models | Infrastructure | Data | Docs | Config |
|------|-------------|-----------|----------------|------|------|--------|
| **System Admin** | ✅ Read | ✅ Read | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Developer** | ✅ Full | ❌ No | 📖 Read | 📖 Read | ✅ Full | 📖 Read |
| **AI Engineer** | 📖 Read | ✅ Full | ❌ No | 📖 Read | ✅ Full | 📖 Read |
| **DevOps** | ✅ Full | 📖 Read | ✅ Full | 📖 Read | ✅ Full | ✅ Full |
| **DBA** | ❌ No | ❌ No | 📖 Read | ✅ Full | ✅ Full | 📖 Read |
| **Security Officer** | 📖 Read | 📖 Read | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Auditor** | 📖 Read | 📖 Read | 📖 Read | 📖 Read | ✅ Full | 📖 Read |
| **Technical Writer** | ❌ No | ❌ No | ❌ No | ❌ No | ✅ Full | ❌ No |

**Legend:**  
✅ Full = Read + Write + Execute  
📖 Read = Read-only access  
❌ No = No access

---

## Compliance Checklist

### ✅ Government IT Standards Compliance

- [x] Follows Ministry IT Architecture Guidelines
- [x] Adheres to National Cybersecurity Framework
- [x] Implements Data Protection Requirements
- [x] Meets Accessibility Standards (WCAG 2.1)
- [x] Complies with Interoperability Standards
- [x] Follows Government Cloud Guidelines

### ✅ Security Requirements

- [x] Multi-factor Authentication (MFA)
- [x] Role-Based Access Control (RBAC)
- [x] End-to-End Encryption
- [x] Audit Logging
- [x] Data Backup & Recovery
- [x] Incident Response Plan
- [x] Penetration Testing
- [x] Vulnerability Management

### ✅ Documentation Requirements

- [x] System Architecture Documentation
- [x] API Documentation
- [x] User Manuals
- [x] Operations Manuals
- [x] Security Documentation
- [x] Compliance Documentation
- [x] Training Materials
- [x] Disaster Recovery Plan

---

## Version Control Strategy

### Branch Strategy

```
main/                     # Production-ready code
├── develop/              # Development integration
├── feature/*             # Feature branches
├── hotfix/*              # Emergency fixes
└── release/*             # Release candidates
```

### Commit Standards

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes
- **refactor**: Code refactoring
- **test**: Test additions/changes
- **chore**: Build/config changes

### Tag Convention

- **v1.0.0** - Major release
- **v1.1.0** - Minor release
- **v1.1.1** - Patch release
- **v1.0.0-rc1** - Release candidate

---

## Backup & Recovery Strategy

### Backup Schedule

| Component | Frequency | Retention | Priority |
|-----------|-----------|-----------|----------|
| Database | Hourly | 30 days | Critical |
| Source Code | Real-time (Git) | Permanent | Critical |
| AI Models | Weekly | 90 days | High |
| Configurations | Daily | 30 days | High |
| Logs | Daily | 90 days | Medium |
| Reports | Monthly | 1 year | Low |

### Recovery Time Objectives (RTO)

| System Component | RTO | RPO |
|------------------|-----|-----|
| Backend API | 1 hour | 1 hour |
| Web Applications | 2 hours | 4 hours |
| AI Services | 4 hours | 24 hours |
| Database | 30 minutes | 1 hour |

---

## Change Management Process

### 1. Change Request
- Submit change request form
- Classify change (Minor/Major/Emergency)
- Risk assessment

### 2. Review & Approval
- Technical review
- Security review
- Management approval

### 3. Implementation
- Development
- Testing
- Staging deployment
- User acceptance testing

### 4. Production Deployment
- Scheduled maintenance window
- Deployment execution
- Verification
- Rollback plan ready

### 5. Post-Implementation
- Documentation update
- Lessons learned
- Performance monitoring

---

## Contact Information

### Project Team

| Role | Contact |
|------|---------|
| **Project Manager** | pm@camtraffic.gov.kh |
| **Technical Lead** | tech-lead@camtraffic.gov.kh |
| **Security Officer** | security@camtraffic.gov.kh |
| **DevOps Lead** | devops@camtraffic.gov.kh |
| **Support** | support@camtraffic.gov.kh |

### Emergency Contacts

- **Security Incidents**: security-incident@camtraffic.gov.kh
- **System Outage**: ops-emergency@camtraffic.gov.kh
- **Data Breach**: dpo@camtraffic.gov.kh

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-07-23 | Technical Team | Initial government-standard structure |

---

**Classification**: Official Use  
**Distribution**: Project Team, Stakeholders  
**Next Review Date**: 2026-10-23

**Ministry of Public Works and Transport**  
**Kingdom of Cambodia**
