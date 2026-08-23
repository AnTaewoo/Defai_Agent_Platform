# D.A.P 진행 현황 요약 (readme2)

> `ROADMAP.md`의 13단계 페이즈 기준 코드 점검 스냅샷. 퍼센트는 각 페이즈의
> **완료조건(DoD)** 충족도를 코드/테스트/실행 검증 기반으로 추정한 값이다.

## 프로젝트 한 줄 정의

**D.A.P** — 기업 내부 문서(PDF/PPT/Excel/Docs/HWP/표/스캔본)를 파싱·청킹·색인하고,
프로젝트 단위로 격리되고 사용자·보안등급·visibility별 RBAC이 적용된 멀티에이전트
RAG 챗봇을 제공하며, 도구를 쓰는 에이전틱 워크플로우로 문서·코드를 생성하는
온프레미스 AI 에이전트 플랫폼.

- 검색엔진: OpenSearch 단일 엔진 (BM25 + k-NN, 별도 벡터DB 없음)
- LLM: 사내 vLLM 기본(OpenAI 호환, `Qwen/Qwen2.5-3B-Instruct`), 등급→엔드포인트 라우팅,
  외부 클라우드는 admin 전역 토글 예외(경고·audit)
- 권한: 인덱싱 단계에 `security_level`/`owner_id`/`visibility` 태깅 → 검색 전
  pre-filter(3중 게이트: project_data 연결 ∩ 등급/visibility ∩ 가용 에이전트)
- 프론트: Next.js + shadcn/ui, Mission Console / Daylight 라이트 테마

## 디렉토리 구조

```
dap-harness/
├── CLAUDE.md              # 프로젝트 헌법 — 절대원칙·확정 스택·금지사항 (매 세션 자동 로드)
├── ROADMAP.md             # 13단계 페이즈별 완료조건(DoD) + 대회 일정
├── README.md              # 하네스 사용법 (Claude Code 세팅)
├── readme2.md             # 이 문서 — 진행 현황/디렉토리/사용법
│
├── docs/                  # 아키텍처·데이터모델·컨벤션·디자인 시스템 상세 문서
│   ├── architecture.md
│   ├── data-model.md
│   ├── projects-rbac.md       # 권한 3중 게이트 상세 (절대원칙 1)
│   ├── agentic.md             # 워크플로우/도구/생성물 등급전파 상세 (절대원칙 7)
│   ├── design-system.md       # 5색 팔레트·shadcn 토큰 (LOCKED)
│   ├── conventions.md
│   └── design/
│
├── infra/                 # docker-compose: OpenSearch, Postgres, Airflow, vLLM, sandbox, MinIO
│   ├── docker-compose.yml
│   └── opensearch/
│
├── backend/               # Python 3.11 + FastAPI
│   ├── pyproject.toml
│   ├── src/
│   │   ├── parsing/       # [P1]  PDF/Excel/PPTX/DOCX → ParsedDocument
│   │   ├── chunking/       # [P2]  청킹 + security_level/owner_id/visibility/dept 태깅
│   │   ├── indexing/       # [P3]  OpenSearch 색인 (BM25 매핑 + k-NN 벡터)
│   │   ├── search/         # [P4]  하이브리드 검색 + 권한 pre-filter 주입
│   │   ├── llm/             # [P5]  vLLM 클라이언트 (등급→엔드포인트 라우팅, on-prem/cloud)
│   │   ├── agents/          # [P5]  보안등급별 에이전트 가용 판정 (LangGraph 그래프는 TODO)
│   │   ├── auth/            # [P6]  SSO/LDAP(현재 더미) → Principal
│   │   ├── projects/        # [P13] 프로젝트/멤버십/RBAC + Postgres 스키마·시드(`_db.py`)
│   │   ├── sessions/         # [P13] 유저별 세션(유저+프로젝트+활성 에이전트)
│   │   ├── tools/             # [P10] 에이전트 도구 레지스트리 (권한 스코프)
│   │   ├── workflows/         # [P10] plan→act→observe 에이전틱 루프
│   │   ├── docgen/             # [P11] 문서 생성 (docx/pptx/xlsx/pdf/md) + 등급전파
│   │   ├── codegen/             # [P12] 코드 생성 + 샌드박스 실행 (egress 0)
│   │   ├── api/                  # FastAPI 라우터 (main.py — /chat, /data 등)
│   │   └── types/                 # Principal/SessionContext/Artifact 등 공유 타입
│   ├── tests/              # 페이즈별 pytest (각 src/ 디렉토리 1:1 대응)
│   └── data/library/       # 업로드된 원본 파일 저장소
│
├── frontend/              # Next.js + shadcn/ui (Mission Console / Daylight)
│   ├── CONSOLE.md          # [P7/P8] 사용자 콘솔 스펙
│   ├── OPS_CONSOLE.md       # [P9] 관리자 콘솔 스펙
│   ├── app/
│   │   ├── (auth)/login, (auth)/join       # 로그인 (mock 계정 선택)
│   │   ├── (console)/dashboard, /data, /chat
│   │   ├── (console)/p/[projectId]/        # 프로젝트별 overview/agents/data/chat
│   │   └── (admin)/admin/                  # overview/users/data/agents/llm/audit/infra
│   ├── components/
│   │   ├── chat/        # ChatStream, SourcePicker, CitationPanel, CloudWarningDialog
│   │   ├── shell/        # AppSidebar, AdminSidebar, AuthGate
│   │   ├── projects/, data/, agents/, admin/, security/
│   │   └── ui/            # shadcn 프리미티브
│   └── lib/
│       ├── api/client.ts   # 실 백엔드 호출 클라이언트 (X-Session-Token/X-Project-Id)
│       ├── api/mock.ts      # mock 계정·데이터·세션 컨텍스트 (시드 ID와 1:1 대응)
│       └── session-context.tsx
│
└── .claude/
    ├── commands/          # /prototype-check, /build-parser, /add-agent, /index-status ...
    └── agents/            # parser-engineer, search-engineer, security-reviewer, ui-engineer, workflow-engineer
```

