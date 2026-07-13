import type { ReactNode } from 'react';
import { DASHBOARD_PALETTE } from '@shared/constants/chartPalette';

const C = DASHBOARD_PALETTE;

export interface AIMlopsHeroStatus {
  label: string;
  value: string;
  color?: string;
}

interface AIMlopsHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  actions?: ReactNode;
  status?: AIMlopsHeroStatus[];
}

/** Header card matching Admin Dashboard welcome hero. */
export function AIMlopsHero({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  status = [],
}: AIMlopsHeroProps) {
  const orbColors = [C[8], C[6], C[5], C[2]];

  return (
    <header
      className="dashboard-welcome--hero admin-dashboard-hero ai-mlops-hero relative overflow-hidden rounded-3xl p-6 lg:p-7"
      style={{
        background: 'linear-gradient(135deg, #0B1220 0%, #1E1B4B 45%, #134E4A 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {orbColors.map((c, i) => (
        <div
          key={c.name}
          className="admin-dashboard-hero__orb"
          style={{
            background: `radial-gradient(circle, ${c.solid}55 0%, transparent 70%)`,
            top: i % 2 === 0 ? '-20%' : 'auto',
            bottom: i % 2 === 1 ? '-25%' : 'auto',
            left: `${8 + i * 14}%`,
            width: `${120 + i * 18}px`,
            height: `${120 + i * 18}px`,
          }}
          aria-hidden
        />
      ))}

      <div className="relative flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
            style={{ background: C[8].grad }}
          >
            <span className="text-white">{icon}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="dashboard-welcome__eyebrow text-xs font-bold uppercase tracking-[0.12em]"
                style={{ color: C[8].solid }}
              >
                {eyebrow}
              </span>
            </div>
            <h1 className="dashboard-welcome__title text-white text-xl lg:text-2xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="dashboard-welcome__meta mt-1.5 max-w-xl" style={{ color: 'rgba(148,163,184,0.85)' }}>
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {actions ? (
            <div className="ai-mlops-hero__actions flex flex-wrap gap-2">{actions}</div>
          ) : null}

          {status.length > 0 ? (
            <div className="flex gap-2.5 flex-wrap">
              {status.map((s, i) => {
                const color = s.color ?? C[[8, 5, 2, 6][i % 4]].solid;
                return (
                  <div
                    key={s.label}
                    className="dashboard-welcome__status-card px-3 py-2 rounded-xl text-center min-w-[7rem]"
                    style={{ borderTop: `2px solid ${color}`, background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                      />
                      <span className="dashboard-welcome__status-label">{s.label}</span>
                    </div>
                    <p className="dashboard-welcome__status-value">{s.value}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
