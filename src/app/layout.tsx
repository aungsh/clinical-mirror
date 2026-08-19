import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClinicalMirror - AI Patient Communication Trainer',
  description:
    'Practice difficult clinical conversations with AI patients. Build empathy, clarity, and de-escalation skills before entering clinical practice.',
  keywords: ['clinical communication', 'medical training', 'AI simulation', 'patient communication'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
