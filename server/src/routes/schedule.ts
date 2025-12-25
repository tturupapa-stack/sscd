import { Router } from 'express'
import { readFile } from 'fs/promises'
import { parse } from 'yaml'
import path from 'path'
import { createSchedule, calculateRequiredWeeks } from '../services/scheduler.js'
import { getCalendarEvents, isAuthenticated } from '../services/googleCalendar.js'
import type { Config, Project, Routine, ExistingCalendarEvent } from '../types/index.js'

const router = Router()

const CONFIG_PATH = path.resolve(process.cwd(), '../data/config.yaml')

// POST /api/schedule
router.post('/', async (req, res) => {
  try {
    const { projects, routines, startDate, weeks, includeExistingEvents = true } = req.body as {
      projects: Project[]
      routines: Routine[]
      startDate: string
      weeks?: number
      includeExistingEvents?: boolean  // 기존 캘린더 일정 반영 여부 (기본: true)
    }

    // config 읽기
    const configContent = await readFile(CONFIG_PATH, 'utf-8')
    const config = parse(configContent) as Config

    // 시작일 기본값: 오늘
    const start = startDate || new Date().toISOString().split('T')[0]
    const weekCount = weeks || config.schedule_weeks || 2

    // 종료일 계산
    const endDate = new Date(start)
    endDate.setDate(endDate.getDate() + weekCount * 7)
    const end = endDate.toISOString().split('T')[0]

    // 기존 캘린더 일정 가져오기 (인증된 경우에만)
    let existingEvents: ExistingCalendarEvent[] = []
    if (includeExistingEvents) {
      try {
        const authenticated = await isAuthenticated()
        if (authenticated) {
          const calendarEvents = await getCalendarEvents(
            config.calendar_id || 'primary',
            start,
            end
          )
          existingEvents = calendarEvents.map(e => ({
            id: e.id,
            title: e.title,
            start: e.start,
            end: e.end,
          }))
        }
      } catch (err) {
        // 캘린더 조회 실패해도 스케줄링은 계속 진행
        console.warn('Failed to fetch existing calendar events:', err)
      }
    }

    const result = createSchedule(projects, routines, config, start, weekCount, existingEvents)

    res.json(result)
  } catch (error) {
    console.error('Schedule error:', error)
    res.status(500).json({ error: 'Failed to create schedule' })
  }
})

// POST /api/schedule/estimate - 필요 기간 계산
router.post('/estimate', async (req, res) => {
  try {
    const { projects, routines, startDate } = req.body as {
      projects: Project[]
      routines: Routine[]
      startDate: string
    }

    // config 읽기
    const configContent = await readFile(CONFIG_PATH, 'utf-8')
    const config = parse(configContent) as Config

    // 시작일 기본값: 오늘
    const start = startDate || new Date().toISOString().split('T')[0]

    const estimate = calculateRequiredWeeks(projects, routines, config, start)

    res.json(estimate)
  } catch (error) {
    console.error('Estimate error:', error)
    res.status(500).json({ error: 'Failed to estimate required weeks' })
  }
})

export default router
