import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@shared/components/ui/utils';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import {
  formatCambodiaPlate,
  inferProvinceCodeFromPlate,
  isValidCambodiaPlate,
  PLATE_FORMAT_EXAMPLE,
} from '@shared/utils/cambodiaIdentity';

export type CambodiaProvince = {
  code: string;
  en: string;
  km: string;
};

export { formatCambodiaPlate, inferProvinceCodeFromPlate, isValidCambodiaPlate, PLATE_FORMAT_EXAMPLE };

/** All Cambodia plate provinces (codes 1–25). */
export const CAMBODIA_PLATE_PROVINCES: CambodiaProvince[] = [
  { code: '1', en: 'BANTEAY MEANCHEY', km: 'បន្ទាយមានជ័យ' },
  { code: '2', en: 'BATTAMBANG', km: 'បាត់ដំបង' },
  { code: '3', en: 'KAMPONG CHAM', km: 'កំពង់ចាម' },
  { code: '4', en: 'KAMPONG CHHNANG', km: 'កំពង់ឆ្នាំង' },
  { code: '5', en: 'KAMPONG SPEU', km: 'កំពង់ស្ពឺ' },
  { code: '6', en: 'KAMPONG THOM', km: 'កំពង់ធំ' },
  { code: '7', en: 'KAMPOT', km: 'កំពត' },
  { code: '8', en: 'KANDAL', km: 'កណ្ដាល' },
  { code: '9', en: 'KOH KONG', km: 'កោះកុង' },
  { code: '10', en: 'KRATIE', km: 'ក្រចេះ' },
  { code: '11', en: 'MONDULKIRI', km: 'មណ្ឌលគិរី' },
  { code: '12', en: 'PHNOM PENH', km: 'ភ្នំពេញ' },
  { code: '13', en: 'PREAH VIHEAR', km: 'ព្រះវិហារ' },
  { code: '14', en: 'PREY VENG', km: 'ព្រៃវែង' },
  { code: '15', en: 'PURSAT', km: 'ពោធិ៍សាត់' },
  { code: '16', en: 'RATANAKIRI', km: 'រតនគិរី' },
  { code: '17', en: 'SIEM REAP', km: 'សៀមរាប' },
  { code: '18', en: 'PREAH SIHANOUK', km: 'ព្រះសីហនុ' },
  { code: '19', en: 'STUNG TRENG', km: 'ស្ទឹងត្រែង' },
  { code: '20', en: 'SVAY RIENG', km: 'ស្វាយរៀង' },
  { code: '21', en: 'TAKEO', km: 'តាកែវ' },
  { code: '22', en: 'ODDAR MEANCHEY', km: 'ឧត្តរមានជ័យ' },
  { code: '23', en: 'KEP', km: 'កែប' },
  { code: '24', en: 'PAILIN', km: 'ប៉ៃលិន' },
  { code: '25', en: 'TBOUNG KHMUM', km: 'ត្បូងឃ្មុំ' },
];

const PROVINCE_BY_CODE = new Map(CAMBODIA_PLATE_PROVINCES.map((p) => [p.code, p]));

export function getCambodiaProvince(code?: string | null): CambodiaProvince {
  if (code && PROVINCE_BY_CODE.has(code)) return PROVINCE_BY_CODE.get(code)!;
  return PROVINCE_BY_CODE.get('12')!;
}

type Props = {
  value: string;
  onChange: (plate: string) => void;
  provinceCode?: string;
  onProvinceChange?: (code: string) => void;
  disabled?: boolean;
  className?: string;
  readOnly?: boolean;
  variant?: 'badge' | 'full';
  /** When true (default), province follows plate leading digits. */
  autoProvince?: boolean;
  provinceLabel?: string;
};

function MiniQr() {
  return (
    <span className="kh-plate__qr" aria-hidden>
      <span /><span /><span /><span />
      <span /><span /><span /><span />
      <span /><span /><span /><span />
      <span /><span /><span /><span />
    </span>
  );
}

export function CambodiaPlateField({
  value,
  onChange,
  provinceCode,
  onProvinceChange,
  disabled,
  className,
  readOnly,
  variant = 'badge',
  autoProvince = true,
  provinceLabel = 'Province / ខេត្ត',
}: Props) {
  const inferred = useMemo(() => inferProvinceCodeFromPlate(value), [value]);
  const [internalCode, setInternalCode] = useState(() => provinceCode || inferred || '12');
  const manualLock = useRef(false);
  const lastInferred = useRef<string | null>(inferred);

  useEffect(() => {
    if (provinceCode) {
      setInternalCode(provinceCode);
    }
  }, [provinceCode]);

  useEffect(() => {
    if (!autoProvince || readOnly) return;
    if (!inferred) return;
    if (inferred === lastInferred.current) return;
    lastInferred.current = inferred;
    manualLock.current = false;
    setInternalCode(inferred);
    onProvinceChange?.(inferred);
  }, [autoProvince, inferred, onProvinceChange, readOnly]);

  const activeCode = provinceCode || (readOnly ? (inferred || internalCode) : internalCode);
  const province = getCambodiaProvince(activeCode);
  const display = formatCambodiaPlate(value) || '—';

  const setProvince = (code: string) => {
    manualLock.current = true;
    setInternalCode(code);
    onProvinceChange?.(code);
  };

  if (readOnly) {
    return (
      <div
        className={cn('kh-plate', variant === 'badge' ? 'kh-plate--badge' : 'kh-plate--full', className)}
        title={`${province.en} · ${display}`}
      >
        <div className="kh-plate__top">
          <span className="kh-plate__km">{province.km}</span>
          <MiniQr />
        </div>
        <div className="kh-plate__number">{display}</div>
        <div className="kh-plate__bottom">
          <span className="kh-plate__en">{province.en}</span>
        </div>
      </div>
    );
  }

  const empty = !formatCambodiaPlate(value);

  return (
    <div className={cn('kh-plate-field', className)}>
      <div className={cn('kh-plate', 'kh-plate--full', empty && 'is-placeholder')}>
        <div className="kh-plate__top">
          <span className="kh-plate__km">{province.km}</span>
          <MiniQr />
        </div>
        <label className="kh-plate__number-wrap">
          <span className="sr-only">Plate number</span>
          <input
            className="kh-plate__number-input"
            value={formatCambodiaPlate(value)}
            onChange={(e) => onChange(formatCambodiaPlate(e.target.value))}
            placeholder={PLATE_FORMAT_EXAMPLE}
            maxLength={10}
            disabled={disabled}
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
          />
        </label>
        <div className="kh-plate__bottom">
          <span className="kh-plate__en">{province.en}</span>
        </div>
      </div>

      <div className="kh-plate-field__province-wrap">
        <label className="kh-plate-field__province-label">
          <MapPin size={13} aria-hidden />
          {provinceLabel}
        </label>
        <FilterSelect
          block
          tone="teal"
          value={province.code}
          onValueChange={setProvince}
          disabled={disabled}
          ariaLabel={provinceLabel}
          triggerClassName="kh-plate-field__province-trigger"
          options={CAMBODIA_PLATE_PROVINCES.map((p) => ({
            value: p.code,
            label: `${p.code} — ${p.en} · ${p.km}`,
          }))}
        />
        <p className="kh-plate-field__province-hint">
          {inferred
            ? `Auto from plate: ${getCambodiaProvince(inferred).en}`
            : 'Select province — updates when plate digits change'}
        </p>
      </div>
    </div>
  );
}

