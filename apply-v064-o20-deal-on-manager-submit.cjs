const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const marker =
  'PART_V064_O20_DEAL_ON_MANAGER_SUBMIT';

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' + message
  );
  process.exit(1);
}

function readFile(file) {
  if (!fs.existsSync(file)) {
    fail(
      'Не найден: ' +
      path.relative(root, file)
    );
  }

  const raw =
    fs.readFileSync(
      file,
      'utf8'
    );

  return {
    raw,
    crlf:
      raw.includes('\r\n'),
    text:
      raw.replace(
        /\r\n/g,
        '\n'
      ),
  };
}

const appFile =
  readFile(appPath);

let app =
  appFile.text;

if (
  app.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O2.0 уже установлен.'
  );
  process.exit(0);
}

/* ==========================================================
   Ищем только NewDealForm.submit().
   ========================================================== */

const newDealStart =
  app.indexOf(
    'function NewDealForm('
  );

if (newDealStart < 0) {
  fail(
    'App.tsx: NewDealForm не найден.'
  );
}

const nextFunctionCandidates = [
  app.indexOf(
    '\nfunction TasksView(',
    newDealStart + 1
  ),
  app.indexOf(
    '\nfunction ',
    newDealStart + 20
  ),
].filter(
  (value) =>
    value > newDealStart
);

const newDealEnd =
  nextFunctionCandidates.length
    ? Math.min(
        ...nextFunctionCandidates
      )
    : app.length;

let block =
  app.slice(
    newDealStart,
    newDealEnd
  );

if (
  !block.includes(
    'await createDeal({'
  )
) {
  fail(
    'NewDealForm: createDeal не найден.'
  );
}

if (
  !block.includes(
    'deferInvoiceTask:'
  )
) {
  fail(
    'NewDealForm: deferInvoiceTask не найден.'
  );
}

if (
  !block.includes(
    'startBackgroundUploadJob({'
  )
) {
  fail(
    'NewDealForm: background upload не найден.'
  );
}

if (
  !block.includes(
    'await submitInvoiceRequest('
  )
) {
  fail(
    'NewDealForm: submitInvoiceRequest не найден.'
  );
}

if (
  !block.includes(
    'onCreated();'
  )
) {
  fail(
    'NewDealForm: onCreated() не найден.'
  );
}

/* ==========================================================
   Находим участок:
   if (filesToUpload.length > 0) { ... }
   else { await submitInvoiceRequest(...) }
   onCreated();

   Используем структурные якоря только внутри NewDealForm.
   ========================================================== */

const ifStart =
  block.indexOf(
    `      if (
        filesToUpload.length > 0
      ) {`
  );

if (ifStart < 0) {
  fail(
    'NewDealForm: не найден текущий if filesToUpload.'
  );
}

const onCreatedIndex =
  block.indexOf(
    '      onCreated();',
    ifStart
  );

if (onCreatedIndex < 0) {
  fail(
    'NewDealForm: onCreated после upload-блока не найден.'
  );
}

const afterOnCreated =
  onCreatedIndex +
  '      onCreated();'.length;

const oldFlow =
  block.slice(
    ifStart,
    afterOnCreated
  );

if (
  !oldFlow.includes(
    'startBackgroundUploadJob({'
  ) ||
  !oldFlow.includes(
    'await submitInvoiceRequest('
  ) ||
  !oldFlow.includes(
    '} else {'
  )
) {
  fail(
    'NewDealForm: текущая схема отличается от ожидаемой; файлы не изменены.'
  );
}

/* ==========================================================
   Новое правило:
   1) createDeal уже выполнен;
   2) всегда стартуем background job — даже без файлов;
   3) сразу onCreated() => пользователь видит сделку в списке;
   4) upload + создание задачи бухгалтеру продолжаются в фоне.
   ========================================================== */