## 전체 진행률

**MVP 한 줄기(P1~P4): 약 86%** — PDF/Excel 파싱→청킹+태깅→OpenSearch 색인→
권한 pre-filter 검색까지 실제 백엔드(uvicorn)에 라이브 curl로 end-to-end 검증됨.
**전체 13페이즈 평균: 약 75%.**

## 페이즈별 진행률

| 페이즈 | 모듈 | 진행률 | 상태 | 비고 |
|---|---|---|---|---|
| 🔴 P1 문서 파싱 | `backend/src/parsing/` | **85%** | ✅ | PDF/Excel/PPTX/DOCX 파서 + 테스트 완료. HWP·복잡한 표·스캔본은 설계상 MVP 이후로 보류(미착수). |
| 🔴 P2 청킹+태깅 | `backend/src/chunking/` | **90%** | ✅ | `security_level`/`owner_id`/`visibility`/`dept`/`source` 전 청크 태깅 확인(테스트+라이브 색인 확인). `project_id`는 의도적으로 청크에 미포함. |
| 🔴 P3 인덱싱 | `backend/src/indexing/` | **90%** | ✅ | OpenSearch BM25+k-NN(384차원 임베딩) 매핑/색인 동작, 라이브 curl로 색인된 청크의 메타+벡터 확인. |
| 🔴 P4 하이브리드 검색 | `backend/src/search/` | **80%** | ⚠️ | `SessionContext` 없이 호출 불가, project_data/등급/visibility pre-filter 구현+테스트 존재. **알려진 버그**: 빈 질의 시 OpenSearch `bool.must` 파싱 에러로 500 (`src/search/__init__.py:145`). |
| 🟡 P5 LLM 서빙 + 멀티에이전트 | `backend/src/llm/`, `backend/src/agents/` | **55%** | ⚠️ | **LLM 클라이언트는 완성**: 등급→엔드포인트 라우팅(`resolve_endpoint`), on-prem/cloud 토글+audit, 실제 vLLM(Qwen2.5-3B)으로 스트리밍/논스트리밍 생성 라이브 검증 완료. **에이전트 그래프는 미완성**: `agents/__init__.py`는 `available_agents`(등급 기반 가용 목록)만 구현, 질의분류→라우팅→재검색 루프는 TODO(현재 `workflows`의 규칙기반 plan→act→observe가 임시 대체). |
| 🟡 P6 인증/인가 | `backend/src/auth/` | **75%** | ✅ | MVP 더미 SSO 매핑(`principal_from_session`)으로 `Principal`→`SessionContext` 구성, P4 필터까지 흘러감(설계 의도대로). 실 SSO/LDAP 연동은 후순위(계획대로 미착수). |
| 🟢 P7 사용자 콘솔 — 챗 | `frontend/app/(console)/.../chat` | **80%** | ✅ | 실 백엔드 `/chat` 연동 완료(이전 mock 응답 제거), 데이터 다중선택+에이전트 1개 선택, word-by-word 스트리밍 표현, cloud 경고 다이얼로그, 403/네트워크 오류 처리. **갭**: 백엔드가 `source_ids`를 항상 빈 배열로 반환해 출처(Citation) 패널이 비어있음. |
| 🟢 P8 사용자 콘솔 — 관리/빌더 | `frontend/app/(console)/p/[projectId]/...` | **70%** | 🟡 | 데이터 라이브러리/연결(`data`, `data/add`), 프로젝트 개요·에이전트 화면 존재(122~210줄 규모). 프로젝트 생성·멤버 추가·에이전트 편입 플로우의 백엔드 완전 연동 여부는 추가 확인 필요. |
| 🟢 P9 관리자 콘솔 | `frontend/app/(admin)/admin/...` | **75%** | 🟡 | overview/users/data/agents/llm/audit/infra 라우트 전부 존재(라우트당 ~100~210줄), LLM on-prem↔cloud 토글 화면 포함. 실데이터 연동·audit 스트림 실시간성은 미검증. |
| 🟢 P10 에이전틱 워크플로우+도구 | `backend/src/workflows/`, `backend/src/tools/` | **75%** | ✅ | LangGraph plan→act→observe 루프 구현, `classify_artifact`로 누적등급 전파(소스 0건도 fail-closed), 도구 레지스트리(`SessionContext` 권한검사) + 테스트 존재. |
| 🟢 P11 문서 생성 | `backend/src/docgen/` | **70%** | 🟡 | RAG 근거+citation 프롬프트, `classify_artifact`로 등급 상속 구조 구현 + 테스트. docx/pptx/xlsx/pdf 포맷별 산출물의 실제 렌더링 검증은 추가 필요. |
| 🟢 P12 코드 생성+샌드박스 | `backend/src/codegen/` | **65%** | 🟡 | `generate_code` + `SandboxBroker` 프로토콜(egress 0, 중개 전용 접근) 구조 구현 + 테스트. 실제 컨테이너 샌드박스 격리 동작은 추가 검증 필요. |
| 🟡 P13 프로젝트·RBAC·세션 | `backend/src/projects/`, `backend/src/sessions/` | **85%** | ✅ | 프로젝트/멤버십(역할별 RBAC)/세션/`project_data` N:M 연결/`llm_endpoints`/`agents`/`settings`/`audit_log` 스키마+시드 구현, 멤버십·세션·가용에이전트 테스트 존재. |
| ⚪ 후순위 평가 파이프라인 | — | **0%** | — | 계획대로 미착수(장기 과제). |

