import { useEffect, useId, useState } from 'react';
import { ImagePlus, Pencil, Plus, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Textarea } from '@shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useLanguage } from '@shared/context/LanguageContext';
import { signsAPI } from '@shared/services/api';
import { getProfileImageUrl } from '@shared/utils/profileImage';
import { resolveSignMediaUrl } from '@shared/utils/signImage';
import {
  buildSignFormData,
  buildSignJsonPatch,
  emptySignForm,
  signToFormValues,
  type SignFormValues,
} from '@shared/utils/trafficSignForm';
import { toast } from 'sonner';
import type { SignCategory, TrafficSign } from '@shared/types';

const CATEGORIES: SignCategory[] = ['prohibitory', 'warning', 'mandatory', 'informative'];

const CAT_STYLE: Record<
  SignCategory,
  { bg: string; text: string; border: string; dot: string; chevron: string }
> = {
  prohibitory: {
    bg: 'rgba(239, 68, 68, 0.12)',
    text: '#B91C1C',
    border: 'rgba(239, 68, 68, 0.35)',
    dot: '#EF4444',
    chevron: '#DC2626',
  },
  warning: {
    bg: 'rgba(234, 179, 8, 0.16)',
    text: '#854D0E',
    border: 'rgba(234, 179, 8, 0.45)',
    dot: '#EAB308',
    chevron: '#CA8A04',
  },
  mandatory: {
    bg: 'rgba(37, 99, 235, 0.1)',
    text: '#1D4ED8',
    border: 'rgba(37, 99, 235, 0.35)',
    dot: '#3B82F6',
    chevron: '#2563EB',
  },
  informative: {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#047857',
    border: 'rgba(16, 185, 129, 0.35)',
    dot: '#10B981',
    chevron: '#059669',
  },
};

