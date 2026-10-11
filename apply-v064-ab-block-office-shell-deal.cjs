const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appFile = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');

const cssContent = "/* PART_V064_AB_BLOCK_OFFICE_SHELL_DEAL */\n:root {\n  --bo-page-bg: #f1f2ed;\n  --bo-panel: #ffffff;\n  --bo-panel-2: #e9ece4;\n  --bo-text: #1d211c;\n  --bo-muted: #71786d;\n  --bo-line: #d8ddd2;\n  --bo-accent: #6e8758;\n  --bo-accent-strong: #536a43;\n  --bo-shadow: 0 8px 24px rgba(25, 30, 20, .07);\n  --bo-stone: #8b9187;\n  --bo-blue: #5e9fc8;\n  --bo-gold: #c59a35;\n  --bo-red: #bd5d50;\n  --bo-green: #648f51;\n  --bo-purple: #655775;\n  --bo-lava: #d06e36;\n}\n\nhtml[data-theme='dark'] {\n  --bo-page-bg: #14171b;\n  --bo-panel: #1d2228;\n  --bo-panel-2: #252b32;\n  --bo-text: #eef1f4;\n  --bo-muted: #9aa3ad;\n  --bo-line: #343b44;\n  --bo-accent: #74879b;\n  --bo-accent-strong: #879aae;\n  --bo-shadow: 0 10px 28px rgba(0, 0, 0, .24);\n  --bo-stone: #9aa3ad;\n  --bo-blue: #72a9d0;\n  --bo-gold: #d4aa50;\n  --bo-red: #d27368;\n  --bo-green: #78a86b;\n  --bo-purple: #8b7a9d;\n  --bo-lava: #e1834d;\n}\n\nhtml,\nbody {\n  background: var(--bo-page-bg);\n}\n\n.boShell {\n  color: var(--bo-text);\n}\n\n.boShell .topbar {\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: var(--bo-panel);\n  box-shadow: var(--bo-shadow);\n  padding: 13px 15px;\n  margin-bottom: 14px;\n}\n\n.boShell .topbar h1 {\n  margin: 2px 0 0;\n  color: var(--bo-text);\n  font-size: clamp(20px, 2.2vw, 27px);\n  letter-spacing: -.02em;\n}\n\n.boShell .eyebrow {\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 850;\n  letter-spacing: .08em;\n  text-transform: uppercase;\n}\n\n.boShell .topbarActions {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.boShell .userBadge {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n}\n\n.boShell .userBadge span {\n  color: var(--bo-muted);\n}\n\n.boShell button,\n.boShell input,\n.boShell textarea,\n.boShell select {\n  font: inherit;\n}\n\n.boShell .primary,\n.boShell button.primary {\n  border: 1px solid transparent;\n  border-radius: 6px;\n  background: var(--bo-accent);\n  color: #fff;\n  box-shadow: none;\n  font-weight: 800;\n}\n\n.boShell .primary:hover,\n.boShell button.primary:hover {\n  background: var(--bo-accent-strong);\n}\n\n.boShell .secondary,\n.boShell button.secondary,\n.boShell .ghost,\n.boShell button.ghost {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n}\n\n.boShell .backLink {\n  display: inline-flex;\n  align-items: center;\n  min-height: 38px;\n  border: 0;\n  background: transparent;\n  color: var(--bo-accent);\n  font-weight: 800;\n  padding: 4px 0;\n  text-decoration: none;\n}\n\n.boShell .content {\n  color: var(--bo-text);\n}\n\n.boShell .form,\n.boShell form {\n  color: var(--bo-text);\n}\n\n.boShell .field {\n  gap: 6px;\n}\n\n.boShell .field > span,\n.boShell label > span {\n  color: var(--bo-muted);\n  font-size: 12px;\n  font-weight: 750;\n}\n\n.boShell input,\n.boShell textarea,\n.boShell select {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  outline: none;\n}\n\n.boShell input:focus,\n.boShell textarea:focus,\n.boShell select:focus {\n  border-color: var(--bo-accent);\n  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bo-accent) 14%, transparent);\n}\n\n.boShell .error {\n  border: 1px solid color-mix(in srgb, var(--bo-red) 45%, var(--bo-line));\n  border-radius: 6px;\n  background: color-mix(in srgb, var(--bo-red) 10%, var(--bo-panel));\n  color: var(--bo-red);\n}\n\n.boShell .empty {\n  border: 1px dashed var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-muted);\n}\n\n/* Deal page */\n.boView-deal .content {\n  display: block;\n  max-width: 1180px;\n  margin: 0 auto;\n}\n\n.boView-deal .detailHero {\n  position: relative;\n  overflow: hidden;\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: var(--bo-panel);\n  box-shadow: var(--bo-shadow);\n  padding: 17px 18px;\n  margin-bottom: 12px;\n}\n\n.boView-deal .detailHero::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 5px;\n  background: var(--bo-blue);\n}\n\n.boView-deal .detailHero h2,\n.boView-deal .detailHero h3 {\n  margin: 3px 0 7px;\n  color: var(--bo-text);\n  font-size: clamp(21px, 2.5vw, 29px);\n  letter-spacing: -.025em;\n}\n\n.boView-deal .detailHero p {\n  margin: 5px 0;\n  color: var(--bo-muted);\n}\n\n.boView-deal .detailHero .eyebrow {\n  color: var(--bo-muted);\n}\n\n.boView-deal .statusPill,\n.boView-deal .paymentMini {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  border: 1px solid var(--bo-line);\n  border-radius: 4px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  font-size: 12px;\n  font-weight: 850;\n  padding: 5px 8px;\n}\n\n.boView-deal .urgent {\n  display: inline-flex;\n  align-items: center;\n  border-radius: 4px;\n  background: color-mix(in srgb, var(--bo-lava) 12%, transparent);\n  color: var(--bo-lava);\n  font-size: 11px;\n  font-weight: 900;\n  padding: 5px 8px;\n}\n\n.boView-deal .panel,\n.boView-deal .infoBox,\n.boView-deal .section,\n.boView-deal .card {\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: none;\n}\n\n.boView-deal .panel,\n.boView-deal .infoBox {\n  padding: 14px;\n}\n\n.boView-deal .panel h2,\n.boView-deal .panel h3,\n.boView-deal .infoBox h2,\n.boView-deal .infoBox h3,\n.boView-deal .sectionTitle {\n  color: var(--bo-text);\n  font-weight: 850;\n  letter-spacing: -.01em;\n}\n\n.boView-deal .note {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n}\n\n.boView-deal .microcopy,\n.boView-deal .muted,\n.boView-deal small {\n  color: var(--bo-muted);\n}\n\n.boView-deal .versionList {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n}\n\n.boView-deal .versionRow {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n}\n\n.boView-deal .versionRow a {\n  color: var(--bo-accent);\n  font-weight: 800;\n}\n\n.boView-deal .dealTaskLinks,\n.boView-deal .taskList {\n  border-radius: 7px;\n}\n\n.boView-deal .dealTaskLink,\n.boView-deal .taskCard {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n}\n\n.boView-deal .dealTaskLinkNeedData {\n  border-left: 5px solid var(--bo-red);\n}\n\n.boView-deal .dealCardAction,\n.boView-deal .returnBlock {\n  border: 1px solid color-mix(in srgb, var(--bo-red) 35%, var(--bo-line));\n  border-radius: 7px;\n  background: color-mix(in srgb, var(--bo-red) 7%, var(--bo-panel));\n}\n\n.boView-deal .dealCardActionStatus {\n  color: var(--bo-red);\n}\n\n.boView-deal .dealUploadState {\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n}\n\n.boView-deal .dealUploadMiniBar {\n  overflow: hidden;\n  border-radius: 3px;\n  background: color-mix(in srgb, var(--bo-line) 70%, transparent);\n}\n\n.boView-deal .dealUploadMiniBar > span {\n  background: var(--bo-blue);\n}\n\n.boView-deal .grid,\n.boView-deal .detailGrid,\n.boView-deal .summaryGrid,\n.boView-deal .actionGrid {\n  gap: 10px;\n}\n\n.boView-deal hr {\n  border: 0;\n  border-top: 1px solid var(--bo-line);\n}\n\n@media (max-width: 720px) {\n  .boShell .topbar {\n    padding: 10px 11px;\n    border-radius: 7px;\n  }\n\n  .boShell .topbarActions {\n    gap: 6px;\n  }\n\n  .boShell .userBadge {\n    max-width: 120px;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n\n  .boView-deal .content {\n    width: 100%;\n  }\n\n  .boView-deal .detailHero {\n    padding: 14px;\n    border-radius: 7px;\n  }\n\n  .boView-deal .panel,\n  .boView-deal .infoBox {\n    padding: 12px;\n    border-radius: 7px;\n  }\n\n  .boView-deal .grid,\n  .boView-deal .detailGrid,\n  .boView-deal .summaryGrid,\n  .boView-deal .actionGrid,\n  .boView-deal .powerTaskGrid {\n    grid-template-columns: 1fr !important;\n  }\n\n  .boView-deal input,\n  .boView-deal textarea,\n  .boView-deal select,\n  .boView-deal button.primary,\n  .boView-deal .primary.wide {\n    min-height: 44px;\n  }\n\n  .boView-deal .versionRow {\n    align-items: flex-start;\n    gap: 8px;\n  }\n}\n/* END_PART_V064_AB_BLOCK_OFFICE_SHELL_DEAL */";

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }

  const raw = fs.readFileSync(file, 'utf8');

  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
  };
}

