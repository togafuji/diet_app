'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from './AuthContext';
import styles from './LoginCard.module.css';

export function LoginCard() {
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError('認証に失敗しました。入力内容を確認してください。');
      console.error(err);
    }
  };

  return (
    <section className={styles.container}>
      <h1>Diet Streak へようこそ</h1>
      <p>
        メールアドレスとパスワードは任意の組み合わせで利用できます。お好きな情報でログインして、毎日の記録を始めましょう。
      </p>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label htmlFor="email" className={styles.label}>
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={styles.input}
        />
        <label htmlFor="password" className={styles.label}>
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={styles.input}
        />
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <button type="submit" className={styles.submitButton}>
          {mode === 'login' ? 'ログイン' : '新規登録'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className={styles.secondaryButton}
      >
        {mode === 'login' ? 'アカウントを作成する' : '既にアカウントをお持ちの方はこちら'}
      </button>
    </section>
  );
}
