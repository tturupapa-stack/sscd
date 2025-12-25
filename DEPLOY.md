# Smart Scheduler 배포 가이드

Vercel (프론트엔드) + Render (백엔드) 무료 배포

---

## 1. 사전 준비: Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. APIs & Services > Library > "Google Calendar API" 활성화
4. APIs & Services > Credentials > OAuth 2.0 Client ID 생성
   - Application type: Web application
   - Authorized redirect URIs: (나중에 Render 도메인으로 설정)

---

## 2. Render 배포 (백엔드)

### 2.1 배포
1. [Render](https://render.com/) 가입/로그인
2. New > Web Service
3. GitHub 연결 > 이 저장소 선택
4. 설정:
   - **Name**: smart-scheduler-api
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 2.2 환경변수 설정
Render 대시보드 > Environment에 추가:

```
NODE_ENV=production
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-api.onrender.com/api/auth/google/callback
FRONTEND_URL=https://your-app.vercel.app
```

### 2.3 Render 도메인 확인
배포 완료 후 URL 확인 (예: `https://smart-scheduler-api.onrender.com`)

---

## 3. Vercel 배포 (프론트엔드)

### 3.1 배포
1. [Vercel](https://vercel.com/) 가입/로그인
2. New Project > GitHub 연결 > 이 저장소 선택
3. 설정:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 환경변수 설정
Vercel 대시보드 > Settings > Environment Variables에 추가:

```
VITE_API_URL=https://your-api.onrender.com/api
```

### 3.3 재배포
환경변수 추가 후 Deployments > 최신 배포 > Redeploy

---

## 4. Google OAuth 설정 완료

Render와 Vercel 도메인이 확정되면:

1. Google Cloud Console > Credentials
2. OAuth 2.0 Client ID 수정
3. Authorized redirect URIs에 추가:
   - `https://your-api.onrender.com/api/auth/google/callback`

---

## 5. 배포 확인

1. Vercel URL 접속 (프론트엔드)
2. 설정 페이지에서 Google 계정 연결
3. md 파일 업로드 및 스케줄 생성 테스트

---

## 6. 주의사항

### Render 무료 플랜 제한
- **15분 미사용시 슬립**: 첫 요청시 30초~1분 대기
- 슬립 해제 후 정상 동작

### 해결 방법
- UptimeRobot 등으로 주기적 핑 (권장하지 않음 - 무료 크레딧 소모)
- 또는 첫 접속시 잠시 대기

---

## 7. 로컬 개발

```bash
# 의존성 설치
npm run install:all

# 개발 서버 실행 (client:5173, server:3000)
npm run dev
```

---

## 8. 문제 해결

### CORS 에러
- Render의 FRONTEND_URL이 Vercel 도메인과 일치하는지 확인

### OAuth 에러
- GOOGLE_REDIRECT_URI가 Render 도메인인지 확인
- Google Cloud Console의 Authorized redirect URIs 확인

### API 연결 안됨
- Vercel의 VITE_API_URL이 Render 도메인인지 확인
- Render 서비스가 슬립 상태인 경우 잠시 대기
