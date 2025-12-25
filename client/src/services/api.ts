import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Types
export interface Task {
  id: string
  name: string
  duration: number
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

export interface RoutineTask {
  name: string
  duration: number
  repeat: string[]
  preferredTime: string | null
}

export interface Routine {
  filename: string
  name: string
  priority: 'high' | 'medium' | 'low'
  tasks: RoutineTask[]
}

export interface ScheduledEvent {
  start: string
  end: string
  title: string
  type: 'routine' | 'focus' | 'buffer'
  source: string
  taskId?: string
}

export interface DaySchedule {
  date: string
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

export interface Config {
  available: Record<string, string[]>
  focus: string
  buffer: string
  queue: string[]
  schedule_weeks: number
  calendar_id: string
}

// API Functions
export async function getConfig(): Promise<Config> {
  const { data } = await api.get<Config>('/config')
  return data
}

export async function updateConfig(config: Config): Promise<void> {
  await api.put('/config', config)
}

export async function parseFiles(files: File[]): Promise<{ projects: Project[]; routines: Routine[] }> {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))

  const { data } = await api.post('/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function createSchedule(
  projects: Project[],
  routines: Routine[],
  startDate: string,
  weeks?: number
): Promise<ScheduleResult> {
  const { data } = await api.post<ScheduleResult>('/schedule', {
    projects,
    routines,
    startDate,
    weeks,
  })
  return data
}

export async function getAuthStatus(): Promise<{ authenticated: boolean }> {
  const { data } = await api.get<{ authenticated: boolean }>('/auth/status')
  return data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function syncToCalendar(schedule: DaySchedule[]): Promise<{ created: number; failed: number }> {
  const { data } = await api.post('/calendar/sync', { schedule })
  return data
}

export interface ScheduleEstimate {
  requiredWeeks: number
  totalTasks: number
  totalHours: number
}

export async function estimateSchedule(
  projects: Project[],
  routines: Routine[],
  startDate: string
): Promise<ScheduleEstimate> {
  const { data } = await api.post<ScheduleEstimate>('/schedule/estimate', {
    projects,
    routines,
    startDate,
  })
  return data
}
