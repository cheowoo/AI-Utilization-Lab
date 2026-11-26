// README 결과 모음 — 실제 n8n Code 노드에서 복사한 학습용 원본
// 이 파일은 설명용입니다. 아래 '// [학습 주석]'만 추가했으며 실행 로직은 바꾸지 않았습니다.
// $input, $('노드 이름') 등은 n8n 전용 표현식이므로 단독 node 명령에서는 실행되지 않습니다.
// 작업 중인 n8n workflow.json 원본은 수정하지 않았습니다.

// [학습 주석] $('노드 이름')은 다른 n8n 노드의 출력을 참조한다. 선택된 저장소 목록을 읽는다.
const sel = $('추천 저장소 분리').all();
// [학습 주석] 현재 노드 바로 앞에서 받은 README HTTP 응답들을 읽는다.
const res = $input.all();
const readmes = [];
// [학습 주석] 선택된 저장소 개수만큼 반복한다. 현재 구현은 sel[i]와 res[i]가 같은 저장소라고 가정한다(개선 필요).
for (let i = 0; i < sel.length; i++) {
  const s = sel[i].json;
  const j = (res[i] && res[i].json) || {};
// [학습 주석] HTTP 상태코드(예: 200 성공, 404 없음)를 숫자인지 확인해 가져온다.
  const code = typeof j.statusCode === 'number' ? j.statusCode : null;
// [학습 주석] HTTP 응답 본문을 body 또는 data에서 텍스트로 가져온다.
  const text = typeof j.body === 'string' ? j.body : (typeof j.data === 'string' ? j.data : '');
// [학습 주석] 404 또는 'Not Found' 응답이면 README가 없는 것으로 간주한다.
  const notFound = code === 404 || (text.indexOf('"message"') !== -1 && text.indexOf('Not Found') !== -1);
// [학습 주석] README를 찾았고 정상 HTTP 응답이며 텍스트가 비어 있지 않은지 확인한다.
  const ok = !notFound && (code === null || (code >= 200 && code < 300)) && text.trim().length > 0;
// [학습 주석] 저장소별 README 확인 결과를 readmes 배열에 추가한다.
  readmes.push({
    name: s.name,
    url: s.url,
    readme_status: ok ? 'found' : 'missing',
    http_status: code === null ? '미확인' : code,
// [학습 주석] README 전체가 아니라 앞 6000글자만 담는다. 설치 설명이 뒤에 있으면 못 찾을 수 있다.
    readme_excerpt: ok ? text.slice(0, 6000) : ''
  });
}
// [학습 주석] 검증 Agent가 읽을 readmes_text와 selections_text를 JSON 문자열로 묶는다.
return [{ json: {
  readmes: readmes,
  readmes_text: JSON.stringify(readmes, null, 2),
  selections_text: JSON.stringify(sel.map(function (x) { return x.json; }), null, 2)
} }];
