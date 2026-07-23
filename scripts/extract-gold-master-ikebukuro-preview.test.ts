/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md read-only Ikebukuro field-preview extraction
 * @related_to   extract-gold-master-ikebukuro-preview.php is the SSH-piped legacy source boundary
 * @known_issues The test validates the fail-closed CLI and SQL allowlist without contacting production
 */
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { beforeAll, describe, expect, it } from 'vitest'

const executeFile = promisify(execFile)
const scriptPath = join(process.cwd(), 'scripts', 'extract-gold-master-ikebukuro-preview.php')

describe('gold master Ikebukuro preview extractor', () => {
  let source = ''

  beforeAll(async () => {
    source = await readFile(scriptPath, 'utf8')
  })

  it('is valid PHP and rejects invalid cutoff dates before reading credentials', async () => {
    const lint = await executeFile('php', ['-l', scriptPath], { cwd: process.cwd() })
    expect(lint.stderr).toBe('')
    expect(lint.stdout).toContain('No syntax errors detected')

    const failure = await captureFailure({
      LEGACY_PREVIEW_SCHEDULE_FROM: '2026-02-30',
      LEGACY_PREVIEW_SCHEDULE_TO: '2026-08-16',
      LEGACY_PREVIEW_RESERVATION_FROM: '2026-06-01',
    })

    expect(failure).toEqual({
      code: 1,
      stdout: '',
      stderr: 'Legacy preview extraction failed.\n',
    })
  })

  it('constructs a fail-closed PDO connection from the legacy config and makes it read-only', () => {
    expect(source).toContain('/home/nzuadtjn/gold-esthe.com_inc_master/jukunen_db_2016.inc')
    expect(source).toContain("'nzuadtjn_gold_master'")
    expect(source).toContain('token_get_all')
    expect(source).toContain('new PDO(')
    expect(source).toContain('SET SESSION TRANSACTION READ ONLY')
    expect(source).toContain('SELECT @@session.tx_read_only AS read_only_mode')
    expect(source).not.toMatch(/(?:password|username)\s*=\s*['"][^'"]+['"]/i)
    expect(source).toContain("file_put_contents('php://stderr'")
    expect(source).not.toMatch(/\bSTD(?:OUT|ERR)\b/u)
  })

  it('uses explicit projections and scoped predicates for every extracted dataset', () => {
    expect(source).not.toMatch(/SELECT\s+\*/i)
    expect(source).not.toMatch(
      /\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|TRUNCATE|CREATE|LOCK)\b/i
    )

    expect(source).toContain('shop_no, shop_name, tel, adress, eigyo, mail_ad, lev FROM shop_list')
    expect(source).toContain(
      'id, sort, charge_name, charge_name_admin, charge_kin, charge_ara, charge_min, flg_show, flg_web FROM charge_info'
    )
    expect(source).toContain(
      'serial, sort, option_name, kin, girl_pay, lev, lev_admin FROM options'
    )
    expect(source).toContain('serial, sort, option_name, kin, lev, lev_admin FROM options_free')
    expect(source).toContain('g.photo_1, g.photo_2, g.photo_3, g.photo_4, g.photo_5')
    expect(source).toContain('g.photo_11, g.photo_12, g.photo_13, g.photo_14, g.photo_15')
    expect(source).toContain('g.p_type, g.profile_catch, g.profile_cm, g.profile_new_1')
    expect(source).toContain('g.profile_new_5, g.profile_new_6')
    expect(source).toContain('g.access_count')
    expect(source).toContain('g.options, g.options_free')
    expect(source).toContain('g.shop_no = :shopNo AND g.lev = 2 AND g.lev_admin != 1')
    expect(source).toContain('y.syu_date BETWEEN :scheduleFrom AND :scheduleTo')
    expect(source).toContain('y.work >= 3 AND y.work NOT IN (6, 9)')
    expect(source).toContain('o.deli_date >= :reservationFrom')
    expect(source).toContain('o.mem_id')
    expect(source).toContain('o.simei_kin')
    expect(source).toContain('o.nebiki_kin_point')
    expect(source).toContain('o.nyu_date')
    expect(source).toContain('o.options, o.options_free')
    expect(source).toContain('o.pref_no, o.city_no, o.station_no, o.place_h_no')
    expect(source).toContain(
      'c.serial, c.pref_no, c.city_name, c.sort, c.group_no, c.lev FROM city_list c'
    )
    expect(source).toContain(
      's.serial, s.shop_no, s.pref_no, s.city_no, s.station_name, s.kana, s.sort, s.traffic_kin, s.lev, s.hp_flg FROM station_list_2018 s'
    )
    expect(source).toContain('s.shop_no = :stationShopNo AND s.lev = 1')
    expect(source).toContain(
      's.shop_no = :shopNo AND (s.lev = 1 OR s.serial IN (SELECT DISTINCT o.station_no FROM orders o'
    )
    expect(source).toContain(
      'ha.serial, ha.shop_no, ha.pref_no, ha.area_name, ha.lev FROM hotel_area ha'
    )
    expect(source).toContain(
      'h.serial, h.area_no, h.shop_no, h.pref_no, h.city_no, h.city_no2, h.hotel_name, h.station, h.address, h.tel, h.price1, h.price2, h.price3, h.price4, h.cm, h.lev FROM hotel_list h'
    )
    expect(source).toContain(
      'h.shop_no = :shopNo AND (h.lev = 1 OR h.serial IN (SELECT DISTINCT o.place_h_no FROM orders o'
    )
    expect(source).toContain('v.lev = 1')
    expect(source).toContain('v.mem_id')

    const orderProjection = extractProjection(source, 'orders', 'orders o')
    expect(orderProjection).toContain('o.mem_id')
    expect(orderProjection).not.toMatch(
      /\bo\.(?:name|tel|place|place_kind|place_play|place_play_g|order_cm|card|card_no|card_name|card_token|edy_flg)\b/i
    )
  })

  it('emits a versioned best-effort snapshot with explicit rows and count reconciliation', () => {
    expect(source).toContain("'version' => 3")
    expect(source).toContain("'sourceDatabase' => EXPECTED_DATABASE")
    expect(source).toContain("'shopNo' => SHOP_NO")
    expect(source).toContain("'consistency' => 'best-effort-read-only'")
    expect(source).toContain("'beforeCounts' => canonicalizeDatasets($beforeCounts)")
    expect(source).toContain("'afterCounts' => canonicalizeDatasets($afterCounts)")
    expect(source).toContain("'rows' => canonicalizeDatasets($rows)")
    expect(source).toContain('JSON_INVALID_UTF8_SUBSTITUTE')
    expect(source).toContain("'paidOptions' => $datasets['options']")
    expect(source).toContain("'freeOptions' => $datasets['optionsFree']")
    expect(source).toContain("'areas' => $datasets['cityList']")
    expect(source).toContain("'stations' => $datasets['stationList']")
    expect(source).toContain("'hotelGroups' => $datasets['hotelGroup']")
    expect(source).toContain("'hotels' => $datasets['hotelList']")
  })
})

function extractProjection(source: string, dataset: string, tableExpression: string): string {
  const marker = `/* dataset:${dataset} */`
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Missing ${dataset} query marker.`)

  const fromIndex = source.indexOf(`FROM ${tableExpression}`, markerIndex)
  if (fromIndex < 0) throw new Error(`Missing ${dataset} table expression.`)
  return source.slice(markerIndex, fromIndex)
}

async function captureFailure(
  cutoffEnvironment: Record<string, string>
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    await executeFile('php', [scriptPath], {
      cwd: process.cwd(),
      env: { ...process.env, ...cutoffEnvironment },
    })
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'stdout' in error &&
      'stderr' in error &&
      typeof error.code === 'number' &&
      typeof error.stdout === 'string' &&
      typeof error.stderr === 'string'
    ) {
      return { code: error.code, stdout: error.stdout, stderr: error.stderr }
    }
  }
  throw new Error('Expected extractor to reject invalid dates.')
}
