const fs = require('fs');
const path = require('path');

const root = __dirname;

const app = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'App.tsx'),
  'utf8'
);

const styles = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'styles.css'),
  'utf8'
);

const navPath =
  path.join(root, 'frontend', 'src', 'BlockOfficeMobileNav.tsx');

const nav =
  fs.existsSync(navPath)
    ? fs.readFileSync(navPath, 'utf8')
    : '';

const checks = [
  [app.includes('PART_V064_K_TASK_SEARCH_STATE'), 'state поиска'],
  [app.includes('id="bo-task-search"'), 'поле поиска'],
  [app.includes('PART_V064_K_TASK_SEARCH_FILTER'), 'фильтрация текста'],
  [app.includes('task.deal.clientName'), 'поиск по клиенту'],
  [app.includes("'ЗК-' +"), 'поиск по ЗК'],
  [app.includes('currentInvoice?.number'), 'поиск по счёту'],
  [app.includes('task.supplierPurchase'), 'поиск по поставщику'],
  [styles.includes('PART_V064_K_TASK_SEARCH'), 'CSS поиска'],
];

console.log('');
console.log('MSM — аудит v064-K');
console.log('==================');

let failed = false;

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) failed = true;
}

if (nav) {
  console.log(
    nav.includes('PART_V064_K_CONTEXT_SEARCH')
      ? 'OK   мобильный поиск контекстный'
      : 'INFO mobile nav не был изменён'
  );
}

console.log('');

if (failed) {
  console.log('ИТОГ: есть ошибки.');
  process.exit(1);
}

console.log(
  'ИТОГ: OK — быстрый поиск задач установлен.'
);
