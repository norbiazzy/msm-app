const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const stylesFile =
  path.join(root, 'frontend', 'src', 'styles.css');
const appFile =
  path.join(root, 'frontend', 'src', 'App.tsx');

const cssContent = "/* PART_V064_I_TASK_LIST_ERGONOMICS */\n\n/* =========================\n   TASK LIST — ERGONOMICS\n   ========================= */\n\n.boView-tasks .content {\n  max-width: 1040px;\n  margin: 0 auto;\n}\n\n/* second level title should not compete with page title */\n.boView-tasks .content > h2,\n.boView-tasks .sectionTitle,\n.boView-tasks .taskColumnTitle,\n.boView-tasks .taskListTitle {\n  letter-spacing: -.02em;\n}\n\n.boView-tasks .sectionTitle,\n.boView-tasks .taskColumnTitle,\n.boView-tasks .taskListTitle {\n  font-size: clamp(28px, 2.6vw, 34px);\n  line-height: 1.08;\n}\n\n.boView-tasks .taskGroupTitle,\n.boView-tasks .taskSectionTitle,\n.boView-tasks .taskLaneTitle {\n  font-size: 13px;\n  font-weight: 900;\n  letter-spacing: .01em;\n}\n\n/* list group spacing */\n.boView-tasks .taskGroup,\n.boView-tasks .taskLane,\n.boView-tasks .taskSection {\n  margin-top: 10px;\n}\n\n/* main card */\n.boView-tasks .taskCard {\n  position: relative;\n  overflow: hidden;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 10px 12px;\n  align-items: start;\n  min-height: 126px;\n  padding: 15px 15px 14px 16px;\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: linear-gradient(180deg, color-mix(in srgb, var(--bo-panel) 92%, #000 8%) 0%, var(--bo-panel) 100%);\n  box-shadow: var(--bo-shadow);\n}\n\n.boView-tasks .taskCard::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 4px;\n  background: var(--bo-blue);\n  opacity: .95;\n}\n\n.boView-tasks .taskCard.task-new::before,\n.boView-tasks .taskCard[data-status='NEW']::before {\n  background: var(--bo-gold);\n}\n\n.boView-tasks .taskCard.task-need-data::before,\n.boView-tasks .taskCard[data-status='NEED_DATA']::before {\n  background: var(--bo-red);\n}\n\n.boView-tasks .taskCard.task-done::before,\n.boView-tasks .taskCard[data-status='DONE']::before {\n  background: var(--bo-green);\n}\n\n/* left content */\n.boView-tasks .taskCardHead,\n.boView-tasks .taskCardTop,\n.boView-tasks .taskCardHeader {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  min-width: 0;\n}\n\n.boView-tasks .taskCardTitle,\n.boView-tasks .taskCard h3,\n.boView-tasks .taskCard h4 {\n  margin: 0;\n  color: var(--bo-text);\n  font-size: 16px;\n  line-height: 1.24;\n  letter-spacing: -.015em;\n}\n\n.boView-tasks .taskCardClient,\n.boView-tasks .taskCard small,\n.boView-tasks .taskCard .taskCardSub {\n  color: var(--bo-muted);\n  font-size: 12px;\n  line-height: 1.35;\n}\n\n/* deal number becomes more visible */\n.boView-tasks .taskCardDeal,\n.boView-tasks .taskCardDealNumber,\n.boView-tasks .dealNumber,\n.boView-tasks .taskCard b.deal,\n.boView-tasks .taskCard .internalNumber {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  margin-top: 2px;\n  color: var(--bo-text);\n  font-size: 15px;\n  font-weight: 900;\n  line-height: 1.2;\n  letter-spacing: .005em;\n}\n\n.boView-tasks .taskCardDeal::before,\n.boView-tasks .taskCardDealNumber::before,\n.boView-tasks .dealNumber::before,\n.boView-tasks .taskCard .internalNumber::before {\n  content: '■';\n  color: var(--bo-accent);\n  font-size: 9px;\n  transform: translateY(-.5px);\n}\n\n/* invoice/org line */\n.boView-tasks .taskCardInvoiceMeta,\n.boView-tasks .taskCardMetaLine,\n.boView-tasks .taskCardSellerMeta {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  align-items: center;\n  margin-top: 5px;\n}\n\n.boView-tasks .taskCardInvoiceMeta .metaPill,\n.boView-tasks .taskCardMetaLine .metaPill,\n.boView-tasks .taskCardSellerMeta .metaPill {\n  display: inline-flex;\n  align-items: center;\n  min-height: 24px;\n  border: 1px solid var(--bo-line);\n  border-radius: 999px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 850;\n  padding: 4px 8px;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskCardInvoiceMeta .metaPill strong,\n.boView-tasks .taskCardMetaLine .metaPill strong,\n.boView-tasks .taskCardSellerMeta .metaPill strong {\n  color: var(--bo-text);\n  margin-left: 4px;\n}\n\n/* created + footer */\n.boView-tasks .taskCardFooter,\n.boView-tasks .taskMetaFooter {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 8px 12px;\n  margin-top: 8px;\n  color: var(--bo-muted);\n  font-size: 11px;\n}\n\n/* right side status */\n.boView-tasks .taskCardSide,\n.boView-tasks .taskCardStatusWrap,\n.boView-tasks .taskStatusSlot {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  justify-content: space-between;\n  gap: 10px;\n  min-width: 88px;\n  height: 100%;\n}\n\n.boView-tasks .statusPill,\n.boView-tasks .taskCardStatus,\n.boView-tasks .taskStatusBadge {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 29px;\n  padding: 6px 9px;\n  border-radius: 5px;\n  border: 1px solid var(--bo-line);\n  background: var(--bo-panel-2);\n  color: var(--bo-blue);\n  font-size: 11px;\n  font-weight: 900;\n  white-space: nowrap;\n}\n\n.boView-tasks .statusPill.new,\n.boView-tasks .taskCardStatus.new,\n.boView-tasks .taskStatusBadge.new {\n  color: var(--bo-gold);\n}\n\n.boView-tasks .statusPill.need-data,\n.boView-tasks .taskCardStatus.need-data,\n.boView-tasks .taskStatusBadge.need-data {\n  color: #9b6dff;\n}\n\n.boView-tasks .statusPill.done,\n.boView-tasks .taskCardStatus.done,\n.boView-tasks .taskStatusBadge.done {\n  color: var(--bo-green);\n}\n\n/* need-data return note inside card */\n.boView-tasks .taskNeedDataBox,\n.boView-tasks .needDataBox,\n.boView-tasks .managerFixCard {\n  margin-top: 10px;\n  border: 1px solid color-mix(in srgb, var(--bo-gold) 40%, var(--bo-line));\n  border-radius: 8px;\n  background: color-mix(in srgb, var(--bo-gold) 12%, var(--bo-panel));\n  padding: 11px 12px;\n}\n\n.boView-tasks .taskNeedDataBox strong,\n.boView-tasks .needDataBox strong,\n.boView-tasks .managerFixCard strong {\n  display: block;\n  margin: 0 0 4px;\n  color: #ffbe3d;\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.boView-tasks .taskNeedDataBox p,\n.boView-tasks .needDataBox p,\n.boView-tasks .managerFixCard p {\n  margin: 0 0 4px;\n  color: var(--bo-text);\n  font-size: 12px;\n  line-height: 1.45;\n}\n\n.boView-tasks .taskNeedDataBox a,\n.boView-tasks .needDataBox a,\n.boView-tasks .managerFixCard a {\n  display: inline-flex;\n  margin-top: 5px;\n  color: #ffbe3d;\n  font-size: 12px;\n  font-weight: 900;\n  text-decoration: none;\n}\n\n/* summary counter blocks */\n.boView-tasks .taskCounter,\n.boView-tasks .laneCounter,\n.boView-tasks .taskCountBadge {\n  min-width: 38px;\n  min-height: 38px;\n  border-radius: 8px;\n  font-size: 15px;\n  font-weight: 900;\n}\n\n/* mobile */\n@media (max-width: 720px) {\n  .boView-tasks .taskCard {\n    grid-template-columns: 1fr;\n    gap: 8px;\n    min-height: 0;\n    padding: 13px 12px 12px 14px;\n  }\n\n  .boView-tasks .taskCardSide,\n  .boView-tasks .taskCardStatusWrap,\n  .boView-tasks .taskStatusSlot {\n    min-width: 0;\n    flex-direction: row;\n    align-items: center;\n    justify-content: space-between;\n  }\n\n  .boView-tasks .taskCardTitle,\n  .boView-tasks .taskCard h3,\n  .boView-tasks .taskCard h4 {\n    font-size: 15px;\n  }\n\n  .boView-tasks .taskCardDeal,\n  .boView-tasks .taskCardDealNumber,\n  .boView-tasks .dealNumber,\n  .boView-tasks .taskCard .internalNumber {\n    font-size: 14px;\n  }\n\n  .boView-tasks .taskCardInvoiceMeta,\n  .boView-tasks .taskCardMetaLine,\n  .boView-tasks .taskCardSellerMeta,\n  .boView-tasks .taskCardFooter,\n  .boView-tasks .taskMetaFooter {\n    gap: 6px;\n  }\n\n  .boView-tasks .statusPill,\n  .boView-tasks .taskCardStatus,\n  .boView-tasks .taskStatusBadge {\n    min-height: 27px;\n    font-size: 10px;\n  }\n}\n\n/* END_PART_V064_I_TASK_LIST_ERGONOMICS */";

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
const appSource = read(appFile);

