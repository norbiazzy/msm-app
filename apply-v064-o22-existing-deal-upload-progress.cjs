const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');
const marker = 'PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS';

const p = {
  app: path.join(root, 'frontend', 'src', 'App.tsx'),
  purchases: path.join(root, 'frontend', 'src', 'PurchasesBlock.tsx'),
  uploads: path.join(root, 'frontend', 'src', 'backgroundUploads.tsx'),
  styles: path.join(root, 'frontend', 'src', 'styles.css'),
};

function fail(msg) {
  console.error('');
  console.error('ОШИБКА: ' + msg);
  process.exit(1);
}

function load(file) {
  if (!fs.existsSync(file)) fail('Не найден ' + path.relative(root, file));
  const raw = fs.readFileSync(file, 'utf8');
  return { raw, crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') };
}

function save(file, src, text) {
  fs.writeFileSync(file, src.crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8');
}

const A = load(p.app);
const P = load(p.purchases);
const U = load(p.uploads);
const S = load(p.styles);

let app = A.text;
let purchases = P.text;
let uploads = U.text;
let styles = S.text;

if ([app, purchases, uploads, styles].some(x => x.includes(marker))) {
  console.log('v064-O2.2 уже установлен.');
  process.exit(0);
}

/* 1) Future-proof: upload из #deal/<id> автоматически получает dealId. */
if (!uploads.includes('const resolvedDealUploadId =') &&
    !uploads.includes('const inferredDealId =')) {
  const fn = uploads.indexOf('export function startBackgroundUploadJob(');
  const total = uploads.indexOf('  const totalFiles =', fn);
  if (fn < 0 || total < 0) fail('backgroundUploads: startBackgroundUploadJob/totalFiles не найден.');

  uploads = uploads.slice(0, total) +
`  // ${marker}
  const currentDealUploadRoute =
    window.location.hash.replace(/^#/, '');

  const resolvedDealUploadId =
    options.dealId ||
    (
      currentDealUploadRoute.startsWith('deal/')
        ? decodeURIComponent(
            currentDealUploadRoute.slice('deal/'.length)
          )
        : undefined
    );

` + uploads.slice(total);

  const tail = uploads.slice(fn);
  if (!/dealId:\s*\n?\s*options\.dealId,/.test(tail)) {
    fail('backgroundUploads: dealId: options.dealId не найден.');
  }
  uploads = uploads.slice(0, fn) + tail.replace(
    /dealId:\s*\n?\s*options\.dealId,/,
`dealId:
        resolvedDealUploadId,`
  );
}

/* 2) Все upload jobs из PurchasesBlock относятся к текущей сделке. */
const calls = [...purchases.matchAll(/startBackgroundUploadJob\(\{/g)];
if (calls.length < 3) fail('PurchasesBlock: ожидалось минимум 3 background upload, найдено ' + calls.length);

let delta = 0;
for (const m of calls) {
  const i = m.index + delta;
  const head = purchases.slice(i, i + 320);
  if (/\bdealId\s*:/.test(head)) continue;

  const open = 'startBackgroundUploadJob({';
  const at = i + open.length;
  const add =
`\n\n        // ${marker}
        dealId:
          deal.id,`;
  purchases = purchases.slice(0, at) + add + purchases.slice(at);
  delta += add.length;
}

/* 3) DealDetail. */
const dealStart = app.indexOf('function DealDetail(');
const dealEnd = app.indexOf('\nfunction InvoiceBlock(', dealStart);
if (dealStart < 0 || dealEnd < 0) fail('App: DealDetail/InvoiceBlock не найдены.');

let deal = app.slice(dealStart, dealEnd);

/* Корректировка из сделки: taskId + dealId. */
if (deal.includes("'Отправляем документы на корректировку'")) {
  const titlePos = deal.indexOf("'Отправляем документы на корректировку'");
  const jobPos = deal.lastIndexOf('startBackgroundUploadJob({', titlePos);
  const head = deal.slice(jobPos, titlePos);

  if (!/\bdealId\s*:/.test(head)) {
    const local = deal.slice(jobPos);
    if (!/taskId:\s*\n\s*task\.id,/.test(local)) {
      fail('DealDetail: taskId корректировки не найден.');
    }
    deal = deal.slice(0, jobPos) + local.replace(
      /taskId:\s*\n\s*task\.id,/,
`taskId:
            task.id,

          // ${marker}
          dealId:
            activeDeal.id,`
    );
  }
}

/* Общий dealUploadJob — старые invoice-specific места оставляем. */
if (!deal.includes('const dealUploadJob =')) {
  const re = /(const invoiceRequestUploadJob =[\s\S]*?;\n)/;
  const m = deal.match(re);
  if (!m) fail('DealDetail: invoiceRequestUploadJob не найден.');
  deal = deal.replace(re,
`${m[1]}

  // ${marker}
  const dealUploadJob =
    invoiceRequestUploadJob;
`);
}

/* Progress сверху страницы сделки. */
if (!deal.includes('dealGeneralUploadProgress')) {
  const anchor = '<section className="content form dealWorkspaceCPage">';
  if (!deal.includes(anchor)) fail('DealDetail: dealWorkspaceCPage не найден.');

  deal = deal.replace(anchor, anchor +
`
      {/* ${marker} */}
      {dealUploadJob && (
        <div className={'dealGeneralUploadProgress dealUpload-' + dealUploadJob.status.toLowerCase()}>
          <div className="dealGeneralUploadTop">
            <strong>
              {dealUploadJob.status === 'SUCCESS'
                ? '✓ ' + (dealUploadJob.successTitle || dealUploadJob.title)
                : dealUploadJob.status === 'ERROR'
                  ? 'Ошибка отправки документов'
                  : '↑ ' + dealUploadJob.title}
            </strong>
            <b>{dealUploadJob.progress}%</b>
          </div>

          <div className="dealGeneralUploadBar">
            <span style={{
              width: Math.max(0, Math.min(100, dealUploadJob.progress)) + '%',
            }} />
          </div>

          <div className="dealGeneralUploadMeta">
            {dealUploadJob.status === 'RUNNING'
              ? (dealUploadJob.totalFiles > 0
                  ? dealUploadJob.completedFiles + ' из ' + dealUploadJob.totalFiles + ' файлов'
                  : 'Выполняем запрос…')
              : dealUploadJob.status === 'SUCCESS'
                ? 'Готово'
                : (dealUploadJob.error || 'Не удалось завершить отправку')}
            {dealUploadJob.currentFile ? ' · ' + dealUploadJob.currentFile : ''}
          </div>
        </div>
      )}
`);
}

app = app.slice(0, dealStart) + deal + app.slice(dealEnd);

/* 4) Оплата клиента: если ещё прямая uploadDealFile — переводим в background job. */
const payStart = app.indexOf('function PaymentBlock(');
const payEnd0 = app.indexOf('\nfunction ', payStart + 20);
const payEnd = payEnd0 > payStart ? payEnd0 : app.length;
let pay = app.slice(payStart, payEnd);

const direct = "uploadDealFile(deal.id, file, 'CLIENT_PAYMENT')";
if (pay.includes(direct)) {
  const f1 = pay.indexOf('  async function addPayment() {');
  const f2 = pay.indexOf('\n  return <div className="paymentBox">', f1);
  if (f1 < 0 || f2 < 0) fail('PaymentBlock: границы addPayment не найдены.');

  const replacement =
`  async function addPayment() {
    setError('');

    const amountToSave = parseMoneyInput(amount) || 0;
    const paidAtToSave = paidAt;
    const methodToSave = method;
    const commentToSave = comment.trim() || undefined;
    const fileToUpload = file;

    if (fileToUpload) {
      // ${marker}
      startBackgroundUploadJob({
        dealId: deal.id,
        title: 'Загружаем подтверждение оплаты',
        successTitle: 'Оплата клиента сохранена',
        subtitle: deal.clientName,
        files: [fileToUpload],

        run: async ({ upload, setProgress }) => {
          const uploaded = await upload(
            deal.id,
            fileToUpload,
            'CLIENT_PAYMENT',
            0,
            1,
          );

          setProgress(94);

          await addClientPayment(deal.id, {
            amount: amountToSave,
            paidAt: paidAtToSave,
            method: methodToSave,
            comment: commentToSave,
            actorId: user.id,
            fileId: uploaded.id,
          });

          setProgress(99);
          await onChanged();
        },
      });

      setAmount('');
      setComment('');
      setFile(null);
      setAdding(false);
      return;
    }

    setSaving(true);
    try {
      await addClientPayment(deal.id, {
        amount: amountToSave,
        paidAt: paidAtToSave,
        method: methodToSave,
        comment: commentToSave,
        actorId: user.id,
      });

      setAmount('');
      setComment('');
      setFile(null);
      setAdding(false);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }
`;

  pay = pay.slice(0, f1) + replacement + pay.slice(f2);
  app = app.slice(0, payStart) + pay + app.slice(payEnd);
}

/* CSS */
styles = styles.replace(/\s*$/, '') +
`

/* ${marker} */
.dealGeneralUploadProgress {
  display: grid;
  gap: 7px;
  width: 100%;
  margin: 0 0 12px;
  padding: 11px 13px;
  border: 1px solid rgba(124, 154, 184, .24);
  border-radius: 10px;
  background: rgba(124, 154, 184, .07);
}

.dealGeneralUploadTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dealGeneralUploadTop strong {
  min-width: 0;
  font-size: 13px;
  line-height: 1.35;
}

.dealGeneralUploadTop b {
  flex: 0 0 auto;
  font-size: 12px;
  color: #9db5cc;
}

.dealGeneralUploadBar {
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .08);
}

.dealGeneralUploadBar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #84a8c8;
  transition: width .18s ease;
}

.dealGeneralUploadMeta {
  color: var(--bo-muted, #9ca8b4);
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.dealGeneralUploadProgress.dealUpload-success .dealGeneralUploadBar > span {
  background: #78a987;
}

.dealGeneralUploadProgress.dealUpload-error .dealGeneralUploadBar > span {
  background: #d87e70;
}
/* END_${marker} */
`;

/* Checks */
const appPayStart = app.indexOf('function PaymentBlock(');
const appPayEnd0 = app.indexOf('\nfunction ', appPayStart + 20);
const appPayEnd = appPayEnd0 > appPayStart ? appPayEnd0 : app.length;
const livePay = app.slice(appPayStart, appPayEnd);

const purchaseCount = (purchases.match(/startBackgroundUploadJob\(\{/g) || []).length;
const dealIdCount = (purchases.match(/dealId:\s*\n?\s*deal\.id,/g) || []).length;

const checks = [
  [uploads.includes('resolvedDealUploadId') || uploads.includes('inferredDealId'), 'upload job знает dealId'],
  [dealIdCount >= purchaseCount, 'все supplier uploads привязаны к dealId'],
  [app.includes('const dealUploadJob ='), 'общий dealUploadJob'],
  [app.includes('dealGeneralUploadProgress'), 'progress внутри сделки'],
  [app.includes('activeDeal.id') && app.includes("'Отправляем документы на корректировку'"), 'корректировка привязана к сделке'],
  [!livePay.includes(direct), 'оплата клиента без прямой загрузки'],
  [app.includes('dealUploadState') && app.includes('uploadJob.progress'), 'progress в списке сделок'],
  [styles.includes('.dealGeneralUploadProgress'), 'CSS'],
];

console.log('');
console.log('v064-O2.2 — документы существующей сделки');
console.log('=========================================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) fail('Проверка не пройдена: ' + label);
}

console.log('');
console.log('Правило: из сделки → progress внутри ЗК + на карточке ЗК в списке.');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const writes = [
  [p.app, A, app],
  [p.purchases, P, purchases],
  [p.uploads, U, uploads],
  [p.styles, S, styles],
];

for (const [file] of writes) {
  const backup = file + '.before-v064-o22-' + stamp;
  fs.copyFileSync(file, backup);
  console.log('Backup: ' + path.relative(root, backup));
}

for (const [file, src, text] of writes) save(file, src, text);

console.log('');
console.log('v064-O2.2 применён.');
