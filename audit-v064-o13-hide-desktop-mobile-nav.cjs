const fs = require('fs');
const path = require('path');

const root = __dirname;
const stylesPath = path.join(root, 'frontend', 'src', 'styles.css');

console.log('');
console.log('MSM — аудит v064-O1.3');
console.log('======================');

if (!fs.existsSync(stylesPath)) {
  console.log('FAIL styles.css отсутствует');
  process.exit(1);
}

const styles = fs.readFileSync(stylesPath, 'utf8');

const checks = [
  [
    styles.includes('PART_V064_O13_HIDE_DESKTOP_MOBILE_NAV'),
    'hotfix установлен'
  ],
  [
    /@media\s*\(min-width:\s*721px\)[\s\S]*?\.boMobileNav\s*\{\s*display:\s*none\s*!important;/.test(styles),
    'boMobileNav скрыта'
  ],
  [
    /@media\s*\(min-width:\s*721px\)[\s\S]*?\.bottomNav\s*\{\s*position:\s*fixed\s*!important;/.test(styles),
    'bottomNav fixed'
  ],
];

let failed = false;

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) failed = true;
}

console.log('');

if (failed) {
  console.log('ИТОГ: есть ошибки.');
  process.exit(1);
}

console.log('ИТОГ: OK — мобильная навигация больше не отображается на desktop.');
