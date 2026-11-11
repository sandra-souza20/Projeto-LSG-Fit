// "Hoje" no fuso da academia (APP_TIMEZONE, padrao America/Sao_Paulo), para a
// regra de um treino por dia nao depender do fuso do servidor (UTC).
export const APP_TIMEZONE = process.env["APP_TIMEZONE"]?.trim() || "America/Sao_Paulo";

/** Data (aaaa-mm-dd) de um instante no fuso do app. */
export function dayKey(date: Date, timeZone = APP_TIMEZONE): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Diferenca (ms) entre o horario local do fuso e o UTC, num instante. */
function offsetAt(instant: number, timeZone: string): number {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone,
            hourCycle: "h23",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        })
            .formatToParts(new Date(instant))
            .map((part) => [part.type, part.value]),
    );
    const asUtc = Date.UTC(
        Number(parts["year"]),
        Number(parts["month"]) - 1,
        Number(parts["day"]),
        Number(parts["hour"]),
        Number(parts["minute"]),
        Number(parts["second"]),
    );
    return asUtc - (instant - (instant % 1000));
}

/** Inicio e fim (exclusivo) de um dia aaaa-mm-dd no fuso do app. */
export function dayRange(key: string, timeZone = APP_TIMEZONE): { start: Date; end: Date } {
    const [year, month, day] = key.split("-").map(Number) as [number, number, number];
    const startGuess = Date.UTC(year, month - 1, day);
    const start = startGuess - offsetAt(startGuess, timeZone);
    const endGuess = Date.UTC(year, month - 1, day + 1);
    const end = endGuess - offsetAt(endGuess, timeZone);
    return { start: new Date(start), end: new Date(end) };
}

/** Inicio e fim (exclusivo) de hoje no fuso do app. */
export function todayRange(timeZone = APP_TIMEZONE) {
    return dayRange(dayKey(new Date(), timeZone), timeZone);
}

const WEEKDAY_BY_NAME: Record<string, "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"> = {
    Monday: "MONDAY",
    Tuesday: "TUESDAY",
    Wednesday: "WEDNESDAY",
    Thursday: "THURSDAY",
    Friday: "FRIDAY",
    Saturday: "SATURDAY",
    Sunday: "SUNDAY",
};

/** Dia da semana de hoje no fuso do app (mesmo formato do Weekday do banco). */
export function todayWeekday(timeZone = APP_TIMEZONE) {
    const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(new Date());
    return WEEKDAY_BY_NAME[name]!;
}