function backupAndWrite(file, source, next) {
  if (source.text === next) {
    return false;
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  fs.copyFileSync(
    file,
    file + '.before-v064-ab-' + stamp
  );

  const output =
    source.crlf
      ? next.replace(/\n/g, '\r\n')
      : next;

  fs.writeFileSync(file, output, 'utf8');

  return true;
}

const appSource = read(appFile);
const stylesSource = read(stylesFile);

let app = appSource.text;
let styles = stylesSource.text;

if (!app.includes('boShell boView-')) {
  const shellPattern =
    /<main\s+className=(?:"shell"|'shell')>/;

  if (!shellPattern.test(app)) {
    fail(
      'Не найден <main className="shell"> в App.tsx. ' +
      'Ничего не изменено.'
    );
  }

  app = app.replace(
    shellPattern,
    "<main className={'shell boShell boView-' + view}>"
  );
}

if (!styles.includes('PART_V064_AB_BLOCK_OFFICE_SHELL_DEAL')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    app.includes('boShell boView-'),
    'App получает классы boShell + boView-*'
  ],
  [
    styles.includes('PART_V064_AB_BLOCK_OFFICE_SHELL_DEAL'),
    'стили v064-A+B добавлены'
  ],
  [
    styles.includes("html[data-theme='dark']"),
    'графитовая dark theme присутствует'
  ],
  [
    styles.includes('.boView-deal .detailHero'),
    'карточка сделки стилизована'
  ],
  [
    styles.includes('@media (max-width: 720px)'),
    'мобильная адаптация присутствует'
  ],
];

console.log('');
console.log('v064-A+B — Block Office');
console.log('=======================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);

  if (!ok) {
    fail('Проверка не пройдена: ' + label);
  }
}

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

let changed = 0;

if (backupAndWrite(appFile, appSource, app)) {
  changed++;
}

if (backupAndWrite(stylesFile, stylesSource, styles)) {
  changed++;
}

console.log('');
console.log(
  'v064-A+B применён. Изменено файлов: ' + changed
);
