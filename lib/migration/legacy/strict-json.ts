/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md strict offline JSON input contract
 * @related_to   snapshot-package-runner.ts and preview-import-runner.ts share this parser
 * @known_issues The parser intentionally supports JSON only and rejects nesting deeper than 64 levels
 */

const JSON_NUMBER_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u
const MAXIMUM_JSON_DEPTH = 64

export function parseStrictJson(text: string, maximumBytes: number): unknown {
  if (
    typeof text !== 'string' ||
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    Buffer.byteLength(text, 'utf8') > maximumBytes ||
    text.length === 0
  ) {
    throw strictJsonError()
  }

  let index = 0
  const skipWhitespace = (): void => {
    while (
      index < text.length &&
      (text[index] === ' ' || text[index] === '\n' || text[index] === '\r' || text[index] === '\t')
    ) {
      index += 1
    }
  }

  const parseString = (): string => {
    if (text[index] !== '"') throw strictJsonError()
    const start = index
    index += 1
    while (index < text.length) {
      const character = text[index]
      if (character === '"') {
        index += 1
        const parsed = JSON.parse(text.slice(start, index)) as unknown
        if (typeof parsed !== 'string') throw strictJsonError()
        return parsed
      }
      if (character === '\\') {
        index += 1
        const escape = text[index]
        if (!escape || !'"\\/bfnrtu'.includes(escape)) throw strictJsonError()
        if (escape === 'u') {
          const codePoint = text.slice(index + 1, index + 5)
          if (!/^[a-fA-F0-9]{4}$/u.test(codePoint)) throw strictJsonError()
          index += 4
        }
      } else if ((character?.charCodeAt(0) ?? 0) < 0x20) {
        throw strictJsonError()
      }
      index += 1
    }
    throw strictJsonError()
  }

  const parseValue = (depth: number): unknown => {
    if (depth > MAXIMUM_JSON_DEPTH) throw strictJsonError()
    skipWhitespace()
    const character = text[index]
    if (character === '"') return parseString()
    if (character === '{') {
      index += 1
      skipWhitespace()
      const record: Record<string, unknown> = Object.create(null) as Record<string, unknown>
      const keys = new Set<string>()
      if (text[index] === '}') {
        index += 1
        return record
      }
      while (index < text.length) {
        skipWhitespace()
        const key = parseString()
        if (keys.has(key)) throw strictJsonError()
        keys.add(key)
        skipWhitespace()
        if (text[index] !== ':') throw strictJsonError()
        index += 1
        record[key] = parseValue(depth + 1)
        skipWhitespace()
        if (text[index] === '}') {
          index += 1
          return record
        }
        if (text[index] !== ',') throw strictJsonError()
        index += 1
      }
      throw strictJsonError()
    }
    if (character === '[') {
      index += 1
      skipWhitespace()
      const values: unknown[] = []
      if (text[index] === ']') {
        index += 1
        return values
      }
      while (index < text.length) {
        values.push(parseValue(depth + 1))
        skipWhitespace()
        if (text[index] === ']') {
          index += 1
          return values
        }
        if (text[index] !== ',') throw strictJsonError()
        index += 1
      }
      throw strictJsonError()
    }
    for (const [literal, value] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ] as const) {
      if (text.startsWith(literal, index)) {
        index += literal.length
        return value
      }
    }
    const numberMatch = JSON_NUMBER_PATTERN.exec(text.slice(index))
    if (!numberMatch) throw strictJsonError()
    index += numberMatch[0].length
    const number = Number(numberMatch[0])
    if (!Number.isFinite(number)) throw strictJsonError()
    return number
  }

  const parsed = parseValue(0)
  skipWhitespace()
  if (index !== text.length) throw strictJsonError()
  return parsed
}

function strictJsonError(): Error {
  return new Error('Strict JSON input was rejected.')
}
