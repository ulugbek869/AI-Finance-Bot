// src/lib/telegram.js

export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const initTelegram = () => {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    console.log('[TG] WebApp initialized');
    return tg;
  }
  return null;
};

export const applyTelegramTheme = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;

  const root = document.documentElement.style;
  const tp = tg.themeParams || {};

  if (tp.bg_color) root.setProperty('--tg-theme-bg-color', tp.bg_color);
  if (tp.secondary_bg_color) root.setProperty('--tg-theme-secondary-bg-color', tp.secondary_bg_color);
  if (tp.text_color) root.setProperty('--tg-theme-text-color', tp.text_color);
  if (tp.hint_color) root.setProperty('--tg-theme-hint-color', tp.hint_color);
  if (tp.link_color) root.setProperty('--tg-theme-link-color', tp.link_color);
  if (tp.button_color) root.setProperty('--tg-theme-button-color', tp.button_color);
  if (tp.button_text_color) root.setProperty('--tg-theme-button-text-color', tp.button_text_color);
};

export const triggerHaptic = (type = 'light') => {
  const tg = getTelegramWebApp();
  if (!tg || !tg.HapticFeedback) return;

  switch (type) {
    case 'light':
    case 'medium':
    case 'heavy':
    case 'rigid':
    case 'soft':
      tg.HapticFeedback.impactOccurred(type);
      break;
    case 'success':
    case 'warning':
    case 'error':
      tg.HapticFeedback.notificationOccurred(type);
      break;
    case 'selection':
      tg.HapticFeedback.selectionChanged();
      break;
  }
};

export const showTelegramMainButton = (text, onClick) => {
  const tg = getTelegramWebApp();
  if (!tg || !tg.MainButton) return;

  tg.MainButton.setText(text);
  tg.MainButton.show();
  tg.MainButton.onClick(onClick);
};

export const hideTelegramMainButton = (onClick) => {
  const tg = getTelegramWebApp();
  if (!tg || !tg.MainButton) return;

  tg.MainButton.hide();
  if (onClick) {
    tg.MainButton.offClick(onClick);
  }
};

export const setupTelegramBackButton = (onClick) => {
  const tg = getTelegramWebApp();
  if (!tg || !tg.BackButton) return;

  tg.BackButton.show();
  tg.BackButton.onClick(onClick);
};

export const hideTelegramBackButton = (onClick) => {
  const tg = getTelegramWebApp();
  if (!tg || !tg.BackButton) return;

  tg.BackButton.hide();
  if (onClick) {
    tg.BackButton.offClick(onClick);
  }
};
