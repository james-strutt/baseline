import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 150;

export interface PlayerSearchInputProps {
  placeholder: string;
  ariaLabel: string;
  onSearch(query: string): void;
}

/* Owns its own debounce so consumers only ever see the settled query. */
export function PlayerSearchInput({
  placeholder,
  ariaLabel,
  onSearch,
}: PlayerSearchInputProps): ReactElement {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  return (
    <input
      type="search"
      value={query}
      onChange={(event): void => setQuery(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="w-full border-b border-ink/30 bg-transparent py-2 font-body text-[15px] outline-none transition-colors placeholder:text-ink-muted focus:border-ribbon"
    />
  );
}
