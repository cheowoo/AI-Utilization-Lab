// 추천 저장소 분리 — 실제 n8n Code 노드에서 복사한 학습용 원본
// 이 파일은 설명용입니다. 아래 '// [학습 주석]'만 추가했으며 실행 로직은 바꾸지 않았습니다.
// $input, $('노드 이름') 등은 n8n 전용 표현식이므로 단독 node 명령에서는 실행되지 않습니다.
// 작업 중인 n8n workflow.json 원본은 수정하지 않았습니다.

// [학습 주석] 직전 조사 Agent가 내놓은 첫 번째 아이템의 output을 읽는다.
const out = $input.first().json.output || {};
// [학습 주석] AI가 형식에 맞게 selections 배열을 반환했는지 확인한다.
const sel = Array.isArray(out.selections) ? out.selections : [];
// [학습 주석] 선정된 저장소를 3개 이하로 제한하고 각 항목을 표준 필드로 바꾼다.
const picked = sel.slice(0, 3).map(function (s) {
  return {
// [학습 주석] 이름을 문자열로 만들고 trim()으로 앞뒤 공백을 제거한다.
    name: String((s && s.name) || '').trim(),
    url: (s && s.url) || '미확인',
    reason: (s && s.reason) || '미확인',
    how_to_try: (s && s.how_to_try) || '미확인',
    evidence: (s && s.evidence) || '미확인'
  };
// [학습 주석] filter()로 이름이 빈 항목은 제거한다.
}).filter(function (p) { return p.name.length > 0; });
// [학습 주석] 추천이 0개면 억지 추천을 만들지 않고 오류를 낸다.
if (picked.length === 0) {
  throw new Error('조사 Agent가 추천한 저장소가 0개입니다. 검증과 보고서 생성을 중단합니다.');
}
// [학습 주석] 저장소 3개를 n8n 아이템 3개로 나누어 README HTTP 요청을 항목별로 실행하게 한다.
return picked.map(function (p) { return { json: p }; });
