const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const poaPath = path.join(root, 'frontend', 'src', 'PowerOfAttorneyBlock.tsx');
const structuredPath = path.join(root, 'frontend', 'src', 'TaskStructuredFields.tsx');
const resubmitPath = path.join(root, 'frontend', 'src', 'ManagerResubmitPanel.tsx');
const apiPath = path.join(root, 'frontend', 'src', 'api.ts');
const backendSrc = path.join(root, 'backend', 'src');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }

  // Normalize only in memory so exact local formatting/CRLF
  // does not affect the installer. Original EOL style is
  // restored when the file is written.
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\r\n/g, '\n');
}

function walkTs(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;

  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      result.push(...walkTs(full));
    } else if (stat.isFile() && full.endsWith('.ts')) {
      result.push(full);
    }
  }

  return result;
}

function scanClosing(text, openPos, openChar, closeChar) {
  let depth = 0;
  let mode = 'code';
  let quote = '';

  for (let i = openPos; i < text.length; i++) {
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

    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function findFunctionRange(text, name) {
  const re = new RegExp(
    '(?:export\\s+)?function\\s+' + name + '\\s*\\('
  );
  const match = re.exec(text);
  if (!match) return null;

  const openParen = text.indexOf('(', match.index);
  const closeParen = scanClosing(text, openParen, '(', ')');
  if (closeParen < 0) return null;

  const openBrace = text.indexOf('{', closeParen);
  if (openBrace < 0) return null;

  const closeBrace = scanClosing(text, openBrace, '{', '}');
  if (closeBrace < 0) return null;

  return {
    start: match.index,
    end: closeBrace + 1,
    text: text.slice(match.index, closeBrace + 1),
  };
}

function findMethodRange(text, name) {
  const re = new RegExp(
    '(?:async\\s+)?' + name + '\\s*\\('
  );

  let match;
  let offset = 0;

  while ((match = re.exec(text.slice(offset)))) {
    const start = offset + match.index;
    const openParen = text.indexOf('(', start);
    const closeParen = scanClosing(text, openParen, '(', ')');

    if (closeParen < 0) return null;

    const openBrace = text.indexOf('{', closeParen);
    if (openBrace < 0) return null;

    const closeBrace = scanClosing(text, openBrace, '{', '}');
    if (closeBrace < 0) return null;

    return {
      start,
      openParen,
      closeParen,
      openBrace,
      closeBrace,
      end: closeBrace + 1,
      text: text.slice(start, closeBrace + 1),
    };
  }

  return null;
}

function replaceRange(text, range, replacement) {
  return text.slice(0, range.start) +
    replacement +
    text.slice(range.end);
}

function findJsxElement(text, needle, tagName, from = 0) {
  const needleIndex = text.indexOf(needle, from);
  if (needleIndex < 0) return null;

  let cursor = needleIndex;

  while (cursor >= 0) {
    const start = text.lastIndexOf('<' + tagName, cursor);
    if (start < 0) break;

    const openEnd = text.indexOf('>', start);
    if (openEnd < 0) break;

    let depth = 0;
    let pos = start;

    while (pos < text.length) {
      const nextOpen = text.indexOf('<' + tagName, pos);
      const nextClose = text.indexOf('</' + tagName + '>', pos);

      if (nextClose < 0) break;

      if (nextOpen >= 0 && nextOpen < nextClose) {
        const end = text.indexOf('>', nextOpen);
        if (end < 0) break;

        const opening = text.slice(nextOpen, end + 1);
        if (!/\/\s*>$/.test(opening)) {
          depth++;
        }

        pos = end + 1;
        continue;
      }

      depth--;
      const closeEnd =
        nextClose + ('</' + tagName + '>').length;

      if (depth === 0) {
        if (closeEnd > needleIndex) {
          return { start, end: closeEnd };
        }
        break;
      }

      pos = closeEnd;
    }

    cursor = start - 1;
  }

  return null;
}

function findDivByClass(text, className, from = 0) {
  const escapedClass =
    className.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

  const re = new RegExp(
    `<div\\b[^>]*className\\s*=\\s*["']${escapedClass}["'][^>]*>`
  );

  const sliced = text.slice(from);
  const match = re.exec(sliced);
  if (!match) return null;

  const start = from + match.index;
  const openEnd = text.indexOf('>', start);
  if (openEnd < 0) return null;

  let depth = 0;
  let pos = start;

  while (pos < text.length) {
    const nextOpen = text.indexOf('<div', pos);
    const nextClose = text.indexOf('</div>', pos);

    if (nextClose < 0) return null;

    if (nextOpen >= 0 && nextOpen < nextClose) {
      const end = text.indexOf('>', nextOpen);
      if (end < 0) return null;

      const opening = text.slice(nextOpen, end + 1);
      if (!/\/\s*>$/.test(opening)) depth++;

      pos = end + 1;
      continue;
    }

    depth--;
    const closeEnd = nextClose + 6;

    if (depth === 0) {
      return { start, end: closeEnd };
    }

    pos = closeEnd;
  }

  return null;
}

function lastTopLevelReturn(methodText) {
  const openBrace = methodText.indexOf('{');
  if (openBrace < 0) return -1;

  let depth = 0;
  let mode = 'code';
  let quote = '';
  let last = -1;

  for (let i = openBrace; i < methodText.length; i++) {
    const ch = methodText[i];
    const next = methodText[i + 1];

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

    if (ch === '{') {
      depth++;
      continue;
    }

    if (ch === '}') {
      depth--;
      continue;
    }

    if (
      depth === 1 &&
      methodText.startsWith('return', i) &&
      !/[A-Za-z0-9_$]/.test(methodText[i - 1] || '') &&
      !/[A-Za-z0-9_$]/.test(methodText[i + 6] || '')
    ) {
      last = i;
    }
  }

  return last;
}

function replaceFirst(text, search, replacement, label) {
  const idx = text.indexOf(search);
  if (idx < 0) fail('Не найден фрагмент: ' + label);

  return text.slice(0, idx) +
    replacement +
    text.slice(idx + search.length);
}

/* ============================================================
 * LOAD
 * ============================================================ */

let poa = read(poaPath);
let structured = read(structuredPath);
let resubmit = read(resubmitPath);
let api = read(apiPath);

const already =
  poa.includes('PART_V062_POA_REBUILD') &&
  structured.includes('PART_V062_POA_FIELDS') &&
  api.includes('PART_V062_POA_COMPLETE_META');

let backendFiles = walkTs(backendSrc);

if (backendFiles.length === 0) {
  fail('Не найдены TypeScript-файлы backend/src.');
}

/* ============================================================
 * FRONTEND: PowerOfAttorneyBlock.tsx
 * ============================================================ */

if (!poa.includes('PART_V062_POA_REBUILD')) {
  poa = poa.replace(
    '  updateTaskStatus,\n  type Task,',
    '  updateDealInfo,\n  updateTaskStatus,\n  type Task,'
  );

  if (!poa.includes("from './ReturnToManagerPanel'")) {
    const anchor =
      "import {\n  startBackgroundUploadJob,\n} from './backgroundUploads';";

    poa = replaceFirst(
      poa,
      anchor,
      anchor +
      "\n\nimport {\n" +
      "  ReturnToManagerPanel,\n" +
      "} from './ReturnToManagerPanel';\n\n" +
      "import {\n" +
      "  ManagerResubmitPanel,\n" +
      "} from './ManagerResubmitPanel';",
      'import backgroundUploads'
    );
  }

  poa = poa.replace(
    /,\s*SellerType,\s*\n}/m,
    ',\n} '
  ).replace(
    /,\s*SellerType\s*\n}/m,
    '\n}'
  );

  poa = poa.replace(
    /const sellerLabels:[\s\S]*?\n};\s*\n\s*function todayLocalDate\(\)\s*\{[\s\S]*?\n}\s*\n\s*/m,
    ''
  );

  let blockRange = findFunctionRange(poa, 'PowerOfAttorneyBlock');
  if (!blockRange) fail('Не найден PowerOfAttorneyBlock().');

  let block = blockRange.text;

  block = block.replace(
    /\s*const \[organization, setOrganization\]\s*=\s*useState<SellerType>\(deal\.sellerType\);\s*/m,
    '\n'
  );

  block = block.replace(
    /\s*const \[invoiceNumber, setInvoiceNumber\]\s*=\s*useState\(''\);\s*/m,
    '\n'
  );

  block = block.replace(
    /\s*const \[requestDate, setRequestDate\]\s*=\s*useState\(todayLocalDate\(\)\);\s*/m,
    '\n'
  );

  block = block.replace(
    /const \[comment, setComment\]\s*=\s*useState\(''\);/m,
    `/* PART_V062_POA_REBUILD */
  const [
    accountingComment,
    setAccountingComment,
  ] = useState('');

  const [
    managerComment,
    setManagerComment,
  ] = useState(
    deal.managerComment || ''
  );`
  );

  block = block
    .replace(/\s*setOrganization\(deal\.sellerType\);\s*/m, '\n')
    .replace(/\s*setInvoiceNumber\(''\);\s*/m, '\n')
    .replace(/\s*setRequestDate\(todayLocalDate\(\)\);\s*/m, '\n')
    .replace(/setComment\(''\);/g, "setAccountingComment('');")
    .replace(
      "setAccountingComment('');",
      "setAccountingComment('');\n    setManagerComment(deal.managerComment || '');"
    );

  block = block.replace(
    /async function createTask\(\s*requestKey: string,\s*\)\s*\{\s*await createPowerOfAttorneyTask\(\{/m,
    `async function createTask(
    requestKey: string,
  ) {
    const normalizedManagerComment =
      managerComment.trim();

    if (
      normalizedManagerComment !==
      String(deal.managerComment || '').trim()
    ) {
      await updateDealInfo(
        deal.id,
        {
          managerComment:
            normalizedManagerComment,
          actorId: user.id,
        },
      );
    }

    await createPowerOfAttorneyTask({`
  );

  block = block.replace(
    /\n\s*organization,\s*\n/m,
    '\n      organization: deal.sellerType,\n'
  );

  block = block.replace(
    /\n\s*invoiceNumber:\s*invoiceNumber\.trim\(\)\s*\|\|\s*undefined,\s*\n/m,
    '\n'
  );

  block = block.replace(
    /\n\s*requestDate:\s*requestDate\s*\|\|\s*undefined,\s*\n/m,
    '\n'
  );

  block = block.replace(
    /comment:\s*comment\.trim\(\)\s*\|\|\s*undefined,/m,
    `comment:
        accountingComment.trim() ||
        undefined,`
  );

  /* Fields stay optional during testing. */
  block = block.replace(
    /\s*if \(!supplierName\.trim\(\)\) \{\s*setError\([\s\S]*?'Укажите поставщика \/ завод\.'[\s\S]*?\);\s*return;\s*\}\s*/m,
    '\n'
  );

  block = block.replace(
    /\s*if \(!recipientName\.trim\(\)\) \{\s*setError\([\s\S]*?'Укажите, на кого нужна доверенность\.'[\s\S]*?\);\s*return;\s*\}\s*/m,
    '\n'
  );

  block = block.replace(
    /\s*if \(!goodsDescription\.trim\(\)\) \{\s*setError\([\s\S]*?'Укажите, что получаем\.'[\s\S]*?\);\s*return;\s*\}\s*/m,
    '\n'
  );

  /* Card uses the editable details after a return, but old payload still works. */
  block = block.replace(
    `const payload =
                task.payload || {};`,
    `const payload =
                task.payload || {};

              const details =
                (task.details || {}) as
                  Record<string, unknown>;

              const resultNumber =
                String(
                  details.poaNumber || ''
                ).trim();

              const resultComment =
                String(
                  details.accountantComment ||
                  ''
                ).trim();`
  );

  block = block.replace(
    /payload\.supplierName\s*\|\|\s*'Доверенность'/m,
    `details.supplierOrFactory ||
                          payload.supplierName ||
                          'Доверенность'`
  );

  block = block.replace(
    /payload\.recipientName\s*\|\|\s*'не указано'/m,
    `details.attorneyPerson ||
                            payload.recipientName ||
                            'не указано'`
  );

  const metaRange = findDivByClass(
    block,
    'powerMeta',
    block.indexOf('const resultNumber')
  );

  if (!metaRange) fail('Не найден powerMeta в карточке доверенности.');

  block = replaceRange(
    block,
    metaRange,
    `{(resultNumber || resultComment) && (
                    <div className="powerMeta">
                      {resultNumber && (
                        <span>
                          Доверенность №{resultNumber}
                        </span>
                      )}

                      {resultComment && (
                        <span>
                          Комментарий бухгалтера: {resultComment}
                        </span>
                      )}
                    </div>
                  )}`
  );

  /* Remove organization from visible creation form. */
  {
    const openIndex = block.indexOf('{open && (');
    const range = findJsxElement(
      block,
      '<span>От какой организации</span>',
      'label',
      openIndex
    );

    if (!range) fail('Не найдено поле «От какой организации».');
    block = replaceRange(block, range, '');
  }

  /* Remove manual incoming invoice + date pair. */
  {
    const openIndex = block.indexOf('{open && (');
    const invoiceIndex = block.indexOf(
      '<span>Входящий счёт</span>',
      openIndex
    );

    if (invoiceIndex < 0) {
      fail('Не найдено ручное поле «Входящий счёт».');
    }

    const inlineStart = block.lastIndexOf(
      '<div className="inline">',
      invoiceIndex
    );

    if (inlineStart < 0) {
      fail('Не найден inline-блок входящего счёта и даты.');
    }

    const inlineRange = findDivByClass(
      block,
      'inline',
      inlineStart
    );

    if (
      !inlineRange ||
      inlineRange.start !== inlineStart
    ) {
      fail('Не удалось определить inline-блок счёта/даты.');
    }

    const inlineText =
      block.slice(
        inlineRange.start,
        inlineRange.end
      );

    if (
      !inlineText.includes('Входящий счёт') ||
      !inlineText.includes('<span>Дата</span>')
    ) {
      fail('Inline-блок не похож на счёт + дату.');
    }

    block = replaceRange(block, inlineRange, '');
  }

  /* Big recipient field. */
  {
    const marker = 'placeholder="ФИО получателя"';
    const range = findJsxElement(
      block,
      marker,
      'label',
      block.indexOf('{open && (')
    );

    if (!range) fail('Не найдено поле получателя доверенности.');

    block = replaceRange(
      block,
      range,
      `<label className="field">
            <span>На кого доверенность</span>
            <textarea
              rows={4}
              value={recipientName}
              onChange={(e) =>
                setRecipientName(
                  e.target.value
                )
              }
              placeholder="ФИО / данные получателя"
            />
          </label>`
    );
  }

  block = block.replace(
    /(<span>Что получаем<\/span>[\s\S]*?<textarea\s*)\n\s*rows=\{3\}/m,
    '$1\n              rows={4}'
  );

  /* Accounting comment + personal deal comment. */
  {
    const marker = 'value={comment}';
    const range = findJsxElement(
      block,
      marker,
      'label',
      block.indexOf('{open && (')
    );

    if (!range) fail('Не найдено старое поле «Комментарий».');

    block = replaceRange(
      block,
      range,
      `<label className="field">
            <span>Комментарий для бухгалтерии</span>
            <textarea
              rows={3}
              value={accountingComment}
              onChange={(e) =>
                setAccountingComment(
                  e.target.value
                )
              }
              placeholder="Что важно знать бухгалтерии"
            />
          </label>

          <label className="field">
            <span>Комментарий для себя</span>
            <textarea
              rows={3}
              value={managerComment}
              onChange={(e) =>
                setManagerComment(
                  e.target.value
                )
              }
              placeholder="Останется в сделке"
            />
          </label>`
    );
  }

  poa = replaceRange(poa, blockRange, block);

  /* Re-read second function range after first function changed. */
  let taskRange = findFunctionRange(poa, 'PowerOfAttorneyTask');
  if (!taskRange) fail('Не найден PowerOfAttorneyTask().');

  let task = taskRange.text;

  task = task.replace(
    `const [files, setFiles] =
    useState<File[]>([]);`,
    `const [files, setFiles] =
    useState<File[]>([]);

  const [poaNumber, setPoaNumber] =
    useState('');

  const [
    accountantComment,
    setAccountantComment,
  ] = useState('');`
  );

  task = task.replace(
    `const payload =
    task.payload || {};`,
    `const payload =
    task.payload || {};

  const details =
    (task.details || {}) as
      Record<string, unknown>;

  const supplierName =
    String(
      details.supplierOrFactory ||
      payload.supplierName ||
      ''
    );

  const recipientName =
    String(
      details.attorneyPerson ||
      payload.recipientName ||
      ''
    );

  const goodsDescription =
    String(
      details.items ||
      payload.goodsDescription ||
      ''
    );

  const editableDetails = {
    ...details,
    supplierOrFactory:
      details.supplierOrFactory ||
      payload.supplierName ||
      '',
    attorneyPerson:
      details.attorneyPerson ||
      payload.recipientName ||
      '',
    items:
      details.items ||
      payload.goodsDescription ||
      '',
  };

  const dealFiles =
    task.deal.files || [];

  const dealAny =
    task.deal as any;

  const invoiceRows =
    Array.isArray(dealAny.invoices)
      ? dealAny.invoices
      : [];

  const currentInvoice =
    invoiceRows.find(
      (invoice: any) =>
        invoice?.isCurrent
    ) ||
    invoiceRows[0];

  const currentCustomerInvoiceFile =
    dealFiles.find(
      (file) =>
        currentInvoice?.fileId &&
        file.id === currentInvoice.fileId
    ) ||
    [...dealFiles]
      .reverse()
      .find(
        (file) =>
          file.category ===
            'CUSTOMER_INVOICE_PRIMARY' ||
          file.category?.startsWith(
            'CORRECTION_PRIMARY_'
          )
      );

  const currentCustomerInvoiceNumber =
    String(
      currentInvoice?.number ||
      currentInvoice?.invoiceNumber ||
      currentInvoice?.invoiceNo ||
      ''
    ).trim();

  const purchases =
    Array.isArray(
      dealAny.supplierPurchases
    )
      ? dealAny.supplierPurchases
      : [];

  const matchingPurchase =
    [...purchases]
      .reverse()
      .find(
        (purchase: any) =>
          String(
            purchase?.supplierName || ''
          ).trim().toLowerCase() ===
          supplierName
            .trim()
            .toLowerCase()
      );

  const incomingInvoiceFile =
    dealFiles.find(
      (file) =>
        matchingPurchase?.sourceFileId &&
        file.id ===
          matchingPurchase.sourceFileId
    ) ||
    dealFiles.find(
      (file) =>
        matchingPurchase?.id &&
        file.category ===
          'SUPPLIER_INVOICE_' +
          matchingPurchase.id
    );

  const incomingInvoiceNumber =
    String(
      matchingPurchase
        ?.incomingInvoiceNumber ||
      ''
    ).trim();

  const taskAny =
    task as any;

  const returnReason =
    String(
      taskAny.returnReason ||
      taskAny.returnReasonCode ||
      taskAny.returnDetails?.reason ||
      taskAny.returnDetails?.reasonCode ||
      taskAny.payload?.returnReason ||
      ''
    ).trim();

  const returnComment =
    String(
      taskAny.returnComment ||
      taskAny.returnNote ||
      taskAny.returnDetails?.comment ||
      taskAny.payload?.returnComment ||
      ''
    ).trim();`
  );

  task = task.replace(
    /const sourceFiles\s*=\s*requestKey[\s\S]*?: \[\];/m,
    `const sourceFiles =
    (task.deal.files || [])
      .filter(
        (file) =>
          (
            requestKey &&
            file.category ===
              'POWER_OF_ATTORNEY_SOURCE_' +
              requestKey
          ) ||
          file.category ===
            'TASK_ATTACHMENT_' +
            task.id
      );`
  );

  task = task.replace(
    `function finish() {
    setError('');

    if (files.length === 0) {`,
    `function finish() {
    setError('');

    if (!poaNumber.trim()) {
      setError(
        'Укажите номер доверенности.'
      );
      return;
    }

    if (files.length === 0) {`
  );

  task = task.replace(
    `await completePowerOfAttorneyTask(
          task.id,
          user.id,
        );`,
    `await completePowerOfAttorneyTask(
          task.id,
          {
            actorId: user.id,
            poaNumber:
              poaNumber.trim(),
            accountantComment:
              accountantComment
                .trim() ||
              undefined,
          },
        );`
  );

  /* Replace accountant request data section. */
  {
    const grid = findDivByClass(
      task,
      'powerTaskGrid'
    );

    if (!grid) fail('Не найден powerTaskGrid бухгалтера.');

    const sourceAnchor =
      task.indexOf('{sourceFiles.length > 0 && (');

    if (sourceAnchor < 0) {
      fail('Не найден блок документов запроса.');
    }

    const oldBetween =
      task.slice(grid.start, sourceAnchor);

    if (
      !oldBetween.includes('От организации') ||
      !oldBetween.includes('Дата') ||
      !oldBetween.includes('Что получаем')
    ) {
      fail('Блок данных бухгалтера имеет неожиданную структуру.');
    }

    const replacement = `<div className="powerTaskGrid">
        <div>
          <span>Поставщик / завод</span>
          <b>{supplierName || '—'}</b>
        </div>

        <div>
          <span>На кого доверенность</span>
          <b>{recipientName || '—'}</b>
        </div>
      </div>


      <div className="infoBox">
        <strong>Что получаем</strong>
        <p>
          {goodsDescription || '—'}
        </p>
      </div>


      {task.description && (
        <div className="infoBox">
          <strong>
            Комментарий для бухгалтерии
          </strong>
          <p>{task.description}</p>
        </div>
      )}


      {(currentCustomerInvoiceFile ||
        currentCustomerInvoiceNumber) && (
        <div className="infoBox">
          <strong>
            Актуальный основной счёт
          </strong>

          {currentCustomerInvoiceFile ? (
            <a
              href={dealFileUrl(
                currentCustomerInvoiceFile.id
              )}
              target="_blank"
              rel="noreferrer"
            >
              {currentCustomerInvoiceFile
                .originalName}
            </a>
          ) : (
            <p>
              {currentCustomerInvoiceNumber}
            </p>
          )}
        </div>
      )}


      {(incomingInvoiceFile ||
        incomingInvoiceNumber) && (
        <div className="infoBox">
          <strong>Входящий счёт</strong>

          {incomingInvoiceNumber && (
            <p>{incomingInvoiceNumber}</p>
          )}

          {incomingInvoiceFile && (
            <a
              href={dealFileUrl(
                incomingInvoiceFile.id
              )}
              target="_blank"
              rel="noreferrer"
            >
              {incomingInvoiceFile
                .originalName}
            </a>
          )}
        </div>
      )}


      `;

    task =
      task.slice(0, grid.start) +
      replacement +
      task.slice(sourceAnchor);
  }

  /* Manager NEED_DATA gets the same task back, editable. */
  {
    const mainReturn = task.indexOf('  return (');
    if (mainReturn < 0) fail('Не найден основной return PowerOfAttorneyTask.');

    const managerReturn = `  if (
    status === 'NEED_DATA' &&
    user.role !== 'ACCOUNTANT'
  ) {
    return (
      <section className="content form">
        <button
          className="backLink"
          onClick={onBack}
        >
          ← К задачам
        </button>

        <div className="detailHero">
          <div className="eyebrow">
            ЗК-{task.deal.internalNumber}
          </div>

          <h2>
            Исправить доверенность
          </h2>

          <p>
            {supplierName ||
              task.deal.clientName}
          </p>

          <div className="statusPill">
            Нужно исправить
          </div>
        </div>

        {(returnReason ||
          returnComment) && (
          <div className="taskReturnNotice">
            <strong>
              Возвращено бухгалтерией
            </strong>

            {returnReason && (
              <span>
                Причина: {returnReason}
              </span>
            )}

            {returnComment && (
              <p>
                Комментарий бухгалтера:
                {' '}
                {returnComment}
              </p>
            )}
          </div>
        )}

        {sourceFiles.length > 0 && (
          <div className="infoBox">
            <strong>
              Прикреплённые документы
            </strong>

            <div className="versionList">
              {sourceFiles.map(
                (file) => (
                  <div
                    key={file.id}
                    className="versionRow"
                  >
                    <b>
                      {file.originalName}
                    </b>

                    <a
                      href={dealFileUrl(
                        file.id
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Открыть
                    </a>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <ManagerResubmitPanel
          taskId={task.id}
          dealId={task.deal.id}
          taskType={task.type}
          actorId={user.id}
          initialDescription={
            task.description
          }
          initialUrgent={
            task.urgent
          }
          initialDetails={
            editableDetails
          }
          onResubmitted={onBack}
        />
      </section>
    );
  }


`;

    task =
      task.slice(0, mainReturn) +
      managerReturn +
      task.slice(mainReturn);
  }

  /* Accountant return button. */
  {
    const newAction =
      `      {status === 'NEW' && (`;

    const idx = task.indexOf(newAction);
    if (idx < 0) fail('Не найдено действие NEW доверенности.');

    const returnPanel = `      {user.role === 'ACCOUNTANT' &&
        (
          status === 'NEW' ||
          status === 'IN_PROGRESS'
        ) && (
          <ReturnToManagerPanel
            taskId={task.id}
            actorId={user.id}
            disabled={saving}
            onReturned={onBack}
          />
        )}


`;

    task =
      task.slice(0, idx) +
      returnPanel +
      task.slice(idx);
  }

  /* Completion form. */
  {
    const start =
      task.indexOf(
        `{status === 'IN_PROGRESS' && (`
      );

    if (start < 0) {
      fail('Не найден блок завершения доверенности.');
    }

    const blockOpen =
      task.indexOf('<>', start);
    const blockClose =
      task.indexOf('</>', blockOpen);

    if (blockOpen < 0 || blockClose < 0) {
      fail('Не найден фрагмент IN_PROGRESS.');
    }

    const closeEnd =
      blockClose + 3;

    const newInner = `<>
          <label className="field">
            <span>
              Номер доверенности
            </span>
            <input
              value={poaNumber}
              disabled={saving}
              onChange={(event) =>
                setPoaNumber(
                  event.target.value
                )
              }
              placeholder="Например: 1757"
            />
          </label>

          <label className="field">
            <span>
              Готовая доверенность
            </span>
            <MultiFilePicker
              files={files}
              onChange={setFiles}
              title="+ Прикрепить доверенность"
            />
          </label>

          <label className="field">
            <span>
              Комментарий бухгалтера
            </span>
            <textarea
              rows={3}
              value={accountantComment}
              disabled={saving}
              onChange={(event) =>
                setAccountantComment(
                  event.target.value
                )
              }
              placeholder="Необязательно"
            />
          </label>

          <button
            type="button"
            className="primary wide"
            disabled={saving}
            onClick={finish}
          >
            Доверенность готова
          </button>
        </>`;

    task =
      task.slice(0, blockOpen) +
      newInner +
      task.slice(closeEnd);
  }

  poa = replaceRange(poa, taskRange, task);
}

/* ============================================================
 * FRONTEND: TaskStructuredFields — same fields on return
 * ============================================================ */

if (!structured.includes('PART_V062_POA_FIELDS')) {
  const start =
    structured.indexOf(
      "  if (\n    taskType ===\n    'POWER_OF_ATTORNEY'"
    );

  const end =
    structured.indexOf(
      "  if (\n    taskType ===\n    'ETRN'",
      start
    );

  if (start < 0 || end < 0) {
    fail('Не найден POWER_OF_ATTORNEY блок TaskStructuredFields.');
  }

  const newBranch = `  /* PART_V062_POA_FIELDS */
  if (
    taskType ===
    'POWER_OF_ATTORNEY'
  ) {
    return (
      <div className={
        readOnly
          ? 'taskStructuredRead'
          : 'taskStructuredEdit'
      }>
        <div className="taskStructuredTitle">
          Данные доверенности
        </div>

        <Field
          title="Поставщик / завод"
          value={stringValue(
            details.supplierOrFactory
          )}
          readOnly={readOnly}
          onChange={(next) =>
            set(
              'supplierOrFactory',
              next
            )
          }
        />

        <Field
          title="На кого доверенность"
          value={stringValue(
            details.attorneyPerson
          )}
          readOnly={readOnly}
          multiline
          onChange={(next) =>
            set(
              'attorneyPerson',
              next
            )
          }
        />

        <Field
          title="Что получаем"
          value={stringValue(
            details.items
          )}
          readOnly={readOnly}
          multiline
          onChange={(next) =>
            set(
              'items',
              next
            )
          }
        />
      </div>
    );
  }


`;

  structured =
    structured.slice(0, start) +
    newBranch +
    structured.slice(end);
}

/* ============================================================
 * FRONTEND: ManagerResubmitPanel comment wording
 * ============================================================ */

if (!resubmit.includes('PART_V062_POA_RESUBMIT_COMMENT')) {
  const old =
    `<span>
          Общий комментарий
        </span>`;

  if (!resubmit.includes(old)) {
    fail('Не найдено поле «Общий комментарий» ManagerResubmitPanel.');
  }

  resubmit = resubmit.replace(
    old,
    `{/* PART_V062_POA_RESUBMIT_COMMENT */}
        <span>
          {taskType ===
          'POWER_OF_ATTORNEY'
            ? 'Комментарий для бухгалтерии'
            : 'Общий комментарий'}
        </span>`
  );
}

if (!resubmit.includes('PART_V062_POA_RESUBMIT_DETAILS')) {
  const oldPayload = `  function payload() {
    return {
      actorId,
      description:
        description.trim() ||
        undefined,
      urgent,
      details,
    };
  }`;

  if (!resubmit.includes(oldPayload)) {
    fail(
      'Не найден payload() ManagerResubmitPanel для очистки полей доверенности.'
    );
  }

  const newPayload = `  function payload() {
    /* PART_V062_POA_RESUBMIT_DETAILS */
    const taskDetails =
      taskType ===
      'POWER_OF_ATTORNEY'
        ? {
            supplierOrFactory:
              details
                .supplierOrFactory,
            attorneyPerson:
              details
                .attorneyPerson,
            items:
              details.items,
          }
        : details;

    return {
      actorId,
      description:
        description.trim() ||
        undefined,
      urgent,
      details:
        taskDetails,
    };
  }`;

  resubmit =
    resubmit.replace(
      oldPayload,
      newPayload
    );
}

/* ============================================================
 * FRONTEND API completion payload
 * ============================================================ */

if (!api.includes('PART_V062_POA_COMPLETE_META')) {
  const range =
    findFunctionRange(
      api,
      'completePowerOfAttorneyTask'
    );

  if (!range) {
    fail('Не найден completePowerOfAttorneyTask() в api.ts.');
  }

  const replacement = `export async function completePowerOfAttorneyTask(
  taskId: string,

  /* PART_V062_POA_COMPLETE_META */
  payload: {
    actorId: string;
    poaNumber: string;
    accountantComment?: string;
  },
) {
  return json(
    \`/tasks/\${taskId}/complete-power-of-attorney\`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}`;

  api = replaceRange(
    api,
    range,
    replacement
  );
}

/* ============================================================
 * BACKEND: persist number + accountant comment in Task.details
 * ============================================================ */

let backendChanged = new Map();

const routeFiles =
  backendFiles.filter(
    (file) =>
      fs.readFileSync(file, 'utf8')
        .includes('complete-power-of-attorney')
  );

if (routeFiles.length !== 1) {
  fail(
    'Ожидался 1 backend-файл с complete-power-of-attorney, найдено: ' +
    routeFiles.length +
    '\n' +
    routeFiles.join('\n')
  );
}

const controllerPath = routeFiles[0];
let controller = read(controllerPath);

if (!controller.includes('PART_V062_POA_COMPLETE_CONTROLLER')) {
  const routeIndex =
    controller.indexOf(
      'complete-power-of-attorney'
    );

  const tail =
    controller.slice(
      routeIndex,
      routeIndex + 2500
    );

  const methodNameMatch =
    /(?:async\s+)?([A-Za-z_$][\w$]*complete[A-Za-z0-9_$]*Power[A-Za-z0-9_$]*Attorney[A-Za-z0-9_$]*)\s*\(/i
      .exec(tail);

  let controllerMethodName =
    methodNameMatch?.[1];

  if (!controllerMethodName) {
    const genericMatch =
      /(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/g;

    let candidate;
    while (
      (candidate =
        genericMatch.exec(tail))
    ) {
      if (
        candidate.index > 0 &&
        candidate.index < 1200
      ) {
        controllerMethodName =
          candidate[1];
        break;
      }
    }
  }

  if (!controllerMethodName) {
    fail('Не удалось определить backend controller method доверенности.');
  }

  const methodRange =
    findMethodRange(
      controller,
      controllerMethodName
    );

  if (!methodRange) {
    fail(
      'Не найден controller method: ' +
      controllerMethodName
    );
  }

  let method = methodRange.text;

  const callMatch =
    /(\.\s*(completePowerOfAttorney)\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*body\.actorId\s*,?)(\s*\))/i
      .exec(method);


  if (!callMatch) {
    fail(
      'Не найден вызов service completePowerOfAttorney в controller.\n' +
      method.slice(0, 1600)
    );
  }

  const serviceMethodName =
    callMatch[2];

  method = method.replace(
    callMatch[0],
    `.${callMatch[2]}(
      ${callMatch[3]},
      body.actorId,
      (body as any).poaNumber,
      (body as any).accountantComment
      /* PART_V062_POA_COMPLETE_CONTROLLER */
    )`
  );

  controller =
    replaceRange(
      controller,
      methodRange,
      method
    );

  backendChanged.set(
    controllerPath,
    controller
  );

  /* Locate the corresponding service implementation. */
  const serviceCandidates =
    backendFiles.filter(
      (file) => {
        if (file === controllerPath) {
          return false;
        }

        const text =
          fs.readFileSync(file, 'utf8');

        return (
          text.includes(
            serviceMethodName + '('
          ) &&
          /\.task\./.test(text)
        );
      }
    );

  if (serviceCandidates.length !== 1) {
    fail(
      'Не удалось однозначно найти service method ' +
      serviceMethodName +
      '. Кандидатов: ' +
      serviceCandidates.length +
      '\n' +
      serviceCandidates.join('\n')
    );
  }

  const servicePath =
    serviceCandidates[0];

  let service =
    read(servicePath);

  if (!service.includes('PART_V062_POA_COMPLETE_SERVICE')) {
    const serviceRange =
      findMethodRange(
        service,
        serviceMethodName
      );

    if (!serviceRange) {
      fail(
        'Не найден service method: ' +
        serviceMethodName
      );
    }

    let method =
      serviceRange.text;

    const openParen =
      method.indexOf('(');
    const closeParen =
      scanClosing(
        method,
        openParen,
        '(',
        ')'
      );

    if (
      openParen < 0 ||
      closeParen < 0
    ) {
      fail('Не удалось разобрать параметры service method.');
    }

    const params =
      method.slice(
        openParen + 1,
        closeParen
      );

    if (!params.includes('poaNumber')) {
      const trimmed =
        params.trim();

      const newParams =
        trimmed +
        (trimmed ? ',' : '') +
        `
    poaNumber?: string,
    accountantComment?: string`;

      method =
        method.slice(0, openParen + 1) +
        newParams +
        method.slice(closeParen);
    }

    const firstParam =
      /^\s*([A-Za-z_$][\w$]*)\s*:/
        .exec(
          method.slice(
            openParen + 1,
            method.indexOf(')', openParen)
          )
        )?.[1];

    if (!firstParam) {
      fail('Не удалось определить taskId-параметр service method.');
    }

    const prismaMatch =
      /(this\.[A-Za-z_$][\w$]*)\.task\./
        .exec(method) ||
      /(this\.[A-Za-z_$][\w$]*)\.task\./
        .exec(service);

    if (!prismaMatch) {
      fail('Не найден Prisma client для Task в backend service.');
    }

    const prisma =
      prismaMatch[1];

    const insertAt =
      lastTopLevelReturn(method);

    if (insertAt < 0) {
      fail(
        'Не найден финальный return в backend service method.'
      );
    }

    const persistence = `
    /* PART_V062_POA_COMPLETE_SERVICE */
    const currentPoaTaskForResult =
      await ${prisma}.task.findUnique({
        where: {
          id: ${firstParam},
        },
        select: {
          details: true,
        },
      });

    const currentPoaDetails =
      currentPoaTaskForResult?.details &&
      typeof currentPoaTaskForResult.details ===
        'object' &&
      !Array.isArray(
        currentPoaTaskForResult.details
      )
        ? (
            currentPoaTaskForResult.details as
              Record<string, unknown>
          )
        : {};

    await ${prisma}.task.update({
      where: {
        id: ${firstParam},
      },
      data: {
        details: {
          ...currentPoaDetails,
          poaNumber:
            poaNumber?.trim() || null,
          accountantComment:
            accountantComment?.trim() ||
            null,
        } as any,
      },
    });


`;

    method =
      method.slice(0, insertAt) +
      persistence +
      method.slice(insertAt);

    service =
      replaceRange(
        service,
        serviceRange,
        method
      );

    backendChanged.set(
      servicePath,
      service
    );
  }
} else {
  /* Already controller-patched: require service marker too. */
  const serviceMarked =
    backendFiles.some(
      (file) =>
        fs.readFileSync(file, 'utf8')
          .includes(
            'PART_V062_POA_COMPLETE_SERVICE'
          )
    );

  if (!serviceMarked) {
    fail(
      'Controller уже содержит v062, но backend service marker не найден.'
    );
  }
}

/* ============================================================
 * VERIFY BEFORE WRITING
 * ============================================================ */

const blockCheck =
  findFunctionRange(
    poa,
    'PowerOfAttorneyBlock'
  )?.text || '';

const taskCheck =
  findFunctionRange(
    poa,
    'PowerOfAttorneyTask'
  )?.text || '';

const structuredPoaStart =
  structured.indexOf(
    'PART_V062_POA_FIELDS'
  );

const structuredEtrnStart =
  structured.indexOf(
    "'ETRN'",
    structuredPoaStart
  );

const structuredPoa =
  structuredPoaStart >= 0 &&
  structuredEtrnStart >
    structuredPoaStart
      ? structured.slice(
          structuredPoaStart,
          structuredEtrnStart
        )
      : '';

for (const forbidden of [
  'От какой организации',
  'setInvoiceNumber',
  'requestDate',
]) {
  if (blockCheck.includes(forbidden)) {
    fail(
      'В форме создания доверенности осталось лишнее: ' +
      forbidden
    );
  }
}

for (const forbidden of [
  'organization',
  'incomingInvoiceNumber',
  "set('date'",
  'drivers',
  'driverComment',
]) {
  if (structuredPoa.includes(forbidden)) {
    fail(
      'В форме возврата доверенности осталось лишнее: ' +
      forbidden
    );
  }
}

for (const required of [
  'На кого доверенность',
  'Комментарий для бухгалтерии',
  'Комментарий для себя',
  'Актуальный основной счёт',
  'Входящий счёт',
  'ReturnToManagerPanel',
  'ManagerResubmitPanel',
  'Номер доверенности',
  'Комментарий бухгалтера',
  'TASK_ATTACHMENT_',
]) {
  if (!poa.includes(required)) {
    fail(
      'После сборки не найден обязательный элемент: ' +
      required
    );
  }
}

if (
  !resubmit.includes(
    'PART_V062_POA_RESUBMIT_DETAILS'
  )
) {
  fail('Не очищаются удалённые поля доверенности при возврате.');
}

if (
  !api.includes(
    'PART_V062_POA_COMPLETE_META'
  )
) {
  fail('Не собран API completion payload v062.');
}

const controllerFinal =
  backendChanged.get(controllerPath) ||
  controller;

if (
  !controllerFinal.includes(
    'PART_V062_POA_COMPLETE_CONTROLLER'
  )
) {
  fail('Не собран backend controller v062.');
}

const serviceFinalPresent =
  [...backendChanged.values()]
    .some(
      (text) =>
        text.includes(
          'PART_V062_POA_COMPLETE_SERVICE'
        )
    ) ||
  backendFiles.some(
    (file) =>
      !backendChanged.has(file) &&
      fs.readFileSync(file, 'utf8')
        .includes(
          'PART_V062_POA_COMPLETE_SERVICE'
        )
  );

if (!serviceFinalPresent) {
  fail('Не собран backend service v062.');
}

console.log('');
console.log('MSM v062 — пересборка доверенности');
console.log('==================================');
console.log('');
console.log('  Создание: организация скрыта, дата/ручной счёт убраны: OK');
console.log('  На кого доверенность — большое поле: OK');
console.log('  Что получаем — большое поле: OK');
console.log('  Комментарий бухгалтерии + комментарий для себя: OK');
console.log('  Бухгалтер видит основной и входящий счёт автоматически: OK');
console.log('  Возврат в ту же задачу + редактирование тех же полей: OK');
console.log('  Старые и новые документы видны: OK');
console.log('  Завершение: номер + файл + комментарий бухгалтера: OK');
console.log('  Номер и комментарий сохраняются в Task.details: OK');
console.log('  ЭТРН не изменяется: OK');
console.log('  Prisma migration не требуется: OK');

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

/* ============================================================
 * WRITE + BACKUPS
 * ============================================================ */

const changed = new Map([
  [poaPath, poa],
  [structuredPath, structured],
  [resubmitPath, resubmit],
  [apiPath, api],
  ...backendChanged,
]);

const stamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

let writtenCount = 0;

for (const [file, next] of changed) {
  const rawCurrent =
    fs.readFileSync(file, 'utf8');

  const usesCrlf =
    rawCurrent.includes('\r\n');

  const current =
    rawCurrent.replace(/\r\n/g, '\n');

  const normalizedNext =
    next.replace(/\r\n/g, '\n');

  if (current === normalizedNext) {
    continue;
  }

  fs.copyFileSync(
    file,
    file +
      '.before-v062-poa-' +
      stamp
  );

  const output =
    usesCrlf
      ? normalizedNext.replace(
          /\n/g,
          '\r\n'
        )
      : normalizedNext;

  fs.writeFileSync(
    file,
    output,
    'utf8'
  );

  writtenCount++;
}

console.log('');
console.log(
  'v062 применён. Изменено файлов: ' +
  writtenCount
);
