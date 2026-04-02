import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Booking',
};

export default function BookLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
