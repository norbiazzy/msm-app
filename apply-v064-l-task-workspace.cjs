const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const files = {
  app: path.join(root, 'frontend', 'src', 'App.tsx'),
  poa: path.join(root, 'frontend', 'src', 'PowerOfAttorneyBlock.tsx'),
  purchases: path.join(root, 'frontend', 'src', 'PurchasesBlock.tsx'),
  styles: path.join(root, 'frontend', 'src', 'styles.css'),
  context: path.join(root, 'frontend', 'src', 'TaskContextStrip.tsx'),
};

const componentContent = "/* PART_V064_L_TASK_CONTEXT_STRIP */\nimport type { Task } from './api';\nimport type { SellerType } from './types';\n\nconst sellerLabels: Record<SellerType, string> = {\n  ST: 'СТ',\n  MSM: 'МСМ',\n  IP: 'ИП',\n};\n\nfunction money(value?: string) {\n  if (!value) return '';\n\n  const parsed = Number(\n    String(value)\n      .replace(/\\s/g, '')\n      .replace(',', '.')\n  );\n\n  if (!Number.isFinite(parsed)) {\n    return String(value);\n  }\n\n  return new Intl.NumberFormat(\n    'ru-RU',\n    {\n      maximumFractionDigits: 2,\n    }\n  ).format(parsed);\n}\n\nexport function TaskContextStrip({\n  task,\n}: {\n  task: Task;\n}) {\n  const currentInvoice =\n    task.deal.invoices.find(\n      (invoice) => invoice.isCurrent\n    ) ?? task.deal.invoices[0];\n\n  const sellerType =\n    currentInvoice?.sellerType ||\n    task.deal.sellerType;\n\n  const sellerLabel =\n    sellerLabels[sellerType] ||\n    sellerType;\n\n  return (\n    <div className=\"taskContextStrip\">\n      <a\n        className=\"taskContextDeal\"\n        href={\n          '#deal/' +\n          encodeURIComponent(\n            task.deal.id\n          )\n        }\n      >\n        <span>Сделка</span>\n\n        <strong>\n          ЗК-{task.deal.internalNumber}\n        </strong>\n\n        <em>\n          {task.deal.clientName}\n        </em>\n      </a>\n\n      <div className=\"taskContextFacts\">\n        <span className=\"taskContextSeller\">\n          {sellerLabel}\n        </span>\n\n        {currentInvoice?.number && (\n          <span>\n            Счёт №{currentInvoice.number}\n          </span>\n        )}\n\n        {currentInvoice?.amount && (\n          <span>\n            {money(currentInvoice.amount)} ₽\n          </span>\n        )}\n      </div>\n\n      <a\n        className=\"taskContextOpen\"\n        href={\n          '#deal/' +\n          encodeURIComponent(\n            task.deal.id\n          )\n        }\n      >\n        Открыть сделку →\n      </a>\n    </div>\n  );\n}\n\n/* END_PART_V064_L_TASK_CONTEXT_STRIP */\n";
const cssContent = "/* PART_V064_L_TASK_WORKSPACE */\n\n/* ===== One visual language for every opened task ===== */\n.boView-tasks section.content.form.taskWorkspace {\n  display: flex;\n  flex-direction: column;\n  width: min(100%, 980px);\n  margin: 0 auto;\n  gap: 0;\n}\n\n/* Old patches occasionally inserted task content before the header.\n   Flex ordering fixes the visual order without moving business logic. */\n.boView-tasks section.taskWorkspace > * {\n  order: 10;\n}\n\n.boView-tasks section.taskWorkspace > .backLink {\n  order: 0;\n}\n\n.boView-tasks section.taskWorkspace > .detailHero {\n  order: 1;\n}\n\n.boView-tasks section.taskWorkspace > .taskContextStrip {\n  order: 2;\n}\n\n.boView-tasks section.taskWorkspace > .managerResubmitPanel {\n  order: 3;\n}\n\n.boView-tasks section.taskWorkspace > .backLink {\n  align-self: flex-start;\n  min-height: 34px;\n  margin: 0 0 8px;\n  border: 0;\n  background: transparent;\n  color: var(--bo-muted);\n  font-size: 12px;\n  font-weight: 850;\n  padding: 4px 2px;\n}\n\n.boView-tasks section.taskWorkspace > .backLink:hover {\n  color: var(--bo-accent);\n}\n\n.boView-tasks section.taskWorkspace > .detailHero {\n  position: relative;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  grid-template-rows: auto auto auto;\n  gap: 4px 12px;\n  overflow: hidden;\n  margin: 0;\n  border: 1px solid var(--bo-line);\n  border-radius: 10px 10px 0 0;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: var(--bo-shadow);\n  padding: 16px 16px 14px 18px;\n}\n\n.boView-tasks section.taskWorkspace > .detailHero::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 4px;\n  background: var(--bo-blue);\n}\n\n.boView-tasks section.taskWorkspace[data-task-status='NEW'] > .detailHero::before {\n  background: var(--bo-gold);\n}\n\n.boView-tasks section.taskWorkspace[data-task-status='NEED_DATA'] > .detailHero::before {\n  background: var(--bo-red);\n}\n\n.boView-tasks section.taskWorkspace[data-task-status='DONE'] > .detailHero::before {\n  background: var(--bo-green);\n}\n\n.boView-tasks section.taskWorkspace > .detailHero .eyebrow {\n  grid-column: 1;\n  grid-row: 1;\n  margin: 0;\n  color: var(--bo-accent);\n  font-size: 14px;\n  font-weight: 950;\n  line-height: 1.2;\n  letter-spacing: .01em;\n}\n\n.boView-tasks section.taskWorkspace > .detailHero h2 {\n  grid-column: 1;\n  grid-row: 2;\n  margin: 1px 0 0;\n  color: var(--bo-text);\n  font-size: clamp(20px, 3vw, 26px);\n  font-weight: 950;\n  line-height: 1.14;\n  letter-spacing: -.02em;\n}\n\n.boView-tasks section.taskWorkspace > .detailHero p {\n  grid-column: 1;\n  grid-row: 3;\n  margin: 2px 0 0;\n  color: var(--bo-muted);\n  font-size: 13px;\n  line-height: 1.35;\n}\n\n.boView-tasks section.taskWorkspace > .detailHero .statusPill {\n  grid-column: 2;\n  grid-row: 1;\n  align-self: start;\n  justify-self: end;\n  min-height: 30px;\n  margin: 0;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-blue);\n  font-size: 11px;\n  font-weight: 950;\n  padding: 6px 9px;\n  white-space: nowrap;\n}\n\n.boView-tasks section.taskWorkspace[data-task-status='NEW'] > .detailHero .statusPill {\n  color: var(--bo-gold);\n}\n\n.boView-tasks section.taskWorkspace[data-task-status='NEED_DATA'] > .detailHero .statusPill {\n  color: var(--bo-red);\n}\n\n.boView-tasks section.taskWorkspace[data-task-status='DONE'] > .detailHero .statusPill {\n  color: var(--bo-green);\n}\n\n.boView-tasks section.taskWorkspace > .detailHero .urgent {\n  grid-column: 2;\n  grid-row: 2 / span 2;\n  align-self: start;\n  justify-self: end;\n  margin: 2px 0 0;\n  border: 1px solid color-mix(in srgb, var(--bo-red) 35%, var(--bo-line));\n  border-radius: 5px;\n  background: color-mix(in srgb, var(--bo-red) 10%, transparent);\n  color: var(--bo-red);\n  font-size: 10px;\n  font-weight: 950;\n  padding: 5px 7px;\n  white-space: nowrap;\n}\n\n/* Deal / seller / invoice context directly under the task title */\n.boView-tasks .taskContextStrip {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 8px 12px;\n  align-items: center;\n  margin: 0 0 12px;\n  border: 1px solid var(--bo-line);\n  border-top: 0;\n  border-radius: 0 0 10px 10px;\n  background: var(--bo-panel-2);\n  padding: 10px 12px 11px 16px;\n}\n\n.boView-tasks .taskContextDeal {\n  display: grid;\n  grid-template-columns: auto auto minmax(0, 1fr);\n  gap: 6px;\n  align-items: baseline;\n  min-width: 0;\n  color: var(--bo-text);\n  text-decoration: none;\n}\n\n.boView-tasks .taskContextDeal > span {\n  color: var(--bo-muted);\n  font-size: 10px;\n  font-weight: 750;\n}\n\n.boView-tasks .taskContextDeal strong {\n  color: var(--bo-text);\n  font-size: 14px;\n  font-weight: 950;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskContextDeal em {\n  min-width: 0;\n  overflow: hidden;\n  color: var(--bo-muted);\n  font-size: 12px;\n  font-style: normal;\n  font-weight: 750;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskContextFacts {\n  grid-column: 1;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 5px;\n}\n\n.boView-tasks .taskContextFacts span {\n  display: inline-flex;\n  align-items: center;\n  min-height: 24px;\n  border: 1px solid var(--bo-line);\n  border-radius: 999px;\n  background: var(--bo-panel);\n  color: var(--bo-muted);\n  font-size: 10px;\n  font-weight: 800;\n  padding: 4px 8px;\n}\n\n.boView-tasks .taskContextFacts .taskContextSeller {\n  color: var(--bo-text);\n  font-weight: 950;\n}\n\n.boView-tasks .taskContextOpen {\n  grid-column: 2;\n  grid-row: 1 / span 2;\n  align-self: center;\n  color: var(--bo-accent);\n  font-size: 11px;\n  font-weight: 900;\n  text-decoration: none;\n  white-space: nowrap;\n}\n\n/* The older deal-link block becomes redundant. */\n.boView-tasks section.taskWorkspace > .taskDetailDealLink {\n  display: none !important;\n}\n\n/* Returned task correction block goes immediately after context. */\n.boView-tasks section.taskWorkspace > .managerResubmitPanel {\n  margin: 0 0 12px;\n  border: 1px solid color-mix(in srgb, var(--bo-red) 22%, var(--bo-line));\n  border-left: 4px solid var(--bo-red);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  box-shadow: none;\n  padding: 13px;\n}\n\n.boView-tasks section.taskWorkspace > .managerResubmitPanel .managerResubmitHead {\n  display: grid;\n  gap: 3px;\n  margin-bottom: 10px;\n}\n\n.boView-tasks section.taskWorkspace > .managerResubmitPanel .managerResubmitHead strong {\n  color: var(--bo-red);\n  font-size: 14px;\n  font-weight: 950;\n}\n\n.boView-tasks section.taskWorkspace > .managerResubmitPanel .managerResubmitHead span {\n  color: var(--bo-muted);\n  font-size: 11px;\n  line-height: 1.4;\n}\n\n/* Semantic blocks: small radii, no giant floating cards. */\n.boView-tasks section.taskWorkspace > .infoBox,\n.boView-tasks section.taskWorkspace > .powerTaskGrid,\n.boView-tasks section.taskWorkspace > .balanceCorrectionTaskSummary,\n.boView-tasks section.taskWorkspace > .invoiceTaskBrief {\n  margin: 0 0 10px;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: none;\n}\n\n.boView-tasks section.taskWorkspace > .infoBox {\n  padding: 12px 13px;\n}\n\n.boView-tasks section.taskWorkspace > .infoBox > strong {\n  display: block;\n  margin-bottom: 4px;\n  color: var(--bo-text);\n  font-size: 12px;\n  font-weight: 900;\n}\n\n.boView-tasks section.taskWorkspace > .infoBox p {\n  margin: 0;\n  color: var(--bo-muted);\n  font-size: 12px;\n  line-height: 1.45;\n}\n\n.boView-tasks section.taskWorkspace > .powerTaskGrid,\n.boView-tasks section.taskWorkspace > .balanceCorrectionTaskSummary,\n.boView-tasks section.taskWorkspace > .invoiceTaskBrief {\n  padding: 11px 12px;\n}\n\n.boView-tasks section.taskWorkspace > .powerTaskGrid {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 10px;\n}\n\n.boView-tasks section.taskWorkspace > .powerTaskGrid span,\n.boView-tasks section.taskWorkspace > .balanceCorrectionTaskSummary span,\n.boView-tasks section.taskWorkspace > .invoiceTaskBrief span {\n  color: var(--bo-muted);\n  font-size: 10px;\n}\n\n.boView-tasks section.taskWorkspace > .powerTaskGrid b,\n.boView-tasks section.taskWorkspace > .balanceCorrectionTaskSummary b,\n.boView-tasks section.taskWorkspace > .invoiceTaskBrief b {\n  color: var(--bo-text);\n  font-size: 12px;\n  font-weight: 900;\n}\n\n.boView-tasks section.taskWorkspace .field {\n  margin-bottom: 9px;\n}\n\n.boView-tasks section.taskWorkspace .field > span {\n  margin-bottom: 5px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 750;\n}\n\n.boView-tasks section.taskWorkspace input,\n.boView-tasks section.taskWorkspace select,\n.boView-tasks section.taskWorkspace textarea {\n  border-radius: 7px;\n}\n\n.boView-tasks section.taskWorkspace .primary,\n.boView-tasks section.taskWorkspace .secondary {\n  border-radius: 7px;\n}\n\n@media (max-width: 720px) {\n  .boView-tasks section.taskWorkspace > .detailHero {\n    grid-template-columns: minmax(0, 1fr) auto;\n    padding: 14px 11px 12px 15px;\n  }\n\n  .boView-tasks section.taskWorkspace > .detailHero h2 {\n    font-size: 19px;\n  }\n\n  .boView-tasks section.taskWorkspace > .detailHero .statusPill {\n    font-size: 10px;\n    padding: 5px 7px;\n  }\n\n  .boView-tasks .taskContextStrip {\n    grid-template-columns: minmax(0, 1fr);\n    padding: 10px 10px 11px 14px;\n  }\n\n  .boView-tasks .taskContextDeal {\n    grid-template-columns: auto auto minmax(0, 1fr);\n  }\n\n  .boView-tasks .taskContextFacts {\n    grid-column: 1;\n  }\n\n  .boView-tasks .taskContextOpen {\n    grid-column: 1;\n    grid-row: auto;\n    justify-self: start;\n    margin-top: 2px;\n  }\n\n  .boView-tasks section.taskWorkspace > .powerTaskGrid {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* END_PART_V064_L_TASK_WORKSPACE */\n";

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

