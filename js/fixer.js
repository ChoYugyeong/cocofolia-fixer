/**
 * 코코포리아 클립보드 JSON 수리기
 * 붙여넣기 실패의 주범들을 순서대로 고친다:
 *  1. BOM / 제로폭 문자 제거
 *  2. 스마트 따옴표(“ ” „ ＂ 등) → 일반 따옴표
 *  3. JSON 본문 추출 (앞뒤에 섞인 일반 텍스트 제거)
 *  4. 문자열 내부의 생(raw) 개행 → \n, 탭 → \t
 *  5. 문자열 내부의 이스케이프 안 된 따옴표 → \"
 *  6. 잘못된 백슬래시 이스케이프 → \\
 *  7. 구조 위치의 전각 문자(：，｛｝［］)와 특수 공백 정규화
 *  8. 트레일링 콤마 제거
 *  9. 닫히지 않은 문자열 닫기
 */
(function (global) {
  'use strict';

  var WS = ' \t\r\n';

  function repairJson(input) {
    var fixes = [];
    var text = String(input);

    // 1. BOM, 제로폭 문자
    var cleaned = text.replace(/[﻿​‌‍⁠]/g, '');
    if (cleaned !== text) {
      fixes.push('보이지 않는 특수 문자(BOM/제로폭)를 제거했어요.');
      text = cleaned;
    }

    // 2. 스마트/전각 따옴표 → "
    var quoteFixed = text
      .replace(/[“”„‟＂〝〞]/g, '"')
      .replace(/[‘’‚‛]/g, "'");
    if (quoteFixed !== text) {
      fixes.push('둥근따옴표(“ ”)를 일반 따옴표(")로 바꿨어요.');
      text = quoteFixed;
    }

    // 3. JSON 본문 추출
    var startObj = text.indexOf('{');
    var startArr = text.indexOf('[');
    var start = -1;
    if (startObj === -1) start = startArr;
    else if (startArr === -1) start = startObj;
    else start = Math.min(startObj, startArr);

    if (start === -1) {
      return {
        ok: false,
        output: '',
        fixes: fixes,
        error: 'JSON 데이터를 찾을 수 없어요. { 로 시작하는 코코포리아 데이터를 붙여넣어 주세요.'
      };
    }

    var end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
    if (end > start) {
      var trimmed = text.slice(start, end + 1);
      if (trimmed.length !== text.trim().length) {
        fixes.push('JSON 앞뒤에 섞여 있던 일반 텍스트를 잘라냈어요.');
      }
      text = trimmed;
    } else {
      text = text.slice(start);
    }

    // 4~7. 문자열 인식 워커
    var walked = structuralWalk(text, fixes);
    text = walked;

    // 8. 트레일링 콤마 (문자열 밖에서만)
    text = removeTrailingCommas(text, fixes);

    // 파싱 시도
    try {
      var obj = JSON.parse(text);
      return {
        ok: true,
        output: JSON.stringify(obj),
        pretty: JSON.stringify(obj, null, 2),
        parsed: obj,
        fixes: fixes,
        error: null
      };
    } catch (e) {
      return {
        ok: false,
        output: text,
        fixes: fixes,
        error: describeParseError(e, text)
      };
    }
  }

  function structuralWalk(text, fixes) {
    var out = [];
    var inStr = false;
    var counts = { nl: 0, tab: 0, innerQuote: 0, badEscape: 0, fullwidth: 0, badSpace: 0 };

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inStr) {
        if (c === '\\') {
          var next = text[i + 1];
          if (next !== undefined && '"\\/bfnrtu'.indexOf(next) !== -1) {
            out.push(c, next);
            i++;
          } else {
            out.push('\\\\');
            counts.badEscape++;
          }
        } else if (c === '\r') {
          if (text[i + 1] === '\n') i++;
          out.push('\\n');
          counts.nl++;
        } else if (c === '\n') {
          out.push('\\n');
          counts.nl++;
        } else if (c === '\t') {
          out.push('\\t');
          counts.tab++;
        } else if (c === '"') {
          // 닫는 따옴표인지, 문자열 안의 따옴표인지 판별:
          // 뒤따르는 첫 비공백 문자가 , : } ] 이거나 끝이면 닫는 따옴표로 본다.
          var j = i + 1;
          while (j < text.length && WS.indexOf(text[j]) !== -1) j++;
          var nc = text[j];
          if (nc === undefined || ',:}]，：、｝］'.indexOf(nc) !== -1) {
            inStr = false;
            out.push('"');
          } else {
            out.push('\\"');
            counts.innerQuote++;
          }
        } else {
          out.push(c);
        }
      } else {
        if (c === '"') {
          inStr = true;
          out.push(c);
        } else if (c === '：') { // ：
          out.push(':');
          counts.fullwidth++;
        } else if (c === '，' || c === '、') { // ，、
          out.push(',');
          counts.fullwidth++;
        } else if (c === '｛') { out.push('{'); counts.fullwidth++; }
        else if (c === '｝') { out.push('}'); counts.fullwidth++; }
        else if (c === '［') { out.push('['); counts.fullwidth++; }
        else if (c === '］') { out.push(']'); counts.fullwidth++; }
        else if (c === ' ' || c === '　') { // NBSP, 전각 공백
          out.push(' ');
          counts.badSpace++;
        } else {
          out.push(c);
        }
      }
    }

    if (inStr) {
      // 문자열 끝에 딸려 들어간 닫는 괄호들(} ])은 구조로 되돌리고 그 앞에서 닫는다.
      var k = out.length;
      while (k > 0 && (out[k - 1] === '}' || out[k - 1] === ']' || WS.indexOf(out[k - 1]) !== -1)) k--;
      out.splice(k, 0, '"');
      fixes.push('닫히지 않은 문자열을 닫았어요.');
    }

    if (counts.nl) fixes.push('문자열 안의 엔터(줄바꿈) ' + counts.nl + '개를 \\n 으로 바꿨어요.');
    if (counts.tab) fixes.push('문자열 안의 탭 ' + counts.tab + '개를 \\t 로 바꿨어요.');
    if (counts.innerQuote) fixes.push('문자열 안의 따옴표(") ' + counts.innerQuote + '개를 \\" 로 이스케이프했어요.');
    if (counts.badEscape) fixes.push('잘못된 백슬래시(\\) ' + counts.badEscape + '개를 고쳤어요.');
    if (counts.fullwidth) fixes.push('전각 기호(：，｛｝ 등) ' + counts.fullwidth + '개를 반각으로 바꿨어요.');
    if (counts.badSpace) fixes.push('특수 공백 ' + counts.badSpace + '개를 일반 공백으로 바꿨어요.');

    return out.join('');
  }

  function removeTrailingCommas(text, fixes) {
    var out = [];
    var inStr = false;
    var removed = 0;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inStr) {
        out.push(c);
        if (c === '\\') { out.push(text[i + 1] || ''); i++; }
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') { inStr = true; out.push(c); }
        else if (c === ',') {
          var j = i + 1;
          while (j < text.length && WS.indexOf(text[j]) !== -1) j++;
          if (text[j] === '}' || text[j] === ']') {
            removed++;
            // 콤마를 버린다
          } else {
            out.push(c);
          }
        } else {
          out.push(c);
        }
      }
    }

    if (removed) fixes.push('닫는 괄호 앞의 불필요한 콤마 ' + removed + '개를 제거했어요.');
    return out.join('');
  }

  function describeParseError(e, text) {
    var msg = '자동 수정 후에도 오류가 남아 있어요: ' + e.message;
    var m = /position (\d+)/.exec(e.message);
    if (m) {
      var pos = parseInt(m[1], 10);
      var from = Math.max(0, pos - 25);
      var to = Math.min(text.length, pos + 25);
      msg += '\n문제 위치 주변: …' + text.slice(from, to) + '…';
    }
    return msg;
  }

  /** 코코포리아 데이터인지 가볍게 확인해서 안내 문구를 돌려준다. */
  function describeCocofolia(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.kind === 'character') {
      var name = obj.data && obj.data.name ? '「' + obj.data.name + '」 ' : '';
      return '코코포리아 캐릭터 데이터 ' + name + '로 인식됐어요. 룸 화면에 Ctrl+V로 붙여넣으세요.';
    }
    if (obj.kind) return '코코포리아 데이터(kind: ' + obj.kind + ')로 인식됐어요.';
    return '유효한 JSON이에요. 다만 코코포리아 형식(kind 항목)은 없어서, 일반 JSON으로 수정했어요.';
  }

  var api = { repairJson: repairJson, describeCocofolia: describeCocofolia };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.CocofoliaFixer = api;
})(typeof window !== 'undefined' ? window : this);
