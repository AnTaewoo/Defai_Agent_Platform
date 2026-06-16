# D.A.P 사용자 콘솔 — 프론트엔드 빌드 스펙 (Harness, DRAFT)

> 문서정보: D.A.P · 프론트 · 구현스펙 · 근거 `docs/design-system.md`, `backend/src/types.py`, `CLAUDE.md`
> 상태: **초안(DRAFT)**. 관리자 콘솔(`OPS_CONSOLE.md`)과 같은 앱 셸을 공유한다. 시각 언어 동일(Mission Console / Daylight), 스코프·권한이 다르다.

`user`(L1~L4)가 로그인/회원가입으로 진입해 **내 데이터 라이브러리**(top-level)와 **할당·생성 프로젝트**를 오가며, 프로젝트에 데이터·에이전트를 모아 챗하는 콘솔.

> 참조 프로토타입: `frontend/prototypes/dap-console.html` (시각·인터랙션 기준안, 본 스펙과 1:1).

-----

## 1. 두 축: 미시(프로젝트 역할) vs 거시(보안등급)

D.A.P의 권한은 **독립된 두 축**이다.

|축                 |값                                                      |의미                            |
|------------------|-------------------------------------------------------|------------------------------|
|**미시 — 프로젝트 내 역할**|viewer · member · editor · manager · project_admin(생성자)|그 프로젝트 안에서 무엇을 할 수 있나(CRUD·초대)|
|**거시 — 보안등급**     |**L1~L5** (가입 기본 L1, **L5 = admin**)                   |데이터·에이전트·프로젝트를 볼 수 있나(클리어런스)  |

- 역할은 **프로젝트 단위로만** 의미가 있다. 같은 user가 프로젝트마다 다른 역할을 가질 수 있다.
- 데이터·에이전트·프로젝트 자체의 **등급은 항상 L1~L5**를 따른다. 공용 항목(등급 N)은 **클리어런스 ≥ N**인 user에게만 보이고, **private**은 생성자 본인 + admin만 본다.
- **등급 부여 제약**: 공용 항목에 줄 수 있는 보안등급은 **본인 클리어런스 이하**. (예: 클리어런스 L3 → L1~L3 부여 가능, L2로 주면 클리어런스 L2 이상만 열람.)

> 등급 배지 표기: 공용은 **`L1`~`L5`** 그대로, 비공개는 **`PRIVATE`**. “공용”이라는 별도 라벨은 쓰지 않는다(등급 표시로 갈음).

-----

## 2. 데이터는 프로젝트에 묶이지 않는다 (핵심 구조)

데이터함은 **프로젝트 하위가 아니라 user 최상위(top-level) 라이브러리**다. Claude의 프로젝트/지식 라이브러리처럼, 대시보드에서 데이터를 올리고 관리한다.

- 업로드는 **메인 화면(라이브러리)** 에서. 프로젝트와 무관하게 내 소유로 쌓인다.
- 프로젝트 안에서는 **“데이터 추가”** 로, 라이브러리의 내 데이터 또는 내가 접근 가능한 공용 데이터를 그 프로젝트에 **연결(attach)** 한다.
- 이래서 *내 프로젝트에선 안 쓰지만 남이 쓰도록* 공용으로 올려두는 게 가능하다(데이터 = 재사용 가능한 지식 풀, 프로젝트 = 그걸 모아 쓰는 작업 단위).
- **업로드 즉시 파싱(P1) → 청킹·태깅(P2) → OpenSearch 임베딩·색인(P3)**. 임베딩은 **항상 on-prem(OpenSearch ML Commons / local LLM)** — admin의 cloud 토글과 무관(cloud는 생성 LLM에만 영향).

> ⚠️ 로직 영향: 청크에는 `project_id`가 박히지 않는다(라이브러리는 프로젝트 독립). 프로젝트 스코프는 별도 `project_data` 연결로 부여되고 검색 `filter`에서 해소된다. → `CLAUDE.md`·`ROADMAP` 개정 참조.

-----

## 3. 범위와 페이즈

