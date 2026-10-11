const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(root, 'frontend', 'src', 'App.tsx');
const panelPath = path.join(root, 'frontend', 'src', 'InvoiceRequestTaskPanel.tsx');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

function findMatching(text, start, openToken, closeToken) {
  let depth = 0;
  let pos = start;

  while (pos < text.length) {
    const nextOpen = text.indexOf(openToken, pos);
    const nextClose = text.indexOf(closeToken, pos);

    if (nextClose < 0) return -1;

    if (nextOpen >= 0 && nextOpen < nextClose) {
      const end = text.indexOf('>', nextOpen);
      if (end < 0) return -1;
      const selfClosing = text[end - 1] === '/';
      if (!selfClosing) depth++;
      pos = end + 1;
      continue;
    }

    depth--;
    const closeEnd = nextClose + closeToken.length;

    if (depth === 0) {
      return closeEnd;
    }

    pos = closeEnd;
  }

  return -1;
}

function findFunctionRange(text, functionName) {
  const re = new RegExp(
    '(?:export\\s+)?function\\s+' + functionName + '\\s*\\('
  );
  const match = re.exec(text);
  if (!match) return null;

  const start = match.index;
  const openParen = text.indexOf('(', match.index);
  if (openParen < 0) return null;

  let parenDepth = 0;
  let closeParen = -1;
  let mode = 'code';
  let quote = '';

  for (let i = openParen; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'line') {
      if (ch === '\n') mode = 'code';
      continue;
    }
    if (mode === 'block') {
      if (ch === '*' && next === '/') {
        mode = 'code';
        i++;
      }
      continue;
    }
    if (mode === 'string') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) mode = 'code';
      continue;
    }
    if (ch === '/' && next === '/') {
      mode = 'line';
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      mode = 'block';
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === '(') parenDepth++;
    if (ch === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        closeParen = i;
        break;
      }
    }
  }

  if (closeParen < 0) return null;

  const openBrace = text.indexOf('{', closeParen + 1);
  if (openBrace < 0) return null;

  let depth = 0;
  mode = 'code';
  quote = '';

  for (let i = openBrace; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'line') {
      if (ch === '\n') mode = 'code';
      continue;
    }
    if (mode === 'block') {
      if (ch === '*' && next === '/') {
        mode = 'code';
        i++;
      }
      continue;
    }
    if (mode === 'string') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) mode = 'code';
      continue;
    }
    if (ch === '/' && next === '/') {
      mode = 'line';
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      mode = 'block';
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return {
          start,
          end: i + 1,
          text: text.slice(start, i + 1),
        };
      }
    }
  }

  return null;
}

function replaceFunction(text, range, newBody) {
  return text.slice(0, range.start) + newBody + text.slice(range.end);
}

function findEnclosingTagByNeedle(text, needle, tagName) {
  const needleIndex = text.indexOf(needle);
  if (needleIndex < 0) return null;

  let search = needleIndex;

  while (search >= 0) {
    const start = text.lastIndexOf('<' + tagName, search);
    if (start < 0) break;

    const openEnd = text.indexOf('>', start);
    if (openEnd < 0) break;

    const closeEnd = findMatching(
      text,
      start,
      '<' + tagName,
      '</' + tagName + '>'
    );

    if (closeEnd > needleIndex) {
      return { start, end: closeEnd };
    }

    search = start - 1;
  }

  return null;
}

function removeEnclosingTagByNeedle(text, needle, tagNames) {
  for (const tagName of tagNames) {
    const range = findEnclosingTagByNeedle(text, needle, tagName);
    if (range) {
      return {
        text: text.slice(0, range.start) + text.slice(range.end),
        removed: true,
      };
    }
  }

  return { text, removed: false };
}

function findDivByClass(text, className) {
  const patterns = [
    `<div className="${className}">`,
    `<div\n`,
  ];

  let idx = text.indexOf(patterns[0]);

  if (idx < 0) {
    const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `<div\\b[^>]*className\\s*=\\s*["']${escapedClass}["'][^>]*>`
    );
    const match = re.exec(text);
    if (match) idx = match.index;
  }

  if (idx < 0) return null;

  const end = findMatching(text, idx, '<div', '</div>');
  if (end < 0) return null;

  return { start: idx, end };
}

let app = read(appPath);
let panel = read(panelPath);

/*
 * =========================================================
 * 1. NEW DEAL / INITIAL MANAGER FORM
 * =========================================================
 */

let newDealRange = findFunctionRange(app, 'NewDealForm');
if (!newDealRange) {
  fail('Не найден NewDealForm().');
}

let newDeal = newDealRange.text;

