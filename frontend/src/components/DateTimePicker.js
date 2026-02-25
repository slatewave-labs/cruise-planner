import React, { useState, useEffect } from 'react';

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/**
 * Snap a raw minute value (0–59) to the nearest 5-minute mark.
 * Ties round down (e.g. 7 → 5, 8 → 10).
 */
function snapMinute(raw) {
  const n = Math.max(0, Math.min(59, parseInt(raw, 10) || 0));
  return MINUTES.reduce((prev, curr) =>
    Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev
  );
}

/**
 * Parse a "YYYY-MM-DDTHH:mm" string into its parts.
 * Returns safe defaults when the value is empty.
 */
function parseValue(value) {
  if (!value) return { date: '', hour: '08', minute: '00' };
  const [datePart = '', timePart = '08:00'] = value.split('T');
  const [rawHour = '08', rawMinute = '00'] = timePart.split(':');
  const hour = String(Math.min(23, Math.max(0, parseInt(rawHour, 10) || 0))).padStart(2, '0');
  const minute = String(snapMinute(rawMinute)).padStart(2, '0');
  return { date: datePart, hour, minute };
}

/**
 * Custom cross-browser date+time picker.
 *
 * - Uses a native <input type="date"> for the date (consistent on all browsers/mobile).
 * - Provides <select> dropdowns for hours (00–23) and minutes (00, 05, 10 … 55).
 * - Minutes are restricted to 5-minute intervals only.
 * - Accepts an optional `minValue` ("YYYY-MM-DDTHH:mm") which sets the date input's
 *   `min` attribute so past dates are not selectable.
 *
 * Props:
 *   value      – controlled value in "YYYY-MM-DDTHH:mm" format (or empty string)
 *   onChange   – callback(newValue: string) where newValue is "YYYY-MM-DDTHH:mm" or ""
 *   minValue   – optional minimum datetime string (used as date `min` attribute)
 *   data-testid – forwarded to the wrapper <div>
 *   className  – extra classes for the wrapper
 */
export default function DateTimePicker({
  value,
  onChange,
  minValue,
  'data-testid': testId,
  className,
}) {
  const parsed = parseValue(value);
  const [date, setDate] = useState(parsed.date);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);

  // Sync internal state whenever the controlled value changes from outside.
  useEffect(() => {
    const p = parseValue(value);
    setDate(p.date);
    setHour(p.hour);
    setMinute(p.minute);
  }, [value]);

  // Only the date portion is used for the native input's min attribute.
  const minDateStr = minValue ? minValue.split('T')[0] : undefined;

  const emitChange = (d, h, m) => {
    onChange(d ? `${d}T${h}:${m}` : '');
  };

  return (
    <div
      data-testid={testId}
      className={`flex gap-1.5 items-center flex-wrap ${className || ''}`}
    >
      <input
        type="date"
        value={date}
        min={minDateStr}
        onChange={(e) => {
          setDate(e.target.value);
          emitChange(e.target.value, hour, minute);
        }}
        className="flex-1 h-12 rounded-xl bg-white border border-stone-200 px-3 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition min-w-0"
        data-testid={testId ? `${testId}-date` : undefined}
      />
      <div className="flex items-center gap-1">
        <select
          value={hour}
          onChange={(e) => {
            setHour(e.target.value);
            emitChange(date, e.target.value, minute);
          }}
          className="h-12 rounded-xl bg-white border border-stone-200 px-2 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
          data-testid={testId ? `${testId}-hour` : undefined}
          aria-label="Hour"
        >
          {Array.from({ length: 24 }, (_, i) => {
            const v = String(i).padStart(2, '0');
            return <option key={v} value={v}>{v}</option>;
          })}
        </select>
        <span className="text-stone-400 font-bold select-none px-0.5" aria-hidden="true">:</span>
        <select
          value={minute}
          onChange={(e) => {
            setMinute(e.target.value);
            emitChange(date, hour, e.target.value);
          }}
          className="h-12 rounded-xl bg-white border border-stone-200 px-2 text-base focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
          data-testid={testId ? `${testId}-minute` : undefined}
          aria-label="Minute"
        >
          {MINUTES.map((m) => {
            const v = String(m).padStart(2, '0');
            return <option key={v} value={v}>{v}</option>;
          })}
        </select>
      </div>
    </div>
  );
}
