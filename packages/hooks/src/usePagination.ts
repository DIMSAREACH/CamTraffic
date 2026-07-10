import { useMemo, useState } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  offset: number;
}

export function usePagination(initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pagination = useMemo<PaginationState>(
    () => ({
      page,
      pageSize,
      offset: (page - 1) * pageSize,
    }),
    [page, pageSize],
  );

  return {
    ...pagination,
    setPage,
    setPageSize,
    nextPage: () => setPage((current) => current + 1),
    previousPage: () => setPage((current) => Math.max(1, current - 1)),
    resetPage: () => setPage(1),
  };
}
