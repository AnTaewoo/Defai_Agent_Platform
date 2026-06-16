# D.A.P 설계 단계 산출물 (CBD 표준)

NIA "CBD SW개발 표준 산출물 관리 가이드" 설계 단계(D1~D12)를 D.A.P 기준으로 작성.
※ 표 1-1의 T7 "인수하야 결과서"는 "인수시험 결과서"의 오기, D8 "엔터티"는 표준 표기 "엔티티".

| 코드 | 산출물 | 파일 | 근거(추적) |
|---|---|---|---|
| D1 | 클래스 설계서 | D1_class.md | backend/src/types.py |
| D2 | 사용자 인터페이스 설계서 | D2_ui.md | docs/design-system.md, frontend/ |
| D3 | 컴포넌트 설계서 | D3_component.md | backend/src/* (13 모듈) |
| D4 | 인터페이스 설계서 | D4_interface.md | api/, llm/, search/ 시그니처 |
| D5 | 아키텍처 설계서 | D5_architecture.md | docs/architecture.md (ADR-1~6) |
| D6 | 총괄시험 계획서 | D6_test_plan.md | ROADMAP DoD |
| D7 | 시스템시험 시나리오 | D7_system_test.md | docs/projects-rbac.md |
| D8 | 엔티티 관계 모형 기술서 | D8_erd.md | docs/data-model.md |
| D9 | 데이터베이스 설계서 | D9_database.md | docs/data-model.md |
| D10 | 통합시험 시나리오 | D10_integration_test.md | 모듈 파이프라인 |
| D11 | 단위시험 케이스 | D11_unit_test.md | 각 모듈 불변식 |
| D12 | 데이터 전환 및 초기데이터 설계서 | D12_data_migration.md | infra/, llm_endpoints |