|영역                    |DoD                                         |
|----------------------|--------------------------------------------|
|인증(로그인·회원가입)          |가입 시 user 생성·클리어런스 L1 · 로그인 후 대시보드 진입       |
|앱 셸(작업공간/프로젝트 2영역·⌘K) |인증된 user가 라이브러리·프로젝트 컨텍스트로 진입               |
|대시보드(프로젝트 + 라이브러리 진입) |멤버 프로젝트만 노출 + 프로젝트 생성                       |
|데이터함(top-level 라이브러리) |업로드→파싱→청킹→임베딩(local), 등급/PRIVATE, 색인 상태 추적  |
|프로젝트 데이터(추가)          |member+가 라이브러리/공용에서 프로젝트로 연결                |
|에이전트(공용/private·등급 자동)|project_admin이 편입, 등급은 서빙 모델에서 자동(≤ 본인)   |
|챗(데이터 다중 + 에이전트 1개)   |다중 데이터 + 단일 에이전트 SSE 스트리밍 + 출처 + cloud·L3 경고|

-----

## 3-1. 라우트 / 사이트맵

```
/                           → 인증 체크 → /login 또는 /dashboard
/login                      [public]   로그인 (user·admin 공통)
/join                       [public]   회원가입 (user 생성, 클리어런스 L1)
(console)                   [auth]     공용 셸
 ├─ /dashboard              [auth]     내 프로젝트 목록 + 생성 + 라이브러리 진입
 ├─ /data                   [auth]     내 데이터함(top-level 라이브러리·업로드)
 ├─ /p/[projectId]/overview      [멤버 전원]  프로젝트 현황
 ├─ /p/[projectId]/data          [멤버 전원 / 추가 member+]  프로젝트에 연결된 데이터(목록만)
 ├─ /p/[projectId]/data/add      [member+]  데이터 추가(이미 업로드된 데이터 연결)
 ├─ /p/[projectId]/agents        [멤버 전원 / 편입 project_admin]  에이전트(공용·private)
 └─ /p/[projectId]/chat/[sessionId] [멤버 전원]  챗(SSE) + 출처 사이드패널
```

오버레이(라우트 아님): **프로젝트 스위처**(⌘K) · **명령 팔레트**(글로벌 ⌘K) · **Data Sheet / Agent 편입 Sheet / Add-Data Sheet**(우측 Sheet, `?doc=`/`?agent=` 딥링크).

-----

## 4. 앱 셸

```
┌──────────────┬─────────────────────────────────────────────┐
│  SIDEBAR     │  TOPBAR: {작업공간 또는 PROJECT/활성} · ⌘K    │
│  (cream)     ├─────────────────────────────────────────────┤
│  D.A.P 로고  │                                             │
│  ─────────── │                                             │
│  작업공간    │            VIEW (ghost 배경)                 │
│   · 대시보드 │                                             │
│   · 데이터함 │  ← top-level 라이브러리                       │
│  ─────────── │                                             │
│  [프로젝트   │                                             │
│   스위처 ⌘K] │                                             │
│  프로젝트    │                                             │
│   · 개요     │  ← 활성 프로젝트 진입 시                      │
│   · 데이터   │                                             │
│   · 에이전트 │                                             │
│   · 채팅     │                                             │
│  ─────────── │                                             │
│  LLM: ON-PREM│  ← 전역 LLM 소스(읽기전용)                    │
│  유저 · L1   │  ← 클리어런스 배지 + (프로젝트 진입 시 역할)  │
└──────────────┴─────────────────────────────────────────────┘
```

- 사이드바 2영역: **작업공간**(대시보드·데이터함, 항상 노출) / **프로젝트**(활성 프로젝트 진입 시 개요·데이터·에이전트·채팅).
- 하단 유저 카드: 이름 + 클리어런스 배지. 프로젝트 진입 시 그 프로젝트에서의 역할(mono) 병기. 클리어런스 L5면 “관리자 콘솔” 진입 링크.
- **LLM 소스 표시(사이드바 하단, 유저 카드 위)**: 현재 전역 LLM 소스를 읽기전용 표시 — 평시 `ON-PREM`, admin이 cloud를 켜면 `CLOUD · 외부`(crit 톤). user는 상태 확인만(제어는 admin).
- 반응형: 860px 미만 사이드바 상단 스트립 접힘, 본문 단일 컬럼, 테이블 가로 스크롤.

-----

## 5. 화면별 명세

### 5.0 회원가입 (`/join`)

- 입력: 아이디 · 비밀번호 · 이름 · 소속(부서). 가입 시 **클리어런스 L1 고정**, 프로젝트 0개.
- 가입 직후 `/dashboard`(빈 상태) — “프로젝트 생성” / “데이터 올리기” / “동료·관리자가 추가할 때까지 대기” 안내.

### 5.1 대시보드 (`/dashboard`)

