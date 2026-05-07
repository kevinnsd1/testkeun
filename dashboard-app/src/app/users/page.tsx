"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Search, 
  X, 
  Check, 
  Lock, 
  User as UserIcon,
  Database,
  Users as UsersIcon,
  ChevronRight,
  Save,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDashboard } from '@/context/DashboardContext';

const TABLE_OPTIONS = [
  'FLK_Nasional', 'FLK_HC', 'FLK_ADIRA', 'FLK_REVOFIF', 'FLK_BI', 
  'FLK_Jateng_CC', 'FLK_Lookerin', 'FLK_MRM', 'FLK_Midea', 
  'FLK_Onsite', 'FLK_Pertanian', 'FLK_Recruitment', 'FLK_Revoadira'
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nama_user: '',
    group_user: '',
    akses_sumber: [] as string[],
    status: 'AKTIF'
  });

  const { user, isDarkMode } = useDashboard();
  const router = useRouter();

  useEffect(() => {
    if (user?.username !== 'superadmin') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const handleOpenModal = (u: any = null) => {
    if (u) {
      setEditingUser(u);
      setFormData({
        username: u.username,
        password: u.password,
        nama_user: u.nama_user || '',
        group_user: u.group_user || '',
        akses_sumber: u.akses_sumber || [],
        status: u.status || 'AKTIF'
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        nama_user: '',
        group_user: '',
        akses_sumber: [],
        status: 'AKTIF'
      });
    }
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = { ...formData };
    
    if (editingUser) {
      const { error } = await supabase
        .from('app_users')
        .update(payload)
        .eq('id', editingUser.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase
        .from('app_users')
        .insert([payload]);
      if (error) alert(error.message);
    }

    setModalOpen(false);
    fetchUsers();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);
    if (error) alert(error.message);
    fetchUsers();
  };

  const toggleTable = (table: string) => {
    setFormData(prev => ({
      ...prev,
      akses_sumber: prev.akses_sumber.includes(table)
        ? prev.akses_sumber.filter(t => t !== table)
        : [...prev.akses_sumber, table]
    }));
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.nama_user?.toLowerCase().includes(search.toLowerCase()) ||
    u.group_user?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="title-section">
          <div className="icon-badge"><Shield size={24} /></div>
          <div>
            <h1>User Management</h1>
            <p>Kelola akses dan akun tim Sourcing Department</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <UserPlus size={18} />
          <span>Tambah User Baru</span>
        </button>
      </div>

      <div className="management-card glass-card">
        <div className="card-header">
          <div className="search-bar">
            <Search size={18} />
            <input 
              placeholder="Cari username, nama, atau departemen..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="stats-pill">
            <UsersIcon size={14} />
            <span>{users.length} Total Account</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="user-table">
            <thead>
              <tr>
                <th>USER INFO</th>
                <th>GROUP & STATUS</th>
                <th>DATABASE ACCESS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="loading-cell">Memuat data...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="empty-cell">Tidak ada user ditemukan.</td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar-mini">{u.nama_user?.charAt(0) || 'U'}</div>
                      <div className="info">
                        <span className="name">{u.nama_user}</span>
                        <span className="username">@{u.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="status-cell">
                      <span className="group-tag">{u.group_user}</span>
                      <span className={`status-pill ${u.status === 'AKTIF' ? 'active' : 'inactive'}`}>
                        {u.status}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="access-tags">
                      {u.akses_sumber?.slice(0, 3).map((t: string) => (
                        <span key={t} className="access-tag">{t.replace('FLK_', '')}</span>
                      ))}
                      {u.akses_sumber?.length > 3 && (
                        <span className="access-tag plus">+{u.akses_sumber.length - 3} more</span>
                      )}
                      {(!u.akses_sumber || u.akses_sumber.length === 0) && (
                        <span className="access-tag none">No Access</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon" onClick={() => handleOpenModal(u)} title="Edit Account">
                        <Edit2 size={16} />
                      </button>
                      {u.username !== 'superadmin' && (
                        <button className="btn-icon delete" onClick={() => handleDeleteUser(u.id)} title="Delete Account">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal User Form */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card slide-up">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User Account' : 'Registrasi User Baru'}</h3>
              <button className="btn-close" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveUser} className="user-form">
              <div className="form-grid">
                <div className="form-section">
                  <span className="section-label">Account Identity</span>
                  <div className="input-group">
                    <label>Username (ID Login)</label>
                    <div className="input-box">
                      <UserIcon size={16} />
                      <input 
                        value={formData.username} 
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="e.g. shahnaz_ho"
                        required
                        disabled={editingUser?.username === 'superadmin'}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <div className="input-box">
                      <Lock size={16} />
                      <input 
                        type="text" 
                        value={formData.password} 
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Ketik password baru"
                        required
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Nama Lengkap</label>
                    <div className="input-box">
                      <ChevronRight size={16} />
                      <input 
                        value={formData.nama_user} 
                        onChange={(e) => setFormData({...formData, nama_user: e.target.value})}
                        placeholder="Nama tampilan di dashboard"
                        required
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Group / Departemen</label>
                    <div className="input-box">
                      <UsersIcon size={16} />
                      <input 
                        value={formData.group_user} 
                        onChange={(e) => setFormData({...formData, group_user: e.target.value})}
                        placeholder="e.g. SOURCING HO"
                        required
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Status Akun</label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="form-select"
                    >
                      <option value="AKTIF">AKTIF</option>
                      <option value="NON-AKTIF">NON-AKTIF</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-label-row">
                    <span className="section-label">Database Access Rights</span>
                    <span className="badge-count">{formData.akses_sumber.length} Selected</span>
                  </div>
                  <p className="section-desc">Pilih database mana saja yang boleh diakses akun ini:</p>
                  
                  <div className="tables-grid">
                    {TABLE_OPTIONS.map(table => (
                      <div 
                        key={table} 
                        className={`table-chip ${formData.akses_sumber.includes(table) ? 'active' : ''}`}
                        onClick={() => toggleTable(table)}
                      >
                        <Database size={12} />
                        <span>{table.replace('FLK_', '')}</span>
                        {formData.akses_sumber.includes(table) && <Check size={12} className="check" />}
                      </div>
                    ))}
                  </div>

                  {formData.akses_sumber.length === 0 && (
                    <div className="form-alert warning">
                      <AlertCircle size={14} />
                      <span>User tidak akan bisa melihat data apapun jika tidak ada akses terpilih.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>Batalkan</button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  <Save size={18} />
                  <span>{editingUser ? 'Simpan Perubahan' : 'Daftarkan Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .users-page {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .title-section { display: flex; align-items: center; gap: 16px; }
        .icon-badge {
          width: 48px; height: 48px; background: rgba(0, 158, 217, 0.1);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          color: #009ed9; border: 1px solid rgba(0, 158, 217, 0.2);
        }
        .title-section h1 { font-size: 24px; font-weight: 800; margin: 0; color: var(--text-main); }
        .title-section p { font-size: 14px; color: var(--text-muted); margin: 4px 0 0; }

        .btn-primary {
          background: #009ed9; color: white; border: none; padding: 10px 20px;
          border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer;
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(0, 158, 217, 0.3);
        }
        .btn-primary:hover { background: #0087b8; transform: translateY(-2px); }

        .management-card { border-radius: 16px; padding: 0; overflow: hidden; }
        .card-header {
          padding: 20px; border-bottom: 1px solid var(--border-color);
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(255,255,255,0.02);
        }
        .search-bar {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
          border-radius: 10px; padding: 8px 16px; display: flex; align-items: center;
          gap: 12px; width: 340px; color: var(--text-muted); transition: all 0.2s;
        }
        .search-bar:focus-within { border-color: #009ed9; background: rgba(0, 158, 217, 0.05); }
        .search-bar input { background: transparent; border: none; outline: none; color: var(--text-main); width: 100%; font-size: 14px; }
        
        .stats-pill { 
          background: var(--glass-bg); border: 1px solid var(--border-color);
          padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
          color: var(--text-muted); display: flex; align-items: center; gap: 8px;
        }

        .user-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .user-table th {
          text-align: left; padding: 14px 20px; font-size: 11px; font-weight: 700;
          color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;
          background: rgba(0,0,0,0.1);
        }
        .user-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
        .user-table tr:hover td { background: rgba(255,255,255,0.02); }

        .user-cell { display: flex; align-items: center; gap: 12px; }
        .avatar-mini {
          width: 32px; height: 32px; background: #009ed9; color: white;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 14px; text-transform: uppercase;
        }
        .user-cell .info { display: flex; flex-direction: column; }
        .user-cell .name { font-weight: 700; color: var(--text-main); }
        .user-cell .username { font-size: 12px; color: var(--text-muted); }

        .status-cell { display: flex; flex-direction: column; gap: 4px; }
        .group-tag { font-size: 12px; font-weight: 600; color: var(--text-main); }
        .status-pill {
          display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px;
          border-radius: 6px; width: fit-content;
        }
        .status-pill.active { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-pill.inactive { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .access-tags { display: flex; flex-wrap: wrap; gap: 4px; }
        .access-tag {
          font-size: 10px; font-weight: 600; background: rgba(148, 163, 184, 0.1);
          color: var(--text-muted); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border-color);
        }
        .access-tag.plus { background: #009ed9; color: white; border: none; }
        .access-tag.none { border: 1px dashed var(--border-color); }

        .action-btns { display: flex; gap: 8px; }
        .btn-icon {
          width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-color);
          background: var(--glass-bg); color: var(--text-muted); display: flex; 
          align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
        }
        .btn-icon:hover { background: #009ed9; color: white; border-color: #009ed9; }
        .btn-icon.delete:hover { background: #ef4444; color: white; border-color: #ef4444; }

        /* Modal Styles */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
        }
        .modal-content {
          width: 100%; max-width: 850px; border-radius: 24px; padding: 0; overflow: hidden;
          box-shadow: 0 30px 60px -12px rgba(0,0,0,0.5);
        }
        .slide-up { animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        
        .modal-header {
          padding: 24px 32px; border-bottom: 1px solid var(--border-color);
          display: flex; justify-content: space-between; align-items: center;
        }
        .modal-header h3 { font-size: 20px; font-weight: 800; margin: 0; color: var(--text-main); }
        .btn-close {
          background: rgba(255,255,255,0.05); border: none; color: var(--text-muted);
          width: 36px; height: 36px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
        }
        .btn-close:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

        .user-form { padding: 32px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 40px; }
        .form-section { display: flex; flex-direction: column; gap: 16px; }
        .section-label { font-size: 12px; font-weight: 700; color: #009ed9; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px; }
        .section-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .badge-count { background: #009ed9; color: white; font-size: 10px; font-weight: 800; padding: 2px 10px; border-radius: 20px; }
        .section-desc { font-size: 13px; color: var(--text-muted); margin: 0 0 16px; }

        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
        .input-box {
          position: relative; display: flex; align-items: center;
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
          border-radius: 10px; transition: all 0.2s;
        }
        .input-box:focus-within { border-color: #009ed9; background: rgba(0, 158, 217, 0.05); }
        .input-box :global(svg) { position: absolute; left: 14px; color: #64748b; }
        .input-box input {
          width: 100%; background: transparent; border: none; outline: none;
          padding: 12px 12px 12px 42px; color: var(--text-main); font-size: 14px;
        }
        .form-select {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
          border-radius: 10px; padding: 12px; color: var(--text-main); font-size: 14px; outline: none;
        }

        .tables-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .table-chip {
          padding: 10px 14px; border-radius: 12px; background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color); color: var(--text-muted); font-size: 12px;
          display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s;
          position: relative;
        }
        .table-chip:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
        .table-chip.active {
          background: rgba(0, 158, 217, 0.1); border-color: #009ed9; color: #009ed9;
          font-weight: 700;
        }
        .table-chip .check { color: #009ed9; margin-left: auto; }

        .form-alert {
          display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px;
          font-size: 12px; line-height: 1.4; margin-top: 20px;
        }
        .form-alert.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }

        .modal-footer {
          margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border-color);
          display: flex; justify-content: flex-end; gap: 16px;
        }
        .btn-cancel {
          background: transparent; border: 1px solid var(--border-color); color: var(--text-muted);
          padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn-submit {
          background: #009ed9; color: white; border: none; padding: 12px 28px;
          border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; 
          align-items: center; gap: 10px; transition: all 0.2s;
          box-shadow: 0 10px 20px -5px rgba(0, 158, 217, 0.4);
        }
        .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(0, 158, 217, 0.5); }
      `}</style>
    </div>
  );
}
