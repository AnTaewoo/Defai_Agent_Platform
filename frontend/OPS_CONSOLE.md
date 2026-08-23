# D.A.P 관리자 콘솔 — 프론트엔드 빌드 스펙 (Harness, DRAFT)

> 문서정보: D.A.P · 프론트 · 구현스펙 · 근거 `docs/design-system.md`, `docs/data-model.md`(audit_log·llm_endpoints)
> 상태: **초안(DRAFT)**. 사용자 콘솔(`CONSOLE.md`)과 **별개 표면**이다. 시각 언어 동일(Mission Console / Daylight), 스코프·권한이 다르다.

클리어런스 **L5(admin)** 가 **시스템 전역**을 관리하는 콘솔. 전 user의 데이터·에이전트를 관찰·등급 관리하고, 클리어런스를 상향/강등하고, **LLM 소스(on-prem ↔ cloud)** 를 전역 토글하며, **인프라·리소스(노드·모델·OpenSearch·PostgreSQL·Airflow·MinIO·Sandbox)** 를 감시하고, user의 행동·접속을 감사한다.

> 참조 프로토타입(기능별 stateless 페이지 · 본 스펙과 1:1):
> 
> |화면        |페이지                         |스펙  |
> |----------|----------------------------|----|
> |관리 개요     |`prototypes/a-overview.html`|§3.1|
> |사용자(클리어런스)|`prototypes/a-users.html`   |§3.2|
> |데이터       |`prototypes/a-data.html`    |§3.3|
> |에이전트      |`prototypes/a-agents.html`  |§3.4|
> |LLM 소스    |`prototypes/a-llm.html`     |§3.5|
> |감사 · alert|`prototypes/a-audit.html`   |§3.6|
> 
> (통합 흐름 데모는 `prototypes/dap-ops-console.html`. 공통 스타일 `prototypes/dap.css`.)

-----

## 1. 사용자 콘솔 vs 관리자 콘솔

|      |사용자 콘솔 (`CONSOLE.md`)|관리자 콘솔 (본 문서)                             |
|------|---------------------|------------------------------------------|
|스코프   |할당·생성 프로젝트           |**시스템 전역**                                |
|사용자   |`user` (L1~L4)       |`admin` (**L5**)                          |
|회원가입  |가능(`/join`)          |**직접 가입 불가** — L5 승격으로만, 초기 admin은 고정     |
|라우트 그룹|`(console)/`         |`(admin)/`                                |
|핵심 관심 |데이터·에이전트·챗           |전 user 관찰 · 등급/클리어런스 관리 · LLM 소스 · 감사     |
|가시성   |클리어런스 한도 내           |**전부**(개인/private 포함)                     |
|시그니처  |보안등급 배지              |**LLM 소스 전역 토글 + 인프라/리소스 모니터링 + 행동 alert**|


> L5를 가진 user는 관리자 콘솔에 접근한다. 승격된 admin은 언제든 강등 가능, 초창기 admin은 L5 고정. admin은 private 데이터·에이전트까지 **항상 열람**한다(감사 권한).

-----

## 2. 라우트 / 게이트

```
(admin)                     [auth + level == L5]          관리자 셸
 ├─ /admin/overview         관리 개요(전역 현황·LLM 소스·최근 alert)
 ├─ /admin/users            전 user — 클리어런스 관리(L1~L5 승격/강등) · 접속/행동 기록
 ├─ /admin/data             전 user 데이터 — 관찰 · 등급 관리
 ├─ /admin/agents           전 user 에이전트(공용+private) — 관찰 · 등급 관리
 ├─ /admin/llm              LLM 소스 — on-prem ↔ cloud 전역 토글(경고)
 ├─ /admin/infra            인프라 · 리소스 — OpenSearch·PostgreSQL·Airflow·MinIO·Sandbox + 리소스(노드/모델)
 └─ /admin/audit            감사·alert — user 행동·접속 실시간 스트림
```

- 전 라우트 **클리어런스 L5 전용**(서버 미들웨어 강제). L1~L4는 진입 0.
- 관리자 셸은 프로젝트 스위처 대신 **환경 배지**(ON-PREM · 현재 LLM 소스 · 전역 상태)를 띄운다.

-----

## 3. 화면별 명세

### 3.1 관리 개요 (`/admin/overview`)

- **전역 KPI**: 전체 user 수 · 전체 프로젝트 · 색인 데이터(공용/개인 합) · 활성 에이전트.
- **LLM 소스 상태 패널 (시그니처)** — 잉크 면 히어로:
  - 현재 소스 `ON-PREM(AIR-GAP)` 또는 `CLOUD(외부)` 를 크게 표시.
  - on-prem이면 `EGRESS 0 · 외부 LLM 호출 0` 불변식 LED 정상. cloud면 **빨간 경고 면**으로 전환 + “외부 전송 위험” 카피.
  - `/admin/llm`로 이동하는 전환 버튼.
