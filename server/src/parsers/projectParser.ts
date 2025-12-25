import type { Project, Task } from '../types/index.js'

// 태스크 라인 파싱 정규식
// - [ ] #1 태스크명 | 2h | long | after:#1,#2
const TASK_REGEX = /^- \[ \] #(\d+)\s+(.+?)\s*\|\s*(\d+\.?\d*[hm])\s*(?:\|\s*(short|long|any))?\s*(?:\|\s*after:(#[\d,#]+))?$/

// YAML frontmatter 파싱 정규식
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/

/**
 * 소요시간 문자열을 분 단위로 변환
 * @example '1h' -> 60, '30m' -> 30, '1.5h' -> 90
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+\.?\d*)([hm])$/)
  if (!match) return 0

  const value = parseFloat(match[1])
  const unit = match[2]

  return unit === 'h' ? Math.round(value * 60) : Math.round(value)
}

/**
 * 의존성 문자열을 ID 배열로 변환
 * @example 'after:#1,#2' -> ['1', '2']
 */
function parseDependencies(deps: string | undefined): string[] {
  if (!deps) return []
  return deps.split(',').map(d => d.replace('#', '').trim())
}

/**
 * YAML frontmatter 파싱
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(FRONTMATTER_REGEX)
  if (!match) return {}

  const frontmatter: Record<string, string> = {}
  const lines = match[1].split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    frontmatter[key] = value
  }

  return frontmatter
}

/**
 * 프로젝트 md 파일 파싱
 */
export function parseProject(content: string, filename: string): Project {
  const frontmatter = parseFrontmatter(content)
  const tasks: Task[] = []

  // frontmatter 이후 내용에서 태스크 라인 추출
  const bodyStart = content.indexOf('---', 3)
  const body = bodyStart !== -1 ? content.slice(bodyStart + 3) : content

  const lines = body.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(TASK_REGEX)

    if (match) {
      const [, id, name, duration, blockType, dependencies] = match

      tasks.push({
        id,
        name: name.trim(),
        duration: parseDuration(duration),
        blockType: (blockType as 'short' | 'long' | 'any') || 'any',
        dependencies: parseDependencies(dependencies),
      })
    }
  }

  return {
    filename: filename.replace(/\.md$/, ''),
    project: frontmatter.project || filename.replace(/\.md$/, ''),
    priority: (frontmatter.priority as 'high' | 'medium' | 'low') || 'medium',
    deadline: frontmatter.deadline || null,
    tasks,
  }
}
