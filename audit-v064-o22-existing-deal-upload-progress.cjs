const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
    : '';
}

const app = read('frontend/src/App.tsx');
const purchases = read('frontend/src/PurchasesBlock.tsx');
const uploads = read('frontend/src/backgroundUploads.tsx');
const css = read('frontend/src/styles.css');

const direct = "uploadDealFile(deal.id, file, 'CLIENT_PAYMENT')";
const ps = app.indexOf('function PaymentBlock(');
const pe0 = app.indexOf('\nfunction ', ps + 20);
const pe = pe0 > ps ? pe0 : app.length;
const payment = app.slice(ps, pe);

const purchaseCount = (purchases.match(/startBackgroundUploadJob\(\{/g) || []).length;
const dealIdCount = (purchases.match(/dealId:\s*\n?\s*deal\.id,/g) || []).length;

const checks = [
  [app.includes('PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS'), 'патч установлен'],
  [uploads.includes('resolvedDealUploadId') || uploads.includes('inferredDealId'), 'upload job знает dealId'],
  [purchaseCount >= 3 && dealIdCount >= purchaseCount, 'supplier uploads привязаны к сделке'],
  [app.includes('const dealUploadJob ='), 'общий job сделки'],
  [app.includes('dealGeneralUploadProgress'), 'progress внутри сделки'],
  [app.includes('dealUploadState') && app.includes('uploadJob.progress'), 'progress в списке сделок'],
  [!payment.includes(direct), 'оплата клиента тоже с progress'],
  [css.includes('.dealGeneralUploadProgress'), 'CSS'],
];

console.log('');
console.log('MSM — аудит v064-O2.2');
console.log('======================');

let bad = false;
for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) bad = true;
}

console.log('');
if (bad) {
  console.log('ИТОГ: есть ошибки.');
  process.exit(1);
}
console.log('ИТОГ: OK — документы из существующей сделки показывают progress внутри сделки и в списке сделок.');
