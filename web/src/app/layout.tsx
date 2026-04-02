import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { SessionProvider } from './session-context';
import { Header } from './components/Header';
import { FrameSync } from './components/FrameSync';
import { siteConfig } from './site-config';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${siteConfig.studioName} | ${siteConfig.brandName}`,
  description: 'Online booking, portfolio, reviews, and admin management for the Brazdes barber experience.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} bg-[#f5f6fb] text-[#1a132f] antialiased`}>
        <SessionProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">{children}</main>
          <FrameSync />
        </SessionProvider>
      </body>
    </html>
  );
}
