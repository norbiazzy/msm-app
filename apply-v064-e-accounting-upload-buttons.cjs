const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appFile = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');

const cssContent = "/* PART_V064_E_BLOCK_OFFICE_ACCOUNTING */\n\n/* =========================================================\n   ONE VISUAL LANGUAGE FOR ALL ATTACH / UPLOAD CONTROLS\n   ========================================================= */\n\n.boShell .field:has(input[type=\"file\"]) > button[type=\"button\"]:not(.primary),\n.boShell .field:has(input[type=\"file\"]) > label:not(.urgentToggle),\n.boShell .field:has(input[type=\"file\"]) > div > button[type=\"button\"]:first-child:not(.primary),\n.boShell .field:has(input[type=\"file\"]) > div > label:first-child:not(.urgentToggle),\n.boShell [class*=\"singleFile\"] > button[type=\"button\"],\n.boShell [class*=\"singleFile\"] > label,\n.boShell [class*=\"SingleFile\"] > button[type=\"button\"],\n.boShell [class*=\"SingleFile\"] > label,\n.boShell [class*=\"multiFile\"] > button[type=\"button\"],\n.boShell [class*=\"multiFile\"] > label,\n.boShell [class*=\"MultiFile\"] > button[type=\"button\"],\n.boShell [class*=\"MultiFile\"] > label,\n.boShell [class*=\"filePicker\"] > button[type=\"button\"],\n.boShell [class*=\"filePicker\"] > label,\n.boShell [class*=\"FilePicker\"] > button[type=\"button\"],\n.boShell [class*=\"FilePicker\"] > label {\n  display: flex !important;\n  align-items: center !important;\n  justify-content: center !important;\n  width: 100% !important;\n  min-height: 54px !important;\n  margin: 0 !important;\n  border: 2px solid color-mix(in srgb, var(--bo-text) 78%, var(--bo-line)) !important;\n  border-radius: 8px !important;\n  background: color-mix(in srgb, var(--bo-panel) 82%, var(--bo-panel-2)) !important;\n  color: var(--bo-text) !important;\n  box-shadow: none !important;\n  font-size: 15px !important;\n  font-weight: 850 !important;\n  line-height: 1.25 !important;\n  text-align: center !important;\n  cursor: pointer !important;\n  padding: 11px 14px !important;\n}\n\n.boShell .field:has(input[type=\"file\"]) > button[type=\"button\"]:not(.primary):hover,\n.boShell .field:has(input[type=\"file\"]) > label:not(.urgentToggle):hover,\n.boShell .field:has(input[type=\"file\"]) > div > button[type=\"button\"]:first-child:not(.primary):hover,\n.boShell [class*=\"singleFile\"] > button[type=\"button\"]:hover,\n.boShell [class*=\"multiFile\"] > button[type=\"button\"]:hover,\n.boShell [class*=\"filePicker\"] > button[type=\"button\"]:hover,\n.boShell [class*=\"FilePicker\"] > button[type=\"button\"]:hover {\n  border-color: var(--bo-accent) !important;\n  background: var(--bo-panel-2) !important;\n}\n\n.boShell .field:has(input[type=\"file\"]) input[type=\"file\"] {\n  position: absolute;\n  width: 1px !important;\n  height: 1px !important;\n  opacity: 0;\n  overflow: hidden;\n  pointer-events: none;\n}\n\n/* Do not turn remove/delete controls for selected files into upload buttons */\n.boShell [class*=\"fileRow\"] button,\n.boShell [class*=\"fileItem\"] button,\n.boShell [class*=\"selectedFile\"] button,\n.boShell [class*=\"pickedFile\"] button {\n  width: auto !important;\n  min-height: 32px !important;\n  border-width: 1px !important;\n  padding: 5px 8px !important;\n  font-size: 12px !important;\n}\n\n/* Selected/uploaded file presentation */\n.boShell [class*=\"singleFile\"],\n.boShell [class*=\"SingleFile\"],\n.boShell [class*=\"multiFile\"],\n.boShell [class*=\"MultiFile\"],\n.boShell [class*=\"filePicker\"],\n.boShell [class*=\"FilePicker\"] {\n  width: 100%;\n}\n\n.boShell [class*=\"fileName\"],\n.boShell [class*=\"selectedFile\"],\n.boShell [class*=\"pickedFile\"] {\n  color: var(--bo-text);\n}\n\n/* =========================================================\n   ACCOUNTANT — REQUEST DATA\n   ========================================================= */\n\n.boView-tasks .invoiceTaskDataCard {\n  margin-bottom: 12px;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  overflow: hidden;\n}\n\n.boView-tasks .invoiceTaskDataGrid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.boView-tasks .invoiceTaskDataGrid > div,\n.boView-tasks .invoiceTaskField {\n  min-width: 0;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  padding: 10px 11px;\n}\n\n.boView-tasks .invoiceTaskDataGrid span,\n.boView-tasks .invoiceTaskField span {\n  display: block;\n  margin-bottom: 4px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 800;\n}\n\n.boView-tasks .invoiceTaskDataGrid strong,\n.boView-tasks .invoiceTaskDataGrid b,\n.boView-tasks .invoiceTaskField strong,\n.boView-tasks .invoiceTaskField b {\n  display: block;\n  color: var(--bo-text);\n  font-size: 13px;\n  overflow-wrap: anywhere;\n}\n\n.boView-tasks .invoiceTaskTextBlock {\n  margin-top: 8px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  padding: 10px 11px;\n}\n\n.boView-tasks .invoiceTaskTextBlock > span {\n  display: block;\n  margin-bottom: 5px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 800;\n}\n\n.boView-tasks .invoiceTaskTextBlock p {\n  margin: 0;\n  color: var(--bo-text);\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n}\n\n/* =========================================================\n   ACCOUNTANT — REQUEST DOCUMENTS\n   ========================================================= */\n\n.boView-tasks .invoiceTaskDocs {\n  margin-top: 10px;\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  padding: 11px;\n}\n\n.boView-tasks .invoiceTaskDocsTitle {\n  display: block;\n  margin-bottom: 7px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 900;\n  letter-spacing: .035em;\n  text-transform: uppercase;\n}\n\n.boView-tasks .invoiceTaskDocsEmpty {\n  border: 1px dashed var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  padding: 12px;\n  text-align: center;\n}\n\n.boView-tasks .invoiceTaskDoc {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  min-height: 52px;\n  margin-top: 6px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  padding: 8px 10px;\n  text-decoration: none;\n}\n\n.boView-tasks .invoiceTaskDoc strong {\n  display: block;\n  color: var(--bo-text);\n  overflow-wrap: anywhere;\n}\n\n.boView-tasks .invoiceTaskDoc span {\n  display: block;\n  margin-top: 2px;\n  color: var(--bo-muted);\n  font-size: 11px;\n}\n\n.boView-tasks .invoiceTaskDoc > b {\n  color: var(--bo-accent);\n  font-size: 12px;\n}\n\n/* =========================================================\n   ACCOUNTANT — START / IN WORK / COMPLETE\n   ========================================================= */\n\n.boView-tasks .invoiceTaskStartActions {\n  display: grid;\n  grid-template-columns: 1fr minmax(150px, 220px);\n  gap: 9px;\n  align-items: stretch;\n  margin-top: 11px;\n}\n\n.boView-tasks .invoiceTaskStartActions > .primary {\n  min-height: 46px;\n  width: 100%;\n}\n\n.boView-tasks .invoiceTaskInWorkBox {\n  position: relative;\n  border-left: 5px solid var(--bo-blue);\n  background: var(--bo-panel);\n}\n\n.boView-tasks .invoiceTaskInWorkBox > div:first-child strong {\n  color: var(--bo-text);\n  font-size: 14px;\n}\n\n.boView-tasks .invoiceTaskInWorkBox > div:first-child p {\n  margin: 4px 0 0;\n  color: var(--bo-muted);\n}\n\n.boView-tasks [class*=\"invoiceFinish\"],\n.boView-tasks [class*=\"invoiceComplete\"],\n.boView-tasks [class*=\"finishInvoice\"],\n.boView-tasks [class*=\"completeInvoice\"],\n.boView-tasks [class*=\"taskFinish\"] {\n  margin-top: 10px;\n  border: 1px solid var(--bo-line);\n  border-left: 5px solid var(--bo-green);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 13px;\n}\n\n.boView-tasks [class*=\"invoiceFinish\"] .inline,\n.boView-tasks [class*=\"invoiceComplete\"] .inline,\n.boView-tasks [class*=\"finishInvoice\"] .inline,\n.boView-tasks [class*=\"completeInvoice\"] .inline {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 9px;\n}\n\n.boView-tasks .field {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n.boView-tasks .field > span {\n  color: var(--bo-muted);\n  font-size: 12px;\n  font-weight: 800;\n}\n\n.boView-tasks .field input,\n.boView-tasks .field textarea,\n.boView-tasks .field select {\n  min-height: 44px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 9px 10px;\n}\n\n.boView-tasks .field textarea {\n  min-height: 88px;\n  resize: vertical;\n}\n\n/* =========================================================\n   RETURN TO MANAGER\n   ========================================================= */\n\n.boView-tasks [class*=\"returnToManager\"],\n.boView-tasks [class*=\"ReturnToManager\"],\n.boView-tasks .returnPanel,\n.boView-tasks .taskReturnPanel {\n  margin-top: 10px;\n  border: 1px solid color-mix(in srgb, var(--bo-red) 40%, var(--bo-line));\n  border-left: 5px solid var(--bo-red);\n  border-radius: 7px;\n  background: color-mix(in srgb, var(--bo-red) 6%, var(--bo-panel));\n  color: var(--bo-text);\n  padding: 12px;\n}\n\n.boView-tasks [class*=\"returnToManager\"] h3,\n.boView-tasks [class*=\"ReturnToManager\"] h3,\n.boView-tasks .returnPanel h3,\n.boView-tasks .taskReturnPanel h3 {\n  margin: 0 0 9px;\n  color: var(--bo-text);\n  font-size: 14px;\n}\n\n.boView-tasks [class*=\"returnToManager\"] select,\n.boView-tasks [class*=\"returnToManager\"] textarea,\n.boView-tasks [class*=\"ReturnToManager\"] select,\n.boView-tasks [class*=\"ReturnToManager\"] textarea,\n.boView-tasks .returnPanel select,\n.boView-tasks .returnPanel textarea,\n.boView-tasks .taskReturnPanel select,\n.boView-tasks .taskReturnPanel textarea {\n  width: 100%;\n  min-height: 44px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 9px 10px;\n}\n\n.boView-tasks [class*=\"returnToManager\"] textarea,\n.boView-tasks [class*=\"ReturnToManager\"] textarea,\n.boView-tasks .returnPanel textarea,\n.boView-tasks .taskReturnPanel textarea {\n  min-height: 80px;\n  resize: vertical;\n}\n\n/* =========================================================\n   POWER OF ATTORNEY RESULT / SUPPLIER ACCOUNTING TASKS\n   ========================================================= */\n\n.boView-tasks .powerTaskGrid {\n  margin-bottom: 10px;\n}\n\n.boView-tasks .powerTaskGrid > div {\n  border: 1px solid var(--bo-line);\n  background: var(--bo-panel-2);\n}\n\n.boView-tasks [class*=\"supplierPayment\"],\n.boView-tasks [class*=\"SupplierPayment\"],\n.boView-tasks [class*=\"balanceCorrection\"],\n.boView-tasks [class*=\"BalanceCorrection\"] {\n  color: var(--bo-text);\n}\n\n.boView-tasks [class*=\"supplierPayment\"] .infoBox,\n.boView-tasks [class*=\"SupplierPayment\"] .infoBox,\n.boView-tasks [class*=\"balanceCorrection\"] .infoBox,\n.boView-tasks [class*=\"BalanceCorrection\"] .infoBox {\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n}\n\n.boView-tasks button.primary.wide {\n  min-height: 46px;\n}\n\n/* =========================================================\n   MOBILE\n   ========================================================= */\n\n@media (max-width: 720px) {\n  .boShell .field:has(input[type=\"file\"]) > button[type=\"button\"]:not(.primary),\n  .boShell .field:has(input[type=\"file\"]) > label:not(.urgentToggle),\n  .boShell .field:has(input[type=\"file\"]) > div > button[type=\"button\"]:first-child:not(.primary),\n  .boShell [class*=\"singleFile\"] > button[type=\"button\"],\n  .boShell [class*=\"multiFile\"] > button[type=\"button\"],\n  .boShell [class*=\"filePicker\"] > button[type=\"button\"],\n  .boShell [class*=\"FilePicker\"] > button[type=\"button\"] {\n    min-height: 52px !important;\n    font-size: 14px !important;\n    padding: 10px 11px !important;\n  }\n\n  .boView-tasks .invoiceTaskDataGrid {\n    grid-template-columns: 1fr;\n  }\n\n  .boView-tasks .invoiceTaskDoc {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n\n  .boView-tasks .invoiceTaskDoc > b {\n    display: block;\n    min-height: 34px;\n    padding-top: 6px;\n  }\n\n  .boView-tasks .invoiceTaskStartActions {\n    grid-template-columns: 1fr;\n  }\n\n  .boView-tasks [class*=\"invoiceFinish\"] .inline,\n  .boView-tasks [class*=\"invoiceComplete\"] .inline,\n  .boView-tasks [class*=\"finishInvoice\"] .inline,\n  .boView-tasks [class*=\"completeInvoice\"] .inline {\n    grid-template-columns: 1fr;\n  }\n\n  .boView-tasks [class*=\"returnToManager\"],\n  .boView-tasks [class*=\"ReturnToManager\"],\n  .boView-tasks .returnPanel,\n  .boView-tasks .taskReturnPanel {\n    padding: 11px;\n  }\n}\n/* END_PART_V064_E_BLOCK_OFFICE_ACCOUNTING */";

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
    'Не найден Block Office shell (v064-A+B). ' +
    'Сначала примените update-v064-ab.'
  );
}

