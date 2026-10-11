const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');
const purchasesFile = path.join(root, 'frontend', 'src', 'PurchasesBlock.tsx');

const cssContent = "/* PART_V064_F_MOBILE_AND_SUPPLIER_PAYMENT_FIX */\n\n/* Supplier payment options: fix the oversized / split checkbox cards */\n.boShell label[data-bo-payment-choice] {\n  box-sizing: border-box;\n  display: inline-grid !important;\n  grid-template-columns: 28px minmax(0, 1fr) !important;\n  align-items: center !important;\n  gap: 13px !important;\n  width: calc(50% - 7px) !important;\n  min-height: 82px !important;\n  vertical-align: top !important;\n  margin: 6px 10px 6px 0 !important;\n  border: 1px solid var(--bo-line) !important;\n  border-radius: 8px !important;\n  background: var(--bo-panel) !important;\n  color: var(--bo-text) !important;\n  padding: 14px 16px !important;\n  cursor: pointer !important;\n  box-shadow: none !important;\n}\n\n.boShell label[data-bo-payment-choice]:nth-of-type(even) {\n  margin-right: 0 !important;\n}\n\n.boShell label[data-bo-payment-choice] input[type=\"checkbox\"] {\n  appearance: none;\n  -webkit-appearance: none;\n  width: 21px !important;\n  height: 21px !important;\n  min-width: 21px !important;\n  min-height: 21px !important;\n  margin: 0 !important;\n  border: 2px solid var(--bo-stone) !important;\n  border-radius: 4px !important;\n  background: var(--bo-panel-2) !important;\n  display: grid;\n  place-items: center;\n  cursor: pointer;\n}\n\n.boShell label[data-bo-payment-choice] input[type=\"checkbox\"]::after {\n  content: '';\n  width: 9px;\n  height: 5px;\n  border-left: 2px solid #fff;\n  border-bottom: 2px solid #fff;\n  transform: rotate(-45deg) scale(0);\n  transition: transform .12s ease;\n}\n\n.boShell label[data-bo-payment-choice] input[type=\"checkbox\"]:checked {\n  border-color: var(--bo-green) !important;\n  background: var(--bo-green) !important;\n}\n\n.boShell label[data-bo-payment-choice] input[type=\"checkbox\"]:checked::after {\n  transform: rotate(-45deg) scale(1);\n}\n\n.boShell label[data-bo-payment-choice]:has(input:checked) {\n  border-color: color-mix(in srgb, var(--bo-green) 60%, var(--bo-line)) !important;\n  background: color-mix(in srgb, var(--bo-green) 9%, var(--bo-panel)) !important;\n}\n\n.boShell label[data-bo-payment-choice] > div,\n.boShell label[data-bo-payment-choice] > span:not(:first-child) {\n  min-width: 0;\n  text-align: left !important;\n}\n\n.boShell label[data-bo-payment-choice] strong,\n.boShell label[data-bo-payment-choice] b {\n  display: block;\n  margin: 0 0 4px !important;\n  color: var(--bo-text) !important;\n  font-size: 15px !important;\n  font-weight: 850 !important;\n  line-height: 1.25 !important;\n}\n\n.boShell label[data-bo-payment-choice] p,\n.boShell label[data-bo-payment-choice] small,\n.boShell label[data-bo-payment-choice] em {\n  display: block;\n  margin: 0 !important;\n  color: var(--bo-muted) !important;\n  font-size: 12px !important;\n  font-style: normal !important;\n  line-height: 1.4 !important;\n}\n\n.boShell label[data-bo-payment-choice=\"balance\"]:has(input:checked) strong,\n.boShell label[data-bo-payment-choice=\"balance\"]:has(input:checked) b {\n  color: var(--bo-green) !important;\n}\n\n/* Submit payment button gets visual breathing room */\n.boView-tasks button.primary.wide,\n.boView-deal button.primary.wide {\n  border-radius: 7px;\n}\n\n/* ==============================\n   FINAL MOBILE PASS\n   ============================== */\n\n@media (max-width: 720px) {\n  html,\n  body,\n  #root {\n    max-width: 100%;\n    overflow-x: hidden;\n  }\n\n  body {\n    padding-bottom: 82px;\n  }\n\n  .boShell {\n    width: 100%;\n    max-width: 100%;\n    padding-left: 10px !important;\n    padding-right: 10px !important;\n  }\n\n  .boShell .topbar {\n    display: grid !important;\n    grid-template-columns: minmax(0, 1fr) auto !important;\n    align-items: center !important;\n    gap: 8px !important;\n    width: 100%;\n    padding: 10px !important;\n  }\n\n  .boShell .topbar h1 {\n    font-size: 18px !important;\n    line-height: 1.2;\n  }\n\n  .boShell .topbarActions {\n    min-width: 0;\n    justify-content: flex-end;\n  }\n\n  .boShell .topbarActions button {\n    min-height: 42px;\n  }\n\n  .boShell .userBadge {\n    display: none !important;\n  }\n\n  .boShell .content,\n  .boShell .content.form,\n  .boView-deal .content,\n  .boView-tasks .content,\n  .boView-new .content.form {\n    width: 100% !important;\n    max-width: 100% !important;\n    min-width: 0 !important;\n    margin-left: 0 !important;\n    margin-right: 0 !important;\n  }\n\n  .boShell input,\n  .boShell textarea,\n  .boShell select {\n    max-width: 100%;\n    font-size: 16px !important;\n  }\n\n  .boShell button,\n  .boShell a[role=\"button\"],\n  .boShell .primary,\n  .boShell .secondary,\n  .boShell .ghost {\n    touch-action: manipulation;\n  }\n\n  .boShell button:not(.boMobileEmpty),\n  .boShell .primary,\n  .boShell .secondary {\n    min-height: 44px;\n  }\n\n  /* payment choices stack cleanly */\n  .boShell label[data-bo-payment-choice] {\n    display: grid !important;\n    width: 100% !important;\n    min-height: 76px !important;\n    margin: 6px 0 !important;\n    grid-template-columns: 26px minmax(0, 1fr) !important;\n    padding: 12px 13px !important;\n  }\n\n  /* deal */\n  .boView-deal .detailHero,\n  .boView-tasks .detailHero {\n    width: 100%;\n    padding: 13px !important;\n  }\n\n  .boView-deal .detailHero h2,\n  .boView-deal .detailHero h3,\n  .boView-tasks .detailHero h2 {\n    font-size: 21px !important;\n  }\n\n  .boView-deal .panel,\n  .boView-deal .infoBox,\n  .boView-tasks .panel,\n  .boView-tasks .infoBox {\n    width: 100%;\n    min-width: 0;\n  }\n\n  .boView-deal .inline,\n  .boView-tasks .inline,\n  .boView-new .inline,\n  .boShell [class*=\"Grid\"],\n  .boShell [class*=\"grid\"] {\n    grid-template-columns: 1fr !important;\n  }\n\n  /* long invoice/document names */\n  .boShell a,\n  .boShell strong,\n  .boShell b,\n  .boShell p,\n  .boShell span {\n    overflow-wrap: anywhere;\n  }\n\n  /* upload controls */\n  .boShell .field:has(input[type=\"file\"]) > button[type=\"button\"]:not(.primary),\n  .boShell .field:has(input[type=\"file\"]) > label:not(.urgentToggle),\n  .boShell .field:has(input[type=\"file\"]) > div > button[type=\"button\"]:first-child:not(.primary),\n  .boShell [class*=\"singleFile\"] > button[type=\"button\"],\n  .boShell [class*=\"multiFile\"] > button[type=\"button\"],\n  .boShell [class*=\"filePicker\"] > button[type=\"button\"],\n  .boShell [class*=\"FilePicker\"] > button[type=\"button\"] {\n    width: 100% !important;\n    min-height: 50px !important;\n    padding: 10px 12px !important;\n    font-size: 14px !important;\n  }\n\n  /* lists / rows */\n  .boShell .versionRow,\n  .boShell .paymentRow,\n  .boShell [class*=\"supplierRow\"],\n  .boShell [class*=\"purchaseRow\"] {\n    min-width: 0;\n  }\n\n  /* task cards */\n  .boView-tasks .taskCard {\n    width: 100%;\n    min-width: 0;\n  }\n\n  .boView-tasks .taskCardTop,\n  .boView-tasks .taskCardHead,\n  .boView-tasks .taskCardHeader {\n    gap: 7px !important;\n  }\n\n  .boView-tasks .taskCardUploadTop {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n\n  /* return / resubmit */\n  .boShell .managerResubmitPanel,\n  .boView-tasks [class*=\"returnToManager\"],\n  .boView-tasks [class*=\"ReturnToManager\"],\n  .boView-tasks .returnPanel,\n  .boView-tasks .taskReturnPanel {\n    width: 100%;\n    min-width: 0;\n  }\n\n  /* bottom nav: fixed 5 equal zones */\n  .boMobileNav {\n    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;\n  }\n\n  .boMobileNav > * {\n    min-width: 0 !important;\n  }\n\n  .boMobileNav span {\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n}\n\n/* very narrow phones */\n@media (max-width: 390px) {\n  .boShell {\n    padding-left: 7px !important;\n    padding-right: 7px !important;\n  }\n\n  .boShell .topbar {\n    padding: 8px !important;\n  }\n\n  .boShell .topbar h1 {\n    font-size: 17px !important;\n  }\n\n  .boView-deal .detailHero,\n  .boView-tasks .detailHero,\n  .boView-new .content.form {\n    padding: 11px !important;\n  }\n\n  .boMobileNav a,\n  .boMobileNav button {\n    font-size: 10px !important;\n  }\n}\n\n/* END_PART_V064_F_MOBILE_AND_SUPPLIER_PAYMENT_FIX */";

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

