import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ClinicalMirror — AI Patient Communication Trainer',
  description:
    'Practice difficult clinical conversations with AI patients. Build empathy, clarity, and de-escalation skills before you enter clinical practice.',
  keywords: ['clinical communication', 'medical training', 'AI simulation', 'patient communication'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
