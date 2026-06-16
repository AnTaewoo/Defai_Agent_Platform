# D10. 통합시험 시나리오 — D.A.P

문서정보: D.A.P · 설계 · D10

| ID | 통합 구간 | 검증 |
|---|---|---|
| I-01 | parsing→chunking→indexing | 청크에 security_level/owner_id/visibility/dept/source/doc_type 빠짐없이 태깅·색인 (project_id 없음) |
| I-02 | auth→sessions→search | Principal→ctx→filter 주입 정상 |
| I-03 | search→agents→llm | 근거 검색→등급 라우팅 vLLM 생성 |
| I-04 | workflows→tools→search | 권한 내 도구만, running_level 누적 |
| I-05 | workflows→docgen→MinIO | 생성물 등급 전파·프로젝트 버킷 저장 |
| I-06 | workflows→codegen→sandbox | 샌드박스 격리 실행 |
| I-07 | projects→sessions→available_agents | 프로젝트 보유∩등급만 노출 |

추적성: D3 의존도 ↔ 통합 구간.
