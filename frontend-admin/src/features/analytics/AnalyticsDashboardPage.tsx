import { useEffect, useState } from 'react';
import { Button, Card } from '@camtraffic/ui';
import type { AnalyticsDashboard } from '@camtraffic/types';

interface AnalyticsDashboardPageProps {
  onLoad: (params?: { days?: number }) => Promise<AnalyticsDashboard>;
}

function ChartPanel({ title, points, maxBarWidth = 100 }: { title: string; points: { label: string; value: number }[]; maxBarWidth?: number }) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <article className="dashboard-chart analytics-chart">
      <h4>{title}</h4>
      {points.map((point) => (
        <div className="dashboard-chart__row" key={`${title}-${point.label}`}>
          <span>{point.label.length > 10 ? point.label.slice(5) : point.label}</span>
          <div className="dashboard-chart__bar">
            <div
              className="dashboard-chart__fill"
              style={{ width: `${Math.min(maxBarWidth, (point.value / maxValue) * maxBarWidth)}%` }}
            />
          </div>
          <strong>{point.value}</strong>
        </div>
      ))}
    </article>
  );
}

function RankedList({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  return (
    <article className="analytics-ranked-list">
      <h4>{title}</h4>
      {items.length === 0 ? <p className="auth-form__hint">No data for this period.</p> : null}
      {items.map((item) => (
        <div className="analytics-ranked-list__item" key={`${title}-${item.label}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </article>
  );
}

export function AnalyticsDashboardPage({ onLoad }: AnalyticsDashboardPageProps) {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [periodDays, setPeriodDays] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(nextPeriodDays = periodDays) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({ days: Number(nextPeriodDays) });
      setAnalytics(data);
    } catch {
      setError('Unable to load analytics dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh('30');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card title="Analytics Dashboard" subtitle="Task 053 — Trends, breakdowns, and ranked insights">
      <div className="analytics-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Period</span>
          <select className="auth-form__select" value={periodDays} onChange={(event) => setPeriodDays(event.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh(periodDays)} isLoading={loading}>
          Refresh
        </Button>
      </div>

      {loading && !analytics ? <p className="auth-form__hint">Loading analytics...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}

      {analytics ? (
        <>
          <div className="dashboard-stats analytics-summary">
            <article className="dashboard-stats__item">
              <p>Violations</p>
              <strong>{analytics.total_violations}</strong>
            </article>
            <article className="dashboard-stats__item">
              <p>Detections</p>
              <strong>{analytics.total_detections}</strong>
            </article>
            <article className="dashboard-stats__item">
              <p>Fines issued</p>
              <strong>{analytics.total_fines}</strong>
            </article>
            <article className="dashboard-stats__item">
              <p>Fines collected</p>
              <strong>{analytics.fines_collected.toLocaleString()} KHR</strong>
            </article>
            <article className="dashboard-stats__item">
              <p>Outstanding fines</p>
              <strong>{analytics.fines_outstanding.toLocaleString()} KHR</strong>
            </article>
            <article className="dashboard-stats__item">
              <p>Avg confidence</p>
              <strong>{(analytics.average_detection_confidence * 100).toFixed(1)}%</strong>
            </article>
          </div>

          <div className="dashboard-charts analytics-charts">
            <ChartPanel title={`Violations by Day (${analytics.period_days}d)`} points={analytics.violations_by_day} />
            <ChartPanel title={`Detections by Day (${analytics.period_days}d)`} points={analytics.detections_by_day} />
            <ChartPanel title="Violations by Status" points={analytics.violations_by_status} />
            <ChartPanel title="Fines by Status" points={analytics.fines_by_status} />
            <ChartPanel title="Camera Status Breakdown" points={analytics.camera_status_breakdown} />
          </div>

          <div className="analytics-ranked-grid">
            <RankedList title="Top Traffic Signs" items={analytics.top_traffic_signs} />
            <RankedList title="Top Cameras" items={analytics.top_cameras} />
          </div>
        </>
      ) : null}
    </Card>
  );
}
