# Musinsa-Inspired Design System

무신사 스타일에서 영감을 받은 모던 디자인 시스템입니다.
직접적인 복제가 아닌, 핵심 디자인 철학을 재해석하여 독창적인 스타일을 만듭니다.

## 디자인 철학

### 핵심 원칙
1. **Bold Minimalism**: 과감한 여백과 강렬한 대비
2. **Editorial Approach**: 매거진/에디토리얼 느낌의 레이아웃
3. **Confident Typography**: 굵고 자신감 있는 타이포그래피
4. **Strategic Color**: 모노톤 베이스 + 전략적 액센트 컬러

---

## 컬러 팔레트

### Primary Colors (모노톤 베이스)
```css
:root {
  /* 기본 흑백 */
  --color-black: #0A0A0A;          /* 순수 검정 대신 소프트 블랙 */
  --color-white: #FAFAFA;          /* 순수 흰색 대신 오프화이트 */

  /* 그레이스케일 */
  --color-gray-900: #1A1A1A;
  --color-gray-800: #2D2D2D;
  --color-gray-700: #404040;
  --color-gray-600: #525252;
  --color-gray-500: #6B6B6B;
  --color-gray-400: #8A8A8A;
  --color-gray-300: #ABABAB;
  --color-gray-200: #D4D4D4;
  --color-gray-100: #EBEBEB;
  --color-gray-50: #F5F5F5;
}
```

### Accent Colors (전략적 포인트)
```css
:root {
  /* 메인 액센트 - 선택 1개만 사용 권장 */
  --accent-coral: #FF6B5B;         /* 따뜻한 코랄 */
  --accent-electric: #4F46E5;      /* 일렉트릭 인디고 */
  --accent-mint: #10B981;          /* 민트 그린 */
  --accent-gold: #F59E0B;          /* 골드 옐로우 */

  /* 상태 컬러 */
  --color-success: #22C55E;
  --color-warning: #EAB308;
  --color-error: #EF4444;
  --color-info: #3B82F6;
}
```

### 다크 모드
```css
[data-theme="dark"] {
  --bg-primary: #0A0A0A;
  --bg-secondary: #141414;
  --bg-tertiary: #1F1F1F;
  --text-primary: #FAFAFA;
  --text-secondary: #A3A3A3;
  --text-muted: #6B6B6B;
  --border-color: #2D2D2D;
}

[data-theme="light"] {
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F5F5F5;
  --text-primary: #0A0A0A;
  --text-secondary: #525252;
  --text-muted: #8A8A8A;
  --border-color: #EBEBEB;
}
```

---

## 타이포그래피

### 폰트 스택
```css
:root {
  /* 한글 + 영문 조합 */
  --font-sans: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Pretendard', 'SF Pro Display', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 타입 스케일 (모바일 퍼스트)
```css
/* Display - 히어로/메인 타이틀 */
.text-display {
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

/* Heading 1 - 섹션 타이틀 */
.text-h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Heading 2 */
.text-h2 {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

/* Heading 3 */
.text-h3 {
  font-size: clamp(1.25rem, 3vw, 1.5rem);
  font-weight: 600;
  line-height: 1.4;
}

/* Body Large */
.text-body-lg {
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.6;
}

/* Body - 기본 */
.text-body {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
}

/* Body Small */
.text-body-sm {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
}

/* Caption */
.text-caption {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
```

---

## 스페이싱 시스템

### 8px 기반 그리드
```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */
  --space-7: 2.5rem;    /* 40px */
  --space-8: 3rem;      /* 48px */
  --space-9: 4rem;      /* 64px */
  --space-10: 5rem;     /* 80px */
  --space-11: 6rem;     /* 96px */
  --space-12: 8rem;     /* 128px */
}
```

### 컨테이너
```css
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--space-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 var(--space-8);
  }
}
```

---

## 레이아웃 패턴

### 1. 카드 그리드
```tsx
// 반응형 카드 그리드
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### 2. 수평 스크롤 섹션 (Pan Style)
```tsx
// 무신사 스타일 가로 스크롤
<section className="overflow-hidden">
  <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 -mx-4
                  snap-x snap-mandatory scroll-smooth">
    {items.map(item => (
      <div key={item.id} className="flex-none w-[280px] snap-start">
        <Card {...item} />
      </div>
    ))}
  </div>
</section>
```

### 3. 섹션 헤더
```tsx
// 볼드한 섹션 헤더
<div className="flex items-end justify-between mb-6">
  <div>
    <span className="text-caption text-gray-500 mb-1 block">TRENDING</span>
    <h2 className="text-h2 font-bold">인기 급상승</h2>
  </div>
  <button className="text-body-sm font-medium hover:underline">
    전체보기 →
  </button>
</div>
```

### 4. 풀블리드 히어로
```tsx
// 풀스크린 히어로 섹션
<section className="relative h-[70vh] min-h-[500px] bg-black text-white">
  <div className="absolute inset-0">
    <Image src={heroImage} alt="" fill className="object-cover opacity-60" />
  </div>
  <div className="relative z-10 container h-full flex items-end pb-12">
    <div className="max-w-2xl">
      <span className="text-caption text-gray-400 mb-4 block">NEW ARRIVAL</span>
      <h1 className="text-display mb-4">Winter Collection</h1>
      <p className="text-body-lg text-gray-300 mb-8">
        2024 겨울 신상품을 만나보세요
      </p>
      <button className="btn-primary">컬렉션 보기</button>
    </div>
  </div>
</section>
```

---

## 컴포넌트 스타일

