const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appFile = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');
const cssContent = "/* PART_V064_D_BLOCK_OFFICE_MANAGER_FORMS */\n\n/* New deal / invoice request */\n.boView-new .content.form {\n  max-width: 920px;\n  margin: 0 auto;\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: var(--bo-panel);\n  box-shadow: var(--bo-shadow);\n  padding: 18px;\n}\n\n.boView-new .content.form > h2,\n.boView-new .content.form > h3 {\n  margin: 0 0 14px;\n  color: var(--bo-text);\n  font-size: clamp(20px, 2.2vw, 27px);\n  letter-spacing: -.02em;\n}\n\n.boView-new .field,\n.boView-deal .powerForm .field,\n.boView-deal [class*=\"purchaseForm\"] .field,\n.boView-deal [class*=\"supplierForm\"] .field {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin-bottom: 11px;\n}\n\n.boView-new .field > span,\n.boView-deal .powerForm .field > span,\n.boView-deal [class*=\"purchaseForm\"] .field > span,\n.boView-deal [class*=\"supplierForm\"] .field > span {\n  color: var(--bo-muted);\n  font-size: 12px;\n  font-weight: 800;\n}\n\n.boView-new input,\n.boView-new textarea,\n.boView-new select,\n.boView-deal .powerForm input,\n.boView-deal .powerForm textarea,\n.boView-deal .powerForm select,\n.boView-deal [class*=\"purchaseForm\"] input,\n.boView-deal [class*=\"purchaseForm\"] textarea,\n.boView-deal [class*=\"purchaseForm\"] select,\n.boView-deal [class*=\"supplierForm\"] input,\n.boView-deal [class*=\"supplierForm\"] textarea,\n.boView-deal [class*=\"supplierForm\"] select {\n  width: 100%;\n  min-height: 44px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 9px 10px;\n  outline: none;\n}\n\n.boView-new textarea,\n.boView-deal .powerForm textarea,\n.boView-deal [class*=\"purchaseForm\"] textarea,\n.boView-deal [class*=\"supplierForm\"] textarea {\n  min-height: 92px;\n  resize: vertical;\n}\n\n.boView-new input:focus,\n.boView-new textarea:focus,\n.boView-new select:focus,\n.boView-deal .powerForm input:focus,\n.boView-deal .powerForm textarea:focus,\n.boView-deal .powerForm select:focus,\n.boView-deal [class*=\"purchaseForm\"] input:focus,\n.boView-deal [class*=\"purchaseForm\"] textarea:focus,\n.boView-deal [class*=\"purchaseForm\"] select:focus,\n.boView-deal [class*=\"supplierForm\"] input:focus,\n.boView-deal [class*=\"supplierForm\"] textarea:focus,\n.boView-deal [class*=\"supplierForm\"] select:focus {\n  border-color: var(--bo-accent);\n  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bo-accent) 14%, transparent);\n}\n\n.boView-new .inline,\n.boView-deal .powerForm .inline,\n.boView-deal [class*=\"purchaseForm\"] .inline,\n.boView-deal [class*=\"supplierForm\"] .inline {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 10px;\n}\n\n.boView-new .segmented,\n.boView-deal .powerForm .segmented,\n.boView-deal [class*=\"purchaseForm\"] .segmented,\n.boView-deal [class*=\"supplierForm\"] .segmented {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  width: 100%;\n  padding: 4px;\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel-2);\n}\n\n.boView-new .segmented button,\n.boView-deal .powerForm .segmented button,\n.boView-deal [class*=\"purchaseForm\"] .segmented button,\n.boView-deal [class*=\"supplierForm\"] .segmented button {\n  flex: 1 1 auto;\n  min-height: 38px;\n  border: 1px solid transparent;\n  border-radius: 5px;\n  background: transparent;\n  color: var(--bo-muted);\n  font-weight: 800;\n  cursor: pointer;\n}\n\n.boView-new .segmented button.active,\n.boView-new .segmented button[aria-pressed=\"true\"],\n.boView-deal .powerForm .segmented button.active,\n.boView-deal .powerForm .segmented button[aria-pressed=\"true\"],\n.boView-deal [class*=\"purchaseForm\"] .segmented button.active,\n.boView-deal [class*=\"purchaseForm\"] .segmented button[aria-pressed=\"true\"],\n.boView-deal [class*=\"supplierForm\"] .segmented button.active,\n.boView-deal [class*=\"supplierForm\"] .segmented button[aria-pressed=\"true\"] {\n  border-color: var(--bo-line);\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: var(--bo-shadow);\n}\n\n.boView-new .urgentToggle,\n.boView-deal .powerForm .urgentToggle,\n.boView-deal [class*=\"purchaseForm\"] .urgentToggle,\n.boView-deal [class*=\"supplierForm\"] .urgentToggle {\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  width: max-content;\n  min-height: 42px;\n  margin: 7px 0 11px;\n  border: 1px solid color-mix(in srgb, var(--bo-lava) 35%, var(--bo-line));\n  border-radius: 6px;\n  background: color-mix(in srgb, var(--bo-lava) 7%, var(--bo-panel));\n  color: var(--bo-text);\n  padding: 7px 10px;\n  font-weight: 800;\n}\n\n.boView-new .urgentToggle input,\n.boView-deal .powerForm .urgentToggle input,\n.boView-deal [class*=\"purchaseForm\"] .urgentToggle input,\n.boView-deal [class*=\"supplierForm\"] .urgentToggle input {\n  width: auto;\n  min-height: auto;\n  accent-color: var(--bo-lava);\n}\n\n.boView-new .primary.wide,\n.boView-deal .powerForm .primary.wide,\n.boView-deal [class*=\"purchaseForm\"] .primary.wide,\n.boView-deal [class*=\"supplierForm\"] .primary.wide {\n  width: 100%;\n  min-height: 46px;\n  margin-top: 3px;\n}\n\n/* File pickers / attachments */\n.boView-new [class*=\"filePicker\"],\n.boView-new [class*=\"FilePicker\"],\n.boView-deal [class*=\"filePicker\"],\n.boView-deal [class*=\"FilePicker\"],\n.boView-deal .field:has(input[type=\"file\"]) {\n  border-radius: 7px;\n}\n\n.boView-new input[type=\"file\"],\n.boView-deal input[type=\"file\"] {\n  padding: 8px;\n  border: 1px dashed var(--bo-line);\n  background: var(--bo-panel-2);\n}\n\n.boView-new [class*=\"fileList\"],\n.boView-new [class*=\"filesList\"],\n.boView-deal [class*=\"fileList\"],\n.boView-deal [class*=\"filesList\"] {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin-top: 7px;\n}\n\n.boView-new [class*=\"fileRow\"],\n.boView-new [class*=\"fileItem\"],\n.boView-deal [class*=\"fileRow\"],\n.boView-deal [class*=\"fileItem\"] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  min-height: 42px;\n  border: 1px solid var(--bo-line);\n  border-radius: 5px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  padding: 7px 9px;\n}\n\n/* Power of attorney block */\n.boView-deal .powerBox {\n  margin-top: 12px;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  overflow: hidden;\n}\n\n.boView-deal .powerHead {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  min-height: 58px;\n  padding: 11px 13px;\n  border-bottom: 1px solid var(--bo-line);\n  background: var(--bo-panel-2);\n}\n\n.boView-deal .powerHead span {\n  display: block;\n  color: var(--bo-muted);\n  font-size: 10px;\n  font-weight: 850;\n  letter-spacing: .05em;\n  text-transform: uppercase;\n}\n\n.boView-deal .powerHead strong {\n  display: block;\n  margin-top: 2px;\n  color: var(--bo-text);\n  font-size: 15px;\n}\n\n.boView-deal .powerHead > b {\n  display: grid;\n  min-width: 32px;\n  min-height: 32px;\n  place-items: center;\n  border: 1px solid var(--bo-line);\n  border-radius: 5px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n}\n\n.boView-deal .powerList {\n  display: flex;\n  flex-direction: column;\n}\n\n.boView-deal .powerCard {\n  padding: 12px 13px;\n  border-bottom: 1px solid var(--bo-line);\n  background: var(--bo-panel);\n}\n\n.boView-deal .powerCard:last-child {\n  border-bottom: 0;\n}\n\n.boView-deal .powerCardHead {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 10px;\n}\n\n.boView-deal .powerCardHead strong {\n  color: var(--bo-text);\n  font-size: 14px;\n}\n\n.boView-deal .powerMeta {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px 12px;\n  margin-top: 7px;\n  color: var(--bo-muted);\n  font-size: 12px;\n}\n\n.boView-deal .powerFiles {\n  margin-top: 9px;\n  padding: 9px 10px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n}\n\n.boView-deal .powerFiles > span {\n  display: block;\n  margin-bottom: 6px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 800;\n}\n\n.boView-deal .powerFiles a {\n  color: var(--bo-accent);\n  font-weight: 800;\n  text-decoration: none;\n}\n\n.boView-deal .powerForm {\n  margin: 12px;\n  border: 1px solid var(--bo-line);\n  border-left: 5px solid var(--bo-gold);\n  border-radius: 7px;\n  background: var(--bo-panel-2);\n  padding: 13px;\n}\n\n/* Purchases / suppliers — scoped only to known form/card-like class names */\n.boView-deal [class*=\"purchasesBox\"],\n.boView-deal [class*=\"purchaseBox\"],\n.boView-deal [class*=\"supplierBox\"] {\n  margin-top: 12px;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  overflow: hidden;\n}\n\n.boView-deal [class*=\"purchaseHead\"],\n.boView-deal [class*=\"purchasesHead\"],\n.boView-deal [class*=\"supplierHead\"] {\n  border-bottom: 1px solid var(--bo-line);\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  padding: 11px 13px;\n}\n\n.boView-deal [class*=\"purchaseCard\"],\n.boView-deal [class*=\"supplierCard\"] {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: none;\n}\n\n.boView-deal [class*=\"purchaseForm\"],\n.boView-deal [class*=\"supplierForm\"] {\n  border: 1px solid var(--bo-line);\n  border-left: 5px solid var(--bo-blue);\n  border-radius: 7px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  padding: 13px;\n}\n\n.boView-deal [class*=\"purchaseGrid\"],\n.boView-deal [class*=\"supplierGrid\"] {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 9px;\n}\n\n/* Structured ETRN/POA edit fields */\n.boShell .taskStructuredEdit {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 9px;\n}\n\n.boShell .taskStructuredEdit > label,\n.boShell .taskStructuredEdit > div {\n  min-width: 0;\n}\n\n.boShell .taskStructuredEdit input,\n.boShell .taskStructuredEdit textarea,\n.boShell .taskStructuredEdit select {\n  width: 100%;\n  min-height: 42px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 8px 9px;\n}\n\n.boShell .taskStructuredEdit textarea {\n  min-height: 84px;\n  resize: vertical;\n}\n\n.boShell .taskStructuredRead {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.boShell .taskStructuredRead > div {\n  min-width: 0;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  padding: 9px 10px;\n}\n\n.boShell .taskStructuredRead span {\n  display: block;\n  margin-bottom: 3px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 750;\n}\n\n.boShell .taskStructuredRead b {\n  color: var(--bo-text);\n  font-size: 13px;\n}\n\n/* Manager correction / repair / resubmit panels */\n.boShell .managerResubmitPanel,\n.boShell [class*=\"managerRepair\"],\n.boShell [class*=\"ManagerRepair\"],\n.boShell [class*=\"correctionForm\"] {\n  border: 1px solid var(--bo-line);\n  border-left: 5px solid var(--bo-gold);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 13px;\n}\n\n.boShell .managerResubmitPanel h3,\n.boShell [class*=\"managerRepair\"] h3,\n.boShell [class*=\"correctionForm\"] h3 {\n  margin-top: 0;\n  color: var(--bo-text);\n}\n\n.boShell .managerResubmitPanel .field,\n.boShell [class*=\"managerRepair\"] .field,\n.boShell [class*=\"correctionForm\"] .field {\n  margin-bottom: 10px;\n}\n\n@media (max-width: 720px) {\n  .boView-new .content.form {\n    width: 100%;\n    padding: 13px;\n    border-radius: 7px;\n  }\n\n  .boView-new .inline,\n  .boView-deal .powerForm .inline,\n  .boView-deal [class*=\"purchaseForm\"] .inline,\n  .boView-deal [class*=\"supplierForm\"] .inline,\n  .boView-deal [class*=\"purchaseGrid\"],\n  .boView-deal [class*=\"supplierGrid\"],\n  .boShell .taskStructuredEdit,\n  .boShell .taskStructuredRead {\n    grid-template-columns: 1fr;\n  }\n\n  .boView-new .segmented,\n  .boView-deal .powerForm .segmented,\n  .boView-deal [class*=\"purchaseForm\"] .segmented,\n  .boView-deal [class*=\"supplierForm\"] .segmented {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n  }\n\n  .boView-new .urgentToggle,\n  .boView-deal .powerForm .urgentToggle,\n  .boView-deal [class*=\"purchaseForm\"] .urgentToggle,\n  .boView-deal [class*=\"supplierForm\"] .urgentToggle {\n    width: 100%;\n  }\n\n  .boView-deal .powerForm {\n    margin: 9px;\n    padding: 11px;\n  }\n\n  .boView-deal .powerCardHead {\n    display: grid;\n    grid-template-columns: 1fr auto;\n  }\n\n  .boView-deal .powerMeta {\n    display: grid;\n    grid-template-columns: 1fr;\n    gap: 4px;\n  }\n\n  .boShell .managerResubmitPanel,\n  .boShell [class*=\"managerRepair\"],\n  .boShell [class*=\"ManagerRepair\"],\n  .boShell [class*=\"correctionForm\"] {\n    padding: 11px;\n  }\n}\n/* END_PART_V064_D_BLOCK_OFFICE_MANAGER_FORMS */";

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

