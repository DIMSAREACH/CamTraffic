import { CalendarRange, Camera, Filter, MapPin, RotateCcw, Shield, Car } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { FilterSelect } from '@shared/components/ui/FilterSelect';
import { useLanguage } from '@shared/context/LanguageContext';
import { CAMBODIA_PROVINCES } from '@shared/constants/reportCatalog';

export interface ReportFilterState {
  dateFrom: string;
  dateTo: string;
  province: string;
  camera: string;
  officer: string;
  violationType: string;
  vehicleType: string;
}

export const DEFAULT_REPORT_FILTERS: ReportFilterState = {
  dateFrom: '2026-01-01',
  dateTo: '2026-12-31',
  province: 'all',
  camera: 'all',
  officer: 'all',
  violationType: 'all',
  vehicleType: 'all',
};

interface ReportFiltersBarProps {
  filters: ReportFilterState;
  onChange: (next: ReportFilterState) => void;
  onApply: () => void;
  onReset?: () => void;
  cameras?: { id: string; name: string }[];
  officers?: { id: string; name: string }[];
}

export function ReportFiltersBar({
  filters,
  onChange,
  onApply,
  onReset,
  cameras = [],
  officers = [],
}: ReportFiltersBarProps) {
  const { t } = useLanguage();

  const set = <K extends keyof ReportFilterState>(key: K, value: ReportFilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="reports-page__filters" aria-labelledby="report-filter-title">
      <div className="reports-page__filters-head">
        <div className="reports-page__filters-head-main">
          <div className="reports-page__filters-title-row">
            <span className="reports-page__filters-icon" aria-hidden>
              <Filter size={15} />
            </span>
            <h2 id="report-filter-title" className="reports-page__filters-title">
              {t('reports.filterTitle')}
            </h2>
          </div>
          <p className="reports-page__filters-desc">{t('reports.filterDesc')}</p>
        </div>
        <div className="reports-page__filters-actions reports-page__filters-actions--head">
          <Button type="button" onClick={onApply} className="reports-page__apply-btn">
            {t('reports.applyFilter')}
          </Button>
          {onReset && (
            <Button type="button" variant="outline" onClick={onReset}>
              <RotateCcw size={14} />
              {t('reports.resetFilter')}
            </Button>
          )}
        </div>
      </div>

      <div className="reports-page__filters-body">
        <fieldset className="reports-page__filter-group reports-page__filter-group--period">
          <legend className="reports-page__filter-group-legend">
            <CalendarRange size={13} aria-hidden />
            {t('reports.filterGroupPeriod')}
          </legend>
          <label className="reports-page__filter-field reports-page__filter-field--range">
            <span>{t('reports.filterDateRange')}</span>
            <div className="reports-page__filter-range">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => set('dateFrom', e.target.value)}
                aria-label={t('reports.filterDateFrom')}
              />
              <span className="reports-page__filter-range-sep" aria-hidden>
                —
              </span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => set('dateTo', e.target.value)}
                aria-label={t('reports.filterDateTo')}
              />
            </div>
          </label>
        </fieldset>

        <fieldset className="reports-page__filter-group reports-page__filter-group--location">
          <legend className="reports-page__filter-group-legend">
            <MapPin size={13} aria-hidden />
            {t('reports.filterGroupLocation')}
          </legend>
          <div className="reports-page__filter-group-fields">
            <label className="reports-page__filter-field">
              <span>{t('reports.filterProvince')}</span>
              <FilterSelect
                className="ct-filter-select--block"
                tone="blue"
                value={filters.province}
                onValueChange={(v) => set('province', v)}
                ariaLabel={t('reports.filterProvince')}
                options={[
                  { value: 'all', label: t('reports.filterAll') },
                  ...CAMBODIA_PROVINCES.map((p) => ({ value: p, label: p })),
                ]}
              />
            </label>

            <label className="reports-page__filter-field">
              <span>
                <Camera size={11} aria-hidden />
                {t('reports.filterCamera')}
              </span>
              <FilterSelect
                className="ct-filter-select--block"
                tone="teal"
                value={filters.camera}
                onValueChange={(v) => set('camera', v)}
                ariaLabel={t('reports.filterCamera')}
                options={[
                  { value: 'all', label: t('reports.filterAll') },
                  ...cameras.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="reports-page__filter-group reports-page__filter-group--attributes">
          <legend className="reports-page__filter-group-legend">
            <Shield size={13} aria-hidden />
            {t('reports.filterGroupAttributes')}
          </legend>
          <div className="reports-page__filter-group-fields reports-page__filter-group-fields--three">
            <label className="reports-page__filter-field">
              <span>{t('reports.filterOfficer')}</span>
              <FilterSelect
                className="ct-filter-select--block"
                tone="purple"
                value={filters.officer}
                onValueChange={(v) => set('officer', v)}
                ariaLabel={t('reports.filterOfficer')}
                options={[
                  { value: 'all', label: t('reports.filterAll') },
                  ...officers.map((o) => ({ value: o.id, label: o.name })),
                ]}
              />
            </label>

            <label className="reports-page__filter-field">
              <span>{t('reports.filterViolationType')}</span>
              <FilterSelect
                className="ct-filter-select--block"
                tone="rose"
                value={filters.violationType}
                onValueChange={(v) => set('violationType', v)}
                ariaLabel={t('reports.filterViolationType')}
                options={[
                  { value: 'all', label: t('reports.filterAll') },
                  { value: 'SPEEDING', label: t('reports.violationSpeeding') },
                  { value: 'RED_LIGHT', label: t('reports.violationRedLight') },
                  { value: 'NO_STOP', label: t('reports.violationNoStop') },
                  { value: 'NO_ENTRY', label: t('reports.violationNoEntry') },
                  { value: 'NO_PARKING', label: t('reports.violationNoParking') },
                ]}
              />
            </label>

            <label className="reports-page__filter-field">
              <span>
                <Car size={11} aria-hidden />
                {t('reports.filterVehicleType')}
              </span>
              <FilterSelect
                className="ct-filter-select--block"
                tone="amber"
                value={filters.vehicleType}
                onValueChange={(v) => set('vehicleType', v)}
                ariaLabel={t('reports.filterVehicleType')}
                options={[
                  { value: 'all', label: t('reports.filterAll') },
                  { value: 'motorcycle', label: t('reports.vehicleMotorcycle') },
                  { value: 'car', label: t('reports.vehicleCar') },
                  { value: 'tuk-tuk', label: t('reports.vehicleTukTuk') },
                  { value: 'truck', label: t('reports.vehicleTruck') },
                  { value: 'bus', label: t('reports.vehicleBus') },
                ]}
              />
            </label>
          </div>
        </fieldset>
      </div>

      <div className="reports-page__filters-actions reports-page__filters-actions--foot">
        <Button type="button" onClick={onApply} className="reports-page__apply-btn">
          {t('reports.applyFilter')}
        </Button>
        {onReset && (
          <Button type="button" variant="outline" onClick={onReset}>
            <RotateCcw size={14} />
            {t('reports.resetFilter')}
          </Button>
        )}
      </div>
    </section>
  );
}
