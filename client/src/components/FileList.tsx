import type { Project, Routine } from '../services/api'

export type FileRole = 'focus' | 'buffer' | 'queue' | 'routine'

export interface ParsedFile {
  file: File
  role: FileRole
  parsed?: Project | Routine
  isRoutine: boolean
}

interface FileListProps {
  files: ParsedFile[]
  onRoleChange: (index: number, role: FileRole) => void
  onRemove: (index: number) => void
  disabled?: boolean
}

/**
 * Displays uploaded files with role selection dropdowns.
 * Routines are automatically marked and cannot change roles.
 */
export default function FileList({ files, onRoleChange, onRemove, disabled = false }: FileListProps) {
  if (files.length === 0) {
    return null
  }

  const getRoleBadgeStyles = (role: FileRole) => {
    switch (role) {
      case 'focus':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'buffer':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'queue':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'routine':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: FileRole) => {
    switch (role) {
      case 'focus':
        return 'Focus'
      case 'buffer':
        return 'Buffer'
      case 'queue':
        return 'Queue'
      case 'routine':
        return 'Routine'
      default:
        return role
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900">
          첨부된 파일 ({files.length}개)
        </h3>
      </div>

      <ul className="divide-y divide-gray-100" role="list">
        {files.map((item, index) => (
          <li
            key={`${item.file.name}-${index}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
          >
            {/* File Info */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {/* File Icon */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <svg
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              {/* File Name & Status */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {item.file.name}
                </p>
                {item.parsed && (
                  <p className="truncate text-xs text-gray-500">
                    {item.isRoutine
                      ? `${(item.parsed as Routine).tasks?.length || 0}개 루틴`
                      : `${(item.parsed as Project).tasks?.length || 0}개 태스크`
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Role Selector / Badge */}
            <div className="flex items-center gap-2">
              {item.isRoutine ? (
                // Routine badge (non-editable)
                <span
                  className={`
                    inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium
                    ${getRoleBadgeStyles('routine')}
                  `}
                >
                  {getRoleLabel('routine')}
                </span>
              ) : (
                // Project role selector
                <select
                  value={item.role}
                  onChange={(e) => onRoleChange(index, e.target.value as FileRole)}
                  disabled={disabled}
                  className={`
                    rounded-lg border px-3 py-1.5 text-xs font-medium
                    transition-colors duration-150
                    ${getRoleBadgeStyles(item.role)}
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-80'}
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  `}
                  aria-label={`${item.file.name} 역할 선택`}
                >
                  <option value="focus">Focus</option>
                  <option value="buffer">Buffer</option>
                  <option value="queue">Queue</option>
                </select>
              )}

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                className={`
                  rounded-lg p-2 text-gray-400 transition-colors duration-150
                  ${disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-red-50 hover:text-red-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1
                `}
                aria-label={`${item.file.name} 삭제`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
