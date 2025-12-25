import axios from 'axios'

// Production에서는 Render 백엔드 URL 사용
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CORS 요청시 쿠키 전송
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
  role?: 'focus' | 'buffer'  // 프론트엔드에서 설정한 역할
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

// 슬롯 타입
export type SlotType = 'routine' | 'project' | 'any'

// 시간대 설정
export interface TimeSlotConfig {
  time: string       // "09:00-12:00"
  type: SlotType     // "routine" | "project" | "any"
}

export interface Config {
  available: Record<string, TimeSlotConfig[]>  // 요일별 시간대 + 타입
  focus: string
  buffer: string
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

// Google OAuth URL 반환
export function getGoogleAuthUrl(): string {
  const baseUrl = import.meta.env.VITE_API_URL || '/api'
  return `${baseUrl}/auth/google`
}
