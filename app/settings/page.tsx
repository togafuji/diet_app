'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { Card } from '../../components/Card';
import { LoginCard } from '../../components/LoginCard';
import { useAuth } from '../../components/AuthContext';
import { db } from '../../lib/firebase';
import styles from './page.module.css';

interface ProfileForm {
  goalWeight: string;
  hintMode: 'light' | 'maintain' | 'active';
  dayBoundaryHour: string;
  height: string;
}

interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

const hintModeLabels: Record<ProfileForm['hintMode'], string> = {
  light: '控えめ',
  maintain: '維持',
  active: '活動高め'
};

function toCSV(rows: WeightRecord[]) {
  const header = 'date,weight,note';
  const lines = rows.map((row) => {
    const note = row.note ? `"${row.note.replace(/"/g, '""')}"` : '';
    return `${row.date},${row.weight},${note}`;
  });
  return [header, ...lines].join('\n');
}

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    goalWeight: '',
    hintMode: 'maintain',
    dayBoundaryHour: '0',
    height: ''
  });
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }
    const profileRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(profileRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setForm({
          goalWeight: data.goalWeight != null ? String(data.goalWeight) : '',
          hintMode: data.hintMode ?? 'maintain',
          dayBoundaryHour: data.dayBoundaryHour != null ? String(data.dayBoundaryHour) : '0',
          height: data.height != null ? String(data.height) : ''
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWeights([]);
      return;
    }
    const weightRef = collection(db, 'users', user.uid, 'weights');
    const weightQuery = query(weightRef, orderBy('date', 'desc'), limit(365));
    const unsubscribe = onSnapshot(weightQuery, (snapshot) => {
      const rows: WeightRecord[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<WeightRecord, 'id'>)
      }));
      setWeights(rows);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const profileRef = doc(db, 'users', user.uid);
      await setDoc(
        profileRef,
        {
          goalWeight: form.goalWeight ? Number(form.goalWeight) : null,
          hintMode: form.hintMode,
          dayBoundaryHour: Number(form.dayBoundaryHour),
          height: form.height ? Number(form.height) : null
        },
        { merge: true }
      );
      setSavedMessage('保存しました');
      setTimeout(() => setSavedMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    const weightRef = collection(db, 'users', user.uid, 'weights');
    const fullQuery = query(weightRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(fullQuery);
    const rows: WeightRecord[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<WeightRecord, 'id'>)
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'weights.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const previewCount = useMemo(() => weights.slice(0, 5), [weights]);

  if (loading) {
    return <p className={styles.center}>読み込み中...</p>;
  }

  if (!user) {
    return <LoginCard />;
  }

  return (
    <div className={styles.wrapper}>
      <Card title="プロフィールと目標設定">
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <label htmlFor="goalWeight" className={styles.label}>
              目標体重 (kg)
            </label>
            <input
              id="goalWeight"
              name="goalWeight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.goalWeight}
              onChange={(event) => setForm((prev) => ({ ...prev, goalWeight: event.target.value }))}
              className={styles.control}
            />
          </div>
          <div className={styles.row}>
            <label htmlFor="height" className={styles.label}>
              身長 (cm / 任意)
            </label>
            <input
              id="height"
              name="height"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.height}
              onChange={(event) => setForm((prev) => ({ ...prev, height: event.target.value }))}
              className={styles.control}
            />
          </div>
          <div className={styles.row}>
            <label htmlFor="hintMode" className={styles.label}>
              食事ヒントのモード
            </label>
            <select
              id="hintMode"
              value={form.hintMode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, hintMode: event.target.value as ProfileForm['hintMode'] }))
              }
              className={styles.control}
            >
              {Object.entries(hintModeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.row}>
            <label htmlFor="dayBoundary" className={styles.label}>
              1日の区切り時刻
            </label>
            <select
              id="dayBoundary"
              value={form.dayBoundaryHour}
              onChange={(event) => setForm((prev) => ({ ...prev, dayBoundaryHour: event.target.value }))}
              className={styles.control}
            >
              {Array.from({ length: 24 }).map((_, index) => (
                <option key={index} value={index}>
                  {index}:00
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? '保存中...' : '設定を保存'}
          </button>
          {savedMessage ? <p role="status">{savedMessage}</p> : null}
        </form>
      </Card>
      <Card title="CSVエクスポート">
        <p>体重履歴（日付, 体重, メモ）をCSV形式でダウンロードします。</p>
        <button type="button" onClick={handleExport} className={styles.secondaryButton}>
          CSVをダウンロード
        </button>
        <p className={styles.helperText}>プレビュー（最新5件）</p>
        <ul className={styles.list}>
          {previewCount.map((item) => (
            <li key={item.id}>
              {item.date} / {item.weight.toFixed(1)} kg {item.note ? `- ${item.note}` : ''}
            </li>
          ))}
          {!previewCount.length ? <li>記録がまだありません。</li> : null}
        </ul>
      </Card>
    </div>
  );
}
