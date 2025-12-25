import { google } from 'googleapis'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import type { ScheduledEvent } from '../types/index.js'

const TOKEN_PATH = path.resolve(process.cwd(), '../data/google-token.json')

// OAuth2 클라이언트 생성
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  )
}

/**
 * OAuth URL 생성
 */
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    prompt: 'consent',
  })
}

/**
 * 인증 코드로 토큰 교환
 */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf-8')
}

/**
 * 저장된 토큰 로드
 */
async function loadTokens(): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(TOKEN_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * 인증된 OAuth2 클라이언트 반환
 */
export async function getAuthenticatedClient() {
  const oauth2Client = createOAuth2Client()
  const tokens = await loadTokens()

  if (!tokens) {
    throw new Error('Not authenticated')
  }

  oauth2Client.setCredentials(tokens)

  // 토큰 갱신 이벤트 리스너
  oauth2Client.on('tokens', async (newTokens) => {
    const currentTokens = await loadTokens()
    const merged = { ...currentTokens, ...newTokens }
    await writeFile(TOKEN_PATH, JSON.stringify(merged, null, 2), 'utf-8')
  })

  return oauth2Client
}

/**
 * 인증 상태 확인
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await loadTokens()
  return tokens !== null
}

/**
 * 인증 해제 (토큰 삭제)
 */
export async function revokeAuth(): Promise<void> {
  try {
    const oauth2Client = await getAuthenticatedClient()
    const tokens = await loadTokens()

    if (tokens?.access_token) {
      await oauth2Client.revokeToken(tokens.access_token as string)
    }
  } catch {
    // 이미 만료되었거나 없는 경우 무시
  }

  try {
    const { unlink } = await import('fs/promises')
    await unlink(TOKEN_PATH)
  } catch {
    // 파일이 없는 경우 무시
  }
}

/**
 * 캘린더 이벤트 조회
 */
export async function getCalendarEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<{ id: string; title: string; start: string; end: string }[]> {
  const oauth2Client = await getAuthenticatedClient()
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const response = await calendar.events.list({
    calendarId,
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  return events.map(event => ({
    id: event.id || '',
    title: event.summary || '',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
  }))
}

/**
 * 캘린더에 이벤트 생성
 */
export async function createCalendarEvent(
  calendarId: string,
  date: string,
  event: ScheduledEvent
): Promise<string> {
  const oauth2Client = await getAuthenticatedClient()
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const startDateTime = `${date}T${event.start}:00`
  const endDateTime = `${date}T${event.end}:00`

  // 이벤트 색상 설정 (routine: 파랑, focus: 초록, buffer: 노랑)
  const colorId = event.type === 'routine' ? '1' : event.type === 'focus' ? '2' : '5'

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.title,
      description: `Source: ${event.source}${event.taskId ? ` | Task #${event.taskId}` : ''}`,
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Seoul',
      },
      colorId,
    },
  })

  return response.data.id || ''
}

/**
 * 여러 이벤트 일괄 생성
 */
export async function syncToCalendar(
  calendarId: string,
  schedule: { date: string; events: ScheduledEvent[] }[]
): Promise<{ created: number; failed: number }> {
  let created = 0
  let failed = 0

  for (const day of schedule) {
    for (const event of day.events) {
      try {
        await createCalendarEvent(calendarId, day.date, event)
        created++
      } catch (error) {
        console.error(`Failed to create event: ${event.title}`, error)
        failed++
      }
    }
  }

  return { created, failed }
}
