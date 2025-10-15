'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Route } from 'next';
import { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import styles from './AppShell.module.css';

const links: { href: Route; label: string }[] = [
  { href: '/', label: 'ホーム' },
  { href: '/history', label: '履歴' },
  { href: '/settings', label: '設定' }
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.branding}>
          <span aria-hidden className={styles.logo}>
            ⚖️
          </span>
          <span>Diet Streak</span>
        </div>
        {user ? (
          <nav aria-label="メインメニュー">
            <ul className={styles.navList}>
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={pathname === link.href ? styles.activeLink : styles.link}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {user ? (
          <button type="button" onClick={logout} className={styles.logoutButton}>
            ログアウト
          </button>
        ) : null}
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
