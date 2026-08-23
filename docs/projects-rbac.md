# D.A.P 프로젝트 · RBAC · 세션 (LOCKED 설계)

D.A.P의 1급 조직 단위는 **프로젝트**다. 사내 직원(유저)은 프로젝트에 멤버로 참여하고,
프로젝트는 자체 멀티에이전트와 RBAC 문서 스토리지를 가진다.

## 1. 핵심 개념

- **Project:** 데이터·에이전트·문서 스토리지를 담는 격리 컨테이너. 〔개정〕 라이브러리 데이터(청크)는 프로젝트 독립이며 `project_data`(N:M)로 프로젝트에 연결(attach)된다 — 청크 자체는 `project_id`를 갖지 않는다. 에이전트/생성 아티팩트는 `project_id`를 직접 가진다.
- **Membership:** (유저, 프로젝트) 단위 권한(`role`). 쓸 수 있는 에이전트는 수동 지정하지 않는다 — 프로젝트가 보유한 에이전트 중 등급이 맞는 것이 자동 가용.
- **Agent:** 프로젝트 생성자(project_admin)가 프로젝트에 지정한다. 에이전트 `security_level`은 그 에이전트가 쓰는 vLLM 서빙 모델 등급에서 **자동 부여**된다. **편입 시 생성자도 클리어런스 게이트를 받는다 — 자기 등급 이하 에이전트만 프로젝트에 들일 수 있다.**
- **Session:** 유저별 채팅 세션. (유저, 프로젝트)에 묶이고 선택적으로 에이전트에 바인딩. 요청 컨텍스트 = `SessionContext(session_id, principal, membership)`.

## 2. 3중 접근 게이트 (모든 요청에 AND로 적용)

```
요청 허용 = ① 데이터 접근범위(프로젝트 연결 ∧ visibility)  ∧  ② 등급 클리어런스  ∧  ③ 에이전트 가용(프로젝트 보유 ∩ 등급)
```
1. **데이터 접근범위:** 멤버가 아니면 거부. 검색 filter에 `source ∈ project_data(활성 프로젝트)`(연결된 data_id 격리) + `visibility=shared ∨ owner_id=본인` 강제.
2. **클리어런스:** `security_level ≤ principal.level`. **부서는 게이트가 아니다 — 프로젝트 멤버면 부서 무관 접근**(dept는 청크의 출처 메타데이터로만 보존).
3. **에이전트 가용(등급 자동 파생):** 유저가 쓸 수 있는 에이전트 =
   `프로젝트가 보유한 에이전트 ∩ {등급 ≤ principal.level}`. 수동 유저별 허용 없음.

```
available_agents(ctx) = project_agents(ctx.project_id)         # 프로젝트 생성자가 지정한 집합
                        ∩ { a : a.security_level ≤ ctx.principal.level }
```
즉 프로젝트에 10개 에이전트가 있어도, 유저 등급으로 가용한 것(예: 3개)만 보인다.
유저는 이 목록에서 세션의 `active_agent_id`를 **골라 쓴다**(select_agent). 세션은 (유저, 프로젝트)에 묶이고 에이전트는 세션 안에서 전환 가능.

## 3. 역할(RBAC)

프로젝트 내 미시 권한은 5역할이다(정본: `frontend/CONSOLE.md §6` 매트릭스). 누적형 — 위 역할은 아래 권한을 포함한다.

| role | 추가 권한(누적) | 조회·채팅 | 데이터 추가(attach) | 에이전트 편입 | 멤버 초대·관리 | 프로젝트 설정·삭제 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| viewer | 검색·질의·조회·채팅 | ○ | ✗ | ✗ | ✗ | ✗ |
| member | + 세션 생성, 데이터 연결(attach) | ○ | ○ | ✗ | ✗ | ✗ |
| editor | + 문서/에이전트 **설정 편집**(생성·편입 아님) | ○ | ○ | ✗ | ✗ | ✗ |
| manager | + **멤버 초대·관리**(직접 추가, 자기보다 높은 클리어런스도 초대 가능) | ○ | ○ | ✗ | ○ | ✗ |
| project_admin (생성자) | + **프로젝트에 에이전트 편입**, **프로젝트 설정·삭제**, 문서함 관리 | ○ | ○ | ○ | ○ | ○ |

`projects.can(ctx, action)`로 역할-액션 매트릭스 체크. 등급(level)과 역할(role)은 **직교** — 역할이 높아도 자기 등급 위 데이터·에이전트는 못 본다. 채팅은 전 역할 가능하되 보이는 데이터·에이전트는 본인 클리어런스 이하로 필터된다. 게이트는 **서버 강제**(프론트는 라우트 차단·UI 미표시만).

> **에이전트 편입 모델(확정).** 프로젝트에 에이전트를 들이는 것은 **project_admin**만(`add_project_agent`). 에이전트 `security_level`은 그 에이전트가 쓰는 vLLM **서빙 모델 등급에서 자동 부여**되며(수동 입력 없음), 편입 시 `agent.security_level ≤ 생성자.level` 클리어런스 게이트를 받는다. editor는 기존 에이전트의 *설정*만 편집한다(생성·편입 아님). ADR-6·`docs/data-model.md`·백엔드 코드·`D7 S-07`과 일치.

## 4. 프로젝트 문서 스토리지 (RBAC)

- 프로젝트마다 격리된 오브젝트 스토리지(MinIO 버킷/프리픽스 `project/{id}/`).
- 업로드·열람은 ① 프로젝트 멤버 ∧ ② `viewer.level ≥ doc.security_level` ∧ ③ 역할 권한(업로드는 member+)을 만족해야.
- 대시보드의 "프로젝트 문서함"은 이 스토리지를 RBAC로 필터해 보여준다(P8).
- 생성 아티팩트(docgen/codegen)도 같은 프로젝트 스토리지에 등급·출처와 함께 저장.

## 5. 데이터 모델 (Postgres)

```
projects(id, name, created_at, ...)
project_members(project_id, user_id, role, ...)                         # 역할만
data(id, owner_id, source, doc_type, security_level, visibility, ...)   # 프로젝트 독립 라이브러리(업로드 단위)
project_data(project_id, data_id, attached_at, ...)                      # 라이브러리 ↔ 프로젝트 연결(N:M)
agents(id, project_id, name, security_level, model_endpoint_id, ...)    # security_level은 서빙 모델 등급에서 자동 (부서 스코프 없음)
sessions(id, user_id, project_id, active_agent_id, created_at, ...)     # 에이전트는 세션 안에서 선택
messages(id, session_id, role, content, source_ids[], created_at, ...)
artifacts(id, project_id, kind, security_level, source_ids[], path, owner_id, ...)
```
OpenSearch 청크 메타의 `source`는 `data.id`를 참조한다 — 검색 filter는 `source ∈ project_data(활성 프로젝트)`로 프로젝트 격리를 수행한다(청크에 `project_id` 없음).

## 6. 불변식

- 보안 민감 호출(검색·에이전트·도구·생성)은 `Principal` 단독이 아니라 **`SessionContext`** 를 받는다.
- 멤버십 없는 프로젝트 데이터엔 어떤 경로로도 닿을 수 없다.
- 유저 등급 위 에이전트는 가용 목록에 오르지 않는다(select_agent에서도 거부). 라우팅 후보 자체가 안 됨.
- 모든 접근은 `audit_log`에 (user, project, agent, query, allowed_filter)로 기록.
