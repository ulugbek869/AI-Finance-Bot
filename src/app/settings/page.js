// src/app/settings/page.js
'use client';
import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Coins, Download, Upload, Trash2, Info, ChevronRight, Sun, Languages } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import { triggerHaptic } from '../../lib/telegram';
import { LANGUAGES, t } from '../../lib/i18n';

export default function SettingsPage() {
  const { settings, updateSettings, convertCurrency, resetAllData, importAllData, transactions, budgets } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'currency' | 'about'
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [currencySaving, setCurrencySaving] = useState(false);
  const fileInputRef = useRef(null);
  const language = settings.language || 'uz';

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    setModalOpen(true);
    triggerHaptic('light');
  };

  const selectCurrency = async (code, symbol) => {
    if (currencySaving) return;
    if (code === settings.currency) {
      setModalOpen(false);
      return;
    }

    setCurrencySaving(true);
    try {
      // Hech qanday summa yo'q bo'lsa, konvertatsiya uchun kurs kerak emas.
      // Bu holatda sozlama tarmoq bo'lmasa ham o'zgarishi kerak.
      if (!transactions.length && !budgets.length) {
        await updateSettings({ currency: code, currencySymbol: symbol });
        setModalOpen(false);
        triggerHaptic('success');
        showToast(t(language, 'currencyChanged', { currency: code, symbol }));
        return;
      }

      const response = await fetch('/api/exchange-rates');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Valyuta kurslarini olib bo'lmadi.");

      const result = await convertCurrency({ currency: code, currencySymbol: symbol, rates: data.rates });
      if (!result.success) throw new Error(result.message);

      setModalOpen(false);
      triggerHaptic('success');
      showToast(t(language, 'currencyConverted', { currency: code, symbol }));
    } catch (error) {
      triggerHaptic('error');
      showToast(error.message || t(language, 'currencyFailed'), 'error');
    } finally {
      setCurrencySaving(false);
    }
  };

  const selectTheme = (themeCode) => {
    updateSettings({ theme: themeCode });
    setModalOpen(false);
    triggerHaptic('success');
    const displayThemeName = themeCode === 'system' ? t(language, 'system') : themeCode === 'dark' ? t(language, 'dark') : t(language, 'light');
    showToast(t(language, 'themeChanged', { theme: displayThemeName }));
  };

  const selectLanguage = async (languageCode) => {
    await updateSettings({ language: languageCode });
    setModalOpen(false);
    triggerHaptic('success');
    showToast(t(languageCode, 'languageChanged'));
  };

  const handleExport = () => {
    triggerHaptic('light');
    try {
      const dataStr = JSON.stringify({
        version: 1,
        exportDate: new Date().toISOString(),
        transactions,
        budgets,
        settings
      }, null, 2);
      
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-finance-bot-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast(t(language, 'exported'));
    } catch (e) {
      showToast(t(language, 'exportFailed'), 'error');
    }
  };

  const handleImportClick = () => {
    triggerHaptic('light');
    fileInputRef.current?.click();
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;
      const res = importAllData(text);
      if (res.success) {
        triggerHaptic('success');
        showToast(res.message);
      } else {
        triggerHaptic('error');
        showToast(res.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    triggerHaptic('warning');
    if (confirm(t(language, 'clearConfirm'))) {
      await resetAllData();
      triggerHaptic('error');
      showToast(t(language, 'cleared'), 'error');
    }
  };

  const currencies = [
    { code: 'UZS', name: "O'zbek so'mi", symbol: 'sum' },
    { code: 'USD', name: 'AQSH dollari', symbol: '$' },
    { code: 'EUR', name: 'Yevro', symbol: '€' },
    { code: 'RUB', name: 'Rossiya rubli', symbol: '₽' }
  ];

  return (
    <>
      <header className="view-header">
        <h1>{t(language, 'settings')}</h1>
        <p>{t(language, 'settingsSubtitle')}</p>
      </header>

      {/* Settings Options List */}
      <section className="settings-list-section">
        <div className="settings-list">
          
          {/* Currency selection */}
          <div className="settings-item" onClick={() => handleOpenModal('currency')}>
            <div className="settings-icon" style={{ color: 'var(--income)' }}>
              <Coins size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">{t(language, 'primaryCurrency')}</div>
              <div className="settings-desc">{t(language, 'currencyDescription')}</div>
            </div>
            <div className="settings-value">{settings.currency} ({settings.currencySymbol})</div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Theme selection */}
          <div className="settings-item" onClick={() => handleOpenModal('theme')}>
            <div className="settings-icon" style={{ color: 'var(--primary)' }}>
              <Sun size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">{t(language, 'theme')}</div>
              <div className="settings-desc">{t(language, 'themeDescription')}</div>
            </div>
            <div className="settings-value">
              {settings.theme === 'system' ? t(language, 'system') : settings.theme === 'dark' ? t(language, 'dark') : t(language, 'light')}
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Language selection */}
          <div className="settings-item" onClick={() => handleOpenModal('language')}>
            <div className="settings-icon" style={{ color: 'var(--info)' }}>
              <Languages size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">{t(language, 'language')}</div>
              <div className="settings-desc">{t(language, 'languageDescription')}</div>
            </div>
            <div className="settings-value">{LANGUAGES.find((item) => item.code === language)?.name || "O'zbek"}</div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Export Data */}
          <div className="settings-item" onClick={handleExport}>
            <div className="settings-icon" style={{ color: 'var(--info)' }}>
              <Download size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">{t(language, 'exportData')}</div>
              <div className="settings-desc">{t(language, 'exportDescription')}</div>
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Import Data */}
          <div className="settings-item" onClick={handleImportClick}>
            <div className="settings-icon" style={{ color: 'var(--primary)' }}>
              <Upload size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">{t(language, 'importData')}</div>
              <div className="settings-desc">{t(language, 'importDescription')}</div>
            </div>
            <ChevronRight size={18} className="settings-arrow" />
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              accept=".json"
              style={{ display: 'none' }}
            />
          </div>

          {/* About/Info */}
          <div className="settings-item" onClick={() => handleOpenModal('about')}>
            <div className="settings-icon" style={{ color: 'var(--warning-dark)' }}>
              <Info size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">{t(language, 'about')}</div>
              <div className="settings-desc">{t(language, 'aboutDescription')}</div>
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Reset All */}
          <div className="settings-item" onClick={handleReset} style={{ borderColor: 'rgba(255, 107, 107, 0.2)' }}>
            <div className="settings-icon" style={{ color: 'var(--expense)' }}>
              <Trash2 size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label text-expense">{t(language, 'clearData')}</div>
              <div className="settings-desc">{t(language, 'clearDescription')}</div>
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

        </div>
      </section>

      {/* Modal Sheets */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'currency' ? t(language, 'selectCurrency') : modalType === 'theme' ? t(language, 'selectTheme') : modalType === 'language' ? t(language, 'selectLanguage') : t(language, 'about')}
      >
        {modalType === 'currency' ? (
          <div className="currency-list currency-selector" role="list">
            {currencies.map(curr => (
              <button
                type="button"
                key={curr.code}
                className={`currency-option ${settings.currency === curr.code ? 'selected' : ''}`}
                onClick={() => selectCurrency(curr.code, curr.symbol)}
                aria-pressed={settings.currency === curr.code}
              >
                <span className="currency-symbol">{curr.symbol}</span>
                <span className="currency-details">
                  <span className="currency-name">{curr.name}</span>
                  <span className="currency-code">{curr.code}</span>
                </span>
                <span className="currency-selected-indicator" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        ) : modalType === 'language' ? (
          <div className="language-list" role="list">
            {LANGUAGES.map((item) => (
              <button
                type="button"
                key={item.code}
                className={`language-option ${language === item.code ? 'selected' : ''}`}
                onClick={() => selectLanguage(item.code)}
                aria-pressed={language === item.code}
              >
                <span className="language-code">{item.code.toUpperCase()}</span>
                <span className="language-details">
                  <span className="language-name">{item.name}</span>
                  <span className="language-native-name">{item.nativeName}</span>
                </span>
                <span className="language-selected-indicator" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        ) : modalType === 'theme' ? (
          <div className="language-list" role="list">
            {[
              { code: 'system', icon: '⚙️', name: t(language, 'system'), desc: language === 'uz' ? 'Tizim sozlamasi' : language === 'ru' ? 'Системная тема' : 'System default' },
              { code: 'dark', icon: '🌙', name: t(language, 'dark'), desc: language === 'uz' ? 'Qorong‘u rejim' : language === 'ru' ? 'Темная тема' : 'Dark mode' },
              { code: 'light', icon: '☀️', name: t(language, 'light'), desc: language === 'uz' ? 'Yorug‘ rejim' : language === 'ru' ? 'Светлая тема' : 'Light mode' }
            ].map((themeItem) => (
              <button
                type="button"
                key={themeItem.code}
                className={`language-option ${settings.theme === themeItem.code ? 'selected' : ''}`}
                onClick={() => selectTheme(themeItem.code)}
                aria-pressed={settings.theme === themeItem.code}
              >
                <span className="language-code">{themeItem.icon}</span>
                <span className="language-details">
                  <span className="language-name">{themeItem.name}</span>
                  <span className="language-native-name">{themeItem.desc}</span>
                </span>
                <span className="language-selected-indicator" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-sm text-center" style={{ padding: '8px 0' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px auto', border: '2px solid rgba(255,255,255,0.1)' }}>
              <img src="/bot.svg" alt="AI Finance Bot Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>AI Finance Bot</h3>
            <p className="text-secondary" style={{ fontSize: '14px' }}>v1.0.0 (Beta)</p>
            <div className="card card-sm text-center" style={{ margin: '8px 0', fontSize: '14px', lineHeight: '1.6' }}>
              {t(language, 'appAbout')}
            </div>
            <p className="text-secondary" style={{ fontSize: '12px' }}>
              {t(language, 'developer')}<br />
              Sana: 2026-yil
            </p>
          </div>
        )}
      </Modal>

      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />

      <BottomNav />
    </>
  );
}
