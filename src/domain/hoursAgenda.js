// The hours calendar on a phone: a month grid seven columns wide leaves ~50 px per day,
// a project name shows 5 or 6 letters. Below the grid the month is listed by week and
// day, one full-width line per entry (DedicationInput.vue).
import moment from "moment";

const dayKey = date =>
  typeof date === "string" ? date.slice(0, 10) : moment(date).format("YYYY-MM-DD");

// attributes: the calendar's v-calendar attributes (activities, holidays, iCal events not
// imported yet). Hours count as in the grid: pending iCal events apart.
export function hoursAgenda(attributes) {
  const days = new Map();
  for (const attr of attributes || []) {
    const data = attr && attr.customData;
    if (!data || attr.dates == null) continue;
    const date = dayKey(attr.dates);
    if (!days.has(date)) days.set(date, { date, hours: 0, pending: 0, entries: [] });
    const day = days.get(date);
    const hours = Number(data.hours) || 0;
    if (data.pending) day.pending += hours;
    else day.hours += hours;
    day.entries.push({
      key: attr.key,
      type: data.type,
      project: data.project || "",
      username: data.username || "",
      hours,
      color: data.bg_project,
      pending: !!data.pending,
      attr
    });
  }

  const weeks = [];
  for (const day of [...days.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const m = moment(day.date, "YYYY-MM-DD");
    const key = `${m.isoWeekYear()}-${m.isoWeek()}`;
    let week = weeks[weeks.length - 1];
    if (!week || week.key !== key) {
      week = { key, week: m.isoWeek(), hours: 0, days: [] };
      weeks.push(week);
    }
    week.hours += day.hours;
    week.days.push(day);
  }
  return weeks;
}
