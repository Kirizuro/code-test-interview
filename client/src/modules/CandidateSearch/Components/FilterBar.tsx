import { useId, type Ref } from "react";
import controls from "./controls.module.css";
import styles from "./FilterBar.module.css";
import { statusLabel } from "../../../shared/statusLabel";
import { CANDIDATE_STATUSES, type CandidateStatus } from "../../../shared/types";

type FilterBarProps = {
  text: string;
  status: CandidateStatus | "";
  hasAppliedFilters: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onTextChange: (text: string) => void;
  /** Enter was pressed in the search input. */
  onSubmit: () => void;
  onStatusChange: (status: CandidateStatus | "") => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
};

export function FilterBar({
  text,
  status,
  hasAppliedFilters,
  inputRef,
  onTextChange,
  onSubmit,
  onStatusChange,
  onClearSearch,
  onClearFilters,
}: FilterBarProps) {
  const searchId = useId();
  const statusId = useId();

  return (
    <form
      role="search"
      className={styles.bar}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className={styles.searchField}>
        <label htmlFor={searchId} className={controls.label}>
          Search by name or email
        </label>
        <div className={styles.searchBox}>
          <svg className={styles.searchIcon} viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            id={searchId}
            type="search"
            autoComplete="off"
            className={`${controls.input} ${styles.searchInput}`}
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
          />
          {text !== "" && (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label="Clear search"
              onClick={onClearSearch}
            >
              <svg viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="m2 2 10 10M12 2 2 12"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={statusId} className={controls.label}>
          Status
        </label>
        <select
          id={statusId}
          className={`${controls.select} ${styles.statusSelect}`}
          value={status}
          onChange={(event) => onStatusChange(event.target.value as CandidateStatus | "")}
        >
          <option value="">All statuses</option>
          {CANDIDATE_STATUSES.map((option) => (
            <option key={option} value={option}>
              {statusLabel(option)}
            </option>
          ))}
        </select>
      </div>

      {hasAppliedFilters && (
        <button type="button" className={controls.button} onClick={onClearFilters}>
          Clear filters
        </button>
      )}
    </form>
  );
}
