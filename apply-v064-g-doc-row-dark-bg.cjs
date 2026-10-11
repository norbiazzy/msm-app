const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');
const cssContent = "/* PART_V064_G_DOC_ROWS_DARK_BG */\n\n/* Document row: file name and document type must never merge visually */\n.boView-tasks .invoiceTaskDoc {\n  display: grid !important;\n  grid-template-columns: minmax(0, 1fr) auto !important;\n  align-items: center !important;\n  gap: 14px !important;\n  min-height: 58px !important;\n  padding: 9px 12px !important;\n}\n\n.boView-tasks .invoiceTaskDoc > div {\n  display: flex !important;\n  flex-direction: column !important;\n  align-items: flex-start !important;\n  justify-content: center !important;\n  gap: 3px !important;\n  min-width: 0 !important;\n}\n\n.boView-tasks .invoiceTaskDoc > div > strong {\n  display: block !important;\n  width: 100% !important;\n  margin: 0 !important;\n  color: var(--bo-text) !important;\n  font-size: 13px !important;\n  font-weight: 850 !important;\n  line-height: 1.3 !important;\n  white-space: normal !important;\n  overflow-wrap: anywhere !important;\n}\n\n.boView-tasks .invoiceTaskDoc > div > span {\n  display: block !important;\n  width: 100% !important;\n  margin: 0 !important;\n  color: var(--bo-muted) !important;\n  font-size: 11px !important;\n  font-weight: 600 !important;\n  line-height: 1.3 !important;\n  white-space: normal !important;\n}\n\n.boView-tasks .invoiceTaskDoc > b {\n  display: block !important;\n  flex: 0 0 auto !important;\n  margin: 0 !important;\n  color: var(--bo-accent) !important;\n  font-size: 12px !important;\n  font-weight: 900 !important;\n  white-space: nowrap !important;\n}\n\n/* Generic version rows used by POA and other task documents */\n.boView-tasks .versionRow,\n.boView-deal .versionRow {\n  display: grid !important;\n  grid-template-columns: minmax(0, 1fr) auto !important;\n  align-items: center !important;\n  gap: 14px !important;\n}\n\n.boView-tasks .versionRow > div,\n.boView-deal .versionRow > div {\n  min-width: 0 !important;\n}\n\n.boView-tasks .versionRow > div > b,\n.boView-deal .versionRow > div > b {\n  display: block !important;\n  overflow-wrap: anywhere !important;\n}\n\n.boView-tasks .versionRow > a,\n.boView-deal .versionRow > a {\n  flex: 0 0 auto !important;\n  white-space: nowrap !important;\n}\n\n/* Dark theme must paint the entire viewport, including empty area below content */\nhtml[data-theme='dark'],\nhtml[data-theme='dark'] body,\nhtml[data-theme='dark'] #root {\n  background: #14171b !important;\n  background-color: #14171b !important;\n  min-height: 100% !important;\n}\n\nhtml[data-theme='dark'] body,\nhtml[data-theme='dark'] #root,\nhtml[data-theme='dark'] .shell,\nhtml[data-theme='dark'] .boShell {\n  min-height: 100vh !important;\n  min-height: 100dvh !important;\n  background: #14171b !important;\n  background-color: #14171b !important;\n}\n\nhtml[data-theme='dark'] .boShell::before,\nhtml[data-theme='dark'] .shell::before {\n  background: #14171b !important;\n}\n\n/* Mobile */\n@media (max-width: 720px) {\n  .boView-tasks .invoiceTaskDoc {\n    grid-template-columns: minmax(0, 1fr) auto !important;\n    gap: 10px !important;\n    min-height: 56px !important;\n    padding: 9px 10px !important;\n  }\n\n  .boView-tasks .invoiceTaskDoc > b {\n    min-height: 36px !important;\n    display: flex !important;\n    align-items: center !important;\n  }\n\n  .boView-tasks .versionRow,\n  .boView-deal .versionRow {\n    grid-template-columns: minmax(0, 1fr) auto !important;\n    gap: 10px !important;\n  }\n}\n\n/* END_PART_V064_G_DOC_ROWS_DARK_BG */";

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

const source = read(stylesFile);
let styles = source.text;

if (!styles.includes('PART_V064_G_DOC_ROWS_DARK_BG')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    styles.includes('PART_V064_G_DOC_ROWS_DARK_BG'),
    'CSS hotfix добавлен'
  ],
  [
    styles.includes('.invoiceTaskDoc > div > strong'),
    'название файла отделено'
  ],
  [
    styles.includes('.invoiceTaskDoc > div > span'),
    'тип документа отдельной строкой'
  ],
  [
    styles.includes("html[data-theme='dark'] #root"),
    'тёмный фон root добавлен'
  ],
  [
    styles.includes('min-height: 100dvh'),
    'фон покрывает всю высоту экрана'
  ],
];

console.log('');
console.log('v064-G — Document rows + dark background');
console.log('========================================');

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

if (source.text === styles) {
  console.log('');
  console.log('v064-G уже установлен. Изменений нет.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

fs.copyFileSync(
  stylesFile,
  stylesFile + '.before-v064-g-' + stamp
);

const output =
  source.crlf
    ? styles.replace(/\n/g, '\r\n')
    : styles;

fs.writeFileSync(stylesFile, output, 'utf8');

console.log('');
console.log('v064-G применён. Изменён frontend/src/styles.css');
