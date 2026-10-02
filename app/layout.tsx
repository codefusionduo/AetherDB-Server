import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'AetherDB — High Performance Database Server & Studio',
  description: 'An all-in-one relational and document database server engine with live SQL console, table visualizer, ER diagram modeler, REST API endpoints, and real-time server telemetry.',
  openGraph: {
    title: 'AetherDB — High Performance Database Server & Studio',
    description: 'An all-in-one relational and document database server engine with live SQL console, table visualizer, ER diagram modeler, REST API endpoints, and real-time server telemetry.',
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
