# AI 활용 연구소 · 프로젝트 01: n8n 멀티 에이전트

> 버튼 한 번으로 GitHub에서 최근 생성된 AI 프로젝트를 조사하고, 근거를 검증한 뒤 Markdown 보고서를 만드는 학습용 자동화

## 현재 상태

- **동작 상태:** n8n 실행 8에서 조사 → README 조회 → 검증 → **REVIEW** 판정 → 보고서 작성까지 성공했다고 n8n이 보고함 (2026-11-26).
- **확인 범위:** 이 저장소에는 n8n에서 내보낸 워크플로 구조와 프롬프트, 제공받은 실행 요약, 로컬 고정 데이터 테스트를 보관함. GitHub에 저장한 것 자체가 n8n 재실행 성공을 의미하지는 않음.
- **남은 검증:** 실제 데이터에서 PASS 경로, 진짜 FAIL 경로, README 404 처리, Gateway credits 사용량 확인.

## 무엇을 하는가?

```text
[Manual Trigger]
       |
[GitHub 검색 API: 최근 7일, AI 토픽, 별점순 최대 5개]
       |
[데이터 정리 Code]
       |
[조사 Agent] — get_repository / get_readme 도구
       |
[추천 최대 3개 + 실제 README 조회]
       |
[검증 Agent] — check_repository 도구
       |
[최종 판정 Code: PASS / REVIEW / FAIL]
       |
       +-- FAIL → Stop and Error (보고서 생성 안 함)
       |
       +-- PASS/REVIEW → [보고 Agent] → [판정 문구 정리]
                                           |
                                     Markdown 보고서
```

워크플로 JSON에 **22개 노드**가 존재하며, 모델 노드는 3개, 에이전트는 조사·검증·보고 3개다.

## 기술 스택

- n8n Cloud, Manual Trigger, HTTP Request, Code, AI Agent, Structured Output Parser
- GitHub REST API (`search/repositories`, `repos/{owner}/{repo}`, `readme`)
- n8n Gateway credits를 사용하도록 원본에서 설정했던 AI 모델 3개 (공개용 JSON에는 자격증명 설정 제거)
- JavaScript 기반 판정 규칙

## 시작 방법

1. n8n 편집기에서 `workflow.json` 파일을 **Import from File**로 가져온다.
2. 각 `Chat Model` 노드에 본인 n8n 환경에서 사용할 수 있는 모델/자격증명을 다시 연결한다. 공개용 JSON에서는 연결 정보를 제거했으므로 재설정이 필요하다.
3. GitHub 공개 API 노드의 인증/속도 제한을 확인한다. 검색 조건은 최근 7일간 생성된 `topic:artificial-intelligence` 저장소다.
4. `Execute Workflow`로 수동 실행한다. 공개 GitHub API 호출 및 모델 크레딧이 소비될 수 있다.
5. `최종 판정`과 `보고서 판정 문구 정리` 노드를 검사해 실제 PASS/REVIEW/FAIL 및 보고서 내용을 확인한다.

> **주의:** `created:최근 7일 + sort:stars`는 ‘최근 생성된 저장소 중 별점이 높은 것’을 뜻하며, GitHub 전체의 정확한 실시간 트렌드 순위는 아니다.

## PASS / REVIEW / FAIL

| 판정 | 현재 구현 의도 |
| --- | --- |
| PASS | 핵심 데이터 불일치가 없고 검증 대상에 미확인 주장/이슈가 없음 |
| REVIEW | 미확인 주장, 검증 이슈 또는 README 미확인 등의 추가 검토가 필요함 |
| FAIL | 저장소 부재/핵심 불일치/중요한 데이터 파싱 실패 등으로 보고서를 중단함 |

위 판정은 **검증 Agent가 직접 결정하는 것이 아니라 `최종 판정` Code 노드가 계산**한다.

## 실제 실습 경과