- **내 프로젝트 카드 그리드**: 프로젝트명 · 내 역할(mono) · 멤버 수 · 연결 데이터 수 · 최고 등급. 멤버 프로젝트만(직접 추가되면 즉시 등장).
- **프로젝트 생성**: 이름 · 설명 · 최고 등급(≤ 본인 클리어런스). 생성자 = `project_admin`.
- **데이터함 리스트**: 대시보드에서 내 데이터(라이브러리)를 바로 테이블로 표시(데이터·유형·부서·등급·색인·연결 프로젝트 수). 헤더의 “데이터함 열기”로 전체 `/data` 진입.

### 5.2 데이터함 (`/data`) — top-level 라이브러리

- **업로드 드롭존**: 드래그&드롭/클릭 + **등급 셀렉터(L1~본인 클리어런스)** + **공개 토글(공용/PRIVATE)** + 소속 부서(고정 표시). MVP 지원 형식 **PDF · XLSX**(PPT/Docs·HWP·스캔본은 ROADMAP P1 후순위).
- **업로드 플로우**: 파일 → 파싱(P1) → 청킹·태깅(P2: `owner_id`/`security_level`/`visibility`/`dept`/`source`) → 임베딩·색인(P3, **local LLM**). 행 즉시 추가 후 `색인 중 → 색인 완료(N 청크)` 전이.
- **테이블 컬럼**: 데이터(아이콘+이름+청크수) · 유형 · 부서 · **등급 배지(L1~L5 또는 PRIVATE)** · 색인 상태 · 업로드 시각 · 사용 프로젝트 수.
- **필터**: 전체 / 공용 / PRIVATE. (내 라이브러리는 전부 내 것. 남의 공용 데이터는 프로젝트의 “데이터 추가”에서 탐색.)
- 행 클릭 → **Data Sheet**(메타·청크 미리보기·등급·연결된 프로젝트 목록). 등급 본인 클리어런스 초과 선택 불가.

### 5.3 프로젝트 개요 (`/p/[id]/overview`)

- **KPI 4종**: 연결 데이터(공용/개인) · 가용 에이전트 · **색인 진행(큐 대기 수)** · **프로젝트 멤버(역할 breakdown: project_admin/manager/editor/…)**. 값 mono.
- 패널 2분할: 좌 “최근 데이터”(이름·등급 배지·색인상태), 우 “에이전트 상태”(이름·등급·LED).
- 모든 수치는 **활성 프로젝트 + 내 클리어런스 이하**로 필터된 값. “등급 위 자료·에이전트는 서버 차단으로 목록에 없음”을 카피로 명시.

### 5.4 프로젝트 데이터 (`/p/[id]/data`)

- 그 프로젝트에 **연결된 데이터** 테이블: 데이터 · 부서 · 등급 배지 · 색인 상태 · 추가한 사람. **여기서는 연결 목록만(업로드 없음).**
- **데이터 추가**(member+) → 별도 **데이터 추가 페이지**(`/p/[id]/data/add`): **이미 업로드된 데이터**(내 라이브러리 + 접근 가능한 공용)에서 선택해 연결. **새 파일 업로드는 데이터함(`/data`)에서** 먼저 올린다.
- 표시되는 데이터는 활성 프로젝트 + 내 클리어런스 이하로 필터된 결과.

### 5.5 에이전트 (`/p/[id]/agents`)

- **카드 그리드**: 이름 · 설명 · **등급 배지(L1~L5 / PRIVATE)** · 소유자 · LED 상태(대기/검색 중/유휴).
- **에이전트 편입 → Agent 편입 Sheet**(project_admin):
  - 입력: 이름 · 설명 · **공개(공용/PRIVATE)** · **서빙 모델/엔드포인트 선택**.
  - **보안등급은 선택한 서빙 모델 등급에서 자동 부여**(직접 입력 없음). 등급이 곧 열람 기준 — 공용 + 등급 N → 클리어런스 ≥ N인 멤버만 열람·선택, PRIVATE → 본인 + admin만.
  - 편입 게이트: `에이전트(=모델) 등급 ≤ 본인 클리어런스`. 초과 등급 모델은 셀렉터 `disabled` + “클리어런스 초과”.
  - **LLM 소스(on-prem/cloud)는 전역 파이프라인**(admin 토글). 에이전트는 서빙 모델/등급에 매핑되며, 토글 시 소스가 즉시 전환된다.
  - editor는 기존 에이전트의 *설정*만 편집(생성·편입 아님).
- 클리어런스 미달 등급 에이전트는 목록 자동 비노출.

### 5.6 채팅 (`/p/[id]/chat/[sessionId]`)

