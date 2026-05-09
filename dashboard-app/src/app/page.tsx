"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  CheckSquare,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Send,
  Minimize2,
  ArrowLeft,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

const getProvince = (row: any, activeTable: string): string => {
  if (activeTable === "FLK_Onsite" || activeTable === "FLK_Recruitment") {
    return row.provinsi_minat_penempatan || row.minat_penempatan || "";
  }
  return (
    row.provinsi_domisili ||
    row.provinsi_dom ||
    row.provinsi_minat_penempatan ||
    row.minat_penempatan ||
    ""
  );
};

const getKota = (row: any, activeTable: string): string => {
  switch (activeTable) {
    case "FLK_ADIRA":
      return row.kecamatan || "";
    case "FLK_BI":
      return row.kecamatan || "";
    case "FLK_HC":
      return row.kecamatan || "";
    case "FLK_Jateng_CC":
      return row.minat_kota_penempatan || "";
    case "FLK_Lookerin":
      return row.kecamatan || "";
    case "FLK_MRM":
      return row.kecamatan || "";
    case "FLK_Midea":
      return row.kecamatan || "";
    case "FLK_Nasional":
      return row.kecamatan_domisili || "";
    case "FLK_Onsite":
      return row.kecamatan || "";
    case "FLK_Pertanian":
      return "";
    case "FLK_REVOFIF":
      return row.kecamatan || "";
    case "FLK_Recruitment":
      return row.kota_minat_penempatan || "";
    case "FLK_Revoadira":
      return row.kecamatan || "";
    default:
      return row.kecamatan || row.kota || "";
  }
};

// Tables that store dates in DD/MM/YYYY (Indonesian format)
const DMY_TABLES = new Set<string>([]);

const getTimestamp = (row: any, table?: string): any => {
  // Untuk Nasional, prioritaskan kolom tanggal_daftar (Proper Date)
  if (table === "FLK_Nasional") {
    return row.tanggal_daftar || row.timestamp || row.tgl_lamar || null;
  }
  // Default prioritaskan timestamp, lalu tgl_lamar
  return (
    row.timestamp ||
    row.tgl_lamar ||
    row.TGL_LAMAR ||
    row.tanggal_lamar ||
    row.Tanggal_Lamar ||
    null
  );
};

