import type { ScheduleResult, DaySchedule, ScheduledEvent } from '../services/api'

interface SchedulePreviewProps {
  result: ScheduleResult | null
  onSync: () => void
  isSyncing: boolean
  isAuthenticated: boolean
}

/**
 * Displays the generated schedule with a day-by-day view.
 * Shows summary statistics and provides calendar sync action.
 */
export default function SchedulePreview({
  result,
  onSync,
  isSyncing,
  isAuthenticated
}: SchedulePreviewProps) {
  if (!result) {
    return null
  }

  const { schedule, summary } = result

  const getEventTypeStyles = (type: ScheduledEvent['type']) => {
    switch (type) {
      case 'routine':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'focus':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'buffer':
        return 'bg-amber-100 border-amber-300 text-amber-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getEventTypeIcon = (type: ScheduledEvent['type']) => {
    switch (type) {
      case 'routine':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'focus':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case 'buffer':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      default:
        return null
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = weekdays[date.getDay()]
    return `${month}/${day} (${weekday})`
  }

  const calculateDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    const duration = endMinutes - startMinutes
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            생성된 스케줄 미리보기
          </h2>
        </div>
      </div>

      {/* Schedule List */}
      <div className="max-h-96 overflow-y-auto">
        {schedule.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            배치된 이벤트가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {schedule.map((day: DaySchedule) => (
              <DayScheduleView
                key={day.date}
                day={day}
                formatDate={formatDate}
                calculateDuration={calculateDuration}
                getEventTypeStyles={getEventTypeStyles}
                getEventTypeIcon={getEventTypeIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-4">
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryItem
            label="총 태스크"
            value={summary.totalTasks}
            unit="개"
          />
          <SummaryItem
            label="배치됨"
            value={summary.scheduledTasks}
            unit="개"
            highlight="success"
          />
          <SummaryItem
            label="미배치"
            value={summary.unscheduledTasks}
            unit="개"
            highlight={summary.unscheduledTasks > 0 ? 'warning' : undefined}
          />
          <SummaryItem
            label="총 시간"
            value={summary.totalHours}
            unit="시간"
          />
        </div>

        {/* Warning for unscheduled tasks */}
        {summary.unscheduledTasks > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{summary.unscheduledTasks}개 태스크가 미배치되었습니다 (시간 부족)</span>
          </div>
        )}

        {/* Sync Button */}
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing || !isAuthenticated}
          className={`
            flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium
            transition-colors duration-150
            ${isAuthenticated
              ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
            ${isSyncing ? 'cursor-wait opacity-75' : ''}
            focus:outline-none focus:ring-2 focus:ring-offset-2
          `}
        >
          {isSyncing ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>동기화 중...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {isAuthenticated
                  ? 'Google Calendar에 등록'
                  : 'Google 연결 필요 (설정에서 연결)'
                }
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

interface DayScheduleViewProps {
  day: DaySchedule
  formatDate: (date: string) => string
  calculateDuration: (start: string, end: string) => string
  getEventTypeStyles: (type: ScheduledEvent['type']) => string
  getEventTypeIcon: (type: ScheduledEvent['type']) => React.ReactNode
}

function DayScheduleView({
  day,
  formatDate,
  calculateDuration,
  getEventTypeStyles,
  getEventTypeIcon
}: DayScheduleViewProps) {
  if (day.events.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-3">
      {/* Date Header */}
      <h3 className="mb-2 text-sm font-medium text-gray-900">
        {formatDate(day.date)}
      </h3>

      {/* Events */}
      <div className="space-y-2 pl-4">
        {day.events.map((event, idx) => (
          <div
            key={`${event.start}-${idx}`}
            className={`
              flex items-center gap-3 rounded-lg border px-3 py-2
              ${getEventTypeStyles(event.type)}
            `}
          >
            {/* Type Icon */}
            <span className="flex-shrink-0">
              {getEventTypeIcon(event.type)}
            </span>

            {/* Time */}
            <span className="flex-shrink-0 text-xs font-medium opacity-75">
              {event.start}-{event.end}
            </span>

            {/* Title */}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {event.title}
            </span>

            {/* Duration */}
            <span className="flex-shrink-0 text-xs opacity-75">
              {calculateDuration(event.start, event.end)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SummaryItemProps {
  label: string
  value: number
  unit: string
  highlight?: 'success' | 'warning'
}

function SummaryItem({ label, value, unit, highlight }: SummaryItemProps) {
  const valueStyles = highlight === 'success'
    ? 'text-green-600'
    : highlight === 'warning'
      ? 'text-amber-600'
      : 'text-gray-900'

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${valueStyles}`}>
        {value}
        <span className="text-sm font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  )
}