function writeWithBackup(file, source, next, tag) {
  if (source.text === next) {
    return false;
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  fs.copyFileSync(
    file,
    file + '.before-' + tag + '-' + stamp
  );

  const output =
    source.crlf
      ? next.replace(/\n/g, '\r\n')
      : next;

  fs.writeFileSync(file, output, 'utf8');
  return true;
}

function addImport(text) {
  if (text.includes("from './TaskContextStrip'")) {
    return text;
  }

  const firstImport = text.indexOf('import ');

  if (firstImport < 0) {
    fail('Не найден import в TSX файле.');
  }

  return (
    text.slice(0, firstImport) +
    "import { TaskContextStrip } from './TaskContextStrip';\n" +
    text.slice(firstImport)
  );
}

function functionRange(text, signature) {
  const start = text.indexOf(signature);

  if (start < 0) {
    return null;
  }

  const nextCandidates = [
    text.indexOf('\nfunction ', start + signature.length),
    text.indexOf('\nexport function ', start + signature.length),
  ].filter((value) => value >= 0);

  const end = nextCandidates.length
    ? Math.min(...nextCandidates)
    : text.length;

  return { start, end };
}

function balancedDivEnd(text, startAt) {
  const open = text.indexOf(
    '<div className="detailHero">',
    startAt
  );

  if (open < 0) return -1;

  const token = /<div\b[^>]*>|<\/div>/g;
  token.lastIndex = open;

  let depth = 0;
  let match;

  while ((match = token.exec(text)) !== null) {
    if (match[0].startsWith('</div')) {
      depth--;

      if (depth === 0) {
        return token.lastIndex;
      }
    } else {
      depth++;
    }
  }

  return -1;
}

function patchTaskFunction(text, signature, marker) {
  if (text.includes(marker)) {
    return text;
  }

  const range = functionRange(text, signature);

  if (!range) {
    console.log('WARN не найдена функция: ' + signature);
    return text;
  }

  const sectionOpen =
    text.indexOf(
      '<section className="content form">',
      range.start
    );

  if (
    sectionOpen < 0 ||
    sectionOpen > range.end
  ) {
    fail(
      'В ' + signature +
      ' не найден section content form.'
    );
  }

  text =
    text.slice(0, sectionOpen) +
    '<section\n      className="content form taskWorkspace"\n      data-task-status={status}\n    >' +
    text.slice(
      sectionOpen +
      '<section className="content form">'.length
    );

  const refreshedRange = functionRange(text, signature);
  const heroEnd = balancedDivEnd(
    text,
    refreshedRange.start
  );

  if (
    heroEnd < 0 ||
    heroEnd > refreshedRange.end
  ) {
    fail(
      'В ' + signature +
      ' не удалось найти конец detailHero.'
    );
  }

  const insert = `\n\n      {/* ${marker} */}\n      <TaskContextStrip task={task} />`;

  return (
    text.slice(0, heroEnd) +
    insert +
    text.slice(heroEnd)
  );
}

const appSource = read(files.app);
const poaSource = read(files.poa);
const purchasesSource = read(files.purchases);
const stylesSource = read(files.styles);

let app = addImport(appSource.text);
let poa = addImport(poaSource.text);
let purchases = addImport(purchasesSource.text);
let styles = stylesSource.text;

app = patchTaskFunction(
  app,
  'function TaskDetail(',
  'PART_V064_L_GENERIC_TASK_CONTEXT'
);

poa = patchTaskFunction(
  poa,
  'export function PowerOfAttorneyTask(',
  'PART_V064_L_POA_TASK_CONTEXT'
);

purchases = patchTaskFunction(
  purchases,
  'export function SupplierBalanceCorrectionTask(',
  'PART_V064_L_BALANCE_TASK_CONTEXT'
);

purchases = patchTaskFunction(
  purchases,
  'export function SupplierPaymentTask(',
  'PART_V064_L_SUPPLIER_PAYMENT_CONTEXT'
);

if (!styles.includes('PART_V064_L_TASK_WORKSPACE')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const contextExists = fs.existsSync(files.context);

if (contextExists) {
  const current = fs.readFileSync(
    files.context,
    'utf8'
  );

  if (!current.includes('PART_V064_L_TASK_CONTEXT_STRIP')) {
    fail(
      'TaskContextStrip.tsx уже существует, ' +
      'но это не файл v064-L. Ничего не перезаписываю.'
    );
  }
}

const checks = [
  [
    app.includes('PART_V064_L_GENERIC_TASK_CONTEXT'),
    'generic TaskDetail'
  ],
  [
    poa.includes('PART_V064_L_POA_TASK_CONTEXT'),
    'доверенность'
  ],
  [
    purchases.includes('PART_V064_L_BALANCE_TASK_CONTEXT'),
    'корректировка остатка'
  ],
  [
    purchases.includes('PART_V064_L_SUPPLIER_PAYMENT_CONTEXT'),
    'оплата поставщику'
  ],
  [
    app.includes('data-task-status={status}'),
    'status-aware workspace'
  ],
  [
    styles.includes('PART_V064_L_TASK_WORKSPACE'),
    'workspace CSS'
  ],
];

console.log('');
console.log('v064-L — Task Workspace');
console.log('======================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);

  if (!ok) {
    fail('Проверка не пройдена: ' + label);
  }
}

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

let changed = 0;

if (!contextExists) {
  fs.writeFileSync(
    files.context,
    componentContent,
    'utf8'
  );
  changed++;
}

if (
  writeWithBackup(
    files.app,
    appSource,
    app,
    'v064-l'
  )
) changed++;

if (
  writeWithBackup(
    files.poa,
    poaSource,
    poa,
    'v064-l'
  )
) changed++;

if (
  writeWithBackup(
    files.purchases,
    purchasesSource,
    purchases,
    'v064-l'
  )
) changed++;

if (
  writeWithBackup(
    files.styles,
    stylesSource,
    styles,
    'v064-l'
  )
) changed++;

console.log('');
console.log(
  'v064-L применён. Изменено файлов: ' + changed
);
