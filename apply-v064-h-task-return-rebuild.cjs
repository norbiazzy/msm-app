const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const stylesFile =
  path.join(root, 'frontend', 'src', 'styles.css');

const resubmitFile =
  path.join(root, 'frontend', 'src', 'ManagerResubmitPanel.tsx');

const cssContent = "/* PART_V064_H_TASK_DETAIL_RETURN_REBUILD */\n\n/* =========================================================\n   TASK DETAIL — ONE CLEAR WORKSPACE\n   ========================================================= */\n\n.boView-tasks .content.form {\n  display: flex;\n  flex-direction: column;\n  gap: 10px;\n  max-width: 1040px;\n  margin: 0 auto;\n}\n\n.boView-tasks .content.form > .backLink {\n  order: -100;\n  width: max-content;\n  margin: 0 0 2px;\n}\n\n.boView-tasks .content.form > .detailHero {\n  order: -90;\n}\n\n.boView-tasks .content.form > .taskDetailDealLink {\n  order: -80;\n}\n\n.boView-tasks .content.form > .invoiceTaskDataCard {\n  order: -70;\n}\n\n.boView-tasks .content.form > .taskStructuredRead,\n.boView-tasks .content.form > .taskStructuredFields {\n  order: -60;\n}\n\n.boView-tasks .content.form > .managerResubmitPanel {\n  order: 60;\n}\n\n/* hero */\n.boView-tasks .detailHero {\n  position: relative;\n  overflow: hidden;\n  margin: 0;\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: var(--bo-panel);\n  box-shadow: var(--bo-shadow);\n  padding: 17px 18px 16px;\n}\n\n.boView-tasks .detailHero::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 5px;\n  background: var(--bo-blue);\n}\n\n.boView-tasks .detailHero:has(.statusPill) {\n  padding-left: 19px;\n}\n\n.boView-tasks .detailHero .eyebrow {\n  margin-bottom: 3px;\n  color: var(--bo-muted);\n  font-size: 10px;\n  font-weight: 900;\n  letter-spacing: .07em;\n  text-transform: uppercase;\n}\n\n.boView-tasks .detailHero h2 {\n  margin: 3px 0 5px;\n  color: var(--bo-text);\n  font-size: clamp(22px, 2.6vw, 29px);\n  line-height: 1.16;\n  letter-spacing: -.025em;\n}\n\n.boView-tasks .detailHero > p {\n  margin: 3px 0 9px;\n  color: var(--bo-muted);\n}\n\n.boView-tasks .detailHero .statusPill {\n  display: inline-flex;\n  align-items: center;\n  min-height: 29px;\n  border: 1px solid var(--bo-line);\n  border-radius: 4px;\n  background: var(--bo-panel-2);\n  color: var(--bo-blue);\n  font-size: 11px;\n  font-weight: 900;\n  padding: 5px 8px;\n}\n\n.boView-tasks .detailHero .urgent {\n  margin-left: 6px;\n}\n\n/* deal jump */\n.boView-tasks .taskDetailDealLink {\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 10px;\n  min-height: 52px;\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  text-decoration: none;\n  padding: 9px 11px;\n}\n\n.boView-tasks .taskDetailDealLink strong {\n  color: var(--bo-accent);\n  font-size: 13px;\n  font-weight: 900;\n}\n\n.boView-tasks .taskDetailDealLink span {\n  min-width: 0;\n  overflow: hidden;\n  color: var(--bo-muted);\n  font-size: 12px;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskDetailDealLink b {\n  color: var(--bo-accent);\n  font-size: 12px;\n  white-space: nowrap;\n}\n\n/* request data = \"what manager sent\" */\n.boView-tasks .invoiceTaskDataCard {\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: none;\n  padding: 13px;\n}\n\n.boView-tasks .invoiceTaskDataHead {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 10px;\n}\n\n.boView-tasks .invoiceTaskDataHead strong {\n  display: block;\n  color: var(--bo-text);\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.boView-tasks .invoiceTaskDataHead span {\n  display: block;\n  margin-top: 3px;\n  color: var(--bo-muted);\n  font-size: 11px;\n}\n\n.boView-tasks .invoiceTaskDataGrid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.boView-tasks .invoiceTaskDataGrid > div,\n.boView-tasks .invoiceTaskTextBlock {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  padding: 9px 10px;\n}\n\n.boView-tasks .invoiceTaskTextBlock {\n  margin-top: 8px;\n}\n\n.boView-tasks .invoiceTaskDataGrid span,\n.boView-tasks .invoiceTaskTextBlock > span {\n  display: block;\n  margin-bottom: 4px;\n  color: var(--bo-muted);\n  font-size: 10px;\n  font-weight: 850;\n  letter-spacing: .02em;\n}\n\n.boView-tasks .invoiceTaskDataGrid b,\n.boView-tasks .invoiceTaskDataGrid strong,\n.boView-tasks .invoiceTaskTextBlock p {\n  margin: 0;\n  color: var(--bo-text);\n  font-size: 13px;\n  line-height: 1.4;\n  overflow-wrap: anywhere;\n}\n\n/* =========================================================\n   DOCUMENTS\n   ========================================================= */\n\n.boView-tasks .invoiceTaskDocs,\n.boView-tasks .infoBox:has(.versionList) {\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  padding: 12px;\n}\n\n.boView-tasks .invoiceTaskDocsTitle,\n.boView-tasks .infoBox:has(.versionList) > strong:first-child {\n  display: block;\n  margin-bottom: 8px;\n  color: var(--bo-text);\n  font-size: 13px;\n  font-weight: 900;\n  text-transform: none;\n  letter-spacing: 0;\n}\n\n/* =========================================================\n   ACCOUNTANT ACTIONS / RETURN\n   ========================================================= */\n\n.boView-tasks .invoiceTaskStartActions {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 8px;\n  align-items: stretch;\n  margin: 0;\n  padding: 12px;\n  border: 1px solid var(--bo-line);\n  border-left: 5px solid var(--bo-blue);\n  border-radius: 8px;\n  background: var(--bo-panel);\n}\n\n.boView-tasks .invoiceTaskStartActions > * {\n  min-width: 0;\n}\n\n.boView-tasks .invoiceTaskStartActions > button,\n.boView-tasks .invoiceTaskStartActions button.primary {\n  width: 100%;\n  min-height: 46px;\n}\n\n/* universal return container variants */\n.boView-tasks [class*=\"returnToManager\"],\n.boView-tasks [class*=\"ReturnToManager\"],\n.boView-tasks .returnPanel,\n.boView-tasks .taskReturnPanel {\n  width: 100%;\n  min-width: 0;\n  margin: 0;\n  border: 1px solid color-mix(in srgb, var(--bo-red) 42%, var(--bo-line));\n  border-left: 5px solid var(--bo-red);\n  border-radius: 7px;\n  background: color-mix(in srgb, var(--bo-red) 6%, var(--bo-panel));\n  color: var(--bo-text);\n  padding: 11px;\n}\n\n.boView-tasks [class*=\"returnToManager\"] h3,\n.boView-tasks [class*=\"ReturnToManager\"] h3,\n.boView-tasks .returnPanel h3,\n.boView-tasks .taskReturnPanel h3 {\n  margin: 0 0 4px;\n  color: var(--bo-text);\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.boView-tasks [class*=\"returnToManager\"] p,\n.boView-tasks [class*=\"ReturnToManager\"] p,\n.boView-tasks .returnPanel p,\n.boView-tasks .taskReturnPanel p {\n  margin: 3px 0 9px;\n  color: var(--bo-muted);\n  font-size: 12px;\n  line-height: 1.4;\n}\n\n.boView-tasks [class*=\"returnToManager\"] .field,\n.boView-tasks [class*=\"ReturnToManager\"] .field,\n.boView-tasks .returnPanel .field,\n.boView-tasks .taskReturnPanel .field {\n  margin-top: 8px;\n}\n\n.boView-tasks [class*=\"returnToManager\"] select,\n.boView-tasks [class*=\"returnToManager\"] textarea,\n.boView-tasks [class*=\"ReturnToManager\"] select,\n.boView-tasks [class*=\"ReturnToManager\"] textarea,\n.boView-tasks .returnPanel select,\n.boView-tasks .returnPanel textarea,\n.boView-tasks .taskReturnPanel select,\n.boView-tasks .taskReturnPanel textarea {\n  width: 100%;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n}\n\n.boView-tasks [class*=\"returnToManager\"] textarea,\n.boView-tasks [class*=\"ReturnToManager\"] textarea,\n.boView-tasks .returnPanel textarea,\n.boView-tasks .taskReturnPanel textarea {\n  min-height: 78px;\n  resize: vertical;\n}\n\n.boView-tasks [class*=\"returnToManager\"] button:not(.ghost),\n.boView-tasks [class*=\"ReturnToManager\"] button:not(.ghost),\n.boView-tasks .returnPanel button:not(.ghost),\n.boView-tasks .taskReturnPanel button:not(.ghost) {\n  min-height: 43px;\n  border-color: var(--bo-red);\n  background: var(--bo-red);\n  color: #fff;\n  font-weight: 900;\n}\n\n/* =========================================================\n   MANAGER — RETURNED TASK / SAME TASK RESUBMIT\n   ========================================================= */\n\n.boView-tasks .managerResubmitPanel {\n  position: relative;\n  overflow: hidden;\n  margin: 4px 0 0;\n  border: 1px solid color-mix(in srgb, var(--bo-red) 38%, var(--bo-line));\n  border-left: 5px solid var(--bo-red);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  padding: 0;\n  box-shadow: none;\n}\n\n.boView-tasks .managerResubmitHead {\n  padding: 13px 14px;\n  border-bottom: 1px solid var(--bo-line);\n  background: color-mix(in srgb, var(--bo-red) 7%, var(--bo-panel));\n}\n\n.boView-tasks .managerResubmitHead::before {\n  content: 'НУЖНО ИСПРАВИТЬ';\n  display: block;\n  margin-bottom: 5px;\n  color: var(--bo-red);\n  font-size: 10px;\n  font-weight: 950;\n  letter-spacing: .07em;\n}\n\n.boView-tasks .managerResubmitHead strong {\n  display: block;\n  color: var(--bo-text);\n  font-size: 15px;\n  font-weight: 900;\n}\n\n.boView-tasks .managerResubmitHead span {\n  display: block;\n  max-width: 760px;\n  margin-top: 4px;\n  color: var(--bo-muted);\n  font-size: 12px;\n  line-height: 1.45;\n}\n\n.boView-tasks .managerResubmitPanel > .taskStructuredEdit,\n.boView-tasks .managerResubmitPanel > .taskStructuredFields,\n.boView-tasks .managerResubmitPanel > label,\n.boView-tasks .managerResubmitPanel > .field,\n.boView-tasks .managerResubmitPanel > .urgentToggle,\n.boView-tasks .managerResubmitPanel > .error,\n.boView-tasks .managerResubmitPanel > button,\n.boView-tasks .managerResubmitPanel > div:not(.managerResubmitHead) {\n  margin-left: 13px;\n  margin-right: 13px;\n}\n\n.boView-tasks .managerResubmitPanel > .managerResubmitHead {\n  margin: 0;\n}\n\n.boView-tasks .managerResubmitPanel > *:last-child {\n  margin-bottom: 13px;\n}\n\n.boView-tasks .managerResubmitPanel .taskStructuredEdit {\n  margin-top: 13px;\n}\n\n.boView-tasks .managerResubmitPanel .field {\n  margin-top: 10px;\n}\n\n.boView-tasks .managerResubmitPanel .urgentToggle {\n  width: calc(100% - 26px);\n}\n\n.boView-tasks .managerResubmitPanel button.primary,\n.boView-tasks .managerResubmitPanel .primary.wide {\n  width: calc(100% - 26px);\n  min-height: 48px;\n  margin-top: 10px;\n  background: var(--bo-accent);\n}\n\n/* invoice-specific repair gets the same hierarchy */\n.boView-tasks .invoiceTaskRepairNotice {\n  border: 1px solid color-mix(in srgb, var(--bo-red) 40%, var(--bo-line));\n  border-left: 5px solid var(--bo-red);\n  border-radius: 7px;\n  background: color-mix(in srgb, var(--bo-red) 7%, var(--bo-panel));\n  color: var(--bo-text);\n  padding: 11px 12px;\n  font-size: 12px;\n  line-height: 1.45;\n}\n\n.boView-tasks .invoiceTaskEdit {\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  padding: 13px;\n}\n\n.boView-tasks .invoiceTaskEdit > h3 {\n  margin: 0 0 12px;\n  color: var(--bo-text);\n  font-size: 14px;\n  font-weight: 900;\n}\n\n/* structured fields */\n.boView-tasks .taskStructuredEdit,\n.boView-tasks .taskStructuredRead {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n}\n\n.boView-tasks .taskStructuredRead > div {\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  padding: 9px 10px;\n}\n\n/* in work/result */\n.boView-tasks .invoiceTaskInWorkBox {\n  margin: 0;\n  border-left: 5px solid var(--bo-blue);\n  border-radius: 8px;\n  background: var(--bo-panel);\n}\n\n.boView-tasks .invoiceTaskInWorkBox strong {\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.boView-tasks .invoiceTaskInWorkBox p {\n  margin: 4px 0 0;\n  color: var(--bo-muted);\n  font-size: 12px;\n}\n\n/* =========================================================\n   MOBILE\n   ========================================================= */\n\n@media (max-width: 720px) {\n  .boView-tasks .content.form {\n    gap: 8px;\n  }\n\n  .boView-tasks .detailHero {\n    padding: 13px 13px 12px 16px;\n  }\n\n  .boView-tasks .detailHero h2 {\n    font-size: 21px;\n  }\n\n  .boView-tasks .taskDetailDealLink {\n    grid-template-columns: auto minmax(0, 1fr);\n  }\n\n  .boView-tasks .taskDetailDealLink b {\n    grid-column: 1 / -1;\n    padding-top: 2px;\n  }\n\n  .boView-tasks .invoiceTaskDataGrid,\n  .boView-tasks .taskStructuredEdit,\n  .boView-tasks .taskStructuredRead {\n    grid-template-columns: 1fr;\n  }\n\n  .boView-tasks .invoiceTaskStartActions {\n    grid-template-columns: 1fr;\n    padding: 10px;\n  }\n\n  .boView-tasks .managerResubmitHead {\n    padding: 12px;\n  }\n\n  .boView-tasks .managerResubmitPanel > .taskStructuredEdit,\n  .boView-tasks .managerResubmitPanel > .taskStructuredFields,\n  .boView-tasks .managerResubmitPanel > label,\n  .boView-tasks .managerResubmitPanel > .field,\n  .boView-tasks .managerResubmitPanel > .urgentToggle,\n  .boView-tasks .managerResubmitPanel > .error,\n  .boView-tasks .managerResubmitPanel > button,\n  .boView-tasks .managerResubmitPanel > div:not(.managerResubmitHead) {\n    margin-left: 10px;\n    margin-right: 10px;\n  }\n\n  .boView-tasks .managerResubmitPanel .urgentToggle,\n  .boView-tasks .managerResubmitPanel button.primary,\n  .boView-tasks .managerResubmitPanel .primary.wide {\n    width: calc(100% - 20px);\n  }\n\n  .boView-tasks [class*=\"returnToManager\"],\n  .boView-tasks [class*=\"ReturnToManager\"],\n  .boView-tasks .returnPanel,\n  .boView-tasks .taskReturnPanel {\n    padding: 10px;\n  }\n}\n\n/* END_PART_V064_H_TASK_DETAIL_RETURN_REBUILD */";

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

