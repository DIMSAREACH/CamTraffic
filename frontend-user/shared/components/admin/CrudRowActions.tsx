import type { ReactNode } from 'react';
import { Download, Eye, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';

type CrudRowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
  children?: ReactNode;
  className?: string;
};

export function CrudRowActions({ onView, onEdit, onDelete, onDownload, children, className }: CrudRowActionsProps) {
  const { t } = useLanguage();
  return (
    <div className={`crud-actions${className ? ` ${className}` : ''}`}>
      {onView ? (
        <button type="button" className="crud-actions__btn crud-actions__btn--view" onClick={onView} aria-label={t('common.view')} title={t('common.view')}>
          <Eye size={13} />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className="crud-actions__btn crud-actions__btn--edit" onClick={onEdit} aria-label={t('common.edit')} title={t('common.edit')}>
          <Pencil size={13} />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="crud-actions__btn crud-actions__btn--delete" onClick={onDelete} aria-label={t('common.delete')} title={t('common.delete')}>
          <Trash2 size={13} />
        </button>
      ) : null}
      {onDownload ? (
        <button
          type="button"
          className="crud-actions__btn crud-actions__btn--download"
          onClick={onDownload}
          aria-label={t('common.download')}
          title={t('common.download')}
        >
          <Download size={13} />
        </button>
      ) : null}
      {children}
    </div>
  );
}