const parseRowDate = (ts: any, preferDMY = false): string | null => {
  if (!ts) return null;
  const s = String(ts).trim();
  if (!s) return null;

  // ISO "YYYY-MM-DD..." — format paling reliable, cek duluan
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // "A/B/YYYY" — bisa M/D/YYYY (Google Sheets) atau D/M/YYYY (Indonesia)
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const y = slash[3];
    let month: number, day: number;
    if (a > 12) {
      // a pasti hari (tidak mungkin bulan ke-13+) → D/M/YYYY
      day = a;
      month = b;
    } else if (b > 12) {
      // b pasti hari → M/D/YYYY
      month = a;
      day = b;
    } else if (preferDMY) {
      // Ambiguous + tabel Indonesia → anggap D/M/YYYY
      day = a;
      month = b;
    } else {
      // Default Google Sheets → M/D/YYYY
      month = a;
      day = b;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Fallback — native parse sebagai local date
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

// Helper tunggal untuk dapat tanggal dari row (table-aware)
const getRowDate = (row: any, table: string): string | null =>
  parseRowDate(getTimestamp(row, table), DMY_TABLES.has(table));

const getDateColumn = (table: string): string => {
  if (table === "FLK_Nasional") return "tanggal_daftar";
  if (table === "FLK_Recruitment") return "tgl_lamar";
  if (table === "FLK_Pertanian") return "tanggal_lamar";
  if (table === "FLK_Jateng_CC" || table === "FLK_JATENG-CC")
    return "tgl_lamar";
  return "timestamp";
};

const parseToDate = (str: any): Date => {
  if (!str || str === "-") return new Date(0);
  let ds = String(str);

  if (ds.includes("/") && ds.includes("T")) {
    const [datePart, timePart] = ds.split("T");
    const parts = datePart.split("/");
    if (parts.length === 3) {
      const [m, d, y] = parts;
      const timeComponents = timePart.replace("Z", "").split(":");
      const h = (timeComponents[0] || "0").padStart(2, "0");
      const min = (timeComponents[1] || "0").padStart(2, "0");
      const s = (timeComponents[2] || "00").split(".")[0].padStart(2, "0");
      ds = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h}:${min}:${s}`;
    }
  }

  const d = new Date(ds);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const formatPeriodKey = (key: string): string => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

const SPECIAL_TABLES = ["FLK_Jateng_CC", "FLK_JATENG-CC", "FLK_Pertanian"];

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
  const [confirmModal, setConfirmModal] = useState<string | null>(null);
  const {
    filters,
    setFilters,
    setFilterOptions,
    activeTable,
    user,
    selectedIds,
    setSelectedIds,
  } = useDashboard();
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [deleteHistoryId, setDeleteHistoryId] = useState<string | null>(null);
  const [limitModal, setLimitModal] = useState<{
    show: boolean;
    message: string;
  } | null>(null);
  const [showNoSelectionModal, setShowNoSelectionModal] = useState(false);

  // --- CHAT FEATURE STATES (PRIVATE) ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.username === "superadmin";

  // Get unique list of users who have chatted (for superadmin view)
  const chatUsers = useMemo(() => {
    return Array.from(
      new Set(
        messages
          .filter((m) => m.sender && m.sender !== "superadmin")
          .map((m) => m.sender),
      ),
    );
  }, [messages]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!supabase) return;

    const fetchMessages = async () => {
      try {
        const { data: msgs, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(200);

        if (!error && msgs) setMessages(msgs);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          if (payload.new) {
            setMessages((prev) => [...prev, payload.new]);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Re-fetch or re-subscribe if user context changes

  useEffect(() => {
    if (chatEndRef.current && isChatOpen) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatOpen, selectedChatUser]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !supabase) return;

    const me = user?.username || "Guest";
    const receiver = isSuperAdmin ? selectedChatUser : "superadmin";

    if (isSuperAdmin && !selectedChatUser) return;

    const newMessage = {
      sender: me,
      receiver: receiver,
      content: inputMessage.trim(),
    };

    const { error } = await supabase.from("messages").insert([newMessage]);
    if (!error) setInputMessage("");
  };

  // Filter messages based on who is viewing
  const filteredMessages = useMemo(() => {
    const me = user?.username || "Guest";
    return messages.filter((msg) => {
      if (isSuperAdmin) {
        if (!selectedChatUser) return false;
        return (
          (msg.sender === me && msg.receiver === selectedChatUser) ||
          (msg.sender === selectedChatUser && msg.receiver === me)
        );
      } else {
        return (
          (msg.sender === me && msg.receiver === "superadmin") ||
          (msg.sender === "superadmin" && msg.receiver === me)
        );
      }
    });
  }, [messages, user, selectedChatUser, isSuperAdmin]);
  // -----------------------------
  // -----------------------------

  const router = useRouter();

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      setConfirmModal(id);
    } else {
      newSelected.add(id);
      setSelectedIds(newSelected);
    }
  };

  const confirmUncheck = () => {
    if (confirmModal) {
      const newSelected = new Set(selectedIds);
      newSelected.delete(confirmModal);
      setSelectedIds(newSelected);
      setConfirmModal(null);
    }
  };

  // Authentication check
  useEffect(() => {
    const savedUser = localStorage.getItem("dashboard-user");
    if (!user && !savedUser) {
      router.push("/login");
    }
  }, [user, router]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [cvFilter, setCvFilter] = useState<"all" | "with" | "without">("all");
  const [tableTotal, setTableTotal] = useState(0); // total rows for table pagination

  const handleSearch = () => {
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, debouncedSearchTerm, cvFilter, activeTable]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // ─── SERVER-SIDE FETCH (data + stats) ───────────────────────────────────────
  const fetchDashboardData = async (page = 1, perPage = itemsPerPage) => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    if (page === 1) {
      setGlobalStats(null);
      setTotalRecords(0);
      setTableTotal(0);
    }

    const targetTable = activeTable;
    const dateCol = getDateColumn(targetTable);

    try {
      // 1. Build base filter query (shared for both count and data)
      const buildQuery = (
        select: string,
        opts?: { count?: "exact" | "planned" | "estimated" },
      ) => {
        let q = supabase.from(targetTable).select(select, opts || {});

        // Date filter
        if (filters.startDate) {
          if (dateCol === "tanggal_daftar") {
            const start = filters.startDate;
            const end = filters.endDate || filters.startDate;
            q = q
              .gte("tanggal_daftar", `${start}T00:00:00Z`)
              .lte("tanggal_daftar", `${end}T23:59:59Z`);
          } else {
            const [y, m] = filters.startDate.split("-");
            const monthNum = parseInt(m, 10).toString();
            q = q.or(
              `${dateCol}.ilike.${monthNum}/%/${y},${dateCol}.ilike.${y}-${m}-%`,
            );
          }
        }

        // Search (text search on minat_posisi_1)
        if (debouncedSearchTerm.trim()) {
          const isSpecialTable = SPECIAL_TABLES.includes(targetTable);
          const searchColumn = isSpecialTable
            ? "minat_pekerjaan"
            : "minat_posisi_1";
          const formattedSearch = debouncedSearchTerm
            .trim()
            .split(/\s+/)
            .map((t) => `'${t}:*'`)
            .join(" | ");
          q = q.textSearch(searchColumn, formattedSearch);
        }

        // Other filters
        if (filters.provinsi) {
          q = q.or(
            `provinsi_domisili.eq."${filters.provinsi}",provinsi_dom.eq."${filters.provinsi}",provinsi_minat_penempatan.eq."${filters.provinsi}",minat_penempatan.eq."${filters.provinsi}"`,
          );
        }
        if (filters.kota) {
          q = q.or(
            `kecamatan.eq."${filters.kota}",kecamatan_domisili.eq."${filters.kota}",kota_minat_penempatan.eq."${filters.kota}",minat_kota_penempatan.eq."${filters.kota}"`,
          );
        }
        if (filters.pengalaman) {
          q = q.or(
            `durasi_pengalaman_kerja.eq."${filters.pengalaman}",memiliki_pengalaman_kerja.eq."${filters.pengalaman}"`,
          );
        }
        if (filters.pendidikan) {
          q = q.eq("pendidikan_terakhir", filters.pendidikan);
        }
        if (filters.jenisKelamin) {
          q = q.eq("jenis_kelamin", filters.jenisKelamin);
        }
        if (filters.minatPosisi) {
          q = q.or(
            `minat_posisi_1.eq."${filters.minatPosisi}",minat_pekerjaan.eq."${filters.minatPosisi}"`,
          );
        }
        if (cvFilter === "with") {
          if (targetTable === "FLK_Nasional")
            q = q.or("upload_cv.neq.null,file_url.neq.null");
          else q = q.not("upload_cv", "is", null);
        }
        if (cvFilter === "without") {
          if (targetTable === "FLK_Nasional")
            q = q.is("upload_cv", null).is("file_url", null);
          else q = q.is("upload_cv", null);
        }
        if (filters.showSelectedOnly && selectedIds.size > 0) {
          q = q.in("id", Array.from(selectedIds) as string[]);
        }

        return q;
      };

      // 2. Paginated data query
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const {
        data: result,
        error,
        count,
      } = await buildQuery("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (gen !== fetchGenRef.current) return;

      setData(result || []);
      setTableTotal(count || 0);
      setLastRefresh(new Date());

      // 3. Stats fetch (only on first page load / filter change, not on page change)
      if (page === 1) {
        const statsPromise = supabase.rpc("get_flk_stats", {
          table_name: targetTable,
        });
        const lCountPromise = supabase
          .from(targetTable)
          .select("id", { count: "exact", head: true })
          .eq("jenis_kelamin", "L");
        const pCountPromise = supabase
          .from(targetTable)
          .select("id", { count: "exact", head: true })
          .eq("jenis_kelamin", "P");
        // Total records = unfiltered count
        const totalCountPromise = supabase
          .from(targetTable)
          .select("id", { count: "exact", head: true });

        const [
          { data: stats, error: statsError },
          { count: lCount },
          { count: pCount },
          { count: totalCount },
        ] = await Promise.all([
          statsPromise,
          lCountPromise,
          pCountPromise,
          totalCountPromise,
        ]);

        if (gen !== fetchGenRef.current) return;

        setTotalRecords(totalCount || 0);

        if (!statsError && stats) {
          if (lCount) stats.male += lCount;
          if (pCount) stats.female += pCount;
          setGlobalStats(stats);
        }
      }
    } catch (err) {
      if (gen !== fetchGenRef.current) return;
      console.error("Error fetching data:", err);
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  };

  // ─── SEARCH RESULTS kept null (search is now integrated into fetchDashboardData) ─
  const executeSearch = async (term: string) => {
    // Search is handled via debouncedSearchTerm inside fetchDashboardData
    // We just need to reset page to 1 when search term changes
    setSearchResults(null);
  };

  // ─── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setFilters({
      startDate: "",
      endDate: "",
      provinsi: "",
      kota: "",
      pengalaman: "",
      pendidikan: "",
      jenisKelamin: "",
      minatPosisi: "",
      showSelectedOnly: false,
    });
    setCurrentPage(1);
    setTableTotal(0);
  }, [activeTable]);

  // Trigger fetch whenever page, filters, search term, or cvFilter changes
  useEffect(() => {
    fetchDashboardData(currentPage, itemsPerPage);
  }, [
    currentPage,
    itemsPerPage,
    filters,
    debouncedSearchTerm,
    cvFilter,
    activeTable,
  ]);

  // Auto-refresh every 60 seconds (always page 1 to pick up new data)
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPage === 1) fetchDashboardData(1, itemsPerPage);
    }, 300000);
    return () => clearInterval(interval);
  }, [activeTable, itemsPerPage]);

  useEffect(() => {
    executeSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const localFilterOptions = useMemo(() => {
    const getFilteredFor = (excludedKey: string) => {
      return data.filter((row) => {
        const rowDate = parseRowDate(getTimestamp(row, activeTable));
        if (
          excludedKey !== "date" &&
          filters.startDate &&
          rowDate &&
          (rowDate < filters.startDate ||
            rowDate > (filters.endDate || filters.startDate))
        )
          return false;
        if (
          excludedKey !== "provinsi" &&
          filters.provinsi &&
          getProvince(row, activeTable) !== filters.provinsi
        )
          return false;
        if (
          excludedKey !== "pengalaman" &&
          filters.pengalaman &&
          (row.durasi_pengalaman_kerja || row.memiliki_pengalaman_kerja) !==
            filters.pengalaman
        )
          return false;
        if (
          excludedKey !== "pendidikan" &&
          filters.pendidikan &&
          row.pendidikan_terakhir !== filters.pendidikan
        )
          return false;
        if (
          excludedKey !== "jenisKelamin" &&
          filters.jenisKelamin &&
          row.jenis_kelamin !== filters.jenisKelamin
        )
          return false;
        if (
          excludedKey !== "minatPosisi" &&
          filters.minatPosisi &&
          (row.minat_posisi_1 || row.minat_pekerjaan) !== filters.minatPosisi
        )
          return false;
        if (
          excludedKey !== "kota" &&
          filters.kota &&
          getKota(row, activeTable) !== filters.kota
        )
          return false;
        return true;
      });
    };

    return {
      periodeKeys: [], // No longer used as a dropdown list
      provinsis: [
        ...new Set(
          getFilteredFor("provinsi")
            .map((d) => getProvince(d, activeTable))
            .filter(Boolean),
        ),
      ].sort() as string[],
      pengalamans: [
        ...new Set(
          getFilteredFor("pengalaman")
            .map(
              (d) => d.durasi_pengalaman_kerja || d.memiliki_pengalaman_kerja,
            )
            .filter(Boolean),
        ),
      ].sort() as string[],
      pendidikans: [
        ...new Set(
          getFilteredFor("pendidikan")
            .map((d) => d.pendidikan_terakhir)
            .filter(Boolean),
        ),
      ].sort() as string[],
      jenisKelamins: [
        ...new Set(
          getFilteredFor("jenisKelamin")
            .map((d) => d.jenis_kelamin)
            .filter(Boolean),
        ),
      ].sort() as string[],
      minatPosis: [
        ...new Set(
          getFilteredFor("minatPosisi")
            .map((d) => d.minat_posisi_1 || d.minat_pekerjaan)
            .filter(Boolean),
        ),
      ].sort() as string[],
      kotas: [
        ...new Set(
          getFilteredFor("kota")
            .map((d) => getKota(d, activeTable))
            .filter(Boolean),
        ),
      ].sort() as string[],
    };
  }, [data, filters, activeTable]);

  useEffect(() => {
    setFilterOptions(localFilterOptions);
  }, [localFilterOptions, setFilterOptions]);

  // 1. Dashboard Filtered Data (For Scoreboards & Stats)
  const dashboardFilteredData = useMemo(
    () =>
      data.filter((row) => {
        const rowDate = parseRowDate(getTimestamp(row, activeTable));
        if (
          filters.startDate &&
          rowDate &&
          (rowDate < filters.startDate ||
            rowDate > (filters.endDate || filters.startDate))
        )
          return false;
        if (
          filters.provinsi &&
          getProvince(row, activeTable) !== filters.provinsi
        )
          return false;
        if (
          filters.pengalaman &&
          (row.durasi_pengalaman_kerja || row.memiliki_pengalaman_kerja) !==
            filters.pengalaman
        )
          return false;
        if (
          filters.pendidikan &&
          row.pendidikan_terakhir !== filters.pendidikan
        )
          return false;
        if (filters.jenisKelamin && row.jenis_kelamin !== filters.jenisKelamin)
          return false;
        if (
          filters.minatPosisi &&
          (row.minat_posisi_1 || row.minat_pekerjaan) !== filters.minatPosisi
        )
          return false;
        if (filters.kota && getKota(row, activeTable) !== filters.kota)
          return false;

        // CV filter
        if (cvFilter !== "all") {
          const cvField =
            activeTable === "FLK_Nasional"
              ? row.upload_cv || row.file_url
              : row.upload_cv;
          if (cvFilter === "with" && !cvField) return false;
          if (cvFilter === "without" && cvField) return false;
        }

        // Checkbox selection filter
        if (filters.showSelectedOnly && !selectedIds.has(row.id || row.ID))
          return false;

        return true;
      }),
    [data, filters, cvFilter, activeTable, selectedIds],
  );

  // 2. Table data is now whatever came from the server (no client-side filtering needed)
  const tableFilteredData = data; // already filtered & paginated server-side

  const hasActiveFilter = useMemo(() => {
    const entries = Object.entries(filters);
    const hasMainFilters = entries.some(([key, val]) => {
      if (typeof val === "boolean") return val === true;
      return val !== "";
    });
    return (
      hasMainFilters || cvFilter !== "all" || debouncedSearchTerm.trim() !== ""
    );
  }, [filters, cvFilter, debouncedSearchTerm]);

  const total = useMemo(() => {
    const isSpecialTable = SPECIAL_TABLES.includes(activeTable);
    if (!hasActiveFilter && globalStats && !isSpecialTable)
      return globalStats.total;
    return tableTotal; // use server-reported filtered count
  }, [tableTotal, hasActiveFilter, globalStats, activeTable]);

  const genderStats = useMemo(() => {
    const isSpecialTable = SPECIAL_TABLES.includes(activeTable);
    if (!hasActiveFilter && globalStats && !isSpecialTable) {
      return { male: globalStats.male || 0, female: globalStats.female || 0 };
    }

    let male = 0;
    let female = 0;

    dashboardFilteredData.forEach((d) => {
      const jk = (d.jenis_kelamin || "").toLowerCase();
      // Use mutually exclusive logic to prevent double counting
      if (jk === "l" || (jk.includes("laki") && !jk.includes("perempuan"))) {
        male++;
      } else if (jk === "p" || jk.includes("perempuan")) {
        female++;
      }
    });

    return { male, female };
  }, [dashboardFilteredData, hasActiveFilter, globalStats, activeTable]);

  const maleCount = genderStats.male;
  const femaleCount = genderStats.female;

  // Server handles pagination — totalPages based on server count
  const totalPages = Math.ceil(tableTotal / itemsPerPage);
  const paginatedData = data; // current page data already from server

  const insights = useMemo(() => {
    const isSpecialTable = SPECIAL_TABLES.includes(activeTable);
    // Use global stats if no filters active
    if (!hasActiveFilter && globalStats && !isSpecialTable) {
      // Group global top sources/positions to handle casing issues
      const groupGlobalItems = (items: any[]) => {
        const grouped = items.reduce((acc: any, curr: any) => {
          const name = (curr.name || "").toUpperCase().trim();
          acc[name] = (acc[name] || 0) + curr.count;
          return acc;
        }, {});
        return Object.entries(grouped).sort((a: any, b: any) => b[1] - a[1]);
      };

      return {
        topSources: groupGlobalItems(globalStats.top_sources || []),
        topPositions: groupGlobalItems(globalStats.top_positions || []),
        freshGrads: globalStats.fresh || 0,
        expCount: (globalStats.total || 0) - (globalStats.fresh || 0),
      };
    }

    if (dashboardFilteredData.length === 0)
      return {
        topSources: [],
        topPositions: [],
        freshGrads: 0,
        expCount: 0,
      };

    const getTopItems = (arr: string[], limit = 3) => {
      const counts = arr.reduce((acc: any, curr) => {
        const normalized = curr.toUpperCase().trim();
        acc[normalized] = (acc[normalized] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, limit);
    };

    const sources = dashboardFilteredData
      .map((d) => d.sumber_informasi)
      .filter(Boolean);
    const topSources = getTopItems(sources);

    const positions = dashboardFilteredData
      .map((d) => d.minat_posisi_1 || d.minat_pekerjaan)
      .filter(Boolean);
    const topPositions = getTopItems(positions);

    const freshGrads = dashboardFilteredData.filter((d) =>
      d.durasi_pengalaman_kerja?.toLowerCase().includes("fresh"),
    ).length;
    const expCount = dashboardFilteredData.length - freshGrads;

    return { topSources, topPositions, freshGrads, expCount };
  }, [dashboardFilteredData, hasActiveFilter, globalStats]);

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      provinsi: "",
      kota: "",
      pengalaman: "",
      pendidikan: "",
      jenisKelamin: "",
      minatPosisi: "",
      showSelectedOnly: false,
    });
    setCvFilter("all");
  };

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
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, from + pageSize - 1);

          if (filters.startDate) {
            // Kita saring secara client-side nanti untuk akurasi 100% dengan string M/D/YYYY
            // tapi kita tetep bisa tambahin filter server-side kalau kolomnya native timestamp (created_at)
            query = query.gte("created_at", `${filters.startDate}T00:00:00`);
            if (filters.endDate) {
              query = query.lte("created_at", `${filters.endDate}T23:59:59`);
            }
          }
          if (filters.provinsi) {
            query = query.or(
              `provinsi_domisili.eq."${filters.provinsi}",provinsi_dom.eq."${filters.provinsi}",provinsi_minat_penempatan.eq."${filters.provinsi}",minat_penempatan.eq."${filters.provinsi}"`,
            );
          }
          if (filters.pengalaman) {
            query = query.or(
              `durasi_pengalaman_kerja.eq."${filters.pengalaman}",memiliki_pengalaman_kerja.eq."${filters.pengalaman}"`,
            );
          }
          if (filters.pendidikan) {
            query = query.eq("pendidikan_terakhir", filters.pendidikan);
          }
          if (filters.jenisKelamin) {
            query = query.eq("jenis_kelamin", filters.jenisKelamin);
          }
          if (filters.minatPosisi) {
            query = query.or(
              `minat_posisi_1.eq."${filters.minatPosisi}",minat_pekerjaan.eq."${filters.minatPosisi}"`,
            );
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
        alert("Tidak ada data untuk diekspor.");
        return;
      }

      const headers = [
        "No",
        "Tgl Lamar",
        "Nama Lengkap",
        "Email",
        "No WA",
        "No HP",
        "Sumber Informasi",
        "Tgl Lahir",
        "Jenis Kelamin",
        "Pengalaman Kerja",
        "Durasi Pengalaman",
        "Minat Posisi",
        "Provinsi",
        "Pendidikan",
        "Sekolah/Kampus",
        "Hasil Screening",
        "Screening Time",
        "Nomor Task",
        "Link CV",
      ];

      const worksheetData: any[][] = [headers];
      exportData.forEach((r, idx) => {
        worksheetData.push([
          idx + 1,
          formatDate(r.timestamp, true),
          r.nama_lengkap || "-",
          r.email_aktif || r.email || "-",
          r.no_wa || "-",
          r.no_hp || "-",
          r.sumber_informasi || "-",
          formatDate(r.tanggal_lahir),
          r.jenis_kelamin || "-",
          r.pengalaman_kerja_terakhir || r.pengalaman_kerja || "-",
          r.durasi_pengalaman_kerja || r.memiliki_pengalaman_kerja || "-",
          r.minat_posisi_1 || r.minat_pekerjaan || "-",
          r.provinsi_domisili ||
            r.provinsi_dom ||
            r.provinsi_minat_penempatan ||
            r.minat_penempatan ||
            "-",
          r.pendidikan_terakhir || "-",
          r.nama_sekolah || "-",
          r.hasil_screening || "-",
          formatDate(r.screening_time, true),
          r.nomor_task || "-",
          (activeTable === "FLK_Nasional"
            ? r.upload_cv || r.file_url
            : r.upload_cv) || "-",
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pelamar");
      worksheet["!cols"] = headers.map((h) => ({
        wch: Math.min(h.length + 5, 50),
      }));
      XLSX.writeFile(
        workbook,
        `FLK_Export_${activeTable}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Error exporting data:", err);
      alert("Gagal mengekspor data. Silakan coba lagi.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const exportSelectedExcel = async () => {
    if (selectedIds.size === 0) {
      setShowNoSelectionModal(true);
      return;
    }
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Tentukan kolom ID (id atau ID)
      const idColumn = data[0]?.ID ? "ID" : "id";

      const { data: exportData, error } = await supabase
        .from(activeTable)
        .select("*")
        .in(idColumn, Array.from(selectedIds) as string[]);

      if (error) throw error;

      if (!exportData || exportData.length === 0) {
        alert("Data yang dipilih tidak ditemukan di database.");
        return;
      }

      const headers = [
        "No",
        "Tgl Lamar",
        "Nama Lengkap",
        "Email",
        "No WA",
        "No HP",
        "Sumber Informasi",
        "Tgl Lahir",
        "Jenis Kelamin",
        "Pengalaman Kerja",
        "Durasi Pengalaman",
        "Minat Posisi",
        "Provinsi",
        "Pendidikan",
        "Sekolah/Kampus",
        "Hasil Screening",
        "Screening Time",
        "Nomor Task",
        "Link CV",
      ];

      const worksheetData: any[][] = [headers];
      exportData.forEach((r, idx) => {
        worksheetData.push([
          idx + 1,
          formatDate(r.timestamp, true),
          r.nama_lengkap || "-",
          r.email_aktif || r.email || "-",
          r.no_wa || "-",
          r.no_hp || "-",
          r.sumber_informasi || "-",
          formatDate(r.tanggal_lahir),
          r.jenis_kelamin || "-",
          r.pengalaman_kerja_terakhir || r.pengalaman_kerja || "-",
          r.durasi_pengalaman_kerja || r.memiliki_pengalaman_kerja || "-",
          r.minat_posisi_1 || r.minat_pekerjaan || "-",
          r.provinsi_domisili ||
            r.provinsi_dom ||
            r.provinsi_minat_penempatan ||
            r.minat_penempatan ||
            "-",
          r.pendidikan_terakhir || "-",
          r.nama_sekolah || "-",
          r.hasil_screening || "-",
          formatDate(r.screening_time, true),
          r.nomor_task || "-",
          (activeTable === "FLK_Nasional"
            ? r.upload_cv || r.file_url
            : r.upload_cv) || "-",
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Terpilih");
      worksheet["!cols"] = headers.map((h) => ({
        wch: Math.min(h.length + 5, 50),
      }));
      XLSX.writeFile(
        workbook,
        `FLK_Selected_${activeTable}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (err) {
      console.error("Error exporting selected data:", err);
      alert("Gagal mengekspor data terpilih.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const updatePelamar = async (id: any, field: string, value: string) => {
    try {
      const updateData: any = { [field]: value };
      const currentUsername = user?.username || "System";
      const isSuperAdmin = currentUsername === "superadmin";

      // Find the row and decide which ID column to use
      const currentRow = data.find((r) => (r.id || r.ID) === id);
      const idColumn = currentRow?.ID ? "ID" : "id";

      // If screening or task changes, update PIC and history
      if (field === "hasil_screening" || field === "nomor_task") {
        const oldValue = currentRow ? currentRow[field] : "-";

        // Don't update if value hasn't changed
        if (oldValue === value) return;

        let history = [];
        try {
          history = JSON.parse(currentRow?.pic_history || "[]");
        } catch (e) {
          history = [];
        }

        // --- LIMIT CHECK FOR NON-SUPERADMIN ---
        if (!isSuperAdmin) {
          const actionLabel = field === "hasil_screening" ? "Status" : "Task";
          const updateCount = history.filter((h: any) =>
            h.action.startsWith(`${actionLabel}:`),
          ).length;

          if (updateCount >= 3) {
            setLimitModal({
              show: true,
              message: `Maaf, jatah update ${actionLabel} untuk data ini sudah habis (Maksimal 3x). Silakan hubungi Superadmin jika perlu perubahan lebih lanjut.`,
            });
            // REVERT local state to oldValue
            setData((prev) =>
              prev.map((r) =>
                r.id === id || r.ID === id ? { ...r, [field]: oldValue } : r,
              ),
            );
            if (searchResults) {
              setSearchResults((prev) =>
                prev
                  ? prev.map((r) =>
                      r.id === id || r.ID === id
                        ? { ...r, [field]: oldValue }
                        : r,
                    )
                  : null,
              );
            }
            return;
          }
        }
        // --------------------------------------

        updateData.pic = currentUsername;
        const actionLabel = field === "hasil_screening" ? "Status" : "Task";
        const actionDetail = `${actionLabel}: ${oldValue || "-"} → ${value}`;

        // Gunakan toLocaleString dengan timeZone Asia/Jakarta agar pasti WIB
        const jktTime = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Jakarta",
        });
        const localNow = new Date(jktTime);
        const day = String(localNow.getDate()).padStart(2, "0");
        const month = String(localNow.getMonth() + 1).padStart(2, "0");
        const year = String(localNow.getFullYear()).slice(-2);
        const hours = String(localNow.getHours()).padStart(2, "0");
        const minutes = String(localNow.getMinutes()).padStart(2, "0");
        const timeStr = `${day}/${month}/${year} ${hours}:${minutes}`;

        // Tambah entry baru ke history
        history.unshift({
          name: currentUsername,
          action: actionDetail,
          time: timeStr,
        });

        // Simpan 15 history terakhir
        updateData.pic_history = JSON.stringify(history.slice(0, 15));

        if (field === "hasil_screening") {
          // Update screening_time juga dengan format YYYY-MM-DD HH:mm:ss
          const isoNow = new Date()
            .toLocaleString("en-ZA", { timeZone: "Asia/Jakarta" })
            .replace(",", "");
          updateData.screening_time = isoNow;
        }
      }

      const { error } = await supabase
        .from(activeTable)
        .update(updateData)
        .eq(idColumn, id);

      if (error) throw error;

      // Update local state
      const jktNow = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      });
      const dNow = new Date(jktNow);
      const dayStr = String(dNow.getDate()).padStart(2, "0");
      const monthStr = String(dNow.getMonth() + 1).padStart(2, "0");
      const yearStr = String(dNow.getFullYear()).slice(-2);
      const hoursStr = String(dNow.getHours()).padStart(2, "0");
      const minStr = String(dNow.getMinutes()).padStart(2, "0");
      const timeStrLocal = `${dayStr}/${monthStr}/${yearStr} ${hoursStr}:${minStr}`;
      const dbFormatTime = new Date()
        .toLocaleString("en-ZA", { timeZone: "Asia/Jakarta" })
        .replace(",", "");

      setData((prev) =>
        prev.map((row) => {
          if ((row.id || row.ID) === id) {
            const updatedRow = {
              ...row,
              [field]: value,
              ...(field === "hasil_screening" || field === "nomor_task"
                ? { pic: currentUsername }
                : {}),
              ...(field === "hasil_screening"
                ? { screening_time: dbFormatTime }
                : {}),
            };

            // Update history in local state too
            if (field === "hasil_screening" || field === "nomor_task") {
              let history = [];
              try {
                history = JSON.parse(row.pic_history || "[]");
              } catch (e) {
                history = [];
              }

              const oldValue = row[field] || "-";
              const actionLabel =
                field === "hasil_screening" ? "Status" : "Task";
              const actionDetail = `${actionLabel}: ${oldValue || "-"} → ${value}`;

              history.unshift({
                name: currentUsername,
                action: actionDetail,
                time: timeStrLocal,
              });
              updatedRow.pic_history = JSON.stringify(history.slice(0, 15));
            }
            return updatedRow;
          }
          return row;
        }),
      );

      if (searchResults) {
        setSearchResults((prev) =>
          prev
            ? prev.map((row) => {
                if ((row.id || row.ID) === id) {
                  const updatedRow = {
                    ...row,
                    [field]: value,
                    ...(field === "hasil_screening" || field === "nomor_task"
                      ? { pic: currentUsername }
                      : {}),
                    ...(field === "hasil_screening"
                      ? { screening_time: dbFormatTime }
                      : {}),
                  };
                  if (field === "hasil_screening" || field === "nomor_task") {
                    let history = [];
                    try {
                      history = JSON.parse(row.pic_history || "[]");
                    } catch (e) {
                      history = [];
                    }
                    const oldValue = row[field] || "-";
                    const actionLabel =
                      field === "hasil_screening" ? "Status" : "Task";
                    const actionDetail = `${actionLabel}: ${oldValue || "-"} → ${value}`;

                    history.unshift({
                      name: currentUsername,
                      action: actionDetail,
                      time: timeStrLocal,
                    });
                    updatedRow.pic_history = JSON.stringify(
                      history.slice(0, 15),
                    );
                  }
                  return updatedRow;
                }
                return row;
              })
            : null,
        );
      }
    } catch (err) {
      console.error("Error updating pelamar:", err);
      alert(
        "Gagal mengupdate data. Pastikan kolom sudah ada di database Supabase Anda.",
      );
    }
  };

  const clearHistory = async () => {
    if (!deleteHistoryId) return;
    const id = deleteHistoryId;

    // Find if the row uses 'id' or 'ID'
    const targetRow = data.find((r) => (r.id || r.ID) === id);
    const idColumn = targetRow?.ID ? "ID" : "id";

    try {
      const { error } = await supabase
        .from(activeTable)
        .update({ pic: null, pic_history: null })
        .eq(idColumn, id);

      if (error) throw error;

      // Update local state
      setData((prev) =>
        prev.map((row) =>
          row.id === id || row.ID === id
            ? { ...row, pic: null, pic_history: null }
            : row,
        ),
      );
      if (searchResults) {
        setSearchResults((prev) =>
          prev
            ? prev.map((row) =>
                row.id === id || row.ID === id
                  ? { ...row, pic: null, pic_history: null }
                  : row,
              )
            : null,
        );
      }
      setDeleteHistoryId(null);
    } catch (err: any) {
      console.error("Error clearing history:", err);
      alert(
        `Gagal menghapus history: ${err.message || "Error tidak diketahui"}`,
      );
    }
  };

  const formatDate = (
    dateString: string | null,
    includeTime: boolean = false,
  ) => {
    if (!dateString || dateString === "-") return "-";
    try {
      let ds = dateString;
      // Handle non-standard "M/D/YYYY T" format and aggressively strip timezone info
      // to prevent browser from adding +7 offset
      ds = ds.replace(/[Zz]/g, "").replace(/\+\d{2}(:?\d{2})?$/, "");

      if (ds.includes("/") && ds.includes("T")) {
        const [datePart, timePart] = ds.split("T");
        const [m, d, y] = datePart.split("/");
        if (m && d && y) {
          ds = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${timePart}`;
        }
      }

      const d = new Date(ds);
      if (isNaN(d.getTime())) return dateString;

      const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        year: "numeric",
      };

      if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
        options.hour12 = false;
      }

      return d.toLocaleDateString("id-ID", options);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div className="title-group">
          <h2>Data Pelamar {activeTable.replace("FLK_", "")}</h2>
          <p>
            {hasActiveFilter
              ? `${total.toLocaleString("id-ID")} dari ${totalRecords.toLocaleString("id-ID")} pelamar (filter aktif)`
              : `Total ${totalRecords.toLocaleString("id-ID")} pelamar`}
          </p>
        </div>
        <div className="action-group">
          {hasActiveFilter && (
            <button className="btn-reset" onClick={resetFilters}>
              <X size={16} /> Reset Filter
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={exportExcel}
            disabled={isExporting || loading}
          >
            <Download size={18} />
            {isExporting
              ? exportProgress > 0
                ? `${exportProgress.toLocaleString("id-ID")} baris...`
                : "Mengekspor..."
              : "Export Excel"}
          </button>

          <button
            className="btn-secondary"
            onClick={exportSelectedExcel}
            disabled={isExporting || loading}
            style={{
              background: selectedIds.size > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.05)",
              borderColor: selectedIds.size > 0 ? "rgba(16, 185, 129, 0.3)" : "var(--border-color)",
              color: selectedIds.size > 0 ? "#10b981" : "var(--text-muted)",
            }}
          >
            <CheckSquare size={18} />
            {isExporting ? "Mengekspor..." : `Export Terpilih (${selectedIds.size})`}
          </button>

          <button
            className="btn-primary"
            onClick={() => fetchDashboardData()}
            disabled={loading || isSearching}
          >
            <RefreshCcw size={18} className={loading ? "spin" : ""} />
            {loading ? "Loading..." : "Refresh Data"}
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
            <span className="value">
              {hasActiveFilter
                ? total.toLocaleString("id-ID")
                : totalRecords.toLocaleString("id-ID")}
            </span>
            <span className="sub-value">
              Dari {totalRecords.toLocaleString("id-ID")} basis data
            </span>
          </div>
          <div className="stat-icon cyan">
            <Users size={20} />
          </div>
          <div className="progress-bar">
            <div
              className="fill"
              style={{
                width: `${totalRecords > 0 ? Math.round((total / totalRecords) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">GENDER BREAKDOWN</span>
              <span className="total-badge">
                {(maleCount + femaleCount).toLocaleString("id-ID")} TOTAL
              </span>
            </div>
            <div className="gender-info">
              <span className="value">
                {maleCount.toLocaleString("id-ID")} <small>L</small>
              </span>
              <span className="divider">/</span>
              <span className="value">
                {femaleCount.toLocaleString("id-ID")} <small>P</small>
              </span>
            </div>
            <span className="sub-value">
              {total > 0 ? Math.round((maleCount / total) * 100) : 0}% Laki-laki
            </span>
          </div>
          <div className="stat-icon purple">
            <User size={20} />
          </div>
          <div className="progress-bar double">
            <div
              className="fill green"
              style={{
                width: `${total > 0 ? Math.round((maleCount / total) * 100) : 0}%`,
              }}
            />
            <div
              className="fill purple"
              style={{
                width: `${total > 0 ? Math.round((femaleCount / total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">EXPERIENCE BREAKDOWN</span>
              <span className="total-badge">
                {(insights.freshGrads + insights.expCount).toLocaleString(
                  "id-ID",
                )}{" "}
                TOTAL
              </span>
            </div>
            <div className="gender-info">
              <span className="value">
                {insights.freshGrads.toLocaleString("id-ID")}{" "}
                <small>Fresh</small>
              </span>
              <span className="divider">/</span>
              <span className="value">
                {insights.expCount.toLocaleString("id-ID")} <small>Exp</small>
              </span>
            </div>
            <span className="sub-value">
              {total > 0 ? Math.round((insights.freshGrads / total) * 100) : 0}%
              Fresh Graduate
            </span>
          </div>
          <div className="stat-icon orange">
            <TrendingUp size={20} />
          </div>
          <div className="progress-bar double">
            <div
              className="fill orange"
              style={{
                width: `${total > 0 ? Math.round((insights.freshGrads / total) * 100) : 0}%`,
              }}
            />
            <div
              className="fill cyan"
              style={{
                width: `${total > 0 ? Math.round((insights.expCount / total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">TOP SOURCES</span>
              <span className="total-badge">
                {total.toLocaleString("id-ID")} TOTAL
              </span>
            </div>
            <div className="mini-list">
              {insights.topSources
                .slice(0, 3)
                .map(([name, count]: [string, number | unknown], i: number) => (
                  <div key={name} className="list-item">
                    <div className="item-bar">
                      <div
                        className="item-fill pink"
                        style={{
                          width: `${total > 0 ? Math.round(((count as number) / total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="rank">{i + 1}</span>
                    <span className="name truncate">{name}</span>
                    <span className="count">
                      {(count as number).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              {insights.topSources.length === 0 && (
                <span className="value">-</span>
              )}
            </div>
          </div>
          <div className="stat-icon pink">
            <Share2 size={20} />
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-info">
            <div className="stat-header">
              <span className="label">TOP POSITIONS</span>
              <span className="total-badge">
                {total.toLocaleString("id-ID")} TOTAL
              </span>
            </div>
            <div className="mini-list">
              {insights.topPositions
                .slice(0, 3)
                .map(([name, count]: [string, number | unknown], i: number) => (
                  <div key={name} className="list-item">
                    <div className="item-bar">
                      <div
                        className="item-fill yellow"
                        style={{
                          width: `${total > 0 ? Math.round(((count as number) / total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="rank">{i + 1}</span>
                    <span className="name truncate">{name}</span>
                    <span className="count">
                      {(count as number).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              {insights.topPositions.length === 0 && (
                <span className="value">-</span>
              )}
            </div>
          </div>
          <div className="stat-icon yellow">
            <Briefcase size={20} />
          </div>
        </div>
      </div>

      <div className="table-search-header">
        <div className="search-container">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Cari minat posisi..."
            value={searchTerm || ""}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                handleSearch();
              }}
              className="clear-search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="cv-filter-toggle">
          <button
            className={`cv-toggle-btn ${cvFilter === "all" ? "active" : ""}`}
            onClick={() => setCvFilter("all")}
          >
            Semua
          </button>
          <button
            className={`cv-toggle-btn has-cv ${cvFilter === "with" ? "active" : ""}`}
            onClick={() => setCvFilter("with")}
          >
            ✓ CV
          </button>
          <button
            className={`cv-toggle-btn no-cv ${cvFilter === "without" ? "active" : ""}`}
            onClick={() => setCvFilter("without")}
          >
            ✕ CV
          </button>
        </div>
      </div>
      <div className="table-container glass-card">
        <table className="data-table">
          <thead>
            <tr>
              <th
                className="sticky-col sticky-col-1"
                style={{ width: "45px", textAlign: "center" }}
              >
                <input
                  type="checkbox"
                  className="row-checkbox"
                  title="Filter: Hanya tampilkan data yang dicentang"
                  checked={!!filters.showSelectedOnly}
                  onChange={() =>
                    setFilters({
                      ...filters,
                      showSelectedOnly: !filters.showSelectedOnly,
                    })
                  }
                />
              </th>
              <th className="sticky-col sticky-col-2" style={{ width: "45px" }}>
                #
              </th>
              <th
                className="sticky-col sticky-col-3"
                style={{ width: "120px" }}
              >
                TGL LAMAR
              </th>
              <th>NAMA LENGKAP</th>
              <th>KONTAK</th>
              <th>SUMBER INFORMASI</th>
              <th>TGL LAHIR · JK</th>
              <th>PENGALAMAN KERJA</th>
              <th>MINAT POSISI</th>
              <th>PROVINSI</th>
              <th>KOTA/KEC</th>
              <th>PENDIDIKAN</th>
              <th>SCREENING</th>
              <th>SCREENING TIME</th>
              <th>TASK</th>
              <th>PIC</th>
              <th>CV</th>
            </tr>
          </thead>
          <tbody>
            {loading || isSearching ? (
              <tr>
                <td colSpan={16} className="loading-row">
                  {isSearching ? "Mencari data..." : "Memuat data..."}
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={16} className="empty-row">
                  Tidak ada data ditemukan
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const isSelected = selectedIds.has(row.id || row.ID);
                return (
                  <tr key={row.id || idx}>
                    <td
                      className="sticky-col sticky-col-1"
                      style={{ textAlign: "center" }}
                    >
                      <input
                        type="checkbox"
                        className="row-checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(row.id || row.ID)}
                      />
                    </td>
                    <td className="row-num sticky-col sticky-col-2">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td
                      className="sticky-col sticky-col-3"
                      style={{
                        whiteSpace: "nowrap",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatDate(getTimestamp(row, activeTable), true)}
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-main">
                          {row.nama_lengkap || "-"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack" style={{ maxWidth: "250px" }}>
                        <span
                          className="cell-main truncate"
                          title={row.email_aktif || row.email || ""}
                        >
                          {row.email_aktif || row.email || "-"}
                        </span>
                        {row.no_wa && (
                          <span className="cell-sub">WA: {row.no_wa}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="source-tag">
                        {row.sumber_informasi || "-"}
                      </span>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-main">
                          {formatDate(row.tanggal_lahir)}
                        </span>
                        {row.jenis_kelamin && (
                          <span
                            className={`gender-tag ${row.jenis_kelamin?.toLowerCase().includes("laki") ? "male" : "female"}`}
                          >
                            {row.jenis_kelamin}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-main">
                          {row.pengalaman_kerja_terakhir ||
                            row.pengalaman_kerja ||
                            "-"}
                        </span>
                      </div>
                    </td>
                    <td>
                      {row.minat_posisi_1 || row.minat_pekerjaan ? (
                        <span className="position-tag">
                          {row.minat_posisi_1 || row.minat_pekerjaan}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span className="province-tag">
                        {getProvince(row, activeTable) || "-"}
                      </span>
                    </td>
                    <td>
                      <span className="city-tag">
                        {getKota(row, activeTable) || "-"}
                      </span>
                    </td>
                    <td className="col-pendidikan">
                      <div className="cell-stack">
                        <span className="cell-main">
                          {row.pendidikan_terakhir || "-"}
                        </span>
                        {row.nama_sekolah && (
                          <span className="cell-sub">{row.nama_sekolah}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        className={`screening-select ${row.hasil_screening?.toLowerCase() || ""}`}
                        value={row.hasil_screening || ""}
                        onChange={(e) =>
                          updatePelamar(
                            row.id || row.ID,
                            "hasil_screening",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">- Select -</option>
                        <option value="PASSED">PASSED</option>
                        <option value="FAILED">FAILED</option>
                        <option value="PENDING">PENDING</option>
                      </select>
                    </td>
                    <td
                      style={{
                        whiteSpace: "nowrap",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      {formatDate(row.screening_time, true)}
                    </td>
                    <td>
                      <input
                        type="text"
                        className="task-input"
                        placeholder="..."
                        value={row.nomor_task || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const rowId = row.id || row.ID;
                          setData((prev) =>
                            prev.map((r) =>
                              (r.id || r.ID) === rowId
                                ? { ...r, nomor_task: val }
                                : r,
                            ),
                          );
                        }}
                        onBlur={(e) =>
                          updatePelamar(
                            row.id || row.ID,
                            "nomor_task",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <div
                        className="pic-cell"
                        style={{
                          zIndex:
                            activeHistoryId === (row.id || row.ID) ? 10001 : 1,
                        }}
                      >
                        <span
                          className="pic-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rowId = row.id || row.ID;
                            setActiveHistoryId(
                              activeHistoryId === rowId ? null : rowId,
                            );
                          }}
                        >
                          {row.pic || "-"}
                        </span>
                        {row.pic_history &&
                          activeHistoryId === (row.id || row.ID) && (
                            <div className="pic-history-dropdown">
                              <div className="history-header">
                                <div className="header-left">
                                  Log Aktivitas (
                                  {JSON.parse(row.pic_history).length})
                                </div>
                                <div className="header-right">
                                  {user?.username === "superadmin" && (
                                    <button
                                      className="clear-history-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteHistoryId(row.id || row.ID);
                                      }}
                                      title="Hapus History"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                  <button
                                    className="close-history-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveHistoryId(null);
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                              {JSON.parse(row.pic_history).map(
                                (item: any, i: number) => (
                                  <div key={i} className="hst-item">
                                    <div className="hst-left">
                                      <span className="hst-time">
                                        {item.time}
                                      </span>
                                      <span className="hst-name">
                                        {item.name}
                                      </span>
                                      {i === 0 && (
                                        <span className="hst-latest">
                                          TERBARU
                                        </span>
                                      )}
                                    </div>
                                    <div className="hst-action">
                                      {item.action}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const cvUrl =
                          activeTable === "FLK_Nasional"
                            ? row.upload_cv || row.file_url
                            : row.upload_cv;
                        return cvUrl ? (
                          <button
                            onClick={() => setSelectedCv(cvUrl)}
                            className="cv-btn"
                          >
                            <ExternalLink size={14} /> CV
                          </button>
                        ) : (
                          <span className="cell-sub">-</span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {tableTotal > 0 && (
        <div className="pagination-container glass-card">
          <div className="pagination-info">
            <div className="per-page-selector">
              <span>Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
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
              {(currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, tableTotal)} dari{" "}
              {tableTotal.toLocaleString("id-ID")} data
            </div>
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="page-current">
              Halaman {currentPage} dari {totalPages.toLocaleString("id-ID")}
            </span>
            <button
              className="page-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CV Modal */}
      {selectedCv && (
        <div className="cv-modal-overlay" onClick={() => setSelectedCv(null)}>
          <div
            className="cv-modal-content glass-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cv-modal-header">
              <h3>Dokumen CV</h3>
              <div className="cv-modal-actions">
                <a
                  href={(() => {
                    const url = selectedCv;
                    if (url.includes("drive.google.com")) {
                      const idMatch =
                        url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                        url.match(/id=([a-zA-Z0-9_-]+)/);
                      if (idMatch)
                        return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
                    }
                    if (url.includes("supabase.co")) {
                      const sep = url.includes("?") ? "&" : "?";
                      return `${url}${sep}download=CV_Pelamar.pdf`;
                    }
                    return url;
                  })()}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                >
                  <Download size={14} /> Download
                </a>
                <button
                  className="btn-close"
                  onClick={() => setSelectedCv(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="cv-modal-body">
              <iframe
                src={(() => {
                  const url = selectedCv;
                  if (url.includes("drive.google.com")) {
                    let embedUrl = url.replace(/\/view.*$/, "/preview");
                    const idMatch = embedUrl.match(/id=([a-zA-Z0-9_-]+)/);
                    if (idMatch)
                      return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
                    if (
                      !embedUrl.endsWith("/preview") &&
                      embedUrl.includes("/file/d/")
                    )
                      return `${embedUrl}/preview`;
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
        .title-group h2 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 0px;
          line-height: 1.2;
        }
        .title-group p {
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.2;
        }
        .action-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn-secondary {
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 6px 12px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
        }
        .btn-secondary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .btn-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-reset {
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          padding: 8px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-reset:hover {
          background: rgba(239, 68, 68, 0.15);
          transform: translateY(-2px);
        }
        .btn-reset:active {
          transform: translateY(0) scale(0.96);
        }
        .filter-card {
          padding: 12px 20px;
          margin-bottom: 16px;
        }
        .filter-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-weight: 600;
          font-size: 13px;
        }
        .status-indicator {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--success);
          font-weight: 400;
        }
        .status-indicator .dot {
          width: 6px;
          height: 6px;
          background: var(--success);
          border-radius: 50%;
          box-shadow: 0 0 6px var(--success);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        :global(.spin) {
          animation: spin 1s linear infinite;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px 20px;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .filter-item label {
          font-size: 10px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        :global(.icon-blue) {
          color: #60a5fa;
        }
        :global(.icon-red) {
          color: #f87171;
        }
        :global(.icon-amber) {
          color: #fbbf24;
        }
        :global(.icon-green) {
          color: #34d399;
        }
        :global(.icon-purple) {
          color: #a78bfa;
        }
        :global(.icon-cyan) {
          color: #22d3ee;
        }
        .filter-item select {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 6px 10px;
          border-radius: 6px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s;
          font-size: 13px;
        }
        .filter-item select:focus {
          border-color: var(--primary-accent);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .stat-card {
          padding: 12px 14px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
          transition:
            transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.4s ease;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }
        .stat-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          margin-right: 8px;
        }
        .stat-info .label {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .stat-info .value {
          font-size: 20px;
          font-weight: 700;
          margin-top: 2px;
          color: var(--text-main);
        }
        .stat-info .value.truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .stat-info .sub-value {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          margin-bottom: 4px;
        }
        .total-badge {
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          white-space: nowrap;
        }
        .stat-info .value small {
          font-size: 10px;
          opacity: 0.6;
          font-weight: 400;
          text-transform: uppercase;
        }
        .gender-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }
        .gender-info .divider {
          opacity: 0.2;
        }

        .mini-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
          width: 100%;
        }
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
        .item-fill.pink {
          background: #ec4899;
        }
        .item-fill.yellow {
          background: #eab308;
        }

        .list-item .rank {
          position: relative;
          z-index: 1;
          width: 16px;
          height: 16px;
          background: var(--glass-border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          color: var(--text-main);
        }
        .list-item .name {
          position: relative;
          z-index: 1;
          flex: 1;
          font-weight: 500;
          color: var(--text-main);
        }
        .list-item .count {
          position: relative;
          z-index: 1;
          font-weight: 700;
          font-family: monospace;
          opacity: 0.8;
          color: var(--text-main);
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-icon.cyan {
          background: rgba(0, 158, 217, 0.1);
          color: #009ed9;
        }
        .stat-icon.green {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .stat-icon.purple {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }
        .stat-icon.orange {
          background: rgba(249, 115, 22, 0.1);
          color: #f97316;
        }
        .stat-icon.pink {
          background: rgba(236, 72, 153, 0.1);
          color: #ec4899;
        }
        .stat-icon.yellow {
          background: rgba(234, 179, 8, 0.1);
          color: #eab308;
        }
        .stat-icon.blue {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: var(--glass-bg);
          border-radius: 2px;
          margin-top: 8px;
          display: flex;
        }
        .progress-bar.double {
          gap: 2px;
          background: transparent;
        }
        .fill {
          height: 100%;
          background: #009ed9;
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        .fill.green {
          background: #10b981;
        }
        .fill.purple {
          background: #8b5cf6;
        }
        .fill.orange {
          background: #f97316;
        }

        /* Table & Search Styles */
        .table-search-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
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

        /* CV Filter Toggle */
        .cv-filter-toggle {
          display: flex;
          align-items: center;
          background: var(--glass-bg);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 3px;
          gap: 2px;
        }
        .cv-toggle-btn {
          padding: 5px 14px;
          border-radius: 16px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 500;
          font-family: var(--font-inter);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .cv-toggle-btn:hover {
          color: var(--text-main);
          background: rgba(255, 255, 255, 0.05);
        }
        .cv-toggle-btn.active {
          background: var(--primary-accent);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0, 158, 217, 0.35);
        }
        .cv-toggle-btn.has-cv.active {
          background: #10b981;
          color: #fff;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
        }
        .cv-toggle-btn.no-cv.active {
          background: #ef4444;
          color: #fff;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
        }

        .table-container {
          overflow: auto;
          max-height: calc(100vh - 250px);
          min-height: 500px;
          border-radius: 12px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          position: relative;
        }
        .data-table {
          width: 100%;
          min-width: 1600px;
          border-collapse: separate;
          border-spacing: 0;
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
          white-space: nowrap;
        }
        .data-table td {
          padding: 10px 8px;
          border-bottom: 1px solid var(--border-color);
          vertical-align: top;
        }
        .data-table tbody tr {
          transition: all 0.2s ease;
        }
        .data-table tbody tr:hover td {
          background: var(--active-bg);
        }

        /* ===== STICKY COLUMNS REFACTORED ===== */
        :global(.sticky-col) {
          position: sticky !important;
          background-color: var(--card-bg) !important;
          z-index: 10 !important;
          /* Ensure no transparency leak */
          background-clip: padding-box;
        }

        /* Sticky Header + Left */
        :global(thead .sticky-col) {
          z-index: 40 !important;
          top: 0 !important;
        }

        /* General Sticky Header */
        :global(thead th) {
          position: sticky !important;
          top: 0 !important;
          z-index: 30 !important;
          background-color: var(--card-bg) !important;
          border-bottom: 2px solid var(--border-color) !important;
          /* Heavy duty leak prevention */
          box-shadow:
            0 -1px 0 0 var(--card-bg),
            0 2px 4px rgba(0, 0, 0, 0.3) !important;
          outline: 1px solid var(--card-bg);
          background-clip: padding-box;
        }

        :global(.sticky-col-1) {
          left: 0 !important;
          width: 45px;
          min-width: 45px;
        }
        :global(.sticky-col-2) {
          left: 45px !important;
          width: 45px;
          min-width: 45px;
        }
        :global(.sticky-col-3) {
          left: 90px !important;
          width: 120px;
          min-width: 120px;
          border-right: 2px solid rgba(0, 158, 217, 0.5) !important;
          box-shadow: 8px 0 15px -5px rgba(0, 0, 0, 0.5) !important;
        }

        /* Forced Light Mode overrides */
        :global(html[data-theme="light"] .sticky-col),
        :global(html[data-theme="light"] thead th) {
          background-color: #ffffff !important;
        }

        /* Sticky hover: must be SOLID but theme-aware */
        :global(.data-table tbody tr:hover .sticky-col) {
          background-image: linear-gradient(
            var(--active-bg),
            var(--active-bg)
          ) !important;
          background-color: var(--card-bg) !important;
          z-index: 11 !important;
        }

        /* Light mode specific adjustments for borders/shadows */
        :global(html[data-theme="light"]) .data-table th,
        :global(html[data-theme="light"]) .data-table td {
          border-bottom: 1px solid #e2e8f0;
        }
        :global(html[data-theme="light"]) .data-table thead th:nth-child(3),
        :global(html[data-theme="light"]) .data-table tbody td:nth-child(3) {
          border-right: 2px solid rgba(0, 158, 217, 0.15);
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
        }

        .row-num {
          color: var(--text-muted);
          font-size: 11px;
          width: 30px;
          text-align: center;
        }
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: block;
        }

        .cell-stack {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cell-main {
          font-weight: 500;
          color: var(--text-main);
          line-height: 1.2;
        }
        .cell-sub {
          font-size: 10px;
          color: var(--text-muted);
          line-height: 1.2;
        }

        .source-tag {
          font-size: 11px;
          color: var(--text-muted);
          max-width: 120px;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gender-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .gender-tag.male {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
        }
        .gender-tag.female {
          background: rgba(236, 72, 153, 0.12);
          color: #f472b6;
        }

        .duration-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 500;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
        }
        .source-tag,
        .province-tag {
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
          background: rgba(0, 158, 217, 0.1);
          color: #009ed9;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
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
        .screening-select.passed {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.4);
        }
        .screening-select.failed {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.4);
        }
        .screening-select.pending {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.4);
        }

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
          background: rgba(255, 255, 255, 0.05);
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
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--glass-bg);
          color: var(--text-main);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          border: 1px solid var(--border-color);
          transition: all 0.2s;
          white-space: nowrap;
          cursor: pointer;
        }
        .cv-btn:hover {
          background: rgba(0, 158, 217, 0.1);
          border-color: #009ed9;
          color: #009ed9;
        }

        .pic-tag {
          font-size: 11px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: var(--text-muted);
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pic-tag:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--primary-accent);
        }

        .pic-cell {
          position: relative;
          display: inline-block;
          z-index: 1;
        }

        .pic-history-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 5px;
          background-color: #111111 !important;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          padding: 12px;
          width: 320px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 1);
          z-index: 10000;
          display: block;
          pointer-events: auto;
        }

        .history-header {
          font-size: 11px;
          font-weight: 700;
          color: var(--primary-accent);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-right {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .clear-history-btn,
        .close-history-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clear-history-btn {
          color: #ff4d4d;
        }

        .clear-history-btn:hover {
          background: #ff4d4d;
          color: white;
          border-color: #ff4d4d;
        }

        .close-history-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-main);
        }

        .hst-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .hst-item:last-child {
          border-bottom: none;
        }

        .hst-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hst-time {
          font-size: 10px;
          font-family: monospace;
          color: var(--primary-accent);
          background: rgba(0, 158, 217, 0.1);
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
        }

        .hst-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-main);
        }

        .hst-action {
          font-size: 11px;
          color: var(--text-muted);
          margin-left: 0;
          padding-top: 2px;
        }

        .hst-latest {
          font-size: 8px;
          background: #27ae60;
          color: white;
          padding: 1px 4px;
          border-radius: 3px;
          margin-left: auto;
        }

        .loading-row,
        .empty-row {
          text-align: center;
          padding: 40px !important;
          color: var(--text-muted);
        }

        .cv-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 40px;
        }
        .cv-modal-content {
          width: 100%;
          max-width: 900px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }
        .cv-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-color);
          background: var(--glass-bg);
        }
        .cv-modal-header h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: var(--text-main);
        }
        .cv-modal-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .btn-close {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .btn-close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
        .cv-modal-body {
          flex: 1;
          padding: 0;
          background: #e2e8f0;
        }
        :global(.dark) .cv-modal-body,
        :root[data-theme="light"] .cv-modal-body {
          background: #0f172a;
        }
        .cv-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
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
          .btn-secondary,
          .btn-primary,
          .btn-reset {
            padding: 8px 12px;
            font-size: 13px;
            flex: 1;
            justify-content: center;
          }
          .action-group {
            gap: 8px;
          }
        }
        /* Chat Widget Styles */
        .chat-widget {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 10002;
          font-family: inherit;
        }

        .chat-toggle-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--primary-accent);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 50px;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 158, 217, 0.4);
          transition: all 0.3s ease;
          font-weight: 600;
        }

        .chat-toggle-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 158, 217, 0.6);
        }

        .chat-window {
          width: 350px;
          height: 500px;
          background: rgba(26, 26, 26, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .chat-header {
          padding: 15px 20px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #27ae60;
          border-radius: 50%;
          box-shadow: 0 0 10px #27ae60;
        }

        .header-title {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-main);
        }

        .back-btn {
          background: transparent;
          border: none;
          color: var(--text-main);
          cursor: pointer;
          padding: 5px;
          margin-right: 5px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* User List Styles (for Superadmin) */
        .chat-user-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .user-item {
          padding: 15px 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: background 0.2s;
        }

        .user-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary-accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 16px;
        }

        .user-info {
          flex: 1;
          overflow: hidden;
        }

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 2px;
        }

        .user-last-msg {
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-minimize {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 5px;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .chat-minimize:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .chat-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .chat-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          text-align: center;
          gap: 10px;
          padding: 40px;
          font-size: 13px;
        }

        .chat-bubble-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 80%;
        }

        .chat-bubble-wrapper.own {
          align-self: flex-end;
        }
        .chat-bubble-wrapper.other {
          align-self: flex-start;
        }

        .sender-name {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 4px;
          margin-left: 4px;
        }

        .chat-bubble {
          padding: 10px 14px;
          border-radius: 15px;
          font-size: 13px;
          line-height: 1.5;
        }

        .own .chat-bubble {
          background: var(--primary-accent);
          color: white;
          border-bottom-right-radius: 2px;
        }

        .other .chat-bubble {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-main);
          border-bottom-left-radius: 2px;
        }

        .chat-input-area {
          padding: 15px;
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          gap: 10px;
        }

        .chat-input-area input {
          flex: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 10px 15px;
          color: white;
          font-size: 13px;
          outline: none;
        }

        .chat-input-area input:focus {
          border-color: var(--primary-accent);
        }

        .send-btn {
          background: var(--primary-accent);
          color: white;
          border: none;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .send-btn:hover {
          transform: scale(1.05);
        }

        @media (max-width: 480px) {
          .chat-widget {
            bottom: 20px;
            right: 20px;
          }
          .chat-window {
            width: calc(100vw - 40px);
            height: 400px;
          }
        }
      `}</style>
      {/* Confirm Uncheck Modal */}
      {confirmModal && (
        <div
          className="confirm-modal-overlay"
          onClick={() => setConfirmModal(null)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Konfirmasi Pembatalan</h3>
            <p>
              Apakah Anda yakin ingin membatalkan centang pada data kandidat
              ini? Data ini tidak akan muncul lagi di filter "Terpilih".
            </p>
            <div className="confirm-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setConfirmModal(null)}
              >
                Batal
              </button>
              <button className="btn-confirm-delete" onClick={confirmUncheck}>
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete History Modal */}
      {deleteHistoryId && (
        <div
          className="confirm-modal-overlay"
          onClick={() => setDeleteHistoryId(null)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-icon-header"
              style={{ marginBottom: "16px", textAlign: "center" }}
            >
              <Trash2 size={40} color="#ff4d4d" />
            </div>
            <h3 style={{ textAlign: "center" }}>Hapus History Data</h3>
            <p style={{ textAlign: "center" }}>
              Apakah Anda yakin ingin menghapus seluruh history log aktivitas
              untuk data ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setDeleteHistoryId(null)}
              >
                Batal
              </button>
              <button className="btn-confirm-delete" onClick={clearHistory}>
                Ya, Hapus History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Update Modal */}
      {limitModal?.show && (
        <div
          className="confirm-modal-overlay"
          onClick={() => setLimitModal(null)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-icon-header"
              style={{ marginBottom: "16px", textAlign: "center" }}
            >
              <AlertTriangle size={40} color="#f59e0b" />
            </div>
            <h3 style={{ textAlign: "center" }}>Batas Update Tercapai</h3>
            <p style={{ textAlign: "center" }}>{limitModal.message}</p>
            <div
              className="confirm-modal-actions"
              style={{ justifyContent: "center" }}
            >
              <button
                className="btn-confirm-delete"
                style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
                onClick={() => setLimitModal(null)}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Selection Modal */}
      {showNoSelectionModal && (
        <div
          className="confirm-modal-overlay"
          onClick={() => setShowNoSelectionModal(false)}
        >
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="modal-icon-header"
              style={{ marginBottom: "16px", textAlign: "center" }}
            >
              <AlertTriangle size={40} color="#f59e0b" />
            </div>
            <h3 style={{ textAlign: "center" }}>Peringatan</h3>
            <p style={{ textAlign: "center" }}>
              Tidak ada data yang dipilih. Silakan centang data pada tabel
              terlebih dahulu untuk mengekspor data tertentu.
            </p>
            <div
              className="confirm-modal-actions"
              style={{ justifyContent: "center" }}
            >
              <button
                className="btn-confirm-delete"
                style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
                onClick={() => setShowNoSelectionModal(false)}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Floating Chat Widget */}
      <div className={`chat-widget ${isChatOpen ? "open" : "closed"}`}>
        {isChatOpen ? (
          <div className="chat-window">
            <div className="chat-header">
              <div className="header-info">
                {isSuperAdmin && selectedChatUser && (
                  <button
                    className="back-btn"
                    onClick={() => setSelectedChatUser(null)}
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div className="status-dot"></div>
                <span className="header-title">
                  {isSuperAdmin
                    ? selectedChatUser
                      ? `Chat dengan ${selectedChatUser}`
                      : "Daftar Chat PIC"
                    : "Chat dengan Superadmin"}
                </span>
              </div>
              <button
                className="chat-minimize"
                onClick={() => setIsChatOpen(false)}
              >
                <Minimize2 size={18} />
              </button>
            </div>

            {isSuperAdmin && !selectedChatUser ? (
              // SUPERADMIN USER LIST VIEW
              <div className="chat-user-list">
                {chatUsers.length === 0 ? (
                  <div className="chat-empty">
                    <MessageSquare size={32} />
                    <p>Belum ada chat masuk dari PIC.</p>
                  </div>
                ) : (
                  chatUsers.map((u, i) => {
                    const lastMsg = messages
                      .filter((m) => m.sender === u || m.receiver === u)
                      .pop();
                    return (
                      <div
                        key={i}
                        className="user-item"
                        onClick={() => setSelectedChatUser(u)}
                      >
                        <div className="user-avatar">
                          {u.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                          <div className="user-name">{u}</div>
                          <div className="user-last-msg">
                            {lastMsg?.content || "..."}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // MESSAGE THREAD VIEW
              <>
                <div className="chat-body">
                  {filteredMessages.length === 0 ? (
                    <div className="chat-empty">
                      <MessageSquare size={32} />
                      <p>
                        {isSuperAdmin
                          ? `Belum ada pesan dengan ${selectedChatUser}.`
                          : "Halo! Ada yang bisa Superadmin bantu?"}
                      </p>
                    </div>
                  ) : (
                    filteredMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`chat-bubble-wrapper ${msg.sender === (user?.username || "Guest") ? "own" : "other"}`}
                      >
                        <div className="sender-name">{msg.sender}</div>
                        <div className="chat-bubble">{msg.content}</div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={sendMessage}>
                  <input
                    type="text"
                    placeholder="Tulis pesan..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                  />
                  <button type="submit" className="send-btn">
                    <Send size={18} />
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <button
            className="chat-toggle-btn"
            onClick={() => setIsChatOpen(true)}
          >
            <MessageSquare size={24} />
            <span className="toggle-label">Bantuan</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RevofifPage;
