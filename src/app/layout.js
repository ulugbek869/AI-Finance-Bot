// src/app/layout.js
import Script from 'next/script';
import { AppProvider } from '../context/AppContext';
import './globals.css';

export const metadata = {
  title: 'AI Finance Bot',
  description: 'Telegram Mini App for Personal Finance Management',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        {/* Load Telegram WebApp SDK */}
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body>
        <AppProvider>
          <div className="app-container">
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
