import type { Metadata } from 'next';
import { Raleway } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers';

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
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
    <html lang="en" suppressHydrationWarning className={`${raleway.variable} ${raleway.className} h-full`}>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${raleway.className} min-h-full font-sans antialiased bg-[var(--bg)] text-[var(--text)]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

