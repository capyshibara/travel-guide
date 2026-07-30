import { useId } from 'react';
import styles from './navigation.module.css';
import { cx } from '../../lib/cx';
import { Icon } from '../Icon';
import { useT } from '../../i18n/useT';

export interface FilterOption {
  value: string;
  label: string;
  /** Shown after the label, e.g. a count. */
  suffix?: string;
}

export interface SearchFilterSortProps {
  query: string;
  onQuery: (value: string) => void;
  placeholder?: string;
  label: string;
  filters?: readonly FilterOption[];
  activeFilter?: string;
  onFilter?: (value: string) => void;
  filterLabel?: string;
}

export function SearchFilterSort({
  query,
  onQuery,
  placeholder,
  label,
  filters,
  activeFilter,
  onFilter,
  filterLabel,
}: SearchFilterSortProps) {
  const t = useT();
  const id = useId();
  return (
    <div className={styles.searchWrap}>
      <div className={styles.searchBox}>
        <Icon name="search" size="sm" />
        <label className="visually-hidden" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          type="search"
          className={styles.searchInput}
          value={query}
          placeholder={placeholder ?? t.common.search}
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>
      {filters && filters.length > 0 && onFilter ? (
        <div className={styles.filterRow} role="group" aria-label={filterLabel ?? t.common.filter}>
          {filters.map((filter) => {
            const active = filter.value === activeFilter;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                className={cx(styles.filterChip, active && styles.filterChipActive)}
                onClick={() => onFilter(filter.value)}
              >
                {filter.label}
                {filter.suffix ? ` · ${filter.suffix}` : ''}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
