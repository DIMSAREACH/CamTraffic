# CamTraffic Project Restructuring Plan

## Current Issues

### 1. **Duplicated Folders**
- `AI_Traffic_System_Dataset/` - Separate dataset project with duplicate scripts, docs
- `ai/dataset/`, `ai/dataset_10/`, `ai/datasets/` - Multiple dataset folders
- `ai/runs/` and `runs/` - Training outputs scattered
- Duplicate docs in multiple locations
- Duplicate scripts in multiple locations

### 2. **Poor Organization**
- Weight files at root level (`yolo11n.pt`, `yolov8n.pt`)
- Temporary debug files at root (`tmp_debug_ai.py`)
- Multiple frontend folders without clear hierarchy
- Services scattered (`ai_service/`, `mobile_api/`, `services/`)
- Mixed content in `ai/` folder (data + models + scripts + runs)

### 3. **Too Many Root-Level Folders**
Current: 23 folders at root level (excessive)

---

## Government-Standard Structure

```
CamTraffic/
├── src/                          # All source code
│   ├── backend/                  # Django REST API
│   ├── web/                      # All web applications
│   │   ├── admin/                # Admin portal
│   │   ├── user/                 # Police & driver portal
│   │   └── citizen/              # Citizen PWA (Enterprise v2)
│   └── services/                 # All microservices
│       ├── ai-service/           # Thesis AI service (FastAPI)
│       ├── ai-vision/            # Enterprise AI vision
│       ├── ocr-service/          # OCR/ANPR service
│       ├── mobile-api/           # Mobile REST API
│       └── stream-gateway/       # RTSP ingest (Enterprise v2)
│
├── ai/                           # AI/ML components (consolidated)
│   ├── datasets/                 # All datasets
│   │   ├── raw/                  # Raw/source data
│   │   ├── processed/            # Processed datasets
│   │   └── annotations/          # Annotation files
│   ├── models/                   # Trained model files (.pt, .onnx)
│   ├── weights/                  # Pre-trained weights
│   ├── training/                 # Training configurations
│   │   ├── configs/              # Training configs
│   │   └── runs/                 # Training run outputs
│   └── scripts/                  # AI utility scripts
│       ├── train.py
│       ├── evaluate.py
│       └── ...
│
├── infrastructure/               # Deployment & infrastructure
│   ├── docker/                   # Docker configurations
│   ├── kubernetes/               # K8s manifests (if needed)
│   ├── ssl/                      # SSL certificates
│   └── scripts/                  # Deployment scripts
│
├── tests/                        # All tests
│   ├── e2e/                      # End-to-end tests
│   ├── integration/              # Integration tests
│   ├── unit/                     # Unit tests
│   └── security/                 # Security tests
│
├── docs/                         # All documentation
│   ├── architecture/             # Architecture docs
│   ├── api/                      # API documentation
│   ├── deployment/               # Deployment guides
│   ├── enterprise/               # Enterprise v2 specs
│   └── thesis/                   # Thesis documents
│
├── scripts/                      # Project utility scripts
│   ├── setup/                    # Setup scripts
│   ├── validation/               # Validation scripts
│   └── data/                     # Data management scripts
│
├── packages/                     # Shared libraries (@camtraffic/*)
│
├── .github/                      # GitHub workflows
├── .vscode/                      # VS Code settings
├── node_modules/                 # Dependencies (gitignored)
├── .gitignore
├── docker-compose.yml
├── package.json
├── README.md
├── LICENSE
└── ... (root config files only)
```

---

## Migration Actions

### Phase 1: Consolidate AI Components

1. **Merge `AI_Traffic_System_Dataset/` → `ai/`**
   - Move useful scripts from `AI_Traffic_System_Dataset/scripts/` to `ai/scripts/`
   - Consolidate datasets into `ai/datasets/`
   - Merge documentation into `docs/ai/`
   - **DELETE** `AI_Traffic_System_Dataset/` folder

2. **Organize AI folder**
   - Consolidate `ai/dataset/`, `ai/dataset_10/`, `ai/datasets/` → `ai/datasets/`
   - Move `ai/runs/` → `ai/training/runs/`
   - Move `ai/weights/` content to single location
   - Move model files to `ai/models/`

3. **Clean up root**
   - Move `yolo11n.pt`, `yolov8n.pt` → `ai/weights/pretrained/`
   - DELETE `tmp_debug_ai.py`
   - DELETE standalone `runs/` folder

### Phase 2: Reorganize Source Code

4. **Create `src/` directory**
   - Move `backend/` → `src/backend/`
   - Move `packages/` → `src/packages/` (optional, can stay at root for monorepo)

5. **Consolidate Frontends → `src/web/`**
   - Move `frontend-admin/` → `src/web/admin/`
   - Move `frontend-user/` → `src/web/user/`
   - Move `apps/citizen/` → `src/web/citizen/`
   - DELETE `frontend/` (if it's just a pointer)

6. **Consolidate Services → `src/services/`**
   - Move `ai_service/` → `src/services/ai-service/`
   - Move `mobile_api/` → `src/services/mobile-api/`
   - Move `services/ai-vision-service/` → `src/services/ai-vision/`
   - Move `services/ocr-service/` → `src/services/ocr-service/`
   - Move `services/stream-gateway/` → `src/services/stream-gateway/`
   - DELETE old `services/` folder

### Phase 3: Reorganize Infrastructure

7. **Rename `deploy/` → `infrastructure/`**
   - Move `deploy/` → `infrastructure/`
   - Organize into `infrastructure/docker/`, `infrastructure/ssl/`, etc.

8. **Consolidate Scripts**
   - Keep `scripts/` at root for project-level utilities
   - Move deployment scripts to `infrastructure/scripts/`
   - Move AI scripts to `ai/scripts/`

### Phase 4: Clean Up & Documentation

9. **Remove Duplicates & Unused Files**
   - Remove duplicate README files
   - Remove duplicate documentation
   - Clean up `node_modules` if needed
   - Clean `.venv` if needed

10. **Update All Path References**
    - Update `package.json` scripts
    - Update `docker-compose.yml` paths
    - Update import statements in code
    - Update documentation references

11. **Update Documentation**
    - Update main `README.md`
    - Update `docs/FOLDER-MAP.md`
    - Create `MIGRATION-GUIDE.md`
    - Update all absolute paths in docs

---

## Files to DELETE

- `AI_Traffic_System_Dataset/` (entire folder after merging useful content)
- `tmp_debug_ai.py`
- `runs/` (standalone folder at root)
- `frontend/` (if it's just a README pointer)
- Duplicate `pipeline/` and `scripts/` folders in AI_Traffic_System_Dataset
- Duplicate docs folders
- Old training run outputs (keep only recent/important ones)

---

## Benefits

1. **Clear Separation**: Source code, AI components, infrastructure clearly separated
2. **Reduced Clutter**: From 23+ root folders to ~10 organized folders
3. **Government Standard**: Follows enterprise project structure standards
4. **Easier Navigation**: Logical grouping makes finding files easier
5. **Better Scalability**: Structure supports future growth
6. **Cleaner Git Status**: Less confusion with untracked files

---

## Estimated Impact

- **Folders to Move**: ~20 folders
- **Folders to Delete**: ~10 folders/files
- **Files to Update**: ~15 configuration files
- **Risk Level**: Medium (requires careful path updates)
- **Rollback**: Git allows easy rollback if needed

---

## Next Steps

1. Review and approve this plan
2. Create backup branch
3. Execute phase-by-phase
4. Test after each phase
5. Update all team members on new structure
