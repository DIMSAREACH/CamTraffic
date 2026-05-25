import type { SignCategory, TrafficSign } from '@shared/types';

export type SignFormValues = {
  sign_name: string;
  sign_code: string;
  category: SignCategory;
  description: string;
  guidance: string;
  penalty: string;
  rulesText: string;
};

export const emptySignForm = (): SignFormValues => ({
  sign_name: '',
  sign_code: '',
  category: 'warning',
  description: '',
  guidance: '',
  penalty: '',
  rulesText: '',
});

export function signToFormValues(sign: TrafficSign & { guidance?: string }): SignFormValues {
  return {
    sign_name: sign.sign_name,
    sign_code: sign.sign_code,
    category: sign.category,
    description: sign.description,
    guidance: sign.guidance ?? '',
    penalty: sign.penalty ?? '',
    rulesText: (sign.rules ?? []).join('\n'),
  };
}

export function parseRulesText(rulesText: string): string[] {
  return rulesText
    .split('\n')
    .map(r => r.trim())
    .filter(Boolean);
}

export function buildSignFormData(values: SignFormValues, imageFile?: File | null): FormData {
  const fd = new FormData();
  fd.append('sign_name', values.sign_name.trim());
  fd.append('sign_code', values.sign_code.trim());
  fd.append('description', values.description.trim());
  fd.append('guidance', values.guidance.trim());
  fd.append('category', values.category);
  if (values.penalty.trim()) fd.append('penalty', values.penalty.trim());
  fd.append('rules', JSON.stringify(parseRulesText(values.rulesText)));
  if (imageFile) fd.append('image', imageFile);
  return fd;
}

export function buildSignJsonPatch(values: SignFormValues): Record<string, unknown> {
  return {
    sign_name: values.sign_name.trim(),
    sign_code: values.sign_code.trim(),
    description: values.description.trim(),
    guidance: values.guidance.trim(),
    category: values.category,
    penalty: values.penalty.trim(),
    rules: parseRulesText(values.rulesText),
  };
}
