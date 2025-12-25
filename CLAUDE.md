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

### 설정 예시

```yaml
# config.yaml - 업무/개인 시간 분리 예시
available:
  Mon:
    - time: 09:00-10:00
      type: routine      # 아침 루틴 (출근 준비 등)
    - time: 10:00-12:00
      type: project      # 업무 시간 - 프로젝트만
    - time: 13:00-18:00
      type: project      # 업무 시간 - 프로젝트만
    - time: 19:00-23:00
      type: any          # 개인 시간 - 모두 가능
  Sat:
    - time: 10:00-22:00
      type: any          # 주말 개인 시간
```

### 파일 업로드 전략

| 시간대 | 슬롯 타입 | 올릴 파일 |
|--------|----------|----------|
| 평일 10-18시 | `project` | 업무 프로젝트 → Focus |
| 평일 19-23시 | `any` | 개인 프로젝트 → Buffer, 개인 루틴 |
| 주말 | `any` | 개인 프로젝트, 개인 루틴 |

### 배치 결과

1. **업무 프로젝트** (Focus): 평일 낮 `project` 슬롯에 우선 배치
2. **개인 프로젝트** (Buffer): Focus 배치 후 남는 `any` 슬롯(저녁/주말)에 배치
3. **업무 루틴**: 아침 `routine` 슬롯에 배치
4. **개인 루틴**: 저녁/주말 `any` 슬롯에 배치
