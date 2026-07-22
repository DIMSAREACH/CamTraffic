import { describe, expect, it } from 'vitest';
import { aiAPI, catalogAPI, camerasAPI } from '@shared/services/api';
import { DETECTION_API } from '@shared/services/detectionEndpoints';

describe('user portal AI detection API', () => {
  it('exposes video and live detection helpers', () => {
    expect(typeof aiAPI.detectVideo).toBe('function');
    expect(typeof aiAPI.getDetectionHub).toBe('function');
    expect(typeof aiAPI.getWebcamCapabilities).toBe('function');
    expect(typeof camerasAPI.processFrame).toBe('function');
    expect(typeof catalogAPI.getCatalog).toBe('function');
  });

  it('uses thesis detection alias paths', () => {
    expect(DETECTION_API.image).toBe('/detection/image/');
    expect(DETECTION_API.live).toBe('/detection/live/');
    expect(DETECTION_API.video).toBe('/detection/video/');
  });
});
