# 처음부터 이해하는 n8n 멀티 에이전트 — 코드 학습 가이드

> **학습 목표:** AI가 만든 코드를 무조건 복사하지 않고, 어떤 데이터가 들어오고 어떻게 바뀌며 왜 오류가 나는지 설명할 수 있기.

## 0. 실제 실행본과 학습용 코드의 차이

- `../workflow.json`: n8n에서 내보낸 공개용 **실제 워크플로**. 이 학습을 위해 바꾸지 않았음.
- `./01-collect-and-normalize.js` ~ `./05-clean-report.js`: **원본 Code 노드의 실행문은 유지**하고, 앞줄에 `// [학습 주석]`을 추가한 읽기용 코드.
- n8n의 `$input`, `$('노드 이름')`은 n8n 실행 환경에서만 사용할 수 있음. 학습용 파일을 로컬 Node.js로 곧바로 실행하면 안 됨.
- `../prompts/`는 AI Agent에 준 시스템·사용자 프롬프트. 프롬프트는 AI에게 부탁하는 지시문이고 JavaScript는 정확한 조건을 실행하는 코드임.

## 1. 버튼을 누르면 데이터가 어떻게 이동할까?

```text
[실행 버튼]  ← Manual Trigger (코드 X)
    |
[GitHub AI 저장소 검색] ← HTTP Request / GET / API (코드 X)
    |
[저장소 정보 정리] ← 01-collect-and-normalize.js
    |  repos 배열 (최대 5개)
[조사 Agent] ← prompts/research.md + get_repository/get_readme 도구
    |  selections 배열 (최대 3개)
[추천 저장소 분리] ← 02-split-selected-repos.js
    |  저장소별 n8n 아이템
[추천 저장소 README 조회] ← HTTP Request (코드 X)
    |
[README 결과 모음] ← 03-collect-readmes.js
    |  readmes_text + selections_text
[검증 Agent] ← prompts/verification.md + check_repository 도구
    |  projects, issues, judgement_basis
[최종 판정] ← 04-final-decision.js
    |  PASS / REVIEW / FAIL
[판정이 FAIL인가?] ← IF 노드
    |  FAIL → 중단
    └  PASS·REVIEW → [보고 Agent] → [보고서 판정 문구 정리]
                                              ↑
                                       05-clean-report.js
```

## 2. 이것만 먼저 알면 돼: 기초 문법

| 문법 | 쉬운 뜻 | 이 프로젝트에서의 용도 |
| --- | --- | --- |
| `const x = []` | x라는 빈 목록 만들기 | 검색 결과를 차곡차곡 모으기 |
| `const x = {}` | 이름표가 있는 빈 데이터 상자 만들기 | 저장소 데이터를 이름으로 찾기 |
| `for (...)` | 하나씩 반복하기 | 검색된 저장소 전부 검사 |
| `if (...) {...}` | 조건이 참이면 실행 | 404나 검증 오류 처리 |
| `items.push(x)` | 목록 끝에 x 추가 | 저장소를 목록에 저장 |
| `slice(0, 5)` | 앞 5개만 잘라내기 | 모델에 보낼 데이터량 제한 |
| `map(...)` | 각 항목 모양 바꾸기 | GitHub 필드명을 통일 |
| `filter(...)` | 조건에 맞는 것만 남기기 | 이름이 없는 추천 삭제 |
| `typeof x` | x의 자료형 확인 | 별점이 숫자인지 확인 |
| `JSON.stringify(x)` | 객체를 JSON 글자로 바꾸기 | Agent에 데이터 전달 |
| `JSON.parse(x)` | JSON 글자를 객체로 바꾸기 | Agent 응답을 코드가 이해하도록 변환 |
| `throw new Error(...)` | 의도적으로 오류 발생·중단 | 데이터가 없는데 성공한 척하지 않기 |

## 3. JSON이 무엇인가?

GitHub API 결과는 다음과 같은 **JSON 형태**로 온다. 아래 데이터는 개념 설명을 위한 간단한 예시이며 실제 API 응답 전체가 아니다.

```json
{
  "items": [
    {
      "full_name": "rapttor/sparkbots",
      "html_url": "https://github.com/rapttor/sparkbots",
      "stargazers_count": 7
    }
  ]
}
```

`items`라는 목록에 저장소가 하나 있고, 그 안에 `full_name`, `html_url`, `stargazers_count`라는 이름표가 있다.

