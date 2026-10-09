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
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('dhm-theme')||'dark';document.documentElement.dataset.theme=t;if(t==='light'){document.documentElement.classList.remove('dark');}}catch(e){}",
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
