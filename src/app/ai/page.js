// src/app/ai/page.js
'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Send } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { triggerHaptic } from '../../lib/telegram';
import { buildFinancialContext } from '../../lib/ai-context';

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
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Salom! Men sizning shaxsiy moliyaviy maslahatchingizman. Men sizning balansingiz, xarajatlaringiz va oylik byudjetingizni tahlil qila olaman. Sizga qanday yordam bera olaman?",
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim() || isTyping) return;

    triggerHaptic('light');

    const userMsg = {
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const context = buildFinancialContext({
        transactions,
        balance,
        totalIncome,
        totalExpense,
        budgets,
        settings,
        categories,
      });

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          context,
          history: messages.slice(-6),
        }),
      });

      const data = await res.json();

      const aiMsg = {
        sender: 'ai',
        text: res.ok
          ? data.reply
          : data.error || 'Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      triggerHaptic(res.ok ? 'success' : 'error');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Internet aloqasi yo\'q yoki server javob bermadi. Qayta urinib ko\'ring.',
          time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      triggerHaptic('error');
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    { text: '📊 Xarajatlarimni tahlil qil', query: 'xarajatlarimni tahlil qil' },
    { text: "💡 Pul tejash bo'yicha maslahat", query: "tejash bo'yicha maslahat" },
    { text: '📈 Byudjetim ahvoli qanday?', query: 'byudjetim ahvoli qanday' },
  ];

  return (
    <>
      <header className="view-header">
        <h1>AI Maslahatchi</h1>
        <p>Sun&apos;iy intellekt moliya maslahatchisi bilan suhbat</p>
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
                    color: '#fff',
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
                AI maslahatchi tahlil qilmoqda...
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
              Tezkor savollar:
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
            placeholder="Savolingizni yozing..."
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
