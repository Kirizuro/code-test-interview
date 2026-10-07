import styles from "./StatusBadge.module.css";
import { statusLabel } from "../../../shared/statusLabel";
import type { CandidateStatus } from "../../../shared/types";

export function StatusBadge({ status }: { status: CandidateStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{statusLabel(status)}</span>;
}
