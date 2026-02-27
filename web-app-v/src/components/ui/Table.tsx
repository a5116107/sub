import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';
import { Skeleton } from './Skeleton';

export interface TableColumn<T> {
  key: string;
  title: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
  sorter?: boolean;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  rowKey?: keyof T | ((item: T) => string | number);
  emptyText?: string;
  onRowClick?: (item: T) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
}

export function Table<T>({
  columns,
  data = [],
  loading = false,
  rowKey,
  emptyText,
  onRowClick,
  pagination,
}: TableProps<T>) {
  const { t } = useTranslation('common');
  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];

  const getRowKey = (item: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(item);
    }
    if (rowKey) {
      return (item as Record<string, unknown>)[String(rowKey)] as string | number;
    }
    return index;
  };

  const getAlignClass = (align?: string) => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 0;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full rounded-lg overflow-hidden">
        <thead>
          <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/65">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  py-3 px-4 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider
                  ${getAlignClass(col.align)}
                `}
                style={{ width: col.width }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--border-color-subtle)]">
                {columns.map((_col, j) => (
                  <td key={j} className="py-3 px-4">
                    <Skeleton height={20} />
                  </td>
                ))}
              </tr>
            ))
          ) : safeData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-[var(--text-muted)]"
              >
                {emptyText || t('table.noData')}
              </td>
            </tr>
          ) : (
            safeData.map((item, index) => (
              <tr
                key={getRowKey(item, index)}
                className={`
                  border-b border-[var(--border-color-subtle)]
                  ${onRowClick ? 'cursor-pointer hover:bg-[var(--accent-soft)]/55' : ''}
                  transition-colors
                `}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`
                      py-3 px-4 text-sm text-[var(--text-secondary)]
                      ${getAlignClass(col.align)}
                    `}
                  >
                    {col.render
                      ? col.render(item, index)
                      : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
          <div className="text-sm text-[var(--text-muted)]">
            {t('table.showing', {
              start: (pagination.current - 1) * pagination.pageSize + 1,
              end: Math.min(pagination.current * pagination.pageSize, pagination.total),
              total: pagination.total,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onChange(1)}
              disabled={pagination.current === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onChange(pagination.current - 1)}
              disabled={pagination.current === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-[var(--text-secondary)] px-2">
              {t('table.page', { current: pagination.current, total: totalPages })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onChange(pagination.current + 1)}
              disabled={pagination.current === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onChange(totalPages)}
              disabled={pagination.current === totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
