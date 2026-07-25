/** Thesis checklist paths — same handlers as legacy /api/ai/* routes. */
export const DETECTION_API = {
  hub: '/detection/',
  image: '/detection/image/',
  video: '/detection/video/',
  webcam: '/detection/webcam/',
  live: '/detection/live/',
  stats: '/ai/stats/',
  logs: '/ai/logs/',
  logsExport: '/ai/logs/export/',
  tts: '/ai/tts/',
} as const;

export const API_CATALOG = '/catalog/';
