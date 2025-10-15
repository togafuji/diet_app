'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  onSnapshot as onDocSnapshot,
  orderBy,
  query
} from 'firebase/firestore';
import {
  format,
  startOfWeek,
  startOfMonth,
  parseISO,
  isValid,
  startOfDay
} from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card } from '../../components/Card';
import { useAuth } from '../../components/AuthContext';
import { LoginCard } from '../../components/LoginCard';
import { db } from '../../lib/firebase';
import styles from './page.module.css';

interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

interface Profile {
  goalWeight: number | null;
}

type Timeframe = 'daily' | 'weekly' | 'monthly';

function aggregate(weights: WeightRecord[], timeframe: Timeframe) {
  const buckets = new Map<
    string,
    { total: number; count: number; order: number; label: string }
  >();

  for (const weight of weights) {
    const date = parseISO(weight.date);
    if (!isValid(date)) continue;
    if (timeframe === 'daily') {
      const day = startOfDay(date);
      const key = day.toISOString();
      const existing = buckets.get(key) ?? {
        total: 0,
        count: 0,
        order: day.getTime(),
        label: format(day, 'yyyy/MM/dd', { locale: ja })
      };
      existing.total += weight.weight;
      existing.count += 1;
      buckets.set(key, existing);
    } else if (timeframe === 'weekly') {
      const week = startOfWeek(date, { weekStartsOn: 1 });
      const key = week.toISOString();
      const existing = buckets.get(key) ?? {
        total: 0,
        count: 0,
        order: week.getTime(),
        label: `${format(week, 'yyyy/MM/dd', { locale: ja })} 週`
      };
      existing.total += weight.weight;
      existing.count += 1;
      buckets.set(key, existing);
    } else {
      const month = startOfMonth(date);
      const key = month.toISOString();
      const existing = buckets.get(key) ?? {
        total: 0,
        count: 0,
        order: month.getTime(),
        label: format(month, 'yyyy/MM', { locale: ja })
      };
      existing.total += weight.weight;
      existing.count += 1;
      buckets.set(key, existing);
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.order - b.order)
    .map((bucket) => ({
      label: bucket.label,
      value: Number((bucket.total / bucket.count).toFixed(1))
    }));
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');

  useEffect(() => {
    if (!user) {
      setWeights([]);
      return;
    }
    const weightRef = collection(db, 'users', user.uid, 'weights');
    const weightQuery = query(weightRef, orderBy('date', 'desc'), limit(180));
    const unsubscribe = onSnapshot(weightQuery, (snapshot) => {
      const records: WeightRecord[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<WeightRecord, 'id'>)
      }));
      setWeights(records);
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
        setProfile({ goalWeight: data.goalWeight ?? null });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const chartData = useMemo(() => aggregate([...weights].reverse(), timeframe), [weights, timeframe]);

  if (loading) {
    return <p className={styles.center}>読み込み中...</p>;
  }

  if (!user) {
    return <LoginCard />;
  }

  return (
    <div className={styles.wrapper}>
      <Card title="期間別グラフ">
        <div className={styles.timeframeSwitcher} role="tablist" aria-label="グラフの期間を切り替え">
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'daily'}
            className={timeframe === 'daily' ? styles.activeTab : styles.tab}
            onClick={() => setTimeframe('daily')}
          >
            日
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'weekly'}
            className={timeframe === 'weekly' ? styles.activeTab : styles.tab}
            onClick={() => setTimeframe('weekly')}
          >
            週
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={timeframe === 'monthly'}
            className={timeframe === 'monthly' ? styles.activeTab : styles.tab}
            onClick={() => setTimeframe('monthly')}
          >
            月
          </button>
        </div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ strokeDasharray: '4 2' }} />
              {profile?.goalWeight ? (
                <ReferenceLine
                  y={profile.goalWeight}
                  label={{ value: `目標 ${profile.goalWeight}kg`, position: 'right', fontSize: 12 }}
                  stroke="var(--accent)"
                  strokeDasharray="4 4"
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent-strong)"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="体重履歴一覧 (直近30件)">
        <ul className={styles.list}>
          {weights.slice(0, 30).map((item) => (
            <li key={item.id}>
              <div>
                <strong>{format(parseISO(item.date), 'yyyy/MM/dd', { locale: ja })}</strong>
                <span className={styles.weightValue}>{item.weight.toFixed(1)} kg</span>
              </div>
              {item.note ? <p className={styles.note}>{item.note}</p> : null}
            </li>
          ))}
          {!weights.length ? <li>記録がまだありません。</li> : null}
        </ul>
      </Card>
    </div>
  );
}