const newFlow =
`      // ${marker}
      // Сделка уже создана выше.
      // Сразу запускаем фоновую отправку и возвращаем
      // менеджера в список сделок. Создание задачи
      // бухгалтеру больше не блокирует появление сделки.
      startBackgroundUploadJob({

        dealId:
          deal.id,

        title:
          filesToUpload.length > 0
            ? 'Отправляем бухгалтерии'
            : 'Создаём запрос на счёт',

        successTitle:
          'Запрос отправлен бухгалтерии',

        subtitle:
          clientName.trim() ||
          'Новая сделка',

        files:
          filesToUpload,

        run:
          async ({
            upload,
            setProgress,
          }) => {

            let uploadIndex = 0;


            if (primaryIncomingInvoice) {

              await upload(
                deal.id,
                primaryIncomingInvoice,
                'CUSTOMER_INVOICE_PRIMARY',
                uploadIndex,
                filesToUpload.length,
              );

              uploadIndex++;
            }


            for (
              let index = 0;
              index <
                extraFilesToUpload.length;
              index++
            ) {

              await upload(
                deal.id,
                extraFilesToUpload[
                  index
                ],
                'MANAGER_ATTACHMENT',
                uploadIndex,
                filesToUpload.length,
              );

              uploadIndex++;
            }


            setProgress(
              filesToUpload.length > 0
                ? 96
                : 70
            );

            await submitInvoiceRequest(
              deal.id,
              {
                actorId:
                  user.id,
                urgent,
              },
            );

            setProgress(99);
          },
      });


      // С этого момента ЗК уже должна быть видна
      // менеджеру в списке сделок независимо от
      // скорости загрузки файлов / создания задачи.
      onCreated();
`;

block =
  block.slice(
    0,
    ifStart
  ) +
  newFlow +
  block.slice(
    afterOnCreated
  );

app =
  app.slice(
    0,
    newDealStart
  ) +
  block +
  app.slice(
    newDealEnd
  );

/* ==========================================================
   Проверки до записи
   ========================================================== */

const patchedStart =
  app.indexOf(
    'function NewDealForm('
  );

const patchedEndCandidates = [
  app.indexOf(
    '\nfunction TasksView(',
    patchedStart + 1
  ),
  app.indexOf(
    '\nfunction ',
    patchedStart + 20
  ),
].filter(
  (value) =>
    value > patchedStart
);

const patchedEnd =
  patchedEndCandidates.length
    ? Math.min(
        ...patchedEndCandidates
      )
    : app.length;

const patched =
  app.slice(
    patchedStart,
    patchedEnd
  );

const checks = [
  [
    patched.includes(marker),
    'маркер O2.0'
  ],
  [
    patched.indexOf(
      'await createDeal({'
    ) <
    patched.indexOf(
      'startBackgroundUploadJob({'
    ),
    'сначала создаётся сделка'
  ],
  [
    patched.includes(
      "filesToUpload.length > 0\n            ? 'Отправляем бухгалтерии'\n            : 'Создаём запрос на счёт'"
    ),
    'background job работает и без файлов'
  ],
  [
    patched.includes(
      'await submitInvoiceRequest('
    ),
    'задача бухгалтеру создаётся в background job'
  ],
  [
    patched.indexOf(
      'startBackgroundUploadJob({'
    ) <
    patched.indexOf(
      'onCreated();'
    ),
    'navigation после запуска background job'
  ],
  [
    !patched
      .slice(
        patched.indexOf(marker)
      )
      .includes(
        '} else {\n\n        await submitInvoiceRequest('
      ),
    'нет блокирующей ветки без файлов'
  ],
];

console.log('');
console.log(
  'v064-O2.0 — сделка создаётся по отправке менеджера'
);
console.log(
  '==============================================='
);

for (
  const [ok, label]
  of checks
) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    fail(
      'Проверка не пройдена: ' +
      label
    );
  }
}

console.log('');
console.log(
  'Логика: createDeal → background request → сразу список сделок.'
);

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

/* ==========================================================
   Backup + write
   ========================================================== */

const stamp =
  new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      '-'
    );

const backup =
  appPath +
  '.before-v064-o20-' +
  stamp;

fs.copyFileSync(
  appPath,
  backup
);

console.log(
  'Backup: ' +
  path.relative(
    root,
    backup
  )
);

fs.writeFileSync(
  appPath,
  appFile.crlf
    ? app.replace(
        /\n/g,
        '\r\n'
      )
    : app,
  'utf8'
);

console.log('');
console.log(
  'v064-O2.0 применён.'
);
