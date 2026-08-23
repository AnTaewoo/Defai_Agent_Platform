# D.A.P Frontend (P7~P9)

두 개의 콘솔 표면이 같은 앱 셸을 공유한다.

|표면        |스펙              |프로토타입(기능별 · stateless)                              |사용자                                       |스코프                     |
|----------|----------------|----------------------------------------------------|------------------------------------------|------------------------|
|**사용자 콘솔**|`CONSOLE.md`    |`prototypes/u-*.html` (통합 데모 `dap-console.html`)    |user · L1~L4 (프로젝트 내 viewer~project_admin)|할당·생성 프로젝트 + 내 데이터 라이브러리|
|**관리자 콘솔**|`OPS_CONSOLE.md`|`prototypes/a-*.html` (통합 데모 `dap-ops-console.html`)|admin · L5                                |시스템 전역                  |

- 사용자(P7~P8): 로그인/회원가입 → **top-level 데이터 라이브러리**(업로드·파싱·청킹·임베딩 local) + **프로젝트**(개요·데이터·에이전트·챗). 챗은 **데이터 다중 + 에이전트 1개** 선택 + 출처. 등급 표기 `L1`~`L5` / `PRIVATE`.
- 관리자(P9): 전 user 데이터·에이전트 관찰·등급 관리 · 클리어런스 L1~L5 승격/강등 · **LLM 소스 on-prem↔cloud 전역 토글**(경고·audit) · **인프라·리소스**(노드/모델·OpenSearch·PostgreSQL·Airflow·MinIO·Sandbox Egress) 감시 · 행동·접속 감사/alert.
- 프로토타입 HTML은 **시각·인터랙션 확정본**(ADOPTED)이고 각 스펙과 1:1이다. 기능(화면) 단위 stateless 페이지로 쪼개 공통 `prototypes/dap.css`를 공유하며, `prototypes/index.html`에서 전부 진입한다. 구현 시 이 화면들을 shadcn 프리미티브로 옮긴다.

## 계정·등급 모델 (핵심)

- 클리어런스 **L1~L5** 단일 축. **L1~L4 = user**, **L5 = admin**(관리자 콘솔 접근권).
- 가입은 항상 user로(`/join`, 기본 **L1**). **admin은 직접 가입 불가** — 기존 admin이 user를 **L5로 승격**해야 admin이 되고, 언제든 **강등** 가능. **초창기 admin은 L5 고정.**
- 프로젝트 내 역할(viewer · member · editor · manager · 생성자=project_admin)은 **행동 게이트**(CRUD·초대). 초대는 **manager·project_admin**만, **자신보다 높은 클리어런스 user도 초대 가능**.
- 공용/개인: 데이터·에이전트는 **공용**(프로젝트 멤버에게 등급 한도 내 노출, L1~L5) 또는 **private**(생성자 본인 + admin만). **등급 배지 표기는 공용=`L1`~`L5`, 비공개=`PRIVATE`**.
- 등급 부여 제약: 공용 항목에 부여 가능한 보안등급은 **본인 클리어런스 이하**. 등급 N으로 만들면 **클리어런스 N 이상**만 열람.
- **데이터는 프로젝트에 묶이지 않는다.** 업로드는 user 최상위 **데이터 라이브러리**(`/data`), 프로젝트는 거기서 **데이터 추가(attach)** 로 가져다 쓴다(새 업로드는 데이터함에서만). 임베딩·색인은 항상 on-prem/local.

## 망분리 · LLM 소스 (LOCKED 기본값)

- 기본은 온프레미스 망분리(air-gap). **외부 LLM 호출 0 · EGRESS 0**이 기본 불변식.
- cloud API(OpenAI 등)는 **admin만** 조작하는 전역 스위치. 토글 시 **전 에이전트 LLM 파이프라인 즉시 전환**, cloud 동안 사용자 콘솔 챗에서 **L3 이상 사용 시 경고**(차단 아님, admin 책임). 임베딩은 토글과 무관하게 항상 on-prem.
- 사용자 콘솔은 사이드바 하단에 현재 LLM 소스를 읽기전용 표시(`ON-PREM` / `CLOUD · 외부`).

## 디자인 (LOCKED)

- 스택: Next.js + **shadcn/ui 강제** + Tailwind + Motion
- 테마: “Mission Console / Daylight” 라이트 퍼스트 미니멀. **shadcn 기본 테마/Inter 금지.**
- 컬러: 5색 팔레트 강제 — `#1c1c1c #daddd8 #ecebe4 #eef0f2 #fafaff`
- 등급 기능색(L1~L5)·상태 LED는 신호 전용. 모든 토큰·폰트·패턴은 `../docs/design-system.md`를 따른다.

## 착수

```bash
npx shadcn@latest init
# globals.css를 docs/design-system.md의 D.A.P 5색 토큰으로 덮어쓰기
npx shadcn@latest add button card dialog command tabs table badge tooltip sheet sidebar scroll-area form progress
# 폰트: next/font로 Chakra Petch / Geist / JetBrains Mono 로드, Inter 제거
```

라우트 그룹: `(console)/`(사용자) · `(admin)/`(관리자, 클리어런스 L5 게이트). P4(MVP) 안정화 후 착수 권장.

## 프로토타입 인덱스 (`prototypes/`)

- 공통: `index.html`(전체 진입) · `dap.css`(공통 스타일)
- 사용자: `u-auth` · `u-dashboard` · `u-library` · `u-project-overview` · `u-project-data` · `u-project-add-data` · `u-agents` · `u-chat`
- 관리자: `a-overview` · `a-users` · `a-data` · `a-agents` · `a-llm` · `a-audit`
  - 인프라·리소스(`/admin/infra`)는 스펙 `OPS_CONSOLE.md §3.7`에만 정의 — 프로토타입 페이지는 다음 차수(노드 GPU/CPU·모델↔노드↔LLM 표 + 서비스 상태 타일).
- 통합 흐름 데모: `dap-console.html` · `dap-ops-console.html`