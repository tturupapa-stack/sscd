import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-3xl bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">개인정보처리방침</h1>
        <p className="text-sm text-gray-500 mb-8">최종 수정일: 2025년 12월 26일</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 수집하는 개인정보</h2>
            <p>Smart Scheduler는 서비스 제공을 위해 다음 정보를 수집합니다:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Google 계정 이메일 주소</li>
              <li>Google Calendar 데이터 (일정 읽기/쓰기)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 개인정보의 이용 목적</h2>
            <p>수집된 정보는 다음 목적으로만 사용됩니다:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>사용자 인증 및 서비스 접근 권한 확인</li>
              <li>Google Calendar에 스케줄 등록</li>
              <li>기존 캘린더 일정 조회 (충돌 방지)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 개인정보의 보관 및 파기</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>인증 토큰은 서버에 암호화되어 저장됩니다.</li>
              <li>사용자가 연결 해제 시 모든 토큰이 즉시 삭제됩니다.</li>
              <li>업로드된 md 파일은 서버에 저장되지 않으며, 처리 후 즉시 삭제됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
            <p>Smart Scheduler는 사용자의 개인정보를 제3자에게 제공하지 않습니다. 단, Google Calendar API 사용을 위해 Google과 데이터가 교환됩니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 사용자의 권리</h2>
            <p>사용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>설정 페이지에서 Google 계정 연결 해제</li>
              <li>Google 계정 설정에서 앱 접근 권한 취소</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 문의</h2>
            <p>개인정보 관련 문의사항은 아래로 연락해주세요:</p>
            <p className="mt-2">이메일: sanghyun.kim@plabfootball.com</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            ← 홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
