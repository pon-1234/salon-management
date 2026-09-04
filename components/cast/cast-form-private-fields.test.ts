/**
 * @design_doc   Notion task #282 cast basic information revision
 * @related_to   CastForm and PublicProfileForm
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const formSource = readFileSync(join(__dirname, 'cast-form.tsx'), 'utf8')
const publicSource = readFileSync(join(__dirname, 'public-profile-form.tsx'), 'utf8')
const apiSource = readFileSync(join(process.cwd(), 'app', 'api', 'cast', 'route.ts'), 'utf8')

describe('cast information boundaries', () => {
  it('keeps private onboarding data in the basic information form', () => {
    for (const label of [
      '電話番号',
      '生年月日',
      'ブログウィジェット',
      'SNSアカウント',
      '入店日',
      '退店日',
      '面接担当者',
      '求人媒体',
      '写真付き身分証確認日',
      '本籍地入り住民票確認日',
    ]) {
      expect(formSource).toContain(label)
    }
    expect(apiSource).toContain("default('active')")
  })

  it('keeps height, measurements, type, copy, options, and images in the public form only', () => {
    for (const field of [
      '身長',
      'バスト',
      'ウエスト',
      'ヒップ',
      'タイプ',
      '紹介文',
      '媒体掲載用コメント',
    ]) {
      expect(publicSource).toContain(field)
    }
    expect(publicSource).toContain('メイン画像')
    expect(publicSource).toContain('可能オプション')
    expect(formSource).not.toContain('title="基本プロフィール"')
    expect(formSource).not.toContain('title="メイン画像・ギャラリー"')
    expect(formSource).not.toContain('title="可能オプション"')
  })

  it('uses the store master for customer-facing designation price instead of per-cast input', () => {
    expect(formSource).not.toContain("htmlFor={fieldId('regularDesignationFee')}")
  })
})
