// 최종 판정 — 실제 n8n Code 노드에서 복사한 학습용 원본
// 이 파일은 설명용입니다. 아래 '// [학습 주석]'만 추가했으며 실행 로직은 바꾸지 않았습니다.
// $input, $('노드 이름') 등은 n8n 전용 표현식이므로 단독 node 명령에서는 실행되지 않습니다.
// 작업 중인 n8n workflow.json 원본은 수정하지 않았습니다.

// DECIDE_START
// [학습 주석] 판정 함수. AI 출력(raw), GitHub 원본(originalRepos), README 결과(readmeResults)를 입력으로 받는다.
function decide(raw, originalRepos, readmeResults) {
// [학습 주석] 배열 안에서 내용이 있는 문자열만 골라내는 보조 함수다.
  function list(a) { return Array.isArray(a) ? a.filter(function (s) { return typeof s === 'string' && s.trim().length > 0; }) : []; }
// [학습 주석] 값이 null·빈 문자열·'미확인'이 아닌지 확인하는 보조 함수다.
  function given(x) { return x !== undefined && x !== null && String(x).trim() !== '' && String(x).trim() !== '미확인'; }
  // 별점 정규화: 정수, "7", "7개", "1,234개"만 허용. 변환할 수 없으면 null (추정하지 않음)
// [학습 주석] 실행 7 버그를 해결하기 위해 별점 7, '7개', '1,234개'를 정확한 정수로 바꾼다.
  function parseStars(x) {
// [학습 주석] 원래 숫자인 경우에는 안전한 0 이상의 정수인지 검사한다.
    if (typeof x === 'number') return Number.isSafeInteger(x) && x >= 0 ? x : null;
// [학습 주석] 숫자도 문자열도 아니라면 추정하지 않고 null을 반환한다.
    if (typeof x !== 'string') return null;
    let s = x.trim();
// [학습 주석] 문자열 끝의 '개'만 제거한다. 중간 문자를 마구 삭제하지 않는다.
    if (s.slice(-1) === '개') s = s.slice(0, -1).trim();
    if (s.length === 0) return null;
// [학습 주석] 쉼표 기준으로 나누고 천 단위 형식이 정확한지 검사한다.
    const groups = s.split(',');
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (g.length === 0) return null;
      for (const ch of g) { if (ch < '0' || ch > '9') return null; }
      if (groups.length > 1 && (i === 0 ? g.length > 3 : g.length !== 3)) return null;
    }
// [학습 주석] 형식이 맞는 경우에만 쉼표를 제거하고 숫자로 변환한다.
    const n = Number(groups.join(''));
    return Number.isSafeInteger(n) ? n : null;
  }
// [학습 주석] 실제 불일치나 파싱 실패가 발생하면 사유를 쌓을 목록이다.
  const fail = [];
// [학습 주석] 추가 확인이 필요한 사항을 쌓을 목록이다.
  const review = [];
// [학습 주석] 입력값을 임시 변수 v에 담고, JSON 문자열이면 파싱한다.
  let v = raw;
// [학습 주석] AI가 JSON을 문자열로 반환할 수도 있으므로 JSON.parse를 시도한다.
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  if (v && typeof v === 'object' && !Array.isArray(v.projects) && v.output !== undefined) {
    v = v.output;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  }
// [학습 주석] 필수 구조가 없으면 절대로 PASS로 보지 않고 즉시 FAIL한다.
  if (!v || typeof v !== 'object' || !Array.isArray(v.projects)) {
    return { status: 'FAIL', fail_reasons: ['검증 결과 JSON을 해석하지 못했습니다. 파싱 실패는 PASS로 처리하지 않습니다.'], review_reasons: [], issues: [], unverified_claims: [], projects: [], judgement_basis: '미확인' };
  }
  const issues = list(v.issues);
  if (!Array.isArray(v.issues)) review.push('issues 필드가 배열이 아닙니다.');
  const judgement = typeof v.judgement_basis === 'string' && v.judgement_basis.trim() ? v.judgement_basis : '미확인';
  if (judgement === '미확인') review.push('판정 근거(judgement_basis)가 없습니다.');
// [학습 주석] GitHub 원본 저장소를 이름으로 빠르게 찾기 위한 색인(사전)을 만든다.
  const byName = {};
  (originalRepos || []).forEach(function (r) { byName[String(r.name).toLowerCase()] = r; });
// [학습 주석] README 결과도 저장소 이름으로 찾을 수 있도록 색인을 만든다.
  const readmeBy = {};
  (readmeResults || []).forEach(function (r) { readmeBy[String(r.name).toLowerCase()] = r; });
  if (v.projects.length === 0) fail.push('검증된 추천 저장소가 0개입니다.');
  const allUnverified = [];
  const projects = [];
