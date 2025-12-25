import { Router } from 'express'
import { readFile } from 'fs/promises'
import { parse } from 'yaml'
import path from 'path'
import {
  getCalendarEvents,
  syncToCalendar,
  isAuthenticated,
} from '../services/googleCalendar.js'
import type { Config, DaySchedule } from '../types/index.js'

const router = Router()

const CONFIG_PATH = path.resolve(process.cwd(), '../data/config.yaml')

// GET /api/calendar/events
router.get('/events', async (req, res) => {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      res.status(401).json({ error: 'Not authenticated with Google' })
      return
    }

    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' })
      return
    }

    // config에서 calendar_id 읽기
    const configContent = await readFile(CONFIG_PATH, 'utf-8')
    const config = parse(configContent) as Config

    const events = await getCalendarEvents(
      config.calendar_id || 'primary',
      startDate as string,
      endDate as string
    )

    res.json({ events })
  } catch (error) {
    console.error('Calendar events error:', error)
    res.status(500).json({ error: 'Failed to fetch calendar events' })
  }
})

// POST /api/calendar/sync
router.post('/sync', async (req, res) => {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      res.status(401).json({ error: 'Not authenticated with Google' })
      return
    }

    const { schedule } = req.body as { schedule: DaySchedule[] }

    if (!schedule || !Array.isArray(schedule)) {
      res.status(400).json({ error: 'Invalid schedule data' })
      return
    }

    // config에서 calendar_id 읽기
    const configContent = await readFile(CONFIG_PATH, 'utf-8')
    const config = parse(configContent) as Config

    const result = await syncToCalendar(config.calendar_id || 'primary', schedule)

    res.json({ success: true, ...result })
  } catch (error) {
    console.error('Calendar sync error:', error)
    res.status(500).json({ error: 'Failed to sync with calendar' })
  }
})

export default router
