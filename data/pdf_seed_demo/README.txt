PDF-based demo seed (JICA + MPWT Phnom Penh Urban Transport Plan).

Real location entities come from road/corridor/intersection names in the PDF text.
Private entities (drivers/vehicles/violations/fines/appeals/users) are synthetic but FK-consistent.

IMPORTANT — do not import the raw .sql files into production Postgres.
Fake password hashes in CSV/SQL will not allow login. Use the Django loader instead:

  npm run seed:complete
  # or step-by-step:
  npm run seed:demo -- --reset-passwords
  npm run seed:pdf

Schema mapping:
  intersections.csv  → Road(road_type='intersection', road_code=PP-INT-…)
  payments.*         → Fine.payment_* fields (no payments table in Django)
  police users       → Officer profiles (required for issue-fine flow)

Demo password for @camtraffic.demo accounts: CamTraffic@2026!
