import { describe, it, expect } from 'vitest'
import { parseProject } from '../projectParser.js'

describe('projectParser', () => {
  describe('parseProject', () => {
    describe('Happy Path - Valid Project Files', () => {
      it('should parse a complete project file with all fields', () => {
        const content = `---
project: Instagram Auto Content System
priority: high
deadline: 2025-01-15
---

## Tasks

- [ ] #1 Instagram API Research | 1h | short
- [ ] #2 Google OAuth Integration | 2h | long
- [ ] #3 Image Generation API Selection | 1h | short | after:#1
- [ ] #4 Image Generation Logic | 3h | long | after:#2,#3
`
        const result = parseProject(content, 'instagram-auto.md')

        expect(result.filename).toBe('instagram-auto')
        expect(result.project).toBe('Instagram Auto Content System')
        expect(result.priority).toBe('high')
        expect(result.deadline).toBe('2025-01-15')
        expect(result.tasks).toHaveLength(4)
      })

      it('should parse tasks with correct properties', () => {
        const content = `---
project: Test Project
---

## Tasks

- [ ] #1 Simple Task | 30m | short
- [ ] #2 Long Task | 2.5h | long | after:#1
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0]).toEqual({
          id: '1',
          name: 'Simple Task',
          duration: 30,
          blockType: 'short',
          dependencies: [],
        })

        expect(result.tasks[1]).toEqual({
          id: '2',
          name: 'Long Task',
          duration: 150, // 2.5h = 150 minutes
          blockType: 'long',
          dependencies: ['1'],
        })
      })

      it('should parse multiple dependencies correctly', () => {
        const content = `---
project: Test
---

- [ ] #1 Task A | 1h | any
- [ ] #2 Task B | 1h | any
- [ ] #3 Task C | 1h | any | after:#1,#2
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[2].dependencies).toEqual(['1', '2'])
      })

      it('should default blockType to "any" when not specified', () => {
        const content = `---
project: Test
---

- [ ] #1 Task without blockType | 1h
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0].blockType).toBe('any')
      })
    })

    describe('Duration Parsing', () => {
      it('should parse hours correctly', () => {
        const content = `---
project: Test
---

- [ ] #1 Task | 1h | any
- [ ] #2 Task | 2h | any
- [ ] #3 Task | 1.5h | any
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0].duration).toBe(60)
        expect(result.tasks[1].duration).toBe(120)
        expect(result.tasks[2].duration).toBe(90)
      })

      it('should parse minutes correctly', () => {
        const content = `---
project: Test
---

- [ ] #1 Task | 30m | any
- [ ] #2 Task | 45m | any
- [ ] #3 Task | 15m | any
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0].duration).toBe(30)
        expect(result.tasks[1].duration).toBe(45)
        expect(result.tasks[2].duration).toBe(15)
      })

      it('should handle decimal hours', () => {
        const content = `---
project: Test
---

- [ ] #1 Task | 0.5h | any
- [ ] #2 Task | 2.25h | any
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0].duration).toBe(30)
        expect(result.tasks[1].duration).toBe(135)
      })
    })

    describe('Edge Cases', () => {
      it('should handle missing frontmatter', () => {
        const content = `## Tasks

- [ ] #1 Task A | 1h | any
`
        const result = parseProject(content, 'no-frontmatter.md')

        expect(result.filename).toBe('no-frontmatter')
        expect(result.project).toBe('no-frontmatter')
        expect(result.priority).toBe('medium')
        expect(result.deadline).toBeNull()
      })

      it('should handle empty file', () => {
        const content = ''
        const result = parseProject(content, 'empty.md')

        expect(result.tasks).toHaveLength(0)
        expect(result.filename).toBe('empty')
      })

      it('should handle file with only frontmatter', () => {
        const content = `---
project: Only Header
priority: low
---
`
        const result = parseProject(content, 'header-only.md')

        expect(result.project).toBe('Only Header')
        expect(result.priority).toBe('low')
        expect(result.tasks).toHaveLength(0)
      })

      it('should ignore invalid task lines', () => {
        const content = `---
project: Test
---

## Tasks

- [ ] #1 Valid Task | 1h | any
- [x] #2 Completed Task | 1h | any
- Invalid line without checkbox
- [ ] #3 Missing duration
- [ ] No ID Task | 1h | any
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks).toHaveLength(1)
        expect(result.tasks[0].name).toBe('Valid Task')
      })

      it('should strip .md extension from filename', () => {
        const result = parseProject('', 'my-project.md')
        expect(result.filename).toBe('my-project')
      })

      it('should handle task names with special characters', () => {
        const content = `---
project: Test
---

- [ ] #1 Task with (parentheses) and [brackets] | 1h | any
- [ ] #2 Task with "quotes" | 1h | any
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0].name).toBe('Task with (parentheses) and [brackets]')
        expect(result.tasks[1].name).toBe('Task with "quotes"')
      })

      it('should handle various whitespace in task lines', () => {
        const content = `---
project: Test
---

- [ ] #1   Extra Spaces   |   1h   |   short
- [ ] #2 Task	With	Tabs | 1h | any
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0].name).toBe('Extra Spaces')
        expect(result.tasks[0].blockType).toBe('short')
      })
    })

    describe('Priority Values', () => {
      it('should handle all valid priority values', () => {
        const priorities = ['high', 'medium', 'low']

        for (const priority of priorities) {
          const content = `---
project: Test
priority: ${priority}
---`
          const result = parseProject(content, 'test.md')
          expect(result.priority).toBe(priority)
        }
      })

      it('should default to medium for missing priority', () => {
        const content = `---
project: Test
---`
        const result = parseProject(content, 'test.md')
        expect(result.priority).toBe('medium')
      })
    })

    describe('Block Type Values', () => {
      it('should handle all valid block types', () => {
        const content = `---
project: Test
---

- [ ] #1 Short Task | 1h | short
- [ ] #2 Long Task | 3h | long
- [ ] #3 Any Task | 2h | any
`
        const result = parseProject(content, 'test.md')

        expect(result.tasks[0].blockType).toBe('short')
        expect(result.tasks[1].blockType).toBe('long')
        expect(result.tasks[2].blockType).toBe('any')
      })
    })
  })
})
