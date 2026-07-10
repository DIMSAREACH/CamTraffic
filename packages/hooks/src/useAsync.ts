import { useCallback, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const run = useCallback(async (task: () => Promise<T>) => {
    setState({ data: null, error: null, loading: true });
    try {
      const data = await task();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setState({ data: null, error: message, loading: false });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return { ...state, run, reset };
}
