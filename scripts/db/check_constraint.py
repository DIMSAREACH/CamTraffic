#!/usr/bin/env python3
"""Check which table has the license_no unique constraint."""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'camtraffic.settings')
django.setup()

from django.db import connection

# Query PostgreSQL to find the constraint
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT 
            conname AS constraint_name,
            conrelid::regclass AS table_name,
            a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        WHERE conname LIKE '%license%';
    """)
    
    results = cursor.fetchall()
    print("\nConstraints with 'license' in name:")
    for row in results:
        print(f"  - Constraint: {row[0]}")
        print(f"    Table: {row[1]}")
        print(f"    Column: {row[2]}")
        print()
