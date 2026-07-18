// src/app/ai/page.js
'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Send, Sparkles, User, Brain } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { triggerHaptic } from '../../lib/telegram';
import { findCategoryById } from '../../lib/categories';

export default function AIPage() {
  const { transactions, balance, totalIncome, totalExpense, budgets, settings } = useApp();
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Salom! Men sizning shaxsiy moliyaviy maslahatchingizman. Men sizning balansingiz, xarajatlaringiz va oylik byudjetingizni tahlil qila olaman. Sizga qanday yordam bera olaman?",
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Analyze actual data to draft response
  const generateAIResponse = (query) => {
    const q = query.toLowerCase();

    // Group expenses
    const expenseByCategory = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!expenseByCategory[t.categoryId]) {
          expenseByCategory[t.categoryId] = 0;
        }
        expenseByCategory[t.categoryId] += t.amount;
      });

    const topCategories = Object.entries(expenseByCategory)
      .map(([catId, amount]) => {
        const cat = findCategoryById(catId);
        return { name: cat?.name || 'Boshqa', amount, icon: cat?.icon || '📌' };
      })
      .sort((a, b) => b.amount - a.amount);

    const formattedBalance = new Intl.NumberFormat('uz-UZ').format(balance);
    const formattedExpense = new Intl.NumberFormat('uz-UZ').format(totalExpense);
    const formattedIncome = new Intl.NumberFormat('uz-UZ').format(totalIncome);

    // Prompt 1: Analyze expenses
    if (q.includes('tahlil') || q.includes('analiz') || q.includes('analysis')) {
      if (transactions.length === 0) {
        return "Tahlil qilish uchun hech qanday tranzaksiya topilmadi. Iltimos, bosh sahifada daromad yoki xarajatlaringizni kiriting, keyin tahlil qilamiz! 📊";
      }

      let analysis = `Sizning joriy balansingiz: **${formattedBalance} ${settings.currencySymbol}**.\nJami daromad: **+${formattedIncome} ${settings.currencySymbol}**\nJami xarajat: **-${formattedExpense} ${settings.currencySymbol}**\n\n`;

      if (topCategories.length > 0) {
        analysis += `Eng ko'p xarajat qilgan kategoriyalaringiz:\n`;
        topCategories.slice(0, 3).forEach((item, idx) => {
          analysis += `${idx + 1}. ${item.icon} **${item.name}**: ${new Intl.NumberFormat('uz-UZ').format(item.amount)} ${settings.currencySymbol}\n`;
        });
        
        // Custom smart logic advice
        const topCat = topCategories[0];
        analysis += `\n💡 **Maslahat**: Siz eng ko'p mablag'ni **${topCat.name}** (${topCat.icon}) uchun sarflayapsiz. Ushbu kategoriya bo'yicha xarajatlarni 10-15% ga qisqartirish orqali oylik jamg'armangizni sezilarli darajada oshirishingiz mumkin.`;
      }
      return analysis;
    }

    // Prompt 2: Save money tips
    if (q.includes('tejash') || q.includes('save') || q.includes('maslahat') || q.includes('tip')) {
      if (totalExpense > totalIncome * 0.8 && totalIncome > 0) {
        return `⚠️ **Ogohlantirish**: Siz daromadingizning **${Math.round((totalExpense/totalIncome)*100)}%** qismini sarflab yubordingiz. \n\nPul tejash bo'yicha maslahatlar:\n1. Oylik byudjet limitlarini o'rnating.\n2. Do'konga borishdan oldin har doim ro'yxat tuzing.\n3. Har bir xarajat oldidan 24 soatlik qoidaga amal qiling (darhol xarid qilmang).`;
      }
      return `Moliya tejash bo'yicha tavsiyalarim:\n1. **50/30/20 qoidasi**: Daromadning 50% qismini zaruriy xarajatlarga, 30% xohishlarga va 20% jamg'armaga yo'naltiring.\n2. **Kichik xarajatlar**: Kundalik mayda xarajatlar (masalan, kofe, taksi) oy oxirida katta summani tashkil qiladi. Ularni muntazam yozib boring.\n3. **Byudjet**: Bizning Byudjet bo'limimizda limit o'rnating va uni buzmaslikka harakat qiling.`;
    }

    // Prompt 3: Budget status
    if (q.includes('byudjet') || q.includes('limit') || q.includes('budget')) {
      if (budgets.length === 0) {
        return "Siz hali birorta kategoriya uchun limit o'rnatmadingiz. Byudjet bo'limiga o'tib, oylik limitlaringizni belgilang. Bu sizga pulingizni nazorat qilishga yordam beradi! 📊";
      }
      
      let budgetReport = `Joriy oylik limitlaringiz holati:\n`;
      let dangerFound = false;

      budgets.forEach(b => {
        const cat = findCategoryById(b.categoryId);
        const spent = transactions
          .filter(t => t.type === 'expense' && t.categoryId === b.categoryId)
          .reduce((s, t) => s + t.amount, 0);
        
        const percent = Math.round((spent / b.amount) * 100);
        budgetReport += `- ${cat?.icon || '📌'} **${cat?.name || 'Boshqa'}**: ${percent}% sarflandi (${new Intl.NumberFormat('uz-UZ').format(spent)} / ${new Intl.NumberFormat('uz-UZ').format(b.amount)} ${settings.currencySymbol})\n`;
        
        if (percent >= 100) dangerFound = true;
      });

      if (dangerFound) {
        budgetReport += `\n🚨 **Diqqat**: Ba'zi byudjet limitlaridan oshib ketgansiz! Xarajatlarni tezda to'xtatishingizni tavsiya qilaman.`;
      } else {
        budgetReport += `\n✅ Hamma byudjet limitlari xavfsiz holatda. Barakalla!`;
      }
      return budgetReport;
    }

    // Default response
    return `Savolingiz uchun rahmat! 💰\n\nMen sizning moliyaviy ma'lumotlaringizni tahlil qila olaman. Quyidagi tayyor tugmalardan foydalanib ko'rishingiz mumkin:\n- **Xarajatlarimni tahlil qil**\n- **Pul tejash bo'yicha maslahat**\n- **Byudjetim ahvoli qanday?**`;
  };

  const handleSendMessage = (textToSend) => {
    if (!textToSend.trim()) return;

    triggerHaptic('light');

    // Add user message
    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Simulated typing response
    setTimeout(() => {
      const responseText = generateAIResponse(textToSend);
      const aiMsg = {
        sender: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
      triggerHaptic('success');
    }, 1200);
  };

  const quickPrompts = [
    { text: "📊 Xarajatlarimni tahlil qil", query: "xarajatlarimni tahlil qil" },
    { text: "💡 Pul tejash bo'yicha maslahat", query: "tejash bo'yicha maslahat" },
    { text: "📈 Byudjetim ahvoli qanday?", query: "byudjetim ahvoli qanday" }
  ];

  return (
    <>
      <header className="view-header">
        <h1>AI Maslahatchi</h1>
        <p>Sun'iy intellekt moliya maslahatchisi bilan suhbat</p>
      </header>

      {/* Chat Area */}
      <section className="card flex flex-col" style={{ height: 'calc(100vh - 280px)', padding: '12px', minHeight: '350px' }}>
        
        {/* Messages List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((msg, idx) => {
            const isAI = msg.sender === 'ai';
            return (
              <div 
                key={idx} 
                className={`flex gap-xs ${isAI ? '' : 'justify-end'}`}
                style={{ maxWidth: '85%', alignSelf: isAI ? 'flex-start' : 'flex-end' }}
              >
                {isAI && (
                  <div className="flex items-center justify-center" style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0
                  }}>
                    <img src="/bot.svg" alt="AI Bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                
                <div style={{ 
                  background: isAI ? 'var(--glass-bg)' : 'var(--primary-gradient)',
                  border: isAI ? '1px solid var(--glass-border)' : 'none',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: isAI ? '0 16px 16px 16px' : '16px 0 16px 16px',
                  fontSize: '14px',
                  whiteSpace: 'pre-line'
                }}>
                  {msg.text}
                  <div className="text-secondary" style={{ 
                    fontSize: '9px', textAlign: 'right', marginTop: '4px', opacity: 0.6,
                    color: isAI ? 'var(--text-secondary)' : '#fff'
                  }}>
                    {msg.time}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-xs" style={{ alignSelf: 'flex-start' }}>
              <div className="flex items-center justify-center" style={{ 
                width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0
              }}>
                <img src="/bot.svg" alt="AI Bot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="animate-pulse" style={{ 
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                padding: '10px 16px',
                borderRadius: '0 16px 16px 16px',
                fontSize: '13px',
                color: 'var(--text-secondary)'
              }}>
                AI maslahatchi tahlil qilmoqda...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        {messages.length === 1 && !isTyping && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Tezkor savollar:</span>
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

        {/* Input Bar */}
        <div className="flex items-center gap-xs" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
          <input
            type="text"
            placeholder="Savolingizni yozing..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputVal)}
            className="form-input"
            style={{ padding: '10px 16px', fontSize: '14px', borderRadius: '20px' }}
          />
          <button
            onClick={() => handleSendMessage(inputVal)}
            className="btn btn-primary"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', flexShrink: 0 }}
          >
            <Send size={18} />
          </button>
        </div>

      </section>

      <BottomNav />
    </>
  );
}
