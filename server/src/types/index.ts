// Config types
export interface Config {
  available: Record<string, string[]>
  focus: string
  buffer: string
  queue: string[]
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

export interface ScheduleResult {
  schedule: DaySchedule[]
  summary: {
    totalTasks: number
    scheduledTasks: number
    unscheduledTasks: number
    totalHours: number
  }
}

// Time slot types
export interface TimeSlot {
  date: string
  start: string
  end: string
  duration: number // minutes
  used: number // minutes used
}
