declare module 'date-fns-tz' {
  type Locale = any

  export function format(
    date: Date | number,
    formatStr: string,
    options?: { timeZone?: string; locale?: Locale }
  ): string
  export function formatInTimeZone(
    date: Date | number,
    timeZone: string,
    formatStr: string,
    options?: { locale?: Locale }
  ): string
  export function getTimezoneOffset(timeZone: string): number
  export function toDate(argument: Date | number | string): Date
  export function utcToZonedTime(date: Date | number, timeZone: string): Date
  export function zonedTimeToUtc(date: Date | number | string, timeZone: string): Date

  const dateFnsTz: {
    format: typeof format
    formatInTimeZone: typeof formatInTimeZone
    getTimezoneOffset: typeof getTimezoneOffset
    toDate: typeof toDate
    utcToZonedTime: typeof utcToZonedTime
    zonedTimeToUtc: typeof zonedTimeToUtc
  }

  export default dateFnsTz
}
