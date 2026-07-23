// src/app/ai/page.js
'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Send } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { triggerHaptic } from '../../lib/telegram';
import { useTelegram } from '../../hooks/useTelegram';
import { buildFinancialContext } from '../../lib/ai-context';
import { getLocale, t } from '../../lib/i18n';

const AI_REQUEST_TIMEOUT_MS = 25_000;

export default function AIPage() {
  const {
    transactions,
    balance,
    totalIncome,
    totalExpense,
    budgets,
    settings,
    categories,
  } = useApp();
  const { userName } = useTelegram();
  const language = settings.language || 'uz';
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: t(language, 'aiGreetingWithName', { name: userName || t(language, 'guestUser') }),
      time: new Date().toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const requestControllerRef = useRef(null);
  const requestTimeoutRef = useRef(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    setMessages((previous) => {
      if (previous.length !== 1 || previous[0].sender !== 'ai') return previous;

      return [{
        ...previous[0],
        text: t(language, 'aiGreetingWithName', { name: userName || t(language, 'guestUser') }),
      }];
    });
  }, [language, userName]);

  useEffect(() => {
    unmountedRef.current = false;

    return () => {
      unmountedRef.current = true;
      clearTimeout(requestTimeoutRef.current);
      requestControllerRef.current?.abort();
    };
  }, []);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || isTyping || requestControllerRef.current) return;

    triggerHaptic('light');

    const userMsg = {
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    const controller = new AbortController();
    requestControllerRef.current = controller;
    requestTimeoutRef.current = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

    try {
      const context = buildFinancialContext({
        transactions,
        balance,
        totalIncome,
        totalExpense,
        budgets,
        settings,
        categories,
        userName,
      });

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: textToSend.trim(),
          context,
          history: messages.slice(-6),
          language,
        }),
      });

      const data = await res.json().catch(() => ({}));

      const aiMsg = {
        sender: 'ai',
        text: res.ok
          ? data.reply
          : t(language, 'aiError'),
        time: new Date().toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      triggerHaptic(res.ok ? 'success' : 'error');
    } catch (error) {
      if (unmountedRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: error.name === 'AbortError'
            ? t(language, 'aiTimeout')
            : t(language, 'aiOffline'),
          time: new Date().toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      triggerHaptic('error');
    } finally {
      clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      if (!unmountedRef.current) setIsTyping(false);
    }
  };

  const quickPrompts = [
    { text: t(language, 'promptExpenses'), query: t(language, 'promptExpenses').replace('📊 ', '') },
    { text: t(language, 'promptSavings'), query: t(language, 'promptSavings').replace('💡 ', '') },
    { text: t(language, 'promptBudget'), query: t(language, 'promptBudget').replace('📈 ', '') },
  ];

  return (
    <>
      <header className="view-header">
        <h1>{t(language, 'aiTitle')}</h1>
        <p>{t(language, 'aiSubtitle')}</p>
      </header>

      <section
        className="card flex flex-col"
        style={{ height: 'calc(100vh - 280px)', padding: '12px', minHeight: '350px' }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.map((msg, idx) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={idx}
                className={`flex gap-xs ${isAI ? '' : 'justify-end'}`}
                style={{ maxWidth: '85%', alignSelf: isAI ? 'flex-start' : 'flex-end' }}
              >
                {isAI && (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/bot.svg"
                      alt="AI Bot"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div
                  style={{
                    background: isAI ? 'var(--glass-bg)' : 'var(--primary-gradient)',
                    border: isAI ? '1px solid var(--glass-border)' : 'none',
                    color: isAI ? 'var(--text-primary)' : '#fff',
                    padding: '10px 14px',
                    borderRadius: isAI ? '0 16px 16px 16px' : '16px 0 16px 16px',
                    fontSize: '14px',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {msg.text}
                  <div
                    className="text-secondary"
                    style={{
                      fontSize: '9px',
                      textAlign: 'right',
                      marginTop: '4px',
                      opacity: 0.6,
                      color: isAI ? 'var(--text-secondary)' : '#fff',
                    }}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-xs" style={{ alignSelf: 'flex-start' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/bot.svg"
                  alt="AI Bot"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div
                className="animate-pulse"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  padding: '10px 16px',
                  borderRadius: '0 16px 16px 16px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                }}
              >
                {t(language, 'aiThinking')}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {messages.length === 1 && !isTyping && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              {t(language, 'quickQuestions')}
            </span>
            <div className="flex flex-col gap-xs">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.query)}
                  className="btn btn-outline btn-sm"
                  style={{ justifyContent: 'flex-start', fontSize: '13px', padding: '10px 14px' }}
                >
                  {p.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className="flex items-center gap-xs"
          style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}
        >
          <input
            type="text"
            placeholder={t(language, 'questionPlaceholder')}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputVal)}
            className="form-input"
            style={{ padding: '10px 16px', fontSize: '14px', borderRadius: '20px' }}
            disabled={isTyping}
          />
          <button
            onClick={() => handleSendMessage(inputVal)}
            className="btn btn-primary"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
            disabled={isTyping || !inputVal.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </section>

      <BottomNav />
    </>
  );
}
