import type {
  Config,
  Project,
  Routine,
  Task,
  RoutineTask,
  TimeSlot,
  ScheduledEvent,
  DaySchedule,
  ScheduleResult,
} from '../types/index.js'

const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * 시간 문자열을 분으로 변환 (00:00 기준)
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 분을 시간 문자열로 변환
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/**
 * 날짜 범위 내 모든 날짜 생성
 */
function getDateRange(startDate: Date, weeks: number): Date[] {
  const dates: Date[] = []
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + weeks * 7)

  const current = new Date(startDate)
  while (current < endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 가용 시간 슬롯 계산
 */
function calculateAvailableSlots(
  config: Config,
  dates: Date[],
  existingEvents: ScheduledEvent[] = []
): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (const date of dates) {
    const dayName = DAY_NAMES[date.getDay()]
    const availableTimes = config.available[dayName] || []

    for (const timeRange of availableTimes) {
      const [startStr, endStr] = timeRange.split('-')
      const start = timeToMinutes(startStr)
      const end = timeToMinutes(endStr)

      slots.push({
        date: formatDate(date),
        start: startStr,
        end: endStr,
        duration: end - start,
        used: 0,
      })
    }
  }

  return slots
}

/**
 * 선호시간을 실제 시간으로 변환
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
 * 슬롯에 이벤트가 맞는지 확인
 */
function canFitInSlot(slot: TimeSlot, duration: number): boolean {
  return slot.duration - slot.used >= duration
}

/**
 * 블록타입에 맞는 슬롯인지 확인
 */
function isSlotSuitableForBlockType(
  slot: TimeSlot,
  blockType: 'short' | 'long' | 'any'
): boolean {
  const availableDuration = slot.duration - slot.used

  switch (blockType) {
    case 'short':
      return availableDuration <= 60 || availableDuration >= 60 // short는 어디든 가능하지만 작은 슬롯 선호
    case 'long':
      return availableDuration >= 180 // 3시간 이상
    case 'any':
      return true
  }
}

/**
 * 슬롯에 이벤트 배치
 */
function scheduleInSlot(
  slot: TimeSlot,
  duration: number,
  title: string,
  type: 'routine' | 'focus' | 'buffer',
  source: string,
  taskId?: string
): ScheduledEvent {
  const startMinutes = timeToMinutes(slot.start) + slot.used
  const endMinutes = startMinutes + duration

  slot.used += duration

  return {
    start: minutesToTime(startMinutes),
    end: minutesToTime(endMinutes),
    title,
    type,
    source,
    taskId,
  }
}

/**
 * 루틴 배치
 */
function scheduleRoutines(
  routines: Routine[],
  slots: TimeSlot[],
  schedule: Map<string, ScheduledEvent[]>
): void {
  for (const routine of routines) {
    for (const task of routine.tasks) {
      const preferredTime = resolvePreferredTime(task.preferredTime)

      for (const slot of slots) {
        // 해당 요일에 반복되는지 확인
        const slotDate = new Date(slot.date)
        const dayName = DAY_NAMES[slotDate.getDay()]

        if (!task.repeat.includes(dayName)) continue

        // 선호시간이 있으면 해당 슬롯만 사용
        if (preferredTime) {
          const slotStartTime = slot.start
          if (slotStartTime !== preferredTime) continue
        }

        // 슬롯에 맞는지 확인
        if (!canFitInSlot(slot, task.duration)) continue

        // 이미 오늘 같은 루틴이 배치되었는지 확인
        const dayEvents = schedule.get(slot.date) || []
        const alreadyScheduled = dayEvents.some(
          e => e.title === task.name && e.type === 'routine'
        )
        if (alreadyScheduled) continue

        // 배치
        const event = scheduleInSlot(
          slot,
          task.duration,
          task.name,
          'routine',
          routine.filename
        )

        if (!schedule.has(slot.date)) {
          schedule.set(slot.date, [])
        }
        schedule.get(slot.date)!.push(event)
        break // 다음 날짜로
      }
    }
  }
}

/**
 * 토폴로지 정렬 (의존성 순서)
 */
function topologicalSort(tasks: Task[]): Task[] {
  const sorted: Task[] = []
  const visited = new Set<string>()
  const taskMap = new Map(tasks.map(t => [t.id, t]))

  function visit(task: Task): void {
    if (visited.has(task.id)) return
    visited.add(task.id)

    for (const depId of task.dependencies) {
      const dep = taskMap.get(depId)
      if (dep) visit(dep)
    }

    sorted.push(task)
  }

  for (const task of tasks) {
    visit(task)
  }

  return sorted
}

/**
 * 프로젝트 태스크 배치
 */
