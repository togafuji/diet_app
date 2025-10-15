'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  doc,
  onSnapshot as onDocSnapshot
} from 'firebase/firestore';
import { useAuth } from '../components/AuthContext';
import { LoginCard } from '../components/LoginCard';
import { Card } from '../components/Card';
import { WeightForm, WeightFormValues } from '../components/WeightForm';
import { db } from '../lib/firebase';
import { calculateStreak } from '../lib/streak';
import styles from './page.module.css';

interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

interface Profile {
  goalWeight: number | null;
  hintMode: 'light' | 'maintain' | 'active';
  dayBoundaryHour: number;
  height?: number | null;
}

const hintPresets: Record<Profile['hintMode'], string[]> = {
  light: [
    '目標までもう少し。夜は炭水化物を控えめにして、たんぱく質中心のメニューにしてみましょう。',
    '水分補給を意識して、間食はフルーツやヨーグルトに置き換えましょう。'
  ],
  maintain: [
    'バランスのよい食事をキープ。彩り豊かな野菜と適度なたんぱく質で満足感を維持。',
    '食事記録を続けて、1日の総カロリーを意識するだけでも効果的です。'
  ],
  active: [
    '朝食に炭水化物をしっかり摂って、昼はたんぱく質とビタミンでエネルギー補給を。',
    '運動前後は吸収のよい炭水化物とたんぱく質の組み合わせでパフォーマンスを上げましょう。'
  ]
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    month: '2-digit',
    day: '2-digit'
  });
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setWeights([]);
      return;
    }
    const weightRef = collection(db, 'users', user.uid, 'weights');
    const weightQuery = query(weightRef, orderBy('date', 'desc'), limit(365));
    const unsubscribe = onSnapshot(weightQuery, (snapshot) => {
      const nextWeights: WeightRecord[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<WeightRecord, 'id'>)
      }));
      setWeights(nextWeights);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const profileRef = doc(db, 'users', user.uid);
    const unsubscribe = onDocSnapshot(profileRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        setProfile({
          goalWeight: data.goalWeight ?? null,
          hintMode: data.hintMode ?? 'maintain',
          dayBoundaryHour: data.dayBoundaryHour ?? 0,
          height: data.height ?? null
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const latestWeight = weights[0];
  const baseWeight = weights.length ? weights[weights.length - 1].weight : null;
  const streak = useMemo(() => {
    if (!profile) {
      return { current: 0, best: 0 };
    }
    return calculateStreak(weights, profile.dayBoundaryHour ?? 0);
  }, [weights, profile]);

  const progress = useMemo(() => {
    if (profile?.goalWeight == null || baseWeight == null || !latestWeight) {
      return null;
    }
    const total = profile.goalWeight - baseWeight;
    const current = latestWeight.weight - baseWeight;
    if (total === 0) {
      return 100;
    }
    const percentage = (current / total) * 100;
    return Math.min(100, Math.max(0, percentage));
  }, [profile, baseWeight, latestWeight]);

  const hint = useMemo(() => {
    if (!profile || !latestWeight) {
      return '記録を始めて、今日のヒントを確認しましょう。';
    }
    const options = hintPresets[profile.hintMode ?? 'maintain'];
    const diff = profile.goalWeight != null ? profile.goalWeight - latestWeight.weight : 0;
    const index = Math.min(options.length - 1, Math.abs(Math.round(diff)) % options.length);
    return options[index];
  }, [profile, latestWeight]);

  const handleSubmit = async (values: WeightFormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      const weightRef = collection(db, 'users', user.uid, 'weights');
      await addDoc(weightRef, {
        date: values.date,
        weight: values.weight,
        note: values.note,
        createdAt: new Date().toISOString()
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.center}>読み込み中...</p>;
  }

  if (!user) {
    return <LoginCard />;
  }

  return (
    <div className={styles.grid}>
      <Card title="今日の体重を記録">
        <WeightForm onSubmit={handleSubmit} />
        {saving ? <p>保存中...</p> : null}
      </Card>
      <section className={styles.highlightRow}>
        <Card title="ストリーク🔥">
          <p className={styles.streakText}>
            現在 {streak.current} 日 / 最高 {streak.best} 日
          </p>
          <p className={styles.helperText}>1日の区切り: {profile?.dayBoundaryHour ?? 0} 時</p>
        </Card>
        <Card title="目標への進捗">
          {profile?.goalWeight != null && latestWeight ? (
            <div className={styles.progressWrapper}>
              <div
                className={styles.progressBar}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress ?? 0)}
              >
                <div
                  className={styles.progressValue}
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <p>
                現在 {latestWeight.weight.toFixed(1)} kg / 目標 {profile.goalWeight.toFixed(1)} kg
              </p>
            </div>
          ) : (
            <p>設定ページで目標体重を登録すると進捗が表示されます。</p>
          )}
        </Card>
      </section>
      <Card title="直近の記録">
        <ul className={styles.list}>
          {weights.slice(0, 3).map((item) => (
            <li key={item.id}>
              <div>
                <strong>{formatDate(item.date)}</strong>
                <span className={styles.weightValue}>{item.weight.toFixed(1)} kg</span>
              </div>
              {item.note ? <p className={styles.note}>{item.note}</p> : null}
            </li>
          ))}
          {!weights.length ? <li>記録がまだありません。</li> : null}
        </ul>
      </Card>
      <Card title="今日の食事ヒント">
        <p>{hint}</p>
      </Card>
    </div>
  );
}
