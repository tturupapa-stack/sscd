# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Scheduler는 md 파일을 드래그앤드롭하면 태스크를 파싱하여 사용자의 가용 시간에 맞게 자동 배치하고 Google Calendar에 등록하는 웹 애플리케이션입니다.

## Tech Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Calendar**: Google Calendar API (googleapis)
- **File Parsing**: YAML frontmatter + 정규식

## Project Structure

```
/smart-scheduler
  ├── /client          # React frontend (Vite)
  ├── /server          # Node.js backend (Express)
  └── /data            # User data (config.yaml, md files)
      ├── config.yaml
      ├── /routines
      └── /projects
```

## Build & Run Commands

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Run development servers
npm run dev  # starts both client and server

# Access
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

## Core Concepts

### File Types
1. **프로젝트 파일** (`/data/projects/*.md`): 태스크 목록과 의존성
2. **루틴 파일** (`/data/routines/*.md`): 반복 일정

### Task Line Format (프로젝트)
```
- [ ] #{ID} {태스크명} | {소요시간} | {블록타입} | {의존성}
```
- 소요시간: `1h`, `30m`, `1.5h`
- 블록타입: `short` (≤1h 슬롯), `long` (≥3h 슬롯), `any`
- 의존성: `after:#1` 또는 `after:#1,#2`

### Routine Line Format
```
- [ ] {루틴명} | {소요시간} | {반복주기} | {선호시간}
```
- 반복주기: `daily`, `weekdays`, `weekends`, `Mon,Wed,Fri`
- 선호시간: `09:00`, `morning`, `afternoon`, `evening`

### Scheduling Priority
1. Routine - 고정 시간에 먼저 배치
2. Focus 프로젝트 - 남는 시간에 우선 배치
3. Buffer 프로젝트 - 마지막으로 배치

### Slot Type (슬롯 타입)
각 시간대 슬롯에 배치 가능한 태스크 유형을 제한할 수 있습니다:
- `routine`: 루틴만 배치 가능
- `project`: 프로젝트(Focus/Buffer)만 배치 가능
- `any`: 모든 유형 배치 가능 (기본값)

### Calendar Event Title Format
Google Calendar에 등록되는 이벤트 제목 형식:
- 프로젝트 태스크: `[프로젝트명] 태스크명`
- 분할된 태스크: `[프로젝트명] 태스크명 (Part 1)`
- 루틴: `루틴명`

### Parsing Regex
```typescript
// Task
const TASK_REGEX = /^- \[ \] #(\d+)\s+(.+?)\s*\|\s*(\d+\.?\d*[hm])\s*(?:\|\s*(short|long|any))?\s*(?:\|\s*after:(#[\d,#]+))?$/;

// Routine
const ROUTINE_REGEX = /^- \[ \] (.+?)\s*\|\s*(\d+\.?\d*[hm])\s*\|\s*([a-zA-Z,]+)\s*(?:\|\s*(\d{2}:\d{2}|morning|afternoon|evening))?$/;
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/config` | 설정 조회/저장 |
| POST | `/api/parse` | md 파일 파싱 |
| POST | `/api/schedule` | 스케줄 생성 (미리보기) |
| POST | `/api/calendar/sync` | Google Calendar 등록 |
| GET | `/api/calendar/events` | 기존 캘린더 조회 |
| GET | `/api/auth/google` | OAuth 시작 |
| GET | `/api/auth/google/callback` | OAuth 콜백 |

## Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Scheduling Algorithm Rules

1. **의존성 처리**: `after:#N` 선행 태스크 완료 후에만 배치
2. **블록타입 매칭**: short→짧은 슬롯, long→긴 슬롯에만 배치
3. **슬롯 타입 매칭**: routine 슬롯에는 루틴만, project 슬롯에는 프로젝트만
4. **컨텍스트 스위칭 최소화**: 하루에 프로젝트 전환 최대 1회
5. **같은 프로젝트 연속 배치** 우선
6. **루틴 대체 배치**: 선호 시간에 슬롯이 없으면 같은 주의 다른 요일에 대체 배치

## Config Format (config.yaml)

```yaml
available:
  Mon:
    - time: 09:00-10:00
      type: routine      # 루틴 전용
  Tue:
    - time: 09:00-10:00
      type: routine
    - time: 13:00-14:00
      type: project      # 프로젝트 전용
    - time: 19:00-23:00
      type: any          # 모두 가능
  # ... 다른 요일도 동일 형식

focus: project-file.md   # Focus 프로젝트 파일명
buffer: ""               # Buffer 프로젝트 파일명 (없으면 빈 문자열)
schedule_weeks: 2        # 스케줄 생성 기본 주 수
calendar_id: primary     # Google Calendar ID
```

## Usage Guide: 업무/개인 시간 분리

슬롯 타입과 역할(Focus/Buffer)을 조합하여 업무/개인 태스크를 시간대별로 분리할 수 있습니다.

### 권장 설정 (업무 루틴 + 프로젝트 함께 사용)

업무 시간에 정기 미팅/스탠드업 등 반복 업무가 있다면 `any` 타입을 사용하세요:

```yaml
# config.yaml - 업무 루틴 + 프로젝트 함께 배치
available:
  Mon:
    - time: 06:00-07:00
      type: routine      # 개인 루틴 (운동 등)
    - time: 10:00-13:00
      type: any          # 업무 시간 (업무 루틴 + 프로젝트)
    - time: 14:00-19:00
      type: any          # 업무 시간 (업무 루틴 + 프로젝트)
    - time: 19:00-23:00
      type: any          # 개인 시간
  Sat:
    - time: 21:00-24:00
      type: any          # 주말 개인 시간
```

### 배치 순서

1. **루틴이 먼저 배치됨** (스탠드업, 정기 미팅 등)
2. **Focus 프로젝트** → 루틴 배치 후 남는 시간에
3. **Buffer 프로젝트** → 마지막으로 남는 시간에

### 파일 업로드 전략

| 시간대 | 슬롯 타입 | 배치 내용 |
|--------|----------|----------|
| 아침 06-07시 | `routine` | 개인 루틴 (운동) |
| 업무 10-19시 | `any` | 업무 루틴 먼저 → 프로젝트 |
| 저녁 19-23시 | `any` | 개인 루틴 + 개인 프로젝트 |

### 업무 루틴 예시

```markdown
---
type: routine
name: 데일리 업무
priority: high
---

## Schedule

- [ ] 데일리 스탠드업 | 30m | weekdays | 10:00
- [ ] 주간 팀 미팅 | 1h | Mon | 14:00
- [ ] 코드 리뷰 | 1h | Tue,Thu | 16:00
```

## Settings Page Features

### 시간 자동 정렬
설정 페이지에서 시간대를 추가하거나 수정하면 자동으로 시간순 정렬됩니다.
예: 19:00-23:00 먼저 추가 → 09:00-10:00 나중에 추가 → 자동으로 09:00이 위로 정렬
