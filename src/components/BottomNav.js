// src/components/BottomNav.js
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, PieChart, Wallet, Settings } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Bosh sahifa', icon: Home, path: '/' },
    { label: 'Statistika', icon: PieChart, path: '/stats' },
    { label: 'Byudjet', icon: Wallet, path: '/budget' },
    { label: 'AI', icon: Sparkles, path: '/ai' },
    { label: 'Sozlamalar', icon: Settings, path: '/settings' }
  ];

  const handleNavClick = () => {
    triggerHaptic('selection');
  };

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            onClick={handleNavClick}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
