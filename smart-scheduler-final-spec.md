# Smart Scheduler - 최종 기획문서

## 1. 프로젝트 개요

### 1.1 문제 정의
1인 개발자로서 여러 프로젝트를 동시에 진행할 때, 기획서에서 태스크를 분리하고 스케줄러에 일일이 입력하는 과정이 번거로움. 결국 입력을 안 하게 되고, 즉흥적으로 일하다 보니 어느 프로젝트도 제대로 진척되지 않음.

### 1.2 솔루션
태스크가 정리된 md 파일을 웹페이지에 드래그앤드롭하면, 사용자의 가용 시간에 맞게 자동 배치하여 Google Calendar에 등록하는 웹 애플리케이션.

### 1.3 핵심 플로우
```
md 파일 드래그앤드롭 (1분) 
  → 파싱 (태스크, 의존성, 소요시간 추출)
  → Google Calendar에서 기존 일정 조회
  → 가용 시간 슬롯 계산
  → 태스크 자동 배치
  → 미리보기 화면 표시
  → 사용자 확인 후 Google Calendar에 등록
```

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React (Vite) + TypeScript |
| 백엔드 | Node.js + Express (또는 Fastify) + TypeScript |
| Calendar 연동 | googleapis (Google Calendar API) |
| 파일 파싱 | yaml (frontmatter), 정규식 (태스크) |
| 데이터 저장 | config.yaml (로컬 파일) |
| 스타일링 | Tailwind CSS |

---

## 3. 파일 구조

### 3.1 프로젝트 디렉토리
```
/smart-scheduler
  ├── /client                 # React 프론트엔드
  │   ├── /src
  │   │   ├── /components
  │   │   ├── /pages
  │   │   ├── /hooks
  │   │   └── App.tsx
  │   └── package.json
  │
  ├── /server                 # Node.js 백엔드
  │   ├── /src
  │   │   ├── /routes
  │   │   ├── /services
  │   │   ├── /parsers
  │   │   └── index.ts
  │   └── package.json
  │
  └── /data                   # 사용자 데이터
      ├── config.yaml         # 설정 (가용시간, 프로젝트 역할)
      ├── /routines           # 반복 루틴 md 파일
      └── /projects           # 프로젝트 md 파일
```

---

## 4. 설정 파일 (config.yaml)

```yaml
# 가용 시간 설정
available:
  Mon: ["09:00-10:00"]
  Tue: ["09:00-10:00", "13:00-14:00", "19:00-23:00"]
  Wed: ["09:00-10:00", "13:00-14:00", "19:00-23:00"]
  Thu: ["09:00-10:00", "13:00-14:00", "19:00-23:00"]
  Fri: ["09:00-10:00", "13:00-14:00", "19:00-23:00"]
  Sat: ["21:00-24:00"]
  Sun: ["21:00-24:00"]

# 프로젝트 역할 (파일명, 확장자 제외)
focus: instagram-auto        # 현재 집중 프로젝트
buffer: data-briefing        # 버퍼 프로젝트
queue:                       # 대기열 (배치 안 함)
  - next-project

# 스케줄 생성 범위
schedule_weeks: 2

# Google Calendar 설정
calendar_id: primary
```

---

## 5. 입력 파일 형식

### 5.1 프로젝트 파일 (projects/*.md)

```markdown
---
project: 인스타 자동 콘텐츠 시스템
priority: high
deadline: 2025-01-15
---

## Tasks

- [ ] #1 Instagram API 문서 리서치 | 1h | short
- [ ] #2 Google OAuth 연동 | 2h | long
- [ ] #3 이미지 생성 API 선정 | 1h | short | after:#1
- [ ] #4 이미지 생성 로직 구현 | 3h | long | after:#2,#3
- [ ] #5 자동 업로드 기능 개발 | 4h | long | after:#4
- [ ] #6 테스트 및 디버깅 | 2h | any | after:#5
```

#### 헤더 (YAML frontmatter)

