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

// Inline script to apply theme instantly before React hydrates (prevents flash)
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('afb_settings');
    var theme = 'system';
    if (stored) {
      var parsed = JSON.parse(stored);
      if (parsed && parsed.theme) theme = parsed.theme;
    }
    var doc = document.documentElement;
    doc.setAttribute('data-theme-mode', theme);
    if (theme === 'dark' || theme === 'light') {
      doc.setAttribute('data-theme', theme);
    } else {
      var tg = window.Telegram && window.Telegram.WebApp;
      if (tg && tg.colorScheme) {
        doc.setAttribute('data-theme', tg.colorScheme);
      } else {
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        doc.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      }
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        {/* Load Telegram WebApp SDK */}
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive" 
        />
        {/* Apply saved theme instantly to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
