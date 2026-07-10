# Fine Management & Payment History

> **Phase 4** · Tasks **078–079**

## Overview

Driver fine management, online payment, and payment history.

## Folder

`frontend-user/src/features/driver/fines/`

## Structure

```text
frontend-user/src/features/driver/fines/
├── README.md
├── index.ts
├── FinesTabs.tsx
├── DriverFinesPage.tsx
└── DriverPaymentHistoryPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/fines/driver/mine/` | List driver's fines |
| `GET` | `/api/v1/fines/driver/mine/<id>/` | Fine detail with violation context |
| `POST` | `/api/v1/fines/driver/mine/<id>/pay/` | Pay an unpaid or overdue fine |
| `GET` | `/api/v1/fines/driver/payments/` | List payment history |
| `GET` | `/api/v1/fines/driver/payments/<id>/` | Payment receipt detail |

## Routes

| Path | Page |
|------|------|
| `/driver/fines` | Fine management and payment |
| `/driver/fines/payments` | Payment history |

## Related Tasks

| Task | Status |
|------|--------|
| Task 067 | ✅ Fine issuance on violation approval |
| Task 078 | ✅ Fine management and payment |
| Task 079 | ✅ Payment history |

## Status

- [x] Backend driver fine list/detail/pay endpoints
- [x] Backend driver payment history endpoints
- [x] Shared types and API client
- [x] `DriverFinesPage` and `DriverPaymentHistoryPage` with tab navigation

## Notes

- Drivers can pay unpaid or overdue fines via cash, bank transfer, or mobile payment.
- Payment history shows receipts for completed payments.
