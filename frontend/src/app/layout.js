import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'SHMS - Smart Hostel Management System',
  description: 'AI-powered hostel management with smart room allocation, attendance tracking, complaint management, and predictive analytics.',
  keywords: 'hostel management, smart hostel, AI analytics, room allocation, attendance',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
