import { describe, expect, it } from 'vitest';
import {
  buildDemoViolationOptions,
  toDetectPipelineOptions,
} from '../../src/web/admin/shared/constants/observedActions';

describe('Admin AI Detection auto-match options', () => {
  it('defaults Auto to demo_violation + auto_create_violation', () => {
    const opts = buildDemoViolationOptions('');
    expect(opts.observed_action).toBeUndefined();
    expect(opts.demo_violation).toBe(true);
    expect(opts.auto_create_violation).toBe(true);
  });

  it('sends explicit override without demo_violation', () => {
    const opts = buildDemoViolationOptions('ENTER');
    expect(opts.observed_action).toBe('ENTER');
    expect(opts.demo_violation).toBeUndefined();
    expect(opts.auto_create_violation).toBe(true);
  });

  it('maps Auto into pipeline options for webcam', () => {
    const opts = toDetectPipelineOptions('');
    expect(opts.demoViolation).toBe(true);
    expect(opts.autoCreateViolation).toBe(true);
  });
});
