"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Sun,
  Moon,
  LayoutGrid,
  Menu,
  X,
  Filter,
  RefreshCcw,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  User,
  Target,
  Shield
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import DateRangePicker from './DateRangePicker';

const Sidebar = ({ isCollapsed, toggleCollapse, isMobileOpen, closeMobile }: { isCollapsed?: boolean, toggleCollapse?: () => void, isMobileOpen?: boolean, closeMobile?: () => void }) => {
  const { filters, setFilters, filterOptions, isDarkMode, setIsDarkMode, activeTable, setActiveTable, user, logout } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // Reset kota if provinsi changes to keep them in sync
      if (key === 'provinsi') newFilters.kota = '';
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({ 
      startDate: '',
      endDate: '',
      provinsi: '', 
      kota: '',
      pengalaman: '', 
      pendidikan: '', 
      jenisKelamin: '', 
      minatPosisi: '',
      showSelectedOnly: false
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div className="mobile-backdrop" onClick={closeMobile} />
      )}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-box">
            <img src="/sourcingicon.jpeg" alt="Logo" className="logo-img" />
          </div>
          <div className="logo-text">
            <span className="title">SUPERBASE</span>
            <span className="subtitle">SOURCING DEPARTMENT</span>
          </div>
          {isMobileOpen && (
            <button className="mobile-close-btn" onClick={closeMobile}>
              <X size={20} />
            </button>
          )}
        </div>

      <nav className="sidebar-nav">
        {!isCollapsed && (
          <div className="nav-section sidebar-filters" style={{ marginBottom: '16px' }}>
             <div className="filter-header">
              <span className="section-title" style={{ padding: 0, margin: 0 }}>DATABASE SOURCE</span>
            </div>
            <div className="filter-group">
              <select 
                value={activeTable} 
                onChange={(e) => setActiveTable(e.target.value)}
                style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)', fontWeight: 'bold' }}
              >
                {[
                  { value: 'FLK_Nasional', label: 'FLK Nasional' },
                  { value: 'FLK_HC', label: 'FLK HC' },
                  { value: 'FLK_ADIRA', label: 'FLK ADIRA' },
                  { value: 'FLK_REVOFIF', label: 'FLK REVOFIF' },
                  { value: 'FLK_BI', label: 'FLK BI' },
                  { value: 'FLK_Jateng_CC', label: 'FLK Jateng CC' },
                  { value: 'FLK_Lookerin', label: 'FLK Lookerin' },
                  { value: 'FLK_MRM', label: 'FLK MRM' },
                  { value: 'FLK_Midea', label: 'FLK Midea' },
                  { value: 'FLK_Onsite', label: 'FLK Onsite' },
                  { value: 'FLK_Pertanian', label: 'FLK Pertanian' },
                  { value: 'FLK_Recruitment', label: 'FLK Recruitment' },
                  { value: 'FLK_Revoadira', label: 'FLK Revoadira' },
                ].filter(opt => user?.username === 'superadmin' || user?.akses_sumber.includes(opt.value))
                .map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {!isCollapsed && (
          <div className="nav-section sidebar-filters">
            <div className="filter-header">
              <span className="section-title" style={{ padding: 0, margin: 0 }}>FILTERS</span>
              <button className="reset-filter-btn" onClick={resetFilters} title="Reset Filters">
                <RefreshCcw size={12} /> Reset
              </button>
            </div>
            
            <div className="filter-group">
              <label><Calendar size={12} color="#3b82f6" /> Rentang Tanggal</label>
              <DateRangePicker 
                startDate={filters.startDate} 
                endDate={filters.endDate} 
                onChange={(start, end) => {
                  handleFilterChange('startDate', start);
                  handleFilterChange('endDate', end);
                }} 
              />
            </div>
            <div className="filter-group">
              <label><MapPin size={12} color="#ef4444" /> Provinsi Domisili</label>
              <select value={filters.provinsi} onChange={(e) => handleFilterChange('provinsi', e.target.value)}>
                <option value="">Semua Provinsi</option>
                {filterOptions.provinsis.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label><MapPin size={12} color="#8b5cf6" /> Kota / Kecamatan</label>
              <select value={filters.kota} onChange={(e) => handleFilterChange('kota', e.target.value)}>
                <option value="">Semua Kota/Kec</option>
                {filterOptions.kotas.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label><Briefcase size={12} color="#f59e0b" /> Pengalaman Kerja</label>
              <select value={filters.pengalaman} onChange={(e) => handleFilterChange('pengalaman', e.target.value)}>
                <option value="">Semua Pengalaman</option>
                {filterOptions.pengalamans.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label><GraduationCap size={12} color="#10b981" /> Pendidikan Terakhir</label>
              <select value={filters.pendidikan} onChange={(e) => handleFilterChange('pendidikan', e.target.value)}>
                <option value="">Semua Pendidikan</option>
                {filterOptions.pendidikans.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label><User size={12} color="#a855f7" /> Jenis Kelamin</label>
              <select value={filters.jenisKelamin} onChange={(e) => handleFilterChange('jenisKelamin', e.target.value)}>
                <option value="">Semua Jenis Kelamin</option>
                {filterOptions.jenisKelamins.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label><Target size={12} color="#06b6d4" /> Minat Posisi</label>
              <select value={filters.minatPosisi} onChange={(e) => handleFilterChange('minatPosisi', e.target.value)}>
                <option value="">Semua Posisi</option>
                {filterOptions.minatPosis.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        )}

      </nav>

      <div className="sidebar-footer">
        <div className="tooltip-wrapper">
          <a 
            href="/" 
            onClick={(e) => { e.preventDefault(); router.push('/'); }} 
            className={`footer-item management-btn ${pathname === '/' ? 'active' : ''}`}
          >
            <div className="icon-wrapper">
              <LayoutDashboard size={18} className="footer-icon" />
            </div>
            {!isCollapsed && <span>Dashboard Utama</span>}
          </a>
          {isCollapsed && <div className="sidebar-tooltip">Dashboard Utama</div>}
        </div>
        {user?.username === 'superadmin' && (
          <div className="tooltip-wrapper">
            <a 
              href="/users" 
              onClick={(e) => { e.preventDefault(); router.push('/users'); }} 
              className={`footer-item management-btn ${pathname === '/users' ? 'active' : ''}`}
            >
              <div className="icon-wrapper">
                <Shield size={18} className="footer-icon" />
              </div>
              {!isCollapsed && <span>User Management</span>}
            </a>
            {isCollapsed && <div className="sidebar-tooltip">User Management</div>}
          </div>
        )}
        <div className="tooltip-wrapper">
          <div className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            <div className="icon-wrapper">
              {isDarkMode ? <Sun size={18} className="footer-icon" /> : <Moon size={18} className="footer-icon" />}
            </div>
            {!isCollapsed && <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>}
          </div>
          {isCollapsed && <div className="sidebar-tooltip">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</div>}
        </div>
        <div className="tooltip-wrapper">
          <div className="footer-item" onClick={toggleCollapse}>
            <div className="icon-wrapper">
              <Menu size={18} className="footer-icon" />
            </div>
            {!isCollapsed && <span>Sembunyikan</span>}
          </div>
          {isCollapsed && <div className="sidebar-tooltip">Sembunyikan</div>}
        </div>
        <div className="tooltip-wrapper">
          <div className="user-profile" onClick={logout}>
            <div className="avatar" style={{ overflow: 'hidden', padding: '4px', background: 'white' }}>
              <img src="/sourcingicon.jpeg" alt="SIM" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            {!isCollapsed && (
              <div className="user-info">
                <span className="user-name">{user?.nama_user || 'Guest'}</span>
                <span className="user-role">{user?.group_user || 'Unknown'} - Keluar</span>
              </div>
            )}
          </div>
          {isCollapsed && <div className="sidebar-tooltip">Keluar</div>}
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          width: 230px;
          height: 100vh;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 100;
          transition: width 0.3s;
          overflow: visible;
        }

        .sidebar.collapsed {
          width: 80px;
        }

        .sidebar.collapsed .logo-text,
        .sidebar.collapsed .section-title,
        .sidebar.collapsed .name,
        .sidebar.collapsed .soon-badge,
        .sidebar.collapsed .theme-toggle span,
        .sidebar.collapsed .footer-item span {
          display: none;
        }

        .sidebar.collapsed .nav-item {
          justify-content: center;
          padding: 10px 0;
        }
        
        .sidebar.collapsed .sidebar-header {
          justify-content: center;
          padding: 0;
        }

        .sidebar.collapsed .theme-toggle,
        .sidebar.collapsed .footer-item {
          justify-content: center;
          padding: 10px 0;
          gap: 0;
          width: 100%;
        }

        .sidebar.collapsed .user-profile {
          justify-content: center;
          padding: 8px 0;
          gap: 0;
          width: 100%;
          background: transparent;
        }

        .sidebar.collapsed .sidebar-footer {
          padding: 4px 0;
          align-items: center;
        }

        .sidebar.collapsed .tooltip-wrapper {
          justify-content: center;
          width: 100%;
        }

        /* Disable horizontal hover shift in collapsed mode */
        .sidebar.collapsed .theme-toggle:hover,
        .sidebar.collapsed .footer-item:hover {
          transform: none;
        }
        .sidebar.collapsed .user-profile:hover {
          transform: none;
        }

        .sidebar.collapsed .active-dot {
          position: absolute;
          right: 8px;
        }

        .sidebar-header {
          height: 70px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-box {
          width: 44px;
          height: 44px;
          background: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }

        .logo-text {
          display: flex;
          flex-direction: column;
        }

        .logo-text .title {
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.05em;
        }

        .logo-text .subtitle {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px;
          overflow-y: visible; /* Allow popovers to leak out */
          /* Hide scrollbar for Chrome, Safari and Opera */
          &::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .nav-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          padding: 0 12px;
          margin-bottom: 8px;
          display: block;
          letter-spacing: 0.1em;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: var(--text-muted);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 4px;
          position: relative;
          cursor: pointer;
        }

        .nav-item:hover {
          background: rgba(0, 158, 217, 0.08);
          color: #009ed9;
          transform: translateX(4px);
        }

        .nav-item:hover :global(svg) {
          transform: scale(1.1);
          color: #009ed9;
        }

        .nav-item.active {
          background: rgba(0, 158, 217, 0.15);
          color: #009ed9;
          font-weight: 700;
          box-shadow: inset 0 0 0 1px rgba(0, 158, 217, 0.2);
        }

        .sidebar-management .nav-item {
          border: 1px solid transparent;
        }

        .sidebar-management .nav-item:hover {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateX(6px) scale(1.02);
        }

        .sidebar-management .nav-item:hover :global(svg) {
          color: #8b5cf6;
        }

        .nav-item.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .soon-badge {
          font-size: 10px;
          font-weight: 600;
          background: rgba(148, 163, 184, 0.15);
          color: var(--text-muted);
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .icon {
          min-width: 20px;
        }

        .name {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
        }

        .active-dot {
          width: 6px;
          height: 6px;
          background: #8b8efc;
          border-radius: 50%;
        }

        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid var(--border-color);
        }

        .theme-toggle, .footer-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          color: var(--text-muted);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 10px;
          text-decoration: none;
          border: 1px solid transparent;
          position: relative;
          width: 100%;
          box-sizing: border-box;
          min-height: 40px;
        }

        .theme-toggle:hover, .footer-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-main);
        }

        .footer-icon {
          flex-shrink: 0;
          transition: transform 0.2s;
        }

        .theme-toggle:hover .footer-icon,
        .footer-item:hover .footer-icon {
          transform: scale(1.15);
        }

        .icon-wrapper {
          width: 32px;
          height: 32px;
          min-width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .management-btn {
          overflow: hidden;
        }
        .management-btn:hover {
          background: rgba(139, 92, 246, 0.1) !important;
          color: #a855f7 !important;
          transform: translateX(3px);
        }
        .management-btn.active {
          background: rgba(139, 92, 246, 0.12) !important;
          color: #a855f7 !important;
          box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.25);
        }
        .management-btn span {
          display: inline-block;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
          opacity: 0.85;
        }
        .management-btn:hover span {
          transform: translateX(2px);
          opacity: 1;
        }
        .management-btn .footer-icon {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
        }
        .management-btn:hover .footer-icon {
          transform: scale(1.2) rotate(-8deg);
          color: #a855f7;
        }

        /* Tooltip for collapsed state */
        .tooltip-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .sidebar-tooltip {
          position: absolute;
          left: calc(100% + 10px);
          background: rgba(15, 23, 42, 0.97);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
          font-size: 13px;
          font-weight: 600;
          padding: 7px 13px;
          border-radius: 9px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transform: translateX(-10px) scale(0.95);
          transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 24px rgba(0,0,0,0.45);
          z-index: 999;
        }
        .sidebar-tooltip::before {
          content: '';
          position: absolute;
          left: -5px;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: rgba(255,255,255,0.12);
          border-left: none;
        }
        .tooltip-wrapper:hover .sidebar-tooltip {
          opacity: 1;
          transform: translateX(0) scale(1);
        }

        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-filters {
          margin-top: 12px;
          padding: 0 12px;
        }

        .filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .reset-filter-btn {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .reset-filter-btn:hover {
          color: var(--text-main);
          border-color: var(--text-muted);
        }

         .filter-group {
          margin-bottom: 8px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .filter-group label {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.3s ease;
        }

        .filter-group label svg {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .filter-group:hover label {
          color: var(--text-main);
        }

        .filter-group:hover label svg {
          transform: scale(1.2) rotate(5deg);
        }

         .filter-group select {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-main);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          outline: none;
          width: 100%;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .filter-group select:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .filter-group select:focus {
          border-color: #009ed9;
          box-shadow: 0 0 0 3px rgba(0, 158, 217, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.06);
        }

        .filter-group select option {
          background-color: var(--sidebar-bg);
          color: var(--text-main);
        }

        .user-profile {
          margin-top: 4px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          width: 100%;
          box-sizing: border-box;
        }

        .user-profile:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.15);
          transform: translateY(-2px);
        }

        .user-profile:hover .user-name { color: #ef4444; }
        .user-profile:hover .user-role { color: #f87171; }

        .avatar {
          width: 32px;
          height: 32px;
          min-width: 32px;
          min-height: 32px;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .user-profile:hover .avatar {
          transform: scale(1.05);
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
        }

        .user-role {
          font-size: 11px;
          color: var(--text-muted);
        }

        .mobile-backdrop {
          display: none;
        }

        .mobile-close-btn {
          display: none;
        }

        /* Responsive Media Queries */
        @media (max-width: 1024px) {
          .sidebar {
            width: 80px;
          }
          .sidebar .logo-text,
          .sidebar .section-title,
          .sidebar .name,
          .sidebar .soon-badge,
          .sidebar .theme-toggle span,
          .sidebar .user-info,
          .sidebar .footer-item span {
            display: none;
          }
          .sidebar .nav-item {
            justify-content: center;
            padding: 10px 0;
          }
          .sidebar .sidebar-header {
            justify-content: center;
            padding: 0;
          }
          .sidebar .theme-toggle,
          .sidebar .footer-item,
          .sidebar .user-profile {
            justify-content: center;
            padding: 10px 0;
          }
          .sidebar .active-dot {
            position: absolute;
            right: 8px;
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            width: 260px; /* Full width when opened on mobile */
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.5);
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          
          /* Restore elements inside sidebar when mobile menu is open */
          .sidebar .logo-text,
          .sidebar .section-title,
          .sidebar .name,
          .sidebar .soon-badge,
          .sidebar .theme-toggle span,
          .sidebar .user-info,
          .sidebar .footer-item span {
            display: flex;
          }
          .sidebar .nav-item,
          .sidebar .theme-toggle,
          .sidebar .footer-item,
          .sidebar .user-profile {
            justify-content: flex-start;
            padding: 10px 12px;
          }
          .sidebar .sidebar-header {
            justify-content: flex-start;
            padding: 0 24px;
          }

          .mobile-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(2px);
            z-index: 90;
          }
          .mobile-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-muted);
            margin-left: auto;
            cursor: pointer;
            padding: 4px;
          }
        }
      `}</style>
    </aside>
    </>
  );
};

export default Sidebar;
