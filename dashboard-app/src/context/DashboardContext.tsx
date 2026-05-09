"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// SETTING AUTO LOGOUT (dalam milidetik)
// 3 jam = 3 * 60 * 60 * 1000 = 10800000 ms
// Untuk tes 3 detik, ganti jadi 3000
const SESSION_TIMEOUT = 3 * 60 * 60 * 1000;

export type FiltersState = {
  startDate: string;
  endDate: string;
  provinsi: string;
  pengalaman: string;
  pendidikan: string;
  jenisKelamin: string;
  minatPosisi: string;
  kota: string;
  showSelectedOnly: boolean;
};

export type FilterOptionsState = {
  periodeKeys: string[];
  provinsis: string[];
  pengalamans: string[];
  pendidikans: string[];
  jenisKelamins: string[];
  minatPosis: string[];
  kotas: string[];
};

export type User = {
  username: string;
  nama_user: string;
  group_user: string;
  akses_sumber: string[];
};

type DashboardContextType = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  filterOptions: FilterOptionsState;
  setFilterOptions: React.Dispatch<React.SetStateAction<FilterOptionsState>>;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  activeTable: string;
  setActiveTable: (val: string) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const defaultFilters: FiltersState = {
  startDate: '',
  endDate: '',
  provinsi: '',
  pengalaman: '',
  pendidikan: '',
  jenisKelamin: '',
  minatPosisi: '',
  kota: '',
  showSelectedOnly: false,
};

const defaultOptions: FilterOptionsState = {
  periodeKeys: [],
  provinsis: [],
  pengalamans: [],
  pendidikans: [],
  jenisKelamins: [],
  minatPosis: [],
  kotas: [],
};

const DashboardContext = createContext<DashboardContextType>({} as any);

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsState>(defaultOptions);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTable, setActiveTable] = useState('FLK_REVOFIF');
  const [user, setUser] = useState<User | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (user) {
      timeoutRef.current = setTimeout(() => {
        console.log("Session expired, logging out...");
        logout();
      }, SESSION_TIMEOUT);
    }
  };

  // Monitor user activity for auto-logout
  useEffect(() => {
    if (user) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

      const handleActivity = () => resetTimer();

      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      resetTimer(); // Start initial timer

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    }
  }, [user]);

  // Load theme and user from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard-theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    const savedUser = localStorage.getItem('dashboard-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        // Set default table to the first one they have access to if current isn't in their list
        if (parsedUser.akses_sumber && parsedUser.akses_sumber.length > 0) {
          setActiveTable(parsedUser.akses_sumber[0]);
        }
      } catch (e) {
        console.error("Failed to parse saved user", e);
      }
    }

    const savedSelected = localStorage.getItem('dashboard-selected-ids');
    if (savedSelected) {
      try {
        const parsed = JSON.parse(savedSelected);
        if (Array.isArray(parsed)) {
          setSelectedIds(new Set(parsed));
        }
      } catch (e) {
        console.error("Failed to parse saved selected IDs", e);
      }
    }
  }, []);

  // Save selectedIds to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dashboard-selected-ids', JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds]);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('dashboard-user', JSON.stringify(newUser));
      if (newUser.akses_sumber && newUser.akses_sumber.length > 0) {
        setActiveTable(newUser.akses_sumber[0]);
      }
    } else {
      localStorage.removeItem('dashboard-user');
    }
  };

  const logout = () => {
    handleSetUser(null);
    window.location.href = '/login';
  };

  const handleSetTheme = (val: boolean) => {
    setIsDarkMode(val);
    const theme = val ? 'dark' : 'light';
    localStorage.setItem('dashboard-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  return (
    <DashboardContext.Provider value={{
      filters,
      setFilters,
      filterOptions,
      setFilterOptions,
      isDarkMode,
      setIsDarkMode: handleSetTheme,
      activeTable,
      setActiveTable,
      user,
      setUser: handleSetUser,
      logout,
      selectedIds,
      setSelectedIds
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