- **최근 alert 패널**: user 행동·접속 이벤트 최신 N건(클리어런스 초과 요청·신규 로그인·등급/클리어런스 변경·cloud 전환 등).
- **서비스 상태 스트립**: OpenSearch·PostgreSQL·Airflow·MinIO·Sandbox Egress 상태를 한 줄 요약 LED(상세는 §3.7 인프라·리소스).

### 3.2 사용자 (`/admin/users`)

- **user 테이블**: 이름 · 소속 · **클리어런스 배지** · 프로젝트 수 · 마지막 접속.
- **클리어런스 관리**: 행에서 **L1~L5 승격/강등**. **L5 부여 = admin 승격**(관리자 콘솔 접근권 부여), 강등도 가능. **초기 admin은 강등 불가(고정)** 로 표시. 변경은 audit 기록.
- **접속/행동 기록**: 행 클릭 → user Sheet에 로그인 이력 · 업로드 · 에이전트 편입 · 권한 초과 시도 · 클리어런스 변경 타임라인.

### 3.3 데이터 (`/admin/data`)

- **전 user 데이터 테이블**(라이브러리 전역): 데이터 · 소유자 · 부서 · **등급 배지(L1~L5 / PRIVATE)** · 색인 상태 · 업로드 시각 · 연결된 프로젝트 수. 데이터는 프로젝트에 묶이지 않으므로(라이브러리) 0~N개 프로젝트에 연결될 수 있다.
- 필터: user별 · 등급 · 공용/PRIVATE · 연결 프로젝트. **PRIVATE 데이터도 표시**(admin 감사 권한).
- **등급 관리**: 행에서 등급 변경(재색인 트리거). 본문 청크는 메타로만 노출.

### 3.4 에이전트 (`/admin/agents`)

- **전 user 에이전트 테이블/그리드**: 에이전트 · 소유자 · 프로젝트 · **등급 배지(L1~L5 / PRIVATE)** · LED 상태.
- private 에이전트 포함 전부 노출. **등급 관리**: 등급은 생성자가 부여한 값이며, admin이 변경 가능(변경 시 사유 기록). 서빙 LLM은 전역 소스를 따른다.

### 3.5 LLM 소스 (`/admin/llm`)

- **전역 토글**: `ON-PREM(vLLM)` ↔ `CLOUD API`. **admin만** 조작. 토글하면 **전 에이전트 LLM 파이프라인이 즉시 전환**된다(에이전트별 설정 없음).
- cloud 선택 시 **확인 다이얼로그(경고)**: “외부 LLM(예: OpenAI) 사용 시 질의·문서가 망 외부로 전송됨. **EGRESS 0 / 외부 LLM 호출 0 불변식이 깨짐.** L3 이상 데이터 라우팅은 고위험.” → 명시적 확인 필요.
- cloud 활성 동안: 전역 배지가 `EXTERNAL · CLOUD`(crit)로 바뀌고, **사용자 콘솔 챗에서 L3 이상 사용 시 경고 다이얼로그가 전파**된다(차단 아님 — admin 책임, 전부 audit 기록).
- 현재 소스·마지막 전환 시각·전환한 admin 표시.

### 3.6 감사 · alert (`/admin/audit`)

- **실시간 스트림**: 시각 · user · 이벤트 · 등급 배지. 일시정지 토글.
- **강조 규칙**: 클리어런스 초과 요청·권한 거부·신규/이상 로그인은 **빨갛게**. cloud 전환·클리어런스 변경(특히 L5 승격)은 **앰버**.
- 기록 대상: 로그인/로그아웃 · 검색 · 에이전트 호출 · 업로드 · 등급/클리어런스 변경 · 권한 판정 · LLM 소스 전환 · cloud L3 진행 확인.

### 3.7 인프라 · 리소스 (`/admin/infra`)

온프레미스 스택의 운영 상태를 한 화면에서 감시한다(읽기전용 모니터링, 제어는 인프라 레이어).

- **서비스 상태 타일**:
  - **OpenSearch** — 클러스터 health(green/yellow/red) · 노드 수 · 샤드 · 색인 지연.
  - **PostgreSQL** — 활성 연결 수 · 복제 지연 · 느린 쿼리.
  - **Airflow** — 색인 DAG 성공률 · 실행 중/대기 · 마지막 실행 시각.
  - **MinIO** — 버킷별 사용량 · 총 용량 · 오브젝트 수.
  - **Sandbox Egress** — `net=none` 격리 상태 · 차단 시도 수(EGRESS 0 불변식).
