const fs = require('fs');
const path = require('path');
const root = __dirname;

function read(...parts) {
  const file = path.join(root, ...parts);
  if (!fs.existsSync(file)) {
    console.error('FAIL отсутствует: ' + file);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf8');
}

const service = read('backend','src','tasks','tasks.service.ts');
const panel = read('frontend','src','PoaEtrnPanel.tsx');
const structured = read('frontend','src','TaskStructuredFields.tsx');
const app = read('frontend','src','App.tsx');
const docs = read('frontend','src','EtrnSourceDocuments.tsx');

const checks = [
  [service.includes('PART_V064_N2_ETRN_BACKEND'), 'backend N2'],
  [service.includes('poaFileId'), 'доверенность передаётся'],
  [service.includes('invoiceFileId'), 'счёт передаётся'],
  [service.includes('invoiceSellerType'), 'организация счёта'],
  [service.includes('objectContactName'), 'имя на объекте'],
  [service.includes('objectContactPhone'), 'телефон на объекте'],
  [service.includes('carrierCompany'), 'ООО перевозчика'],
  [service.includes('carrierContactName'), 'имя перевозчика'],
  [service.includes('carrierPhone'), 'телефон перевозчика'],
  [panel.includes('deal.contactName'), 'автоконтакт из сделки'],
  [panel.includes('deal.clientPhone'), 'автотелефон из сделки'],
  [panel.includes('currentInvoice'), 'актуальный счёт из сделки'],
  [panel.includes('POWER_OF_ATTORNEY_RESULT_'), 'готовая доверенность'],
  [structured.includes('PART_V064_N2_ETRN_STRUCTURED_FIELDS'), 'новая форма ETRN'],
  [structured.includes('title="Адрес погрузки"'), 'адрес погрузки'],
  [structured.includes('title="Адрес выгрузки"'), 'адрес выгрузки'],
  [structured.includes('title="Контакт на объекте — имя"'), 'контакт имя'],
  [structured.includes('title="Перевозчик / ООО"'), 'перевозчик ООО'],
  [app.includes('PART_V064_N2_ETRN_SOURCE_DOCS_UI'), 'документы бухгалтеру'],
  [docs.includes('Актуальный счёт'), 'счёт виден бухгалтеру'],
  [docs.includes('Доверенность'), 'доверенность видна бухгалтеру'],
];

console.log('');
console.log('MSM — аудит v064-N2');
console.log('====================');
let failed = false;
for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) failed = true;
}
console.log('');
if (failed) process.exit(1);
console.log('ИТОГ: OK — заявка ЭТРН соответствует согласованным полям.');
