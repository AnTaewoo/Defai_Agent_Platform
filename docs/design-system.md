# D.A.P 디자인 시스템 — "Mission Console / Daylight" (LOCKED)

> 라이트 퍼스트, 정밀 계기(refined minimal) 콘솔. 거의 모노톤 — 잉크 1색 + 4단 라이트 서피스.
> 모든 UI는 **shadcn/ui** 프리미티브 위에서만 만든다. 색은 **아래 5색 팔레트로 강제**한다.

---

## 0. 절대 규칙

1. **컴포넌트 소스는 shadcn/ui 하나뿐.** shadcn에 있는 걸 손으로 다시 만들지 않는다.
2. **색은 D.A.P 5색 팔레트만.** 브랜드/서피스에 다른 색을 끌어오지 않는다.
3. **라이트 퍼스트.** 고스트(#fafaff)를 바탕으로, 잉크(#1c1c1c)를 텍스트/프라이머리로. 다크 모드는 동일 5색 반전으로 선택 제공.
4. **저채도 = 절제로 승부.** 색이 거의 없으므로 위계는 톤·여백·헤어라인 보더·타이포로 만든다.

## 1. 색상 팔레트 (강제 · 5색)

| 토큰 | hex | HSL | 역할 |
|---|---|---|---|
| ink   | `#1c1c1c` | `0 0% 11%`   | 텍스트, primary, 강조 잉크 |
| sage  | `#daddd8` | `96 7% 86%`  | 보더/디바이더(가장 "색"있는 라이트) |
| cream | `#ecebe4` | `52 17% 91%` | muted 서피스, 보조 배경 |
| mist  | `#eef0f2` | `210 13% 94%`| 카드/패널 표면 |
| ghost | `#fafaff` | `240 100% 99%`| 페이지 배경(최상위 라이트) |

## 2. shadcn 토큰 매핑 (`app/globals.css`)

```css
:root {
  --background: 240 100% 99%;   /* ghost */
  --foreground: 0 0% 11%;       /* ink   */
  --card: 210 13% 94%;          /* mist  */
  --card-foreground: 0 0% 11%;
  --popover: 240 100% 99%;
  --popover-foreground: 0 0% 11%;
  --muted: 52 17% 91%;          /* cream */
  --muted-foreground: 0 0% 38%;
  --border: 96 7% 86%;          /* sage  */
  --input: 96 7% 86%;
  --ring: 0 0% 11%;

  --primary: 0 0% 11%;          /* ink   */
  --primary-foreground: 240 100% 99%;
  --secondary: 52 17% 91%;      /* cream */
  --secondary-foreground: 0 0% 11%;
  --accent: 96 7% 86%;          /* sage  */
  --accent-foreground: 0 0% 11%;

  --radius: 0.5rem;
}

/* 선택: 다크 모드 = 같은 5색 반전 */
.dark {
  --background: 0 0% 11%;       /* ink   */
  --foreground: 240 100% 99%;   /* ghost */
  --card: 0 0% 14%;
  --muted: 0 0% 18%;
  --muted-foreground: 96 7% 72%;
  --border: 0 0% 22%;
  --primary: 240 100% 99%;
  --primary-foreground: 0 0% 11%;
  --secondary: 0 0% 18%;
  --accent: 96 7% 30%;
  --ring: 240 100% 99%;
}
```

## 3. 분위기 / 깊이 (라이트 미니멀)

- 그림자는 거의 안 쓰고 **sage 헤어라인 보더(1px)**로 면을 가른다.
- 배경: 미세 페이퍼 그레인 또는 옅은 도트/그리드(잉크 3~5% 투명도)로 계기판 질감.
- 카드 = mist, 페이지 = ghost, muted 영역 = cream — 세 단계 톤차로 위계.
- 흔한 AI룩(보라 그라데이션, 컬러풀 일러스트) 금지. 색이 거의 없는 만큼 **여백과 정렬**이 곧 디자인.

## 4. 보안등급 색상 — ⚠️ 결정 필요

5색이 전부 무채색/라이트라서 **보안등급 1~5를 브랜드 색으로 구분할 수 없다.** 두 안 중 하나를 택한다.

- **(A) 기본값 — 기능색 최소 도입:** 보안 신호 전용으로만 저채도 컬러 5단을 쓴다(브랜드 아님, 안전·식별 목적). 배지/필터/출처에만 사용.
  ```css
  --security-1: 150 28% 42%;  /* 공개  muted green  */
  --security-2: 200 32% 45%;  /* 대내  muted teal   */
  --security-3: 40 58% 46%;   /* 민감  muted amber  */
  --security-4: 25 62% 48%;   /* 비밀  muted orange */
  --security-5: 0 52% 48%;    /* 기밀  muted red    */
  ```
- **(B) 순수 모노:** 색을 일절 안 쓰고 등급은 잉크 농도 + 보더 두께 + mono 라벨(L1~L5)·아이콘으로만 표현. 가장 미니멀하나 한눈 식별성↓.

> 현재 하네스는 **(A)** 를 기본 적용해 둠. (B) 원하면 위 5줄 삭제하고 등급 표현을 타이포/농도로 전환.

## 5. 타이포그래피 (Inter 금지)

| 역할 | 폰트 | 용도 |
|---|---|---|
| Display / 헤딩 | **Chakra Petch** | 제목, 패널 헤더 |
| Body / UI | **Geist Sans** | 본문, 라벨, 버튼 |
| Mono / 데이터 | **JetBrains Mono** | 보안 ID, 등급 라벨, 메트릭, 출처 인덱스 |

대문자 라벨 `tracking-widest`, 숫자/ID/등급은 항상 mono. (조정 가능하나 Inter·Roboto·시스템폰트 회귀 금지.)

## 6. 모션 (절제)

Motion(framer-motion). 고임팩트 순간만: 대시보드 진입 staggered reveal, 스트리밍 토큰 페이드인, 에이전트 상태 인디케이터. 라이트 테마라 글로우 대신 톤/보더 트랜지션 위주.

## 7. D.A.P 특화 UI 패턴

- **보안등급 배지:** mono `L3` 형태 + (A안)색 또는 (B안)농도/보더. 출처·검색결과·청크에 부착.
- **출처(Citation) 패널:** 답변 옆 사이드 패널 — 문서명 + 등급 배지 + 청크 미리보기.
- **Agent 빌더(P8):** shadcn `Command` + `Form` + `Sheet`. 등급 선택 셀렉터.
- **명령 팔레트:** shadcn `Command`(⌘K)로 에이전트 전환/문서 검색.

## 8. 셋업 체크리스트

```bash
npx shadcn@latest init           # 그 뒤 globals.css를 위 토큰으로 덮어쓴다
npx shadcn@latest add button card dialog command tabs table badge tooltip sheet sidebar scroll-area form
# 폰트: next/font로 Chakra Petch / Geist / JetBrains Mono 로드, Inter 제거
```
