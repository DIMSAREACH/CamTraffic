import { useEffect, useState } from 'react';
import { Card, useTranslation } from '@camtraffic/ui';
import type { LoginHistoryRecord } from '@camtraffic/types';

interface LoginHistoryCardProps {
  onLoad: () => Promise<LoginHistoryRecord[]>;
}

export function LoginHistoryCard({ onLoad }: LoginHistoryCardProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<LoginHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onLoad()
      .then((data) => {
        setRecords(data);
        setErrorMessage(null);
      })
      .catch(() => setErrorMessage(t.errors.generic))
      .finally(() => setIsLoading(false));
  }, [onLoad, t.errors.generic]);

  return (
    <Card title="Login History" subtitle="Task 023 — Audit Login History">
      {isLoading ? <p>{t.common.loading}</p> : null}
      {errorMessage ? <p className="auth-form__error">{errorMessage}</p> : null}
      {!isLoading && !errorMessage ? (
        <div className="audit-log-list">
          {records.length === 0 ? (
            <p className="auth-form__hint">No login records yet.</p>
          ) : (
            records.map((record) => (
              <article className="audit-log-item" key={record.id}>
                <p>
                  <strong>{record.user_full_name}</strong> ({record.user_email})
                </p>
                <p>
                  Status:{' '}
                  <strong>{record.success ? 'Success' : `Failed (${record.failure_reason || 'unknown'})`}</strong>
                </p>
                <p>IP: {record.ip_address || 'N/A'}</p>
                <p className="auth-form__hint">{new Date(record.created_at).toLocaleString()}</p>
              </article>
            ))
          )}
        </div>
      ) : null}
    </Card>
  );
}
