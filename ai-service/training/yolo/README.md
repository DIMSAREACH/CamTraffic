# YOLO Training (Task 131 / 143–144)

## Dataset config

- `dataset.template.yaml` — template for new datasets
- `dataset.yaml` — active unified CamTraffic config (Task 143)
- Build combined splits: `python data/datasets/scripts/build_combined_training_dataset.py --overwrite`

## Training script

```bash
cd ai-service
python training/yolo/train.py --data training/yolo/dataset.yaml --epochs 100 --name camtraffic-v1
```

## Output

Checkpoints are written under `ai-service/runs/detect/runs/yolo/<run-name>/weights/`.
Deploy with `training/integrate/deploy_models.py`.