let styles = stylesSource.text;
let app = appSource.text;

if (!styles.includes('PART_V064_I_TASK_LIST_ERGONOMICS')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

/* Remove duplicate "Задачи" wording in inner section headers */
const replacements = [
  ['Задачи бухгалтерии', 'Бухгалтерия'],
  ['Задачи менеджера', 'Менеджер'],
  ['Задачи руководителя', 'Руководитель'],
  ['Задачи логиста', 'Логистика'],
];

for (const [from, to] of replacements) {
  if (app.includes(from)) {
    app = app.replace(from, to);
  }
}

/* Small wording clean-up */
if (app.includes('Активных задач:')) {
  app = app.replace('Активных задач:', 'Активно:');
}

const checks = [
  [
    styles.includes('PART_V064_I_TASK_LIST_ERGONOMICS'),
    'CSS списка задач добавлен'
  ],
  [
    styles.includes('.boView-tasks .taskCard'),
    'карточки задач стилизованы'
  ],
  [
    styles.includes('.taskCardDealNumber'),
    'номер сделки усилен'
  ],
  [
    styles.includes('.taskCardInvoiceMeta'),
    'слот под счёт/организацию добавлен'
  ],
  [
    !app.includes('Задачи бухгалтерии'),
    'дубль слова «Задачи» убран'
  ],
  [
    styles.includes('@media (max-width: 720px)'),
    'mobile учтён'
  ],
];

console.log('');
console.log('v064-I — Task List Ergonomics');
console.log('=============================');

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
    'v064-i'
  )
) changed++;

if (
  writeWithBackup(
    appFile,
    appSource,
    app,
    'v064-i'
  )
) changed++;

console.log('');
console.log(
  'v064-I применён. Изменено файлов: ' + changed
);
