/**
 * @design_doc   Notion task #282 cast onboarding document alerts
 * @related_to   CastListView and CastManagePage profile overview
 * @known_issues None
 */
export function getCastVerificationWarnings(cast: {
  photoIdVerifiedAt?: string | Date | null
  residenceCertificateVerifiedAt?: string | Date | null
}): string[] {
  const warnings: string[] = []
  if (!cast.photoIdVerifiedAt) warnings.push('写真付き身分証が未確認です')
  if (!cast.residenceCertificateVerifiedAt) warnings.push('本籍地入り住民票が未確認です')
  return warnings
}
