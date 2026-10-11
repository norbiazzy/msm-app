const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const returnPanelPath = path.join(root, 'frontend', 'src', 'ReturnToManagerPanel.tsx');
const managerPanelPath = path.join(root, 'frontend', 'src', 'ManagerResubmitPanel.tsx');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) fail('Не найден файл: ' + file);
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

function replaceInsideRange(text, start, end, regexes, replacement) {
  const before = text.slice(0, start);
  let middle = text.slice(start, end);
  const after = text.slice(end);

  for (const regex of regexes) {
    if (regex.test(middle)) {
      middle = middle.replace(regex, replacement);
      return { changed: true, text: before + middle + after };
    }
  }

  return { changed: false, text };
}

function addStandaloneMarker(text, baseMarker, newMarker) {
  if (text.includes(newMarker)) return text;

  const jsxMarker = `{/* ${baseMarker} */}`;
  if (text.includes(jsxMarker)) {
    return text.replace(
      jsxMarker,
      `{/* ${newMarker} */}\n      ${jsxMarker}`
    );
  }

  const index = text.indexOf(baseMarker);
  if (index < 0) fail('Не найден базовый маркер ' + baseMarker);

  return text.slice(0, index) + newMarker + '\n      ' + text.slice(index);
}

let app = read(appPath);
const returnPanel = read(returnPanelPath);
const managerPanel = read(managerPanelPath);

if (!returnPanel.includes('export function ReturnToManagerPanel')) {
  fail('Не найден ReturnToManagerPanel.');
}

if (!managerPanel.includes('export function ManagerResubmitPanel')) {
  fail('Не найден ManagerResubmitPanel.');
}

if (!app.includes('function TaskDetail(')) {
  fail('Не найден function TaskDetail().');
}

const universalAccountant = `(
      task.type !== 'ISSUE_CLIENT_INVOICE' &&
      task.type !== 'PAY_SUPPLIER'
    )`;

const universalManager = `(
          task.type !== 'ISSUE_CLIENT_INVOICE' &&
          task.type !== 'PAY_SUPPLIER'
        )`;

const listRegex = /\[\s*['"]POWER_OF_ATTORNEY['"]\s*,\s*['"]ETRN['"]\s*,?\s*\]\s*\.includes\(\s*task\.type\s*\)/;
const singleRegex = /task\.type\s*===\s*['"]POWER_OF_ATTORNEY['"]/;

// 1. Accountant block: only inspect text between its marker and ReturnToManagerPanel.
if (!app.includes('PART_1N_D1_V2_UNIVERSAL_ACCOUNTANT_RETURN')) {
  const markerIndex = app.indexOf('PART_1M_B_POWER_OF_ATTORNEY_RETURN');
  if (markerIndex < 0) fail('Не найден Part 1M-B.');

  const panelIndex = app.indexOf('<ReturnToManagerPanel', markerIndex);
  if (panelIndex < 0) fail('После Part 1M-B не найден ReturnToManagerPanel.');

  const segment = app.slice(markerIndex, panelIndex);

  if (!segment.includes("task.type !== 'ISSUE_CLIENT_INVOICE'")) {
    const result = replaceInsideRange(
      app,
      markerIndex,
      panelIndex,
      [listRegex, singleRegex],
      universalAccountant
    );

    if (!result.changed) {
      fail('Не удалось заменить условие типа задачи в блоке ReturnToManagerPanel.');
    }

    app = result.text;
  }

  app = addStandaloneMarker(
    app,
    'PART_1M_B_POWER_OF_ATTORNEY_RETURN',
    'PART_1N_D1_V2_UNIVERSAL_ACCOUNTANT_RETURN'
  );
}

// 2. Manager block: only inspect text between its marker and ManagerResubmitPanel.
if (!app.includes('PART_1N_D1_V2_UNIVERSAL_MANAGER_RESUBMIT')) {
  const markerIndex = app.indexOf('PART_1N_B1_MANAGER_RESUBMIT');
  if (markerIndex < 0) fail('Не найден Part 1N-B1.');

  const panelIndex = app.indexOf('<ManagerResubmitPanel', markerIndex);
  if (panelIndex < 0) fail('После Part 1N-B1 не найден ManagerResubmitPanel.');

  const segment = app.slice(markerIndex, panelIndex);

  if (!segment.includes("task.type !== 'ISSUE_CLIENT_INVOICE'")) {
    const result = replaceInsideRange(
      app,
      markerIndex,
      panelIndex,
      [listRegex],
      universalManager
    );

    if (!result.changed) {
      fail('Не удалось заменить условие типа задачи в блоке ManagerResubmitPanel.');
    }

    app = result.text;
  }

  app = addStandaloneMarker(
    app,
    'PART_1N_B1_MANAGER_RESUBMIT',
    'PART_1N_D1_V2_UNIVERSAL_MANAGER_RESUBMIT'
  );
}

// 3. Strict final verification within each own range.
{
  const markerIndex = app.indexOf('PART_1M_B_POWER_OF_ATTORNEY_RETURN');
  const panelIndex = app.indexOf('<ReturnToManagerPanel', markerIndex);
  const segment = app.slice(markerIndex, panelIndex + 200);

  if (
    !segment.includes("task.type !== 'ISSUE_CLIENT_INVOICE'") ||
    !segment.includes("task.type !== 'PAY_SUPPLIER'") ||
    !segment.includes('<ReturnToManagerPanel')
  ) {
    fail('Финальная проверка бухгалтерского возврата не пройдена.');
  }
}

{
  const markerIndex = app.indexOf('PART_1N_B1_MANAGER_RESUBMIT');
  const panelIndex = app.indexOf('<ManagerResubmitPanel', markerIndex);
  const segment = app.slice(markerIndex, panelIndex + 260);

  if (
    !segment.includes("task.type !== 'ISSUE_CLIENT_INVOICE'") ||
    !segment.includes("task.type !== 'PAY_SUPPLIER'") ||
    !segment.includes('<ManagerResubmitPanel')
  ) {
    fail('Финальная проверка повторной отправки менеджера не пройдена.');
  }
}

console.log('');
console.log('Проверка Part 1N-D1 v2:');
console.log('  Возврат бухгалтера ограничен своим блоком: OK');
console.log('  Повторная отправка менеджера ограничена своим блоком: OK');
console.log('  Жёсткий список POWER_OF_ATTORNEY / ETRN больше не нужен: OK');
console.log('  Любая обычная TaskDetail-задача получает единый возврат: OK');
console.log('  ISSUE_CLIENT_INVOICE исключён: OK');
console.log('  PAY_SUPPLIER исключён: OK');
console.log('  Backend / Prisma: без изменений');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.copyFileSync(appPath, appPath + '.before-part1n-d1-v2-' + stamp);
write(appPath, app);

console.log('');
console.log('Part 1N-D1 v2 применён.');
console.log('');
console.log('Дальше:');
console.log('  git diff --check');
console.log('  cd frontend');
console.log('  npm run build');
