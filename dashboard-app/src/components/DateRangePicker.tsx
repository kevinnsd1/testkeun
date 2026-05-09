"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    format, parseISO, isValid,
    startOfMonth, endOfMonth,
    startOfWeek, endOfWeek,
    eachDayOfInterval,
    isSameDay, isSameMonth, isToday,
    isWithinInterval, startOfDay,
    addMonths, subMonths,
} from 'date-fns';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onChange: (start: string, end: string) => void;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const C = {
    teal: 'var(--active-blue)',
    tealBg: 'var(--active-bg)',
    tealBgLight: 'rgba(79, 142, 247, 0.08)',
    tealGlow: '0 0 16px rgba(0, 158, 217, 0.3)',
    tealBorder: 'var(--active-blue)',
    popBg: 'var(--card-bg)',
    headerBg: 'var(--glass-bg)',
    footerBg: 'var(--glass-bg)',
    border: 'var(--border-color)',
    hoverBg: 'var(--active-bg)',
    mutedText: 'var(--text-muted)',
    dimText: 'var(--text-muted)',
    stripBg: 'var(--active-bg)',
};

const parseSafe = (s: string) => {
    if (!s) return null;
    const d = parseISO(s);
    return isValid(d) ? d : null;
};

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempStart, setTempStart] = useState<Date | null>(null);
    const [tempEnd, setTempEnd] = useState<Date | null>(null);
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [phase, setPhase] = useState(0);

    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleOpen = () => {
        const s = parseSafe(startDate);
        const e = parseSafe(endDate);
        setTempStart(s);
        setTempEnd(e);
        setPhase(s && (!e || isSameDay(s, e)) ? 1 : 0);
        setCurrentMonth(s || new Date());
        setHoveredDate(null);
        setIsOpen(true);
    };

    useEffect(() => {
        if (!isOpen) return;
        const onOutside = (ev: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(ev.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(ev.target as Node)
            ) setIsOpen(false);
        };
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, [isOpen]);

    const handleDayClick = (day: Date) => {
        if (phase === 0) {
            setTempStart(day); setTempEnd(null); setPhase(1);
        } else {
            if (tempStart && day < tempStart) {
                setTempStart(day); setTempEnd(null);
            } else if (tempStart && isSameDay(day, tempStart)) {
                setTempEnd(null); setPhase(0);
            } else {
                setTempEnd(day); setPhase(0);
            }
        }
    };

    const handleApply = () => {
        if (!tempStart) return;
        onChange(
            format(tempStart, 'yyyy-MM-dd'),
            tempEnd ? format(tempEnd, 'yyyy-MM-dd') : format(tempStart, 'yyyy-MM-dd'),
        );
        setIsOpen(false);
    };

    const handleClear = (ev: React.MouseEvent) => {
        ev.stopPropagation();
        onChange('', '');
        setIsOpen(false);
    };

    /* canonical range — always rangeS ≤ rangeE */
    const effectiveEnd = tempEnd ?? (phase === 1 ? hoveredDate : null);
    const rangeS = tempStart && effectiveEnd
        ? (tempStart <= effectiveEnd ? tempStart : effectiveEnd)
        : tempStart;
    const rangeE = tempStart && effectiveEnd
        ? (tempStart <= effectiveEnd ? effectiveEnd : tempStart)
        : null;

    const inRange = (d: Date) =>
        rangeS && rangeE
            ? isWithinInterval(startOfDay(d), { start: startOfDay(rangeS), end: startOfDay(rangeE) })
            : false;

    const isStartDay = (d: Date) => !!(rangeS && isSameDay(d, rangeS));
    const isEndDay = (d: Date) => !!(rangeE && isSameDay(d, rangeE));

    const calDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 }),
    });

    const triggerLabel = () => {
        if (!startDate) return 'Semua Tanggal';
        const s = format(parseISO(startDate), 'dd MMM yyyy');
        if (!endDate || startDate === endDate) return s;
        return `${s} – ${format(parseISO(endDate), 'dd MMM yyyy')}`;
    };

    const hasValue = Boolean(startDate);

    /* ── hover helpers for chevron buttons ── */
    const [prevHov, setPrevHov] = useState(false);
    const [nextHov, setNextHov] = useState(false);

    return (
        <div style={{ position: 'relative', width: '100%' }}>

            {/* ═══════════════════════════════════════════
                TRIGGER BUTTON
            ════════════════════════════════════════════ */}
            <button
                ref={triggerRef}
                onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${hasValue ? C.tealBorder : C.border}`,
                    background: hasValue ? C.tealBg : 'var(--glass-bg)',
                    color: hasValue ? C.teal : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    outline: 'none',
                    textAlign: 'left',
                }}
            >
                <Calendar size={12} style={{ color: hasValue ? C.teal : 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {triggerLabel()}
                </span>
                {hasValue && (
                    <span
                        role="button"
                        onClick={handleClear}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 14, height: 14,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.10)',
                            color: 'rgba(255,255,255,0.45)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.tealBg)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                    >
                        <X size={8} />
                    </span>
                )}
            </button>

            {/* ═══════════════════════════════════════════
                POPOVER CALENDAR
            ════════════════════════════════════════════ */}
            {isOpen && (
                <div
                    ref={popoverRef}
                    className="drp-pop"
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 'calc(100% + 6px)',
                        zIndex: 400,
                        width: '272px',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: `1px solid ${C.border}`,
                        background: C.popBg,
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        boxShadow: 'var(--card-shadow)',
                    }}
                >
                    {/* ── Month Navigation ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderBottom: `1px solid ${C.border}`,
                        background: C.headerBg,
                    }}>
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            onMouseEnter={() => setPrevHov(true)}
                            onMouseLeave={() => setPrevHov(false)}
                            style={{
                                padding: '4px 6px', borderRadius: '6px', border: 'none',
                                background: prevHov ? C.hoverBg : 'transparent',
                                color: prevHov ? 'var(--text-main)' : C.mutedText,
                                cursor: 'pointer', transition: 'all 0.15s', display: 'flex',
                            }}
                        >
                            <ChevronLeft size={14} />
                        </button>

                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                            {BULAN[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>

                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            onMouseEnter={() => setNextHov(true)}
                            onMouseLeave={() => setNextHov(false)}
                            style={{
                                padding: '4px 6px', borderRadius: '6px', border: 'none',
                                background: nextHov ? C.hoverBg : 'transparent',
                                color: nextHov ? 'var(--text-main)' : C.mutedText,
                                cursor: 'pointer', transition: 'all 0.15s', display: 'flex',
                            }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* ── Calendar Body ── */}
                    <div style={{ padding: '10px 10px 6px' }}>

                        {/* Day-of-week headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: '4px' }}>
                            {HARI.map(h => (
                                <div key={h} style={{
                                    textAlign: 'center', fontSize: '9px', fontWeight: 700,
                                    color: C.mutedText, padding: '2px 0', letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}>
                                    {h}
                                </div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                            {calDays.map((day, i) => {
                                const inCurrent = isSameMonth(day, currentMonth);
                                const sel_start = isStartDay(day);
                                const sel_end = isEndDay(day);
                                const inRng = inRange(day);
                                const todayDay = isToday(day);
                                const selected = sel_start || sel_end;
                                const single = sel_start && sel_end;

                                const showStrip = inRng && inCurrent && !single;
                                const stripL = sel_start ? '50%' : '0%';
                                const stripR = sel_end ? '50%' : '0%';

                                return (
                                    <DayCell
                                        key={i}
                                        day={day}
                                        inCurrent={inCurrent}
                                        selected={selected}
                                        single={single}
                                        inRng={inRng}
                                        todayDay={todayDay}
                                        showStrip={showStrip}
                                        stripL={stripL}
                                        stripR={stripR}
                                        onClick={() => inCurrent && handleDayClick(day)}
                                        onEnter={() => phase === 1 && setHoveredDate(day)}
                                        onLeave={() => phase === 1 && setHoveredDate(null)}
                                        C={C}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Phase hint ── */}
                    {phase === 1 && (
                        <div style={{
                            textAlign: 'center', fontSize: '10px', fontWeight: 500,
                            color: 'rgba(46,196,182,0.55)', paddingBottom: '4px',
                        }}>
                            Pilih tanggal akhir
                        </div>
                    )}

                    {/* ── Footer ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderTop: `1px solid ${C.border}`,
                        background: C.footerBg,
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: C.dimText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Rentang
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 500, color: tempStart ? 'var(--text-main)' : C.mutedText }}>
                                {tempStart
                                    ? (tempEnd && !isSameDay(tempStart, tempEnd)
                                        ? `${format(tempStart, 'dd MMM')} – ${format(tempEnd, 'dd MMM')}`
                                        : format(tempStart, 'dd MMM yyyy'))
                                    : 'Pilih tanggal...'}
                            </span>
                        </div>

                        <ApplyButton active={!!tempStart} onClick={handleApply} C={C} />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes drp-open {
                    from { opacity:0; transform:translateY(-8px) scale(0.96); }
                    to   { opacity:1; transform:translateY(0)    scale(1);    }
                }
                .drp-pop {
                    animation: drp-open 0.2s cubic-bezier(0.16,1,0.3,1) forwards;
                }
            `}</style>
        </div>
    );
};

