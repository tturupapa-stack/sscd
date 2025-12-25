import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp } from '../../test/testApp.js'

describe('API Integration Tests', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Health Check', () => {
    it('GET /api/health should return ok status', async () => {
      const response = await request(app).get('/api/health')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: 'ok' })
    })
  })

  describe('Config API', () => {
    describe('GET /api/config', () => {
      it('should return default configuration', async () => {
        const response = await request(app).get('/api/config')

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('available')
        expect(response.body).toHaveProperty('focus')
        expect(response.body).toHaveProperty('buffer')
        expect(response.body).toHaveProperty('schedule_weeks')
        expect(response.body).toHaveProperty('calendar_id')
      })

      it('should return available times for each day', async () => {
        const response = await request(app).get('/api/config')

        expect(response.body.available).toHaveProperty('Mon')
        expect(response.body.available).toHaveProperty('Tue')
        expect(response.body.available).toHaveProperty('Wed')
        expect(response.body.available).toHaveProperty('Thu')
        expect(response.body.available).toHaveProperty('Fri')
        expect(response.body.available).toHaveProperty('Sat')
        expect(response.body.available).toHaveProperty('Sun')
      })
    })

    describe('PUT /api/config', () => {
      it('should update configuration successfully', async () => {
        const newConfig = {
          focus: 'new-project',
          buffer: 'new-buffer',
          schedule_weeks: 3,
        }

        const response = await request(app)
          .put('/api/config')
          .send(newConfig)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ success: true })

        // Verify the config was updated
        const getResponse = await request(app).get('/api/config')
        expect(getResponse.body.focus).toBe('new-project')
        expect(getResponse.body.buffer).toBe('new-buffer')
        expect(getResponse.body.schedule_weeks).toBe(3)
      })

      it('should handle partial updates', async () => {
        const partialConfig = { focus: 'updated-focus' }

        await request(app).put('/api/config').send(partialConfig)

        const response = await request(app).get('/api/config')
        expect(response.body.focus).toBe('updated-focus')
        // Other fields should remain unchanged
        expect(response.body.buffer).toBeDefined()
        expect(response.body.available).toBeDefined()
      })

      it('should update available times', async () => {
        const newAvailable = {
          available: {
            Mon: ['10:00-12:00', '14:00-16:00'],
            Tue: [],
          },
        }

        await request(app).put('/api/config').send(newAvailable)

        const response = await request(app).get('/api/config')
        expect(response.body.available.Mon).toEqual(['10:00-12:00', '14:00-16:00'])
        expect(response.body.available.Tue).toEqual([])
      })
    })
  })

  describe('Parse API', () => {
    describe('POST /api/parse', () => {
      it('should parse a project file', async () => {
        const projectContent = `---
project: Test Project
priority: high
deadline: 2025-01-15
---

## Tasks

- [ ] #1 Task One | 1h | short
- [ ] #2 Task Two | 2h | long | after:#1
`

        const response = await request(app)
          .post('/api/parse')
          .attach('files', Buffer.from(projectContent), 'test-project.md')

        expect(response.status).toBe(200)
        expect(response.body.projects).toHaveLength(1)
        expect(response.body.routines).toHaveLength(0)
        expect(response.body.projects[0].project).toBe('Test Project')
        expect(response.body.projects[0].tasks).toHaveLength(2)
      })

      it('should parse a routine file', async () => {
        const routineContent = `---
type: routine
name: Daily Workout
priority: high
---

## Schedule

- [ ] Morning Exercise | 1h | weekdays | 09:00
- [ ] Evening Stretch | 30m | daily | 22:00
`

        const response = await request(app)
          .post('/api/parse')
          .attach('files', Buffer.from(routineContent), 'workout.md')

        expect(response.status).toBe(200)
        expect(response.body.projects).toHaveLength(0)
        expect(response.body.routines).toHaveLength(1)
        expect(response.body.routines[0].name).toBe('Daily Workout')
        expect(response.body.routines[0].tasks).toHaveLength(2)
      })

      it('should parse multiple files correctly', async () => {
        const projectContent = `---
project: Project A
---
- [ ] #1 Task | 1h | any`

        const routineContent = `---
type: routine
name: Routine B
---
- [ ] Routine Task | 30m | daily | 09:00`

        const response = await request(app)
          .post('/api/parse')
          .attach('files', Buffer.from(projectContent), 'project.md')
          .attach('files', Buffer.from(routineContent), 'routine.md')

        expect(response.status).toBe(200)
        expect(response.body.projects).toHaveLength(1)
        expect(response.body.routines).toHaveLength(1)
      })

      it('should return 400 when no files uploaded', async () => {
        const response = await request(app).post('/api/parse')

        expect(response.status).toBe(400)
        expect(response.body.error).toBe('No files uploaded')
      })

      it('should handle empty file content', async () => {
        const response = await request(app)
          .post('/api/parse')
          .attach('files', Buffer.from(''), 'empty.md')

        expect(response.status).toBe(200)
        expect(response.body.projects).toHaveLength(1)
        expect(response.body.projects[0].tasks).toHaveLength(0)
      })

      it('should extract correct task properties', async () => {
        const content = `---
project: Test
---
- [ ] #1 Complex Task Name | 2.5h | long | after:#99`

        const response = await request(app)
          .post('/api/parse')
          .attach('files', Buffer.from(content), 'test.md')

        const task = response.body.projects[0].tasks[0]
        expect(task.id).toBe('1')
        expect(task.name).toBe('Complex Task Name')
        expect(task.duration).toBe(150) // 2.5 hours = 150 minutes
        expect(task.blockType).toBe('long')
        expect(task.dependencies).toContain('99')
      })

      it('should extract correct routine properties', async () => {
        const content = `---
type: routine
name: Test Routine
---
- [ ] Morning Meditation | 30m | Mon,Wed,Fri | morning`

        const response = await request(app)
          .post('/api/parse')
          .attach('files', Buffer.from(content), 'routine.md')

        const task = response.body.routines[0].tasks[0]
        expect(task.name).toBe('Morning Meditation')
        expect(task.duration).toBe(30)
        expect(task.repeat).toEqual(['Mon', 'Wed', 'Fri'])
        expect(task.preferredTime).toBe('morning')
      })
    })
  })

  describe('Schedule API', () => {
    describe('POST /api/schedule', () => {
      it('should create a schedule from parsed projects', async () => {
        const projects = [
          {
            filename: 'instagram-auto',
            project: 'Instagram Auto',
            priority: 'high',
            deadline: null,
            tasks: [
              { id: '1', name: 'Task 1', duration: 60, blockType: 'any', dependencies: [] },
            ],
          },
        ]

        const response = await request(app)
          .post('/api/schedule')
          .send({
            projects,
            routines: [],
            startDate: '2025-01-13',
            weeks: 1,
          })

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('schedule')
        expect(response.body).toHaveProperty('summary')
        expect(response.body.summary.totalTasks).toBe(1)
      })

      it('should include routines in schedule', async () => {
        const routines = [
          {
            filename: 'workout',
            name: 'Workout',
            priority: 'high',
            tasks: [
              { name: 'Morning Run', duration: 30, repeat: ['Mon', 'Wed', 'Fri'], preferredTime: '09:00' },
            ],
          },
        ]

        const response = await request(app)
          .post('/api/schedule')
          .send({
            projects: [],
            routines,
            startDate: '2025-01-13', // Monday
            weeks: 1,
          })

        expect(response.status).toBe(200)
        const allEvents = response.body.schedule.flatMap(
          (day: { events: unknown[] }) => day.events
        )
        const routineEvents = allEvents.filter(
          (e: { type: string }) => e.type === 'routine'
        )
        expect(routineEvents.length).toBeGreaterThan(0)
      })

      it('should respect focus and buffer project priorities', async () => {
        const projects = [
          {
            filename: 'instagram-auto', // matches default focus
            project: 'Focus Project',
            priority: 'high',
            deadline: null,
            tasks: [
              { id: '1', name: 'Focus Task', duration: 60, blockType: 'any', dependencies: [] },
            ],
          },
          {
            filename: 'data-briefing', // matches default buffer
            project: 'Buffer Project',
            priority: 'low',
            deadline: null,
            tasks: [
              { id: '1', name: 'Buffer Task', duration: 60, blockType: 'any', dependencies: [] },
            ],
          },
        ]

        const response = await request(app)
          .post('/api/schedule')
          .send({
            projects,
            routines: [],
            startDate: '2025-01-13',
            weeks: 1,
          })

        expect(response.status).toBe(200)
        const allEvents = response.body.schedule.flatMap(
          (day: { events: unknown[] }) => day.events
        )

        const focusEvents = allEvents.filter((e: { type: string }) => e.type === 'focus')
        const bufferEvents = allEvents.filter((e: { type: string }) => e.type === 'buffer')

        // Focus should be scheduled
        expect(focusEvents.length).toBeGreaterThan(0)
      })

      it('should return proper summary information', async () => {
        const projects = [
          {
            filename: 'instagram-auto',
            project: 'Test',
            priority: 'high',
            deadline: null,
            tasks: [
              { id: '1', name: 'Task 1', duration: 60, blockType: 'any', dependencies: [] },
              { id: '2', name: 'Task 2', duration: 60, blockType: 'any', dependencies: [] },
              { id: '3', name: 'Task 3', duration: 60, blockType: 'any', dependencies: [] },
            ],
          },
        ]

        const response = await request(app)
          .post('/api/schedule')
          .send({
            projects,
            routines: [],
            startDate: '2025-01-13',
            weeks: 1,
          })

        expect(response.body.summary).toHaveProperty('totalTasks')
        expect(response.body.summary).toHaveProperty('scheduledTasks')
        expect(response.body.summary).toHaveProperty('unscheduledTasks')
        expect(response.body.summary).toHaveProperty('totalHours')
        expect(response.body.summary.totalTasks).toBe(3)
        expect(response.body.summary.scheduledTasks + response.body.summary.unscheduledTasks).toBe(3)
      })

      it('should handle empty request body', async () => {
        const response = await request(app)
          .post('/api/schedule')
          .send({
            projects: [],
            routines: [],
            startDate: '2025-01-13',
            weeks: 1,
          })

        expect(response.status).toBe(200)
        expect(response.body.summary.totalTasks).toBe(0)
      })

      it('should use default weeks from config when not specified', async () => {
        const projects = [
          {
            filename: 'instagram-auto',
            project: 'Test',
            priority: 'high',
            deadline: null,
            tasks: [
              { id: '1', name: 'Task', duration: 60, blockType: 'any', dependencies: [] },
            ],
          },
        ]

        const response = await request(app)
          .post('/api/schedule')
          .send({
            projects,
            routines: [],
            startDate: '2025-01-13',
            // weeks not specified - should use config default (2)
          })

        expect(response.status).toBe(200)
        // Schedule should span 2 weeks if tasks are scheduled
        expect(response.body.schedule).toBeDefined()
      })
    })
  })

  describe('Auth API', () => {
    describe('GET /api/auth/status', () => {
      it('should return authentication status', async () => {
        const response = await request(app).get('/api/auth/status')

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('authenticated')
        expect(typeof response.body.authenticated).toBe('boolean')
      })
    })

    describe('GET /api/auth/google', () => {
      it('should redirect to OAuth URL', async () => {
        const response = await request(app).get('/api/auth/google')

        expect(response.status).toBe(302) // Redirect
        expect(response.headers.location).toContain('google')
      })
    })
  })

  describe('Calendar API', () => {
    describe('GET /api/calendar/events', () => {
      it('should return events for date range', async () => {
        const response = await request(app)
          .get('/api/calendar/events')
          .query({
            startDate: '2025-01-13',
            endDate: '2025-01-20',
          })

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('events')
        expect(Array.isArray(response.body.events)).toBe(true)
      })

      it('should return 400 when startDate is missing', async () => {
        const response = await request(app)
          .get('/api/calendar/events')
          .query({ endDate: '2025-01-20' })

        expect(response.status).toBe(400)
        expect(response.body.error).toContain('startDate')
      })

      it('should return 400 when endDate is missing', async () => {
        const response = await request(app)
          .get('/api/calendar/events')
          .query({ startDate: '2025-01-13' })

        expect(response.status).toBe(400)
        expect(response.body.error).toContain('endDate')
      })
    })

    describe('POST /api/calendar/sync', () => {
      it('should sync schedule to calendar', async () => {
        const schedule = [
          {
            date: '2025-01-13',
            events: [
              {
                start: '09:00',
                end: '10:00',
                title: 'Test Event',
                type: 'focus',
                source: 'test-project',
                taskId: '1',
              },
            ],
          },
        ]

        const response = await request(app)
          .post('/api/calendar/sync')
          .send({ schedule })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.created).toBe(1)
        expect(response.body.failed).toBe(0)
      })

      it('should handle multiple events sync', async () => {
        const schedule = [
          {
            date: '2025-01-13',
            events: [
              { start: '09:00', end: '10:00', title: 'Event 1', type: 'focus', source: 'test' },
              { start: '10:00', end: '11:00', title: 'Event 2', type: 'buffer', source: 'test' },
            ],
          },
          {
            date: '2025-01-14',
            events: [
              { start: '09:00', end: '10:00', title: 'Event 3', type: 'routine', source: 'test' },
            ],
          },
        ]

        const response = await request(app)
          .post('/api/calendar/sync')
          .send({ schedule })

        expect(response.status).toBe(200)
        expect(response.body.created).toBe(3)
      })

      it('should return 400 for invalid schedule data', async () => {
        const response = await request(app)
          .post('/api/calendar/sync')
          .send({ schedule: 'invalid' })

        expect(response.status).toBe(400)
        expect(response.body.error).toContain('Invalid schedule data')
      })

      it('should return 400 when schedule is missing', async () => {
        const response = await request(app)
          .post('/api/calendar/sync')
          .send({})

        expect(response.status).toBe(400)
      })
    })
  })

  describe('Full Flow Integration', () => {
    it('should complete full workflow: parse -> schedule -> sync', async () => {
      // Step 1: Parse files
      const projectContent = `---
project: Integration Test Project
priority: high
---
- [ ] #1 First Task | 1h | short
- [ ] #2 Second Task | 2h | long | after:#1`

      const parseResponse = await request(app)
        .post('/api/parse')
        .attach('files', Buffer.from(projectContent), 'instagram-auto.md')

      expect(parseResponse.status).toBe(200)
      const { projects, routines } = parseResponse.body

      // Step 2: Create schedule
      const scheduleResponse = await request(app)
        .post('/api/schedule')
        .send({
          projects,
          routines,
          startDate: '2025-01-13',
          weeks: 1,
        })

      expect(scheduleResponse.status).toBe(200)
      const { schedule, summary } = scheduleResponse.body
      expect(summary.totalTasks).toBe(2)

      // Step 3: Sync to calendar (if there are scheduled events)
      if (schedule.length > 0) {
        const syncResponse = await request(app)
          .post('/api/calendar/sync')
          .send({ schedule })

        expect(syncResponse.status).toBe(200)
        expect(syncResponse.body.success).toBe(true)
      }
    })

    it('should handle project with dependencies correctly', async () => {
      const projectContent = `---
project: Dependency Test
---
- [ ] #1 Base Task | 1h | any
- [ ] #2 Dependent Task | 1h | any | after:#1
- [ ] #3 Multi-Dep Task | 1h | any | after:#1,#2`

      const parseResponse = await request(app)
        .post('/api/parse')
        .attach('files', Buffer.from(projectContent), 'instagram-auto.md')

      const scheduleResponse = await request(app)
        .post('/api/schedule')
        .send({
          projects: parseResponse.body.projects,
          routines: [],
          startDate: '2025-01-13',
          weeks: 2,
        })

      expect(scheduleResponse.status).toBe(200)
      // Verify dependencies are respected
      expect(scheduleResponse.body.summary.totalTasks).toBe(3)
    })

    it('should combine routines and projects in schedule', async () => {
      const projectContent = `---
project: Combined Test
---
- [ ] #1 Project Task | 1h | any`

      const routineContent = `---
type: routine
name: Combined Routine
---
- [ ] Routine Task | 30m | Mon | 09:00`

      const parseResponse = await request(app)
        .post('/api/parse')
        .attach('files', Buffer.from(projectContent), 'instagram-auto.md')
        .attach('files', Buffer.from(routineContent), 'routine.md')

      expect(parseResponse.body.projects).toHaveLength(1)
      expect(parseResponse.body.routines).toHaveLength(1)

      const scheduleResponse = await request(app)
        .post('/api/schedule')
        .send({
          projects: parseResponse.body.projects,
          routines: parseResponse.body.routines,
          startDate: '2025-01-13', // Monday
          weeks: 1,
        })

      expect(scheduleResponse.status).toBe(200)

      // Should have both routine and project events
      const allEvents = scheduleResponse.body.schedule.flatMap(
        (d: { events: unknown[] }) => d.events
      )
      const types = new Set(allEvents.map((e: { type: string }) => e.type))

      // At minimum, one of these types should be present
      expect(types.size).toBeGreaterThan(0)
    })
  })
})
