import type { ReactElement } from 'react';
import { useAlertPreferences } from '@/hooks/useAlertPreferences';
import { ALERT_CHANNELS, ALERT_KINDS } from '@/services/favourites/alertPrefsStore';
import type { AlertChannel, AlertKind } from '@/types/alerts';

/* Copy names what happens, in the user's terms — no jargon (plan W7). */
const ALERT_KIND_COPY: Record<AlertKind, string> = {
  'day-before': 'Day before, with local time',
  'starting-soon': 'Thirty minutes before',
  'walk-on': 'When they walk on court',
  'every-set': 'Every set',
  'final-result': 'Final result',
};

const ALERT_CHANNEL_COPY: Record<AlertChannel, string> = {
  push: 'Push',
  email: 'Email',
};

export interface AlertControlsProps {
  playerId: number;
}

export function AlertControls({ playerId }: AlertControlsProps): ReactElement {
  const { preferences, toggleKind, toggleChannel } = useAlertPreferences(playerId);
  return (
    <section className="space-y-3 rounded-plaque border border-ink/20 p-5">
      <h2 className="font-display text-[13px] uppercase tracking-[0.22em] text-ink-muted">
        Alerts
      </h2>
      <div>
        {ALERT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={preferences.kinds[kind]}
            onClick={(): void => toggleKind(kind)}
            className="flex w-full cursor-pointer items-baseline justify-between border-b border-ink/10 py-2 font-body text-[15px] transition-colors hover:text-ribbon"
          >
            {ALERT_KIND_COPY[kind]}
            <span aria-hidden className={preferences.kinds[kind] ? 'text-ribbon' : 'text-ink-muted'}>
              {preferences.kinds[kind] ? '◉' : '○'}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="font-body text-sm text-ink-muted">Channel</span>
        {ALERT_CHANNELS.map((channel) => (
          <button
            key={channel}
            type="button"
            aria-pressed={preferences.channels[channel]}
            onClick={(): void => toggleChannel(channel)}
            className={`cursor-pointer rounded-plaque px-2.5 py-1 font-body text-xs transition-colors ${
              preferences.channels[channel]
                ? 'bg-ribbon text-chalk'
                : 'border border-ink/30 text-ink-muted'
            }`}
          >
            {ALERT_CHANNEL_COPY[channel]} {preferences.channels[channel] ? '✓' : ''}
          </button>
        ))}
      </div>
      <p className="font-body text-xs text-ink-muted">
        Quiet hours 11pm — 7am. Suppressed alerts join your Wake-up Brief at 7:00am.
      </p>
    </section>
  );
}
