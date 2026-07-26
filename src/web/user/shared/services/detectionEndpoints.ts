/** Thesis + Master Build detection paths — same handlers as legacy /api/ai/* routes. */
export const DETECTION_API = {
  hub: '/detection/',
  image: '/detection/image/',
  video: '/detection/video/',
  webcam: '/detection/webcam/',
  live: '/detection/live/',
  warmup: '/detection/warmup/',
  stats: '/ai/stats/',
  statistics: '/ai/statistics/',
  logs: '/ai/logs/',
  history: '/ai/history/',
  models: '/ai/models/',
  logsExport: '/ai/logs/export/',
  tts: '/ai/tts/',
  /** Master Build Prompt exact surface */
  master: {
    image: '/ai/image/',
    video: '/ai/video/',
    webcam: '/ai/webcam/',
    liveCamera: '/ai/live-camera/',
    processFrame: '/ai/process-frame/',
    history: '/ai/history/',
    statistics: '/ai/statistics/',
    models: '/ai/models/',
    logs: '/ai/logs/',
  },
} as const;

export const API_CATALOG = '/catalog/';
