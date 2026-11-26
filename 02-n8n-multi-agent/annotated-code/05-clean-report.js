// 보고서 판정 문구 정리 — 실제 n8n Code 노드에서 복사한 학습용 원본
// 이 파일은 설명용입니다. 아래 '// [학습 주석]'만 추가했으며 실행 로직은 바꾸지 않았습니다.
// $input, $('노드 이름') 등은 n8n 전용 표현식이므로 단독 node 명령에서는 실행되지 않습니다.
// 작업 중인 n8n workflow.json 원본은 수정하지 않았습니다.

// [학습 주석] AI가 아닌 Code 노드가 결정한 공식 판정 상태를 읽는다.
const d = $('최종 판정').first().json;
// [학습 주석] 보고 Agent가 작성한 Markdown 본문을 문자열로 읽는다.
const body = String($input.first().json.output || '');
// [학습 주석] REVIEW인데도 'PASS' 같은 모순 문구가 있으면 삭제하려는 금지 표현 목록이다.
const banned = ['검증 이슈 없음', '이슈 없음', '문제 없음', '모두 검증', '모두 확인', '검증 완료', 'PASS'];
let removed = 0;
// [학습 주석] 보고서를 줄 단위 배열로 나누어 검사하기 쉽게 만든다.
let lines = body.split('\n');
// [학습 주석] PASS가 아닌 경우에만 모순 문구를 가진 줄들을 삭제한다. 무조건 줄 삭제는 유효 내용도 지울 수 있어 추후 개선 필요.
if (d.status !== 'PASS') {
  lines = lines.filter(function (line) {
    const hit = banned.some(function (b) { return line.indexOf(b) !== -1; });
    if (hit) removed++;
    return !hit;
  });
}
// [학습 주석] AI가 작성한 내용과 별개로 공식 판정 섹션을 생성한다.
const st = ['## 검증 상태'];
// [학습 주석] PASS면 PASS 문구, 그렇지 않으면 REVIEW 문구와 미확인 주장 등을 넣는다.
if (d.status === 'PASS') {
  st.push('**PASS**: 추천 저장소의 핵심 사실과 주장이 GitHub 원본 데이터와 README로 모두 확인되었습니다. 검증 이슈 없음.');
} else {
  st.push('**상태: REVIEW** (사람 확인 필요)');
  st.push('');
  st.push('판정 사유:');
  (d.review_reasons || []).forEach(function (r) { st.push('- ' + r); });
  if ((d.issues || []).length > 0) { st.push(''); st.push('검증 이슈:'); d.issues.forEach(function (r) { st.push('- ' + r); }); }
  if ((d.unverified_claims || []).length > 0) { st.push(''); st.push('미확인 주장:'); d.unverified_claims.forEach(function (r) { st.push('- ' + r + ' (REVIEW)'); }); }
}
st.push('');
st.push('판정 근거: ' + d.judgement_basis);
st.push('');
// [학습 주석] Markdown 제목인 '# ' 줄의 위치를 찾는다.
let idx = lines.findIndex(function (l) { return l.indexOf('# ') === 0; });
if (idx === -1) { lines.unshift('# AI 트렌드 저장소 보고서'); idx = 0; }
// [학습 주석] 제목 바로 다음에 검증 상태 섹션을 끼워 넣는다. 이 때문에 날짜가 뒤로 밀릴 수 있다.
lines.splice(idx + 1, 0, '', ...st);
// [학습 주석] 최종 판정, 완성된 Markdown, 삭제한 줄 수를 다음 단계로 내보낸다.
return [{ json: { status: d.status, report_markdown: lines.join('\n'), removed_contradictory_lines: removed } }];
