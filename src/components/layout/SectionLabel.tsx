import type { ReactElement, ReactNode } from 'react';

export interface SectionLabelProps {
  children: ReactNode;
}

/*
 * The single eyebrow voice: Albert Sans small-caps from the type scale —
 * poshness whispers, it does not bold. Caslon is reserved for names, the
 * masthead, honours boards and the Brief headline (plan §4.2).
 */
export function SectionLabel({ children }: SectionLabelProps): ReactElement {
  return <h2 className="font-body text-label uppercase text-ink-muted">{children}</h2>;
}
