const fs = require('fs');
const path = require('path');

const root = __dirname;

const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const panelPath = path.join(root, 'frontend', 'src', 'InvoiceRequestTaskPanel.tsx');

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : '';
}

function status(label, ok) {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}`
  );
}

const app = read(appPath);
const panel = read(panelPath);

console.log('');
console.log('MSM — аудит формы счёта v061');
console.log('============================');
console.log('');

const sellerBlank =
  app.includes("useState<SellerType | ''>('')");

const sellerRequired =
  app.includes('PART_V061_VALIDATE_SELLER');

const accountantFields =
  panel.includes('PART_V061_ACCOUNTANT_FIELDS');

const managerFields =
  panel.includes('PART_V061_MANAGER_REPAIR_FIELDS');

const dataCardStart =
  panel.indexOf('export function InvoiceRequestDataCard');

const repairStart =
  panel.indexOf('export function InvoiceRequestManagerRepair');

const dataCard =
  dataCardStart >= 0 && repairStart > dataCardStart
    ? panel.slice(dataCardStart, repairStart)
    : '';

const repair =
  repairStart >= 0
    ? panel.slice(repairStart)
    : '';

const forbiddenData = [
  'Формат запроса',
  'Контактное лицо',
  'Телефон',
  'Условия',
  'Значение',
  'Адрес / адреса доставки',
];

const accountantClean =
  forbiddenData.every((x) => !dataCard.includes(x));

const managerClean =
  forbiddenData.every((x) => !repair.includes(x)) &&
  !repair.includes('className="urgentToggle"');

const sellerVisible =
  dataCard.includes('От какой организации выставлять') &&
  repair.includes('От какой организации выставлять');

const requiredCore =
  dataCard.includes('На кого выставлять') &&
  dataCard.includes('Что выставляем / текст запроса') &&
  dataCard.includes('Комментарий для бухгалтерии') &&
  dataCard.includes('Входящий счёт') &&
  dataCard.includes('Дополнительный документ');

status(
  'Организация без значения по умолчанию',
  sellerBlank
);

status(
  'Организация обязательна при первой отправке',
  sellerRequired
);

status(
  'Новый набор полей бухгалтера установлен',
  accountantFields
);

status(
  'Новый набор полей возврата установлен',
  managerFields
);

status(
  'У бухгалтера нет лишних полей',
  accountantClean
);

status(
  'При возврате нет лишних полей',
  managerClean
);

status(
  'Организация видна бухгалтеру и при возврате',
  sellerVisible
);

status(
  'Основные поля и документы сохранены',
  requiredCore
);

console.log('');
console.log('ИТОГ');
console.log('=====');

const all =
  sellerBlank &&
  sellerRequired &&
  accountantFields &&
  managerFields &&
  accountantClean &&
  managerClean &&
  sellerVisible &&
  requiredCore;

console.log(
  all
    ? 'OK — форма «Выставить счёт» приведена к утверждённой схеме.'
    : 'WARN — смотрите строки выше.'
);

console.log('');
console.log('Аудит ничего не изменяет.');
