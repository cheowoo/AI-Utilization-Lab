
// n8n "최종 판정" 노드에서 직접 추출한 decide 함수를 고정 데이터로 테스트합니다.
// GitHub API 및 모델 호출이 없는 오프라인 단위 테스트입니다.
// 실행: node tests/decision.test.js
const assert = require('node:assert/strict');

// DECIDE_START
function decide(raw, originalRepos, readmeResults) {
  function list(a) { return Array.isArray(a) ? a.filter(function (s) { return typeof s === 'string' && s.trim().length > 0; }) : []; }
  function given(x) { return x !== undefined && x !== null && String(x).trim() !== '' && String(x).trim() !== '미확인'; }
  // 별점 정규화: 정수, "7", "7개", "1,234개"만 허용. 변환할 수 없으면 null (추정하지 않음)
  function parseStars(x) {
    if (typeof x === 'number') return Number.isSafeInteger(x) && x >= 0 ? x : null;
    if (typeof x !== 'string') return null;
    let s = x.trim();
    if (s.slice(-1) === '개') s = s.slice(0, -1).trim();
    if (s.length === 0) return null;
    const groups = s.split(',');
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (g.length === 0) return null;
      for (const ch of g) { if (ch < '0' || ch > '9') return null; }
      if (groups.length > 1 && (i === 0 ? g.length > 3 : g.length !== 3)) return null;
    }
    const n = Number(groups.join(''));
    return Number.isSafeInteger(n) ? n : null;
  }
  const fail = [];
  const review = [];
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  if (v && typeof v === 'object' && !Array.isArray(v.projects) && v.output !== undefined) {
    v = v.output;
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
  }
  if (!v || typeof v !== 'object' || !Array.isArray(v.projects)) {
    return { status: 'FAIL', fail_reasons: ['검증 결과 JSON을 해석하지 못했습니다. 파싱 실패는 PASS로 처리하지 않습니다.'], review_reasons: [], issues: [], unverified_claims: [], projects: [], judgement_basis: '미확인' };
  }
  const issues = list(v.issues);
  if (!Array.isArray(v.issues)) review.push('issues 필드가 배열이 아닙니다.');
  const judgement = typeof v.judgement_basis === 'string' && v.judgement_basis.trim() ? v.judgement_basis : '미확인';
  if (judgement === '미확인') review.push('판정 근거(judgement_basis)가 없습니다.');
  const byName = {};
  (originalRepos || []).forEach(function (r) { byName[String(r.name).toLowerCase()] = r; });
  const readmeBy = {};
  (readmeResults || []).forEach(function (r) { readmeBy[String(r.name).toLowerCase()] = r; });
  if (v.projects.length === 0) fail.push('검증된 추천 저장소가 0개입니다.');
  const allUnverified = [];
  const projects = [];
  v.projects.forEach(function (p) {
    p = p || {};
    const name = String(p.name || '').trim() || '(이름 없음)';
    const key = name.toLowerCase();
    const orig = byName[key];
    const unv = list(p.unverified_claims);
    const mism = list(p.mismatches);
    if (!orig) {
      fail.push(name + ': 원본 검색 결과에 없는 저장소입니다.');
    } else {
      if (String(p.url || '') !== String(orig.url)) fail.push(name + ': URL 불일치 (보고 ' + (p.url || '없음') + ', 원본 ' + orig.url + ')');
      if (p.repo_exists !== true) fail.push(name + ': 저장소가 없거나 존재를 확인하지 못했습니다.');
      const rs = parseStars(p.reported_stars);
      const apiStars = typeof orig.stars === 'number' && Number.isSafeInteger(orig.stars) ? orig.stars : null;
      if (apiStars === null) {
        fail.push(name + ': GitHub API stargazers_count를 확인할 수 없습니다.');
      } else if (rs === null) {
        fail.push(name + ': 별점 값을 정수로 정확히 변환할 수 없습니다 (보고 ' + JSON.stringify(p.reported_stars === undefined ? null : p.reported_stars) + ', 원본 ' + apiStars + ')');
      } else if (rs !== apiStars) {
        fail.push(name + ': 별점 불일치 (보고 ' + rs + ', 원본 ' + apiStars + ')');
      }
      if (given(p.reported_license) && orig.license !== '미확인' && String(p.reported_license).trim().toUpperCase() !== String(orig.license).toUpperCase()) {
        fail.push(name + ': 라이선스 불일치 (보고 ' + p.reported_license + ', 원본 ' + orig.license + ')');
      }
      if (orig.stars === '미확인' || orig.license === '미확인') review.push(name + ': 원본의 별점 또는 라이선스가 미확인입니다.');
    }
    mism.forEach(function (m) { fail.push(name + ': ' + m); });
    const rd = readmeBy[key];
    const readmeStatus = rd ? rd.readme_status : (p.readme_status || '미확인');
    if (readmeStatus !== 'found') review.push(name + ': README를 확인하지 못했습니다.');
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
  const status = fail.length > 0 ? 'FAIL' : (review.length > 0 ? 'REVIEW' : 'PASS');
  return { status: status, fail_reasons: fail, review_reasons: review, issues: issues, unverified_claims: allUnverified, projects: projects, judgement_basis: judgement };
}
// DECIDE_END

const NAME = 'rapttor/sparkbots';
const URL = 'https://github.com/rapttor/sparkbots';
const original = (stars) => [{name:NAME,url:URL,stars,license:'MIT',description:'test fixture'}];
const readmes = [{name:NAME,readme_status:'found'}];
const result = (stars, opts={}) => ({
  projects:[{name:NAME,url:URL,repo_exists:true,reported_stars:stars,
    reported_license:opts.license ?? 'MIT',readme_status:'found',
    confirmed_claims:[],unverified_claims:opts.unverified || [],
    mismatches:opts.mismatches || []}],
  issues:opts.issues || [], judgement_basis:'원본과 비교함'
});
const cases = [
  ['7개 / 7 일치',result('7개'),7,'PASS'],
  ['1,234개 / 1234 일치',result('1,234개'),1234,'PASS'],
  ['70개 / 7 불일치',result('70개'),7,'FAIL'],
  ['미확인 별점 거부',result('미확인'),7,'FAIL'],
  ['소수 별점 거부',result('7.5개'),7,'FAIL'],
  ['미확인 주장 2건 → REVIEW',result('7개',{unverified:['설치방법 미확인','버전 미확인']}),7,'REVIEW'],
  ['숫자 7',result(7),7,'PASS'],
  ['문자열 7',result('7'),7,'PASS'],
  ['null 거부',result(null),7,'FAIL'],
  ['빈 문자열 거부',result(''),7,'FAIL'],
  ['약 7개 거부',result('약 7개'),7,'FAIL'],
  ['잘못된 쉼표 12,34개 거부',result('12,34개'),7,'FAIL'],
  ['GitHub 원본 별점 누락 거부',result('7개'),null,'FAIL'],
  ['issues 존재 → REVIEW',result('7개',{issues:['검토 필요']}),7,'REVIEW'],
  ['mismatches 존재 → FAIL',result('7개',{mismatches:['URL 불일치']}),7,'FAIL'],
  ['JSON 파싱 실패 → FAIL','{not json',7,'FAIL']
];
for (const [name,input,stars,expected] of cases) {
  const actual = decide(input,original(stars),readmes).status;
  assert.equal(actual,expected,name);
  console.log('PASS:',name,'->',actual);
}
console.log('All '+cases.length+' independent offline tests passed.');
// 아래는 알려진 결함을 재현하는 감사 관찰이며, 통과 테스트가 아닙니다.
const risk = result('7개',{license:'미확인'});
risk.projects[0].reported_license='미확인';
const riskStatus = decide(risk,original(7),readmes).status;
console.log('AUDIT: reported_license 미확인 + API MIT => '+riskStatus+' (보수적으로 REVIEW 처리 필요)');
