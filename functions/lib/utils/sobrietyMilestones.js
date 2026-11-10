"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSobrietyMilestoneSlug = getSobrietyMilestoneSlug;
const MILESTONES = [
    ["24-hours", 24, "hours"],
    ["2-days", 2, "days"],
    ["3-days", 3, "days"],
    ["4-days", 4, "days"],
    ["5-days", 5, "days"],
    ["6-days", 6, "days"],
    ["7-days", 7, "days"],
    ["1-week", 1, "WEEK"],
    ["8-days", 8, "days"],
    ["9-days", 9, "days"],
    ["10-days", 10, "days"],
    ["11-days", 11, "days"],
    ["12-days", 12, "days"],
    ["13-days", 13, "days"],
    ["14-days", 14, "days"],
    ["2-weeks", 2, "weeks"],
    ["3-weeks", 3, "weeks"],
    ["30-days", 30, "days"],
    ["4-weeks", 4, "weeks"],
    ["1-month", 1, "month"],
    ["5-weeks", 5, "weeks"],
    ["6-weeks", 6, "weeks"],
    ["7-weeks", 7, "weeks"],
    ["8-weeks", 8, "weeks"],
    ["9-weeks", 9, "weeks"],
    ["60-days", 60, "days"],
    ["10-weeks", 10, "weeks"],
    ["11-weeks", 11, "weeks"],
    ["12-weeks", 12, "weeks"],
    ["90-days", 90, "days"],
    ["2-months", 2, "months"],
    ["3-months", 3, "months"],
    ["4-months", 4, "months"],
    ["5-months", 5, "months"],
    ["6-months", 6, "months"],
    ["7-months", 7, "months"],
    ["8-months", 8, "months"],
    ["9-months", 9, "months"],
    ["10-months", 10, "months"],
    ["11-months", 11, "months"],
    ["12-months", 12, "months"],
    ["1-year", 1, "year"],
    ["5-years", 5, "years"],
    ["10-years", 10, "years"],
    ["15-years", 15, "years"],
    ["20-years", 20, "years"],
    ["25-years", 25, "years"],
    ["30-years", 30, "years"],
    ["35-years", 35, "years"],
    ["40-years", 40, "years"],
    ["45-years", 45, "years"],
    ["50-years", 50, "years"],
];
const DAY_MS = 24 * 60 * 60 * 1000;
function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match)
        return null;
    const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return dateKey(time) === value ? time : null;
}
function dateKey(time) {
    return new Date(time).toISOString().slice(0, 10);
}
function addMonths(time, months) {
    const date = new Date(time);
    const sourceDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(sourceDay, lastDay));
    return date.getTime();
}
function milestoneTime(start, number, unit) {
    const normalized = unit.toLowerCase();
    if (normalized.includes("year"))
        return addMonths(start, number * 12);
    if (normalized.includes("month"))
        return addMonths(start, number);
    if (normalized.includes("week"))
        return start + number * 7 * DAY_MS;
    return (start +
        (normalized.includes("hour") ? Math.ceil(number / 24) : number) * DAY_MS);
}
function getSobrietyMilestoneSlug(sobrietyDate, currentDate) {
    if (!sobrietyDate)
        return null;
    const start = parseDate(sobrietyDate);
    if (start === null)
        return null;
    const currentKey = dateKey(currentDate.getTime());
    let match = null;
    for (const [slug, number, unit] of MILESTONES) {
        if (dateKey(milestoneTime(start, number, unit)) === currentKey)
            match = slug;
    }
    return match;
}
