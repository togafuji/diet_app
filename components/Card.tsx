import { ReactNode } from 'react';
import styles from './Card.module.css';

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      <div>{children}</div>
    </section>
  );
}