function scheduleProjectTasks(
  project: Project,
  slots: TimeSlot[],
  schedule: Map<string, ScheduledEvent[]>,
  type: 'focus' | 'buffer',
  scheduledTasks: Set<string>
): number {
  const sortedTasks = topologicalSort(project.tasks)
  let scheduled = 0

  for (const task of sortedTasks) {
    const taskKey = `${project.filename}#${task.id}`
    if (scheduledTasks.has(taskKey)) continue

    // 의존성 확인: 모든 선행 태스크가 스케줄되었는지
    const depsScheduled = task.dependencies.every(depId =>
      scheduledTasks.has(`${project.filename}#${depId}`)
    )
    if (!depsScheduled && task.dependencies.length > 0) continue

    // 적합한 슬롯 찾기
    for (const slot of slots) {
      if (!canFitInSlot(slot, task.duration)) continue
      if (!isSlotSuitableForBlockType(slot, task.blockType)) continue

      // long 타입은 3시간 이상 슬롯에만
      if (task.blockType === 'long' && slot.duration - slot.used < 180) continue

      // 배치
      const event = scheduleInSlot(
        slot,
        task.duration,
        task.name,
        type,
        project.filename,
        task.id
      )

      if (!schedule.has(slot.date)) {
        schedule.set(slot.date, [])
      }
      schedule.get(slot.date)!.push(event)

      scheduledTasks.add(taskKey)
      scheduled++
      break
    }
  }

  return scheduled
}

/**
 * 메인 스케줄링 함수
 */
export function createSchedule(
  projects: Project[],
  routines: Routine[],
  config: Config,
  startDate: string,
  weeks: number
): ScheduleResult {
  const start = new Date(startDate)
  const dates = getDateRange(start, weeks)
  const slots = calculateAvailableSlots(config, dates)
  const schedule = new Map<string, ScheduledEvent[]>()
  const scheduledTasks = new Set<string>()

  // 1. 루틴 먼저 배치
  scheduleRoutines(routines, slots, schedule)

  // 2. Focus 프로젝트 배치
  const focusProject = projects.find(p => p.filename === config.focus)
  let focusScheduled = 0
  if (focusProject) {
    focusScheduled = scheduleProjectTasks(
      focusProject,
      slots,
      schedule,
      'focus',
      scheduledTasks
    )
  }

  // 3. Buffer 프로젝트 배치
  const bufferProject = projects.find(p => p.filename === config.buffer)
  let bufferScheduled = 0
  if (bufferProject) {
    bufferScheduled = scheduleProjectTasks(
      bufferProject,
      slots,
      schedule,
      'buffer',
      scheduledTasks
    )
  }

  // 결과 정리
  const sortedDates = Array.from(schedule.keys()).sort()
  const result: DaySchedule[] = sortedDates.map(date => ({
    date,
    events: schedule.get(date)!.sort((a, b) =>
      timeToMinutes(a.start) - timeToMinutes(b.start)
    ),
  }))

  // 총 태스크 수 계산
  const totalProjectTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0)
  const totalRoutineTasks = routines.reduce((sum, r) => sum + r.tasks.length, 0)
  const scheduledRoutineCount = new Set(
    result.flatMap(d => d.events.filter(e => e.type === 'routine').map(e => e.title))
  ).size

  // 총 시간 계산
  const totalMinutes = result.reduce(
    (sum, day) =>
      sum +
      day.events.reduce(
        (daySum, event) =>
          daySum + (timeToMinutes(event.end) - timeToMinutes(event.start)),
        0
      ),
    0
  )

  return {
    schedule: result,
    summary: {
      totalTasks: totalProjectTasks,
      scheduledTasks: focusScheduled + bufferScheduled,
      unscheduledTasks: totalProjectTasks - (focusScheduled + bufferScheduled),
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    },
  }
}

/**
 * 모든 태스크를 배치하는데 필요한 최소 주 수 계산
 */
export function calculateRequiredWeeks(
  projects: Project[],
  routines: Routine[],
  config: Config,
  startDate: string,
  maxWeeks: number = 52 // 최대 1년
): { requiredWeeks: number; totalTasks: number; totalHours: number } {
  const totalProjectTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0)
  const totalMinutes = projects.reduce(
    (sum, p) => sum + p.tasks.reduce((taskSum, t) => taskSum + t.duration, 0),
    0
  )

  // 최소 1주부터 시작해서 모든 태스크가 배치될 때까지 증가
  for (let weeks = 1; weeks <= maxWeeks; weeks++) {
    const result = createSchedule(projects, routines, config, startDate, weeks)

    if (result.summary.unscheduledTasks === 0) {
      return {
        requiredWeeks: weeks,
        totalTasks: totalProjectTasks,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      }
    }
  }

  // maxWeeks로도 부족하면 maxWeeks 반환
  return {
    requiredWeeks: maxWeeks,
    totalTasks: totalProjectTasks,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
  }
}
