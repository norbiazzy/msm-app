const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const paths = {
  service: path.join(root, 'backend', 'src', 'tasks', 'tasks.service.ts'),
  panel: path.join(root, 'frontend', 'src', 'PoaEtrnPanel.tsx'),
  structured: path.join(root, 'frontend', 'src', 'TaskStructuredFields.tsx'),
  app: path.join(root, 'frontend', 'src', 'App.tsx'),
  docs: path.join(root, 'frontend', 'src', 'EtrnSourceDocuments.tsx'),
  styles: path.join(root, 'frontend', 'src', 'styles.css'),
  panelTemplate: path.join(root, 'PoaEtrnPanel.v064-n2.tsx'),
  docsTemplate: path.join(root, 'EtrnSourceDocuments.v064-n2.tsx'),
  cssTemplate: path.join(root, 'styles-v064-n2.css'),
};

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) fail('Не найден файл: ' + file);
  const raw = fs.readFileSync(file, 'utf8');
  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
  };
}

function save(file, source, next) {
  if (source.text === next) return false;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(file, file + '.before-v064-n2-' + stamp);
  fs.writeFileSync(
    file,
    source.crlf ? next.replace(/\n/g, '\r\n') : next,
    'utf8'
  );
  return true;
}

const serviceSource = read(paths.service);
const panelSource = read(paths.panel);
const structuredSource = read(paths.structured);
const appSource = read(paths.app);
const stylesSource = read(paths.styles);
const panelTemplate = read(paths.panelTemplate).text;
const docsTemplate = read(paths.docsTemplate).text;
const cssTemplate = read(paths.cssTemplate).text;

let service = serviceSource.text;
let structured = structuredSource.text;
let app = appSource.text;
let styles = stylesSource.text;

const hasBaseFlow =
  service.includes('PART_V064_N1_V5B_ETRN_SERVICE') ||
  service.includes('PART_V064_N1_V5C_ETRN_SERVICE');

if (!hasBaseFlow) {
  fail('Не найдена базовая связка v064-N1 v5c. Сначала примените update-v064-n1-v5c-poa-etrn.');
}

/* 1. Replace createEtrn with authoritative N2 version. */
const methodStart = service.indexOf('  async createEtrn(');
const methodEnd = service.indexOf('\n  async completePowerOfAttorney(', methodStart);

if (methodStart < 0 || methodEnd < 0) {
  fail('Не удалось найти границы createEtrn() в tasks.service.ts.');
}

