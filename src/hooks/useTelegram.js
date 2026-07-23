// src/hooks/useTelegram.js
'use client';
import { useEffect, useState } from 'react';
import { initTelegram, applyTelegramTheme, getTelegramUser, getTelegramUserName } from '../lib/telegram';

export function useTelegram() {
  const [tg, setTg] = useState(null);
  const [user, setUser] = useState(getTelegramUser);

  useEffect(() => {
    let webApp = null;
    let retryTimer = null;

    const handleThemeChange = () => {
      applyTelegramTheme();
    };

    const syncTelegramUser = () => {
      const nextWebApp = webApp || initTelegram();
      if (nextWebApp && nextWebApp !== webApp) {
        if (webApp) webApp.offEvent('themeChanged', handleThemeChange);
        webApp = nextWebApp;
        setTg(webApp);
        applyTelegramTheme();
        webApp.onEvent('themeChanged', handleThemeChange);
      }

      const nextUser = getTelegramUser();
      if (nextUser) {
        setUser(nextUser);
        if (retryTimer) clearInterval(retryTimer);
        return true;
      }

      return false;
    };

    if (!syncTelegramUser()) {
      let attempts = 0;
      retryTimer = setInterval(() => {
        attempts += 1;
        if (syncTelegramUser() || attempts >= 20) clearInterval(retryTimer);
      }, 250);
    }

    return () => {
      if (retryTimer) clearInterval(retryTimer);
      if (webApp) {
        webApp.offEvent('themeChanged', handleThemeChange);
      }
    };
  }, []);

  return {
    tg,
    user,
    userName: getTelegramUserName(user),
    colorScheme: tg?.colorScheme || 'dark'
  };
}
