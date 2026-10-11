const fs = require('fs');
const path = require('path');

const root = __dirname;
const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const invoicePath = path.join(root, 'frontend', 'src', 'InvoiceRequestTaskPanel.tsx');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

for (const file of [appPath, invoicePath]) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function printWindow(text, title, index, before = 40, after = 90) {
  const lines = text.split('\n');
  const line = lineOf(text, index);
  const start = Math.max(0, line - 1 - before);
  const end = Math.min(lines.length, line + after);

  console.log('');
  console.log('### ' + title);
  console.log('');

  for (let i = start; i < end; i++) {
    console.log(
      String(i + 1).padStart(5, ' ') +
      ' | ' +
      lines[i]
    );
  }
}

function printMatches(text, label, needle, before = 35, after = 80, limit = 8) {
  let cursor = 0;
  let count = 0;

  while (true) {
    const idx = text.indexOf(needle, cursor);

    if (idx < 0) {
      break;
    }

    count++;

    if (count <= limit) {
      printWindow(
        text,
        `${label} #${count} — ${needle}`,
        idx,
        before,
        after
      );
    }

    cursor = idx + needle.length;
  }

  if (count === 0) {
    console.log('');
    console.log(`WARN: ${label}: «${needle}» не найдено.`);
  } else if (count > limit) {
    console.log('');
    console.log(`INFO: ${label}: всего найдено ${count}, показаны первые ${limit}.`);
  }
}

const app = fs.readFileSync(appPath, 'utf8');
const invoice = fs.readFileSync(invoicePath, 'utf8');

console.log('');
console.log('MSM — аудит форм счёта');
console.log('======================');

console.log('');
console.log('## 1. App.tsx — исходная форма менеджера');

for (const key of [
  'sellerType',
  'requestMode',
  'marginMode',
  'marginValue',
  'accountingComment',
  'managerComment',
]) {
  printMatches(app, 'Исходная форма', key, 35, 90, 6);
}

console.log('');
console.log('## 2. InvoiceRequestTaskPanel.tsx — что видит бухгалтер');

for (const key of [
  'InvoiceRequestDataCard',
  'На кого выставлять',
  'Что выставляем',
  'Комментарий бухгалтерии',
  'Контактное лицо',
  'Адрес / адреса доставки',
  'Условия',
]) {
  printMatches(invoice, 'Бухгалтер', key, 30, 110, 5);
}

console.log('');
console.log('## 3. InvoiceRequestTaskPanel.tsx — возврат менеджеру');

for (const key of [
  'InvoiceRequestManagerRepair',
  'Формат запроса',
  'От какой организации',
  'Организация',
  'На кого выставлять',
  'Контактное лицо',
  'Телефон',
  'Адрес / адреса доставки',
  'Что выставляем / текст запроса',
  'Условия',
  'Значение',
  'Комментарий бухгалтерии',
  'Срочно',
]) {
  printMatches(invoice, 'Возврат менеджеру', key, 25, 100, 5);
}

console.log('');
console.log('## 4. Счётчики полей');

const serviceKeys = [
  'sellerType',
  'requestMode',
  'requestText',
  'clientName',
  'contactName',
  'clientPhone',
  'deliveryAddresses',
  'marginMode',
  'marginValue',
  'accountingComment',
  'managerComment',
  'urgent',
];

console.log('');
console.log('App.tsx');
for (const key of serviceKeys) {
  console.log(
    key.padEnd(24, ' ') +
    ': ' +
    (app.split(key).length - 1)
  );
}

console.log('');
console.log('InvoiceRequestTaskPanel.tsx');
for (const key of serviceKeys) {
  console.log(
    key.padEnd(24, ' ') +
    ': ' +
    (invoice.split(key).length - 1)
  );
}

console.log('');
console.log('Аудит ничего не изменяет.');