// [학습 주석] 검증할 각 추천 저장소를 한 번씩 검사한다.
  v.projects.forEach(function (p) {
    p = p || {};
    const name = String(p.name || '').trim() || '(이름 없음)';
    const key = name.toLowerCase();
// [학습 주석] 이름이 같은 GitHub 원본을 찾아 사실 여부 비교의 기준으로 쓴다.
    const orig = byName[key];
    const unv = list(p.unverified_claims);
    const mism = list(p.mismatches);
// [학습 주석] 원본 검색 결과에 없는 프로젝트라면 FAIL 사유로 추가한다.
    if (!orig) {
      fail.push(name + ': 원본 검색 결과에 없는 저장소입니다.');
    } else {
// [학습 주석] 추천 URL이 GitHub 검색 결과의 URL과 다르면 FAIL한다.
      if (String(p.url || '') !== String(orig.url)) fail.push(name + ': URL 불일치 (보고 ' + (p.url || '없음') + ', 원본 ' + orig.url + ')');
// [학습 주석] 실제로 존재한다는 조회 근거가 없으면 FAIL한다.
      if (p.repo_exists !== true) fail.push(name + ': 저장소가 없거나 존재를 확인하지 못했습니다.');
// [학습 주석] AI가 보고한 별점을 정규화한다. '7개'는 7이 된다.
      const rs = parseStars(p.reported_stars);
// [학습 주석] GitHub API에서 얻은 원본 별점을 비교 기준으로 사용한다.
      const apiStars = typeof orig.stars === 'number' && Number.isSafeInteger(orig.stars) ? orig.stars : null;
      if (apiStars === null) {
        fail.push(name + ': GitHub API stargazers_count를 확인할 수 없습니다.');
      } else if (rs === null) {
        fail.push(name + ': 별점 값을 정수로 정확히 변환할 수 없습니다 (보고 ' + JSON.stringify(p.reported_stars === undefined ? null : p.reported_stars) + ', 원본 ' + apiStars + ')');
      } else if (rs !== apiStars) {
        fail.push(name + ': 별점 불일치 (보고 ' + rs + ', 원본 ' + apiStars + ')');
      }
// [학습 주석] 라이선스가 제시되었을 때만 비교한다. '미확인'이면 건너뛰어 PASS가 될 수 있는 알려진 결함이 있다.
      if (given(p.reported_license) && orig.license !== '미확인' && String(p.reported_license).trim().toUpperCase() !== String(orig.license).toUpperCase()) {
        fail.push(name + ': 라이선스 불일치 (보고 ' + p.reported_license + ', 원본 ' + orig.license + ')');
      }
      if (orig.stars === '미확인' || orig.license === '미확인') review.push(name + ': 원본의 별점 또는 라이선스가 미확인입니다.');
    }
// [학습 주석] 검증 Agent가 명시한 불일치 목록도 FAIL 사유로 기록한다.
    mism.forEach(function (m) { fail.push(name + ': ' + m); });
    const rd = readmeBy[key];
    const readmeStatus = rd ? rd.readme_status : (p.readme_status || '미확인');
// [학습 주석] README를 가져오지 못했으면 검토가 필요하다고 REVIEW로 표시한다.
    if (readmeStatus !== 'found') review.push(name + ': README를 확인하지 못했습니다.');
// [학습 주석] 미확인 주장을 프로젝트명과 함께 합쳐서 보관한다.
    unv.forEach(function (u) { allUnverified.push(name + ': ' + u); });
    projects.push({
      name: name,
      url: orig ? orig.url : (p.url || '미확인'),
      stars: orig ? orig.stars : '미확인',
      license: orig ? orig.license : '미확인',
      description: orig ? orig.description : '미확인',
      readme_status: readmeStatus,
      confirmed_claims: list(p.confirmed_claims),
      unverified_claims: unv,
      mismatches: mism,
      reason: p.reason || '미확인',
      how_to_try: p.how_to_try || '미확인',
      evidence: p.evidence || '미확인'
    });
  });
  if (allUnverified.length > 0) review.push('미확인 주장 ' + allUnverified.length + '건');
  if (issues.length > 0) review.push('검증 이슈 ' + issues.length + '건');
// [학습 주석] FAIL 사유가 하나라도 있으면 FAIL, 아니면 REVIEW 사유가 있으면 REVIEW, 둘 다 없을 때만 PASS.
  const status = fail.length > 0 ? 'FAIL' : (review.length > 0 ? 'REVIEW' : 'PASS');
  return { status: status, fail_reasons: fail, review_reasons: review, issues: issues, unverified_claims: allUnverified, projects: projects, judgement_basis: judgement };
}
// DECIDE_END
// [학습 주석] n8n 검증 Agent의 실제 출력을 읽는다.
const first = $input.first().json;
const raw = first.output !== undefined ? first.output : first;
// [학습 주석] 앞의 '저장소 정보 정리' 노드가 보관한 GitHub 원본을 참조한다.
const original = $('저장소 정보 정리').first().json.repos || [];
// [학습 주석] README 조회 결과를 참조한다.
const readmes = $('README 결과 모음').first().json.readmes || [];
// [학습 주석] 이 판정 결과를 n8n IF 노드로 전달한다.
return [{ json: decide(raw, original, readmes) }];
