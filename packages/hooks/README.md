# @camtraffic/hooks

Reusable React hooks for CamTraffic portals.

## Hooks

| Hook | Description |
|------|-------------|
| `useToggle` | Boolean toggle with setter |
| `useDebounce` | Debounce a value |
| `useLocalStorage` | Persist state in localStorage |
| `useAsync` | Run async tasks with loading/error/data state |
| `usePagination` | Page, page size, and offset helpers |

```ts
import { useAsync, useDebounce, useLocalStorage, usePagination } from '@camtraffic/hooks';

const { data, loading, error, run } = useAsync<User[]>();
const { page, pageSize, offset, nextPage, previousPage } = usePagination(20);
```
