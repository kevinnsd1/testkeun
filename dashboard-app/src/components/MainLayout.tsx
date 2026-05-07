"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Bell, Sun, Moon, Menu, X, User as UserIcon } from 'lucide-react';
import { DashboardProvider } from '@/context/DashboardContext';
import { usePathname } from 'next/navigation';

import { useDashboard } from '@/context/DashboardContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isDarkMode, setIsDarkMode, user } = useDashboard();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Wait for context to load from localStorage
    const timer = setTimeout(() => setIsInitialLoad(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  if (isInitialLoad && !isLoginPage) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: 'white' }}>
        <div className="loading-spinner"></div>
        <style jsx>{`.loading-spinner { width:40px; height:40px; border:4px solid rgba(255,255,255,0.1); border-top-color:#009ed9; border-radius:50%; animation:spin 1s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isLoginPage) return <div className="login-layout">{children}</div>;

  return (
    <div className={`layout ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        isMobileOpen={isMobileOpen}
        closeMobile={() => setIsMobileOpen(false)}
      />
      <main className="main-content">
        <header className="top-header">
          <div className="company-branding">
            <button className="mobile-toggle icon-btn" onClick={() => setIsMobileOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="brand-text">
              <h1>Database Pelamar FLK</h1>
            </div>
          </div>
          
          <div className="header-actions">
            <div className="user-greeting">
              <UserIcon size={16} />
              <span>Halo, <strong>{user?.nama_user?.split(' ')[0] || 'User'}</strong></span>
            </div>
            <button className="theme-pill" onClick={toggleTheme}>
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
            </button>
          </div>
        </header>
        
        <div className="page-container">
          {children}
        </div>
        <footer className="main-footer">
          <p>Create &amp; Develope by Sourcing Head Office</p>
        </footer>
      </main>

      <style jsx>{`
        .layout {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          margin-left: 230px;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.3s;
          min-width: 0;
          overflow-x: clip;
        }
        
        .layout.collapsed .main-content {
          margin-left: 80px;
        }

        .top-header {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 80px;
          background: linear-gradient(90deg, #009ed9 0%, #22d3ee 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          color: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          width: 100%;
        }

        .company-branding {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo-circle {
          width: 44px;
          height: 44px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .inner-circle {
          width: 24px;
          height: 24px;
          border: 4px solid #009ed9;
          border-radius: 50%;
        }

        .brand-text h1 {
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .user-greeting {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.1);
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .user-greeting strong { color: #f0f9ff; }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        .theme-pill {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          padding: 6px 16px;
          border-radius: 20px;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          cursor: pointer;
        }

        .page-container {
          padding: 32px;
          flex: 1;
        }

        .mobile-toggle {
          display: none;
        }

        /* Responsive Media Queries */
        @media (max-width: 1440px) {
          .page-container {
            padding: 20px;
          }
          .top-header {
            padding: 0 24px;
          }
        }

        @media (max-width: 1024px) {
          .main-content {
            margin-left: 80px; /* Match collapsed sidebar width */
          }
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0 !important;
          }
          .top-header {
            padding: 0 16px;
            height: 70px;
          }
          .company-branding {
            gap: 12px;
          }
          .brand-text h1 {
            font-size: 14px;
          }
          .brand-text p {
            font-size: 10px;
          }
          .mobile-toggle {
            display: flex;
            color: white;
            margin-right: 8px;
          }
          .page-container {
            padding: 16px;
          }
          .theme-pill span {
            display: none;
          }
          .theme-pill {
            padding: 8px;
            border-radius: 50%;
          }
        }
        
        @media (max-width: 480px) {
          .brand-text {
            display: none; /* Hide brand text on very small screens */
          }
        }

        .main-footer {
          padding: 24px 32px;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          border-top: 1px solid var(--border-color);
          margin-top: auto;
        }
      `}</style>
    </div>
  );
}
