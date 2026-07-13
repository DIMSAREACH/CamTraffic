import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UsePaginationReturn } from '@shared/hooks/usePagination';
import { useLanguage } from '@shared/context/LanguageContext';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface TablePaginationProps<T> {
  pagination: UsePaginationReturn<T>;
  /** i18n key under pagination.label.* */
  labelKey?: string;
  variant?: 'default' | 'footer';
}

export function TablePagination<T>({
  pagination,
  labelKey = 'pagination.label.records',
  variant = 'default',
}: TablePaginationProps<T>) {
  const { t } = useLanguage();
  const { page, pageSize, total, totalPages, from, to, setPage, setPageSize } = pagination;
  const label = t(labelKey);
  const isFooter = variant === 'footer';

  if (total === 0) return null;

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
    <div
      className={`table-pagination ${isFooter ? 'table-pagination--footer' : ''}`}
      role="navigation"
      aria-label={t('pagination.aria')}
    >
      <div className="table-pagination__row">
        <div className="table-pagination__show">
          <span className="table-pagination__show-label">{t('pagination.show')}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="ct-native-select ct-native-select--sm table-pagination__select"
            aria-label={t('pagination.show')}
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="table-pagination__end">
          <div className="table-pagination__pages">
            <p className="table-pagination__page-label">
              {t('pagination.pageOf', { page, totalPages })}
            </p>
            <nav className="table-pagination__nav" aria-label={t('pagination.aria')}>
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                aria-label={t('pagination.prev')}
                className="table-pagination__btn"
              >
                <ChevronLeft size={15} />
              </button>

              {pageNumbers().map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="table-pagination__ellipsis" aria-hidden>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    aria-label={t('pagination.pageOf', { page: p, totalPages })}
                    className={`table-pagination__page ${p === page ? 'table-pagination__page--active' : ''}`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                aria-label={t('pagination.next')}
                className="table-pagination__btn"
              >
                <ChevronRight size={15} />
              </button>
            </nav>
          </div>

          <span className="table-pagination__divider" aria-hidden />

          <p className="table-pagination__range">
            {t('pagination.range', { from, to, total, label })}
          </p>
        </div>
      </div>
    </div>
  );
}
