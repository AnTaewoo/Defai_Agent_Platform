# CLAUDE.md — D.A.P (Deployable Enterprise-first AI agent Platform)

> 이 파일은 Claude Code가 매 세션 자동으로 읽는 프로젝트 컨텍스트다.
> 아키텍처 결정사항과 디자인 규칙은 **확정(LOCKED)** 상태이며, 변경하려면 반드시 사람의 승인을 받는다.

---

## 1. 프로젝트 한 줄 정의

**D.A.P** — 기업/기관 내부의 정형·비정형 문서(PDF, PPT, Excel, Docs, HWP, 표, 스캔본)를 수집·파싱·인덱싱하고,
**프로젝트 단위로 격리되고, 사용자·부서·보안등급·프로젝트별로 접근 권한(RBAC)이 분리된 멀티 에이전트 RAG 챗봇**을 제공하고, 나아가 도구를 쓰는 **에이전틱 워크플로우로 문서·코드를 생성**하는, 배포 가능한 엔터프라이즈-퍼스트 온프레미스 AI 에이전트 플랫폼.

## 2. 절대 원칙 (이 7가지는 항상 지킨다)

1. **권한은 인덱싱 단계에서 박히고, 요청은 SessionContext로 흐른다.** 데이터는 프로젝트 독립 라이브러리에 업로드되므로, 청킹 시점에 모든 청크에 `security_level` / `owner_id` / `visibility(shared|private)`를 태깅한다(`dept`/`source`/`doc_type`은 출처 메타데이터로 함께 태깅하되 접근 게이트는 아니다). `project_id`/`agent_id`는 청크에 박지 않는다 — 프로젝트 스코프는 `project_data`(N:M, P13)로 데이터를 프로젝트에 연결(attach)한다. 보안 민감 호출(검색·에이전트·도구·생성)은 `Principal` 단독이 아니라 **`SessionContext`**(유저+활성 프로젝트+역할)를 받는다. 3중 게이트는 두 지점에서 강제된다: 검색은 *질의 전에* ① 활성 프로젝트에 연결된 `data_id`(project_data) 격리 + ② `security_level ≤ level` ∧ (visibility=shared ∨ owner_id=본인)을 OpenSearch `filter`에 주입하고(후처리 금지), ③ 에이전트 가용(프로젝트 보유 ∩ 등급)은 `available_agents`/`select_agent`에서 강제한다(검색 필터 아님). **프로젝트 멤버면 부서 무관 접근.** 상세는 `docs/projects-rbac.md`.
2. **벡터 DB를 따로 두지 않는다.** Pinecone / Milvus / Chroma 금지. 키워드(BM25) + 벡터 검색 모두 **OpenSearch 단일 엔진**(k-NN 플러그인 + ML Commons)으로 구현한다. Apache 2.0 라이선스라 기업 도입이 자유롭다는 점이 채택 이유.
3. **핵심 파싱 로직은 추상화 툴에 위임하지 않는다.** LangChain은 로딩~저장 전처리 체인의 *접착제*로만 쓰고, 실제 문서 파싱(특히 HWP·복잡한 표·스캔본)은 직접 제어 가능한 모듈로 구현한다. 프로덕션 디버깅 용이성이 우선.
4. **에이전트는 보안등급별로 격리된다.** 보안등급마다 독립 에이전트를 매핑하고, 한 에이전트가 자기 등급 밖 데이터에 접근하는 경로가 코드 상 존재해선 안 된다.
5. **MVP 우선.** 2026-06-15 캠프 전까지 "단순 RAG가 도는 프로토타입"이 최우선. 멋진 기능보다 *엔드투엔드로 도는 한 줄기*를 먼저 완성한다. 평가 파이프라인은 후순위(장기 과제).
6. **생성 LLM은 기본 사내 vLLM(망분리 기본값).** 기본값은 오픈웨이트 모델을 vLLM으로 서빙하고 OpenAI 호환 엔드포인트로 호출한다. 외부 클라우드 LLM API(Anthropic/OpenAI 등)는 **기본 금지**이며, 오직 **admin 전역 토글(on-prem↔cloud)** 로만 활성화된다 — 경고·명시적 확인·전수 audit 필수, 에이전트별 설정 없이 전 파이프라인 동시 전환, cloud 동안 L3↑ 사용 시 경고 전파(차단 아님, admin 책임). **임베딩은 항상 local(ML Commons).** LLM 호출도 `Principal` 없이는 불가, 등급→엔드포인트 매핑(`llm_endpoints`)으로 라우팅한다. 상세는 `frontend/OPS_CONSOLE.md`·`README`(망분리·LLM 소스).
7. **생성물은 등급을 상속하고, 코드 실행은 격리한다.** 문서·코드·답변 등 모든 생성물(Artifact)의 보안등급 = 사용된 모든 소스의 **max**(propagate_level, 절대 더 낮게 금지). 코드 실행은 반드시 망 차단 샌드박스에서만(egress 0, 외부 데이터스토어 직접접근 0). 도구·생성·실행 전부 `Principal` 없이는 호출 불가. 설계 상세는 `docs/agentic.md`.

