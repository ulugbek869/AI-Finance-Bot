// src/hooks/useTelegram.js
'use client';
import { useEffect, useState } from 'react';
import { getTelegramWebApp, initTelegram, applyTelegramTheme } from '../lib/telegram';

export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const webApp = initTelegram();
    if (webApp) {
      setTg(webApp);
      setUser(webApp.initDataUnsafe?.user || null);
      applyTelegramTheme();

      const handleThemeChange = () => {
        applyTelegramTheme();
      };

      webApp.onEvent('themeChanged', handleThemeChange);
      return () => {
        webApp.offEvent('themeChanged', handleThemeChange);
      };
    }
  }, []);

  return {
    tg,
    user,
    colorScheme: tg?.colorScheme || 'dark'
  };
}
