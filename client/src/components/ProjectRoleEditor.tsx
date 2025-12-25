import { useState, useCallback } from 'react'

interface ProjectRoleEditorProps {
  focus: string
  buffer: string
  queue: string[]
  onChange: (focus: string, buffer: string, queue: string[]) => void
  disabled?: boolean
}

/**
 * Editor component for configuring project roles (Focus, Buffer, Queue).
 * Focus: The main project to prioritize in scheduling
 * Buffer: Secondary project for remaining time slots
 * Queue: Projects waiting (not scheduled)
 */
export default function ProjectRoleEditor({
  focus,
  buffer,
  queue,
  onChange,
  disabled = false
}: ProjectRoleEditorProps) {
  const [newQueueItem, setNewQueueItem] = useState('')

  const handleFocusChange = useCallback((value: string) => {
    onChange(value, buffer, queue)
  }, [buffer, queue, onChange])

  const handleBufferChange = useCallback((value: string) => {
    onChange(focus, value, queue)
  }, [focus, queue, onChange])

  const handleAddToQueue = useCallback(() => {
    if (!newQueueItem.trim()) return
    if (queue.includes(newQueueItem.trim())) return

    onChange(focus, buffer, [...queue, newQueueItem.trim()])
    setNewQueueItem('')
  }, [focus, buffer, queue, newQueueItem, onChange])

  const handleRemoveFromQueue = useCallback((index: number) => {
    const newQueue = queue.filter((_, i) => i !== index)
    onChange(focus, buffer, newQueue)
  }, [focus, buffer, queue, onChange])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddToQueue()
    }
  }, [handleAddToQueue])

  return (
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
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="text-sm font-medium text-gray-900">프로젝트 역할</h3>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          스케줄 생성 시 프로젝트의 우선순위를 설정합니다. 파일명(확장자 제외)을 입력하세요.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Focus Project */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="w-20 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Focus
              </span>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={focus}
                onChange={(e) => handleFocusChange(e.target.value)}
                disabled={disabled}
                placeholder="예: instagram-auto"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                가용 시간에 우선 배치되는 집중 프로젝트
              </p>
            </div>
          </div>
        </div>

        {/* Buffer Project */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="w-20 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Buffer
              </span>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={buffer}
                onChange={(e) => handleBufferChange(e.target.value)}
                disabled={disabled}
                placeholder="예: data-briefing"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Focus 배치 후 남는 시간에 배치되는 보조 프로젝트
              </p>
            </div>
          </div>
        </div>

        {/* Queue Projects */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-4">
            <div className="w-20 flex-shrink-0 pt-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Queue
              </span>
            </div>
            <div className="flex-1 space-y-2">
              {/* Queue List */}
              {queue.length === 0 && (
                <p className="py-1.5 text-sm text-gray-400">대기 중인 프로젝트 없음</p>
              )}

              {queue.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                    {item}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromQueue(index)}
                    disabled={disabled}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    aria-label={`${item} 삭제`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Add to Queue */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newQueueItem}
                  onChange={(e) => setNewQueueItem(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={disabled}
                  placeholder="프로젝트명 입력"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleAddToQueue}
                  disabled={disabled || !newQueueItem.trim()}
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  추가
                </button>
              </div>

              <p className="text-xs text-gray-500">
                대기열에 있는 프로젝트는 스케줄에 배치되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
