import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UsePaginationReturn } from '@shared/hooks/usePagination';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface TablePaginationProps<T> {
  pagination: UsePaginationReturn<T>;
  label?: string;
}

export function TablePagination<T>({ pagination, label = 'records' }: TablePaginationProps<T>) {
  const { page, pageSize, total, totalPages, from, to, setPage, setPageSize } = pagination;

  if (total === 0) return null;

  // Build page number list with ellipsis
  function pageNumbers(): (number | 'ellipsis')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (page > 4) pages.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 3) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 pt-4 pb-1 border-t border-border">
      {/* Show per page */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 py-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Page buttons */}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
        </button>

        {pageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`h-8 min-w-8 px-2 flex items-center justify-center rounded-md text-sm font-medium border transition-colors ${
                p === page
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'border-input bg-background hover:bg-muted text-foreground'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </nav>

      {/* Range info */}
      <p className="text-sm text-muted-foreground whitespace-nowrap">
        View {from} – {to} of {total} {label}
      </p>
    </div>
  );
}
