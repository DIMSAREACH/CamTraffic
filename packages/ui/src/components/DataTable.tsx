import { useState, type ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = sortColumn
    ? [...data].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        const modifier = sortDirection === 'asc' ? 1 : -1;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * modifier;
        }
        
        return (aVal > bVal ? 1 : -1) * modifier;
      })
    : data;

  return (
    <div className={cn('ct-data-table', className)}>
      <table className="ct-data-table__table">
        <thead className="ct-data-table__thead">
          <tr className="ct-data-table__row">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'ct-data-table__th',
                  column.sortable && 'ct-data-table__th--sortable',
                )}
                style={{ width: column.width }}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div className="ct-data-table__th-content">
                  {column.header}
                  {column.sortable && sortColumn === column.key ? (
                    <span className="ct-data-table__sort-icon">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="ct-data-table__tbody">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="ct-data-table__loading">
                Loading...
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="ct-data-table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'ct-data-table__row',
                  onRowClick && 'ct-data-table__row--clickable',
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className="ct-data-table__td">
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