## 우선 처리 권장 (다음 액션)

1. **P4 버그**: 빈 질의 `/chat` → OpenSearch 500 (`bool.must` 파싱 에러) 수정.
2. **P5/P7 연결**: `/chat` 응답의 `source_ids`가 항상 빈 배열 → 출처 패널이 비는 문제(검색 결과 → 답변 observations로의 source 전파 점검).
3. **P5 에이전트 그래프**: `agents/__init__.py`의 질의분류·라우팅·재검색 루프(현재 TODO)를 `workflows`의 규칙기반 planner와 통합/대체.
4. **P8 확인**: 프로젝트 생성·멤버 추가·에이전트 편입(project_admin) 플로우의 프론트↔백엔드 완전 연동 점검.

## 플랫폼 사용 방법 (로컬 실행)

### 1. 인프라 기동

```bash
docker compose -f infra/docker-compose.yml up -d   # OpenSearch, Postgres, Airflow, vLLM, MinIO, sandbox
```

- vLLM은 `infra/docker-compose.yml`에 정의되어 있으며 `Qwen/Qwen2.5-3B-Instruct`를
  `:8000`(OpenAI 호환 `/v1`)으로 서빙한다. GPU 1개 필요 (`deploy.resources` GPU 예약).
  GPU가 이미 점유 중이면 호스트에서 직접 vLLM을 띄우고 포트만 8000으로 맞춰도 된다.