const stylesSource = read(stylesFile);
const resubmitSource = read(resubmitFile);

let styles = stylesSource.text;
let resubmit = resubmitSource.text;

if (!styles.includes('PART_V064_H_TASK_DETAIL_RETURN_REBUILD')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

/*
  Only wording changes here. Business logic / fields / submit path
  remain exactly as they are.
*/
if (
  resubmit.includes('Исправьте данные') &&
  !resubmit.includes('Исправьте заявку и отправьте повторно')
) {
  resubmit = resubmit.replace(
    'Исправьте данные',
    'Исправьте заявку и отправьте повторно'
  );
}

if (
  resubmit.includes(
    'После сохранения эта же задача\n' +
    '          снова уйдёт бухгалтерии.\n' +
    '          Старые данные и документы\n' +
    '          сохраняются.'
  )
) {
  resubmit = resubmit.replace(
    'После сохранения эта же задача\n' +
    '          снова уйдёт бухгалтерии.\n' +
    '          Старые данные и документы\n' +
    '          сохраняются.',
    'Измените только то, что нужно исправить.\n' +
    '          Повторно уйдёт эта же задача —\n' +
    '          старые данные и документы сохраняются.'
  );
}

const checks = [
  [
    styles.includes('PART_V064_H_TASK_DETAIL_RETURN_REBUILD'),
    'CSS v064-H добавлен'
  ],
  [
    styles.includes('.taskDetailDealLink'),
    'переход к сделке стилизован'
  ],
  [
    styles.includes('.managerResubmitPanel'),
    'повторная отправка менеджера стилизована'
  ],
  [
    styles.includes('[class*="returnToManager"]'),
    'возврат бухгалтером стилизован'
  ],
  [
    styles.includes('.invoiceTaskStartActions'),
    'единый action-блок бухгалтерии стилизован'
  ],
  [
    styles.includes('@media (max-width: 720px)'),
    'mobile адаптация есть'
  ],
  [
    resubmit.includes('managerResubmitPanel'),
    'ManagerResubmitPanel сохранён'
  ],
];

console.log('');
console.log('v064-H — Task Detail + Return Rebuild');
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

let changed = 0;

if (
  writeWithBackup(
    stylesFile,
    stylesSource,
    styles,
    'v064-h'
  )
) changed++;

if (
  writeWithBackup(
    resubmitFile,
    resubmitSource,
    resubmit,
    'v064-h'
  )
) changed++;

console.log('');
console.log(
  'v064-H применён. Изменено файлов: ' + changed
);