- **소스 선택**: 좌측 패널에서 **데이터 다중 선택**(프로젝트에 연결된 데이터 중) + **에이전트 1개 선택**(공용 에이전트 + 내가 만든 공용/private 중 택1). 세션 컨텍스트에 실린다.
- ScrollArea 메시지 + SSE 토큰 스트리밍(페이드인) + **출처 사이드패널**(데이터명 + 등급 배지 + 청크 미리보기).
- **cloud + L3 경고**: 소스가 cloud인 상태에서 선택한 데이터/에이전트에 **L3 이상**이 포함되면 전송 전 확인:

> “현재 LLM이 cloud API를 사용 중입니다. 이 데이터는 L3 이상 보안으로 외부 전송이 위험할 수 있습니다. 그래도 진행하시겠습니까?”
> 차단 없이 진행/취소(진행 시 admin 책임, audit 기록). on-prem이면 경고 없음.

-----

## 6. 역할 ↔ 권한 (프로젝트 내, 미시 축)

|역할                 |조회 R|채팅|데이터 추가|에이전트 편입|멤버 초대·관리|프로젝트 설정·삭제|
|-------------------|----|--|------|-------|--------|----------|
|viewer             |○   |○ |✗     |✗      |✗       |✗         |
|member             |○   |○ |○     |✗      |✗       |✗         |
|editor             |○   |○ |○     |✗      |✗       |✗         |
|manager            |○   |○ |○     |✗      |○       |✗         |
|project_admin (생성자)|○   |○ |○     |○      |○       |○         |

- **채팅은 프로젝트에 속한 전 역할이 가능**(viewer 포함). 단 보이는 데이터·에이전트는 본인 클리어런스 이하로 필터된 것만.
- **데이터 추가** = 라이브러리/공용 데이터를 프로젝트에 연결(attach). 업로드 자체는 top-level 데이터함에서(누구나 본인 라이브러리).
- **멤버 초대 = 직접 추가**(수락 없음). manager·project_admin이 user를 추가하면 그 user 대시보드에 즉시 등장. 역할 지정. **자신보다 높은 클리어런스 user도 초대 가능.**
- **에이전트 편입 = project_admin만**. 등급은 서빙 모델에서 자동 부여(수동 없음). editor는 기존 에이전트 *설정 편집*만.
- 게이트는 **서버 강제**. 프론트는 미들웨어 라우트 차단 + UI 미표시만.

-----

## 7. 컴포넌트 ↔ shadcn 매핑

|요소                                   |shadcn 프리미티브             |
|-------------------------------------|-------------------------|
|사이드바(작업공간/프로젝트 2영역)                  |`sidebar` + `scroll-area`|
|프로젝트 스위처 / 명령 팔레트                    |`command`(⌘K)            |
|탭                                    |`tabs`                   |
|KPI / 패널 / 대시보드 카드                   |`card`                   |
|데이터함 / 프로젝트 데이터 / 상태 표               |`table`                  |
|Data Sheet · Agent 편입 · Add-Data|`sheet` + `form`         |
|등급 배지(L1~L5 / PRIVATE) · 색인 상태       |`badge` (+ 등급 기능색)       |
|등급/cloud 경고 안내                       |`tooltip`                |
|확인·cloud L3 경고                       |`dialog`                 |
|챗 데이터 다중 선택 / 에이전트 단일                |`command` 또는 체크박스 리스트    |

**규칙**: shadcn 컴포넌트를 손으로 재구현하지 않는다. 5색 팔레트만, Inter 금지(design-system.md).

-----

## 8. 시그니처 — 보안등급 배지

- 공용: mono `L1`~`L5` + 등급명(`공개`~`기밀`) + 색 점. PRIVATE: mono `PRIVATE` + ink 톤 점(기능색 아님).
- 기능색: `L1 공개`=muted green / `L2 대내`=muted teal / `L3 민감`=muted amber / `L4 비밀`=muted orange / `L5 기밀`=muted red.
- 데이터·에이전트·프로젝트·출처·유저 어디서나 일관 부착. 5색 무채색 팔레트는 서피스/텍스트/보더에만.

-----

## 9. 데이터 계약 (프론트 ↔ 백엔드)

REST + SSE(FastAPI). 프론트 타입은 `backend/src/types.py`를 미러한다.

