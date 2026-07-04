/**
 * @design_doc   ui-improvement-instructions.md U-11 cast form validation
 * @related_to   CastForm: admin cast editing form
 * @known_issues UI wiring is covered by targeted lint; this test covers the schema contract
 */
import { describe, expect, it } from 'vitest'

import { validateCastFormInput } from './cast-form'

const validInput = {
  name: '高橋 えみり',
  nameKana: 'たかはし えみり',
  loginEmail: '',
  loginPassword: '',
  loginPasswordConfirm: '',
}

describe('validateCastFormInput', () => {
  it('accepts the minimal currently-valid input', () => {
    expect(validateCastFormInput(validInput).success).toBe(true)
  })

  it('requires display name and kana name', () => {
    const result = validateCastFormInput({ ...validInput, name: '', nameKana: '' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain('源氏名を入力してください')
      expect(result.error.flatten().fieldErrors.nameKana).toContain(
        '本名（ひらがな）を入力してください'
      )
    }
  })

  it('validates optional email and password confirmation only when present', () => {
    const result = validateCastFormInput({
      ...validInput,
      loginEmail: 'invalid',
      loginPassword: 'secret1',
      loginPasswordConfirm: 'secret2',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.loginEmail).toContain(
        '正しいメールアドレスを入力してください'
      )
      expect(result.error.flatten().fieldErrors.loginPasswordConfirm).toContain(
        'ログイン用パスワードが一致しません'
      )
    }
  })
})