const appSource = read(appFile);
const stylesSource = read(stylesFile);

if (!appSource.text.includes('boShell boView-')) {
  fail(
    'Не найден v064-A+B (boShell boView-*). ' +
    'Сначала примените update-v064-ab.'
  );
}

let styles = stylesSource.text;

if (!styles.includes('PART_V064_D_BLOCK_OFFICE_MANAGER_FORMS')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    styles.includes('PART_V064_D_BLOCK_OFFICE_MANAGER_FORMS'),
    'стили v064-D добавлены'
  ],
  [
    styles.includes('.boView-new .content.form'),
    'форма новой сделки стилизована'
  ],
  [
    styles.includes('.boView-deal .powerForm'),
    'форма доверенности стилизована'
  ],
  [
    styles.includes('[class*="purchaseForm"]'),
    'формы закупки стилизованы'
  ],
  [
    styles.includes('.boShell .taskStructuredEdit'),
    'редактирование ЭТРН/структурированных данных стилизовано'
  ],
  [
    styles.includes('.boShell .managerResubmitPanel'),
    'повторная отправка менеджера стилизована'
  ],
  [
    styles.includes('@media (max-width: 720px)'),
    'mobile адаптация присутствует'
  ],
];

console.log('');
console.log('v064-D — Manager Forms');
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

if (stylesSource.text === styles) {
  console.log('');
  console.log('v064-D уже установлен. Изменений нет.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

fs.copyFileSync(
  stylesFile,
  stylesFile + '.before-v064-d-' + stamp
);

const output =
  stylesSource.crlf
    ? styles.replace(/\n/g, '\r\n')
    : styles;

fs.writeFileSync(
  stylesFile,
  output,
  'utf8'
);

console.log('');
console.log('v064-D применён. Изменён frontend/src/styles.css');
