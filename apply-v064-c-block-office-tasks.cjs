const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');
const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');
const appFile = path.join(root, 'frontend', 'src', 'App.tsx');
const cssContent = "/* PART_V064_C_BLOCK_OFFICE_TASKS */\n.boView-tasks .content {\n  color: var(--bo-text);\n}\n\n.boView-tasks .sectionHead {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 12px;\n  margin-bottom: 14px;\n  padding: 0 2px;\n}\n\n.boView-tasks .sectionHead h2 {\n  margin: 0;\n  color: var(--bo-text);\n  font-size: clamp(20px, 2.3vw, 27px);\n  letter-spacing: -.02em;\n}\n\n.boView-tasks .sectionHead > span {\n  display: grid;\n  min-width: 34px;\n  min-height: 34px;\n  place-items: center;\n  border: 1px solid var(--bo-line);\n  border-radius: 5px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  font-weight: 900;\n}\n\n.boView-tasks .taskQueueCaption {\n  margin-top: 4px;\n  color: var(--bo-muted);\n  font-size: 12px;\n}\n\n.boView-tasks .taskQueue {\n  display: flex;\n  flex-direction: column;\n  gap: 13px;\n}\n\n.boView-tasks [class*=\"taskGroup\"] {\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  overflow: hidden;\n}\n\n.boView-tasks [class*=\"taskGroup\"] > h3,\n.boView-tasks [class*=\"taskGroup\"] > h4 {\n  margin: 0;\n  padding: 11px 13px;\n  border-bottom: 1px solid var(--bo-line);\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  font-size: 13px;\n  font-weight: 900;\n  letter-spacing: .025em;\n}\n\n.boView-tasks .taskGroupWorking > h3,\n.boView-tasks .taskGroupWorking > h4 {\n  border-left: 5px solid var(--bo-blue);\n}\n\n.boView-tasks .taskGroupNew > h3,\n.boView-tasks .taskGroupNew > h4 {\n  border-left: 5px solid var(--bo-stone);\n}\n\n.boView-tasks .taskGroupNeedData > h3,\n.boView-tasks .taskGroupNeedData > h4 {\n  border-left: 5px solid var(--bo-red);\n}\n\n.boView-tasks .taskCard {\n  position: relative;\n  display: block;\n  width: 100%;\n  min-height: 82px;\n  border: 0;\n  border-bottom: 1px solid var(--bo-line);\n  border-radius: 0;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  text-align: left;\n  box-shadow: none;\n  padding: 13px 15px 13px 18px;\n  cursor: pointer;\n}\n\n.boView-tasks .taskCard:last-child {\n  border-bottom: 0;\n}\n\n.boView-tasks .taskCard::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 5px;\n  background: var(--bo-stone);\n}\n\n.boView-tasks .taskGroupWorking .taskCard::before {\n  background: var(--bo-blue);\n}\n\n.boView-tasks .taskGroupNew .taskCard::before {\n  background: var(--bo-stone);\n}\n\n.boView-tasks .taskGroupNeedData .taskCard::before {\n  background: var(--bo-red);\n}\n\n.boView-tasks .taskCard:hover {\n  background: color-mix(in srgb, var(--bo-panel-2) 55%, var(--bo-panel));\n}\n\n.boView-tasks .taskCard h3,\n.boView-tasks .taskCard h4,\n.boView-tasks .taskCard strong {\n  color: var(--bo-text);\n}\n\n.boView-tasks .taskCard h3,\n.boView-tasks .taskCard h4 {\n  margin: 0 0 5px;\n  font-size: 15px;\n  font-weight: 850;\n  letter-spacing: -.01em;\n}\n\n.boView-tasks .taskCard p {\n  margin: 4px 0;\n  color: var(--bo-muted);\n}\n\n.boView-tasks .taskCardTop,\n.boView-tasks .taskCardHead,\n.boView-tasks .taskCardHeader {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 10px;\n}\n\n.boView-tasks .taskDealNumberLink {\n  color: var(--bo-accent);\n  font-weight: 900;\n  text-decoration: none;\n}\n\n.boView-tasks .taskDealNumberLink:hover {\n  text-decoration: underline;\n}\n\n.boView-tasks .taskCreated {\n  color: var(--bo-muted);\n  font-size: 11px;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskCard .urgent,\n.boView-tasks .urgent {\n  display: inline-flex;\n  border-radius: 4px;\n  background: color-mix(in srgb, var(--bo-lava) 12%, transparent);\n  color: var(--bo-lava);\n  font-size: 11px;\n  font-weight: 900;\n  padding: 5px 7px;\n}\n\n.boView-tasks .taskStatus,\n.boView-tasks .statusPill,\n.boView-tasks [class*=\"taskStatus\"] {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  border: 1px solid var(--bo-line);\n  border-radius: 4px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  font-size: 11px;\n  font-weight: 850;\n  padding: 5px 7px;\n}\n\n.boView-tasks .taskGroupWorking .taskStatus,\n.boView-tasks .taskGroupWorking [class*=\"taskStatus\"] {\n  color: var(--bo-blue);\n}\n\n.boView-tasks .taskGroupNeedData .taskStatus,\n.boView-tasks .taskGroupNeedData [class*=\"taskStatus\"] {\n  color: var(--bo-red);\n}\n\n.boView-tasks .taskCardUploadState {\n  margin-top: 10px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  padding: 9px 10px;\n}\n\n.boView-tasks .taskCardUploadTop {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  font-size: 12px;\n}\n\n.boView-tasks .taskCardUploadBar {\n  height: 5px;\n  overflow: hidden;\n  margin-top: 7px;\n  border-radius: 2px;\n  background: color-mix(in srgb, var(--bo-line) 75%, transparent);\n}\n\n.boView-tasks .taskCardUploadBar > span {\n  display: block;\n  height: 100%;\n  background: var(--bo-blue);\n}\n\n/* Open task */\n.boView-tasks .content.form {\n  max-width: 980px;\n  margin: 0 auto;\n}\n\n.boView-tasks .backLink {\n  margin-bottom: 7px;\n}\n\n.boView-tasks .detailHero {\n  position: relative;\n  overflow: hidden;\n  margin-bottom: 12px;\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: var(--bo-shadow);\n  padding: 17px 18px;\n}\n\n.boView-tasks .detailHero::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 5px;\n  background: var(--bo-blue);\n}\n\n.boView-tasks .detailHero h2 {\n  margin: 3px 0 7px;\n  color: var(--bo-text);\n  font-size: clamp(21px, 2.5vw, 29px);\n  letter-spacing: -.025em;\n}\n\n.boView-tasks .detailHero p {\n  margin: 5px 0;\n  color: var(--bo-muted);\n}\n\n.boView-tasks .detailHero .eyebrow {\n  color: var(--bo-muted);\n}\n\n.boView-tasks .powerTaskGrid,\n.boView-tasks .taskStructuredGrid,\n.boView-tasks .structuredFields,\n.boView-tasks .detailGrid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 9px;\n  margin-bottom: 12px;\n}\n\n.boView-tasks .powerTaskGrid > div,\n.boView-tasks .taskStructuredGrid > div,\n.boView-tasks .structuredFields > div {\n  min-width: 0;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  padding: 10px 11px;\n}\n\n.boView-tasks .powerTaskGrid span,\n.boView-tasks .taskStructuredGrid span,\n.boView-tasks .structuredFields span {\n  display: block;\n  margin-bottom: 4px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 750;\n}\n\n.boView-tasks .powerTaskGrid b,\n.boView-tasks .taskStructuredGrid b,\n.boView-tasks .structuredFields b {\n  color: var(--bo-text);\n  font-size: 13px;\n}\n\n.boView-tasks .infoBox,\n.boView-tasks .panel,\n.boView-tasks .managerResubmitPanel,\n.boView-tasks .returnPanel,\n.boView-tasks .taskReturnPanel,\n.boView-tasks .taskActionPanel {\n  margin-bottom: 10px;\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: none;\n  padding: 13px;\n}\n\n.boView-tasks .infoBox > strong:first-child,\n.boView-tasks .panel > strong:first-child {\n  display: block;\n  margin-bottom: 9px;\n  font-size: 13px;\n  font-weight: 850;\n}\n\n.boView-tasks .versionList {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  margin-top: 8px;\n}\n\n.boView-tasks .versionRow {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  min-height: 46px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  padding: 8px 10px;\n}\n\n.boView-tasks .versionRow a {\n  color: var(--bo-accent);\n  font-weight: 800;\n  text-decoration: none;\n}\n\n.boView-tasks .field {\n  margin-bottom: 10px;\n}\n\n.boView-tasks input,\n.boView-tasks textarea,\n.boView-tasks select {\n  width: 100%;\n}\n\n.boView-tasks .urgentToggle {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 42px;\n  width: max-content;\n  margin: 6px 0 10px;\n  border: 1px solid var(--bo-line);\n  border-radius: 6px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  padding: 7px 10px;\n}\n\n.boView-tasks .urgentToggle input {\n  width: auto;\n}\n\n.boView-tasks .primary.wide {\n  width: 100%;\n  min-height: 46px;\n}\n\n.boView-tasks .returnPanel,\n.boView-tasks .taskReturnPanel {\n  border-left: 5px solid var(--bo-red);\n}\n\n.boView-tasks .managerResubmitPanel {\n  border-left: 5px solid var(--bo-gold);\n}\n\n.boView-tasks .error {\n  margin: 8px 0;\n}\n\n@media (max-width: 720px) {\n  .boView-tasks .sectionHead {\n    align-items: center;\n  }\n\n  .boView-tasks .taskQueue {\n    gap: 9px;\n  }\n\n  .boView-tasks [class*=\"taskGroup\"] {\n    border-radius: 7px;\n  }\n\n  .boView-tasks .taskCard {\n    min-height: 76px;\n    padding: 12px 11px 12px 16px;\n  }\n\n  .boView-tasks .taskCardTop,\n  .boView-tasks .taskCardHead,\n  .boView-tasks .taskCardHeader {\n    display: grid;\n    grid-template-columns: 1fr auto;\n  }\n\n  .boView-tasks .taskCreated {\n    white-space: normal;\n    text-align: right;\n  }\n\n  .boView-tasks .detailHero {\n    border-radius: 7px;\n    padding: 14px;\n  }\n\n  .boView-tasks .powerTaskGrid,\n  .boView-tasks .taskStructuredGrid,\n  .boView-tasks .structuredFields,\n  .boView-tasks .detailGrid {\n    grid-template-columns: 1fr;\n  }\n\n  .boView-tasks .infoBox,\n  .boView-tasks .panel,\n  .boView-tasks .managerResubmitPanel,\n  .boView-tasks .returnPanel,\n  .boView-tasks .taskReturnPanel,\n  .boView-tasks .taskActionPanel {\n    padding: 12px;\n  }\n\n  .boView-tasks .versionRow {\n    align-items: flex-start;\n    flex-direction: column;\n  }\n\n  .boView-tasks .versionRow a {\n    display: block;\n    width: 100%;\n    min-height: 38px;\n    padding-top: 7px;\n  }\n}\n/* END_PART_V064_C_BLOCK_OFFICE_TASKS */";

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

if (!styles.includes('PART_V064_C_BLOCK_OFFICE_TASKS')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    styles.includes('PART_V064_C_BLOCK_OFFICE_TASKS'),
    'стили v064-C добавлены'
  ],
  [
    styles.includes('.boView-tasks .taskQueue'),
    'очередь задач стилизована'
  ],
  [
    styles.includes('.boView-tasks .taskCard'),
    'карточка задачи стилизована'
  ],
  [
    styles.includes('.boView-tasks .taskGroupNeedData'),
    'возвращённые задачи выделены'
  ],
  [
    styles.includes('.boView-tasks .taskCardUploadState'),
    'прогресс фоновой отправки стилизован'
  ],
  [
    styles.includes('.boView-tasks .detailHero'),
    'открытая задача стилизована'
  ],
  [
    styles.includes('.boView-tasks .powerTaskGrid'),
    'структурированные данные задачи стилизованы'
  ],
];

console.log('');
console.log('v064-C — Block Office Tasks');
console.log('===========================');

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
  console.log('v064-C уже установлен. Изменений нет.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

fs.copyFileSync(
  stylesFile,
  stylesFile + '.before-v064-c-' + stamp
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
console.log('v064-C применён. Изменён frontend/src/styles.css');
