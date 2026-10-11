const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const apiFile = path.join(
  root,
  'frontend',
  'src',
  'api.ts'
);

const poaFile = path.join(
  root,
  'frontend',
  'src',
  'PowerOfAttorneyBlock.tsx'
);

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

function writePreserve(file, source, next, suffix) {
  if (source.text === next) return false;

  const stamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

  fs.copyFileSync(
    file,
    file + '.' + suffix + '-' + stamp
  );

  const output =
    source.crlf
      ? next.replace(/\n/g, '\r\n')
      : next;

  fs.writeFileSync(file, output, 'utf8');
  return true;
}

const apiSource = read(apiFile);
const poaSource = read(poaFile);

let api = apiSource.text;
let poa = poaSource.text;

/* 1. Fix duplicated export async. */
api = api.replace(
  /\bexport\s+async\s+export\s+async\s+function\s+completePowerOfAttorneyTask\b/g,
  'export async function completePowerOfAttorneyTask'
);

api = api.replace(
  /\bexport\s+export\s+async\s+function\s+completePowerOfAttorneyTask\b/g,
  'export async function completePowerOfAttorneyTask'
);

/* 2. Restore SellerType in import type from ./types. */
if (
  poa.includes('Record<SellerType, string>') &&
  !/import\s+type\s*\{[\s\S]*?\bSellerType\b[\s\S]*?\}\s*from\s*['"]\.\/types['"]/m.test(poa)
) {
  const typeImport =
    /import\s+type\s*\{([\s\S]*?)\}\s*from\s*['"]\.\/types['"];/m;

  const match = typeImport.exec(poa);

  if (!match) {
    fail('Не найден import type из ./types в PowerOfAttorneyBlock.tsx');
  }

  const inside = match[1].replace(/\s+$/g, '');

  const replacement =
    `import type {${inside}\n  SellerType,\n} from './types';`;

  poa =
    poa.slice(0, match.index) +
    replacement +
    poa.slice(match.index + match[0].length);
}

/* 3. DealTask does not declare details in the deal card type. */
poa = poa.replace(
  /\(\s*task\.details\s*\|\|\s*\{\}\s*\)\s*as\s*\n?\s*Record<string,\s*unknown>/g,
  `((task as any).details || {}) as
                  Record<string, unknown>`
);

/* Clean trailing whitespace only in the two touched files. */
api = api
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/g, ''))
  .join('\n');

poa = poa
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/g, ''))
  .join('\n');

/* Verification. */
if (
  /export\s+async\s+export\s+async\s+function\s+completePowerOfAttorneyTask/.test(api)
) {
  fail('Дублированный export async остался в api.ts');
}

if (
  !/export\s+async\s+function\s+completePowerOfAttorneyTask/.test(api)
) {
  fail('Не найдена корректная completePowerOfAttorneyTask в api.ts');
}

if (
  poa.includes('Record<SellerType, string>') &&
  !/import\s+type\s*\{[\s\S]*?\bSellerType\b[\s\S]*?\}\s*from\s*['"]\.\/types['"]/m.test(poa)
) {
  fail('SellerType не восстановлен в import type');
}

if (
  /\(\s*task\.details\s*\|\|\s*\{\}\s*\)/m.test(poa)
) {
  fail('Осталось прямое обращение task.details в карточке DealTask');
}

console.log('');
console.log('HOTFIX v062.2 — frontend TypeScript');
console.log('===================================');
console.log('OK — duplicate export async исправлен.');
console.log('OK — SellerType import восстановлен.');
console.log('OK — DealTask.details приведён безопасно.');
console.log('OK — хвостовые пробелы в двух файлах убраны.');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

let count = 0;

if (
  writePreserve(
    apiFile,
    apiSource,
    api,
    'before-v062-2-hotfix'
  )
) count++;

if (
  writePreserve(
    poaFile,
    poaSource,
    poa,
    'before-v062-2-hotfix'
  )
) count++;

console.log('');
console.log(
  'HOTFIX применён. Изменено файлов: ' + count
);