function markChoice(source, phraseRegex, value) {
  if (
    source.includes(
      'data-bo-payment-choice="' + value + '"'
    )
  ) {
    return {
      text: source,
      found: true,
      changed: false,
    };
  }

  const labelRegex = /<label\b[^>]*>[\s\S]*?<\/label>/g;
  const blocks = [...source.matchAll(labelRegex)];

  const target = blocks.find(
    (match) => phraseRegex.test(match[0])
  );

  if (!target) {
    return {
      text: source,
      found: false,
      changed: false,
    };
  }

  const block = target[0];
  const marked = block.replace(
    /<label\b/,
    '<label data-bo-payment-choice="' + value + '"'
  );

  return {
    text:
      source.slice(0, target.index) +
      marked +
      source.slice(target.index + block.length),
    found: true,
    changed: true,
  };
}

const stylesSource = read(stylesFile);
const purchasesSource = read(purchasesFile);

let purchases = purchasesSource.text;
let styles = stylesSource.text;

const balanceResult =
  markChoice(
    purchases,
    /Оплата\s+с\s+остатка/i,
    'balance'
  );

if (!balanceResult.found) {
  fail(
    'Не найден checkbox-блок «Оплата с остатка» ' +
    'в PurchasesBlock.tsx. Ничего не изменено.'
  );
}

