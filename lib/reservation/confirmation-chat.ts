/**
 * @design_doc   refactor-instructions.md Phase 5 reservation route extraction
 * @related_to   app/api/reservation/route.ts - reservation confirmation chat sending
 * @known_issues Preserves existing hard-coded Japanese confirmation copy
 */
export function resolveReservationTotalAmount(reservation: any): number | null {
  if (typeof reservation?.price === 'number') {
    return reservation.price
  }

  const storeShare = typeof reservation?.storeRevenue === 'number' ? reservation.storeRevenue : null
  const staffShare = typeof reservation?.staffRevenue === 'number' ? reservation.staffRevenue : null

  if (storeShare !== null || staffShare !== null) {
    return (storeShare ?? 0) + (staffShare ?? 0)
  }

  if (typeof reservation?.course?.price === 'number') {
    return reservation.course.price
  }

  return null
}

export function formatChatAmount(amount: number | null): string {
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return `${amount.toLocaleString()}円`
  }
  return '店舗より別途ご案内いたします'
}

export function buildReservationConfirmationChatContent(
  amountLabel: string,
  phoneNumber: string
): string {
  const telLine = phoneNumber?.trim().length
    ? `TEL：${phoneNumber.trim()}`
    : 'TEL：店舗までお問い合わせください'
  return [
    'この度はネット予約をご利用いただき誠にありがとうございます。',
    '',
    'ご予約内容を確定させていただきました。',
    '',
    '＜支払内容＞',
    `お支払総額：${amountLabel}（ホテル代別途）`,
    '',
    'ご予約時間10分前までに、ホテル名・お部屋番号を下記お店までお知らせください。',
    telLine,
    '※ご予約内容の変更・キャンセルなどは直接お電話にてご連絡ください。',
    '',
    '＜オススメホテルの紹介＞',
    '※当店が池袋駅西口・北口にございますので下記ホテル及び周辺ホテルですとスムーズのご対応が可能になります。',
    '・トキワウエスト',
    '・グランドホテル',
    '・ホテルトキワ',
    '・アメジスト',
    '※池袋東口・南口・西口一部の場合、別途タクシー代を頂く場合がございますのでご了承ください。',
    '',
    'ぜひ、素敵な時間をお過ごしください。',
  ].join('\n')
}
