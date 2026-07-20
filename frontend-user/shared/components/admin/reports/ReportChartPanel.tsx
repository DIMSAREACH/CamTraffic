import type { ReactNode } from 'react';

export type ReportChartAccent = 'teal' | 'violet' | 'rose' | 'blue' | 'amber';

export function ReportChartPanel({
  title,
  icon,
  accent,
  children,
}: {
  title: string;
  icon: ReactNode;
  accent: ReportChartAccent;
  children: ReactNode;
}) {
  return (
    <div className="enforcement-page__panel reports-page__panel">
      <div className={`reports-page__chart-head reports-page__chart-head--${accent}`}>
        <div className={`reports-page__chart-icon reports-page__chart-icon--${accent}`}>
          {icon}
        </div>
        <h3 className="reports-page__chart-title">{title}</h3>
      </div>
      <div className="reports-page__chart-body">{children}</div>
    </div>
  );
}

export function ReportMiniStat({
  label,
  value,
  variant,
}: {
  label: string;
  value: string | number;
  variant: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet' | 'teal';
}) {
  return (
    <div className={`reports-page__mini-stat reports-page__mini-stat--${variant}`}>
      <p className="reports-page__mini-stat-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="reports-page__mini-stat-label">{label}</p>
    </div>
  );
}
