import type {
  Config,
  Project,
  Routine,
  Task,
  RoutineTask,
  TimeSlot,
  TimeSlotConfig,
  ScheduledEvent,
  DaySchedule,
  ScheduleResult,
  ExistingCalendarEvent,
  RoutineAlternative,
  SlotType,
} from '../types/index.js'

const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * priority를 숫자로 변환 (정렬용)
 */
function priorityToNumber(priority: 'high' | 'medium' | 'low'): number {
  switch (priority) {
    case 'high': return 0
    case 'medium': return 1
    case 'low': return 2
    default: return 1
  }
}

/**
 * 프로젝트 우선순위 정렬
 * 1. priority (high > medium > low)
 * 2. deadline (빠른 날짜 우선, null은 최하위)
 * 3. filename (알파벳 순)
 */
function sortProjectsByPriority(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    // 1. priority 비교
    const priorityDiff = priorityToNumber(a.priority) - priorityToNumber(b.priority)
    if (priorityDiff !== 0) return priorityDiff

    // 2. deadline 비교
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (a.deadline && !b.deadline) return -1  // deadline 있는 쪽 우선
    if (!a.deadline && b.deadline) return 1

    // 3. filename 비교
    return a.filename.localeCompare(b.filename)
  })
}

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
 * 설정에서 시간대 정보 추출 (레거시 포맷 호환)
 * 레거시: string[] (예: ["09:00-12:00"])
 * 신규: TimeSlotConfig[] (예: [{ time: "09:00-12:00", type: "any" }])
 */
function normalizeTimeSlotConfig(
  slot: string | TimeSlotConfig
): TimeSlotConfig {
  if (typeof slot === 'string') {
    // 레거시 포맷: 문자열 → TimeSlotConfig 변환
    return { time: slot, type: 'any' }
  }
  return slot
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

    for (const slotConfig of availableTimes) {
      const normalized = normalizeTimeSlotConfig(slotConfig)
      const [startStr, endStr] = normalized.time.split('-')
      const start = timeToMinutes(startStr)
      const end = timeToMinutes(endStr)

      slots.push({
        date: formatDate(date),
        start: startStr,
        end: endStr,
        duration: end - start,
        used: 0,
        slotType: normalized.type,
      })
    }
  }

  return slots
}

/**
 * ISO datetime에서 시간 추출 (HH:MM)
 */
function extractTimeFromISO(isoString: string): string {
  // ISO format: "2025-12-25T09:00:00+09:00" or "2025-12-25T09:00:00"
  const match = isoString.match(/T(\d{2}:\d{2})/)
  if (match) return match[1]

  // 이미 HH:MM 형식인 경우
  if (/^\d{2}:\d{2}$/.test(isoString)) return isoString

  return '00:00'
}

/**
 * ISO datetime에서 날짜 추출 (YYYY-MM-DD)
 */
function extractDateFromISO(isoString: string): string {
  // ISO format: "2025-12-25T09:00:00+09:00"
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  return ''
}

/**
 * 기존 캘린더 일정을 슬롯에서 차감
 * 기존 일정과 겹치는 시간만큼 슬롯의 used를 증가시킴
 */
