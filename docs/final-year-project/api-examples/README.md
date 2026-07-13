# API Examples — Phase 11 Integration

## Health

```bash
curl http://127.0.0.1:8000/api/health/
```

## Login

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

## AI detect (image upload)

```bash
curl -X POST http://127.0.0.1:8000/api/ai/detect/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@ai/test_samples/car_with_plate_2A-1234.jpg" \
  -F "auto_create_violation=true"
```

## Process frame (camera)

```bash
curl -X POST http://127.0.0.1:8000/api/ai/process-frame/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "camera_id=<uuid>" \
  -F "auto_create_violation=true"
```

## Live camera status

```bash
curl http://127.0.0.1:8000/api/cameras/live-status/ \
  -H "Authorization: Bearer $TOKEN"
```

## Admin dashboard stats

```bash
curl http://127.0.0.1:8000/api/dashboard/admin/ \
  -H "Authorization: Bearer $TOKEN"
```

## Notifications (driver)

```bash
curl http://127.0.0.1:8000/api/notifications/ \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```
