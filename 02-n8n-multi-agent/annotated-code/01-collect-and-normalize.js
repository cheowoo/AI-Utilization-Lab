// 저장소 정보 정리 — 실제 n8n Code 노드에서 복사한 학습용 원본
// 이 파일은 설명용입니다. 아래 '// [학습 주석]'만 추가했으며 실행 로직은 바꾸지 않았습니다.
// $input, $('노드 이름') 등은 n8n 전용 표현식이므로 단독 node 명령에서는 실행되지 않습니다.
// 작업 중인 n8n workflow.json 원본은 수정하지 않았습니다.

// [학습 주석] 저장소를 차곡차곡 모을 '빈 목록(배열)'을 만든다.
const items = [];
// [학습 주석] n8n의 $input.all()은 앞 노드가 넘긴 모든 아이템을 배열로 준다. for로 하나씩 확인한다.
for (const it of $input.all()) {
// [학습 주석] 실제 JSON 데이터가 없을 경우 빈 객체 {}를 사용해 안전하게 접근한다.
  const body = it.json || {};
// [학습 주석] GitHub 검색 API는 보통 { items: [저장소들] } 형태이므로 배열인지 먼저 확인한다.
  if (Array.isArray(body.items)) { for (const r of body.items) items.push(r); }
// [학습 주석] 검색 응답이 아니라 저장소 한 개가 직접 넘어온 경우도 처리한다.
  else if (body.full_name) { items.push(body); }
}
// [학습 주석] 0개면 유효한 보고서를 만들 수 없으므로 n8n에 오류를 내고 중단한다.
if (items.length === 0) {
  throw new Error('GitHub 검색 결과가 0건입니다. 최근 7일 내 조건에 맞는 AI 저장소를 찾지 못했거나 API 응답 형식이 예상과 다릅니다.');
}
// [학습 주석] slice(0,5)는 맨 앞 다섯 개, map은 각각을 필요한 필드만 가진 새 객체로 변환한다.
const repos = items.slice(0, 5).map(function (r) {
  return {
// [학습 주석] GitHub 원본의 full_name(owner/repo)을 name으로 이름을 통일한다.
    name: r.full_name || '미확인',
    url: r.html_url || '미확인',
    description: r.description || '미확인',
// [학습 주석] 별점이 진짜 숫자일 때만 사용하고, 아니면 '미확인'으로 표시한다.
    stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : '미확인',
// [학습 주석] 라이선스 객체가 있을 때만 spdx_id를 읽는 조건식이다.
    license: r.license && r.license.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : '미확인',
    language: r.language || '미확인',
    created_at: r.created_at || '미확인',
    topics: Array.isArray(r.topics) ? r.topics : []
  };
});
// [학습 주석] n8n Code 노드는 보통 [{json:{...}}] 형태로 결과를 다음 노드에 보낸다. repos_text는 AI가 읽을 JSON 문자열이다.
return [{ json: { repo_count: repos.length, repos: repos, repos_text: JSON.stringify(repos, null, 2) } }];
