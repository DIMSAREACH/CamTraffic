import { ALLOW_DEMO_VIOLATION } from '@shared/config/dataMode';

/** Driver actions used by the violation rule engine. */
export const OBSERVED_ACTION_VALUES = [
  'LEFT_TURN',
  'RIGHT_TURN',
  'U_TURN',
  'ENTER',
  'PARKING',
  'STOPPING',
  'OVERWEIGHT',
] as const;

export type ObservedActionValue = (typeof OBSERVED_ACTION_VALUES)[number];

export interface DetectPipelineOptions {
  /** Explicit observed driver action for rule matching. */
  observedAction?: string;
  /** When true and no explicit action, backend infers the sign’s prohibited action (dev-only). */
  demoViolation?: boolean;
  autoCreateViolation?: boolean;
}

/**
 * Map Driver Action UI → detect API fields.
 * Production-truth (VITE_ALLOW_DEMO_VIOLATION=false): only send explicit observed_action.
 * Dev demo mode: Auto (empty) may set demo_violation=true for rule inference.
 */
export function buildDemoViolationOptions(
  demoObservedAction: string,
  opts?: {
    /** When false, send nothing (e.g. video “Enable Violation” off). Default true. */
    enabled?: boolean;
    /** Auto-create DB violation when a rule matches. Default: only for explicit actions. */
    autoCreate?: boolean;
  },
): {
  observed_action?: string;
  demo_violation?: boolean;
  auto_create_violation?: boolean;
} {
  if (opts?.enabled === false) return {};
  const explicit = (demoObservedAction || '').trim();
  const autoCreate = opts?.autoCreate ?? Boolean(explicit);
  return {
    observed_action: explicit || undefined,
    demo_violation: ALLOW_DEMO_VIOLATION && !explicit ? true : undefined,
    auto_create_violation: autoCreate || undefined,
  };
}

export function toDetectPipelineOptions(demoObservedAction: string): DetectPipelineOptions {
  const explicit = (demoObservedAction || '').trim();
  return {
    observedAction: explicit || undefined,
    demoViolation: ALLOW_DEMO_VIOLATION && !explicit,
    autoCreateViolation: Boolean(explicit),
  };
}
