"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

export type FiltersState = {
  periode: string;
  provinsi: string;
  pengalaman: string;
  pendidikan: string;
  jenisKelamin: string;
  minatPosisi: string;
};

export type FilterOptionsState = {
  periodeKeys: string[];
  provinsis: string[];
  pengalamans: string[];
  pendidikans: string[];
  jenisKelamins: string[];
  minatPosis: string[];
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
};

const defaultFilters: FiltersState = {
  periode: '',
  provinsi: '',
  pengalaman: '',
  pendidikan: '',
  jenisKelamin: '',
  minatPosisi: '',
};

const defaultOptions: FilterOptionsState = {
  periodeKeys: [],
  provinsis: [],
  pengalamans: [],
  pendidikans: [],
  jenisKelamins: [],
  minatPosis: [],
};

const DashboardContext = createContext<DashboardContextType>({} as any);

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptionsState>(defaultOptions);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTable, setActiveTable] = useState('FLK_REVOFIF');
  const [user, setUser] = useState<User | null>(null);

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
  }, []);

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
      logout
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
