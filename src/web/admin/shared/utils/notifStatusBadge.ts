import type { CSSProperties } from 'react';
import type { NotifDeliveryStatus } from '@shared/constants/notificationCatalog';

/** Status badge colors aligned with other enforcement tables. */
export function notifStatusBadgeStyle(status: NotifDeliveryStatus | 'active' | 'disabled'): CSSProperties {
  switch (status) {
    case 'delivered':
    case 'active':
      return { background: 'rgba(16,185,129,0.12)', color: '#059669' };
    case 'sent':
      return { background: 'rgba(37,99,235,0.12)', color: '#2563eb' };
    case 'read':
    case 'disabled':
      return { background: 'rgba(100,116,139,0.14)', color: '#475569' };
    case 'failed':
      return { background: 'rgba(239,68,68,0.12)', color: '#dc2626' };
    case 'scheduled':
      return { background: 'rgba(139,92,246,0.12)', color: '#7c3aed' };
    case 'pending':
    default:
      return { background: 'rgba(245,158,11,0.14)', color: '#d97706' };
  }
}