`저장소 정보 정리`는 이를 `name`, `url`, `stars`라는 더 간단한 이름표로 바꾸고, 최대 5개만 남겨 조사 Agent에 전달한다.

## 4. 파일별 학습 순서

### 01 · [저장소 정보 정리](01-collect-and-normalize.js)

핵심 질문: `$input.all()`은 무엇을 가져올까? `slice(0, 5)`를 `slice(0, 2)`로 바꾸면 어떤 결과가 될까?

실습: n8n에서 원본은 그대로 두고 **Duplicate workflow**로 복제본을 만든 후 복제본에서 개수만 2개로 변경해 보기. 비용이 들 수 있으므로 API 실제 실행은 나중에 선택.

### 02 · [추천 저장소 분리](02-split-selected-repos.js)

핵심 질문: AI가 3개를 추천했을 때 왜 n8n 아이템 3개로 바꿀까?

실습: `slice(0, 3)`와 `filter(...)`를 찾고, 각각 결과 개수와 빈 이름 제거에 어떤 영향을 주는지 말로 설명하기.

### 03 · [README 결과 모음](03-collect-readmes.js)

핵심 질문: HTTP 200과 404는 무엇을 뜻하고, `slice(0, 6000)` 때문에 어떤 정보가 빠질까?

실습: README에 설치 안내가 7,000번째 글자에 있다고 가정하고 결과를 예상하기. 현재 코드는 조회 응답과 저장소 목록을 같은 **인덱스 순서**로 짝짓는 점도 주의.

### 04 · [최종 판정](04-final-decision.js)

핵심 질문: 왜 AI에게 PASS 판정까지 맡기지 않고 JavaScript로 결정할까?

```javascript
// 설명을 위해 핵심 조건만 뽑은 예시. 실제 전체 조건은 04 파일 참고
const status =
  fail.length > 0 ? 'FAIL' :
  review.length > 0 ? 'REVIEW' :
  'PASS';
```

실습: 별점 `"7개"`와 숫자 `7`이 같은 것으로 처리되는지 확인하고, `"약 7개"`를 왜 거부하는지 설명하기.

주의: **현재 실제 코드에는 확인된 미완성 부분이 있다.** 원본 라이선스가 `MIT`인데 Agent의 보고 라이선스가 `미확인`이면 현재 코드가 PASS로 끝날 수 있다. 실무에서 PASS를 쉽게 주면 안 되는 이유를 보여주는 연습 문제다.

### 05 · [보고서 판정 문구 정리](05-clean-report.js)

핵심 질문: 보고 Agent가 REVIEW 상태에서 실수로 `PASS`라고 쓰면 어떻게 될까?

현재 코드는 모순된 글자를 포함하는 **줄 전체를 제거**한다. 의도한 내용까지 지워질 수 있어 향후 구조화된 보고서 템플릿으로 개선할 필요가 있다.

## 5. 프롬프트와 코드의 역할 차이

**프롬프트:** "최근 GitHub 프로젝트 중 실습 가치가 있는 것을 3개 골라줘" — 의미 판단을 AI에 맡김.

**코드:** `sel.slice(0, 3)` — 실제 선택 개수를 3개 이하로 강제함.

**프롬프트:** "근거가 부족하면 미확인 표시해줘" — AI의 답변 방법을 유도함.

**코드:** `const status = fail.length > 0 ? ...` — 실제 최종 상태를 규칙으로 결정함.

이 구분이 **AI를 잘 사용하는 기술**의 핵심이다.

## 6. 오늘 확인 질문 (코드를 보기 전에 먼저 풀기)

1. `const items = [];`에서 대괄호 `[]`는 무엇일까?
2. `slice(0, 5)`는 5번째만 고를까, 맨 앞 최대 5개를 고를까?
3. API가 저장소를 0개 반환했을 때 왜 `throw new Error`를 사용했을까?
4. AI가 `"7개"`라고 반환하면 무엇을 정규화해야 할까?
5. README를 앞 6,000글자만 읽을 때 어떤 위험이 생길까?

정답은 원본 코드의 주석에서 찾을 수 있다.

## 7. 주의사항

현재 목표는 **이해**다. 실행 8에서 성공한 n8n 원본 워크플로는 수정하지 않고, GitHub에서 주석이 달린 파일을 읽으며 학습한다. 직접 수정은 복제본에서 한다. 실제 PASS/FAIL 경로 및 README 404 경로는 통합 검증되지 않았다.