| 단계 | 결과 | 학습 포인트 |
| --- | --- | --- |
| GitHub 공개 API 초기 조회 | 성공 보고 | 인증 없이도 공개 저장소 검색이 가능하나 요청 제한이 있음 |
| 실행 6 | 약 53초, 세 에이전트 및 보고서 실행 성공 보고 | 미확인 주장이 있는데 PASS 판정이 나오는 규칙 문제 발견 |
| 코드 규칙 수정 | 고정 데이터 테스트 통과 보고 | AI 판단과 결정론적 검증 로직 분리 |
| 실행 7 | 약 41초, 잘못된 FAIL로 중단 보고 | `7`과 `"7개"`가 다르게 비교되는 입력 형식 버그 발견 |
| 별점 정규화 수정 | 고정 데이터 테스트 통과 보고 | `"1,234개"`와 숫자 정규화, 비정상 입력 거부 |
| 실행 8 | 약 58초, 21개 실행 노드 성공, **REVIEW** 보고서 생성 | 수정된 별점 비교와 REVIEW 경로가 실제 데이터에서 동작 |

실행 기록: n8n 워크플로 실행 **6, 7, 8** (사용자 계정 내부 기록; 개인 n8n Cloud 주소는 공개 README에서 제외).

## 실행 8에서 추천한 저장소

- [rapttor/sparkbots](https://github.com/rapttor/sparkbots): AI 코딩 에이전트 세션 모니터링, 설치 방법은 제공된 README **발췌본**에서 미확인
- [steveopen1/artex-ld](https://github.com/steveopen1/artex-ld): AI 자율 침투 테스트 연구, README에 Docker Compose 배포 안내; **권한 있는 자체 시스템 또는 격리된 실습에서만 사용**
- [AlphaLima/ha-drive-energy-doc](https://github.com/AlphaLima/ha-drive-energy-doc): Home Assistant 기반 차량 에너지·영수증 자동 기록, 설치 방법은 발췌본에서 미확인

**최종 판정: REVIEW**. 보고서의 미확인 주장 2건을 그대로 남기고 정상적으로 생성한 것이 이번 성공 조건이었다.

## 이번에 확인한 한계 / 다음 개선

1. `get_readme` 도구는 응답을 **4,000자**로 잘라서 에이전트에 전달한다. 별도의 README 수집 Code도 **6,000자** 발췌를 사용한다. 따라서 실제 README에 존재하는 설치 안내도 누락될 수 있다. 전체 파일을 읽었다고 주장하면 안 된다.
2. 공개 GitHub API는 인증 없는 호출 제한과 공유 Cloud IP의 영향을 받는다.
3. `최종 판정`은 일부 필드가 `미확인`일 때 **반드시 REVIEW가 되는지를 추가 점검해야 한다**. 특히 `reported_license`가 누락된 경우 안전한 판정이 되는지 확인이 필요하다.
4. README 요청 결과를 모을 때 항목의 **순서가 맞는지** 확인해야 한다.
5. PASS 실제 경로, 진짜 불일치 FAIL 경로, README 404, 비용 및 잔액은 완전 검증되지 않았다.
6. 첫 프로젝트는 API 또는 모델 실행 없이도 테스트 가능한 `tests/decision.test.js`를 포함한다. 이것은 **n8n 통합 테스트를 대체하지 않는다**.

## 파일 구성

```text
02-n8n-multi-agent/
├── README.md                   # 프로젝트와 실행·검증 기록
├── workflow.json              # 공개용 n8n 워크플로 (자격증명 제거)
├── prompts/
│   ├── research.md            # 조사 Agent 지시문
│   ├── verification.md        # 검증 Agent 지시문
│   └── reporting.md           # 보고 Agent 지시문
├── tests/
│   └── decision.test.js       # 코드 판정 로직의 고정 데이터 테스트
└── test-results/
    └── 2026-11-26.md          # 실행 6~8 보고와 미검증 항목
```

## 보안과 비용

- 공개용 `workflow.json`에서는 n8n 인스턴스 메타데이터와 모델 자격증명 연결을 제거했다. 본인 계정에서 **가져오기 후 재연결**해야 한다.
- 별도 OpenAI API를 직접 결제하지 않아도 n8n Gateway credits를 활용했으나, 사용량/잔액은 확인되지 않았다. 체험 크레딧 소진 후에는 실행 제한 또는 추가 요금이 발생할 수 있다.
- API 키, 토큰, 웹훅 비밀 주소, 실제 개인정보가 포함되었다면 **공개 커밋 전 삭제**해야 한다.

## 실습 회고

> **실행 성공 ≠ 사실 검증 성공.** AI에 판단을 맡기되, 파싱·판정·예외 처리는 코드와 테스트로 통제해야 한다.