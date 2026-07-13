"""Drop and recreate camtraffic_db for a clean PostgreSQL migrate."""
import os
import sys

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

password = os.environ.get("DB_PASSWORD", "123456")
user = os.environ.get("DB_USER", "postgres")
host = os.environ.get("DB_HOST", "localhost")
port = os.environ.get("DB_PORT", "5432")
dbname = os.environ.get("DB_NAME", "camtraffic_db")

conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()
cur.execute(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
    "WHERE datname = %s AND pid <> pg_backend_pid()",
    (dbname,),
)
cur.execute(f'DROP DATABASE IF EXISTS "{dbname}"')
cur.execute(f'CREATE DATABASE "{dbname}"')
print(f"Database '{dbname}' recreated OK")
cur.close()
conn.close()
