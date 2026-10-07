import styles from "./App.module.css";
import { CandidateSearch } from "./modules/CandidateSearch/Components/CandidateSearch";

export function App() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Candidates</h1>
        <p className={styles.description}>
          Search and filter the candidates imported from your ATS.
        </p>
      </header>
      <CandidateSearch />
    </main>
  );
}
