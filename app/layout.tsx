import './globals.css';

export const metadata = {
  title: 'TOEY Workspace',
  description: 'Personal work, shipment, calendar and file workspace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
