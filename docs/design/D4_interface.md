# D4. 인터페이스 설계서 — D.A.P

문서정보: D.A.P · 설계 · D4 · 근거 `api/`, `llm/`, `search/`

## 1. 외부 인터페이스
| 대상 | 프로토콜 | 비고 |
|---|---|---|
| 클라이언트 | REST + SSE(스트리밍) | FastAPI |
| vLLM | OpenAI 호환 `/v1/chat/completions` | 사내망, 등급→엔드포인트 |
| OpenSearch | REST(BM25+kNN) | 단일 검색엔진 |
| PostgreSQL | SQL | 정형 메타 |
| MinIO | S3 호환 | 프로젝트 문서함·아티팩트 |
| SSO/LDAP | LDAP | 인증 |

## 2. 주요 REST 엔드포인트(개념)
- `POST /sessions` 세션 생성 / `POST /sessions/{id}/agent` 에이전트 선택
- `POST /chat` (SSE) 질의 스트리밍(출처 포함)
- `POST /documents` 업로드(member+) / `GET /projects/{id}/documents` 문서함(RBAC)
- `POST /workflows` 에이전틱 실행 / `POST /docgen` 문서 생성
- `POST /admin/agents` 에이전트 편입(project_admin, 등급 게이트)

## 3. 내부 인터페이스(시그니처 계약)
```python
# 검색 격리: build_access_filter가 권한 pre-filter의 단일 강제 지점(3중 게이트)
build_access_filter(ctx: SessionContext, *, attached_source_ids) -> list[dict]
gate1_terms_lookup(ctx, *, project_data_index="dap_project_data") -> dict  # 대규모 스케일 경로
search(query, *, ctx: SessionContext, attached_source_ids, k=8) -> list[Chunk]
attached_source_ids(ctx: SessionContext) -> list[str]   # projects: project_data(N:M) 연결 해소
available_agents(ctx: SessionContext) -> list[str]
select_agent(ctx, agent_id) -> SessionContext   # 가용 밖이면 PermissionError(영속화 포함)
require_live_agent(ctx) -> str                   # 실행 진입 경계 재검증(TOCTOU)
generate_document(spec, *, ctx, fmt="docx") -> Artifact
run_in_sandbox(code, *, ctx, broker=None, timeout_s=30) -> ToolResult  # broker: SandboxBroker
# 분류·색인 계약
classify_artifact(ctx, *source_levels) -> int    # 생성물 등급 = max(소스, 행위자) 단일 강제
index_chunks(chunks, client=None, *, immediate=True) -> int   # 결정론적 _id(멱등)
delete_by_source(source, client=None) -> None    # 문서 갱신 시 재적재 전 스테일 청크 제거
```
규칙: 보안 호출은 ctx 없이 호출 불가(타입 강제). 검색 격리 입력(attached_source_ids)은
api/가 projects.attached_source_ids(ctx)로 풀어 search에 주입(모듈 경계 유지, 조립은 api/).
생성물 분류는 classify_artifact만 사용(propagate_level 직접 호출 금지). 도구 실행은 ToolRun(ctx 필수) 규약.

## 4. 추적성
D3 컴포넌트 ↔ 인터페이스. 데이터 계약 D9.
