// src/app/settings/page.js
'use client';
import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Coins, Download, Upload, Trash2, Info, ChevronRight, Sun } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import { triggerHaptic } from '../../lib/telegram';

export default function SettingsPage() {
  const { settings, updateSettings, resetAllData, importAllData, transactions, budgets } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'currency' | 'about'
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const fileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleOpenModal = (type) => {
    setModalType(type);
    setModalOpen(true);
    triggerHaptic('light');
  };

  const selectCurrency = (code, symbol) => {
    updateSettings({ currency: code, currencySymbol: symbol });
    setModalOpen(false);
    triggerHaptic('success');
    showToast(`Asosiy valyuta: ${code} (${symbol}) ga o'zgartirildi`);
  };

  const selectTheme = (themeCode) => {
    updateSettings({ theme: themeCode });
    setModalOpen(false);
    triggerHaptic('success');
    const displayThemeName = themeCode === 'system' ? 'Tizim' : themeCode === 'dark' ? "Qorong'u" : "Yorug'";
    showToast(`Mavzu: ${displayThemeName} rejimiga o'zgartirildi`);
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
      
      showToast('Ma\'lumotlar muvaffaqiyatli eksport qilindi!');
    } catch (e) {
      showToast('Eksportda xatolik yuz berdi', 'error');
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

  const handleReset = () => {
    triggerHaptic('warning');
    if (confirm('Barcha ma\'lumotlarni o\'chirib tashlamoqchimisiz? Ushbu amalni qaytarib bo\'lmaydi!')) {
      resetAllData();
      triggerHaptic('error');
      showToast('Barcha ma\'lumotlar tozalandi', 'error');
    }
  };

  const currencies = [
    { code: 'UZS', name: "O'zbek so'mi", symbol: "so'm" },
    { code: 'USD', name: 'AQSH dollari', symbol: '$' },
    { code: 'EUR', name: 'Yevro', symbol: '€' },
    { code: 'RUB', name: 'Rossiya rubli', symbol: '₽' }
  ];

  return (
    <>
      <header className="view-header">
        <h1>Sozlamalar</h1>
        <p>Ilovani o'zingizga moslashtiring</p>
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
              <div className="settings-label">Asosiy valyuta</div>
              <div className="settings-desc">Kiritiladigan mablag'lar uchun valyuta shakli</div>
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
              <div className="settings-label">Mavzu (Mavzu rejimi)</div>
              <div className="settings-desc">Qorong'u, yorug' yoki tizim mavzusi</div>
            </div>
            <div className="settings-value">
              {settings.theme === 'system' ? 'Tizim' : settings.theme === 'dark' ? "Qorong'u" : "Yorug'"}
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Export Data */}
          <div className="settings-item" onClick={handleExport}>
            <div className="settings-icon" style={{ color: 'var(--info)' }}>
              <Download size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">Ma'lumotlarni eksport qilish</div>
              <div className="settings-desc">Zaxira fayl (JSON) yuklab olish</div>
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Import Data */}
          <div className="settings-item" onClick={handleImportClick}>
            <div className="settings-icon" style={{ color: 'var(--primary)' }}>
              <Upload size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label">Zaxiradan tiklash (Import)</div>
              <div className="settings-desc">JSON fayldan ma'lumotlarni yuklash</div>
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
              <div className="settings-label">Ilova haqida</div>
              <div className="settings-desc">Tizim ma'lumotlari va ishlab chiquvchi</div>
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

          {/* Reset All */}
          <div className="settings-item" onClick={handleReset} style={{ borderColor: 'rgba(255, 107, 107, 0.2)' }}>
            <div className="settings-icon" style={{ color: 'var(--expense)' }}>
              <Trash2 size={20} />
            </div>
            <div className="settings-info">
              <div className="settings-label text-expense">Ma'lumotlarni tozalash</div>
              <div className="settings-desc">Barcha tranzaksiyalarni o'chirish</div>
            </div>
            <ChevronRight size={18} className="settings-arrow" />
          </div>

        </div>
      </section>

      {/* Modal Sheets */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'currency' ? 'Valyuta tanlash' : modalType === 'theme' ? 'Mavzuni tanlash' : 'Ilova haqida'}
      >
        {modalType === 'currency' ? (
          <div className="currency-list">
            {currencies.map(curr => (
              <div 
                key={curr.code} 
                className={`currency-item ${settings.currency === curr.code ? 'selected' : ''}`}
                onClick={() => selectCurrency(curr.code, curr.symbol)}
              >
                <div className="currency-symbol">{curr.symbol}</div>
                <div style={{ flex: 1 }}>
                  <div className="currency-name">{curr.name}</div>
                  <div className="currency-code">{curr.code}</div>
                </div>
              </div>
            ))}
          </div>
        ) : modalType === 'theme' ? (
          <div className="currency-list">
            <div 
              className={`currency-item ${settings.theme === 'system' ? 'selected' : ''}`}
              onClick={() => selectTheme('system')}
            >
              <div className="currency-symbol">⚙️</div>
              <div style={{ flex: 1 }}>
                <div className="currency-name">Tizim mavzusi</div>
                <div className="currency-code">System Default</div>
              </div>
            </div>
            <div 
              className={`currency-item ${settings.theme === 'dark' ? 'selected' : ''}`}
              onClick={() => selectTheme('dark')}
            >
              <div className="currency-symbol">🌙</div>
              <div style={{ flex: 1 }}>
                <div className="currency-name">Qorong'u mavzu</div>
                <div className="currency-code">Dark Mode</div>
              </div>
            </div>
            <div 
              className={`currency-item ${settings.theme === 'light' ? 'selected' : ''}`}
              onClick={() => selectTheme('light')}
            >
              <div className="currency-symbol">☀️</div>
              <div style={{ flex: 1 }}>
                <div className="currency-name">Yorug' mavzu</div>
                <div className="currency-code">Light Mode</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-sm text-center" style={{ padding: '8px 0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>AI Finance Bot</h3>
            <p className="text-secondary" style={{ fontSize: '14px' }}>v1.0.0 (Beta)</p>
            <div className="card card-sm text-center" style={{ margin: '8px 0', fontSize: '14px', lineHeight: '1.6' }}>
              Ushbu Telegram Mini App sizning shaxsiy moliyaviy daromad va xarajatlaringizni kuzatish hamda byudjet nazoratini olib borish uchun maxsus ishlab chiqilgan.
            </div>
            <p className="text-secondary" style={{ fontSize: '12px' }}>
              Ishlab chiquvchi: Antigravity AI Team<br />
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
