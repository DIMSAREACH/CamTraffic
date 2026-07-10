import { useEffect, type ReactNode } from 'react';
import { cn } from '@camtraffic/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  position?: 'left' | 'right';
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = 'right',
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="ct-drawer-overlay" onClick={onClose} />
      <aside
        className={cn('ct-drawer', `ct-drawer--${position}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        <div className="ct-drawer__header">
          {title ? (
            <h2 id="drawer-title" className="ct-drawer__title">
              {title}
            </h2>
          ) : null}
          <button
            type="button"
            className="ct-drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="ct-drawer__body">{children}</div>
        {footer ? <div className="ct-drawer__footer">{footer}</div> : null}
      </aside>
    </>
  );
}
