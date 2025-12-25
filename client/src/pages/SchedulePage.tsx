import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import FileDropzone from '../components/FileDropzone'
import FileList from '../components/FileList'
import type { ParsedFile, FileRole } from '../components/FileList'
import SchedulePreview from '../components/SchedulePreview'
import {
  parseFiles,
  createSchedule,
  syncToCalendar,
  getAuthStatus,
  estimateSchedule,
} from '../services/api'
import type { Project, Routine, ScheduleResult, ScheduleEstimate } from '../services/api'

type PageState = 'idle' | 'parsing' | 'parsed' | 'estimating' | 'scheduling' | 'scheduled' | 'syncing' | 'synced'

export default function SchedulePage() {
  // File state
  const [files, setFiles] = useState<ParsedFile[]>([])
  const [pageState, setPageState] = useState<PageState>('idle')
  const [error, setError] = useState<string | null>(null)

  // Schedule state
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [weeks, setWeeks] = useState(2)

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created: number; failed: number } | null>(null)

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [estimate, setEstimate] = useState<ScheduleEstimate | null>(null)

  // Check auth status on mount
  useEffect(() => {
    getAuthStatus()
      .then(({ authenticated }) => setIsAuthenticated(authenticated))
      .catch(() => setIsAuthenticated(false))
  }, [])

  // Handle new files added
  const handleFilesAdded = useCallback(async (newFiles: File[]) => {
    setError(null)
    setPageState('parsing')
    setSyncResult(null)

    try {
      // Parse files
      const result = await parseFiles(newFiles)

      // Create ParsedFile objects
      const parsedFiles: ParsedFile[] = []

      // Map projects
      result.projects.forEach((project: Project) => {
        const file = newFiles.find(f => f.name.replace('.md', '') === project.filename)
        if (file) {
          parsedFiles.push({
            file,
            role: 'focus' as FileRole, // Default to focus
            parsed: project,
            isRoutine: false,
          })
        }
      })

      // Map routines
      result.routines.forEach((routine: Routine) => {
        const file = newFiles.find(f => f.name.replace('.md', '') === routine.filename)
        if (file) {
          parsedFiles.push({
            file,
            role: 'routine' as FileRole,
            parsed: routine,
            isRoutine: true,
          })
        }
      })

      // Add files that weren't matched (parsing failed or empty)
      newFiles.forEach(file => {
        const alreadyAdded = parsedFiles.some(pf => pf.file.name === file.name)
        if (!alreadyAdded) {
          parsedFiles.push({
            file,
            role: 'focus' as FileRole,
            parsed: undefined,
            isRoutine: false,
          })
        }
      })

      setFiles(prev => [...prev, ...parsedFiles])
      setPageState('parsed')
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 파싱 중 오류가 발생했습니다.')
      setPageState('idle')
    }
  }, [])

  // Handle role change
  const handleRoleChange = useCallback((index: number, role: FileRole) => {
    setFiles(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], role }
      return updated
    })
    // Reset schedule when roles change
    setScheduleResult(null)
    setSyncResult(null)
    if (pageState === 'scheduled' || pageState === 'synced') {
      setPageState('parsed')
    }
  }, [pageState])

  // Handle file removal
  const handleRemove = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    // Reset schedule
    setScheduleResult(null)
    setSyncResult(null)
    if (pageState === 'scheduled' || pageState === 'synced') {
      setPageState('parsed')
    }
  }, [pageState])

  // Get projects and routines from files
  const getProjectsAndRoutines = useCallback(() => {
    const projects: Project[] = []
    const routines: Routine[] = []

    files.forEach(f => {
      if (f.isRoutine && f.parsed) {
        routines.push(f.parsed as Routine)
      } else if (f.parsed && f.role !== 'queue') {
        const project = f.parsed as Project
        projects.push({ ...project })
      }
    })

    return { projects, routines }
  }, [files])

  // Create schedule with specific weeks
  const executeCreateSchedule = useCallback(async (targetWeeks: number) => {
    setPageState('scheduling')
    setShowConfirmDialog(false)

    try {
      const { projects, routines } = getProjectsAndRoutines()
      const result = await createSchedule(projects, routines, startDate, targetWeeks)
      setScheduleResult(result)
      setWeeks(targetWeeks)
      setPageState('scheduled')
    } catch (err) {
      setError(err instanceof Error ? err.message : '스케줄 생성 중 오류가 발생했습니다.')
      setPageState('parsed')
    }
  }, [getProjectsAndRoutines, startDate])

  // Create schedule - first estimate, then confirm if needed
  const handleCreateSchedule = useCallback(async () => {
    setError(null)
    setPageState('estimating')
    setSyncResult(null)

    try {
      const { projects, routines } = getProjectsAndRoutines()

      // 필요 기간 계산
      const estimateResult = await estimateSchedule(projects, routines, startDate)
      setEstimate(estimateResult)

      // 선택한 기간보다 더 필요하면 확인 다이얼로그 표시
      if (estimateResult.requiredWeeks > weeks) {
        setShowConfirmDialog(true)
        setPageState('parsed')
      } else {
        // 충분하면 바로 스케줄 생성
        await executeCreateSchedule(weeks)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '스케줄 생성 중 오류가 발생했습니다.')
      setPageState('parsed')
    }
  }, [getProjectsAndRoutines, startDate, weeks, executeCreateSchedule])

  // Handle confirm dialog actions
  const handleConfirmExtend = useCallback(() => {
    if (estimate) {
      executeCreateSchedule(estimate.requiredWeeks)
    }
  }, [estimate, executeCreateSchedule])

  const handleConfirmCancel = useCallback(() => {
    setShowConfirmDialog(false)
    setEstimate(null)
  }, [])

  // Sync to calendar
  const handleSync = useCallback(async () => {
    if (!scheduleResult) return

    setError(null)
    setPageState('syncing')

    try {
      const result = await syncToCalendar(scheduleResult.schedule)
      setSyncResult(result)
      setPageState('synced')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Calendar 동기화 중 오류가 발생했습니다.')
      setPageState('scheduled')
    }
  }, [scheduleResult])

  // Reset all
  const handleReset = useCallback(() => {
    setFiles([])
    setScheduleResult(null)
    setSyncResult(null)
    setError(null)
    setPageState('idle')
  }, [])

  const isProcessing = pageState === 'parsing' || pageState === 'estimating' || pageState === 'scheduling' || pageState === 'syncing'
  const hasFiles = files.length > 0
  const canCreateSchedule = hasFiles && files.some(f => f.parsed) && pageState !== 'scheduling'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Confirmation Dialog */}
      {showConfirmDialog && estimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">기간 확장 필요</h3>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-gray-600">
                선택한 기간({weeks}주)에 모든 태스크를 배치할 수 없습니다.
              </p>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{estimate.totalTasks}개</span> 태스크 (총 <span className="font-semibold">{estimate.totalHours}시간</span>)를
                  모두 배치하려면 <span className="font-semibold text-blue-600">{estimate.requiredWeeks}주</span>가 필요합니다.
                </p>
              </div>
              <p className="text-sm text-gray-500">
                기간을 {estimate.requiredWeeks}주로 확장하여 배치하시겠습니까?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmExtend}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {estimate.requiredWeeks}주로 배치
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Smart Scheduler</h1>
            <nav className="flex gap-4">
              <Link
                to="/"
                className="font-medium text-blue-600"
              >
                스케줄
              </Link>
              <Link
                to="/settings"
                className="text-gray-600 hover:text-gray-900"
              >
                설정
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
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
          {syncResult && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Google Calendar에 {syncResult.created}개 이벤트가 등록되었습니다.
                {syncResult.failed > 0 && ` (${syncResult.failed}개 실패)`}
              </span>
            </div>
          )}

          {/* File Dropzone */}
          <FileDropzone
            onFilesAdded={handleFilesAdded}
            disabled={isProcessing}
          />

          {/* Parsing Indicator */}
          {pageState === 'parsing' && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>파일 파싱 중...</span>
            </div>
          )}

          {/* File List */}
          {hasFiles && (
            <FileList
              files={files}
              onRoleChange={handleRoleChange}
              onRemove={handleRemove}
              disabled={isProcessing}
            />
          )}

          {/* Schedule Options */}
          {hasFiles && pageState !== 'parsing' && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                {/* Date & Weeks Input */}
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label
                      htmlFor="startDate"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      스케줄 시작일
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={isProcessing}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="weeks"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      기간
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        id="weeks"
                        min={1}
                        max={8}
                        value={weeks}
                        onChange={(e) => setWeeks(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                        disabled={isProcessing}
                        className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-gray-600">주</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {hasFiles && (
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={isProcessing}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      초기화
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCreateSchedule}
                    disabled={!canCreateSchedule || isProcessing}
                    className={`
                      flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                      transition-colors duration-150
                      ${canCreateSchedule && !isProcessing
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    `}
                  >
                    {(pageState === 'estimating' || pageState === 'scheduling') ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{pageState === 'estimating' ? '기간 계산 중...' : '스케줄 생성 중...'}</span>
                      </>
                    ) : (
                      <span>스케줄 생성</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Preview */}
          {scheduleResult && (
            <SchedulePreview
              result={scheduleResult}
              onSync={handleSync}
              isSyncing={pageState === 'syncing'}
              isAuthenticated={isAuthenticated}
            />
          )}

          {/* Help Section */}
          {!hasFiles && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-900">
                사용 방법
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                    1
                  </span>
                  <p>
                    프로젝트 또는 루틴 md 파일을 드래그하여 업로드합니다.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                    2
                  </span>
                  <p>
                    각 파일의 역할(Focus/Buffer/Queue)을 선택합니다.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                    3
                  </span>
                  <p>
                    스케줄을 생성하고 Google Calendar에 등록합니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
