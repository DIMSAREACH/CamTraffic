# @camtraffic/api

Typed HTTP client for the CamTraffic Django REST API.

## Usage

```ts
import { createCamTrafficApi } from '@camtraffic/api';

const api = createCamTrafficApi({
  baseUrl: 'http://localhost:8000',
  getAccessToken: () => localStorage.getItem('camtraffic_access_token'),
});

await api.auth.login({ email, password });
await api.users.list({ page: 1 });
await api.dashboard.admin.stats();
```

## Modules

- `client` — `ApiClient` with GET/POST/PUT/PATCH/DELETE
- `endpoints/*` — 23 typed endpoint factories (auth, users, cameras, violations, …)
- `interceptors` — auth token helpers, error parsing

Full endpoint catalog: [packages/docs/API-CLIENT.md](../docs/API-CLIENT.md)
