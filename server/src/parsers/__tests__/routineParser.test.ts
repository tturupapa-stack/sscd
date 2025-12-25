import { describe, it, expect } from 'vitest'
import { parseRoutine, isRoutineFile } from '../routineParser.js'

describe('routineParser', () => {
  describe('isRoutineFile', () => {
    it('should return true for files with type: routine', () => {
      const content = `---
type: routine
name: Daily Workout
---`
      expect(isRoutineFile(content)).toBe(true)
    })

    it('should return true for type:routine without space', () => {
      const content = `---
type:routine
name: Test
---`
      expect(isRoutineFile(content)).toBe(true)
    })

    it('should return false for project files', () => {
      const content = `---
project: My Project
priority: high
---`
      expect(isRoutineFile(content)).toBe(false)
    })

    it('should return false for files without frontmatter', () => {
      const content = `# Just a regular markdown file`
      expect(isRoutineFile(content)).toBe(false)
    })

    it('should return false for empty content', () => {
      expect(isRoutineFile('')).toBe(false)
    })
  })

  describe('parseRoutine', () => {
    describe('Happy Path - Valid Routine Files', () => {
      it('should parse a complete routine file', () => {
        const content = `---
type: routine
name: Daily Workout
priority: high
---

## Schedule

- [ ] Upper Body Workout | 1h | Mon,Thu | 09:00
- [ ] Lower Body Workout | 1h | Tue,Fri | 09:00
- [ ] Cardio | 30m | Wed,Sat | 09:00
- [ ] Stretching | 15m | daily | 22:00
`
        const result = parseRoutine(content, 'workout.md')

        expect(result.filename).toBe('workout')
        expect(result.name).toBe('Daily Workout')
        expect(result.priority).toBe('high')
        expect(result.tasks).toHaveLength(4)
      })

      it('should parse routine tasks with correct properties', () => {
        const content = `---
type: routine
name: Test Routine
---

- [ ] Morning Exercise | 1h | weekdays | 07:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0]).toEqual({
          name: 'Morning Exercise',
          duration: 60,
          repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          preferredTime: '07:00',
        })
      })
    })

    describe('Repeat Pattern Parsing', () => {
      it('should parse "daily" to all days of the week', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Daily Task | 30m | daily | 22:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].repeat).toEqual([
          'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
        ])
      })

      it('should parse "weekdays" to Mon-Fri', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Weekday Task | 1h | weekdays | 09:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].repeat).toEqual([
          'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
        ])
      })

      it('should parse "weekends" to Sat-Sun', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Weekend Task | 2h | weekends | 10:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].repeat).toEqual(['Sat', 'Sun'])
      })

      it('should parse specific days correctly', () => {
        const content = `---
type: routine
name: Test
---

- [ ] MWF Task | 1h | Mon,Wed,Fri | 09:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].repeat).toEqual(['Mon', 'Wed', 'Fri'])
      })

      it('should handle single day', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Monday Only | 1h | Mon | 09:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].repeat).toEqual(['Mon'])
      })

      it('should normalize case for day names', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Mixed Case | 1h | MON,wed,FRI | 09:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].repeat).toEqual(['Mon', 'Wed', 'Fri'])
      })
    })

    describe('Preferred Time Parsing', () => {
      it('should parse exact time format HH:MM', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Morning Task | 1h | daily | 09:00
- [ ] Afternoon Task | 1h | daily | 14:30
- [ ] Evening Task | 1h | daily | 21:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].preferredTime).toBe('09:00')
        expect(result.tasks[1].preferredTime).toBe('14:30')
        expect(result.tasks[2].preferredTime).toBe('21:00')
      })

      it('should parse time keywords', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Morning | 1h | daily | morning
- [ ] Afternoon | 1h | daily | afternoon
- [ ] Evening | 1h | daily | evening
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].preferredTime).toBe('morning')
        expect(result.tasks[1].preferredTime).toBe('afternoon')
        expect(result.tasks[2].preferredTime).toBe('evening')
      })

      it('should handle missing preferred time', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Flexible Task | 1h | daily
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].preferredTime).toBeNull()
      })
    })

    describe('Duration Parsing', () => {
      it('should parse hours correctly', () => {
        const content = `---
type: routine
name: Test
---

- [ ] 1 Hour Task | 1h | daily | 09:00
- [ ] 2 Hour Task | 2h | daily | 10:00
- [ ] 1.5 Hour Task | 1.5h | daily | 12:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].duration).toBe(60)
        expect(result.tasks[1].duration).toBe(120)
        expect(result.tasks[2].duration).toBe(90)
      })

      it('should parse minutes correctly', () => {
        const content = `---
type: routine
name: Test
---

- [ ] 15 Min Task | 15m | daily | 09:00
- [ ] 30 Min Task | 30m | daily | 09:15
- [ ] 45 Min Task | 45m | daily | 09:45
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].duration).toBe(15)
        expect(result.tasks[1].duration).toBe(30)
        expect(result.tasks[2].duration).toBe(45)
      })
    })

    describe('Edge Cases', () => {
      it('should handle missing frontmatter', () => {
        const content = `## Schedule

- [ ] Task | 1h | daily | 09:00
`
        const result = parseRoutine(content, 'routine.md')

        expect(result.filename).toBe('routine')
        expect(result.name).toBe('routine')
        expect(result.priority).toBe('medium')
      })

      it('should handle empty file', () => {
        const result = parseRoutine('', 'empty.md')

        expect(result.tasks).toHaveLength(0)
        expect(result.filename).toBe('empty')
      })

      it('should ignore invalid routine lines', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Valid Routine | 1h | daily | 09:00
- [x] Completed Routine | 1h | daily | 10:00
- Invalid line
- [ ] Missing Time | 1h
- [ ] Missing Duration | daily | 09:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks).toHaveLength(1)
        expect(result.tasks[0].name).toBe('Valid Routine')
      })

      it('should handle routine names with special characters', () => {
        const content = `---
type: routine
name: Test
---

- [ ] Workout (Upper Body) | 1h | Mon,Wed,Fri | 09:00
- [ ] Read "The Book" | 30m | daily | 22:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].name).toBe('Workout (Upper Body)')
        expect(result.tasks[1].name).toBe('Read "The Book"')
      })

      it('should strip .md extension from filename', () => {
        const result = parseRoutine('', 'my-routine.md')
        expect(result.filename).toBe('my-routine')
      })

      it('should handle whitespace variations', () => {
        const content = `---
type: routine
name: Test
---

- [ ]   Extra Spaces   |   1h   |   daily   |   09:00
`
        const result = parseRoutine(content, 'test.md')

        expect(result.tasks[0].name).toBe('Extra Spaces')
      })
    })

    describe('Priority Values', () => {
      it('should handle all valid priority values', () => {
        const priorities = ['high', 'medium', 'low']

        for (const priority of priorities) {
          const content = `---
type: routine
name: Test
priority: ${priority}
---`
          const result = parseRoutine(content, 'test.md')
          expect(result.priority).toBe(priority)
        }
      })

      it('should default to medium for missing priority', () => {
        const content = `---
type: routine
name: Test
---`
        const result = parseRoutine(content, 'test.md')
        expect(result.priority).toBe('medium')
      })
    })
  })
})
