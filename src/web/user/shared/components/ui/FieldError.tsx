import { cn } from './utils';

type FieldErrorProps = {
  message?: string | null;
  className?: string;
};

/** Inline required / validation message under a dialog form field. */
export function FieldError({ message, className }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className={cn('ct-field-error', className)} role="alert">
      {message}
    </p>
  );
}

type FormBannerProps = {
  message?: string | null;
  className?: string;
};

/** Top-of-form summary when required fields are missing. */
export function FormErrorBanner({ message, className }: FormBannerProps) {
  if (!message) return null;
  return (
    <div className={cn('ct-form-banner', className)} role="alert">
      {message}
    </div>
  );
}