let styles = stylesSource.text;

if (!styles.includes('PART_V064_E_BLOCK_OFFICE_ACCOUNTING')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    styles.includes('PART_V064_E_BLOCK_OFFICE_ACCOUNTING'),
    'стили v064-E добавлены'
  ],
  [
    styles.includes('.field:has(input[type="file"])'),
    'кнопки прикрепления унифицированы'
  ],
  [
    styles.includes('.invoiceTaskDataGrid'),
    'данные запроса бухгалтерии стилизованы'
  ],
  [
    styles.includes('.invoiceTaskDocs'),
    'документы запроса стилизованы'
  ],
  [
    styles.includes('.invoiceTaskStartActions'),
    'действия В работу / возврат стилизованы'
  ],
  [
    styles.includes('.invoiceTaskInWorkBox'),
    'состояние задачи В работе стилизовано'
  ],
  [
    styles.includes('[class*="returnToManager"]'),
    'возврат менеджеру стилизован'
  ],
  [
    styles.includes('@media (max-width: 720px)'),
    'mobile адаптация присутствует'
  ],
];

console.log('');
console.log('v064-E — Accounting + Upload Buttons');
console.log('====================================');

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
  console.log('v064-E уже установлен. Изменений нет.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

fs.copyFileSync(
  stylesFile,
  stylesFile + '.before-v064-e-' + stamp
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
console.log(
  'v064-E применён. Изменён frontend/src/styles.css'
);
