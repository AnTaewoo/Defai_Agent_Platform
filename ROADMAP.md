# ROADMAP.md — 단계별 개발 계획 & 대회 일정

## 대회 마일스톤

|일정           |내용                           |장소         |
|-------------|-----------------------------|-----------|
|~ 06/15      |**MVP 프로토타입 완성** (단순 RAG 1줄기)|—          |
|06/15 ~ 06/16|경진대회 캠프 / 사업 장표·개발 명세서 보완    |—          |
|06/22        |발표 영상 촬영                     |—          |
|06/23        |**1차 제출**                    |—          |
|07/03        |본선                           |프리미어 플랜 회의실|
|07/24        |결선                           |청주 OSCO    |
|08/12 ~ 08/14|워크숍 및 최종전                    |YBM 연수원    |
|09/11        |시상식                          |국방 컨벤션     |


> 본선·결선 장소 동선 사전 확인 요망.

-----

## 개발 페이즈 (13단계 + 후순위)

각 페이즈는 **완료조건(DoD)** 을 만족해야 다음으로 넘어간다.

### 🔴 P1. 유형별 문서 파서 모듈 — `backend/src/parsing/`

- 데이터 형태 분류: 정형/비정형(PPT, Excel, Docs, PDF, 표)을 몇 가지 표준 문서 형태로 요약·분류하는 전략 선제 수립.
- 우선순위: PDF/Excel(MVP) → PPT/Docs → **HWP·복잡한 표·스캔본(공수 최대, MVP 이후)**.
- **DoD:** 입력 파일 → 표준 `ParsedDocument`(텍스트 블록 + 표 + 메타) 산출.

### 🔴 P2. 청킹 + 메타데이터 태깅 엔진 — `backend/src/chunking/`

- 청킹 시점에 `owner_id` / `security_level` / `visibility(shared|private)` / `dept` / `source` 태깅 (권한관리의 기반).
- 〔개정〕 데이터는 **프로젝트 독립 라이브러리**에 업로드되므로 `project_id`는 청크에 박지 않는다 — 프로젝트 스코프는 `project_data`(N:M 연결)로 부여(P13).
- **DoD:** 모든 청크가 보안 메타데이터를 *빠짐없이* 보유.

### 🔴 P3. 인덱싱 파이프라인 — `backend/src/indexing/`

- OpenSearch 인덱스 매핑: BM25 텍스트 필드 + `knn_vector` 필드 + 메타 필터 필드.
- ML Commons로 임베딩 생성(별도 벡터 DB 없음).
- **DoD:** 청크가 OpenSearch에 BM25+벡터로 색인되고 메타로 필터 가능.

### 🔴 P4. 하이브리드 검색 — `backend/src/search/`

- BM25 + k-NN 결과 결합(예: RRF). **권한 필터를 쿼리 `filter` 절에 강제 주입.**
- **DoD:** `SessionContext` 없이는 검색 호출 불가. **활성 프로젝트에 연결된 `data_id` ∩ 등급 ∩ visibility 밖** 청크는 결과에 절대 미포함(부서는 게이트 아님).

### 🟡 P5. LangGraph 멀티에이전트 + LLM 서빙 — `backend/src/agents/`, `backend/src/llm/`

- `llm/`: 사내 vLLM(OpenAI 호환) 클라이언트. 등급→엔드포인트 라우팅, Principal 강제. 〔개정〕 외부 클라우드 LLM은 **기본 금지이나 admin 전역 토글(on-prem↔cloud) 예외**(경고·확인·audit). 임베딩은 항상 local.
- `agents/`: 질의분류 → 에이전트 라우팅 → 검색 → 재검색 판단(루프) → vLLM(또는 토글 시 cloud) 생성 → 답변 그래프.
- 보안등급별 독립 에이전트 격리. 에이전트는 config(agents 테이블)로 정의.
- **DoD:** 등급별 에이전트가 자기 범위 내에서만 검색·생성. **기본 외부 LLM 호출 0건**(admin이 cloud로 토글한 동안은 예외, 전부 audit).

### 🟡 P6. 인증/인가 레이어 — `backend/src/auth/`

- SSO/LDAP 연동, 로그인 사용자 등급에 따라 질의형식·검색범위 필터링.
- **DoD:** 실제 사용자 권한이 P4 검색 필터로 흘러들어감.

### 🟢 P7. 사용자 콘솔 — 챗 — `frontend/`

- 스트리밍 답변, 출처(Citation) 표시, **데이터 다중 선택 + 에이전트 1개 선택**. 멀티모달(이미지 인식)은 지원 수준 구체화 필요.
- **DoD:** 선택한 데이터·에이전트로 스트리밍 + 출처 표시 동작.

