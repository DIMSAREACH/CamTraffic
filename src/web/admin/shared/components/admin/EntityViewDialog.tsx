import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { useLanguage } from '@shared/context/LanguageContext';

const ACCENT_ICON: Record<string, string> = {
  blue: 'enforcement-page__dialog-icon--primary',
  teal: 'enforcement-page__dialog-icon--teal',
  violet: 'enforcement-page__dialog-icon--violet',
  amber: 'enforcement-page__dialog-icon--amber',
  rose: 'enforcement-page__dialog-icon--rose',
  success: 'enforcement-page__dialog-icon--teal',
  danger: 'enforcement-page__dialog-icon--rose',
};

const ACCENT_GRID: Record<string, string> = {
  blue: 'blue',
  teal: 'teal',
  violet: 'violet',
  amber: 'amber',
  rose: 'rose',
  success: 'teal',
  danger: 'rose',
};

export function EntityDetailField({
  label,
  value,
  wide,
}: {
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`entity-detail-field${wide ? ' entity-detail-field--wide' : ''}`}>
      <span className="entity-detail-field__label">{label}</span>
      <div className="entity-detail-field__value">{value ?? '—'}</div>
    </div>
  );
}

type EntityViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onEdit?: () => void;
  accent?: 'blue' | 'teal' | 'violet' | 'amber' | 'rose' | 'success' | 'danger';
};

export function EntityViewDialog({
  open,
  onOpenChange,
  title,
  children,
  onEdit,
  accent = 'blue',
}: EntityViewDialogProps) {
  const { t } = useLanguage();
  const iconClass = ACCENT_ICON[accent] ?? ACCENT_ICON.blue;
  const gridAccent = ACCENT_GRID[accent] ?? 'blue';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent accent={accent} className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="users-page__dialog-header">
            <div className={`enforcement-page__dialog-icon ${iconClass}`}>
              <Eye size={15} aria-hidden />
            </div>
            <span className="enforcement-page__dialog-title">{title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className={`entity-detail-grid entity-detail-grid--${gridAccent}`}>{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
          {onEdit ? (
            <Button onClick={() => { onOpenChange(false); onEdit(); }}>{t('common.edit')}</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
