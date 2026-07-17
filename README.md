# 🎲 코코포리아 붙여넣기 수리소

코코포리아(ccfolia) 캐릭터·말판 데이터가 붙여넣기 되지 않을 때, JSON 문법 오류를 자동으로 고쳐주는 정적 웹 도구입니다.
서버 없이 순수 HTML/CSS/JS로만 동작하며, 입력 데이터는 브라우저 밖으로 전송되지 않습니다.

## 고쳐주는 오류

- 문자열 안의 생 줄바꿈(엔터) → `\n`
- 이스케이프 안 된 따옴표 `"` → `\"`
- 둥근따옴표 `“ ”` → `"`
- 트레일링 콤마 `,}` `,]` 제거
- 전각 기호 `：` `，` `｛｝` `［］` → 반각
- JSON 앞뒤에 섞인 일반 텍스트 제거
- BOM / 제로폭 문자 / 특수 공백(NBSP) 정리
- 잘못된 백슬래시 이스케이프, 닫히지 않은 문자열

## 로컬에서 열기

빌드 과정이 없습니다. `index.html`을 브라우저로 열면 끝.
(클립보드 버튼은 `file://`에서 제한될 수 있으니 간단한 로컬 서버 추천: `npx serve .`)

## 테스트

```
node test/test.js
```

## GitHub Pages 무료 호스팅

1. GitHub에 새 저장소를 만들고 이 폴더를 푸시합니다.
   ```
   git init
   git add .
   git commit -m "initial"
   git branch -M main
   git remote add origin https://github.com/<아이디>/<저장소이름>.git
   git push -u origin main
   ```
2. 저장소 **Settings → Pages** 로 이동합니다.
3. **Source: Deploy from a branch**, Branch를 `main` / `/ (root)` 로 선택하고 저장합니다.
4. 1~2분 뒤 `https://<아이디>.github.io/<저장소이름>/` 에서 접속됩니다.

## 구글 애드센스 광고 붙이기

> 애드센스는 **사이트가 공개된 후** 신청할 수 있고, 승인까지 며칠~몇 주 걸립니다.
> 승인 심사에는 실제 콘텐츠가 필요해서 index.html에 사용법/FAQ 섹션을 미리 넣어두었습니다.

1. [Google AdSense](https://adsense.google.com)에 가입하고 GitHub Pages 주소로 사이트를 등록합니다.
2. 발급받은 `ca-pub-XXXXXXXXXXXXXXXX` 코드를 확인합니다.
3. `index.html`에서 다음 두 군데의 주석을 해제하고 ID를 바꿉니다.
   - `<head>` 안의 애드센스 스크립트
   - `#ad-top`, `#ad-bottom` 슬롯 안의 `<ins>` 태그 (광고 단위를 만들고 `data-ad-slot` 값도 교체)
4. 사이트 루트에 `ads.txt` 파일을 만듭니다 (애드센스 관리 화면에 안내되는 한 줄):
   ```
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```

## 폴더 구조

```
index.html      메인 페이지 (광고 슬롯 포함)
css/style.css   스타일
js/fixer.js     JSON 수리 엔진 (브라우저/Node 겸용)
js/app.js       UI 로직
test/test.js    엔진 테스트
```

## 라이선스

MIT
