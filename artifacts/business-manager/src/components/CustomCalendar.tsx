import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface CustomCalendarProps {
  value?: string;
  onChange: (date: string) => void;
  disableFuture?: boolean;
  label?: string;
  placeholder?: string;
}

export default function CustomCalendar({
  value,
  onChange,
  disableFuture = false,
  label,
  placeholder = "Select date",
}: CustomCalendarProps) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const CALENDAR_WIDTH = 288;
      setAlignRight(rect.left + CALENDAR_WIDTH > window.innerWidth - 8);
    }
  }, [open]);

  const parseDate = (v?: string) => {
    if (!v) return null;
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const isDisabled = (day: number) => {
    if (!disableFuture) return false;
    const d = new Date(viewYear, viewMonth, day);
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d > t;
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    return selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day;
  };

  const isToday = (day: number) => {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const formatDisplay = () => {
    if (!selected) return "";
    return `${getOrdinal(selected.getDate())} ${MONTHS[selected.getMonth()]} ${selected.getFullYear()}`;
  };

  const handleSelect = (day: number) => {
    if (isDisabled(day)) return;
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  const cells = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer hover:border-primary/50 transition-colors"
        data-testid="calendar-trigger"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? formatDisplay() : placeholder}
        </span>
        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {open && (
        <div className={`absolute top-full mt-1 z-[200] bg-popover border border-popover-border rounded-xl shadow-xl p-3 w-72 ${alignRight ? "right-0" : "left-0"}`}>
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-accent text-foreground cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-accent text-foreground cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => (
              <div key={i} className="aspect-square">
                {day !== null && (
                  <button
                    type="button"
                    onClick={() => handleSelect(day)}
                    disabled={isDisabled(day)}
                    className={`
                      w-full h-full text-xs rounded-lg flex items-center justify-center transition-colors
                      ${isDisabled(day) ? "text-muted-foreground/40 cursor-not-allowed" : "cursor-pointer hover:bg-accent text-foreground"}
                      ${isSelected(day) ? "bg-primary text-primary-foreground hover:bg-primary" : ""}
                      ${isToday(day) && !isSelected(day) ? "border border-primary text-primary font-semibold" : ""}
                    `}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-border flex justify-between">
            <button
              type="button"
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                const m = String(today.getMonth() + 1).padStart(2, "0");
                const d = String(today.getDate()).padStart(2, "0");
                onChange(`${today.getFullYear()}-${m}-${d}`);
                setOpen(false);
              }}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
