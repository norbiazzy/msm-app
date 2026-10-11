const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(name) {
  return fs.readFileSync(
    path.join(root, 'frontend', 'src', name),
    'utf8'
  );
}

const app = read('App.tsx');
const styles = read('styles.css');
const home = read('BlockOfficeHome.tsx');
const nav = read('BlockOfficeMobileNav.tsx');

const checks = [
  [app.includes('<BlockOfficeHome'), 'BlockOfficeHome подключён'],
  [app.includes('<BlockOfficeMobileNav'), 'нижняя мобильная навигация подключена'],
  [styles.includes('PART_V063_BLOCK_OFFICE'), 'стили v063 присутствуют'],
  [home.includes("'cards'") && home.includes("'expanded'"), 'два режима списка присутствуют'],
  [!home.includes("'compact'") && !home.includes('"compact"'), 'короткий список отсутствует'],
  [home.includes('+ Новая сделка'), 'кнопка Новая сделка присутствует'],
  [nav.includes('Свободная кнопка 1') && nav.includes('Свободная кнопка 2'), 'две пустые мобильные кнопки присутствуют'],
  [nav.indexOf('Задачи') < nav.indexOf('Сделки') && nav.indexOf('Сделки') < nav.indexOf('Поиск'), 'справа: Поиск, Сделки, Задачи'],
  [!nav.includes('Тема'), 'Тема снизу не дублируется'],
];

console.log('');
console.log('MSM — аудит Block Office v063');
console.log('=============================');

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

console.log('ИТОГ: OK — Block Office v063 установлен.');
