import type { ReactNode } from 'react';
import { TableCell, TableRow } from '@shared/components/ui/table';

export type TableEmptyTone = 'appeals' | 'blue' | 'teal' | 'violet' | 'amber';

export interface TableEmptyAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface TableEmptyContentProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  tone?: TableEmptyTone;
  action?: TableEmptyAction;
}

export function TableEmptyContent({
  icon,
  title,
  subtitle,
  tone = 'appeals',
  action,
}: TableEmptyContentProps) {
  return (
    <div className="enforcement-page__table-empty-inner">
      <div className={`enforcement-page__empty-icon enforcement-page__empty-icon--${tone}`}>
        {icon}
      </div>
      <div className="enforcement-page__table-empty-copy">
        <p className="enforcement-page__empty-title enforcement-page__empty-title--panel">{title}</p>
        {subtitle ? <p className="enforcement-page__empty-subtitle">{subtitle}</p> : null}
      </div>
      {action ? (
        <button
          type="button"
          className={`enforcement-page__empty-action enforcement-page__empty-action--${tone}`}
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function TableEmptyState({
  colSpan,
  icon,
  title,
  subtitle,
  tone = 'appeals',
  action,
}: TableEmptyContentProps & { colSpan: number }) {
  return (
    <TableRow className="enforcement-page__table-empty-row">
      <TableCell colSpan={colSpan} className="enforcement-page__table-empty">
        <TableEmptyContent icon={icon} title={title} subtitle={subtitle} tone={tone} action={action} />
      </TableCell>
    </TableRow>
  );
}

export function EmptyStatePanel(props: TableEmptyContentProps & { className?: string }) {
  const { className, ...content } = props;
  return (
    <div className={`enforcement-page__empty-panel ${className ?? ''}`.trim()}>
      <TableEmptyContent {...content} />
    </div>
  );
}
