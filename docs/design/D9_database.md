# D9. 데이터베이스 설계서 — D.A.P

문서정보: D.A.P · 설계 · D9 · 근거 `docs/data-model.md`

## 1. PostgreSQL 물리 스키마(요지)
- users(id PK, sso_subject, level int, dept, ...)
- projects(id PK, name, created_at)
- project_members(project_id FK, user_id FK, role)  PK(project_id,user_id)
- data(id PK, owner_id FK, source, doc_type, security_level int, visibility, dept, created_at)  # 프로젝트 독립 라이브러리(업로드 단위). 청크 meta.source 가 이 id를 참조
- project_data(project_id FK, data_id FK, attached_at)  PK(project_id,data_id)  # 라이브러리↔프로젝트 N:M 연결(검색 격리 게이트 ①)
- agents(id PK, project_id FK, name, security_level int, model_endpoint_id FK, config_json)
- llm_endpoints(id PK, base_url, model, max_security_level int)
- sessions(id PK, user_id FK, project_id FK, active_agent_id FK, created_at)
- messages(id PK, session_id FK, role, content, source_ids[], created_at)
- artifacts(id PK, project_id FK, kind, security_level int, source_ids[], path, owner_id FK, created_at)
- tools(id PK, name, required_level int)
- audit_log(id PK, user_id, project_id, agent_id, query, allowed_filter, ts)

## 2. OpenSearch 인덱스 매핑
- `content`: text (한국어 nori 분석기) — BM25
- `embedding`: knn_vector (ML Commons 임베딩 차원)
- 필터 필드(keyword/int): `security_level`, `owner_id`, `visibility`, `dept`, `source`, `doc_type` (project_id/agent_id 없음)

## 3. MinIO 버킷
- `project/{project_id}/docs/...` 원본 문서, `project/{project_id}/artifacts/...` 생성물
- 객체 접근은 멤버십 + 등급 + 역할 검사 경유.

## 4. 추적성
D8 ERD ↔ 물리. 검색 격리 D4(search filter).
