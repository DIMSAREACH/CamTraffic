# Fines App

> **Phase 4/6** · Tasks **078–079, 101**

## Overview

Fine issuance and payment APIs.

## Folder

`backend/apps/fines/`

## Structure

```text
backend/apps/fines/
├── README.md
├── models.py
├── serializers.py
├── services.py
├── views.py
└── urls.py
```

## Driver Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/fines/driver/mine/` | List driver's fines |
| `GET` | `/api/v1/fines/driver/mine/<id>/` | Fine detail |
| `POST` | `/api/v1/fines/driver/mine/<id>/pay/` | Pay unpaid/overdue fine |
| `GET` | `/api/v1/fines/driver/payments/` | List payment history |
| `GET` | `/api/v1/fines/driver/payments/<id>/` | Payment receipt detail |

## Related Tasks

| Task | Status |
|------|--------|
| Task 067 | ✅ Fine issuance on violation approval |
| Task 078 | ✅ Driver fine management and payment |
| Task 079 | ✅ Driver payment history |
| Task 101 | ✅ Fine API |

## Status

- [x] Driver fine list/detail/pay endpoints
- [x] Driver payment history list/detail endpoints

## Notes

- Fines are created when officers approve violations (Task 067).
- Payment records are stored in `FinePayment` for history (Task 079).
