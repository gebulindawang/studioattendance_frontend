import { STUDIO_RECORD } from '@/constants/checkin'
import { formatSectionPair } from '@/utils/schedule'

export function formatAttendanceSection(record) {
  return record.record_kind === STUDIO_RECORD ? formatSectionPair(record.section) : `第 ${record.section} 节`
}
