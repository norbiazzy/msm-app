const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const file = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.service.ts'
);

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail('Не найден backend/src/tasks/tasks.service.ts');
}

const raw = fs.readFileSync(file, 'utf8');
const usesCrlf = raw.includes('\r\n');
let text = raw.replace(/\r\n/g, '\n');

const functionMatch =
  /async\s+completePowerOfAttorney\s*\([\s\S]*?\)\s*\{/m.exec(text) ||
  /completePowerOfAttorney\s*\([\s\S]*?\)\s*\{/m.exec(text);

if (!functionMatch) {
  fail('Не найдена функция completePowerOfAttorney().');
}

const before = functionMatch[0];

let after = before
  .replace(
    /actorId\s*:\s*string\s*,\s*,/m,
    'actorId: string,'
  )
  .replace(
    /poaNumber\s*\?\s*:\s*string\s*,\s*,/m,
    'poaNumber?: string,'
  )
  .replace(
    /accountantComment\s*\?\s*:\s*string\s*,\s*,/m,
    'accountantComment?: string,'
  );

if (before === after) {
  if (
    /actorId\s*:\s*string\s*,[\s\S]*?poaNumber\s*\?\s*:\s*string\s*,[\s\S]*?accountantComment\s*\?\s*:\s*string/m.test(before)
  ) {
    console.log('');
    console.log('HOTFIX уже применён: сигнатура completePowerOfAttorney корректна.');
  } else {
    fail(
      'Двойная запятая не найдена, но сигнатура не похожа на ожидаемую.\n\n' +
      before
    );
  }
} else {
  text =
    text.slice(0, functionMatch.index) +
    after +
    text.slice(
      functionMatch.index +
      before.length
    );
}

text = text
  .split('\n')
  .map((line) => line.replace(/[ \t]+$/g, ''))
  .join('\n');

const verify =
  /completePowerOfAttorney\s*\([\s\S]*?actorId\s*:\s*string\s*,[\s\S]*?poaNumber\s*\?\s*:\s*string\s*,[\s\S]*?accountantComment\s*\?\s*:\s*string[\s\S]*?\)\s*\{/m
    .test(text);

if (!verify) {
  fail(
    'После исправления сигнатура completePowerOfAttorney не прошла проверку.'
  );
}

console.log('');
console.log('HOTFIX v062.1 — completePowerOfAttorney');
console.log('======================================');
console.log('OK — двойная запятая исправлена.');
console.log('OK — параметры poaNumber/accountantComment сохранены.');
console.log('OK — хвостовые пробелы в tasks.service.ts убраны.');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файл не изменён.');
  process.exit(0);
}

if (text === raw.replace(/\r\n/g, '\n')) {
  console.log('');
  console.log('Изменений для записи нет.');
  process.exit(0);
}

const stamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

fs.copyFileSync(
  file,
  file +
    '.before-v062-1-hotfix-' +
    stamp
);

const output =
  usesCrlf
    ? text.replace(/\n/g, '\r\n')
    : text;

fs.writeFileSync(
  file,
  output,
  'utf8'
);

console.log('');
console.log('HOTFIX применён.');