function subtractExistingEvents(
  slots: TimeSlot[],
  existingEvents: ExistingCalendarEvent[]
): void {
  for (const event of existingEvents) {
    const eventDate = event.date || extractDateFromISO(event.start)
    const eventStartTime = extractTimeFromISO(event.start)
    const eventEndTime = extractTimeFromISO(event.end)
    const eventStartMinutes = timeToMinutes(eventStartTime)
    const eventEndMinutes = timeToMinutes(eventEndTime)

    // 해당 날짜의 슬롯들 찾기
    for (const slot of slots) {
      if (slot.date !== eventDate) continue

      const slotStartMinutes = timeToMinutes(slot.start)
      const slotEndMinutes = timeToMinutes(slot.end)

      // 겹치는 구간 계산
      const overlapStart = Math.max(slotStartMinutes, eventStartMinutes)
      const overlapEnd = Math.min(slotEndMinutes, eventEndMinutes)

      if (overlapStart < overlapEnd) {
        // 겹치는 시간만큼 used 증가
        const overlapDuration = overlapEnd - overlapStart
        slot.used += overlapDuration
      }
    }
  }
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
 * 슬롯이 루틴 배치 가능한지 확인
 */
function canPlaceRoutineInSlot(slot: TimeSlot): boolean {
  return slot.slotType === 'routine' || slot.slotType === 'any'
}

/**
 * 슬롯이 프로젝트 배치 가능한지 확인
 */
function canPlaceProjectInSlot(slot: TimeSlot): boolean {
  return slot.slotType === 'project' || slot.slotType === 'any'
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
 * 루틴 배치 (대체 시간 찾기 포함)
 *
 * 1. 원래 요일 + 선호시간에 배치 시도
 * 2. 실패 시 원래 요일의 다른 시간에 배치 시도
 * 3. 실패 시 가장 가까운 다른 요일에 배치 시도
 */
function scheduleRoutines(
  routines: Routine[],
  slots: TimeSlot[],
  schedule: Map<string, ScheduledEvent[]>,
  alternatives: RoutineAlternative[]
): void {
  // 요일별 슬롯 그룹핑 (빠른 조회용)
  const slotsByDate = new Map<string, TimeSlot[]>()
  for (const slot of slots) {
    if (!slotsByDate.has(slot.date)) {
      slotsByDate.set(slot.date, [])
    }
    slotsByDate.get(slot.date)!.push(slot)
  }

  // 날짜별 요일 맵
  const dateToDay = new Map<string, string>()
  for (const slot of slots) {
    const slotDate = new Date(slot.date)
    dateToDay.set(slot.date, DAY_NAMES[slotDate.getDay()])
  }

  for (const routine of routines) {
    for (const task of routine.tasks) {
      const preferredTime = resolvePreferredTime(task.preferredTime)

      // 각 반복 요일에 대해 처리
      for (const slot of slots) {
        const slotDate = new Date(slot.date)
        const dayName = DAY_NAMES[slotDate.getDay()]

        // 이 날짜가 루틴 반복 요일인지 확인
        if (!task.repeat.includes(dayName)) continue

        // 이미 이 날짜에 이 루틴이 배치되었는지 확인
        const dayEvents = schedule.get(slot.date) || []
        const alreadyScheduled = dayEvents.some(
          e => e.title === task.name && e.type === 'routine'
        )
        if (alreadyScheduled) continue

        // 1단계: 선호 시간에 배치 시도
        let scheduled = false

        if (preferredTime) {
          // 선호 시간 슬롯 찾기 (루틴 배치 가능한 슬롯만)
          const preferredSlot = slots.find(
            s => s.date === slot.date && s.start === preferredTime && canPlaceRoutineInSlot(s)
          )

          if (preferredSlot && canFitInSlot(preferredSlot, task.duration)) {
            // 선호 시간에 배치 성공
            const event = scheduleInSlot(
              preferredSlot,
              task.duration,
              task.name,
              'routine',
              routine.filename
            )
            if (!schedule.has(slot.date)) {
              schedule.set(slot.date, [])
            }
            schedule.get(slot.date)!.push(event)
            scheduled = true
          }
        }

        // 2단계: 선호 시간 실패 → 같은 날 다른 시간에 배치
        if (!scheduled) {
          const sameDaySlots = slotsByDate.get(slot.date) || []

          for (const altSlot of sameDaySlots) {
            // 루틴 배치 가능한 슬롯만 체크
            if (!canPlaceRoutineInSlot(altSlot)) continue
            if (!canFitInSlot(altSlot, task.duration)) continue

            // 배치
            const event = scheduleInSlot(
              altSlot,
              task.duration,
              task.name,
              'routine',
              routine.filename
            )
            if (!schedule.has(slot.date)) {
              schedule.set(slot.date, [])
            }
            schedule.get(slot.date)!.push(event)

            // 대체 배치 기록 (선호 시간이 있었을 때만)
            if (preferredTime && altSlot.start !== preferredTime) {
              alternatives.push({
                routineName: task.name,
                originalDay: dayName,
                originalTime: preferredTime,
                scheduledDay: dayName,
                scheduledTime: altSlot.start,
                reason: 'slot_full'
              })
            }

            scheduled = true
            break
          }
        }

        // 3단계: 같은 날도 실패 → 가장 가까운 다른 날에 배치
        if (!scheduled) {
          const currentDate = new Date(slot.date)

          // 앞뒤 7일 내에서 가장 가까운 빈 슬롯 찾기
          const nearbyDates: string[] = []
          for (let offset = 1; offset <= 7; offset++) {
            // 이후 날짜
            const afterDate = new Date(currentDate)
            afterDate.setDate(afterDate.getDate() + offset)
            nearbyDates.push(formatDate(afterDate))

            // 이전 날짜
            const beforeDate = new Date(currentDate)
            beforeDate.setDate(beforeDate.getDate() - offset)
            nearbyDates.push(formatDate(beforeDate))
          }

          for (const nearbyDate of nearbyDates) {
            const nearbySlots = slotsByDate.get(nearbyDate) || []

            // 이 날에 이미 같은 루틴이 있는지 확인
            const nearbyDayEvents = schedule.get(nearbyDate) || []
            const alreadyOnNearby = nearbyDayEvents.some(
              e => e.title === task.name && e.type === 'routine'
            )
            if (alreadyOnNearby) continue

            for (const nearbySlot of nearbySlots) {
              // 루틴 배치 가능한 슬롯만 체크
              if (!canPlaceRoutineInSlot(nearbySlot)) continue
              if (!canFitInSlot(nearbySlot, task.duration)) continue

              // 배치
              const event = scheduleInSlot(
                nearbySlot,
                task.duration,
                task.name,
                'routine',
                routine.filename
              )
              if (!schedule.has(nearbyDate)) {
                schedule.set(nearbyDate, [])
              }
              schedule.get(nearbyDate)!.push(event)

              // 대체 배치 기록
              const nearbyDayName = dateToDay.get(nearbyDate) || ''
              alternatives.push({
                routineName: task.name,
                originalDay: dayName,
                originalTime: preferredTime || 'any',
                scheduledDay: nearbyDayName,
                scheduledTime: nearbySlot.start,
                reason: 'no_slot'
              })

              scheduled = true
              break
            }

            if (scheduled) break
          }
        }

        // 이 날짜는 처리 완료 (성공/실패 상관없이), 다음 날짜의 슬롯으로 이동
        // (이미 배치되었으므로 같은 날짜의 다른 슬롯은 건너뜀)
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
 * 태스크를 분할하여 배치 (Part 1, Part 2, ...)
 * 한 슬롯에 들어가지 않는 큰 태스크를 여러 파트로 나눠서 배치
 */
function scheduleTaskWithSplitting(
  task: Task,
  slots: TimeSlot[],
  schedule: Map<string, ScheduledEvent[]>,
  type: 'focus' | 'buffer',
  source: string,
  projectName: string  // 프로젝트 표시명
): number {
  let remainingDuration = task.duration
  let partNumber = 1
  let scheduledParts = 0

  // 가용 슬롯을 순회하며 남은 시간을 분할 배치
  for (const slot of slots) {
    if (remainingDuration <= 0) break

    // 프로젝트 배치 가능한 슬롯만 체크
    if (!canPlaceProjectInSlot(slot)) continue

    const availableInSlot = slot.duration - slot.used
    if (availableInSlot <= 0) continue

    // 이 슬롯에 배치할 시간 계산 (최소 30분 단위)
    const allocateTime = Math.min(remainingDuration, availableInSlot)

    // 너무 짧은 시간은 스킵 (최소 30분)
    if (allocateTime < 30) continue

    // 파트 이름 생성: [프로젝트명] 태스크명 (Part N)
    const totalParts = Math.ceil(task.duration / availableInSlot)
    const partSuffix = totalParts > 1 || partNumber > 1 ? ` (Part ${partNumber})` : ''
    const partName = `[${projectName}] ${task.name}${partSuffix}`

    // 배치
    const event = scheduleInSlot(
      slot,
      allocateTime,
      partName,
      type,
      source,
      `${task.id}-part${partNumber}`
    )

    if (!schedule.has(slot.date)) {
      schedule.set(slot.date, [])
    }
    schedule.get(slot.date)!.push(event)

    remainingDuration -= allocateTime
    partNumber++
    scheduledParts++
  }

  // 전체 태스크가 배치되었으면 1 반환, 일부만 배치되었어도 1 반환 (부분 배치 허용)
  return scheduledParts > 0 ? 1 : 0
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

    let taskScheduled = false

    // 1차 시도: 원래 로직으로 한 슬롯에 배치
    for (const slot of slots) {
      // 프로젝트 배치 가능한 슬롯만 체크
      if (!canPlaceProjectInSlot(slot)) continue
      if (!canFitInSlot(slot, task.duration)) continue
      if (!isSlotSuitableForBlockType(slot, task.blockType)) continue

      // long 타입은 3시간 이상 슬롯에만
      if (task.blockType === 'long' && slot.duration - slot.used < 180) continue

      // 배치: [프로젝트명] 태스크명 형식
      const event = scheduleInSlot(
        slot,
        task.duration,
        `[${project.project}] ${task.name}`,
        type,
        project.filename,
        task.id
      )

      if (!schedule.has(slot.date)) {
        schedule.set(slot.date, [])
      }
      schedule.get(slot.date)!.push(event)

      taskScheduled = true
      break
    }

    // 2차 시도: 한 슬롯에 안 들어가면 분할 배치
    if (!taskScheduled) {
      const splitResult = scheduleTaskWithSplitting(
        task,
        slots,
        schedule,
        type,
        project.filename,
        project.project  // 프로젝트 표시명 전달
      )
      if (splitResult > 0) {
        taskScheduled = true
      }
    }

    if (taskScheduled) {
      scheduledTasks.add(taskKey)
      scheduled++
    }
  }

  return scheduled
}

/**
 * 메인 스케줄링 함수
 *
 * 스케줄링 우선순위:
 * 1. 기존 Google Calendar 일정 (existingEvents) - 슬롯에서 차감
 * 2. 루틴 - 고정 반복 일정
 * 3. Focus 프로젝트 - priority/deadline 순으로 배치
 * 4. Buffer 프로젝트 - priority/deadline 순으로 배치
 */
export function createSchedule(
  projects: Project[],
  routines: Routine[],
  config: Config,
  startDate: string,
  weeks: number,
  existingEvents: ExistingCalendarEvent[] = []  // 기존 캘린더 일정 (선택적)
): ScheduleResult {
  const start = new Date(startDate)
  const dates = getDateRange(start, weeks)
  const slots = calculateAvailableSlots(config, dates)
  const schedule = new Map<string, ScheduledEvent[]>()
  const scheduledTasks = new Set<string>()
  const routineAlternatives: RoutineAlternative[] = []

  // 0. 기존 캘린더 일정으로 슬롯 차감 (최우선)
  if (existingEvents.length > 0) {
    subtractExistingEvents(slots, existingEvents)
  }

  // 1. 루틴 배치 (2순위) - 대체 시간 추적 포함
  scheduleRoutines(routines, slots, schedule, routineAlternatives)

  // 파일명 비교 시 .md 확장자 제거하여 정규화
  const normalizeFilename = (name: string) => name?.replace(/\.md$/, '') || ''

  // 2. Focus 프로젝트들 배치 (role='focus'인 모든 프로젝트)
  // role이 명시되어 있으면 사용, 아니면 config.focus와 비교
  // priority/deadline 기준으로 정렬하여 중요한 프로젝트 먼저 배치
  const focusProjects = projects.filter(p =>
    p.role === 'focus' ||
    (!p.role && normalizeFilename(p.filename) === normalizeFilename(config.focus))
  )
  const sortedFocusProjects = sortProjectsByPriority(focusProjects)
  let focusScheduled = 0
  for (const focusProject of sortedFocusProjects) {
    focusScheduled += scheduleProjectTasks(
      focusProject,
      slots,
      schedule,
      'focus',
      scheduledTasks
    )
  }

  // 3. Buffer 프로젝트들 배치 (role='buffer'인 모든 프로젝트)
  // priority/deadline 기준으로 정렬
  const bufferProjects = projects.filter(p =>
    p.role === 'buffer' ||
    (!p.role && normalizeFilename(p.filename) === normalizeFilename(config.buffer))
  )
  const sortedBufferProjects = sortProjectsByPriority(bufferProjects)
  let bufferScheduled = 0
  for (const bufferProject of sortedBufferProjects) {
    bufferScheduled += scheduleProjectTasks(
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
    routineAlternatives: routineAlternatives.length > 0 ? routineAlternatives : undefined,
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
  maxWeeks: number = 52, // 최대 1년
  existingEvents: ExistingCalendarEvent[] = []
): { requiredWeeks: number; totalTasks: number; totalHours: number } {
  const totalProjectTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0)
  const totalMinutes = projects.reduce(
    (sum, p) => sum + p.tasks.reduce((taskSum, t) => taskSum + t.duration, 0),
    0
  )

  // 최소 1주부터 시작해서 모든 태스크가 배치될 때까지 증가
  for (let weeks = 1; weeks <= maxWeeks; weeks++) {
    const result = createSchedule(projects, routines, config, startDate, weeks, existingEvents)

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
