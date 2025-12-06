export function isWeekend(date: Date) {
  const d = date.getDay();
  return d === 0 || d === 6; // Sunday or Saturday
}

export function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(year, month, day);
}

export function lastWeekdayOfMonth(year: number, month: number, weekday: number) {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month + 1, 0 - offset);
}

// Compute Western (Gregorian) Easter Sunday for a given year (Anonymous Gregorian algorithm)
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0=Jan
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

export function goodFriday(year: number) {
  const easter = easterSunday(year);
  const gf = new Date(easter);
  gf.setDate(easter.getDate() - 2);
  return gf;
}

function observed(date: Date) {
  const dow = date.getDay();
  if (dow === 6) { // Saturday
    const fri = new Date(date);
    fri.setDate(date.getDate() - 1);
    return fri;
  }
  if (dow === 0) { // Sunday
    const mon = new Date(date);
    mon.setDate(date.getDate() + 1);
    return mon;
  }
  return date;
}

// Approximate list of regular US market holidays
export function usMarketHolidays(year: number): Date[] {
  const holidays: Date[] = [];
  // New Year's Day (observed)
  holidays.push(observed(new Date(year, 0, 1)));
  // Martin Luther King Jr. Day (3rd Monday of Jan)
  holidays.push(nthWeekdayOfMonth(year, 0, 1, 3));
  // Presidents' Day (3rd Monday of Feb)
  holidays.push(nthWeekdayOfMonth(year, 1, 1, 3));
  // Good Friday
  holidays.push(goodFriday(year));
  // Memorial Day (last Monday of May)
  holidays.push(lastWeekdayOfMonth(year, 4, 1));
  // Juneteenth (observed)
  holidays.push(observed(new Date(year, 5, 19)));
  // Independence Day (observed)
  holidays.push(observed(new Date(year, 6, 4)));
  // Labor Day (1st Monday of Sep)
  holidays.push(nthWeekdayOfMonth(year, 8, 1, 1));
  // Thanksgiving (4th Thursday of Nov)
  holidays.push(nthWeekdayOfMonth(year, 10, 4, 4));
  // Christmas Day (observed)
  holidays.push(observed(new Date(year, 11, 25)));
  return holidays.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function isUsMarketHoliday(date: Date) {
  const y = date.getFullYear();
  const list = usMarketHolidays(y);
  return list.some((d) => d.getFullYear() === y && d.getMonth() === date.getMonth() && d.getDate() === date.getDate());
}

export function usMarketHolidayMap(year: number): Record<string, { name: string; type: "HOLIDAY" | "EARLY_CLOSE" }> {
  const m = new Map<string, { name: string; type: "HOLIDAY" | "EARLY_CLOSE" }>();
  const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addH = (d: Date, name: string) => m.set(keyOf(d), { name, type: "HOLIDAY" });
  const addE = (d: Date, name: string) => m.set(keyOf(d), { name, type: "EARLY_CLOSE" });

  addH(observed(new Date(year, 0, 1)), "New Year's Day (observed)");
  addH(nthWeekdayOfMonth(year, 0, 1, 3), "Martin Luther King Jr. Day");
  addH(nthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day");
  addH(goodFriday(year), "Good Friday");
  addH(lastWeekdayOfMonth(year, 4, 1), "Memorial Day");
  addH(observed(new Date(year, 5, 19)), "Juneteenth (observed)");
  const indepObserved = observed(new Date(year, 6, 4));
  addH(indepObserved, "Independence Day (observed)");
  addH(nthWeekdayOfMonth(year, 8, 1, 1), "Labor Day");
  addH(nthWeekdayOfMonth(year, 10, 4, 4), "Thanksgiving");
  // Day after Thanksgiving often early close
  const thanksgiving = nthWeekdayOfMonth(year, 10, 4, 4);
  const dayAfter = new Date(thanksgiving); dayAfter.setDate(thanksgiving.getDate() + 1);
  if (dayAfter.getDay() >= 1 && dayAfter.getDay() <= 5) addE(dayAfter, "Day after Thanksgiving (early close)");
  // Christmas
  addH(observed(new Date(year, 11, 25)), "Christmas (observed)");
  // Christmas Eve early close when weekday and not observed holiday
  const xmasEve = new Date(year, 11, 24);
  if (xmasEve.getDay() >= 1 && xmasEve.getDay() <= 5 && keyOf(xmasEve) !== keyOf(observed(new Date(year, 11, 25)))) {
    addE(xmasEve, "Christmas Eve (early close)");
  }
  // July 3 early close if weekday and not the observed holiday
  const july3 = new Date(year, 6, 3);
  if (july3.getDay() >= 1 && july3.getDay() <= 5 && keyOf(july3) !== keyOf(indepObserved)) {
    addE(july3, "July 3 (early close)");
  }
  return Object.fromEntries(m.entries());
}

export function holidayName(date: Date): string | null {
  const map = usMarketHolidayMap(date.getFullYear());
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return map[key]?.name ?? null;
}