- **리소스 대시보드 (헤더: 리소스)** — 두 축으로 본다:
  - **노드**: 전체 컴퓨팅 노드별 **GPU**(장착 모델·사용률·VRAM) · **CPU** · **RAM** 사용 현황 + 노드 상태(활성/혼잡/오프라인) LED.
  - **모델**: 서빙 중 모델별 **할당 노드 인스턴스** · **local LLM(엔진: vLLM)** · 서빙 보안등급(L1~L5) · 부하/큐 · 상태. *“어떤 모델이 어느 노드에서 어떤 LLM으로 도는가”* 를 한눈에.
- 이상치(노드 오프라인 · DAG 실패 · EGRESS 시도 · 클러스터 red)는 감사 스트림(§3.6)으로도 전파.

-----

## 4. 컴포넌트 ↔ shadcn 매핑

|요소                           |shadcn                   |
|-----------------------------|-------------------------|
|관리 셸 사이드바                    |`sidebar` + `scroll-area`|
|탭                            |`tabs`                   |
|개요 타일 / LLM 소스 패널            |`card`                   |
|user·데이터·에이전트 테이블            |`table`                  |
|등급·클리어런스·공용/private 배지       |`badge`                  |
|클리어런스 변경 · user 상세           |`sheet` + `form`         |
|임계·경고 설명                     |`tooltip`                |
|**cloud 전환 경고 확인 / L5 승격 확인**|`dialog`                 |
|서비스 상태 타일 / 리소스 카드           |`card` + 상태 LED          |
|노드·모델 리소스 표                  |`table`                  |
|GPU/CPU/VRAM 사용률             |`progress`(막대)           |

상태 LED(정상/혼잡/오프라인)는 design-system.md §4가 허용하는 기능색(green/amber/red)만 절제 사용. 색은 5색 + 등급/상태 기능색만.

-----

## 5. 데이터 소스 (읽기/쓰기)

```
PostgreSQL  users, projects, memberships          → 계정·클리어런스·역할
PostgreSQL  data(라이브러리), project_data(연결), agents  → 전 user 관찰·등급 관리
PostgreSQL  audit_log, sessions                    → 감사·접속·alert
설정         llm_source(mode, provider)            → on-prem/cloud 전역 토글(admin write)
OpenSearch  _cluster/health, _cat/nodes, _cat/indices → 검색 클러스터·색인 상태(§3.7)
PostgreSQL  pg_stat_activity · 복제 상태             → DB 상태(§3.7)
Airflow     REST API(/dags, /dagRuns)               → 색인 파이프라인 상태(§3.7)
MinIO       admin info · 버킷 usage                  → 스토리지 상태(§3.7)
노드/GPU     node-exporter · DCGM 메트릭              → 리소스 사용률(§3.7)
서빙 레지스트리 vLLM 엔드포인트 ↔ 노드 ↔ 모델 매핑       → 모델 할당(§3.7)
Sandbox     egress 정책(net=none) 상태               → 격리 불변식(§3.7)
```

admin write 액션: 클리어런스 변경(L5 포함) · 데이터/에이전트 등급 변경 · LLM 소스 전역 전환 — 전부 audit_log 기록.

-----

## 6. 디렉토리 (사용자 콘솔과 셸 패턴 공유, 라우트 그룹 분리)

```
frontend/app/(admin)/
  layout.tsx                 # L5 게이트 + 관리 셸(환경/LLM 소스 배지)
  overview/page.tsx
  users/page.tsx
  data/page.tsx
  agents/page.tsx
  llm/page.tsx
  infra/page.tsx
  audit/page.tsx
frontend/components/admin/
  global-kpi.tsx  llm-source-panel.tsx  user-table.tsx  clearance-sheet.tsx
  data-table.tsx  agent-table.tsx  audit-stream.tsx
  service-tiles.tsx  resource-nodes.tsx  resource-models.tsx
```

-----

## 7. DoD

- `/admin/*`는 클리어런스 L5 외 진입 0.
- 전 user 데이터·에이전트(개인/private 포함) 관찰 + 등급 변경 가능.
- user 클리어런스 L1~L5 승격/강등 가능(L5=admin 승격), 초기 admin 고정, 변경은 audit 기록.
- LLM 소스 on-prem/cloud 전역 토글, 토글 시 전 파이프라인 즉시 전환 + cloud 경고 확인 + 전역 경고 배지.
- **인프라 탭**: OpenSearch·PostgreSQL·Airflow·MinIO·Sandbox Egress 상태 + 리소스(노드 GPU/CPU·모델↔노드↔local LLM 할당) 표시.
- 감사 스트림에 클리어런스 초과·이상 로그인·cloud 전환·L5 승격·노드 오프라인/DAG 실패가 색으로 강조.

-----

## 8. 추적성

data-model.md(audit_log·llm_endpoints) ↔ 본 스펙. 사용자 콘솔은 `frontend/CONSOLE.md`. 망분리 기본 불변식과 cloud 예외는 README의 “망분리 · LLM 소스” 절을 따른다.