import controls from "./controls.module.css";
import styles from "./Pagination.module.css";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions: readonly number[];
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function Pagination({
  page,
  pageSize,
  total,
  pageSizeOptions,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  const previousDisabled = isLoading || page <= 1;
  const nextDisabled = isLoading || page >= pageCount;

  return (
    <div className={styles.footer}>
      <p className={styles.summary}>
        Showing {first}–{last} of {total} {total === 1 ? "candidate" : "candidates"}
      </p>

      <div className={styles.controls}>
        <label className={styles.pageSize}>
          Rows per page
          <select
            className={controls.select}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* aria-disabled, not disabled: a disabled button drops keyboard focus
            when the user reaches the first or last page. */}
        <nav aria-label="Pagination" className={styles.nav}>
          <button
            type="button"
            className={controls.button}
            aria-disabled={previousDisabled}
            onClick={() => {
              if (!previousDisabled) {
                onPageChange(page - 1);
              }
            }}
          >
            Previous
          </button>
          <span className={styles.position}>
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className={controls.button}
            aria-disabled={nextDisabled}
            onClick={() => {
              if (!nextDisabled) {
                onPageChange(page + 1);
              }
            }}
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}
