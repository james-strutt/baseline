export type AlertKind =
  | 'day-before'
  | 'starting-soon'
  | 'walk-on'
  | 'every-set'
  | 'final-result';

export type AlertChannel = 'push' | 'email';

export interface AlertPreferences {
  kinds: Record<AlertKind, boolean>;
  channels: Record<AlertChannel, boolean>;
}
