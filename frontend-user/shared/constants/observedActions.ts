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
  demoViolation?: boolean;
  autoCreateViolation?: boolean;
}
