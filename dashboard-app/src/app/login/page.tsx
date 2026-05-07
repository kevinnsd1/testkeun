"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDashboard } from '@/context/DashboardContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setUser, user } = useDashboard();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: dbError } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('status', 'AKTIF')
        .single();

      if (dbError || !data) {
        setError('Username atau Password salah.');
        setLoading(false);
        return;
      }

      // Successful login
      setUser({
        username: data.username,
        nama_user: data.nama_user,
        group_user: data.group_user,
        akses_sumber: data.akses_sumber || []
      });

      router.push('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan pada server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="logo-box">
            <img src="/sourcingicon.jpeg" alt="SIMGROUP Logo" className="logo-img" />
          </div>
          <div className="logo-text">
            <span className="title">SUPERBASE</span>
            <span className="subtitle">SOURCING DEPARTMENT</span>
          </div>
          <h2>Pelamar Database FLK</h2>
          <p>Silakan masuk untuk melanjutkan akses data FLK</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {error && (
            <div className="error-message">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <LogIn size={20} />
                <span>Masuk Sekarang</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Create & Develope by Sourcing Head Office</p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #020617;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(0, 158, 217, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 40%);
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo-box {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 20px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .logo-img { width: 100%; height: auto; object-fit: contain; }
        .logo-text { margin-bottom: 24px; }
        .logo-text .title { display: block; font-size: 24px; font-weight: 800; color: white; letter-spacing: 0.05em; line-height: 1; }
        .logo-text .subtitle { font-size: 10px; font-weight: 600; color: #009ed9; letter-spacing: 0.2em; text-transform: uppercase; }
        
        .login-header h2 { font-size: 22px; color: white; margin-bottom: 8px; font-weight: 700; }
        .login-header p { font-size: 14px; color: #94a3b8; }

        .login-form { display: flex; flex-direction: column; gap: 20px; }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 13px; font-weight: 600; color: #cbd5e1; }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
        }
        .input-wrapper input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 14px 44px;
          border-radius: 12px;
          color: white;
          font-size: 15px;
          transition: all 0.2s;
          outline: none;
        }
        .input-wrapper input:focus {
          border-color: #009ed9;
          background: rgba(0, 158, 217, 0.05);
          box-shadow: 0 0 0 4px rgba(0, 158, 217, 0.1);
        }
        .toggle-password {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .toggle-password:hover { color: #009ed9; }

        .login-btn {
          margin-top: 10px;
          background: #009ed9;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 20px -5px rgba(0, 158, 217, 0.4);
        }
        .login-btn:hover:not(:disabled) {
          background: #0087b8;
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(0, 158, 217, 0.5);
        }
        .login-btn:active { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          letter-spacing: 0.05em;
        }

        .glass-card {
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
