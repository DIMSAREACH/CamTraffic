"""
Enterprise multi-domain API namespaces.

Mounts under /api/v1/admin/, /api/v1/officer/, /api/v1/citizen/

These facades wrap existing domain resources with role-aligned entry points
for thesis architecture (Administration / Traffic Operations / Citizen Service).
Legacy flat URLs (/api/v1/fines/, /api/v1/violations/, …) remain for compatibility.
"""