purchases = balanceResult.text;

const stampedResult =
  markChoice(
    purchases,
    /Плат[её]жка\s+с\s+печатью/i,
    'stamped'
  );

if (!stampedResult.found) {
  fail(
    'Не найден checkbox-блок «Платёжка с печатью» ' +
    'в PurchasesBlock.tsx. Ничего не изменено.'
  );
}

purchases = stampedResult.text;

if (!styles.includes('PART_V064_F_MOBILE_AND_SUPPLIER_PAYMENT_FIX')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    purchases.includes('data-bo-payment-choice="balance"'),
    'Оплата с остатка размечена'
  ],
  [
    purchases.includes('data-bo-payment-choice="stamped"'),
    'Платёжка с печатью размечена'
  ],
  [
    styles.includes('PART_V064_F_MOBILE_AND_SUPPLIER_PAYMENT_FIX'),
    'CSS v064-F добавлен'
  ],
  [
    styles.includes('label[data-bo-payment-choice]'),
    'новый блок оплаты стилизован'
  ],
  [
    styles.includes('@media (max-width: 390px)'),
    'узкие мобильные экраны учтены'
  ],
  [
    styles.includes('.boMobileNav'),
    'нижняя mobile-навигация учтена'
  ],
];

console.log('');
console.log('v064-F — Mobile + Supplier Payment Fix');
console.log('=====================================');

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

if (
  writeWithBackup(
    purchasesFile,
    purchasesSource,
    purchases,
    'v064-f'
  )
) {
  changed++;
}

if (
  writeWithBackup(
    stylesFile,
    stylesSource,
    styles,
    'v064-f'
  )
) {
  changed++;
}

console.log('');
console.log(
  'v064-F применён. Изменено файлов: ' + changed
);