## 3. 확정 기술 스택 (LOCKED)

| 레이어 | 선택 | 비고 |
|---|---|---|
| 데이터 파이프라인 | LangChain | 전처리 체인 접착제. 핵심 파싱은 직접 제어 |
| 배치 | Airflow + 자체 트리거 | 주기 재인덱싱은 DAG, 실시간 업로드는 자체 트리거 (하이브리드) |
| 오케스트레이터 | LangGraph | 질의분류·에이전트 라우팅·재검색 판단 등 조건부 분기/루프 |
| 검색엔진 | OpenSearch | BM25 + 벡터(k-NN) 하이브리드, 단일 엔진 |
| 임베딩 | OpenSearch ML Commons | 별도 벡터 DB 없음 |
| LLM 서빙 | **vLLM (오픈웨이트, 사내) 기본** | OpenAI 호환 엔드포인트. 외부 클라우드는 admin 전역 토글 예외(경고·audit). 등급→엔드포인트 라우팅 |
| 문서 생성 | python-docx / python-pptx / openpyxl / weasyprint | docx/pptx/xlsx/pdf/md. HWP 생성은 후순위 |
| 코드 실행 | 격리 샌드박스(컨테이너) | egress 차단·비특권·리소스 제한 |
| 산출물 저장 | MinIO(S3 호환) + Postgres 메타 | 등급·출처 메타와 함께 |
| 프로젝트 스토리지 | MinIO 프로젝트별 버킷 | RBAC 문서함, 대시보드 노출 |
| RBAC | 프로젝트 역할 + 등급 기반 에이전트 가용 | viewer/member/editor/manager/project_admin (수동 부여 없음) |
| 정형 메타데이터 DB | PostgreSQL (기본) / MariaDB | 사용자·권한·에이전트 설정 저장 |
| 인증/인가 | SSO / LDAP 연동 | 권한 등급별 질의형식·검색범위 필터링 |
| 백엔드 API | Python 3.11 + FastAPI | 스트리밍(SSE) 지원 |
| 프론트엔드 | Next.js (React) | 스트리밍 답변·출처(Citation)·멀티모달 |
| UI 컴포넌트 | **shadcn/ui 강제** | 모든 UI는 shadcn 프리미티브로만. 자세한 규칙은 `docs/design-system.md` |
| 디자인 방향 | **Mission Console / Daylight (라이트/미니멀)** | shadcn 기본 테마 금지, D.A.P 5색 팔레트 강제 |
| 컬러 팔레트 | **#1c1c1c / #daddd8 / #ecebe4 / #eef0f2 / #fafaff** | ink + sage/cream/mist/ghost (무채색 라이트) |

## 4. 디렉토리 구조

```
backend/src/
  parsing/    # [P1] 유형별 문서 파서 (PDF/PPT/Excel/HWP/표/스캔)
  chunking/   # [P2] 청킹 + owner_id·visibility·보안등급·부서 메타데이터 태깅 엔진 (project_id 안 박음)
  indexing/   # [P3] OpenSearch 인덱싱 (BM25 매핑 + k-NN 벡터)
  search/     # [P4] 하이브리드 검색 + project_data/등급/visibility 필터 주입 (에이전트 게이트는 별도)
  llm/        # [P5] vLLM 클라이언트 (OpenAI 호환, 등급→엔드포인트 라우팅)
  agents/     # [P5] LangGraph 멀티에이전트 (보안등급별 격리)
  auth/       # [P6] SSO/LDAP 인증 + 인가 미들웨어
  projects/   # [P13] 프로젝트 + 멤버십 + RBAC (1급 조직 단위)
  sessions/   # [P13] 유저별 세션 (유저+프로젝트 컨텍스트)
  tools/      # [P10] 에이전트 도구 레지스트리 (권한 스코프)
  workflows/  # [P10] 에이전틱 워크플로우 (plan→act→observe)
  docgen/     # [P11] 문서 생성 (docx/pdf/pptx/xlsx/md, 등급전파+출처)
  codegen/    # [P12] 코드 생성 + 샌드박스 실행 (망 격리)
  api/        # FastAPI 라우터 (채팅 스트리밍, 어드민)
frontend/     # [P7] 챗 UI, [P8] 사용자 콘솔 관리/빌더, [P9] 관리자 콘솔(admin 전역)
infra/        # docker-compose (OpenSearch + Postgres + Airflow + vLLM + sandbox + MinIO)
docs/         # 아키텍처·데이터모델·컨벤션 상세
```

상세 단계 계획은 `ROADMAP.md`, 데이터/권한 스키마는 `docs/data-model.md` 참조.