| 필드 | 필수 | 타입 | 설명 | 기본값 |
|------|------|------|------|--------|
| project | O | string | 프로젝트명 | - |
| priority | X | string | high / medium / low | medium |
| deadline | X | date | 마감일 (YYYY-MM-DD) | null |

#### 태스크 라인 형식

```
- [ ] #{ID} {태스크명} | {소요시간} | {블록타입} | {의존성}
```

| 요소 | 필수 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| ID | O | string | 태스크 식별자 | #1, #2 |
| 태스크명 | O | string | 작업 내용 | Instagram API 리서치 |
| 소요시간 | O | string | 예상 시간 | 1h, 30m, 1.5h |
| 블록타입 | X | string | short / long / any | any |
| 의존성 | X | string | 선행 태스크 | after:#1 또는 after:#1,#2 |

#### 블록타입 설명

| 타입 | 배치 가능 슬롯 | 용도 |
|------|----------------|------|
| short | 1시간 이하 슬롯 | 리서치, 문서 읽기, 간단한 작업 |
| long | 3시간 이상 슬롯 | 집중 개발, 복잡한 구현 |
| any | 모든 슬롯 | 유연한 작업 |

#### 파싱 정규식

```typescript
// 태스크 라인 파싱
const TASK_REGEX = /^- \[ \] #(\d+)\s+(.+?)\s*\|\s*(\d+\.?\d*[hm])\s*(?:\|\s*(short|long|any))?\s*(?:\|\s*after:(#[\d,#]+))?$/;
```

---

### 5.2 루틴 파일 (routines/*.md)

```markdown
---
type: routine
name: 체력단련 운동
priority: high
---

## Schedule

- [ ] 상체 운동 (가슴+삼두) | 1h | Mon,Thu | 09:00
- [ ] 하체 운동 | 1h | Tue,Fri | 09:00
- [ ] 유산소 | 30m | Wed,Sat | 09:00
- [ ] 스트레칭 | 15m | daily | 22:00
```

#### 헤더 (YAML frontmatter)

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| type | O | string | "routine" 고정 |
| name | O | string | 루틴 이름 |
| priority | X | string | high / medium / low |

#### 루틴 라인 형식

```
- [ ] {루틴명} | {소요시간} | {반복주기} | {선호시간}
```

| 요소 | 필수 | 타입 | 설명 | 예시 |
|------|------|------|------|------|
| 루틴명 | O | string | 작업 내용 | 상체 운동 |
| 소요시간 | O | string | 예상 시간 | 1h, 30m |
| 반복주기 | O | string | 반복 패턴 | daily, Mon, Mon,Wed,Fri |
| 선호시간 | X | string | 원하는 시간 | 09:00, morning, evening |

#### 반복주기 옵션

| 값 | 의미 |
|----|------|
| daily | 매일 |
| weekdays | 월~금 |
| weekends | 토~일 |
| Mon | 특정 요일 |
| Mon,Wed,Fri | 여러 요일 |

#### 선호시간 옵션

| 값 | 의미 |
|----|------|
| HH:MM (예: 09:00) | 정확한 시간 |
| morning | 09:00-12:00 중 가용 시간 |
| afternoon | 12:00-18:00 중 가용 시간 |
| evening | 18:00-23:00 중 가용 시간 |
| (생략) | 자동 배치 |

#### 파싱 정규식

```typescript
// 루틴 라인 파싱
const ROUTINE_REGEX = /^- \[ \] (.+?)\s*\|\s*(\d+\.?\d*[hm])\s*\|\s*([a-zA-Z,]+)\s*(?:\|\s*(\d{2}:\d{2}|morning|afternoon|evening))?$/;
```

---

## 6. 배치 알고리즘

### 6.1 배치 우선순위

```
1. Routine (반복 루틴) - 고정 시간에 먼저 배치
2. Focus 프로젝트 태스크 - 남는 시간에 우선 배치
3. Buffer 프로젝트 태스크 - Focus 배치 후 남는 시간에 배치
4. Queue - 배치하지 않음 (대기만)
```

### 6.2 배치 규칙

