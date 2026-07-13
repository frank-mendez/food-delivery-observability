import type { Metadata } from 'next';
import '@/styles/globals.css';
import { AppShell } from '@/components/layout/app-shell';
import { AppProviders } from '@/providers/app-providers';

export const metadata: Metadata = {
  title: 'Food Delivery Observability',
  description:
    'A local food delivery operations frontend wired to observable backend flows.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
