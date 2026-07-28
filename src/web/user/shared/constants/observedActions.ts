/** Driver actions used by the violation rule engine. */
export const OBSERVED_ACTION_VALUES = [
  'LEFT_TURN',
  'RIGHT_TURN',
  'U_TURN',
  'ENTER',
  'CROSS',
  'PARKING',
  'STOPPING',
  'OVERWEIGHT',
  'NO_HELMET',
] as const;

export type ObservedActionValue = (typeof OBSERVED_ACTION_VALUES)[number];

export interface DetectPipelineOptions {
  /** Explicit observed driver action for rule matching (optional override). */
  observedAction?: string;
  /** When true and no explicit action, backend infers the sign’s prohibited action. */
  demoViolation?: boolean;
  autoCreateViolation?: boolean;
}

/**
 * Map Driver Action UI → detect API fields.
 * Default: auto-match sign → prohibited action and auto-create the violation.
 * Optional override: pick an explicit action in the dropdown.
 */
export function buildDemoViolationOptions(
  demoObservedAction: string,
  opts?: {
    /** When false, send nothing (e.g. video “Enable Violation” off). Default true. */
    enabled?: boolean;
    /** Auto-create DB violation when a rule matches. Default: true. */
    autoCreate?: boolean;
  },
): {
  observed_action?: string;
  demo_violation?: boolean;
  auto_create_violation?: boolean;
} {
  if (opts?.enabled === false) return {};
  const explicit = (demoObservedAction || '').trim();
  const autoCreate = opts?.autoCreate ?? true;
  return {
    observed_action: explicit || undefined,
    // Ask backend to infer action from detected sign when officer leaves Auto.
    demo_violation: explicit ? undefined : true,
    auto_create_violation: autoCreate || undefined,
  };
}

export function toDetectPipelineOptions(demoObservedAction: string): DetectPipelineOptions {
  const explicit = (demoObservedAction || '').trim();
  return {
    observedAction: explicit || undefined,
    demoViolation: !explicit,
    autoCreateViolation: true,
  };
}
