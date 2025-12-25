interface GoogleAuthButtonProps {
  isAuthenticated: boolean
  userEmail?: string
  onLogin: () => void
  onLogout: () => void
  isLoading?: boolean
  disabled?: boolean
}

/**
 * Button component for Google OAuth authentication.
 * Shows connected status with logout option or login button.
 */
export default function GoogleAuthButton({
  isAuthenticated,
  userEmail,
  onLogin,
  onLogout,
  isLoading = false,
  disabled = false
}: GoogleAuthButtonProps) {
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
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="text-sm font-medium text-gray-900">Google Calendar 연결</h3>
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          // Loading state
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
            <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-500">연결 상태 확인 중...</span>
          </div>
        ) : isAuthenticated ? (
          // Connected state
          <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">연결됨</p>
                {userEmail && (
                  <p className="text-xs text-green-600">{userEmail}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={disabled}
              className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              연결 해제
            </button>
          </div>
        ) : (
          // Disconnected state
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">연결 안 됨</p>
                <p className="text-xs text-gray-500">Google 계정으로 로그인하세요</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogin}
              disabled={disabled}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {/* Google Icon */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google 로그인</span>
            </button>
          </div>
        )}

        {/* Helper text */}
        <p className="mt-3 text-xs text-gray-500">
          Google Calendar와 연결하면 생성된 스케줄을 캘린더에 자동으로 등록할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