/* ─── Sub-components to keep hover state cleanly ─────────────────────── */

interface DayCellProps {
    day: Date;
    inCurrent: boolean;
    selected: boolean;
    single: boolean;
    inRng: boolean;
    todayDay: boolean;
    showStrip: boolean;
    stripL: string;
    stripR: string;
    onClick: () => void;
    onEnter: () => void;
    onLeave: () => void;
    C: typeof C;
}

const DayCell: React.FC<DayCellProps> = ({
    day, inCurrent, selected, single, inRng, todayDay,
    showStrip, stripL, stripR, onClick, onEnter, onLeave, C,
}) => {
    const [hov, setHov] = useState(false);

    let circleStyle: React.CSSProperties = {
        position: 'relative', zIndex: 1,
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '50%',
        fontSize: '11px',
        fontWeight: selected ? 700 : inRng && inCurrent ? 500 : 400,
        transition: 'background 0.12s, box-shadow 0.12s',
        userSelect: 'none',
    };

    if (selected) {
        circleStyle.background = C.teal;
        circleStyle.color = '#0c1118';
        circleStyle.boxShadow = C.tealGlow;
    } else if (hov && inCurrent) {
        circleStyle.background = inRng ? 'var(--active-bg)' : 'var(--glass-bg)';
        circleStyle.color = 'var(--text-main)';
    } else if (inRng && inCurrent) {
        circleStyle.color = 'rgba(46,196,182,0.90)';
    } else if (todayDay && inCurrent) {
        circleStyle.color = C.teal;
        circleStyle.boxShadow = `0 0 0 1px rgba(46,196,182,0.35)`;
    } else if (inCurrent) {
        circleStyle.color = 'var(--text-muted)';
    } else {
        circleStyle.color = 'var(--text-muted)';
    }

    return (
        <div
            style={{
                position: 'relative',
                height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: inCurrent ? 'pointer' : 'default',
            }}
            onClick={onClick}
            onMouseEnter={() => { setHov(true); onEnter(); }}
            onMouseLeave={() => { setHov(false); onLeave(); }}
        >
            {/* seamless range strip */}
            {showStrip && (
                <div style={{
                    position: 'absolute',
                    top: 4, bottom: 4,
                    left: stripL, right: stripR,
                    background: C.stripBg,
                    pointerEvents: 'none',
                }} />
            )}

            <span style={circleStyle}>
                {format(day, 'd')}
            </span>
        </div>
    );
};

interface ApplyButtonProps {
    active: boolean;
    onClick: () => void;
    C: typeof C;
}
const ApplyButton: React.FC<ApplyButtonProps> = ({ active, onClick, C }) => {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={active ? onClick : undefined}
            onMouseEnter={() => active && setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                padding: '6px 14px',
                borderRadius: '7px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 700,
                cursor: active ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                background: active
                    ? (hov ? 'var(--secondary-accent)' : C.teal)
                    : 'var(--glass-bg)',
                color: active ? '#fff' : 'var(--text-muted)',
                boxShadow: active ? '0 0 18px rgba(46,196,182,0.28)' : 'none',
                transform: hov && active ? 'translateY(-1px)' : 'none',
            }}
        >
            Terapkan
        </button>
    );
};

export default DateRangePicker;
