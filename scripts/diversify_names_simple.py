"""
Simple script to diversify violation driver names.
Run from Django shell
"""
import random

from violations.models import TrafficViolation

# Realistic Cambodian names
NAMES = [
    'Sokha Chan', 'Dara Kim', 'Srey Pov', 'Vanna Ly', 'Sophea Oum',
    'Ratana Kong', 'Bopha Chea', 'Piseth Heng', 'Chenda Sok', 'Rithy Mao',
    'Kunthea Tan', 'Narith Sam', 'Sreypov Keo', 'Virak Sim', 'Makara Chhin',
    'Sothea Prak', 'Reaksmey Nith', 'Channary Um', 'Pheakdey Yim', 'Soksan Chea',
    'Bunthoeun Hak', 'Chanmony Yun', 'Raksa Pech', 'Sopheak Nget', 'Vannak Hor',
]

print("Updating violation driver names...")

violations = TrafficViolation.objects.all()
total = violations.count()
print(f"Found {total} violations")

updated = 0
for v in violations:
    new_name = random.choice(NAMES)
    v.driver_name = new_name
    v.save(update_fields=['driver_name'])
    updated += 1
    if updated % 100 == 0:
        print(f"Updated {updated}/{total}...")

print(f"Updated {updated} violation records with diversified names")

from django.db.models import Count
name_counts = TrafficViolation.objects.values('driver_name').annotate(count=Count('id')).order_by('-count')[:10]
print("Name distribution:")
for item in name_counts:
    print(f"  {item['driver_name']}: {item['count']}")