function CategorySelectField({
  value,
  onChange,
  label,
  getLabel,
}: {
  value: SignCategory;
  onChange: (cat: SignCategory) => void;
  label: string;
  getLabel: (cat: SignCategory) => string;
}) {
  const active = CAT_STYLE[value];
  return (
    <div className="signs-form-field signs-form-field--category">
      <Label className="signs-form-label">{label}</Label>
      <Select value={value} onValueChange={v => onChange(v as SignCategory)}>
        <SelectTrigger
          className={`signs-form-category-trigger signs-form-category-trigger--${value}`}
          style={{
            backgroundColor: active.bg,
            color: active.text,
            borderColor: active.border,
            ['--sign-cat-chevron' as string]: active.chevron,
          }}
        >
          <span className="signs-form-category-trigger__inner">
            <span
              className="signs-form-category-trigger__dot"
              style={{ backgroundColor: active.dot }}
              aria-hidden
            />
            <SelectValue className="signs-form-category-trigger__label">{getLabel(value)}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent className="signs-form-category-menu" position="popper">
          {CATEGORIES.map(cat => {
            const c = CAT_STYLE[cat];
            return (
              <SelectItem
                key={cat}
                value={cat}
                textValue={getLabel(cat)}
                className="signs-form-category-option"
              >
                <span className="signs-form-category-option__row">
                  <span
                    className="signs-form-category-option__dot"
                    style={{ backgroundColor: c.dot }}
                    aria-hidden
                  />
                  <span className="signs-form-category-option__label" style={{ color: c.text }}>
                    {getLabel(cat)}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  sign?: TrafficSign | null;
  onSaved: (sign?: TrafficSign) => void;
};

export function SignFormDialog({ open, onOpenChange, mode, sign, onSaved }: Props) {
  const { t } = useLanguage();
  const fileInputId = useId();
  const [form, setForm] = useState<SignFormValues>(emptySignForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [blobPreview, setBlobPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    setBlobPreview(null);
    if (mode === 'edit' && sign) setForm(signToFormValues(sign));
    else setForm(emptySignForm());
  }, [open, mode, sign]);

  useEffect(() => {
    if (!imageFile) {
      setBlobPreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setBlobPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const set = (key: keyof SignFormValues, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.sign_name.trim() || !form.sign_code.trim() || !form.description.trim()) {
      toast.error(t('pages.signs.formRequired'));
      return;
    }
    if (mode === 'create' && !imageFile) {
      toast.error(t('pages.signs.formImageRequired'));
      return;
    }

    setSaving(true);
    try {
      let savedSign: TrafficSign | undefined;
      if (mode === 'create') {
        savedSign = await signsAPI.create(buildSignFormData(form, imageFile));
      } else if (sign) {
        savedSign = imageFile
          ? await signsAPI.update(sign.id, buildSignFormData(form, imageFile))
          : await signsAPI.update(sign.id, buildSignJsonPatch(form));
      }
      onOpenChange(false);
      onSaved(savedSign);
      requestAnimationFrame(() => {
        toast.success(
          mode === 'create' ? t('pages.signs.createSuccess') : t('pages.signs.updateSuccess'),
        );
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('pages.signs.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const existingPreview =
    mode === 'edit' && sign?.image
      ? (resolveSignMediaUrl(sign.image) ?? getProfileImageUrl(sign.image))
      : null;

  const previewUrl = blobPreview ?? existingPreview;
  const isCreate = mode === 'create';
  const catLabel = (cat: SignCategory) => t(`signCategories.${cat}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="signs-form-dialog p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader
          className={`signs-form-dialog__header${isCreate ? ' signs-form-dialog__header--create' : ' signs-form-dialog__header--edit'}`}
        >
          <div className="signs-form-dialog__header-main">
            <span className="signs-form-dialog__icon" aria-hidden>
              {isCreate ? <Plus size={18} strokeWidth={2.25} /> : <Pencil size={17} strokeWidth={2.25} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="signs-form-dialog__eyebrow">
                {isCreate ? t('pages.signs.formEyebrowCreate') : t('pages.signs.formEyebrowEdit')}
              </p>
              <DialogTitle className="signs-form-dialog__title">
                {isCreate ? t('pages.signs.addSign') : t('pages.signs.editSign')}
              </DialogTitle>
              <DialogDescription className="signs-form-dialog__desc">
                {isCreate ? t('pages.signs.formCreateSubtitle') : t('pages.signs.formEditSubtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="signs-form-dialog__form"
          onSubmit={e => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="signs-form-dialog__body">
            <div className="signs-form-dialog__panel">
              <p className="signs-form-dialog__section-title">{t('pages.signs.formSectionBasic')}</p>

              <div className="signs-form-field">
                <Label htmlFor="sign_name" className="signs-form-label">{t('pages.signs.formName')}</Label>
                <Input
                  id="sign_name"
                  value={form.sign_name}
                  onChange={e => set('sign_name', e.target.value)}
                  placeholder={t('pages.signs.formNamePlaceholder')}
                  className="signs-form-control"
                />
              </div>

              <div className="signs-form-dialog__row-2">
                <div className="signs-form-field">
                  <Label htmlFor="sign_code" className="signs-form-label">{t('pages.signs.formCode')}</Label>
                  <Input
                    id="sign_code"
                    value={form.sign_code}
                    onChange={e => set('sign_code', e.target.value)}
                    placeholder="R1-01"
                    className="signs-form-control signs-form-control--mono"
                  />
                </div>
                <div className="signs-form-field">
                  <Label htmlFor="penalty" className="signs-form-label">{t('pages.signs.penalty')}</Label>
                  <Input
                    id="penalty"
                    value={form.penalty}
                    onChange={e => set('penalty', e.target.value)}
                    className="signs-form-control"
                  />
                </div>
              </div>

              <CategorySelectField
                value={form.category}
                onChange={cat => set('category', cat)}
                label={t('pages.signs.formCategory')}
                getLabel={catLabel}
              />

              <p className="signs-form-dialog__section-title signs-form-dialog__section-title--spaced">
                {t('pages.signs.formSectionDetails')}
              </p>

              <div className="signs-form-dialog__row-2">
                <div className="signs-form-field">
                  <Label htmlFor="description" className="signs-form-label">{t('pages.signs.description')}</Label>
                  <Textarea
                    id="description"
                    rows={2}
                    value={form.description}
                    onChange={e => set('description', e.target.value)}
                    className="signs-form-control signs-form-textarea"
                  />
                </div>
                <div className="signs-form-field">
                  <Label htmlFor="guidance" className="signs-form-label">{t('pages.signs.formGuidance')}</Label>
                  <Textarea
                    id="guidance"
                    rows={2}
                    value={form.guidance}
                    onChange={e => set('guidance', e.target.value)}
                    className="signs-form-control signs-form-textarea"
                  />
                </div>
              </div>

              <div className="signs-form-field">
                <Label htmlFor="rules" className="signs-form-label">{t('pages.signs.formRules')}</Label>
                <Textarea
                  id="rules"
                  rows={2}
                  value={form.rulesText}
                  onChange={e => set('rulesText', e.target.value)}
                  placeholder={t('pages.signs.formRulesHint')}
                  className="signs-form-control signs-form-textarea"
                />
              </div>
            </div>

            <aside className="signs-form-dialog__image-panel">
              <p className="signs-form-dialog__section-title">{t('pages.signs.formSectionImage')}</p>
              <div className="signs-form-dialog__upload-card">
                <label
                  htmlFor={fileInputId}
                  className={`signs-form-dialog__dropzone${previewUrl ? ' is-filled' : ''}`}
                >
                  <div className="signs-form-dialog__preview">
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="" className="signs-form-dialog__preview-img" />
                        <div className="signs-form-dialog__preview-overlay" aria-hidden>
                          <span className="signs-form-dialog__preview-overlay-btn">
                            <Upload size={16} strokeWidth={2.25} />
                            <span>{t('pages.signs.formChangeFile')}</span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="signs-form-dialog__preview-empty">
                        <span className="signs-form-dialog__preview-empty-icon" aria-hidden>
                          <ImagePlus size={22} strokeWidth={1.75} />
                        </span>
                        <span className="signs-form-dialog__preview-empty-title">
                          {t('pages.signs.formChooseFile')}
                        </span>
                        <span className="signs-form-dialog__preview-empty-hint">
                          {t('pages.signs.formUploadHint')}
                        </span>
                      </div>
                    )}
                  </div>
                </label>
                <div className="signs-form-dialog__upload-footer">
                  <span
                    className={`signs-form-dialog__upload-badge${isCreate ? ' is-required' : ' is-optional'}`}
                  >
                    {isCreate ? t('pages.signs.formImageRequired') : t('pages.signs.formImageOptional')}
                  </span>
                  {imageFile && (
                    <span className="signs-form-dialog__filename" title={imageFile.name}>
                      {imageFile.name}
                    </span>
                  )}
                </div>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={e => setImageFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </aside>
          </div>

          <DialogFooter className="signs-form-dialog__footer">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="signs-form-dialog__btn-cancel"
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving} className="signs-form-dialog__btn-submit">
              {saving
                ? `${t('common.save')}...`
                : isCreate
                  ? t('pages.signs.createBtn')
                  : t('pages.signs.saveBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
