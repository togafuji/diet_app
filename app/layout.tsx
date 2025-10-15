import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '../components/AuthContext';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: 'Diet Streak',
  description: '毎日の体重を記録してモチベを維持する個人向けトラッカー'
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
