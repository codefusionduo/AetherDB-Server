import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  metadataBase: new URL('https://aetherdb.ryzn.pro'),
  title: 'AetherDB — High Performance Database Server & Studio (aetherdb.ryzn.pro)',
  description: 'An all-in-one relational and document database server engine hosted at aetherdb.ryzn.pro with live SQL console, table visualizer, ER diagram modeler, REST API endpoints, and real-time server telemetry.',
  openGraph: {
    title: 'AetherDB — High Performance Database Server & Studio',
    description: 'An all-in-one relational and document database server engine hosted at aetherdb.ryzn.pro.',
    url: 'https://aetherdb.ryzn.pro',
    siteName: 'AetherDB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AetherDB — High Performance Database Server & Studio',
    description: 'An all-in-one relational and document database server engine with live SQL console, table visualizer, ER diagram modeler, REST API endpoints, and real-time server telemetry.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
