import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { parseProject } from '../parsers/projectParser.js'
import { parseRoutine, isRoutineFile } from '../parsers/routineParser.js'
import { createSchedule } from '../services/scheduler.js'
import type { Config, Project, Routine } from '../types/index.js'

/**
 * Create a test Express app with mock implementations
 * This avoids file system dependencies and external API calls
 */
export function createTestApp(mockConfig?: Partial<Config>) {
  const app = express()
  const upload = multer({ storage: multer.memoryStorage() })

  // Default test config
  const testConfig: Config = {
    available: {
      Mon: [{ time: '09:00-10:00', type: 'any' }],
      Tue: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Wed: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Thu: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Fri: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Sat: [{ time: '21:00-24:00', type: 'any' }],
      Sun: [{ time: '21:00-24:00', type: 'any' }],
    },
    focus: 'instagram-auto',
    buffer: 'data-briefing',
    schedule_weeks: 2,
    calendar_id: 'primary',
    ...mockConfig,
  }

  let currentConfig = { ...testConfig }

  app.use(cors())
  app.use(express.json())

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  // GET /api/config
  app.get('/api/config', (req, res) => {
    res.json(currentConfig)
  })

  // PUT /api/config
  app.put('/api/config', (req, res) => {
    currentConfig = { ...currentConfig, ...req.body }
    res.json({ success: true })
  })

  // POST /api/parse
  app.post('/api/parse', upload.array('files'), (req, res) => {
    try {
      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' })
        return
      }

      const projects: Project[] = []
      const routines: Routine[] = []

      for (const file of files) {
        const content = file.buffer.toString('utf-8')
        const filename = file.originalname

        if (isRoutineFile(content)) {
          routines.push(parseRoutine(content, filename))
        } else {
          projects.push(parseProject(content, filename))
        }
      }

      res.json({ projects, routines })
    } catch (error) {
      console.error('Parse error:', error)
      res.status(500).json({ error: 'Failed to parse files' })
    }
  })

  // POST /api/schedule
  app.post('/api/schedule', (req, res) => {
    try {
      const { projects, routines, startDate, weeks } = req.body as {
        projects: Project[]
        routines: Routine[]
        startDate: string
        weeks?: number
      }

      const start = startDate || new Date().toISOString().split('T')[0]
      const weekCount = weeks || currentConfig.schedule_weeks || 2

      const result = createSchedule(
        projects || [],
        routines || [],
        currentConfig,
        start,
        weekCount
      )

      res.json(result)
    } catch (error) {
      console.error('Schedule error:', error)
      res.status(500).json({ error: 'Failed to create schedule' })
    }
  })

  // Mock auth endpoints
  app.get('/api/auth/status', (req, res) => {
    res.json({ authenticated: false })
  })

  app.get('/api/auth/google', (req, res) => {
    res.redirect('https://accounts.google.com/mock-oauth')
  })

  // Mock calendar endpoints
  app.get('/api/calendar/events', (req, res) => {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' })
      return
    }

    // Mock: return empty events for tests
    res.json({ events: [] })
  })

  app.post('/api/calendar/sync', (req, res) => {
    const { schedule } = req.body

    if (!schedule || !Array.isArray(schedule)) {
      res.status(400).json({ error: 'Invalid schedule data' })
      return
    }

    // Mock: pretend sync succeeded
    const totalEvents = schedule.reduce(
      (sum: number, day: { events: unknown[] }) => sum + day.events.length,
      0
    )

    res.json({ success: true, created: totalEvents, failed: 0 })
  })

  return app
}
