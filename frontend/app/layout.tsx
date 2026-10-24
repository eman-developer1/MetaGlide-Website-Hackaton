import type { Metadata } from 'next';
import { Raleway } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers';

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-raleway',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MetaGlide Marketing | HCM Lite - Human Capital Management',
  description: 'Effortless Digital Growth. Premium AI-assisted Human Capital Management platform with attendance, payroll, leave management, and organizational intelligence.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${raleway.variable} h-full`}>
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className="min-h-full font-sans antialiased bg-[var(--bg)] text-[var(--text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