/* no default seller */
if (!newDeal.includes('PART_V061_SELLER_REQUIRED')) {
  const sellerStateRegex =
    /const\s+\[sellerType,\s*setSellerType\]\s*=\s*useState<SellerType>\(\s*['"]MSM['"]\s*\);/m;

  if (!sellerStateRegex.test(newDeal)) {
    fail('Не найден sellerType = MSM в NewDealForm.');
  }

  newDeal = newDeal.replace(
    sellerStateRegex,
    `/* PART_V061_SELLER_REQUIRED */
  const [sellerType, setSellerType] =
    useState<SellerType | ''>('');`
  );
}

/* remove requestMode state if present */
newDeal = newDeal.replace(
  /const\s+\[requestMode,\s*setRequestMode\]\s*=\s*useState<[\s\S]*?>\(\s*['"]TEXT['"]\s*\);\s*/m,
  ''
);

/* remove visible request mode control if it exists */
{
  const result = removeEnclosingTagByNeedle(
    newDeal,
    'Формат запроса',
    ['Field', 'label', 'div']
  );
  newDeal = result.text;
}

/* wording */
newDeal = newDeal
  .replace(/Комментарий бухгалтерии/g, 'Комментарий для бухгалтерии')
  .replace(/Комментарий менеджера/g, 'Комментарий для себя (сделки)');

/* mandatory validation */
if (!newDeal.includes('PART_V061_VALIDATE_SELLER')) {
  const anchor = 'const primaryIncomingInvoice =';
  const idx = newDeal.indexOf(anchor);

  if (idx < 0) {
    fail('Не найдено место отправки NewDealForm.');
  }

  const validation = `/* PART_V061_VALIDATE_SELLER */
      if (!sellerType) {
        setError(
          'Выберите, от какой организации выставлять счёт: СТ, МСМ или ИП.'
        );
        return;
      }


      `;

  newDeal =
    newDeal.slice(0, idx) +
    validation +
    newDeal.slice(idx);
}

/* remove stale requestMode UI label wording if any remains */
if (newDeal.includes('Формат запроса')) {
  fail('В NewDealForm осталось видимое поле «Формат запроса».');
}

app = replaceFunction(app, newDealRange, newDeal);


/*
 * =========================================================
 * 2. ACCOUNTANT VIEW — InvoiceRequestDataCard
 * =========================================================
 */

let dataRange = findFunctionRange(panel, 'InvoiceRequestDataCard');
if (!dataRange) {
  fail('Не найден InvoiceRequestDataCard().');
}

let dataCard = dataRange.text;

if (!dataCard.includes('PART_V061_ACCOUNTANT_FIELDS')) {
  const grid = findDivByClass(dataCard, 'invoiceTaskDataGrid');
  if (!grid) {
    fail('Не найден invoiceTaskDataGrid.');
  }

  const cleanGrid = `<div className="invoiceTaskDataGrid">
        {/* PART_V061_ACCOUNTANT_FIELDS */}

        <RequestField
          title="От какой организации выставлять"
          value={
            sellerLabels[
              data.sellerType
            ]
          }
        />

        <RequestField
          title="На кого выставлять"
          value={
            data.clientName
          }
        />
      </div>`;

  dataCard =
    dataCard.slice(0, grid.start) +
    cleanGrid +
    dataCard.slice(grid.end);
}

/* remove delivery address block from accountant task */
{
  const result = removeEnclosingTagByNeedle(
    dataCard,
    'Адрес / адреса доставки',
    ['div']
  );
  dataCard = result.text;
}

dataCard = dataCard.replace(
  /Комментарий бухгалтерии/g,
  'Комментарий для бухгалтерии'
);

for (const forbidden of [
  'Формат запроса',
  'Контактное лицо',
  'Телефон',
  'Условия',
  'Значение',
  'Адрес / адреса доставки',
]) {
  if (dataCard.includes(forbidden)) {
    fail(
      'В InvoiceRequestDataCard осталось лишнее поле: ' +
      forbidden
    );
  }
}

panel = replaceFunction(panel, dataRange, dataCard);


/*
 * =========================================================
 * 3. MANAGER REPAIR FORM AFTER RETURN
 * =========================================================
 */

let repairRange = findFunctionRange(panel, 'InvoiceRequestManagerRepair');
if (!repairRange) {
  fail('Не найден InvoiceRequestManagerRepair().');
}

let repair = repairRange.text;

/* request mode */
{
  const result = removeEnclosingTagByNeedle(
    repair,
    'Формат запроса',
    ['label', 'Field', 'div']
  );
  repair = result.text;
}

/* contact + phone are in one inline div */
{
  const contactIndex = repair.indexOf('Контактное лицо');
  if (contactIndex >= 0) {
    let search = contactIndex;
    let removed = false;

    while (search >= 0) {
      const start = repair.lastIndexOf('<div', search);
      if (start < 0) break;

      const openEnd = repair.indexOf('>', start);
      if (openEnd < 0) break;

      const opening = repair.slice(start, openEnd + 1);

      if (/className\s*=\s*["']inline["']/.test(opening)) {
        const end = findMatching(repair, start, '<div', '</div>');
        if (end < 0) {
          fail('Не удалось закрыть inline с контактом/телефоном.');
        }

        const block = repair.slice(start, end);

        if (
          block.includes('Контактное лицо') &&
          block.includes('Телефон')
        ) {
          repair =
            repair.slice(0, start) +
            repair.slice(end);
          removed = true;
          break;
        }
      }

      search = start - 1;
    }

    if (!removed) {
      fail('Не удалось убрать Контактное лицо + Телефон из формы возврата.');
    }
  }
}

/* address */
{
  const result = removeEnclosingTagByNeedle(
    repair,
    'Адрес / адреса доставки',
    ['label', 'div']
  );
  repair = result.text;
}

/* margin/conditions block */
if (repair.includes('PART_1N_K4_V3_HIDE_TERMS_UI')) {
  const markerIndex = repair.indexOf('PART_1N_K4_V3_HIDE_TERMS_UI');
  const start = repair.lastIndexOf('<div', markerIndex);
  if (start < 0) {
    fail('Не найден div скрытых условий.');
  }

  const end = findMatching(repair, start, '<div', '</div>');
  if (end < 0) {
    fail('Не найден конец div скрытых условий.');
  }

  repair =
    repair.slice(0, start) +
    repair.slice(end);
} else if (repair.includes('Условия')) {
  const result = removeEnclosingTagByNeedle(
    repair,
    'Условия',
    ['div', 'label']
  );
  repair = result.text;
}

/* urgent toggle is not editable on return */
{
  const result = removeEnclosingTagByNeedle(
    repair,
    'Срочно',
    ['label']
  );
  repair = result.text;
}

repair = repair.replace(
  /Комментарий бухгалтерии/g,
  'Комментарий для бухгалтерии'
);

/* exact seller wording in edit form */
repair = repair.replace(
  /От кого выставляем/g,
  'От какой организации выставлять'
);

/* add marker near edit form heading */
if (!repair.includes('PART_V061_MANAGER_REPAIR_FIELDS')) {
  repair = repair.replace(
    '<h3>\n          Исправить запрос\n        </h3>',
    `<h3>
          Исправить запрос
        </h3>

        {/* PART_V061_MANAGER_REPAIR_FIELDS */}`
  );
}

for (const forbidden of [
  'Формат запроса',
  'Контактное лицо',
  'Телефон',
  'Адрес / адреса доставки',
  'Условия',
  'Значение',
]) {
  if (repair.includes(forbidden)) {
    fail(
      'В InvoiceRequestManagerRepair осталось лишнее поле: ' +
      forbidden
    );
  }
}

/*
 * Do not fail on word "Срочно" in comments/messages unless urgentToggle remains.
 */
if (repair.includes('className="urgentToggle"')) {
  fail('В форме возврата остался переключатель «Срочно».');
}

panel = replaceFunction(panel, repairRange, repair);


/*
 * =========================================================
 * 4. FINAL VERIFICATION
 * =========================================================
 */

if (!app.includes("useState<SellerType | ''>('')")) {
  fail('sellerType всё ещё имеет значение по умолчанию.');
}

if (!app.includes('PART_V061_VALIDATE_SELLER')) {
  fail('Не добавлена обязательная проверка sellerType.');
}

if (!panel.includes('PART_V061_ACCOUNTANT_FIELDS')) {
  fail('Не собран новый набор полей бухгалтера.');
}

if (!panel.includes('PART_V061_MANAGER_REPAIR_FIELDS')) {
  fail('Не собран новый набор полей возврата менеджеру.');
}

console.log('');
console.log('Проверка v061 — новая форма счёта');
console.log('================================');
console.log('');
console.log('  Новая сделка: организация без значения по умолчанию: OK');
console.log('  Новая сделка: организация обязательна: OK');
console.log('  Вариант/формат запроса убран из UI: OK');
console.log('  Бухгалтер: оставлен только утверждённый набор полей: OK');
console.log('  Условия / наценка / значение убраны из task UI: OK');
console.log('  Возврат менеджеру: тот же набор полей, что видит бухгалтер: OK');
console.log('  Контакт / телефон / адрес в сделке сохранены, но бухгалтеру не показываются');
console.log('  Срочно остаётся признаком задачи, но не редактируется в форме возврата');
console.log('  Backend / Prisma не меняются');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

for (const file of [appPath, panelPath]) {
  fs.copyFileSync(
    file,
    file + '.before-v061-invoice-form-' + stamp
  );
}

write(appPath, app);
write(panelPath, panel);

console.log('');
console.log('v061 применён.');
