# D11. 단위시험 케이스 — D.A.P

문서정보: D.A.P · 설계 · D11

| ID | 대상 | 입력 | 기대 |
|---|---|---|---|
| U-01 | propagate_level | (1,4,3) | 4 |
| U-02 | propagate_level | () | 0 |
| U-03 | select_agent | 가용 밖 agent | PermissionError |
| U-04 | select_agent | 가용 agent | active_agent_id 설정 |
| U-05 | add_project_agent | 등급 위 에이전트 | PermissionError |
| U-06 | available_agents | level=3, 보유[L2,L4] | [L2]만 |
| U-07 | build_access_filter | ctx + attached_source_ids | source∈attached + level + visibility 3항 생성 (dept 없음, 미연결 시 빈 terms) |
| U-08 | chunk_and_tag | 문서 | 모든 청크 security_level/owner_id/visibility/dept/source/doc_type 보유 |
| U-09 | resolve_endpoint | level 초과 엔드포인트 | 라우팅 안 됨 |

추적성: 각 모듈 불변식 ↔ 케이스. 결과는 I2(단위시험 결과서).
