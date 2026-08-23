# D.A.P 에이전틱 레이어 — 워크플로우 · 문서생성 · 코드생성 (LOCKED 설계)

D.A.P는 단순 RAG Q&A를 넘어, 도구를 쓰는 **에이전틱 워크플로우**로 **문서/코드를 생성**하는
엔터프라이즈 AI 에이전트 플랫폼이다. 이 레이어는 RAG 코어(P1~P6) 위에 얹힌다.

## 1. 구성 모듈

| 모듈 | 역할 |
|---|---|
| `tools/` | 에이전트 도구 레지스트리. 도구마다 필요등급(부서는 게이트 아님). 권한 검사 후 노출 |
| `workflows/` | LangGraph plan→act→observe 루프(멀티스텝). 누적 등급 추적 |
| `docgen/` | RAG 컨텍스트 + 템플릿 → docx/pdf/pptx/xlsx/md. 출처 삽입 |
| `codegen/` | 코드 생성 + **샌드박스 실행**(망 격리) |

코어 도구: `search`(P4 재사용) · `generate_document`(P10) · `generate_code`(P11) · `run_code`(P11 샌드박스).

## 2. 에이전틱 워크플로우 흐름

```
task + SessionContext
  → plan      (vLLM로 단계 계획)
  → act       (available_tools(ctx) 중 선택·실행)
  → observe   (결과 평가)
  → replan/loop (부족하면 반복, max_steps 상한)
  → finalize  (Artifact 생성)
```
- 모든 스텝은 동일 `SessionContext`(유저+프로젝트) 아래. 도구는 권한 내에서만 보인다(권한 상승 경로 없음).
- 워크플로우 상태는 **running_level**(지금까지 접한 모든 소스/도구결과의 max 등급)을 들고 다닌다.

## 3. 보안 불변식 (절대원칙 7과 직결)

1. **등급 전파(propagate_level):** 모든 생성물·도구결과의 등급 = 사용된 모든 소스의 **max**. 절대 더 낮게 매기지 않는다. L5 소스로 만든 문서는 L5.
2. **출처(provenance) 보존:** Artifact는 `source_ids`로 근거를 기록. 문서엔 Citation, 분류 워터마크 삽입.
3. **권한 일관:** 검색뿐 아니라 도구·생성·실행 전부 `SessionContext` 없이는 호출 불가(코드 시그니처로 강제).
4. **코드 실행 격리:** 생성/제출 코드는 반드시 샌드박스에서. egress 0, 외부 데이터스토어 직접 접근 0, non-root, 리소스/시간 제한. 샌드박스는 OpenSearch/Postgres/vLLM에 직접 못 닿는다.
5. **감사:** 워크플로우 스텝·도구호출·생성 아티팩트 전부 `audit_log`에.

## 4. 문서 생성(docgen) 규칙

- 포맷: docx(python-docx) / pptx(python-pptx) / xlsx(openpyxl) / pdf(weasyprint) / md. **HWP 생성은 난이도↑ → 후순위.**
- 흐름: 권한필터 검색으로 근거 수집 → vLLM 본문 생성 + 출처 삽입 → 포맷 렌더 → 등급 전파 → `artifacts` 저장.
- 산출 문서 상단/하단에 분류 표기(예: `// 비밀 (L4) //`)와 출처 목록 필수.

## 5. 코드 생성(codegen) 규칙

- 생성은 vLLM. 실행은 `run_in_sandbox`만. 사용자가 직접 붙여넣은 코드도 같은 샌드박스 경유.
- 샌드박스 = 일회성 컨테이너(infra `sandbox` 서비스): 네트워크 차단, read-only FS + scratch, 비특권, 타임아웃.
- 데이터 접근이 필요하면 샌드박스가 직접 OpenSearch를 치는 게 아니라, 권한 검사된 중개 도구를 통해서만.

## 6. 저장

- 산출물 파일: 온프레미스 오브젝트 스토리지(MinIO, S3 호환) 또는 볼륨.
- 메타: Postgres `artifacts(id, project_id, kind, security_level, source_ids, path, owner_id, created_at, ...)`.
- 접근 시 viewer.level ≥ artifact.security_level 검사(부서 정책은 조직 규칙에 따름).
