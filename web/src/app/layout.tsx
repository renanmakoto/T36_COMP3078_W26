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
  icons: {
    icon: '/icon.svg',
  },
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
          <footer className="border-t border-[#e6e6e6] bg-white/80">
            <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-4 text-sm text-[#5a5872] sm:px-6">
              <a
                href={siteConfig.privacyPolicyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#1a132f] underline decoration-[#d6d1f5] underline-offset-4 hover:decoration-[#1a132f]"
              >
                Privacy Policy
              </a>
            </div>
          </footer>
          <FrameSync />
        </SessionProvider>
      </body>
    </html>
  );
}
