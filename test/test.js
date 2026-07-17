// node test/test.js — 수리 엔진 엣지 케이스 테스트
const f = require('../js/fixer.js');

const cases = [
  ['전각 콜론/콤마', '{"a"："b"，"c"：1}'],
  ['닫히지 않은 문자열', '{"a": "hello}'],
  ['잘못된 백슬래시', '{"bad": "a\\q b"}'],
  ['NBSP 공백', '{ "a": 1 }'],
  ['트레일링 콤마 중첩', '{"a": [1, 2,], "b": {"c": 3,},}'],
  ['탭 문자', '{"a": "x\ty"}'],
  ['JSON 없음', '그냥 텍스트입니다'],
  ['정상 JSON', '{"kind":"character","data":{"name":"영희"}}'],
];

let failed = 0;
for (const [name, input] of cases) {
  const r = f.repairJson(input);
  const expectOk = name !== 'JSON 없음';
  const pass = r.ok === expectOk;
  if (!pass) failed++;
  console.log((pass ? 'PASS' : 'FAIL'), '-', name, '=> ok:', r.ok);
  if (r.ok) console.log('      ', r.output);
  else console.log('       err:', r.error.split('\n')[0]);
}
process.exit(failed ? 1 : 0);
