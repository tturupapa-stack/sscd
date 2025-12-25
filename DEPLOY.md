# Smart Scheduler 배포 가이드

## Railway 배포

### 1. 사전 준비

#### Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. APIs & Services > Library > "Google Calendar API" 활성화
4. APIs & Services > Credentials > OAuth 2.0 Client ID 생성
   - Application type: Web application
   - Authorized redirect URIs: `https://your-app.railway.app/api/auth/google/callback`

### 2. Railway 배포

#### GitHub 연결
1. [Railway](https://railway.app/) 가입/로그인
2. "New Project" > "Deploy from GitHub repo"
3. 이 저장소 선택

#### 환경변수 설정
Railway 대시보드에서 다음 환경변수 추가:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-app.railway.app/api/auth/google/callback
NODE_ENV=production
```

#### 배포 확인
1. Railway 대시보드에서 빌드 로그 확인
2. 배포 완료 후 생성된 URL로 접속
3. 설정 페이지에서 Google 계정 연결

### 3. Google OAuth 설정 업데이트

Railway에서 도메인이 할당되면:
1. Google Cloud Console > Credentials
2. OAuth 2.0 Client ID 수정
3. Authorized redirect URIs에 Railway 도메인 추가:
   - `https://your-app.railway.app/api/auth/google/callback`

### 4. 로컬 개발

```bash
# 의존성 설치
npm run install:all

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 모드 실행
npm start
```

### 5. 문제 해결

#### 빌드 실패
- Node.js 버전 확인 (>=18 필요)
- `npm run build` 로컬에서 테스트

#### OAuth 에러
- GOOGLE_REDIRECT_URI가 정확한지 확인
- Google Cloud Console의 Authorized redirect URIs와 일치하는지 확인

#### 캘린더 연동 안됨
- Google Calendar API가 활성화되어 있는지 확인
- OAuth consent screen 설정 확인

---

## 파일 구조

```
/smart-scheduler
├── railway.json        # Railway 배포 설정
├── package.json        # 루트 빌드 스크립트
├── .env.example        # 환경변수 예시
├── /client             # React 프론트엔드
│   └── /dist           # 빌드 출력
├── /server             # Express 백엔드
│   └── /dist           # 빌드 출력
└── /data               # 사용자 설정
    └── config.yaml
```
