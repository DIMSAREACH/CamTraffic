"""Run TS-03 accuracy evaluation (delegates to scripts/run_ts03_accuracy_eval.py)."""
import subprocess
import sys
from pathlib import Path

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Evaluate AI sign detection accuracy on held-out val + reference images (TS-03)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-samples',
            type=int,
            default=5,
            help='Minimum held-out validation images required (default: 5)',
        )

    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[4]
        script = root / 'scripts' / 'run_ts03_accuracy_eval.py'
        if not script.is_file():
            self.stderr.write(self.style.ERROR(f'Script not found: {script}'))
            sys.exit(1)

        cmd = [sys.executable, str(script), '--min-samples', str(options['min_samples'])]
        self.stdout.write(f'Running: {" ".join(cmd)}')
        result = subprocess.run(cmd, cwd=str(root), check=False)
        if result.returncode != 0:
            sys.exit(result.returncode)
        self.stdout.write(self.style.SUCCESS('Evidence written to docs/thesis_evidence/TS-03/'))