## 5. 현재 마일스톤

**지금 목표: P1~P4를 관통하는 MVP 프로토타입 (목표일 06/15).**
- 문서 1~2종(우선 PDF/Excel) 파싱 → 청킹+태깅 → OpenSearch 인덱싱 → 하이브리드 검색 → LLM 답변까지 *한 줄기로* 도는 것.
- HWP·스캔본·복잡한 표는 MVP 이후 착수 (가장 공수 큼).
- 인증은 MVP 단계에선 하드코딩된 더미 사용자/권한으로 대체 가능. 단, 권한 필터 *주입 지점*은 처음부터 코드에 만들어 둔다.

## 6. 작업 규칙

- 새 기능은 항상 해당 페이즈 모듈 안에 둔다. 모듈 경계를 넘는 import는 `api/`에서만 조립. 단, 권한 코어(projects↔sessions↔agents)는 SessionContext 구성을 위한 상호 의존을 허용한다(검색·생성 등 다른 페이즈 모듈은 예외 아님).
- 외부 라이브러리 추가 전 `backend/pyproject.toml`과 절대원칙(2,3)에 위배되지 않는지 확인.
- 모든 검색/생성 경로는 권한 컨텍스트 없이는 호출 불가능하도록 타입/시그니처로 강제한다 (예: `search(query, *, ctx: SessionContext)` — ctx 없이는 컴파일/호출 불가).
- 작업 시작 전 `ROADMAP.md`에서 현재 페이즈와 완료조건(DoD)을 확인하고, 끝나면 체크.
- 커밋 메시지는 `[P{n}] 모듈: 한 일` 형식 (예: `[P1] parsing: Excel 표 파서 추가`).

## 7. 명령어

```bash
# 인프라 기동 (OpenSearch + Postgres + Airflow)
docker compose -f infra/docker-compose.yml up -d

# 백엔드
cd backend && pip install -e ".[dev]"
uvicorn src.api.main:app --reload

# 테스트 / 린트
pytest
ruff check . && ruff format .
```

## 8. 하지 말 것 (Anti-patterns)

- ❌ 별도 벡터 DB 도입 (절대원칙 2 위배)
- ❌ 검색 결과를 받은 뒤 권한으로 거르기 (post-filtering) — 반드시 쿼리 단계 pre-filter
- ❌ LangChain의 고수준 추상화에 핵심 파싱/검색 로직 위임
- ❌ MVP 전에 평가 파이프라인·파인튜닝 같은 후순위 작업 착수
- ❌ 보안등급 경계를 넘는 에이전트 간 직접 데이터 공유
- ❌ shadcn 컴포넌트가 있는데 일회성 커스텀 컴포넌트 신규 작성 (반드시 shadcn 위에 조립)
- ❌ shadcn 기본 테마/기본 폰트(Inter) 그대로 사용 — D.A.P 토큰(`docs/design-system.md`) 강제
- ❌ admin 전역 토글·경고·audit 없이 외부 클라우드 LLM 호출 (기본은 사내 vLLM; cloud는 토글 예외만 — 절대원칙 6)
- ❌ 생성 코드를 샌드박스 밖에서 실행 (절대원칙 7)
- ❌ 생성물 등급을 소스 max보다 낮게 매기기 (등급 전파 위반)
- ❌ 프로젝트 격리/등급 기반 에이전트 가용을 우회하거나 Principal 단독으로 검색·생성 호출 (SessionContext 강제)
- ❌ 유저별 에이전트를 수동 부여 — 에이전트 등급(서빙 모델 등급에서 자동)으로 가용 판정
- ❌ 팔레트 외 색 도입 — 브랜드/서피스는 5색(#1c1c1c/#daddd8/#ecebe4/#eef0f2/#fafaff)만

## 9. 프론트엔드 디자인 (LOCKED)

- **컴포넌트:** shadcn/ui(= Radix + Tailwind)가 유일한 UI 소스. 모든 화면은 shadcn 프리미티브를 조립해 만든다.
- **테마:** "Mission Console / Daylight" — 라이트 퍼스트, 거의 모노톤 정밀-콘솔. 기본 토큰은 `docs/design-system.md`에서 가져온다.
- **컬러:** 5색 팔레트 강제 — ink `#1c1c1c`, sage `#daddd8`, cream `#ecebe4`, mist `#eef0f2`, ghost `#fafaff`. 다크 모드는 동일 5색 반전.
- **보안등급 색상:** 팔레트가 무채색이라 등급을 브랜드 색으로 못 나눈다 → `docs/design-system.md` §4의 (A)기능색 최소도입 / (B)순수모노 중 택1. 현재 (A) 기본 적용.
- 새 화면을 만들 때는 항상 `docs/design-system.md`의 팔레트/폰트/모션 규칙을 먼저 확인한다.
