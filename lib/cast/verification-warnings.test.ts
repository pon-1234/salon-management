/**
 * @design_doc   Notion task #282 cast onboarding document alerts
 * @related_to   Cast list cards and cast profile overview
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { getCastVerificationWarnings } from './verification-warnings'

describe('getCastVerificationWarnings', () => {
  it('lists each missing required identity document confirmation', () => {
    expect(getCastVerificationWarnings({})).toEqual([
      '写真付き身分証が未確認です',
      '本籍地入り住民票が未確認です',
    ])
  })

  it('returns no warning when both confirmation dates are recorded', () => {
    expect(
      getCastVerificationWarnings({
        photoIdVerifiedAt: '2026-09-01',
        residenceCertificateVerifiedAt: '2026-09-02',
      })
    ).toEqual([])
  })
})
