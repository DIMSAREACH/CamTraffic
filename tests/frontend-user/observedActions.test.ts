import { describe, expect, it } from 'vitest';
import {
  buildDemoViolationOptions,
  toDetectPipelineOptions,
} from '../../src/web/user/shared/constants/observedActions';

describe('AI Detection auto-match options', () => {
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

  it('can disable violation fields entirely', () => {
    expect(buildDemoViolationOptions('ENTER', { enabled: false })).toEqual({});
  });

  it('maps Auto into pipeline options for webcam', () => {
    const opts = toDetectPipelineOptions('');
    expect(opts.observedAction).toBeUndefined();
    expect(opts.demoViolation).toBe(true);
    expect(opts.autoCreateViolation).toBe(true);
  });
});
