"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Filter,
  Download,
  ExternalLink,
  Calendar,
  MapPin,
  GraduationCap,
  Briefcase,
  RefreshCcw,
  Users,
  User,
  X,
  TrendingUp,
  Target,
  Award,
  ChevronLeft,
  ChevronRight,
  Search,
  Share2,
} from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';

const getPeriodKey = (ts: string | null): string | null => {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const formatPeriodKey = (key: string): string => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const SPECIAL_TABLES = ['FLK_Jateng_CC', 'FLK_JATENG-CC', 'FLK_Pertanian'];

const RevofifPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCv, setSelectedCv] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const fetchGenRef = useRef(0);
  const { filters, setFilters, setFilterOptions, activeTable, user } = useDashboard();
  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem('dashboard-user');
    if (!user && !savedUser) {
      router.push('/login');
    }
  }, [user, router]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearchTerm]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchDashboardData = async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    setGlobalStats(null);
    setTotalRecords(0);

    const targetTable = activeTable;

    try {
      const isSpecialTable = SPECIAL_TABLES.includes(targetTable);

      // Fire stats + gender queries immediately — runs in parallel with data fetch
      const statsPromise = supabase.rpc('get_flk_stats', { table_name: targetTable });
      const lCountPromise = supabase.from(targetTable).select('id', { count: 'exact', head: true }).eq('jenis_kelamin', 'L');
      const pCountPromise = supabase.from(targetTable).select('id', { count: 'exact', head: true }).eq('jenis_kelamin', 'P');

      let allData: any[] = [];
      let totalCount = 0;

      if (isSpecialTable) {
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          if (gen !== fetchGenRef.current) return; // table switched, abort

          const { data: pageData, error, count } = await supabase
            .from(targetTable)
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, from + 999);

          if (error) throw error;
          if (from === 0 && count !== null) totalCount = count;

          if (pageData && pageData.length > 0) {
            allData = [...allData, ...pageData];
            hasMore = pageData.length === 1000;
            from += 1000;
          } else {
            hasMore = false;
          }
        }
      } else {
        const { data: result, error, count } = await supabase
          .from(targetTable)
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;
        allData = result || [];
        totalCount = count || 0;
      }

      if (gen !== fetchGenRef.current) return; // table switched, abort
      setData(allData);
      setTotalRecords(totalCount);
      setLastRefresh(new Date());

      // Collect stats — likely already resolved since they ran in parallel with data fetch
      const [
        { data: stats, error: statsError },
        { count: lCount },
        { count: pCount },
      ] = await Promise.all([statsPromise, lCountPromise, pCountPromise]);

      if (gen !== fetchGenRef.current) return;

      if (!statsError && stats) {
        if (lCount) stats.male += lCount;
        if (pCount) stats.female += pCount;
        setGlobalStats(stats);
      }
    } catch (err) {
      if (gen !== fetchGenRef.current) return;
      console.error('Error fetching data:', err);
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  };

  const executeSearch = async (term: string) => {
    if (!term) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const isSpecialTable = SPECIAL_TABLES.includes(activeTable);
      const searchColumn = isSpecialTable ? 'minat_pekerjaan' : 'minat_posisi_1';
      const fetchLimit = isSpecialTable ? 10000 : 1000;
      const formattedSearch = term.trim().split(/\s+/).map(t => `'${t}:*'`).join(' | ');
      const { data: result, error } = await supabase
        .from(activeTable)
        .select('*')
        .textSearch(searchColumn, formattedSearch)
        .order('created_at', { ascending: false })
        .limit(fetchLimit);

      if (error) throw error;
      setSearchResults(result || []);
    } catch (err) {
      console.error('Error searching data:', err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    setFilters({ 
      periode: '', 
      provinsi: '', 
      pengalaman: '', 
      pendidikan: '', 
      jenisKelamin: '', 
      minatPosisi: '' 
    });
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, [activeTable]);

  useEffect(() => {
    executeSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const localFilterOptions = useMemo(() => {
    const getFilteredFor = (excludedKey: string) => {
      return data.filter(row => {
        if (excludedKey !== 'periode' && filters.periode && getPeriodKey(row.timestamp) !== filters.periode) return false;
        if (excludedKey !== 'provinsi' && filters.provinsi && (row.provinsi_domisili || row.provinsi_dom || row.provinsi_minat_penempatan || row.minat_penempatan) !== filters.provinsi) return false;
        if (excludedKey !== 'pengalaman' && filters.pengalaman && (row.durasi_pengalaman_kerja || row.memiliki_pengalaman_kerja) !== filters.pengalaman) return false;
        if (excludedKey !== 'pendidikan' && filters.pendidikan && row.pendidikan_terakhir !== filters.pendidikan) return false;
        if (excludedKey !== 'jenisKelamin' && filters.jenisKelamin && row.jenis_kelamin !== filters.jenisKelamin) return false;
        if (excludedKey !== 'minatPosisi' && filters.minatPosisi && (row.minat_posisi_1 || row.minat_pekerjaan) !== filters.minatPosisi) return false;
        return true;
      });
    };

    return {
      periodeKeys: [...new Set(
        getFilteredFor('periode').map(d => getPeriodKey(d.timestamp)).filter(Boolean) as string[]
      )].sort().reverse(),
      provinsis: [...new Set(getFilteredFor('provinsi').map(d => d.provinsi_domisili || d.provinsi_dom || d.provinsi_minat_penempatan || d.minat_penempatan).filter(Boolean))].sort() as string[],
      pengalamans: [...new Set(getFilteredFor('pengalaman').map(d => d.durasi_pengalaman_kerja || d.memiliki_pengalaman_kerja).filter(Boolean))].sort() as string[],
      pendidikans: [...new Set(getFilteredFor('pendidikan').map(d => d.pendidikan_terakhir).filter(Boolean))].sort() as string[],
      jenisKelamins: [...new Set(getFilteredFor('jenisKelamin').map(d => d.jenis_kelamin).filter(Boolean))].sort() as string[],
      minatPosis: [...new Set(getFilteredFor('minatPosisi').map(d => d.minat_posisi_1 || d.minat_pekerjaan).filter(Boolean))].sort() as string[],
    };
  }, [data, filters]);

  useEffect(() => {
    setFilterOptions(localFilterOptions);
  }, [localFilterOptions, setFilterOptions]);

  // 1. Dashboard Filtered Data (For Scoreboards & Stats)
  const dashboardFilteredData = useMemo(() => data.filter(row => {
    if (filters.periode && getPeriodKey(row.timestamp) !== filters.periode) return false;
    if (filters.provinsi && (row.provinsi_domisili || row.provinsi_dom || row.provinsi_minat_penempatan || row.minat_penempatan) !== filters.provinsi) return false;
    if (filters.pengalaman && (row.durasi_pengalaman_kerja || row.memiliki_pengalaman_kerja) !== filters.pengalaman) return false;
    if (filters.pendidikan && row.pendidikan_terakhir !== filters.pendidikan) return false;
    if (filters.jenisKelamin && row.jenis_kelamin !== filters.jenisKelamin) return false;
    if (filters.minatPosisi && (row.minat_posisi_1 || row.minat_pekerjaan) !== filters.minatPosisi) return false;
    return true;
  }), [data, filters]);

  // 2. Table Filtered Data (Uses searchResults if searching, else data)
  const tableFilteredData = useMemo(() => {
    const sourceData = searchResults !== null ? searchResults : data;
    return sourceData.filter(row => {
      if (filters.periode && getPeriodKey(row.timestamp) !== filters.periode) return false;
      if (filters.provinsi && (row.provinsi_domisili || row.provinsi_dom || row.provinsi_minat_penempatan || row.minat_penempatan) !== filters.provinsi) return false;
      if (filters.pengalaman && (row.durasi_pengalaman_kerja || row.memiliki_pengalaman_kerja) !== filters.pengalaman) return false;
      if (filters.pendidikan && row.pendidikan_terakhir !== filters.pendidikan) return false;
      if (filters.jenisKelamin && row.jenis_kelamin !== filters.jenisKelamin) return false;
      if (filters.minatPosisi && (row.minat_posisi_1 || row.minat_pekerjaan) !== filters.minatPosisi) return false;
      return true;
    });
  }, [data, searchResults, filters]);

  const hasActiveFilter = Object.values(filters).some(v => v !== '');

  const total = useMemo(() => {
    const isSpecialTable = SPECIAL_TABLES.includes(activeTable);
    if (!hasActiveFilter && globalStats && !isSpecialTable) return globalStats.total;
    return dashboardFilteredData.length;
  }, [dashboardFilteredData, hasActiveFilter, globalStats, activeTable]);

  const genderStats = useMemo(() => {
    const isSpecialTable = SPECIAL_TABLES.includes(activeTable);
    if (!hasActiveFilter && globalStats && !isSpecialTable) {
      return { male: globalStats.male || 0, female: globalStats.female || 0 };
    }
    
    let male = 0;
    let female = 0;
    
    dashboardFilteredData.forEach(d => {
      const jk = (d.jenis_kelamin || '').toLowerCase();
      // Use mutually exclusive logic to prevent double counting
      if (jk === 'l' || (jk.includes('laki') && !jk.includes('perempuan'))) {
        male++;
      } else if (jk === 'p' || jk.includes('perempuan')) {
        female++;
      }
    });
    
    return { male, female };
  }, [dashboardFilteredData, hasActiveFilter, globalStats, activeTable]);

  const maleCount = genderStats.male;
  const femaleCount = genderStats.female;

  const totalPages = Math.ceil(tableFilteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableFilteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [tableFilteredData, currentPage, itemsPerPage]);

  const insights = useMemo(() => {
    const isSpecialTable = SPECIAL_TABLES.includes(activeTable);
    // Use global stats if no filters active
    if (!hasActiveFilter && globalStats && !isSpecialTable) {
      return {
        topSources: (globalStats.top_sources || []).map((s: any) => [s.name, s.count]),
        topPositions: (globalStats.top_positions || []).map((p: any) => [p.name, p.count]),
        freshGrads: globalStats.fresh || 0,
        expCount: (globalStats.total || 0) - (globalStats.fresh || 0)
      };
    }

    if (dashboardFilteredData.length === 0) return { 
      topSources: [], 
      topPositions: [], 
      freshGrads: 0, 
      expCount: 0 
    };
    
    const getTopItems = (arr: string[], limit = 3) => {
      const counts = arr.reduce((acc: any, curr) => { 
        acc[curr] = (acc[curr] || 0) + 1; 
        return acc; 
      }, {});
      return Object.entries(counts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, limit);
    };

    const sources = dashboardFilteredData.map(d => d.sumber_informasi).filter(Boolean);
    const topSources = getTopItems(sources);

    const positions = dashboardFilteredData.map(d => d.minat_posisi_1 || d.minat_pekerjaan).filter(Boolean);
    const topPositions = getTopItems(positions);

    const freshGrads = dashboardFilteredData.filter(d => d.durasi_pengalaman_kerja?.toLowerCase().includes('fresh')).length;
    const expCount = dashboardFilteredData.length - freshGrads;

    return { topSources, topPositions, freshGrads, expCount };
  }, [dashboardFilteredData, hasActiveFilter, globalStats]);

  const resetFilters = () => setFilters({ 
    periode: '', 
    provinsi: '', 
    pengalaman: '',
    pendidikan: '', 
    jenisKelamin: '', 
    minatPosisi: '' 
  });

  const exportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      let exportData: any[];

      if (searchResults !== null) {
        // Search mode: export filtered search results already in memory
        exportData = tableFilteredData;
      } else {
        // Normal mode: paginate all matching rows from Supabase
        exportData = [];
        let from = 0;
        const pageSize = 1000;

        while (true) {
          let query = supabase
            .from(activeTable)
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);

          if (filters.periode) {
            const [y, m] = filters.periode.split('-');
            const start = new Date(Number(y), Number(m) - 1, 1).toISOString();
            const end = new Date(Number(y), Number(m), 1).toISOString();
            query = query.gte('timestamp', start).lt('timestamp', end);
          }
          if (filters.provinsi) {
            query = query.or(`provinsi_domisili.eq."${filters.provinsi}",provinsi_dom.eq."${filters.provinsi}",provinsi_minat_penempatan.eq."${filters.provinsi}",minat_penempatan.eq."${filters.provinsi}"`);
          }
          if (filters.pengalaman) {
            query = query.or(`durasi_pengalaman_kerja.eq."${filters.pengalaman}",memiliki_pengalaman_kerja.eq."${filters.pengalaman}"`);
          }
          if (filters.pendidikan) {
            query = query.eq('pendidikan_terakhir', filters.pendidikan);
          }
          if (filters.jenisKelamin) {
            query = query.eq('jenis_kelamin', filters.jenisKelamin);
          }
          if (filters.minatPosisi) {
            query = query.or(`minat_posisi_1.eq."${filters.minatPosisi}",minat_pekerjaan.eq."${filters.minatPosisi}"`);
          }

          const { data: pageData, error } = await query;
          if (error) throw error;
          if (!pageData || pageData.length === 0) break;

          exportData = [...exportData, ...pageData];
          setExportProgress(exportData.length);
          if (pageData.length < pageSize) break;
          from += pageSize;
        }
      }

      if (exportData.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
      }

      const headers = [
        'No', 'Tgl Lamar', 'Nama Lengkap', 'Email', 'No WA', 'No HP',
        'Sumber Informasi', 'Tgl Lahir', 'Jenis Kelamin',
        'Pengalaman Kerja', 'Durasi Pengalaman', 'Minat Posisi',
        'Provinsi', 'Pendidikan', 'Sekolah/Kampus',
        'Hasil Screening', 'Screening Time', 'Nomor Task', 'Link CV'
      ];

      const worksheetData: any[][] = [headers];
      exportData.forEach((r, idx) => {
        worksheetData.push([
          idx + 1,
          formatDate(r.timestamp, true),
          r.nama_lengkap || '-',
          r.email_aktif || r.email || '-',
          r.no_wa || '-',
          r.no_hp || '-',
          r.sumber_informasi || '-',
          formatDate(r.tanggal_lahir),
          r.jenis_kelamin || '-',
          r.pengalaman_kerja_terakhir || r.pengalaman_kerja || '-',
          r.durasi_pengalaman_kerja || r.memiliki_pengalaman_kerja || '-',
          r.minat_posisi_1 || r.minat_pekerjaan || '-',
          r.provinsi_domisili || r.provinsi_dom || r.provinsi_minat_penempatan || r.minat_penempatan || '-',
          r.pendidikan_terakhir || '-',
          r.nama_sekolah || '-',
          r.hasil_screening || '-',
          formatDate(r.screening_time, true),
          r.nomor_task || '-',
          r.upload_cv || '-'
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pelamar');
      worksheet['!cols'] = headers.map(h => ({ wch: Math.min(h.length + 5, 50) }));
      XLSX.writeFile(workbook, `FLK_Export_${activeTable}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Gagal mengekspor data. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const updatePelamar = async (id: any, field: string, value: string) => {
    try {
      const updateData: any = { [field]: value };
      
      // If screening changes, update the screening_time as well
      if (field === 'hasil_screening') {
        updateData.screening_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from(activeTable)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      // Update local state to reflect changes immediately
      const now = new Date().toISOString();
      setData(prev => prev.map(row => 
        row.id === id 
          ? { ...row, [field]: value, ...(field === 'hasil_screening' ? { screening_time: now } : {}) } 
          : row
      ));
      if (searchResults) {
        setSearchResults(prev => prev ? prev.map(row => 
          row.id === id 
            ? { ...row, [field]: value, ...(field === 'hasil_screening' ? { screening_time: now } : {}) } 
            : null
        ) : null);
      }
    } catch (err) {
      console.error('Error updating pelamar:', err);
      alert('Gagal mengupdate data. Pastikan kolom sudah ada di database Supabase Anda.');
    }
  };

  const formatDate = (dateString: string | null, includeTime: boolean = false) => {
    if (!dateString || dateString === '-') return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      
      const options: Intl.DateTimeFormatOptions = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      };
      
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = false;
      }

      return d.toLocaleDateString('id-ID', options);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div className="title-group">
          <h2>Data Pelamar {activeTable.replace('FLK_', '')}</h2>
          <p>
            {hasActiveFilter
              ? `${total.toLocaleString('id-ID')} dari ${totalRecords.toLocaleString('id-ID')} pelamar (filter aktif)`
              : `Total ${totalRecords.toLocaleString('id-ID')} pelamar`}
          </p>
        </div>
        <div className="action-group">
          {hasActiveFilter && (
            <button className="btn-reset" onClick={resetFilters}>
              <X size={16} /> Reset Filter
            </button>
          )}
          <button className="btn-secondary" onClick={exportExcel} disabled={isExporting || loading}>
            <Download size={18} />
            {isExporting
              ? (exportProgress > 0 ? `${exportProgress.toLocaleString('id-ID')} baris...` : 'Mengekspor...')
              : 'Export Excel'}
          </button>
          <button className="btn-primary" onClick={fetchDashboardData} disabled={loading || isSearching}>
            <RefreshCcw size={18} className={loading ? 'spin' : ''} />
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">TOTAL PELAMAR</span>
              <span className="total-badge">DATABASE</span>
            </div>
            <span className="value">{hasActiveFilter ? total.toLocaleString('id-ID') : totalRecords.toLocaleString('id-ID')}</span>
            <span className="sub-value">Dari {totalRecords.toLocaleString('id-ID')} basis data</span>
          </div>
          <div className="stat-icon cyan"><Users size={20} /></div>
          <div className="progress-bar">
            <div className="fill" style={{ width: `${totalRecords > 0 ? Math.round((total / totalRecords) * 100) : 0}%` }} />
          </div>
        </div>
        
        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">GENDER BREAKDOWN</span>
              <span className="total-badge">{(maleCount + femaleCount).toLocaleString('id-ID')} TOTAL</span>
            </div>
            <div className="gender-info">
              <span className="value">{maleCount.toLocaleString('id-ID')} <small>L</small></span>
              <span className="divider">/</span>
              <span className="value">{femaleCount.toLocaleString('id-ID')} <small>P</small></span>
            </div>
            <span className="sub-value">{total > 0 ? Math.round((maleCount / total) * 100) : 0}% Laki-laki</span>
          </div>
          <div className="stat-icon purple"><User size={20} /></div>
          <div className="progress-bar double">
            <div className="fill green" style={{ width: `${total > 0 ? Math.round((maleCount / total) * 100) : 0}%` }} />
            <div className="fill purple" style={{ width: `${total > 0 ? Math.round((femaleCount / total) * 100) : 0}%` }} />
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">EXPERIENCE BREAKDOWN</span>
              <span className="total-badge">{(insights.freshGrads + insights.expCount).toLocaleString('id-ID')} TOTAL</span>
            </div>
            <div className="gender-info">
              <span className="value">{insights.freshGrads.toLocaleString('id-ID')} <small>Fresh</small></span>
              <span className="divider">/</span>
              <span className="value">{insights.expCount.toLocaleString('id-ID')} <small>Exp</small></span>
            </div>
            <span className="sub-value">{total > 0 ? Math.round((insights.freshGrads / total) * 100) : 0}% Fresh Graduate</span>
          </div>
          <div className="stat-icon orange"><TrendingUp size={20} /></div>
          <div className="progress-bar double">
            <div className="fill orange" style={{ width: `${total > 0 ? Math.round((insights.freshGrads / total) * 100) : 0}%` }} />
            <div className="fill cyan" style={{ width: `${total > 0 ? Math.round((insights.expCount / total) * 100) : 0}%` }} />
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">TOP SOURCES</span>
              <span className="total-badge">{total.toLocaleString('id-ID')} TOTAL</span>
            </div>
            <div className="mini-list">
              {insights.topSources.slice(0, 3).map(([name, count]: [string, number | unknown], i: number) => (
                <div key={name} className="list-item">
                  <div className="item-bar">
                    <div className="item-fill pink" style={{ width: `${total > 0 ? Math.round(((count as number) / total) * 100) : 0}%` }} />
                  </div>
                  <span className="rank">{i + 1}</span>
                  <span className="name truncate">{name}</span>
                  <span className="count">{(count as number).toLocaleString('id-ID')}</span>
                </div>
              ))}
              {insights.topSources.length === 0 && <span className="value">-</span>}
            </div>
          </div>
          <div className="stat-icon pink"><Share2 size={20} /></div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">TOP POSITIONS</span>
              <span className="total-badge">{total.toLocaleString('id-ID')} TOTAL</span>
            </div>
            <div className="mini-list">
              {insights.topPositions.slice(0, 3).map(([name, count]: [string, number | unknown], i: number) => (
                <div key={name} className="list-item">
                  <div className="item-bar">
                    <div className="item-fill yellow" style={{ width: `${total > 0 ? Math.round(((count as number) / total) * 100) : 0}%` }} />
                  </div>
                  <span className="rank">{i + 1}</span>
                  <span className="name truncate">{name}</span>
                  <span className="count">{(count as number).toLocaleString('id-ID')}</span>
                </div>
              ))}
              {insights.topPositions.length === 0 && <span className="value">-</span>}
            </div>
          </div>
          <div className="stat-icon yellow"><Briefcase size={20} /></div>
        </div>

      </div>

      {/* Table */}
      <div className="table-search-header">
        <div className="table-search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari minat posisi (Server-side FTS)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="table-container glass-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>TGL LAMAR</th>
              <th>NAMA LENGKAP</th>
              <th>KONTAK</th>
              <th>SUMBER INFORMASI</th>
              <th>TGL LAHIR · JK</th>
              <th>PENGALAMAN KERJA</th>
              <th>MINAT POSISI</th>
              <th>PROVINSI</th>
              <th>PENDIDIKAN</th>
              <th>SCREENING</th>
              <th>SCREENING TIME</th>
              <th>TASK</th>
              <th>CV</th>
            </tr>
          </thead>
          <tbody>
            {loading || isSearching ? (
              <tr><td colSpan={14} className="loading-row">{isSearching ? 'Mencari data...' : 'Memuat data...'}</td></tr>
            ) : paginatedData.length === 0 ? (
              <tr><td colSpan={14} className="empty-row">Tidak ada data ditemukan</td></tr>
            ) : paginatedData.map((row, idx) => (
              <tr key={row.id ?? idx}>
                <td className="row-num">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatDate(row.timestamp, true)}
                </td>

                <td>
                  <div className="cell-stack">
                    <span className="cell-main">{row.nama_lengkap || '-'}</span>
                  </div>
                </td>

                {/* Email + WA + HP */}
                <td>
                  <div className="cell-stack" style={{ maxWidth: '250px' }}>
                    <span className="cell-main truncate" title={row.email_aktif || row.email || ''}>{row.email_aktif || row.email || '-'}</span>
                    {row.no_wa && <span className="cell-sub">WA: {row.no_wa}</span>}
                    {row.no_hp && row.no_hp !== row.no_wa && (
                      <span className="cell-sub">HP: {row.no_hp}</span>
                    )}
                  </div>
                </td>

                {/* Sumber Informasi */}
                <td>
                  <span className="source-tag">{row.sumber_informasi || '-'}</span>
                </td>

                {/* Tanggal Lahir + Jenis Kelamin */}
                <td>
                  <div className="cell-stack">
                    <span className="cell-main">{formatDate(row.tanggal_lahir)}</span>
                    {row.jenis_kelamin && (
                      <span className={`gender-tag ${row.jenis_kelamin?.toLowerCase().includes('laki') ? 'male' : 'female'}`}>
                        {row.jenis_kelamin}
                      </span>
                    )}
                  </div>
                </td>

                {/* Pengalaman Kerja Terakhir + Durasi */}
                <td>
                  <div className="cell-stack">
                    <span className="cell-main">{row.pengalaman_kerja_terakhir || row.pengalaman_kerja || '-'}</span>
                    {(row.durasi_pengalaman_kerja || row.memiliki_pengalaman_kerja) && (
                      <span className="duration-tag">{row.durasi_pengalaman_kerja || row.memiliki_pengalaman_kerja}</span>
                    )}
                  </div>
                </td>

                {/* Minat Posisi 1 */}
                <td>
                  {(row.minat_posisi_1 || row.minat_pekerjaan)
                    ? <span className="position-tag">{row.minat_posisi_1 || row.minat_pekerjaan}</span>
                    : '-'}
                </td>

                {/* Provinsi */}
                <td>
                  <span className="province-tag">{row.provinsi_domisili || row.provinsi_dom || row.provinsi_minat_penempatan || row.minat_penempatan || '-'}</span>
                </td>

                {/* Pendidikan + Sekolah */}
                <td className="col-pendidikan">
                  <div className="cell-stack">
                    <span className="cell-main">{row.pendidikan_terakhir || '-'}</span>
                    {row.nama_sekolah && <span className="cell-sub">{row.nama_sekolah}</span>}
                  </div>
                </td>

                {/* Screening Dropdown */}
                <td>
                  <select 
                    className={`screening-select ${row.hasil_screening?.toLowerCase() || ''}`}
                    value={row.hasil_screening || ''}
                    onChange={(e) => updatePelamar(row.id, 'hasil_screening', e.target.value)}
                  >
                    <option value="">- Select -</option>
                    <option value="PASSED">PASSED</option>
                    <option value="FAILED">FAILED</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {formatDate(row.screening_time, true)}
                </td>

                {/* Nomor Task Freetext */}
                <td>
                  <input 
                    type="text"
                    className="task-input"
                    placeholder="..."
                    value={row.nomor_task || ''}
                    onChange={(e) => {
                      // Update local state first for responsiveness
                      const val = e.target.value;
                      setData(prev => prev.map(r => r.id === row.id ? { ...r, nomor_task: val } : r));
                    }}
                    onBlur={(e) => updatePelamar(row.id, 'nomor_task', e.target.value)}
                  />
                </td>

                {/* CV */}
                <td>
                  {row.upload_cv ? (
                    <button onClick={() => setSelectedCv(row.upload_cv)} className="cv-btn">
                      <ExternalLink size={14} /> CV
                    </button>
                  ) : <span className="cell-sub">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {tableFilteredData.length > 0 && (
        <div className="pagination-container glass-card">
          <div className="pagination-info">
            <div className="per-page-selector">
              <span>Tampilkan:</span>
              <select 
                value={itemsPerPage} 
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="pagination-text">
              {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, tableFilteredData.length)} dari {tableFilteredData.length} data
            </div>
          </div>
          <div className="pagination-controls">
            <button 
              className="page-btn" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-current">Halaman {currentPage} dari {totalPages}</span>
            <button 
              className="page-btn" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CV Modal */}
      {selectedCv && (
        <div className="cv-modal-overlay" onClick={() => setSelectedCv(null)}>
          <div className="cv-modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="cv-modal-header">
              <h3>Dokumen CV</h3>
              <div className="cv-modal-actions">
                <a 
                  href={(() => {
                    const url = selectedCv;
                    if (url.includes('drive.google.com')) {
                      const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
                      if (idMatch) return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
                    }
                    if (url.includes('supabase.co')) {
                      const sep = url.includes('?') ? '&' : '?';
                      return `${url}${sep}download=CV_Pelamar.pdf`;
                    }
                    return url;
                  })()} 
                  download 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Download size={14} /> Download
                </a>
                <button className="btn-close" onClick={() => setSelectedCv(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="cv-modal-body">
              <iframe 
                src={(() => {
                  const url = selectedCv;
                  if (url.includes('drive.google.com')) {
                    let embedUrl = url.replace(/\/view.*$/, '/preview');
                    const idMatch = embedUrl.match(/id=([a-zA-Z0-9_-]+)/);
                    if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
                    if (!embedUrl.endsWith('/preview') && embedUrl.includes('/file/d/')) return `${embedUrl}/preview`;
                    return embedUrl;
                  }
                  return url;
                })()} 
                className="cv-iframe" 
                title="CV Viewer" 
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-wrapper {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .title-group h2 { font-size: 16px; font-weight: 700; margin-bottom: 0px; line-height: 1.2; }
        .title-group p { color: var(--text-muted); font-size: 12px; line-height: 1.2; }
        .action-group { display: flex; gap: 8px; align-items: center; }

        .btn-secondary {
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 6px 12px;
          border-radius: 6px;
          display: flex; align-items: center; gap: 6px;
          cursor: pointer; font-weight: 500; font-size: 13px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-secondary:hover:not(:disabled) { 
          background: rgba(255, 255, 255, 0.08); 
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        .btn-secondary:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-reset {
          background: transparent;
          border: 1px solid rgba(239,68,68,0.4);
          color: #f87171;
          padding: 8px 12px; border-radius: 8px;
          display: flex; align-items: center; gap: 6px;
          cursor: pointer; font-size: 13px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-reset:hover { 
          background: rgba(239,68,68,0.15); 
          transform: translateY(-2px);
        }
        .btn-reset:active { transform: translateY(0) scale(0.96); }
        .filter-card { padding: 12px 20px; margin-bottom: 16px; }
        .filter-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 12px; font-weight: 600; font-size: 13px;
        }
        .status-indicator {
          margin-left: auto;
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; color: var(--success); font-weight: 400;
        }
        .status-indicator .dot {
          width: 6px; height: 6px;
          background: var(--success); border-radius: 50%;
          box-shadow: 0 0 6px var(--success);
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        :global(.spin) { animation: spin 1s linear infinite; }
 
        .filter-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px 20px; }
        .filter-item { display: flex; flex-direction: column; gap: 4px; }
        .filter-item label {
          font-size: 10px; color: var(--text-muted);
          display: flex; align-items: center; gap: 6px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        :global(.icon-blue) { color: #60a5fa; }
        :global(.icon-red) { color: #f87171; }
        :global(.icon-amber) { color: #fbbf24; }
        :global(.icon-green) { color: #34d399; }
        :global(.icon-purple) { color: #a78bfa; }
        :global(.icon-cyan) { color: #22d3ee; }
        .filter-item select {
          background: var(--bg-color); border: 1px solid var(--border-color);
          color: var(--text-main); padding: 6px 10px; border-radius: 6px;
          outline: none; cursor: pointer; transition: border-color 0.2s;
          font-size: 13px;
        }
        .filter-item select:focus { border-color: var(--primary-accent); }

        .stats-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; margin-bottom: 16px; }
        .stat-card {
          padding: 12px 14px;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
          overflow: hidden;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }
        .stat-info { display: flex; flex-direction: column; flex: 1; min-width: 0; margin-right: 8px; }
        .stat-info .label { font-size: 9px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; }
        .stat-info .value { font-size: 20px; font-weight: 700; margin-top: 2px; color: var(--text-main); }
        .stat-info .value.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .stat-info .sub-value { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
        .stat-header { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; margin-bottom: 4px; }
        .total-badge { 
          font-size: 9px; font-weight: 700; color: var(--text-muted); 
          background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.05); white-space: nowrap;
        }
        .stat-info .value small { font-size: 10px; opacity: 0.6; font-weight: 400; text-transform: uppercase; }
        .gender-info { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
        .gender-info .divider { opacity: 0.2; }
        
        .mini-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; width: 100%; }
        .list-item { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          font-size: 11px; 
          color: var(--text-main); 
          position: relative;
          padding: 4px 6px;
          border-radius: 4px;
          overflow: hidden;
        }
        .item-bar {
          position: absolute;
          inset: 0;
          background: var(--glass-bg);
          z-index: 0;
        }
        .item-fill {
          height: 100%;
          opacity: 0.15;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .item-fill.pink { background: #ec4899; }
        .item-fill.yellow { background: #eab308; }
        
        .list-item .rank { 
          position: relative; z-index: 1;
          width: 16px; height: 16px; 
          background: var(--glass-border); 
          border-radius: 4px; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 9px; font-weight: 700; color: var(--text-main);
        }
        .list-item .name { position: relative; z-index: 1; flex: 1; font-weight: 500; color: var(--text-main); }
        .list-item .count { position: relative; z-index: 1; font-weight: 700; font-family: monospace; opacity: 0.8; color: var(--text-main); }
        
        .stat-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-icon.cyan { background: rgba(0,158,217,0.1); color: #009ed9; }
        .stat-icon.green { background: rgba(16,185,129,0.1); color: #10b981; }
        .stat-icon.purple { background: rgba(139,92,246,0.1); color: #8b5cf6; }
        .stat-icon.orange { background: rgba(249,115,22,0.1); color: #f97316; }
        .stat-icon.pink { background: rgba(236,72,153,0.1); color: #ec4899; }
        .stat-icon.yellow { background: rgba(234,179,8,0.1); color: #eab308; }
        .stat-icon.blue { background: rgba(59,130,246,0.1); color: #3b82f6; }

        .progress-bar { width:100%; height:4px; background: var(--glass-bg); border-radius:2px; margin-top:8px; display: flex; }
        .progress-bar.double { gap: 2px; background: transparent; }
        .fill { height:100%; background:#009ed9; border-radius:2px; transition: width 0.5s ease; }
        .fill.green { background:#10b981; }
        .fill.purple { background:#8b5cf6; }
        .fill.orange { background:#f97316; }

        /* Table & Search Styles */
        .table-search-header {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 16px;
        }
        .table-search-bar {
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          width: 320px;
          max-width: 100%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .table-search-bar:focus-within {
          border-color: var(--primary-accent);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 3px rgba(0, 158, 217, 0.15);
          width: 340px;
        }
        .table-search-bar .search-icon {
          color: var(--text-muted);
        }
        .table-search-bar input {
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 14px;
          outline: none;
          width: 100%;
        }
        .table-search-bar input::placeholder {
          color: var(--text-muted);
          opacity: 0.7;
        }

        .table-container { 
          overflow-x: auto; 
          border-radius: 12px;
        }
        .data-table { 
          width: 100%; 
          min-width: 1200px;
          border-collapse: collapse; 
          text-align: left; 
          font-size: 12px; 
          table-layout: auto;
        }
        .data-table th {
          padding: 10px 8px; 
          font-size: 10px; 
          font-weight: 600;
          color: var(--text-muted); 
          border-bottom: 1px solid var(--border-color);
          text-transform: uppercase; 
          background: var(--glass-bg); 
          white-space: nowrap;
        }
        .data-table td { 
          padding: 10px 8px; 
          border-bottom: 1px solid var(--border-color); 
          vertical-align: top; 
        }
        .data-table tbody tr { transition: all 0.2s ease; }
        .data-table tbody tr:hover td { 
          background: rgba(255, 255, 255, 0.03); 
        }
        /* Frozen/Sticky Columns */
        .data-table th:nth-child(1),
        .data-table td:nth-child(1) {
          position: sticky;
          left: 0;
          z-index: 3;
          min-width: 36px;
          width: 36px;
        }
        .data-table th:nth-child(2),
        .data-table td:nth-child(2) {
          position: sticky;
          left: 40px;
          z-index: 3;
          min-width: 112px;
          width: 112px;
        }
        .data-table th:nth-child(3),
        .data-table td:nth-child(3) {
          position: sticky;
          left: 156px;
          z-index: 3;
          box-shadow: 4px 0 8px -2px rgba(0,0,0,0.35);
        }
        /* Background for sticky th */
        .data-table th:nth-child(1),
        .data-table th:nth-child(2),
        .data-table th:nth-child(3) {
          background: var(--card-bg);
        }
        /* Background for sticky td */
        .data-table tbody tr td:nth-child(1),
        .data-table tbody tr td:nth-child(2),
        .data-table tbody tr td:nth-child(3) {
          background: var(--card-bg);
        }
        /* Hover state for sticky td */
        .data-table tbody tr:hover td:nth-child(1),
        .data-table tbody tr:hover td:nth-child(2),
        .data-table tbody tr:hover td:nth-child(3) {
          background: rgba(255,255,255,0.04);
        }

        .row-num { color: var(--text-muted); font-size: 11px; width: 30px; text-align: center; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }

        .cell-stack { display: flex; flex-direction: column; gap: 2px; }
        .cell-main { font-weight: 500; color: var(--text-main); line-height: 1.2; }
        .cell-sub { font-size: 10px; color: var(--text-muted); line-height: 1.2; }

        .source-tag {
          font-size: 11px; color: var(--text-muted);
          max-width: 120px; display: block;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gender-tag {
          display: inline-block; font-size: 10px; font-weight: 600;
          padding: 1px 6px; border-radius: 4px;
        }
        .gender-tag.male { background: rgba(59,130,246,0.12); color: #60a5fa; }
        .gender-tag.female { background: rgba(236,72,153,0.12); color: #f472b6; }

        .duration-tag {
          display: inline-block; font-size: 10px; font-weight: 500;
          color: #fbbf24; background: rgba(251,191,36,0.1);
          padding: 1px 6px; border-radius: 4px;
        }
        .source-tag, .province-tag {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(0, 158, 217, 0.1);
          color: #009ed9;
          font-size: 10px;
          font-weight: 600;
        }
        .province-tag {
          background: rgba(148, 163, 184, 0.1);
          color: var(--text-muted);
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .position-tag {
          display: inline-block;
          background: rgba(0,158,217,0.1); color: #009ed9;
          padding: 3px 8px; border-radius: 4px;
          font-size: 11px; font-weight: 600;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cv-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: var(--primary-accent);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
        }

        .screening-select {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          border: 1px solid var(--border-color);
          background: var(--glass-bg);
          color: var(--text-main);
          cursor: pointer;
          outline: none;
          width: 85px;
          transition: all 0.2s;
        }
        .screening-select.passed { background: rgba(16, 185, 129, 0.2); color: #10b981; border-color: rgba(16, 185, 129, 0.4); }
        .screening-select.failed { background: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: rgba(239, 68, 68, 0.4); }
        .screening-select.pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); }

        .task-input {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          border: 1px solid var(--border-color);
          background: var(--glass-bg);
          color: var(--text-main);
          width: 80px;
          outline: none;
          transition: all 0.2s;
        }
        .task-input:focus {
          border-color: var(--primary-accent);
          background: rgba(255,255,255,0.05);
        }
        .col-pendidikan {
          max-width: 180px;
        }
        .col-pendidikan .cell-main,
        .col-pendidikan .cell-sub {
          white-space: normal;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .cv-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--glass-bg); color: var(--text-main);
          padding: 4px 10px; border-radius: 6px; font-size: 12px;
          border: 1px solid var(--border-color); transition: all 0.2s; white-space: nowrap;
          cursor: pointer;
        }
        .cv-btn:hover { background: rgba(0,158,217,0.1); border-color: #009ed9; color: #009ed9; }

        .loading-row, .empty-row { text-align:center; padding:40px !important; color: var(--text-muted); }

        .cv-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 9999;
          padding: 40px;
        }
        .cv-modal-content {
          width: 100%; max-width: 900px; height: 90vh;
          display: flex; flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }
        .cv-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px; border-bottom: 1px solid var(--border-color);
          background: var(--glass-bg);
        }
        .cv-modal-header h3 { font-size: 16px; font-weight: 600; margin: 0; color: var(--text-main); }
        .cv-modal-actions { display: flex; align-items: center; gap: 12px; }
        .btn-close {
          background: transparent; border: none; color: var(--text-muted);
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          padding: 4px; border-radius: 6px; transition: all 0.2s;
        }
        .btn-close:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .cv-modal-body {
          flex: 1; padding: 0; background: #e2e8f0;
        }
        :global(.dark) .cv-modal-body, :root[data-theme='light'] .cv-modal-body {
          background: #0f172a;
        }
        .cv-iframe {
          width: 100%; height: 100%; border: none; display: block;
        }

        /* Pagination Styles */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          margin-top: 16px;
        }
        .pagination-info {
          font-size: 13px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .per-page-selector {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .per-page-selector select {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 4px 8px;
          border-radius: 6px;
          outline: none;
          cursor: pointer;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .page-btn {
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .page-btn:hover:not(:disabled) {
          background: var(--primary-accent);
          border-color: var(--primary-accent);
          color: white;
        }
        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .page-current {
          font-size: 13px;
          font-weight: 500;
        }

        /* Responsive Dashboard Queries */
        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .filter-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .action-group {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .filter-grid {
            grid-template-columns: 1fr;
          }
          .filter-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .status-indicator {
            margin-left: 0;
          }
          .pagination-container {
            flex-direction: column;
            gap: 12px;
          }
          .table-search-header {
            width: 100%;
          }
          .table-search-bar {
            width: 100%;
          }
          .table-search-bar:focus-within {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .title-group h2 {
            font-size: 20px;
          }
          .btn-secondary, .btn-primary, .btn-reset {
            padding: 8px 12px;
            font-size: 13px;
            flex: 1;
            justify-content: center;
          }
          .action-group {
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default RevofifPage;
