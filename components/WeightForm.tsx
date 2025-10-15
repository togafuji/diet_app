'use client';

import { FormEvent, useMemo, useState } from 'react';
import styles from './WeightForm.module.css';

export interface WeightFormValues {
  weight: number;
  note: string;
  date: string;
}

export function WeightForm({
  onSubmit
}: {
  onSubmit: (values: WeightFormValues) => Promise<void>;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [autoDate, setAutoDate] = useState(true);
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!weight) {
      setError('体重を入力してください。');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        weight: Number(weight),
        note,
        date: autoDate ? new Date().toISOString() : new Date(`${date}T00:00:00`).toISOString()
      });
      setWeight('');
      setNote('');
      if (!autoDate) {
        setDate(today);
      }
    } catch (err) {
      console.error(err);
      setError('保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.fieldGroup}>
        <label htmlFor="weight">体重 (kg)</label>
        <input
          id="weight"
          name="weight"
          type="number"
          min="0"
          step="0.1"
          inputMode="decimal"
          required
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />
      </div>
      <div className={styles.fieldGroup}>
        <div className={styles.toggleRow}>
          <label htmlFor="autoDate">日付は自動入力</label>
          <input
            id="autoDate"
            type="checkbox"
            checked={autoDate}
            onChange={() => setAutoDate((prev) => !prev)}
            aria-describedby="date-description"
          />
        </div>
        {!autoDate ? (
          <div>
            <label htmlFor="date">記録日</label>
            <input
              id="date"
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        ) : null}
        <p id="date-description" className={styles.helperText}>
          オフにすると過去の日付でも記録できます。
        </p>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="note">メモ (任意)</label>
        <textarea
          id="note"
          name="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <button type="submit" disabled={submitting} className={styles.submitButton}>
        {submitting ? '保存中...' : '今日の記録を追加'}
      </button>
    </form>
  );
}
