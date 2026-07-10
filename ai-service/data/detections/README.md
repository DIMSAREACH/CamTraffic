# Detection result storage

JSON detection records written by the AI pipeline are stored here.

Each pipeline run with `store=true` creates one `{uuid}.json` file containing
preprocessing metadata, YOLO detections, OCR plate text, and timing data.

Configure the directory with `AI_STORAGE_PATH` (default: `data/detections`).