1. **의존성 처리**: 선행 태스크(after:#N)가 완료 일정 이후에만 배치
2. **블록타입 매칭**:
   - short 태스크 → 1시간 이하 슬롯에 우선 배치
   - long 태스크 → 3시간 이상 슬롯에만 배치
   - any 태스크 → 남는 슬롯에 배치
3. **컨텍스트 스위칭 최소화**: 하루에 프로젝트 전환 최대 1회
4. **같은 프로젝트 연속 배치**: 가능한 한 같은 프로젝트 태스크를 연속으로

### 6.3 슬롯 분류 (현재 가용시간 기준)

| 시간대 | 길이 | 분류 |
|--------|------|------|
| 09:00-10:00 | 1h | short |
| 13:00-14:00 | 1h | short |
| 19:00-23:00 | 4h | long |
| 21:00-24:00 (주말) | 3h | long |

### 6.4 알고리즘 수도코드

```typescript
function scheduleAll(routines, projects, config, existingEvents) {
  const slots = calculateAvailableSlots(config.available, existingEvents);
  const schedule = [];
  
  // 1. 루틴 먼저 배치
  for (const routine of routines) {
    for (const task of routine.tasks) {
      const targetSlots = findSlotsForRoutine(slots, task);
      for (const slot of targetSlots) {
        schedule.push({ ...task, slot });
        markSlotUsed(slots, slot, task.duration);
      }
    }
  }
  
  // 2. Focus 프로젝트 배치
  const focusProject = projects.find(p => p.filename === config.focus);
  if (focusProject) {
    scheduleProjectTasks(focusProject, slots, schedule);
  }
  
  // 3. Buffer 프로젝트 배치
  const bufferProject = projects.find(p => p.filename === config.buffer);
  if (bufferProject) {
    scheduleProjectTasks(bufferProject, slots, schedule);
  }
  
  return schedule;
}

function scheduleProjectTasks(project, slots, schedule) {
  const sortedTasks = topologicalSort(project.tasks); // 의존성 순서 정렬
  
  for (const task of sortedTasks) {
    const earliestStart = getEarliestStart(task, schedule); // 의존성 고려
    const slot = findBestSlot(slots, task, earliestStart);
    if (slot) {
      schedule.push({ ...task, project: project.name, slot });
      markSlotUsed(slots, slot, task.duration);
    }
  }
}
```

---

## 7. API 설계

### 7.1 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/config | 현재 설정 조회 |
| PUT | /api/config | 설정 저장 |
| POST | /api/parse | md 파일 파싱 (파일 업로드) |
| POST | /api/schedule | 스케줄 생성 (미리보기) |
| POST | /api/calendar/sync | Google Calendar에 등록 |
| GET | /api/calendar/events | 기존 캘린더 이벤트 조회 |
| GET | /api/auth/google | Google OAuth 시작 |
| GET | /api/auth/google/callback | OAuth 콜백 |
| GET | /api/auth/status | 인증 상태 확인 |
| GET | /api/samples/project | 샘플 프로젝트 md 다운로드 |
| GET | /api/samples/routine | 샘플 루틴 md 다운로드 |

### 7.2 API 상세

#### GET /api/config
```typescript
// Response
{
  available: {
    Mon: ["09:00-10:00"],
    Tue: ["09:00-10:00", "13:00-14:00", "19:00-23:00"],
    // ...
  },
  focus: "instagram-auto",
  buffer: "data-briefing",
  queue: ["next-project"],
  schedule_weeks: 2,
  calendar_id: "primary"
}
```

#### PUT /api/config
```typescript
// Request Body
{
  available: { ... },
  focus: "instagram-auto",
  buffer: "data-briefing",
  queue: ["next-project"],
  schedule_weeks: 2
}

// Response
{ success: true }
```

#### POST /api/parse
```typescript
// Request: multipart/form-data
// files: md 파일들

// Response
{
  projects: [
    {
      filename: "instagram-auto",
      project: "인스타 자동 콘텐츠 시스템",
      priority: "high",
      deadline: "2025-01-15",
      tasks: [
        {
          id: "1",
          name: "Instagram API 문서 리서치",
          duration: 60, // minutes
          blockType: "short",
          dependencies: []
        },
        {
          id: "2",
          name: "Google OAuth 연동",
          duration: 120,
          blockType: "long",
          dependencies: []
        },
        // ...
      ]
    }
  ],
  routines: [
    {
      filename: "workout",
      name: "체력단련 운동",
      tasks: [
        {
          name: "상체 운동",
          duration: 60,
          repeat: ["Mon", "Thu"],
          preferredTime: "09:00"
        },
        // ...
      ]
    }
  ]
}
```

#### POST /api/schedule
```typescript
// Request Body
{
  projects: [...], // /api/parse 응답
  routines: [...],
  startDate: "2025-01-13",
  weeks: 2
}

// Response
{
  schedule: [
    {
      date: "2025-01-13",
      events: [
        {
          start: "09:00",
          end: "10:00",
          title: "상체 운동",
          type: "routine",
          source: "workout"
        }
      ]
    },
    {
      date: "2025-01-14",
      events: [
        {
          start: "09:00",
          end: "10:00",
          title: "하체 운동",
          type: "routine",
          source: "workout"
        },
        {
          start: "13:00",
          end: "14:00",
          title: "Instagram API 문서 리서치",
          type: "focus",
          source: "instagram-auto",
          taskId: "1"
        },
        {
          start: "19:00",
          end: "21:00",
          title: "Google OAuth 연동",
          type: "focus",
          source: "instagram-auto",
          taskId: "2"
        },
        {
          start: "21:00",
          end: "22:00",
          title: "데이터 수집 설계",
          type: "buffer",
          source: "data-briefing",
          taskId: "1"
        }
      ]
    }
  ],
  summary: {
    totalTasks: 15,
    scheduledTasks: 12,
    unscheduledTasks: 3,
    totalHours: 28
  }
}
```

#### POST /api/calendar/sync
```typescript
// Request Body
{
  schedule: [...] // /api/schedule 응답의 schedule
}

// Response
{
  success: true,
  created: 12,
  failed: 0
}
```

---

## 8. UI 설계

### 8.1 페이지 구조

```
/                 # 메인 (스케줄 생성)
/settings         # 설정 (가용시간, 프로젝트 역할)
```

### 8.2 메인 페이지 (/))

```
┌─────────────────────────────────────────────────────┐
│  Smart Scheduler                    [스케줄] [설정] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │     📄 md 파일을 드래그하거나 클릭하여 업로드 │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  파일 형식:                                         │
│  ◉ 템플릿 형식 (태스크 정리됨) - 바로 스케줄 생성   │
│  ○ 일반 문서 (기획서/PRD) - AI가 태스크 추출       │
│                                                     │
│  [📋 템플릿 형식 가이드]  ← 클릭 시 아래 펼쳐짐     │
│                                                     │
│  첨부된 파일:                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ ☑ instagram-auto.md        [focus  ▼] [삭제] │  │
│  │ ☑ data-briefing.md         [buffer ▼] [삭제] │  │
│  │ ☑ workout.md               [routine]  [삭제] │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  스케줄 시작일: [2025-01-13]  기간: [2]주           │
│                                                     │
│  [스케줄 생성]                                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│  📅 생성된 스케줄 미리보기                          │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

**스케줄 미리보기 상세**:
```
┌─────────────────────────────────────────────────────┐
│  📅 생성된 스케줄 미리보기                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 1/13 (월)                                   │    │
│  │ ├ 09:00-10:00  🏋️ 상체 운동 (루틴)          │    │
│  │                                             │    │
│  │ 1/14 (화)                                   │    │
│  │ ├ 09:00-10:00  🏋️ 하체 운동 (루틴)          │    │
│  │ ├ 13:00-14:00  📱 Instagram API 리서치      │    │
│  │ ├ 19:00-21:00  📱 Google OAuth 연동         │    │
│  │ ├ 21:00-22:00  📊 데이터 수집 설계 (buffer) │    │
│  │                                             │    │
│  │ 1/15 (수)                                   │    │
│  │ ├ 09:00-10:00  🏋️ 유산소 (루틴)             │    │
│  │ ├ 13:00-14:00  📱 이미지 생성 API 선정      │    │
│  │ ├ 19:00-22:00  📱 이미지 생성 로직 구현     │    │
│  │ ...                                         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  요약: 총 15개 태스크 중 12개 배치 (28시간)         │
│  ⚠️ 3개 태스크 미배치 (시간 부족)                   │
│                                                     │
│  [Google Calendar에 등록]                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**템플릿 형식 가이드 (펼침 시)**:
```
┌─────────────────────────────────────────────────────┐
│  📋 템플릿 형식 가이드                      [접기]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ▸ 프로젝트 템플릿                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │ ---                                         │    │
│  │ project: 프로젝트명                         │    │
│  │ priority: high                              │    │
│  │ deadline: 2025-01-15                        │    │
│  │ ---                                         │    │
│  │                                             │    │
│  │ ## Tasks                                    │    │
│  │                                             │    │
│  │ - [ ] #1 태스크명 | 2h | long               │    │
│  │ - [ ] #2 다음 태스크 | 1h | short | after:#1│    │
│  └─────────────────────────────────────────────┘    │
│                                        [복사]       │
│                                                     │
│  ▸ 태스크 작성법                                    │
│  ┌─────────────────────────────────────────────┐    │
│  │ - [ ] #번호 태스크명 | 소요시간 | 블록 | 의존성 │
│  │                                             │    │
│  │ • 소요시간: 1h, 2h, 30m, 1.5h               │    │
│  │ • 블록타입:                                 │    │
│  │   - short: 1시간 이하 슬롯 (오전, 점심)     │    │
│  │   - long: 3시간 이상 슬롯 (저녁, 주말)      │    │
│  │   - any: 아무 슬롯이나 (기본값)             │    │
│  │ • 의존성: after:#1 또는 after:#1,#2         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ▸ 루틴 템플릿                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ ---                                         │    │
│  │ type: routine                               │    │
│  │ name: 루틴 이름                             │    │
│  │ ---                                         │    │
│  │                                             │    │
│  │ ## Schedule                                 │    │
│  │                                             │    │
│  │ - [ ] 루틴명 | 1h | Mon,Wed,Fri | 09:00     │    │
│  │ - [ ] 매일루틴 | 30m | daily | 22:00        │    │
│  └─────────────────────────────────────────────┘    │
│                                        [복사]       │
│                                                     │
│  ▸ 루틴 반복 옵션                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │ • 반복주기: daily, weekdays, weekends,      │    │
│  │            Mon, Tue, Wed, Thu, Fri, Sat, Sun│    │
│  │            또는 조합 (Mon,Wed,Fri)          │    │
│  │ • 선호시간: 09:00, morning, afternoon,      │    │
│  │            evening (생략 시 자동 배치)      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [샘플 파일 다운로드]                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 8.3 설정 페이지 (/settings)

```
┌─────────────────────────────────────────────────────┐
│  Smart Scheduler                    [스케줄] [설정] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⏰ 가용 시간                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ 월  │ 09:00 - 10:00                  [+ 추가] │  │
│  │     │                                         │  │
│  │ 화  │ 09:00 - 10:00                    [삭제] │  │
│  │     │ 13:00 - 14:00                    [삭제] │  │
│  │     │ 19:00 - 23:00                    [삭제] │  │
│  │     │                                [+ 추가] │  │
│  │ 수  │ 09:00 - 10:00                    [삭제] │  │
│  │     │ 13:00 - 14:00                    [삭제] │  │
│  │     │ 19:00 - 23:00                    [삭제] │  │
│  │     │                                [+ 추가] │  │
│  │ 목  │ 09:00 - 10:00                    [삭제] │  │
│  │     │ 13:00 - 14:00                    [삭제] │  │
│  │     │ 19:00 - 23:00                    [삭제] │  │
│  │     │                                [+ 추가] │  │
│  │ 금  │ 09:00 - 10:00                    [삭제] │  │
│  │     │ 13:00 - 14:00                    [삭제] │  │
│  │     │ 19:00 - 23:00                    [삭제] │  │
│  │     │                                [+ 추가] │  │
│  │ 토  │ 21:00 - 24:00                    [삭제] │  │
│  │     │                                [+ 추가] │  │
│  │ 일  │ 21:00 - 24:00                    [삭제] │  │
│  │     │                                [+ 추가] │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  📁 프로젝트 역할                                   │
│  ┌───────────────────────────────────────────────┐  │
│  │ Focus  │ [instagram-auto          ▼]         │  │
│  │ Buffer │ [data-briefing           ▼]         │  │
│  │ Queue  │ next-project                 [삭제] │  │
│  │        │ [프로젝트명 입력]          [+ 추가] │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  📅 기본 스케줄 생성 범위                           │
│  [ 2 ] 주                                           │
│                                                     │
│  🔗 Google Calendar 연결                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ ✅ 연결됨 (lark@gmail.com)        [연결 해제] │  │
│  └───────────────────────────────────────────────┘  │
│  (또는)                                             │
│  ┌───────────────────────────────────────────────┐  │
│  │ ❌ 연결 안 됨                  [Google 로그인] │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [저장]                                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 9. 컴포넌트 구조 (React)

```
/client/src
  ├── /components
  │   ├── FileDropzone.tsx        # 파일 드래그앤드롭
  │   ├── FileList.tsx            # 첨부된 파일 목록
  │   ├── FileTypeSelector.tsx    # 템플릿/일반문서 선택
  │   ├── TemplateGuide.tsx       # 템플릿 형식 가이드 (펼침/접힘)
  │   ├── SchedulePreview.tsx     # 스케줄 미리보기
  │   ├── DaySchedule.tsx         # 일별 스케줄
  │   ├── EventItem.tsx           # 개별 이벤트
  │   ├── AIResultEditor.tsx      # AI 분석 결과 편집
  │   ├── AIRequirements.tsx      # AI 파싱 실패 시 요구사항 안내
  │   ├── AvailableTimeEditor.tsx # 가용시간 편집
  │   ├── ProjectRoleEditor.tsx   # 프로젝트 역할 편집
  │   ├── GoogleAuthButton.tsx    # Google 연결 버튼
  │   └── Navigation.tsx          # 상단 네비게이션
  │
  ├── /pages
  │   ├── SchedulePage.tsx        # 메인 (스케줄 생성)
  │   └── SettingsPage.tsx        # 설정
  │
  ├── /hooks
  │   ├── useConfig.ts            # 설정 조회/저장
  │   ├── useSchedule.ts          # 스케줄 생성
  │   ├── useGoogleAuth.ts        # Google 인증 상태
  │   ├── useFileUpload.ts        # 파일 업로드
  │   └── useAIParse.ts           # AI 문서 파싱
  │
  ├── /services
  │   └── api.ts                  # API 호출 함수들
  │
  ├── /assets
  │   ├── sample-project.md       # 샘플 프로젝트 파일
  │   └── sample-routine.md       # 샘플 루틴 파일
  │
  └── App.tsx
```

---

## 10. 개발 단계

### Phase 1: 프로젝트 셋업 (2-3시간)
- [ ] 모노레포 구조 생성 (client, server, data)
- [ ] TypeScript 설정
- [ ] 기본 의존성 설치
- [ ] 개발 환경 설정 (Vite, nodemon)

### Phase 2: 백엔드 핵심 (6-8시간)
- [ ] Express 서버 셋업
- [ ] config.yaml 읽기/쓰기 API
- [ ] md 파일 파싱 로직 (프로젝트, 루틴)
- [ ] 스케줄 배치 알고리즘
- [ ] Google Calendar API 연동 (OAuth, 이벤트 조회/생성)

### Phase 3: 프론트엔드 기본 (4-5시간)
- [ ] React + Vite 셋업
- [ ] 라우팅 (/, /settings)
- [ ] 파일 드래그앤드롭 컴포넌트
- [ ] 스케줄 미리보기 UI
- [ ] API 연동

### Phase 4: 설정 페이지 (2-3시간)
- [ ] 가용시간 편집 UI
- [ ] 프로젝트 역할 편집 UI
- [ ] Google 연결 상태 표시
- [ ] 저장 기능

### Phase 5: 통합 및 테스트 (3-4시간)
- [ ] 전체 플로우 테스트
- [ ] 에러 처리
- [ ] 엣지 케이스 처리
- [ ] UI 다듬기

### 총 예상 시간: 17-23시간

---

## 11. 필요한 API 키 / 설정

### 11.1 Google Cloud Console
1. 새 프로젝트 생성
2. Google Calendar API 활성화
3. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
4. 승인된 리디렉션 URI 설정: `http://localhost:3000/api/auth/google/callback`

### 11.2 환경 변수 (.env)
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

---

## 12. 실행 방법

```bash
# 의존성 설치
cd client && npm install
cd ../server && npm install

# 개발 서버 실행
npm run dev  # client와 server 동시 실행

# 접속
http://localhost:5173  # 프론트엔드
http://localhost:3000  # 백엔드 API
```

---

## 13. 향후 확장 (선택)

### 13.1 AI 기획서 파싱 (Phase 6)

템플릿 형식이 아닌 일반 기획서/PRD를 업로드하면 AI가 태스크를 자동 추출하는 기능.

**플로우**:
```
일반 기획서 업로드
  → Claude API로 분석
  → 태스크 추출 + 소요시간 추정 + 의존성 파악
  → 편집 가능한 UI로 결과 표시
  → 사용자가 검토/수정
  → 확정 후 스케줄 생성 또는 템플릿 md로 저장
```

**UI 추가**:
```
┌─────────────────────────────────────────────────────┐
│  📄 파일 업로드                                     │
│                                                     │
│  파일 형식:                                         │
│  ◉ 템플릿 형식 (태스크 정리됨) - 바로 스케줄 생성   │
│  ○ 일반 문서 (기획서/PRD) - AI가 태스크 추출       │
│                                                     │
└─────────────────────────────────────────────────────┘

         ↓ (일반 문서 선택 시)

┌─────────────────────────────────────────────────────┐
│  🤖 AI 분석 결과                                    │
│                                                     │
│  프로젝트: 인스타 자동 콘텐츠 시스템                │
│  예상 마감: 2025-01-15 (문서에서 추출)              │
│                                                     │
│  추출된 태스크:                         [전체 수정] │
│  ┌─────────────────────────────────────────────┐    │
│  │ #  │ 태스크명              │ 시간 │ 블록  │    │
│  ├─────────────────────────────────────────────┤    │
│  │ 1  │ Instagram API 리서치  │ [1h] │ short │ ✏️ │
│  │ 2  │ OAuth 연동            │ [2h] │ long  │ ✏️ │
│  │ 3  │ 이미지 생성 API 선정  │ [1h] │ short │ ✏️ │
│  │ 4  │ 이미지 생성 구현      │ [3h] │ long  │ ✏️ │
│  │    │                       │      │       │ ➕ │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  의존성 (AI 추정):                                  │
│  #3 → #4 (이미지 API 선정 후 구현)                  │
│  #2 → #4 (OAuth 필요)                               │
│                                            [수정]   │
│                                                     │
│  ⚠️ AI 추정이므로 소요시간을 검토해주세요           │
│                                                     │
│  [템플릿으로 저장]  [스케줄 생성으로 진행]          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**추가 API**:
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/ai/parse | 일반 문서 AI 분석 |

**API 상세**:
```typescript
// POST /api/ai/parse
// Request: multipart/form-data (md, txt, pdf 파일)

// Response (성공)
{
  success: true,
  project: "인스타 자동 콘텐츠 시스템",
  deadline: "2025-01-15",
  confidence: 0.85,  // AI 확신도
  tasks: [
    {
      id: "1",
      name: "Instagram API 문서 리서치",
      duration: 60,
      blockType: "short",
      dependencies: [],
      reasoning: "API 연동 전 문서 파악 필요"  // AI 판단 근거
    },
    // ...
  ],
  warnings: [
    "소요시간은 추정치입니다. 실제와 다를 수 있습니다.",
    "의존성 관계를 검토해주세요."
  ]
}

// Response (파싱 불가)
{
  success: false,
  requirements: [
    {
      type: "missing_tasks",
      message: "문서에서 구체적인 작업 항목을 찾을 수 없습니다. 개발해야 할 기능이나 작업 목록을 추가해주세요."
    },
    {
      type: "missing_scope", 
      message: "프로젝트 범위가 명확하지 않습니다. 어디까지 개발할 것인지 범위를 정의해주세요."
    },
    {
      type: "too_abstract",
      message: "'시스템 구축', '기능 개발' 등 추상적인 표현이 많습니다. 구체적인 작업 단위로 나눠주세요."
    }
  ],
  suggestions: [
    "기능 목록을 bullet point로 정리해보세요",
    "각 기능에 대해 '무엇을 만들 것인지' 구체적으로 작성해주세요",
    "기술 스택이나 사용할 API가 있다면 명시해주세요"
  ],
  partialTasks: [  // 일부라도 추출 가능한 경우
    {
      id: "1",
      name: "API 연동 (상세 내용 필요)",
      duration: null,
      needsDetail: true
    }
  ]
}
```

**파싱 불가 시 UI**:
```
┌─────────────────────────────────────────────────────┐
│  ⚠️ 문서 분석 결과                                  │
│                                                     │
│  태스크를 추출하기 어렵습니다.                      │
│  아래 내용을 보완해주세요:                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ❌ 구체적인 작업 항목을 찾을 수 없습니다.   │    │
│  │    → 개발할 기능이나 작업 목록을 추가해주세요│    │
│  │                                             │    │
│  │ ❌ 프로젝트 범위가 명확하지 않습니다.       │    │
│  │    → 어디까지 개발할지 범위를 정의해주세요  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  💡 이렇게 작성하면 좋아요:                         │
│  ┌─────────────────────────────────────────────┐    │
│  │ • 기능 목록을 bullet point로 정리           │    │
│  │ • 각 기능에 대해 '무엇을 만들지' 구체적으로 │    │
│  │ • 사용할 기술 스택이나 API 명시             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [문서 다시 업로드]  [템플릿 형식으로 직접 작성]    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**파싱 불가 판단 기준**:
| 상황 | 판단 |
|------|------|
| 추출된 태스크 0개 | 파싱 불가 |
| 태스크는 있지만 모두 추상적 | 경고 + 부분 결과 |
| 소요시간 추정 불가 | 경고 + null로 표시 |
| 의존성 파악 불가 | 경고 + 빈 배열로 표시 |
```

**Claude API 프롬프트 예시**:
```
다음 기획서를 분석해서 개발 태스크를 추출해줘.

각 태스크에 대해:
- 태스크명 (구체적인 작업 단위)
- 예상 소요시간 (1인 개발자 기준, 시간 단위)
- 블록타입 (short: 1시간 이내 집중 불필요, long: 2시간 이상 집중 필요)
- 의존성 (이 태스크 전에 완료되어야 하는 태스크)
- 판단 근거

JSON 형식으로 응답해줘.
```

**추가 환경변수**:
```
ANTHROPIC_API_KEY=your_api_key
```

**고려사항**:
| 항목 | 내용 |
|------|------|
| API 비용 | 기획서 1개당 약 $0.01~0.05 (Sonnet 기준) |
| 정확도 | 소요시간은 AI가 틀릴 가능성 높음 → 사용자 검토 필수 |
| 저장 | "템플릿으로 저장" 시 정리된 md 파일로 내보내기 |

**예상 개발 시간**: 4-6시간

---

### 13.2 기타 확장 기능

- [ ] 태스크 완료 체크 시 md 파일 자동 업데이트
- [ ] 미완료 태스크 다음 주로 자동 재배치
- [ ] 드래그로 스케줄 직접 수정
- [ ] Vercel/Railway 배포
- [ ] PWA 지원 (모바일 홈 화면 추가)
