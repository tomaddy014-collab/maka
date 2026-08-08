export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const SLOTS = ["Breakfast", "Lunch", "Dinner"];

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function currentWeekKey() {
  return toKey(mondayOf(new Date()));
}

export function addWeeks(weekKey, count) {
  const d = fromKey(weekKey);
  d.setDate(d.getDate() + count * 7);
  return toKey(d);
}

export function weekDateRangeLabel(weekKey) {
  const start = fromKey(weekKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString(
    "en-US",
    sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" },
  );
  return `${startStr}–${endStr}, ${end.getFullYear()}`;
}

export function dayDateLabel(weekKey, dayName) {
  const idx = DAYS.indexOf(dayName);
  const d = fromKey(weekKey);
  d.setDate(d.getDate() + idx);
  return d.getDate();
}

export function isCurrentWeek(weekKey) {
  return weekKey === currentWeekKey();
}
