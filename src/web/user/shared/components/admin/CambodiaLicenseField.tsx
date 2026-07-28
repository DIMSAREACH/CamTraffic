import { Input } from '@shared/components/ui/input';
import {
  formatCambodiaLicense,
  LICENSE_FORMAT_EXAMPLE,
} from '@shared/utils/cambodiaIdentity';
import { cn } from '@shared/components/ui/utils';

type Props = {
  value: string;
  onChange: (license: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
};

/** License number input — same numbered form as plates (e.g. 2TE-1507). */
export function CambodiaLicenseField({
  value,
  onChange,
  disabled,
  className,
  id,
  placeholder = LICENSE_FORMAT_EXAMPLE,
}: Props) {
  return (
    <Input
      id={id}
      className={cn('kh-license-input', className)}
      value={formatCambodiaLicense(value)}
      onChange={(e) => onChange(formatCambodiaLicense(e.target.value))}
      placeholder={placeholder}
      maxLength={10}
      disabled={disabled}
      autoCapitalize="characters"
      spellCheck={false}
      inputMode="text"
    />
  );
}
