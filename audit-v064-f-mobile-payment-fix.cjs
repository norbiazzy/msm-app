const fs = require('fs');
const path = require('path');

const root = __dirname;

const purchases = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'PurchasesBlock.tsx'),
  'utf8'
);

const styles = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'styles.css'),
  'utf8'
);

const checks = [
  [
    purchases.includes('data-bo-payment-choice="balance"'),
    'Оплата с остатка — новый layout'
  ],
  [
    purchases.includes('data-bo-payment-choice="stamped"'),
    'Платёжка с печатью — новый layout'
  ],
  [
    styles.includes('PART_V064_F_MOBILE_AND_SUPPLIER_PAYMENT_FIX'),
    'CSS v064-F установлен'
  ],
  [
    styles.includes('grid-template-columns: 28px minmax(0, 1fr)'),
    'checkbox и текст стоят рядом'
  ],
  [
    styles.includes('width: calc(50% - 7px)'),
    'на ПК две карточки рядом'
  ],
  [
    styles.includes('width: 100% !important'),
    'mobile stack присутствует'
  ],
  [
    styles.includes('@media (max-width: 390px)'),
    'очень узкие экраны учтены'
  ],
  [
    styles.includes('grid-template-columns: repeat(5, minmax(0, 1fr))'),
    'нижняя панель 5 равных зон'
  ],
];

console.log('');
console.log('MSM — аудит v064-F');
console.log('==================');

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

console.log(
  'ИТОГ: OK — блок оплаты исправлен, mobile pass установлен.'
);
