import { enUS as baseEnUS } from 'date-fns/locale'

// Shim to provide a named `enUS` export for libs expecting date-fns v4 semantics.
export const enUS = baseEnUS
export default baseEnUS
