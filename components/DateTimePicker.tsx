'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, X, Check } from 'lucide-react';

interface DateTimePickerProps {
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function parseValue(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

function formatDisplay(value: string) {
  const p = parseValue(value);
  if (!p) return '未設定';
  return `${p.year}/${pad(p.month)}/${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function DateTimePicker({ label, value, onChange, icon }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const now = new Date();

  const initial = parseValue(value) ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  // Sync state when value prop changes externally
  useEffect(() => {
    const p = parseValue(value);
    if (p) {
      setYear(p.year);
      setMonth(p.month);
      setDay(p.day);
      setHour(p.hour);
      setMinute(p.minute);
    }
  }, [value]);

  // Clamp day when month/year changes
  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) setDay(maxDay);
  }, [year, month, day]);

  const handleOpen = () => {
    // reset to current value when opening
    const p = parseValue(value);
    const base = p ?? {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
    setYear(base.year);
    setMonth(base.month);
    setDay(base.day);
    setHour(base.hour);
    setMinute(base.minute);
    setOpen(true);
  };

  const handleConfirm = () => {
    const clampedDay = Math.min(day, daysInMonth(year, month));
    const iso = `${year}-${pad(month)}-${pad(clampedDay)}T${pad(hour)}:${pad(minute)}`;
    onChange(iso);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const dayOptions = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const selectStyle: React.CSSProperties = {
    padding: '0.4rem 0.5rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--secondary)',
    color: 'var(--foreground)',
    fontSize: '1rem',
    cursor: 'pointer',
    appearance: 'none' as any,
    WebkitAppearance: 'none',
    textAlign: 'center',
  };

  const isSet = !!value;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.2rem 0.55rem', borderRadius: '6px',
          border: '1px solid var(--border)',
          background: isSet ? 'var(--primary)' : 'var(--secondary)',
          color: isSet ? 'white' : 'var(--foreground)',
          fontSize: '0.72rem', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        {icon ?? <Clock size={12} />}
        <span style={{ fontWeight: isSet ? 600 : 400 }}>
          {label}：{formatDisplay(value)}
        </span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'var(--card, #1e293b)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.75rem',
            minWidth: '320px',
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Calendar size={16} style={{ color: 'var(--primary)' }} />
                設定{label}
              </span>
              <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', opacity: 0.5 }}>
                <X size={18} />
              </button>
            </div>

            {/* Date row */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={12} /> 日期
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, width: '80px' }}>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span style={{ opacity: 0.5 }}>年</span>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, width: '60px' }}>
                  {monthOptions.map(m => <option key={m} value={m}>{pad(m)}</option>)}
                </select>
                <span style={{ opacity: 0.5 }}>月</span>
                <select value={day} onChange={e => setDay(Number(e.target.value))} style={{ ...selectStyle, width: '60px' }}>
                  {dayOptions.map(d => <option key={d} value={d}>{pad(d)}</option>)}
                </select>
                <span style={{ opacity: 0.5 }}>日</span>
              </div>
            </div>

            {/* Time row */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={12} /> 時間
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <select value={hour} onChange={e => setHour(Number(e.target.value))} style={{ ...selectStyle, width: '70px' }}>
                  {hourOptions.map(h => <option key={h} value={h}>{pad(h)}</option>)}
                </select>
                <span style={{ opacity: 0.5, fontSize: '1.2rem', fontWeight: 700 }}>:</span>
                <select value={minute} onChange={e => setMinute(Number(e.target.value))} style={{ ...selectStyle, width: '70px' }}>
                  {minuteOptions.map(m => <option key={m} value={m}>{pad(m)}</option>)}
                </select>
              </div>
            </div>

            {/* Preview */}
            <div style={{ background: 'var(--primary)', borderRadius: '8px', padding: '0.6rem 1rem', marginBottom: '1.25rem', textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
              {year}/{pad(month)}/{pad(Math.min(day, daysInMonth(year, month)))} {pad(hour)}:{pad(minute)}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={handleClear}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', opacity: 0.7, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                清除
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{ flex: 2, padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Check size={15} /> 確認設定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
