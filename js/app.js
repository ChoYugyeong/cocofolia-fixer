(function () {
  'use strict';

  var $input = document.getElementById('input');
  var $output = document.getElementById('output');
  var $status = document.getElementById('status');
  var $fixList = document.getElementById('fix-list');
  var $btnFix = document.getElementById('btn-fix');
  var $btnPaste = document.getElementById('btn-paste');
  var $btnCopy = document.getElementById('btn-copy');
  var $btnClear = document.getElementById('btn-clear');
  var $chkPretty = document.getElementById('chk-pretty');

  var $statusText = document.getElementById('status-text');
  var $statusIcon = document.getElementById('status-icon');
  var $copyLabel = document.getElementById('copy-label');

  var lastResult = null;

  function setStatus(kind, message) {
    $status.hidden = false;
    $status.className = 'status ' + kind;
    $statusText.textContent = message;
    $statusIcon.querySelector('use').setAttribute('href', kind === 'ok' ? '#i-check-circle' : '#i-alert');
  }

  function renderFixes(fixes) {
    $fixList.innerHTML = '';
    if (!fixes.length) {
      $fixList.hidden = true;
      return;
    }
    fixes.forEach(function (f) {
      var li = document.createElement('li');
      li.textContent = f;
      $fixList.appendChild(li);
    });
    $fixList.hidden = false;
  }

  function renderOutput() {
    if (!lastResult || !lastResult.ok) return;
    $output.value = $chkPretty.checked ? lastResult.pretty : lastResult.output;
  }

  function runFix() {
    var raw = $input.value;
    if (!raw.trim()) {
      setStatus('err', '먼저 데이터를 붙여넣어 주세요.');
      $output.value = '';
      $btnCopy.disabled = true;
      renderFixes([]);
      return;
    }

    var result = CocofoliaFixer.repairJson(raw);
    lastResult = result;
    renderFixes(result.fixes);

    if (result.ok) {
      renderOutput();
      $btnCopy.disabled = false;
      var desc = CocofoliaFixer.describeCocofolia(result.parsed) || '유효한 JSON이에요.';
      var head = result.fixes.length
        ? '수정 완료! (' + result.fixes.length + '가지 문제를 고쳤어요)\n'
        : '문법 오류가 없었어요. 그대로 사용하시면 됩니다.\n';
      setStatus('ok', head + desc);
    } else {
      $output.value = result.output || '';
      $btnCopy.disabled = true;
      setStatus('err', result.error);
    }
  }

  $btnFix.addEventListener('click', runFix);

  $btnPaste.addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      setStatus('err', '이 브라우저는 클립보드 읽기를 지원하지 않아요. 입력창에 직접 Ctrl+V 해주세요.');
      return;
    }
    navigator.clipboard.readText().then(function (t) {
      $input.value = t;
      runFix();
    }).catch(function () {
      setStatus('err', '클립보드 접근이 거부됐어요. 입력창에 직접 Ctrl+V 해주세요.');
    });
  });

  $btnCopy.addEventListener('click', function () {
    var text = $output.value;
    if (!text) return;
    var done = function () {
      $copyLabel.textContent = '복사됐어요! 코코포리아에 Ctrl+V';
      $btnCopy.querySelector('use').setAttribute('href', '#i-check');
      setTimeout(function () {
        $copyLabel.textContent = '복사하기';
        $btnCopy.querySelector('use').setAttribute('href', '#i-copy');
      }, 2000);
    };
    var fallback = function () {
      $output.focus();
      $output.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (e) { copied = false; }
      if (copied) done();
      else setStatus('err', '자동 복사가 막혀 있어요. 결과 창의 내용을 직접 전체 선택(Ctrl+A)해서 복사해 주세요.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
  });

  $btnClear.addEventListener('click', function () {
    $input.value = '';
    $output.value = '';
    $status.hidden = true;
    $fixList.hidden = true;
    $btnCopy.disabled = true;
    lastResult = null;
    $input.focus();
  });

  $chkPretty.addEventListener('change', renderOutput);

  // 입력창에 붙여넣으면 자동으로 수정 실행
  $input.addEventListener('paste', function () {
    setTimeout(runFix, 50);
  });
})();
