import styles from "./CandidateTable.module.css";
import { formatFullDateTime, formatRelativeTime } from "../../../shared/formatRelativeTime";
import { StatusBadge } from "./StatusBadge";
import type { Candidate } from "../../../shared/types";

const COLUMNS = ["Name", "Email", "Status", "Last updated"] as const;
const [NAME, EMAIL, STATUS, UPDATED] = COLUMNS;

type CandidateTableProps = {
  /** `null` renders placeholder rows in the table's shape. */
  candidates: Candidate[] | null;
  skeletonRows: number;
  isBusy: boolean;
  /** The moment relative dates are measured from. */
  now?: Date;
};

// The explicit roles keep table semantics when small screens restyle rows as cards.
export function CandidateTable({
  candidates,
  skeletonRows,
  isBusy,
  now = new Date(),
}: CandidateTableProps) {
  return (
    <table role="table" className={styles.table} aria-busy={isBusy}>
      <thead role="rowgroup" className={styles.head}>
        <tr role="row">
          {COLUMNS.map((column) => (
            <th key={column} role="columnheader" scope="col" className={styles.headerCell}>
              {column}
            </th>
          ))}
        </tr>
      </thead>

      {candidates === null ? (
        <tbody role="rowgroup" className={styles.body} aria-hidden="true">
          {Array.from({ length: skeletonRows }, (_, index) => (
            <tr
              key={index}
              role="row"
              className={`${styles.row} ${styles.skeletonRow}`}
              data-testid="skeleton-row"
            >
              <td role="cell" className={styles.cell} data-label={NAME}>
                <span className={styles.skeleton} />
              </td>
              <td role="cell" className={styles.cell} data-label={STATUS}>
                <span className={styles.skeleton} />
              </td>
              <td role="cell" className={`${styles.cell} ${styles.wide}`} data-label={EMAIL}>
                <span className={styles.skeleton} />
              </td>
              <td role="cell" className={`${styles.cell} ${styles.wide}`} data-label={UPDATED}>
                <span className={styles.skeleton} />
              </td>
            </tr>
          ))}
        </tbody>
      ) : (
        <tbody role="rowgroup" className={styles.body}>
          {candidates.map((candidate) => (
            <tr key={candidate.id} role="row" className={styles.row}>
              <td role="cell" className={`${styles.cell} ${styles.name}`} data-label={NAME}>
                {candidate.name}
              </td>
              <td role="cell" className={`${styles.cell} ${styles.wide}`} data-label={EMAIL}>
                <a className={styles.email} href={`mailto:${candidate.email}`}>
                  {candidate.email}
                </a>
              </td>
              <td role="cell" className={styles.cell} data-label={STATUS}>
                <StatusBadge status={candidate.status} />
              </td>
              <td
                role="cell"
                className={`${styles.cell} ${styles.wide} ${styles.date}`}
                data-label={UPDATED}
              >
                <time dateTime={candidate.updatedAt} title={formatFullDateTime(candidate.updatedAt)}>
                  {formatRelativeTime(candidate.updatedAt, now)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      )}
    </table>
  );
}