### 2. 백엔드 (FastAPI)

```bash
cd backend
pip install -e ".[dev]"
uvicorn src.api.main:app --reload --port 8001   # vLLM이 8000을 쓰므로 backend는 8001 권장
```

- 인증은 MVP 더미: `X-Session-Token: sso-<user_id>` (예: `sso-u-l5`) + `X-Project-Id: proj-default` 헤더로 `SessionContext`를 구성한다(`src/auth`, `src/projects/_db.py` 시드 참고).
- 헬스체크: `http://localhost:8001/docs` (Swagger UI).

### 3. 프론트엔드 (Next.js)

```bash
cd frontend
npm install
# .env.local 에 백엔드 주소 지정 (기본 fallback은 :8000)
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8001" > .env.local
npm run dev   # -> http://localhost:5720
```

### 4. 로그인 & 사용 흐름

`/login`에서 mock 계정 중 하나를 선택해 로그인한다(전부 동일 프로젝트 `Default Project` 멤버):

| 계정 | 이름 | 등급 | 프로젝트 역할 |
|---|---|---|---|
| `u-l1` | 김민준 | L1 (공개) | viewer |
| `u-l2` | 이서연 | L2 | member |
| `u-l3` | 박지훈 | L3 (민감) | editor |
| `u-l4` | 최유나 | L4 | manager |
| `u-l5` | 정도현 | L5 (기밀) | project_admin / 관리자 콘솔 |

- **챗**: 사이드바 "채팅" (또는 `/chat`) → 좌측에서 데이터(다중 선택) + 에이전트(1개 선택) → 메시지 입력
  → 백엔드 `/chat` 호출, 실 vLLM 응답이 스트리밍처럼 표시되고 우측에 출처 패널이 표시된다.
  - 등급이 낮은 계정(예: `u-l1`)은 자기 클리어런스 이하 데이터/에이전트만 보이며, 권한 밖 요청은 403으로 안내된다.
- **데이터함**: `/data` (라이브러리, 프로젝트 독립) → `/p/proj-default/data`에서 프로젝트에 연결(attach).
- **업로드**: `/p/proj-default/data/add`에서 파일 업로드 → 파싱→청킹→색인까지 자동 수행(`POST /data`).
- **관리자 콘솔**: `u-l5`(정도현)로 로그인 후 사이드바 "관리자 콘솔로" → `/admin/*`
  (사용자 등급 관리, LLM on-prem↔cloud 전역 토글, 감사 로그, 인프라/리소스 현황).

### 5. 테스트 / 린트

```bash
cd backend
pytest                       # Postgres/OpenSearch/vLLM 미기동 시 관련 통합 테스트는 skip
ruff check . && ruff format .
```