```
Principal      = { user_id, level(1..5), is_admin = level>=5 }
SessionContext = Principal + membership(project_id, role)
                 + selected_data_ids[] + selected_agent_id
DataItem       = { id, owner_id, security_level, visibility(shared|private), dept, doc_type, index_status }  # project_id 없음(라이브러리)
ProjectData    = { project_id, data_id, attached_at }  # 프로젝트↔데이터 N:M 연결
Agent          = { id, project_id, security_level(assigned ≤ owner.level), visibility(shared|private), owner_id }
LLMSource      = { mode: onprem|cloud, provider }     # admin 전역. 프론트는 읽기만
```

소비 엔드포인트:

```
POST /auth/join                      회원가입(클리어런스 L1)
POST /auth/login                     로그인(user·admin 공통)
POST /projects                       프로젝트 생성(최고 등급 ≤ 본인)
POST /projects/{id}/members          멤버 직접 추가(역할 지정, 수락 없음 · 상위 클리어런스 허용)
POST /data                           라이브러리 업로드(파싱·청킹·임베딩 local · 등급·공개 ≤ 본인)
GET  /data                           내 라이브러리 + 접근 가능한 공용 데이터
POST /projects/{id}/data             데이터 연결(attach, member+)
GET  /projects/{id}/data             프로젝트 연결 데이터(RBAC·등급)
POST /agents                         에이전트 편입(project_admin · 등급 자동 · 공개/private)
POST /sessions                       세션 생성(데이터 다중 + 에이전트 1개)
POST /chat            (SSE)          질의 스트리밍(출처 포함)
GET  /llm/source                     현재 LLM 소스(on-prem/cloud) 표식·경고용
```

규칙: 보안 호출은 `SessionContext` 없이 불가. 검색 `filter` = 연결 data_id ∩ `security_level ≤ level` ∩ (shared OR owner=me).

-----

## 10. 디렉토리 구조 (`frontend/`)

```
frontend/
├── app/
│   ├── globals.css                 # design-system §2 5색 토큰
│   ├── layout.tsx                  # next/font 3종 + ThemeProvider
│   ├── (auth)/{login,join}/page.tsx
│   └── (console)/
│       ├── layout.tsx              # 작업공간/프로젝트 2영역 셸 + ⌘K + LLM 소스 표시(사이드바)
│       ├── dashboard/page.tsx
│       ├── data/page.tsx           # top-level 라이브러리
│       └── p/[projectId]/
│           ├── overview/page.tsx
│           ├── data/page.tsx       # 프로젝트 연결 데이터(목록)
│           ├── data/add/page.tsx   # 데이터 추가(이미 업로드된 데이터 연결)
│           ├── agents/page.tsx
│           └── chat/[sessionId]/page.tsx
├── components/
│   ├── ui/                         # shadcn 생성물(수정 금지)
│   ├── shell/{sidebar,topbar,project-switcher,command-palette,llm-source-status}.tsx
│   ├── data/{library-table,data-sheet,upload-dropzone,add-data-sheet}.tsx
│   ├── agents/{agent-grid,agent-builder-sheet}.tsx
│   ├── chat/{chat-stream,message-list,citation-panel,source-picker,cloud-warning-dialog}.tsx
│   ├── projects/{project-grid,create-project,invite-member}.tsx
│   └── security/security-badge.tsx # 시그니처(L1~L5 / PRIVATE)
├── lib/api/{client,sse,types}.ts   # types.ts = backend types.py 미러
└── hooks/{use-chat-stream,use-session}.ts
```

-----

## 11. DoD

- 가입 = user 생성 + 클리어런스 L1. 로그인 = 대시보드 진입. L5는 관리자 콘솔도 접근.
- 데이터함: top-level 라이브러리, 업로드 즉시 파싱·청킹·임베딩(local), 등급/PRIVATE, 색인 추적.
- 프로젝트: member+ 데이터 연결, project_admin 에이전트 편입(등급 자동 ≤ 본인), editor+ 설정 편집.
- 등급 N 공용 항목은 클리어런스 N 이상만 열람. PRIVATE은 본인+admin.
- 챗: 프로젝트 멤버 전원(viewer 포함) 가능. 데이터 다중 + 에이전트 1개 → SSE + 출처. cloud + L3↑ 경고(차단 아님).
- 프로젝트 전환 시 컨텍스트 격리. 멤버 아닌 프로젝트 노출 0.

-----

## 12. 추적성

R2 유스케이스 → 본 스펙(구현). 토큰 `docs/design-system.md`, 타입 `backend/src/types.py`. 데이터-라이브러리 분리·cloud 토글은 `CLAUDE.md`(절대원칙 1·6 개정)·`ROADMAP.md`(P2·P4·P13·P5) 동기화 필요. 관리자 표면은 `OPS_CONSOLE.md`.