#!/usr/bin/env python3
"""Create a violation directly using Django ORM for testing."""
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')

import django
django.setup()

from users.models import Driver
from violations.services import evaluate_violation, create_violation_record

def main():
    # pick first driver
    driver = Driver.objects.first()
    if not driver:
        print('No driver in DB')
        return
    print('Using driver:', driver.id, driver.license_no)

    # Create an evaluation for NO_U_TURN
    evaluation = evaluate_violation(class_key='NO_U_TURN', observed_action='U_TURN', sign_code='R1_03')
    if not evaluation:
        print('Evaluation returned no match for rule')
        return
    violation = create_violation_record(driver=driver, evaluation=evaluation, location='Direct script test', status='pending_review')
    print('Created violation id:', violation.id)

if __name__ == '__main__':
    main()