const newCreateEtrn = `  // PART_V064_N2_ETRN_BACKEND
  async createEtrn(
    body: {
      dealId: string;
      actorId: string;
      urgent?: boolean;
      poaTaskId?: string;
      supplierName?: string;
      details?: Record<string, unknown>;
      comment?: string;
    },
  ) {
    if (!body.poaTaskId) {
      throw new BadRequestException('Не выбрана готовая доверенность');
    }

    const requestDetails = body.details || {};

    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: body.dealId },
      include: {
        invoices: {
          where: { isCurrent: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { file: true },
        },
      },
    });

    const poaTask = await this.prisma.task.findFirstOrThrow({
      where: {
        id: body.poaTaskId,
        dealId: body.dealId,
        type: TaskType.POWER_OF_ATTORNEY,
      },
      select: {
        id: true,
        status: true,
        details: true,
      },
    });

    if (poaTask.status !== TaskStatus.DONE) {
      throw new BadRequestException('Доверенность ещё не готова');
    }

    const poaDetails =
      poaTask.details &&
      typeof poaTask.details === 'object' &&
      !Array.isArray(poaTask.details)
        ? poaTask.details as Record<string, unknown>
        : {};

    const poaNumber = String(poaDetails.poaNumber || '').trim();

    if (!poaNumber) {
      throw new BadRequestException('У готовой доверенности не указан номер');
    }

    const poaFile = await this.prisma.storedFile.findFirst({
      where: {
        dealId: body.dealId,
        category: 'POWER_OF_ATTORNEY_RESULT_' + body.poaTaskId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!poaFile) {
      throw new BadRequestException('Не найден файл готовой доверенности');
    }

    const currentInvoice = deal.invoices[0];

    if (!currentInvoice) {
      throw new BadRequestException('В сделке нет актуального счёта');
    }

    if (!currentInvoice.fileId) {
      throw new BadRequestException('У актуального счёта нет файла');
    }

    const deliveryAddresses = Array.isArray(deal.deliveryAddresses)
      ? deal.deliveryAddresses.filter((value): value is string => typeof value === 'string')
      : [];

    const value = (key: string, fallback = '') =>
      String(requestDetails[key] || fallback || '').trim();

    const details = {
      poaNumber,
      invoiceNumber: currentInvoice.number,
      invoiceSellerType: currentInvoice.sellerType,
      loadingAddress: value('loadingAddress'),
      unloadingAddress: value('unloadingAddress', deliveryAddresses[0] || ''),
      objectContactName: value('objectContactName', deal.contactName || ''),
      objectContactPhone: value('objectContactPhone', deal.clientPhone || ''),
      carrierCompany: value('carrierCompany'),
      carrierContactName: value('carrierContactName'),
      carrierPhone: value('carrierPhone'),
    };

    const required = [
      ['Адрес погрузки', details.loadingAddress],
      ['Адрес выгрузки', details.unloadingAddress],
      ['Имя контакта на объекте', details.objectContactName],
      ['Телефон контакта на объекте', details.objectContactPhone],
      ['Перевозчик / ООО', details.carrierCompany],
      ['Контакт перевозчика', details.carrierContactName],
      ['Телефон перевозчика', details.carrierPhone],
    ] as const;

    const missing = required.find(([, fieldValue]) => !fieldValue);

    if (missing) {
      throw new BadRequestException('Заполните поле: ' + missing[0]);
    }

    const existing = await this.prisma.task.findMany({
      where: {
        dealId: body.dealId,
        type: TaskType.ETRN,
        status: { not: TaskStatus.CANCELLED },
      },
    });

    const duplicate = existing.find((item) => {
      const payload =
        item.payload &&
        typeof item.payload === 'object' &&
        !Array.isArray(item.payload)
          ? item.payload as Record<string, unknown>
          : {};
      return String(payload.poaTaskId || '') === body.poaTaskId;
    });

    if (duplicate) {
      return { ...duplicate, deal };
    }

    const supplierName = body.supplierName?.trim();

    const task = await this.prisma.task.create({
      data: {
        dealId: body.dealId,
        type: TaskType.ETRN,
        status: TaskStatus.NEW,
        urgent: Boolean(body.urgent),
        title: supplierName ? 'Создать ЭТРН: ' + supplierName : 'Создать ЭТРН',
        description: body.comment?.trim() || undefined,
        createdById: body.actorId,
        details: details as any,
        payload: {
          kind: 'ETRN',
          poaTaskId: body.poaTaskId,
          poaNumber,
          poaFileId: poaFile.id,
          poaFileName: poaFile.originalName,
          invoiceId: currentInvoice.id,
          invoiceNumber: currentInvoice.number,
          invoiceSellerType: currentInvoice.sellerType,
          invoiceFileId: currentInvoice.fileId,
          invoiceFileName: currentInvoice.file?.originalName || null,
          supplierName: supplierName || null,
        } as any,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        dealId: body.dealId,
        actorId: body.actorId,
        action: 'ETRN_REQUESTED',
        entityType: 'Task',
        entityId: task.id,
        newValue: {
          poaTaskId: body.poaTaskId,
          poaNumber,
          poaFileId: poaFile.id,
          invoiceId: currentInvoice.id,
          invoiceNumber: currentInvoice.number,
          invoiceFileId: currentInvoice.fileId,
        },
        reason: body.comment?.trim() || undefined,
      },
    });

    return { ...task, deal };
  }
`;

service = service.slice(0, methodStart) + newCreateEtrn + service.slice(methodEnd);

/* 2. Replace only the ETRN branch in TaskStructuredFields. */
const etrnStart = structured.indexOf(`  if (\n    taskType ===\n    'ETRN'\n  ) {`);
const finalReturn = structured.indexOf('\n\n  return null;', etrnStart);

if (etrnStart < 0 || finalReturn < 0) {
  fail('Не найден текущий блок ETRN в TaskStructuredFields.tsx.');
}

