/** Driver actions used by the violation rule engine (demo / testing). */
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
  /** Empty = infer from sign rule (demo mode). */
  observedAction?: string;
  /** When true and no explicit action, backend matches the sign’s prohibited action. */
  demoViolation?: boolean;
  autoCreateViolation?: boolean;
}

/**
 * Map Demo Driver Action UI → detect API fields.
 * - Auto (empty): demo_violation=true so backend infers the sign rule
 * - Explicit action: send observed_action (and optionally auto-create)
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
    demo_violation: !explicit,
    auto_create_violation: autoCreate || undefined,
  };
}

export function toDetectPipelineOptions(demoObservedAction: string): DetectPipelineOptions {
  const explicit = (demoObservedAction || '').trim();
  return {
    observedAction: explicit || undefined,
    // Auto (empty) must enable demo matching — inverted from “has explicit action”
    demoViolation: !explicit,
    autoCreateViolation: Boolean(explicit),
  };
}
