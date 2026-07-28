import { useCallback, useState } from 'react';

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return !value.trim();
  if (typeof value === 'number') return Number.isNaN(value);
  if (typeof value === 'boolean') return false;
  return false;
}

/**
 * Lightweight per-field error state for dialog forms (no react-hook-form required).
 */
export function useFieldErrors<T extends string>() {
  const [errors, setErrors] = useState<FieldErrors<T>>({});

  const clearErrors = useCallback(() => setErrors({}), []);

  const clearField = useCallback((key: T) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setFieldError = useCallback((key: T, message: string) => {
    setErrors((prev) => ({ ...prev, [key]: message }));
  }, []);

  /** Returns true when all checked fields pass. */
  const validateRequired = useCallback((
    values: Partial<Record<T, unknown>>,
    messages: Partial<Record<T, string>>,
  ) => {
    const next: FieldErrors<T> = {};
    (Object.keys(messages) as T[]).forEach((key) => {
      const message = messages[key];
      if (!message) return;
      if (isEmpty(values[key])) next[key] = message;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }, []);

  return {
    errors,
    setErrors,
    clearErrors,
    clearField,
    setFieldError,
    validateRequired,
    hasErrors: Object.keys(errors).length > 0,
  };
}
