import type { Project, Routine, RoutineTask, Config, TimeSlotConfig } from '../services/api'

export type FileRole = 'focus' | 'buffer' | 'routine'

const DAY_MAP: Record<string, string> = {
  'Mon': '월', 'Tue': '화', 'Wed': '수', 'Thu': '목',
  'Fri': '금', 'Sat': '토', 'Sun': '일'
}

/**
 * 반복 주기를 한국어로 변환
 */
function formatRepeat(repeat: string[]): string {
  if (!repeat || repeat.length === 0) return ''

  // daily, weekdays, weekends 처리
  if (repeat.includes('daily') || repeat.length === 7) return '매일'
  if (repeat.length === 5 &&
      repeat.includes('Mon') && repeat.includes('Tue') &&
      repeat.includes('Wed') && repeat.includes('Thu') && repeat.includes('Fri')) {
    return '평일'
  }
  if (repeat.length === 2 && repeat.includes('Sat') && repeat.includes('Sun')) {
    return '주말'
  }

  return repeat.map(d => DAY_MAP[d] || d).join(',')
}

/**
 * 선호시간 해석 (morning -> 09:00 등)
 */
function resolvePreferredTime(preferredTime: string | null): string | null {
  if (!preferredTime) return null
  const timeMap: Record<string, string> = {
    morning: '09:00',
    afternoon: '13:00',
    evening: '19:00',
  }
  return timeMap[preferredTime] || preferredTime
}

/**
 * 슬롯 설정에서 시간 문자열 추출 (레거시/신규 포맷 호환)
 */
function getSlotTime(slot: string | TimeSlotConfig): string {
  if (typeof slot === 'string') return slot
  return slot.time
}

/**
 * 루틴 태스크의 충돌 확인
 * 반환: 가용시간이 없는 요일 목록
 */
function checkRoutineConflicts(task: RoutineTask, config: Config | null): string[] {
  if (!config || !task.repeat) return []

  const conflicts: string[] = []
  const preferredTime = resolvePreferredTime(task.preferredTime)

  for (const day of task.repeat) {
    const daySlots = config.available[day] || []

    if (daySlots.length === 0) {
      // 해당 요일에 가용시간이 전혀 없음
      conflicts.push(day)
    } else if (preferredTime) {
      // 선호시간이 지정된 경우, 해당 시간에 슬롯이 있는지 확인
      const hasMatchingSlot = daySlots.some(slot => {
        const timeStr = getSlotTime(slot)
        const [start] = timeStr.split('-')
        return start === preferredTime
      })
      if (!hasMatchingSlot) {
        conflicts.push(day)
      }
    }
  }

  return conflicts
}

/**
 * 루틴 태스크들의 반복 정보 요약 (충돌 정보 포함)
 */
interface RoutineSummaryItem {
  summary: string
  conflicts: string[]
}

function getRoutineSummaryWithConflicts(tasks: RoutineTask[], config: Config | null): RoutineSummaryItem[] {
  if (!tasks || tasks.length === 0) return []

  return tasks.map(task => {
    const repeat = formatRepeat(task.repeat)
    const time = task.preferredTime || ''
    const conflicts = checkRoutineConflicts(task, config)

    return {
      summary: `${task.name}: ${repeat}${time ? ` (${time})` : ''}`,
      conflicts,
    }
  })
}

export interface ParsedFile {
  file: File
  role: FileRole
  parsed?: Project | Routine
  isRoutine: boolean
}

interface FileListProps {
  files: ParsedFile[]
  onRoleChange: (index: number, role: FileRole) => void
  onRemove: (index: number) => void
  disabled?: boolean
  config?: Config | null  // 루틴 충돌 확인을 위한 설정
}

/**
 * Displays uploaded files with role selection dropdowns.
 * Routines are automatically marked and cannot change roles.
 */
export default function FileList({ files, onRoleChange, onRemove, disabled = false, config = null }: FileListProps) {
  if (files.length === 0) {
    return null
  }

  const getRoleBadgeStyles = (role: FileRole) => {
    switch (role) {
      case 'focus':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'buffer':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'routine':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: FileRole) => {
    switch (role) {
      case 'focus':
        return 'Focus'
      case 'buffer':
        return 'Buffer'
      case 'routine':
        return 'Routine'
      default:
        return role
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900">
          첨부된 파일 ({files.length}개)
        </h3>
      </div>

      <ul className="divide-y divide-gray-100" role="list">
        {files.map((item, index) => (
          <li
            key={`${item.file.name}-${index}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
          >
            {/* File Info */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* File Icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <svg
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* File Name & Status */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {item.file.name}
                </p>
                {item.parsed && (
                  <div className="text-xs text-gray-500">
                    {item.isRoutine ? (
                      <>
                        <p>{(item.parsed as Routine).tasks?.length || 0}개 루틴</p>
                        {/* 루틴 반복 정보 및 충돌 경고 표시 */}
                        <div className="mt-1 space-y-1">
                          {getRoutineSummaryWithConflicts((item.parsed as Routine).tasks, config).map((item, i) => (
                            <div key={i}>
                              <p className={`flex items-center gap-1 ${item.conflicts.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="truncate">{item.summary}</span>
                              </p>
                              {item.conflicts.length > 0 && (
                                <p className="ml-4 flex items-center gap-1 text-red-500">
                                  <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <span>{item.conflicts.map(d => DAY_MAP[d] || d).join(',')}요일 가용시간 없음</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p>{(item.parsed as Project).tasks?.length || 0}개 태스크</p>
                        {/* 프로젝트 priority/deadline 표시 */}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            (item.parsed as Project).priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : (item.parsed as Project).priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {(item.parsed as Project).priority === 'high' ? '높음' :
                             (item.parsed as Project).priority === 'medium' ? '보통' : '낮음'}
                          </span>
                          {(item.parsed as Project).deadline && (
                            <span className="text-gray-400 text-xs">
                              마감: {(item.parsed as Project).deadline}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Role Selector / Badge */}
            <div className="flex items-center gap-2">
              {item.isRoutine ? (
                // Routine badge (non-editable)
                <span
                  className={`
                    inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium
                    ${getRoleBadgeStyles('routine')}
                  `}
                >
                  {getRoleLabel('routine')}
                </span>
              ) : (
                // Project role selector
                <select
                  value={item.role}
                  onChange={(e) => onRoleChange(index, e.target.value as FileRole)}
                  disabled={disabled}
                  className={`
                    rounded-lg border px-3 py-1.5 text-xs font-medium
                    transition-colors duration-150
                    ${getRoleBadgeStyles(item.role)}
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  `}
                  aria-label={`${item.file.name} 역할 선택`}
                >
                  <option value="focus">Focus</option>
                  <option value="buffer">Buffer</option>
                </select>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                className={`
                  rounded-lg p-2 text-gray-400 transition-colors duration-150
                  ${disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-red-50 hover:text-red-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
                `}
                aria-label={`${item.file.name} 삭제`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