const newEtrnFields = `  // PART_V064_N2_ETRN_STRUCTURED_FIELDS
  if (
    taskType ===
    'ETRN'
  ) {
    const invoiceNumber = stringValue(details.invoiceNumber);
    const invoiceSellerType = stringValue(details.invoiceSellerType);
    const invoiceSellerLabel = ({
      MSM: 'МСМ',
      ST: 'СТ',
      IP: 'ИП',
    } as Record<string, string>)[invoiceSellerType] || invoiceSellerType;
    const invoiceDisplay = invoiceNumber
      ? invoiceSellerLabel + ' - ' + invoiceNumber
      : '';

    return (
      <div className={readOnly ? 'taskStructuredRead' : 'taskStructuredEdit'}>
        <div className="taskStructuredTitle">Данные ЭТРН</div>

        <Field
          title="№ доверенности"
          value={stringValue(details.poaNumber)}
          readOnly
          onChange={() => {}}
        />

        <Field
          title="Актуальный счёт"
          value={invoiceDisplay}
          readOnly
          onChange={() => {}}
        />

        <Field
          title="Адрес погрузки"
          value={stringValue(details.loadingAddress)}
          readOnly={readOnly}
          multiline
          onChange={(next) => set('loadingAddress', next)}
        />

        <Field
          title="Адрес выгрузки"
          value={stringValue(details.unloadingAddress)}
          readOnly={readOnly}
          multiline
          onChange={(next) => set('unloadingAddress', next)}
        />

        <Field
          title="Контакт на объекте — имя"
          value={stringValue(details.objectContactName)}
          readOnly={readOnly}
          onChange={(next) => set('objectContactName', next)}
        />

        <Field
          title="Контакт на объекте — телефон"
          value={stringValue(details.objectContactPhone)}
          readOnly={readOnly}
          onChange={(next) => set('objectContactPhone', next)}
        />

        <Field
          title="Перевозчик / ООО"
          value={stringValue(details.carrierCompany)}
          readOnly={readOnly}
          onChange={(next) => set('carrierCompany', next)}
        />

        <Field
          title="Перевозчик — контактное лицо"
          value={stringValue(details.carrierContactName)}
          readOnly={readOnly}
          onChange={(next) => set('carrierContactName', next)}
        />

        <Field
          title="Перевозчик — телефон"
          value={stringValue(details.carrierPhone)}
          readOnly={readOnly}
          onChange={(next) => set('carrierPhone', next)}
        />
      </div>
    );
  }
`;

structured = structured.slice(0, etrnStart) + newEtrnFields + structured.slice(finalReturn);

/* 3. Accountant task gets automatic source documents. */
if (!app.includes("from './EtrnSourceDocuments'")) {
  const firstImport = app.indexOf('import ');
  if (firstImport < 0) fail('Не найдены imports в App.tsx.');
  app = app.slice(0, firstImport) + "import { EtrnSourceDocuments } from './EtrnSourceDocuments';\n" + app.slice(firstImport);
}

if (!app.includes('PART_V064_N2_ETRN_SOURCE_DOCS_UI')) {
  const anchor = `      {/* PART_1N_E1_STRUCTURED_TASK_DETAILS */}`;
  const at = app.indexOf(anchor);
  if (at < 0) fail('Не найден anchor structured task details в App.tsx.');
  const block = `      {/* PART_V064_N2_ETRN_SOURCE_DOCS_UI */}\n      {task.type === 'ETRN' && (\n        <EtrnSourceDocuments task={task} />\n      )}\n\n\n`;
  app = app.slice(0, at) + block + app.slice(at);
}

/* 4. CSS. */
if (!styles.includes('PART_V064_N2_ETRN_FIELDS')) {
  styles = styles.replace(/\s*$/, '') + '\n\n' + cssTemplate + '\n';
}

/* 5. Template compatibility checks. */
if (
  !panelSource.text.includes('PART_V064_N1_V5B_POA_ETRN_PANEL') &&
  !panelSource.text.includes('PART_V064_N2_ETRN_REQUEST_FORM')
) {
  fail('PoaEtrnPanel.tsx имеет неизвестную версию.');
}

if (fs.existsSync(paths.docs)) {
  const existing = fs.readFileSync(paths.docs, 'utf8');
  if (!existing.includes('PART_V064_N2_ETRN_SOURCE_DOCUMENTS')) {
    fail('EtrnSourceDocuments.tsx уже существует и имеет неизвестную версию.');
  }
}

const checks = [
  [service.includes('PART_V064_N2_ETRN_BACKEND'), 'backend N2'],
  [service.includes('poaFileId'), 'файл доверенности'],
  [service.includes('invoiceFileId'), 'файл актуального счёта'],
  [service.includes('objectContactName'), 'контакт объекта'],
  [service.includes('carrierCompany'), 'перевозчик'],
  [structured.includes('PART_V064_N2_ETRN_STRUCTURED_FIELDS'), 'новые поля ETRN'],
  [app.includes('PART_V064_N2_ETRN_SOURCE_DOCS_UI'), 'документы бухгалтеру'],
  [styles.includes('PART_V064_N2_ETRN_FIELDS'), 'стили'],
];

console.log('');
console.log('v064-N2 — поля заявки ЭТРН');
console.log('===========================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) fail('Проверка не пройдена: ' + label);
}

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

let changed = 0;
if (save(paths.service, serviceSource, service)) changed++;
if (save(paths.structured, structuredSource, structured)) changed++;
if (save(paths.app, appSource, app)) changed++;
if (save(paths.styles, stylesSource, styles)) changed++;
if (save(paths.panel, panelSource, panelTemplate)) changed++;

if (!fs.existsSync(paths.docs)) {
  fs.writeFileSync(paths.docs, docsTemplate, 'utf8');
  changed++;
}

console.log('');
console.log('v064-N2 применён. Изменено файлов: ' + changed);
