// 슬롯 타입: 루틴만, 프로젝트만, 또는 모두 허용
export type SlotType = 'routine' | 'project' | 'any'

// 시간대 설정 (시간 + 타입)
export interface TimeSlotConfig {
  time: string       // "09:00-12:00"
  type: SlotType     // "routine" | "project" | "any"
}

// Config types
export interface Config {
  available: Record<string, TimeSlotConfig[]>  // 요일별 시간대 + 타입
  focus: string
  buffer: string
  schedule_weeks: number
  calendar_id: string
}

// Task types
export interface Task {
  id: string
  name: string
  duration: number // minutes
  blockType: 'short' | 'long' | 'any'
  dependencies: string[]
}

export interface Project {
  filename: string
  project: string
  priority: 'high' | 'medium' | 'low'
  deadline: string | null
  tasks: Task[]
  role?: 'focus' | 'buffer'  // 프론트엔드에서 설정한 역할
}

// Routine types
export interface RoutineTask {
  name: string
  duration: number // minutes
  repeat: string[] // ['Mon', 'Thu'] or ['daily']
  preferredTime: string | null // '09:00' or 'morning'
}

export interface Routine {
  filename: string
  name: string
  priority: 'high' | 'medium' | 'low'
  tasks: RoutineTask[]
}

// Schedule types
export interface ScheduledEvent {
  start: string // 'HH:MM'
  end: string
  title: string
  type: 'routine' | 'focus' | 'buffer'
  source: string // filename
  taskId?: string
}

export interface DaySchedule {
  date: string // 'YYYY-MM-DD'
  events: ScheduledEvent[]
}

// 루틴 대체 배치 정보
export interface RoutineAlternative {
  routineName: string
  originalDay: string       // 원래 요일
  originalTime: string      // 원래 선호 시간
  scheduledDay: string      // 실제 배치된 요일
  scheduledTime: string     // 실제 배치된 시간
  reason: 'no_slot' | 'slot_full'  // 대체 사유
}

export interface ScheduleResult {
  schedule: DaySchedule[]
  summary: {
    totalTasks: number
    scheduledTasks: number
    unscheduledTasks: number
    totalHours: number
  }
  routineAlternatives?: RoutineAlternative[]  // 대체 배치된 루틴 정보
}

// Time slot types
export interface TimeSlot {
  date: string
  start: string
  end: string
  duration: number // minutes
  used: number // minutes used
  slotType: SlotType // 슬롯 타입 (routine/project/any)
}

// 기존 캘린더 이벤트 (Google Calendar에서 가져온 일정)
export interface ExistingCalendarEvent {
  id: string
  title: string
  start: string  // ISO datetime 또는 'HH:MM'
  end: string
  date?: string  // 'YYYY-MM-DD'
}
