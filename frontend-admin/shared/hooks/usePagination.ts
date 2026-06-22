import { useState, useEffect, useCallback } from 'react';

const SIGN_GRID_COL_BREAKPOINTS = [
  { mq: '(min-width: 1024px)', cols: 5 },
  { mq: '(min-width: 768px)', cols: 4 },
  { mq: '(min-width: 640px)', cols: 3 },
  { mq: '(min-width: 0px)', cols: 2 },
] as const;

/** Page size for sign card grid: 2 rows × current column count. */
export function useSignGridPageSize(rows = 2): number {
  const readCols = useCallback(() => {
    if (typeof window === 'undefined') return 5;
    for (const { mq, cols } of SIGN_GRID_COL_BREAKPOINTS) {
      if (window.matchMedia(mq).matches) return cols;
    }
    return 2;
  }, []);

  const [cols, setCols] = useState(readCols);

  useEffect(() => {
    const update = () => setCols(readCols());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [readCols]);

  return cols * rows;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
}

export interface UsePaginationReturn<T> extends PaginationState {
  pageItems: T[];
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
}

export function usePagination<T>(
  items: T[],
  defaultPageSize = 10,
): UsePaginationReturn<T> {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  useEffect(() => {
    setPageSizeRaw(defaultPageSize);
  }, [defaultPageSize]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Reset to page 1 when items or pageSize changes
  useEffect(() => {
    setPageRaw(1);
  }, [items.length, pageSize]);

  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const pageItems = items.slice(from - 1, to);

  const setPage = (p: number) => setPageRaw(Math.max(1, Math.min(p, totalPages)));
  const setPageSize = (s: number) => { setPageSizeRaw(s); setPageRaw(1); };

  return { page: safePage, pageSize, total, totalPages, from, to, pageItems, setPage, setPageSize };
}
