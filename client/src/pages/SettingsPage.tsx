import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import AvailableTimeEditor from '../components/AvailableTimeEditor'
import ProjectRoleEditor from '../components/ProjectRoleEditor'
import GoogleAuthButton from '../components/GoogleAuthButton'
import { getConfig, updateConfig, getAuthStatus, logout } from '../services/api'
import type { Config } from '../services/api'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const DEFAULT_AVAILABLE: Record<string, string[]> = {
  Mon: ['09:00-10:00'],
  Tue: ['09:00-10:00', '13:00-14:00', '19:00-23:00'],
  Wed: ['09:00-10:00', '13:00-14:00', '19:00-23:00'],
  Thu: ['09:00-10:00', '13:00-14:00', '19:00-23:00'],
  Fri: ['09:00-10:00', '13:00-14:00', '19:00-23:00'],
  Sat: ['21:00-24:00'],
  Sun: ['21:00-24:00'],
}

export default function SettingsPage() {
  // Config state
  const [config, setConfig] = useState<Config | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Load config and auth status on mount
  useEffect(() => {
    Promise.all([
      getConfig().catch(() => null),
      getAuthStatus().catch(() => ({ authenticated: false }))
    ]).then(([configData, authData]) => {
      if (configData) {
        setConfig(configData)
      } else {
        // Use defaults if no config exists
        setConfig({
          available: DEFAULT_AVAILABLE,
          focus: '',
          buffer: '',
          queue: [],
          schedule_weeks: 2,
          calendar_id: 'primary'
        })
      }
      setIsAuthenticated(authData.authenticated)
      setIsLoading(false)
      setIsAuthLoading(false)
    }).catch((err) => {
      setError(err instanceof Error ? err.message : '설정을 불러오는 중 오류가 발생했습니다.')
      setIsLoading(false)
      setIsAuthLoading(false)
    })
  }, [])

  // Handle available time change
  const handleAvailableChange = useCallback((available: Record<string, string[]>) => {
    if (!config) return
    setConfig({ ...config, available })
    setSaveState('idle')
  }, [config])

  // Handle schedule weeks change
  const handleWeeksChange = useCallback((weeks: number) => {
    if (!config) return
    setConfig({ ...config, schedule_weeks: weeks })
    setSaveState('idle')
  }, [config])

  // Handle project role change
  const handleProjectRoleChange = useCallback((focus: string, buffer: string, queue: string[]) => {
    if (!config) return
    setConfig({ ...config, focus, buffer, queue })
    setSaveState('idle')
  }, [config])

  // Save config
  const handleSave = useCallback(async () => {
    if (!config) return

    setSaveState('saving')
    setError(null)

    try {
      await updateConfig(config)
      setSaveState('saved')
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 저장 중 오류가 발생했습니다.')
      setSaveState('error')
    }
  }, [config])

  // Handle Google login
  const handleGoogleLogin = useCallback(() => {
    // Redirect to backend auth endpoint
    window.location.href = '/api/auth/google'
  }, [])

  // Handle Google logout
  const handleGoogleLogout = useCallback(async () => {
    try {
      await logout()
      setIsAuthenticated(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그아웃 중 오류가 발생했습니다.')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-4xl px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">Smart Scheduler</h1>
              <nav className="flex gap-4">
                <Link to="/" className="text-gray-600 hover:text-gray-900">스케줄</Link>
                <Link to="/settings" className="font-medium text-blue-600">설정</Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Smart Scheduler</h1>
            <nav className="flex gap-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900"
              >
                스케줄
              </Link>
              <Link
                to="/settings"
                className="font-medium text-blue-600"
              >
                설정
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">설정</h2>
          <p className="mt-1 text-sm text-gray-500">
            스케줄 생성에 사용할 가용 시간과 Google Calendar 연결을 관리합니다.
          </p>
        </div>

        <div className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto rounded p-1 hover:bg-red-100"
                aria-label="오류 메시지 닫기"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Success Message */}
          {saveState === 'saved' && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>설정이 저장되었습니다.</span>
            </div>
          )}

          {/* Available Time Editor */}
          {config && (
            <AvailableTimeEditor
              available={config.available}
              onChange={handleAvailableChange}
              disabled={saveState === 'saving'}
            />
          )}

          {/* Project Role Editor */}
          {config && (
            <ProjectRoleEditor
              focus={config.focus}
              buffer={config.buffer}
              queue={config.queue}
              onChange={handleProjectRoleChange}
              disabled={saveState === 'saving'}
            />
          )}

          {/* Schedule Weeks Setting */}
          {config && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-900">기본 스케줄 생성 범위</h3>
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={config.schedule_weeks}
                    onChange={(e) => handleWeeksChange(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                    disabled={saveState === 'saving'}
                    className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-600">주</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  스케줄 생성 시 기본적으로 적용되는 기간입니다. (1-8주)
                </p>
              </div>
            </div>
          )}

          {/* Google Auth */}
          <GoogleAuthButton
            isAuthenticated={isAuthenticated}
            onLogin={handleGoogleLogin}
            onLogout={handleGoogleLogout}
            isLoading={isAuthLoading}
            disabled={saveState === 'saving'}
          />

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className={`
                flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium
                transition-colors duration-150
                ${saveState === 'saving'
                  ? 'bg-gray-400 text-white cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              {saveState === 'saving' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>저장 중...</span>
                </>
              ) : (
                <span>저장</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
