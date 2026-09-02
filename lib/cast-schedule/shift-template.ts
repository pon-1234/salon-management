/**
 * @design_doc   SCH-01/SCH-02 キャスト出勤時間テンプレートと休み登録
 * @related_to   ScheduleEditDialog, Cast.scheduleTemplates
 * @known_issues None
 */
export type CastShiftTemplate = {
  id: string
  name: string
  startTime: string
  endTime: string
  isHoliday: boolean
}

export type AppliedShiftTemplate = {
  date: string
  status: '休日' | '出勤予定' | '未入力'
  startTime?: string
  endTime?: string
}

export function createHolidayTemplate(): CastShiftTemplate {
  return {
    id: 'holiday',
    name: '休み',
    startTime: '',
    endTime: '',
    isHoliday: true,
  }
}

export const DEFAULT_SHIFT_TEMPLATES: CastShiftTemplate[] = [createHolidayTemplate()]

export function mergeCastShiftTemplates(saved?: CastShiftTemplate[] | null): CastShiftTemplate[] {
  if (!saved || saved.length === 0) {
    return DEFAULT_SHIFT_TEMPLATES
  }
  return saved
}

export function applyShiftTemplate(
  template: CastShiftTemplate,
  date: string
): AppliedShiftTemplate {
  if (template.isHoliday) {
    return {
      date,
      status: '休日',
      startTime: undefined,
      endTime: undefined,
    }
  }

  return {
    date,
    status: '出勤予定',
    startTime: template.startTime,
    endTime: template.endTime,
  }
}
