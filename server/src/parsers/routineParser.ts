import type { Routine, RoutineTask } from '../types/index.js'

// 루틴 라인 파싱 정규식
// - [ ] 루틴명 | 1h | Mon,Wed,Fri | 09:00
const ROUTINE_REGEX = /^- \[ \] (.+?)\s*\|\s*(\d+\.?\d*[hm])\s*\|\s*([a-zA-Z,]+)\s*(?:\|\s*(\d{2}:\d{2}|morning|afternoon|evening))?$/

// YAML frontmatter 파싱 정규식
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/

/**
 * 소요시간 문자열을 분 단위로 변환
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+\.?\d*)([hm])$/)
  if (!match) return 0

  const value = parseFloat(match[1])
  const unit = match[2]

  return unit === 'h' ? Math.round(value * 60) : Math.round(value)
}

/**
 * 반복주기 문자열을 요일 배열로 변환
 * @example 'daily' -> ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
 * @example 'weekdays' -> ['Mon','Tue','Wed','Thu','Fri']
 * @example 'Mon,Wed,Fri' -> ['Mon','Wed','Fri']
 */
function parseRepeat(repeat: string): string[] {
  const normalized = repeat.trim().toLowerCase()

  if (normalized === 'daily') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  }
  if (normalized === 'weekdays') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  }
  if (normalized === 'weekends') {
    return ['Sat', 'Sun']
  }

  // 개별 요일 파싱 (Mon,Wed,Fri)
  return repeat.split(',').map(day => {
    const d = day.trim()
    // 첫 글자만 대문자로
    return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
  })
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
 * 루틴 md 파일 파싱
 */
export function parseRoutine(content: string, filename: string): Routine {
  const frontmatter = parseFrontmatter(content)
  const tasks: RoutineTask[] = []

  // frontmatter 이후 내용에서 루틴 라인 추출
  const bodyStart = content.indexOf('---', 3)
  const body = bodyStart !== -1 ? content.slice(bodyStart + 3) : content

  const lines = body.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(ROUTINE_REGEX)

    if (match) {
      const [, name, duration, repeat, preferredTime] = match

      tasks.push({
        name: name.trim(),
        duration: parseDuration(duration),
        repeat: parseRepeat(repeat),
        preferredTime: preferredTime || null,
      })
    }
  }

  return {
    filename: filename.replace(/\.md$/, ''),
    name: frontmatter.name || filename.replace(/\.md$/, ''),
    priority: (frontmatter.priority as 'high' | 'medium' | 'low') || 'medium',
    tasks,
  }
}

/**
 * 파일이 루틴인지 확인 (frontmatter에 type: routine이 있는지)
 */
export function isRoutineFile(content: string): boolean {
  const match = content.match(FRONTMATTER_REGEX)
  if (!match) return false

  return match[1].includes('type: routine') || match[1].includes('type:routine')
}