### 🟢 P8. 사용자 콘솔 — 관리/빌더 (프로젝트 내) — `frontend/`

- 데이터 라이브러리(top-level 업로드·색인 추적, **프로젝트와 독립**), 프로젝트 생성·멤버 직접 추가, **프로젝트에 에이전트 편입**(project_admin, 등급은 서빙 모델에서 자동 ≤ 클리어런스, 공용/private).
- 에이전트 편입은 **project_admin 기능**, editor+는 기존 에이전트 *설정 편집*·사용만. 등급은 수동 부여가 아니라 서빙 모델 등급에서 자동(ADR-6).
- **DoD:** 라이브러리 업로드→프로젝트 연결, project_admin이 프로젝트에 에이전트 편입(등급 자동·클리어런스 게이트), editor+ 설정 편집. 스펙 `frontend/CONSOLE.md`.

### 🟢 P9. 관리자 콘솔 (admin 전역) — `frontend/`

- 에이전트 편입(프로젝트 콘솔)과 **분리**된 별도 표면. 관리자는 *편입·생성*이 아니라 *감시·관리*를 한다.
- 전 user 데이터·에이전트(개인/private 포함) 관찰 + 등급 관리, 클리어런스 L1~L5 승격/강등, **LLM 소스 on-prem↔cloud 전역 토글**(경고·audit), user 행동·접속 감사/alert.
- **인프라·리소스 모니터링**: OpenSearch·PostgreSQL·Airflow·MinIO·Sandbox Egress 상태 + **리소스 대시보드**(노드별 GPU/CPU/VRAM 사용률, 모델 ↔ 노드 인스턴스 ↔ local LLM 할당).
- **DoD:** admin(L5)만 진입, 전역 관찰·등급/클리어런스 변경·LLM 토글·감사 스트림 + 인프라/리소스 상태 표시. 스펙 `frontend/OPS_CONSOLE.md`.

### 🟢 P10. 에이전틱 워크플로우 + 도구 — `backend/src/workflows/`, `backend/src/tools/`

- LangGraph plan→act→observe 루프. 권한 내 도구만 노출, 누적 등급 추적.
- **DoD:** 멀티스텝 과제를 도구 조합으로 수행, 권한 상승 0건.

### 🟢 P11. 문서 생성 — `backend/src/docgen/`

- RAG 근거 + 템플릿 → docx/pdf/pptx/xlsx/md, 출처·분류 표기 삽입, 등급 전파.
- **DoD:** 생성 문서가 소스 max 등급을 상속하고 출처가 박힌다.

### 🟢 P12. 코드 생성 + 샌드박스 — `backend/src/codegen/`

- vLLM 코드 생성 + 망 차단 샌드박스 실행(egress 0).
- **DoD:** 코드 실행이 샌드박스 밖으로 나가지 못함, 외부 데이터스토어 직접접근 0.

### 🟡 P13. 프로젝트 · RBAC · 세션 — `backend/src/projects/`, `backend/src/sessions/`

- 프로젝트(1급 단위) + project_members(역할: viewer/member/editor/manager/project_admin) + 유저별 세션(세션 내 데이터 다중 + 에이전트 1개).
- 〔개정〕 **데이터 라이브러리(프로젝트 독립, user 소유)** + **`project_data`(프로젝트↔데이터 N:M 연결)**. 업로드는 라이브러리에, 사용은 프로젝트에서 연결(attach).
- 검색 필터에 **연결 data_id 격리**(project_data) 추가(P4), available_agents(ctx)=프로젝트 보유∩등급(자동 파생).
- 프로젝트별 RBAC 문서 스토리지(MinIO 버킷) + 대시보드 문서함(P8).
- **DoD:** 멤버 아닌 프로젝트 데이터 접근 0건, 등급 위 에이전트 가용/선택 0건, 미연결 데이터 검색 노출 0건.
- ⚠️ 청크엔 project_id를 박지 않는다(P2). 대신 `source`가 `data.id`를 가리키고, `project_data` 연결을 P4 필터에 *처음부터* 뚫어둔다(MVP는 단일 더미 프로젝트로 가능).

### ⚪ 후순위. 평가 파이프라인 (구 1번 파트)

- 현재 개발 우선순위에서 제외. 장기 과제로 전환.

-----

## 권장 진행 순서 (Claude Code 세션 단위)

1. `infra` 기동 → OpenSearch/Postgres 연결 확인
1. P1(PDF/Excel) → P2 → P3 → P4 한 줄기로 MVP
1. 이후 P5 → P6 → P7 → P8(사용자 콘솔 관리/빌더) → P9(관리자 콘솔) 순, HWP/스캔본 파서는 병행 보강