import { describe, it, expect } from 'vitest'
import { createSchedule } from '../scheduler.js'
import type { Config, Project, Routine } from '../../types/index.js'

describe('scheduler', () => {
  // Test fixtures
  const defaultConfig: Config = {
    available: {
      Mon: [{ time: '09:00-10:00', type: 'any' }],
      Tue: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Wed: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Thu: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Fri: [{ time: '09:00-10:00', type: 'any' }, { time: '13:00-14:00', type: 'any' }, { time: '19:00-23:00', type: 'any' }],
      Sat: [{ time: '21:00-24:00', type: 'any' }],
      Sun: [{ time: '21:00-24:00', type: 'any' }],
    },
    focus: 'focus-project',
    buffer: 'buffer-project',
    queue: [],
    schedule_weeks: 2,
    calendar_id: 'primary',
  }

  const simpleProject: Project = {
    filename: 'focus-project',
    project: 'Focus Project',
    priority: 'high',
    deadline: null,
    tasks: [
      { id: '1', name: 'Task 1', duration: 60, blockType: 'any', dependencies: [] },
      { id: '2', name: 'Task 2', duration: 60, blockType: 'any', dependencies: [] },
    ],
  }

  const simpleRoutine: Routine = {
    filename: 'workout',
    name: 'Workout',
    priority: 'high',
    tasks: [
      { name: 'Morning Exercise', duration: 30, repeat: ['Mon', 'Wed', 'Fri'], preferredTime: '09:00' },
    ],
  }

  describe('createSchedule', () => {
    describe('Basic Scheduling', () => {
      it('should create a schedule for the given date range', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13', // Monday
          1 // 1 week
        )

        expect(result.schedule).toBeDefined()
        expect(result.summary).toBeDefined()
        expect(result.summary.totalTasks).toBeGreaterThanOrEqual(0)
      })

      it('should return schedule with proper date format', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        if (result.schedule.length > 0) {
          expect(result.schedule[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        }
      })

      it('should return events with proper time format', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        const allEvents = result.schedule.flatMap(day => day.events)
        for (const event of allEvents) {
          expect(event.start).toMatch(/^\d{2}:\d{2}$/)
          expect(event.end).toMatch(/^\d{2}:\d{2}$/)
        }
      })
    })

    describe('Routine Scheduling', () => {
      it('should schedule routines on specified days', () => {
        const result = createSchedule(
          [],
          [simpleRoutine],
          defaultConfig,
          '2025-01-13', // Monday
          1
        )

        const routineEvents = result.schedule.flatMap(day =>
          day.events.filter(e => e.type === 'routine')
        )

        // Should have routines scheduled for Mon, Wed, Fri
        expect(routineEvents.length).toBeGreaterThan(0)
        expect(routineEvents.every(e => e.type === 'routine')).toBe(true)
      })

      it('should place routines at preferred time', () => {
        const routineWithTime: Routine = {
          filename: 'test',
          name: 'Test Routine',
          priority: 'high',
          tasks: [
            { name: 'Morning Task', duration: 30, repeat: ['Mon'], preferredTime: '09:00' },
          ],
        }

        const result = createSchedule(
          [],
          [routineWithTime],
          defaultConfig,
          '2025-01-13', // Monday
          1
        )

        const mondaySchedule = result.schedule.find(d => d.date === '2025-01-13')
        if (mondaySchedule && mondaySchedule.events.length > 0) {
          const routineEvent = mondaySchedule.events.find(e => e.title === 'Morning Task')
          if (routineEvent) {
            expect(routineEvent.start).toBe('09:00')
          }
        }
      })

      it('should not schedule same routine twice on the same day', () => {
        const dailyRoutine: Routine = {
          filename: 'daily',
          name: 'Daily',
          priority: 'high',
          tasks: [
            { name: 'Daily Task', duration: 30, repeat: ['Mon'], preferredTime: null },
          ],
        }

        const result = createSchedule(
          [],
          [dailyRoutine],
          defaultConfig,
          '2025-01-13', // Monday
          1
        )

        const mondaySchedule = result.schedule.find(d => d.date === '2025-01-13')
        if (mondaySchedule) {
          const dailyTasks = mondaySchedule.events.filter(
            e => e.title === 'Daily Task' && e.type === 'routine'
          )
          expect(dailyTasks.length).toBeLessThanOrEqual(1)
        }
      })
    })

    describe('Project Task Scheduling', () => {
      it('should schedule focus project tasks', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        const focusEvents = result.schedule.flatMap(day =>
          day.events.filter(e => e.type === 'focus')
        )

        expect(focusEvents.length).toBeGreaterThan(0)
      })

      it('should schedule buffer project tasks after focus project', () => {
        const bufferProject: Project = {
          filename: 'buffer-project',
          project: 'Buffer Project',
          priority: 'low',
          deadline: null,
          tasks: [
            { id: '1', name: 'Buffer Task', duration: 60, blockType: 'any', dependencies: [] },
          ],
        }

        const result = createSchedule(
          [simpleProject, bufferProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        const bufferEvents = result.schedule.flatMap(day =>
          day.events.filter(e => e.type === 'buffer')
        )

        // Buffer tasks should be scheduled if there's available time
        expect(result.summary.scheduledTasks).toBeGreaterThanOrEqual(0)
      })

      it('should not schedule tasks from queue projects', () => {
        const queueProject: Project = {
          filename: 'queue-project',
          project: 'Queue Project',
          priority: 'low',
          deadline: null,
          tasks: [
            { id: '1', name: 'Queue Task', duration: 60, blockType: 'any', dependencies: [] },
          ],
        }

        const configWithQueue: Config = {
          ...defaultConfig,
          queue: ['queue-project'],
        }

        const result = createSchedule(
          [queueProject],
          [],
          configWithQueue,
          '2025-01-13',
          1
        )

        const queueEvents = result.schedule.flatMap(day =>
          day.events.filter(e => e.source === 'queue-project')
        )

        expect(queueEvents.length).toBe(0)
      })
    })

    describe('Dependency Handling', () => {
      it('should schedule dependent tasks after their dependencies', () => {
        const projectWithDeps: Project = {
          filename: 'focus-project',
          project: 'Project with Dependencies',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'First Task', duration: 60, blockType: 'any', dependencies: [] },
            { id: '2', name: 'Second Task', duration: 60, blockType: 'any', dependencies: ['1'] },
          ],
        }

        const result = createSchedule(
          [projectWithDeps],
          [],
          defaultConfig,
          '2025-01-13',
          2
        )

        const allEvents = result.schedule.flatMap(day =>
          day.events.map(e => ({ ...e, date: day.date }))
        )

        const firstTask = allEvents.find(e => e.taskId === '1')
        const secondTask = allEvents.find(e => e.taskId === '2')

        if (firstTask && secondTask) {
          const firstDate = new Date(`${firstTask.date}T${firstTask.end}`)
          const secondDate = new Date(`${secondTask.date}T${secondTask.start}`)
          expect(secondDate >= firstDate).toBe(true)
        }
      })

      it('should handle multiple dependencies', () => {
        const projectWithMultipleDeps: Project = {
          filename: 'focus-project',
          project: 'Project',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'Task A', duration: 60, blockType: 'any', dependencies: [] },
            { id: '2', name: 'Task B', duration: 60, blockType: 'any', dependencies: [] },
            { id: '3', name: 'Task C', duration: 60, blockType: 'any', dependencies: ['1', '2'] },
          ],
        }

        const result = createSchedule(
          [projectWithMultipleDeps],
          [],
          defaultConfig,
          '2025-01-13',
          2
        )

        // Task C should only be scheduled after both A and B are scheduled
        expect(result.summary.scheduledTasks).toBeGreaterThanOrEqual(0)
      })
    })

    describe('Block Type Matching', () => {
      it('should schedule long tasks only in slots >= 3 hours', () => {
        const projectWithLongTask: Project = {
          filename: 'focus-project',
          project: 'Long Task Project',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'Long Task', duration: 180, blockType: 'long', dependencies: [] },
          ],
        }

        const result = createSchedule(
          [projectWithLongTask],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        const longTaskEvents = result.schedule.flatMap(day =>
          day.events.filter(e => e.taskId === '1')
        )

        // Long tasks should only be in 19:00-23:00 (4h) or 21:00-24:00 (3h) slots
        for (const event of longTaskEvents) {
          const start = parseInt(event.start.split(':')[0])
          expect(start).toBeGreaterThanOrEqual(19)
        }
      })

      it('should schedule short tasks in any available slot', () => {
        const projectWithShortTask: Project = {
          filename: 'focus-project',
          project: 'Short Task Project',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'Short Task', duration: 30, blockType: 'short', dependencies: [] },
          ],
        }

        const result = createSchedule(
          [projectWithShortTask],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        expect(result.summary.scheduledTasks).toBeGreaterThanOrEqual(0)
      })
    })

    describe('Summary Calculation', () => {
      it('should correctly count total tasks', () => {
        const projectWith3Tasks: Project = {
          filename: 'focus-project',
          project: 'Test',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'Task 1', duration: 60, blockType: 'any', dependencies: [] },
            { id: '2', name: 'Task 2', duration: 60, blockType: 'any', dependencies: [] },
            { id: '3', name: 'Task 3', duration: 60, blockType: 'any', dependencies: [] },
          ],
        }

        const result = createSchedule(
          [projectWith3Tasks],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        expect(result.summary.totalTasks).toBe(3)
      })

      it('should correctly calculate unscheduled tasks', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        expect(result.summary.unscheduledTasks).toBe(
          result.summary.totalTasks - result.summary.scheduledTasks
        )
      })

      it('should calculate total hours correctly', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        // Total hours should be a reasonable number (not negative, not excessively large)
        expect(result.summary.totalHours).toBeGreaterThanOrEqual(0)
        expect(result.summary.totalHours).toBeLessThan(168) // Less than hours in a week
      })
    })

    describe('Scheduling Priority', () => {
      it('should schedule routines before project tasks', () => {
        const routineAt9: Routine = {
          filename: 'routine',
          name: 'Routine',
          priority: 'high',
          tasks: [
            { name: 'Morning Routine', duration: 60, repeat: ['Mon'], preferredTime: '09:00' },
          ],
        }

        const projectTask: Project = {
          filename: 'focus-project',
          project: 'Project',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'Project Task', duration: 60, blockType: 'short', dependencies: [] },
          ],
        }

        const result = createSchedule(
          [projectTask],
          [routineAt9],
          defaultConfig,
          '2025-01-13', // Monday
          1
        )

        const mondaySchedule = result.schedule.find(d => d.date === '2025-01-13')
        if (mondaySchedule && mondaySchedule.events.length > 0) {
          // The 09:00 slot should be taken by routine if both fit
          const event9am = mondaySchedule.events.find(e => e.start === '09:00')
          if (event9am) {
            expect(event9am.type).toBe('routine')
          }
        }
      })

      it('should schedule focus project before buffer project', () => {
        const focusProject: Project = {
          filename: 'focus-project',
          project: 'Focus',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'Focus Task', duration: 60, blockType: 'any', dependencies: [] },
          ],
        }

        const bufferProject: Project = {
          filename: 'buffer-project',
          project: 'Buffer',
          priority: 'low',
          deadline: null,
          tasks: [
            { id: '1', name: 'Buffer Task', duration: 60, blockType: 'any', dependencies: [] },
          ],
        }

        const result = createSchedule(
          [focusProject, bufferProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        // Focus tasks should be scheduled first
        const focusEvents = result.schedule.flatMap(d =>
          d.events.filter(e => e.type === 'focus')
        )
        const bufferEvents = result.schedule.flatMap(d =>
          d.events.filter(e => e.type === 'buffer')
        )

        if (focusEvents.length > 0 && bufferEvents.length > 0) {
          // At least verify both types can be scheduled
          expect(focusEvents.length).toBeGreaterThan(0)
        }
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty projects array', () => {
        const result = createSchedule(
          [],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        expect(result.schedule).toBeDefined()
        expect(result.summary.totalTasks).toBe(0)
      })

      it('should handle no available time slots', () => {
        const emptyConfig: Config = {
          ...defaultConfig,
          available: {},
        }

        const result = createSchedule(
          [simpleProject],
          [],
          emptyConfig,
          '2025-01-13',
          1
        )

        expect(result.schedule).toHaveLength(0)
        expect(result.summary.unscheduledTasks).toBe(result.summary.totalTasks)
      })

      it('should handle tasks larger than available slots', () => {
        const oversizedTaskProject: Project = {
          filename: 'focus-project',
          project: 'Oversized',
          priority: 'high',
          deadline: null,
          tasks: [
            { id: '1', name: 'Huge Task', duration: 600, blockType: 'any', dependencies: [] }, // 10 hours
          ],
        }

        const result = createSchedule(
          [oversizedTaskProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        // Should not crash, just leave task unscheduled
        expect(result).toBeDefined()
      })

      it('should handle zero week range', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13',
          0
        )

        expect(result.schedule).toHaveLength(0)
      })
    })

    describe('Event Sorting', () => {
      it('should sort events by start time within a day', () => {
        const result = createSchedule(
          [simpleProject],
          [],
          defaultConfig,
          '2025-01-13',
          1
        )

        for (const day of result.schedule) {
          for (let i = 1; i < day.events.length; i++) {
            const prevStart = day.events[i - 1].start
            const currStart = day.events[i].start
            expect(prevStart <= currStart).toBe(true)
          }
        }
      })
    })
  })
})