### 버튼
```tsx
// Primary Button
<button className="
  bg-black text-white dark:bg-white dark:text-black
  px-6 py-3 font-semibold
  hover:bg-gray-800 dark:hover:bg-gray-100
  active:scale-[0.98] transition-all duration-150
">
  Button
</button>

// Secondary Button (Outline)
<button className="
  border-2 border-black text-black dark:border-white dark:text-white
  px-6 py-3 font-semibold
  hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black
  transition-all duration-150
">
  Button
</button>

// Ghost Button
<button className="
  text-black dark:text-white font-medium
  hover:underline underline-offset-4
  transition-all duration-150
">
  Button →
</button>
```

### 카드
```tsx
// 상품/콘텐츠 카드
<article className="group cursor-pointer">
  {/* 이미지 */}
  <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-3">
    <Image
      src={image}
      alt={title}
      fill
      className="object-cover transition-transform duration-500
                 group-hover:scale-105"
    />
    {/* 뱃지 */}
    {badge && (
      <span className="absolute top-3 left-3 px-2 py-1 text-caption
                       bg-black text-white">
        {badge}
      </span>
    )}
  </div>

  {/* 정보 */}
  <div>
    <span className="text-caption text-gray-500">{category}</span>
    <h3 className="text-body font-medium mt-1 group-hover:underline">
      {title}
    </h3>
    <div className="mt-2 flex items-baseline gap-2">
      {discountPercent && (
        <span className="text-body font-bold text-accent-coral">
          {discountPercent}%
        </span>
      )}
      <span className="text-body font-bold">{price}원</span>
      {originalPrice && (
        <span className="text-body-sm text-gray-400 line-through">
          {originalPrice}원
        </span>
      )}
    </div>
  </div>
</article>
```

### 뱃지/태그
```tsx
// 강조 뱃지
<span className="inline-flex px-3 py-1 text-caption font-semibold
                 bg-black text-white dark:bg-white dark:text-black">
  NEW
</span>

// 서브 뱃지
<span className="inline-flex px-2 py-0.5 text-caption
                 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
  BEST
</span>

// 할인 뱃지
<span className="inline-flex px-2 py-0.5 text-caption font-bold
                 text-accent-coral">
  -30%
</span>
```

### 네비게이션
```tsx
// 탭 네비게이션
<nav className="border-b border-gray-200 dark:border-gray-800">
  <div className="flex gap-1 overflow-x-auto scrollbar-hide">
    {tabs.map(tab => (
      <button
        key={tab.id}
        className={`
          px-4 py-3 text-body-sm font-medium whitespace-nowrap
          border-b-2 transition-colors duration-150
          ${isActive
            ? 'border-black text-black dark:border-white dark:text-white'
            : 'border-transparent text-gray-500 hover:text-black dark:hover:text-white'}
        `}
      >
        {tab.label}
      </button>
    ))}
  </div>
</nav>
```

### 입력 필드
```tsx
// 검색 입력
<div className="relative">
  <input
    type="text"
    placeholder="검색어를 입력하세요"
    className="
      w-full px-4 py-3 pr-12
      bg-gray-50 dark:bg-gray-900
      border-0 border-b-2 border-gray-200 dark:border-gray-700
      focus:border-black dark:focus:border-white
      outline-none transition-colors duration-150
      text-body placeholder:text-gray-400
    "
  />
  <button className="absolute right-3 top-1/2 -translate-y-1/2">
    <SearchIcon className="w-5 h-5 text-gray-500" />
  </button>
</div>
```

---

## 애니메이션

### 트랜지션 기본값
```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  --transition-slower: 500ms ease;
}
```

### 호버 효과
```css
/* 이미지 줌 */
.hover-zoom {
  transition: transform var(--transition-slower);
}
.hover-zoom:hover {
  transform: scale(1.05);
}

/* 언더라인 슬라이드 */
.hover-underline {
  position: relative;
}
.hover-underline::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width var(--transition-base);
}
.hover-underline:hover::after {
  width: 100%;
}

/* 버튼 프레스 */
.hover-press:active {
  transform: scale(0.98);
}
```

### 스크롤 애니메이션 (선택적)
```tsx
// Framer Motion 페이드 인
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
};
```

---

## Tailwind CSS 설정

### tailwind.config.ts 권장 설정
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        black: '#0A0A0A',
        white: '#FAFAFA',
        accent: {
          coral: '#FF6B5B',
          electric: '#4F46E5',
          mint: '#10B981',
          gold: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display': ['clamp(2.5rem, 8vw, 4.5rem)', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '800' }],
        'h1': ['clamp(2rem, 5vw, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2': ['clamp(1.5rem, 4vw, 2rem)', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h3': ['clamp(1.25rem, 3vw, 1.5rem)', { lineHeight: '1.4', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
}

export default config
```

---

## 사용 가이드

### 이 디자인 시스템을 적용할 때
1. **색상은 절제하세요**: 액센트 컬러는 한 가지만 선택
2. **여백을 아끼지 마세요**: 충분한 white space가 고급스러움을 만듭니다
3. **타이포는 과감하게**: 제목은 굵고 크게, 본문과 대비를 주세요
4. **사진이 핵심**: 고품질 이미지와 적절한 비율이 중요합니다
5. **모바일 우선**: 작은 화면에서 먼저 디자인하세요

### 피해야 할 것
- 여러 색상 동시 사용
- 작고 가는 제목
- 과한 그림자 효과
- 둥근 모서리 과다 사용 (sharp edge 선호)
- 복잡한 그라데이션

---

## 참고 사이트 (비슷한 스타일)
- Zara.com
- COS.com
- SSENSE.com
- Mr Porter
- End Clothing

이 디자인 시스템은 무신사에서 영감을 받았지만, 자체적인 색상 팔레트와 타이포그래피 시스템으로 차별화됩니다.
