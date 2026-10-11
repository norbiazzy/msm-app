const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const stylesPath = path.join(root, 'frontend', 'src', 'styles.css');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(stylesPath)) {
  fail('Не найден frontend/src/styles.css');
}

const raw = fs.readFileSync(stylesPath, 'utf8');
const crlf = raw.includes('\r\n');
let styles = raw.replace(/\r\n/g, '\n');

const marker = 'PART_V064_O13_HIDE_DESKTOP_MOBILE_NAV';

if (styles.includes(marker)) {
  console.log('');
  console.log('v064-O1.3 уже установлен.');
  process.exit(0);
}

const required = [
  '.boMobileNav {',
  '@media (min-width: 721px)',
  '.bottomNav,',
];

for (const item of required) {
  if (!styles.includes(item)) {
    fail('Не найден ожидаемый CSS-фрагмент: ' + item);
  }
}

styles = styles.replace(/\s*$/, '') + `

/* ${marker}
   На desktop используется только .bottomNav.
   .boMobileNav предназначена для мобильной версии.
*/
@media (min-width: 721px) {
  .boMobileNav {
    display: none !important;
  }

  .bottomNav {
    position: fixed !important;
  }
}
/* END_${marker} */
`;

const checks = [
  [styles.includes(marker), 'hotfix добавлен'],
  [
    styles.includes(
      "@media (min-width: 721px) {\n  .boMobileNav {\n    display: none !important;"
    ),
    'мобильная навигация скрыта на desktop'
  ],
  [
    styles.includes(
      ".bottomNav {\n    position: fixed !important;"
    ),
    'desktop навигация фиксированная'
  ],
];

console.log('');
console.log('v064-O1.3 — desktop nav ghost fix');
console.log('================================');

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

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

const backup = stylesPath + '.before-v064-o13-' + stamp;

fs.copyFileSync(stylesPath, backup);

fs.writeFileSync(
  stylesPath,
  crlf ? styles.replace(/\n/g, '\r\n') : styles,
  'utf8'
);

console.log('');
console.log('v064-O1.3 применён.');
console.log('Изменён только frontend/src/styles.css');
console.log('Backup: ' + backup);
