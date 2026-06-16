# 데이터 / 권한 모델

## 보안 메타데이터 (모든 청크 필수)
〔개정〕 데이터는 프로젝트 독립 라이브러리에 업로드된다. `project_id`/`agent_id`는 청크에
박지 않는다 — 프로젝트 스코프는 `project_data`(N:M)로 연결(attach)하고, 에이전트 가용성은
청크가 아니라 프로젝트가 보유한 에이전트 집합에서 파생된다.

| 필드 | 타입 | 설명 |
|---|---|---|
| security_level | int | 보안등급 (예: 1=공개 … 5=기밀). 사용자 등급 이하만 접근 |
| owner_id | keyword | 업로더(데이터 라이브러리 소유자) user_id |
| visibility | keyword | "shared" \| "private" — private는 owner_id만 접근 |
| dept | keyword | 출처 부서 (메타데이터 · 접근 게이트 아님) |
| source | keyword | 원본 문서 ID/경로. `project_data.data_id`가 참조하는 식별자 |
| doc_type | keyword | pdf/pptx/xlsx/hwp/scan 등 |

## OpenSearch 인덱스 매핑(개념)
- `content`: text (BM25, 한국어 nori 분석기 권장)
- `embedding`: knn_vector (ML Commons 임베딩 차원에 맞춤)
- 위 보안 메타 필드: keyword/integer (filter용)

## 권한 필터 주입 규칙
검색 시 `SessionContext`(유저 등급 + 활성 프로젝트)로부터 다음 filter를 **항상** 생성:
```
filter: [
  { terms: { source: project_data(ctx.membership.project_id) } },  # ① 프로젝트에 연결된 data_id 격리
  { range: { security_level: { lte: ctx.principal.level } } },     # ② 등급
  { bool: { should: [                                               # ③ visibility
      { term: { visibility: "shared" } },
      { term: { owner_id: ctx.principal.user_id } }
  ] } }
]
```
부서(dept)는 게이트가 아니다 — 프로젝트 멤버면 부서 무관 접근(dept는 출처 메타). 이 filter 없이 검색이 실행되는 경로는 없어야 하며, 에이전트 가용성(④)은 available_agents로 별도 강제.

## Postgres 스키마(개념)
- users(id, sso_subject, level, dept, ...)
- projects(id, name, created_at, ...)  # 1급 조직 단위
- project_members(project_id, user_id, role, ...)  # 역할만. 에이전트 가용은 등급에서 자동 파생
- data(id, owner_id, source, doc_type, security_level, visibility, created_at, ...)
    # 프로젝트 독립 데이터 라이브러리(업로드 단위). OpenSearch 청크의 `source`가 이 id를 참조
- project_data(project_id, data_id, attached_at, ...)  # 라이브러리 데이터 ↔ 프로젝트 연결(N:M)
- agents(id, project_id, name, security_level, model_endpoint_id, config_json, ...)  # security_level은 model_endpoint(서빙 모델) 등급에서 자동 부여, 편입은 project_admin
    # 프로젝트 소속(생성자가 지정). security_level은 서빙 모델(llm_endpoints) 등급에서 자동 부여
- sessions(id, user_id, project_id, active_agent_id, created_at, ...)  # 유저별 세션, 에이전트는 세션 안에서 선택
- messages(id, session_id, role, content, source_ids[], created_at, ...)
- llm_endpoints(id, base_url, model, max_security_level, ...)  # 등급→vLLM 엔드포인트 매핑
- artifacts(id, project_id, kind, security_level, source_ids, path, owner_id, created_at, ...)  # 프로젝트별 생성물, 등급 전파
- tools(id, name, required_level, ...)  # 에이전트 도구 권한(등급 기반)
- audit_log(id, user_id, project_id, agent_id, query, allowed_filter, ts, ...)  # 감사 추적
