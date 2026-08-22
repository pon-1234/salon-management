/**
 * @design_doc   会議未確定: 1週間表示のまま1か月先まで入力できる
 * @related_to   ScheduleEditDialog, getDateRange
 * @known_issues None
 */
export type ScheduleEditSpan = 'week' | 'fourWeeks'

export function scheduleEditDayCount(span: ScheduleEditSpan): number {
  return span === 'fourWeeks' ? 28 : 7
}
