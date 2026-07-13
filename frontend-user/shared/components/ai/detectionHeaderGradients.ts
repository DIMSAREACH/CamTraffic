export const DETECTION_HEADER_GRADIENTS = {
  hero: 'linear-gradient(135deg, #1e3a8a 0%, #4338ca 38%, #7c3aed 72%, #a855f7 100%)',
  upload: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 42%, #8b5cf6 68%, #06b6d4 100%)',
  awaiting: 'linear-gradient(135deg, #0e7490 0%, #0891b2 40%, #06b6d4 100%)',
  result: 'linear-gradient(135deg, #047857 0%, #059669 45%, #10b981 100%)',
  recent: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
  model: 'linear-gradient(135deg, #3730a3 0%, #6366f1 50%, #8b5cf6 100%)',
  catalog: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
  flow: 'linear-gradient(135deg, #0e7490 0%, #0891b2 50%, #06b6d4 100%)',
} as const;

/** Icon stroke on the white badge used in `.dashboard-page--ai` gradient headers */
export const DETECTION_HEADER_ICON_ACCENTS: Record<keyof typeof DETECTION_HEADER_GRADIENTS, string> = {
  hero: '#4338ca',
  upload: '#7c3aed',
  awaiting: '#0891b2',
  result: '#059669',
  recent: '#047857',
  model: '#6366f1',
  catalog: '#2563eb',
  flow: '#0891b2',
};
