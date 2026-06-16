# D12. 데이터 전환 및 초기데이터 설계서 — D.A.P

문서정보: D.A.P · 설계 · D12

## 1. 초기 데이터(seed)
- 보안등급 코드북: L1 공개·L2 대내·L3 민감·L4 비밀·L5 기밀
- 부서 코드, 기본 역할(viewer/member/editor/manager/project_admin)
- 기본 프로젝트 1개 + project_admin 계정
- llm_endpoints: 등급별(또는 단일) vLLM 엔드포인트 등록

## 2. 기존 문서 전환
1) 수집(부서/등급 분류 정책 확정) → 2) parsing → 3) chunking(owner_id/visibility/등급/부서 태깅, project_id 안 박음)
→ 4) indexing(OpenSearch). 대량/주기 전환은 Airflow DAG, 실시간 업로드는 자체 트리거.

## 3. 분류 부여 정책
- 원본 보안표기·부서 출처에서 등급/부서 결정. 미상은 보수적으로 상위 등급 부여(후 검토).
- 전환 산출물·로그는 audit_log에 기록.

## 4. 추적성
D9 스키마 ↔ seed. 배치 인프라 infra/docker-compose.yml.
