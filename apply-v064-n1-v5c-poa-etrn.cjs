const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const paths = {
  controller:
    path.join(
      root,
      'backend',
      'src',
      'tasks',
      'tasks.controller.ts',
    ),
  service:
    path.join(
      root,
      'backend',
      'src',
      'tasks',
      'tasks.service.ts',
    ),
  api:
    path.join(
      root,
      'frontend',
      'src',
      'api.ts',
    ),
  power:
    path.join(
      root,
      'frontend',
      'src',
      'PowerOfAttorneyBlock.tsx',
    ),
  styles:
    path.join(
      root,
      'frontend',
      'src',
      'styles.css',
    ),
  panel:
    path.join(
      root,
      'frontend',
      'src',
      'PoaEtrnPanel.tsx',
    ),
};

const panelContent =
  "/* PART_V064_N1_V5B_POA_ETRN_PANEL */\nimport {\n  useMemo,\n  useState,\n} from 'react';\n\nimport {\n  createEtrnTask,\n} from './api';\n\nimport {\n  TaskStructuredFields,\n  type TaskDetails,\n} from './TaskStructuredFields';\n\nimport type {\n  CurrentUser,\n  Deal,\n} from './types';\n\nfunction etrnStatusLabel(\n  status: string,\n) {\n  return ({\n    NEW: 'новая',\n    IN_PROGRESS: 'в работе',\n    NEED_DATA: 'нужно исправить',\n    DONE: 'готова',\n    CANCELLED: 'отменена',\n  } as Record<string, string>)[status] || status;\n}\n\nexport function PoaEtrnPanel({\n  deal,\n  user,\n  task,\n  onChanged,\n}: {\n  deal: Deal;\n  user: CurrentUser;\n  task: any;\n  onChanged:\n    () =>\n      void |\n      Promise<void>;\n}) {\n  const payload =\n    (\n      task?.payload &&\n      typeof task.payload ===\n        'object'\n    )\n      ? task.payload as\n          Record<\n            string,\n            unknown\n          >\n      : {};\n\n  const poaDetails =\n    (\n      task?.details &&\n      typeof task.details ===\n        'object'\n    )\n      ? task.details as\n          Record<\n            string,\n            unknown\n          >\n      : {};\n\n  const linkedEtrn =\n    useMemo(\n      () =>\n        (\n          (\n            deal.tasks ||\n            []\n          ) as any[]\n        ).find(\n          (candidate) => {\n            if (\n              candidate.type !==\n              'ETRN'\n            ) {\n              return false;\n            }\n\n            const candidatePayload =\n              (\n                candidate.payload &&\n                typeof candidate.payload ===\n                  'object'\n              )\n                ? candidate.payload as\n                    Record<\n                      string,\n                      unknown\n                    >\n                : {};\n\n            return String(\n              candidatePayload\n                .poaTaskId ||\n              ''\n            ) === task.id;\n          }\n        ),\n      [\n        deal.tasks,\n        task.id,\n      ],\n    );\n\n  const [\n    open,\n    setOpen,\n  ] = useState(false);\n\n  const [\n    details,\n    setDetails,\n  ] = useState<TaskDetails>(\n    {}\n  );\n\n  const [\n    saving,\n    setSaving,\n  ] = useState(false);\n\n  const [\n    error,\n    setError,\n  ] = useState('');\n\n  if (\n    user.role ===\n      'ACCOUNTANT' ||\n    task.status !==\n      'DONE'\n  ) {\n    return null;\n  }\n\n  if (linkedEtrn) {\n    return (\n      <div className=\"powerEtrnAction\">\n        <span className=\"powerEtrnLinked\">\n          ЭТРН · {\n            etrnStatusLabel(\n              linkedEtrn.status\n            )\n          }\n        </span>\n      </div>\n    );\n  }\n\n  function openForm() {\n    const deliveryAddresses =\n      Array.isArray(\n        deal.deliveryAddresses\n      )\n        ? deal.deliveryAddresses\n        : [];\n\n    setDetails({\n      poaNumber:\n        String(\n          poaDetails.poaNumber ||\n          ''\n        ),\n      buyer:\n        deal.clientName,\n      unloadingAddress:\n        String(\n          deliveryAddresses[0] ||\n          ''\n        ),\n      cargo:\n        String(\n          payload.goodsDescription ||\n          ''\n        ),\n    });\n\n    setError('');\n    setOpen(true);\n  }\n\n  async function submit() {\n    const poaNumber =\n      String(\n        details.poaNumber ||\n        ''\n      ).trim();\n\n    if (!poaNumber) {\n      setError(\n        'Укажите № доверенности.'\n      );\n      return;\n    }\n\n    setSaving(true);\n    setError('');\n\n    try {\n      await createEtrnTask({\n        dealId:\n          deal.id,\n        actorId:\n          user.id,\n        urgent:\n          Boolean(\n            task.urgent\n          ),\n        poaTaskId:\n          task.id,\n        supplierName:\n          String(\n            payload.supplierName ||\n            ''\n          ) ||\n          undefined,\n        details,\n      });\n\n      setOpen(false);\n      await onChanged();\n    } catch (e) {\n      setError(\n        e instanceof Error\n          ? e.message\n          : String(e)\n      );\n    } finally {\n      setSaving(false);\n    }\n  }\n\n  const requestedTogether =\n    Boolean(\n      payload.requestEtrn\n    );\n\n  return (\n    <div className=\"powerEtrnAction\">\n      {!open ? (\n        <button\n          type=\"button\"\n          className={\n            requestedTogether\n              ? 'primary wide'\n              : 'secondary wide'\n          }\n          onClick={openForm}\n        >\n          {requestedTogether\n            ? 'Заполнить данные ЭТРН'\n            : '+ Запросить ЭТРН'}\n        </button>\n      ) : (\n        <div className=\"powerEtrnForm\">\n          <div className=\"powerEtrnFormHead\">\n            <strong>\n              Данные ЭТРН\n            </strong>\n\n            <span>\n              № доверенности и данные сделки\n              уже подставлены. Заполни перевозку\n              и отправь бухгалтерии.\n            </span>\n          </div>\n\n          <TaskStructuredFields\n            taskType=\"ETRN\"\n            value={details}\n            onChange={setDetails}\n          />\n\n          <div className=\"powerEtrnFormActions\">\n            <button\n              type=\"button\"\n              className=\"secondary\"\n              disabled={saving}\n              onClick={() =>\n                setOpen(false)\n              }\n            >\n              Отмена\n            </button>\n\n            <button\n              type=\"button\"\n              className=\"primary\"\n              disabled={saving}\n              onClick={() => {\n                void submit();\n              }}\n            >\n              {saving\n                ? 'Отправляем…'\n                : 'Отправить ЭТРН бухгалтерии'}\n            </button>\n          </div>\n\n          {error && (\n            <div className=\"error\">\n              {error}\n            </div>\n          )}\n        </div>\n      )}\n    </div>\n  );\n}\n\n/* END_PART_V064_N1_V5B_POA_ETRN_PANEL */\n";

const cssContent =
  "/* PART_V064_N1_V5B_POA_ETRN */\n\n.powerSubmitActions {\n  display: grid;\n  grid-template-columns:\n    minmax(0, 1fr)\n    minmax(0, 1fr);\n  gap: 8px;\n}\n\n.powerSubmitActions > button {\n  width: 100%;\n  min-height: 48px;\n}\n\n.powerEtrnAction {\n  display: grid;\n  gap: 8px;\n  margin-top: 10px;\n  padding-top: 10px;\n  border-top:\n    1px solid\n    var(--bo-line, #343437);\n}\n\n.powerEtrnLinked {\n  display: inline-flex;\n  align-items: center;\n  width: max-content;\n  max-width: 100%;\n  min-height: 28px;\n  border:\n    1px solid\n    color-mix(\n      in srgb,\n      var(--bo-green, #78a86b)\n        38%,\n      var(--bo-line, #343437)\n    );\n  border-radius: 5px;\n  background:\n    color-mix(\n      in srgb,\n      var(--bo-green, #78a86b)\n        10%,\n      transparent\n    );\n  color:\n    var(--bo-green, #78a86b);\n  font-size: 11px;\n  font-weight: 900;\n  padding: 5px 8px;\n}\n\n.powerEtrnForm {\n  display: grid;\n  gap: 10px;\n  border:\n    1px solid\n    var(--bo-line, #343437);\n  border-radius: 8px;\n  background:\n    var(--bo-panel, #1d2228);\n  padding: 12px;\n}\n\n.powerEtrnFormHead {\n  display: grid;\n  gap: 3px;\n}\n\n.powerEtrnFormHead strong {\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.powerEtrnFormHead span {\n  color:\n    var(--bo-muted, #9aa3ad);\n  font-size: 11px;\n  line-height: 1.4;\n}\n\n.powerEtrnFormActions {\n  display: grid;\n  grid-template-columns:\n    minmax(0, .7fr)\n    minmax(0, 1.3fr);\n  gap: 8px;\n}\n\n@media (max-width: 720px) {\n  .powerSubmitActions,\n  .powerEtrnFormActions {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* END_PART_V064_N1_V5B_POA_ETRN */";

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' + message
  );
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail(
      'Не найден файл: ' +
      file
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

function replaceOnce(
  text,
  oldValue,
  newValue,
  label,
) {
  const count =
    text.split(
      oldValue
    ).length - 1;

  if (count !== 1) {
    fail(
      label +
      ': ожидалось 1 совпадение, найдено ' +
      count
    );
  }

  return text.replace(
    oldValue,
    newValue
  );
}

function insertBeforeOnce(
  text,
  anchor,
  block,
  label,
) {
  const count =
    text.split(
      anchor
    ).length - 1;

  if (count !== 1) {
    fail(
      label +
      ': ожидалось 1 совпадение, найдено ' +
      count
    );
  }

  return text.replace(
    anchor,
    block + anchor
  );
}

function save(
  file,
  source,
  next,
) {
  if (
    source.text === next
  ) {
    return false;
  }

  const stamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  fs.copyFileSync(
    file,
    file +
      '.before-v064-n1-v5c-' +
      stamp
  );

  fs.writeFileSync(
    file,
    source.crlf
      ? next.replace(
          /\n/g,
          '\r\n'
        )
      : next,
    'utf8'
  );

  return true;
}

const controllerSource =
  read(paths.controller);
const serviceSource =
  read(paths.service);
const apiSource =
  read(paths.api);
const powerSource =
  read(paths.power);
const stylesSource =
  read(paths.styles);

let controller =
  controllerSource.text;
let service =
  serviceSource.text;
let api =
  apiSource.text;
let power =
  powerSource.text;
let styles =
  stylesSource.text;

/* =========================================================
   CONTROLLER
   ========================================================= */

if (
  !controller.includes(
    'PART_V064_N1_V5B_POA_FLAG_CONTROLLER'
  )
) {
  controller =
    replaceOnce(
      controller,
`      urgent?: boolean;
      requestKey: string;`,
`      urgent?: boolean;
      // PART_V064_N1_V5B_POA_FLAG_CONTROLLER
      requestEtrn?: boolean;
      requestKey: string;`,
      'controller POA requestEtrn'
    );
}

if (
  !controller.includes(
    'PART_V064_N1_V5B_ETRN_CONTROLLER'
  )
) {
  controller =
    insertBeforeOnce(
      controller,
`  @Post(':id/complete-power-of-attorney')`,
`  // PART_V064_N1_V5B_ETRN_CONTROLLER
  @Post('etrn')
  createEtrn(
    @Body()
    body: {
      dealId: string;
      actorId: string;
      urgent?: boolean;
      poaTaskId?: string;
      supplierName?: string;
      details?:
        Record<
          string,
          unknown
        >;
      comment?: string;
    },
  ) {
    return this.tasks
      .createEtrn(body);
  }


`,
      'controller ETRN endpoint'
    );
}

/* =========================================================
   SERVICE
   ========================================================= */

if (
  !service.includes(
    'PART_V064_N1_V5B_POA_FLAG_SERVICE'
  )
) {
  service =
    replaceOnce(
      service,
`      urgent?: boolean;
      requestKey: string;`,
`      urgent?: boolean;
      // PART_V064_N1_V5B_POA_FLAG_SERVICE
      requestEtrn?: boolean;
      requestKey: string;`,
      'service POA requestEtrn'
    );

  service =
    replaceOnce(
      service,
`            kind:
              'POWER_OF_ATTORNEY',
            requestKey:`,
`            kind:
              'POWER_OF_ATTORNEY',
            requestEtrn:
              Boolean(
                body.requestEtrn
              ),
            requestKey:`,
      'service POA payload requestEtrn'
    );
}

if (
  !service.includes(
    'PART_V064_N1_V5B_ETRN_SERVICE'
  )
) {
  service =
    insertBeforeOnce(
      service,
`  async completePowerOfAttorney(`,
`  // PART_V064_N1_V5B_ETRN_SERVICE
  async createEtrn(
    body: {
      dealId: string;
      actorId: string;
      urgent?: boolean;
      poaTaskId?: string;
      supplierName?: string;
      details?:
        Record<
          string,
          unknown
        >;
      comment?: string;
    },
  ) {
    const details =
      body.details || {};

    const poaNumber =
      String(
        details.poaNumber ||
        ''
      ).trim();

    if (!poaNumber) {
      throw new BadRequestException(
        'Укажите № доверенности'
      );
    }

    const deal =
      await this.prisma
        .deal
        .findUniqueOrThrow({
          where: {
            id: body.dealId,
          },
        });

    if (body.poaTaskId) {
      const existing =
        await this.prisma
          .task
          .findMany({
            where: {
              dealId:
                body.dealId,
              type:
                TaskType.ETRN,
              status: {
                not:
                  TaskStatus.CANCELLED,
              },
            },
          });

      const duplicate =
        existing.find(
          (item) => {
            const payload =
              (
                item.payload &&
                typeof item.payload ===
                  'object' &&
                !Array.isArray(
                  item.payload
                )
              )
                ? item.payload as
                    Record<
                      string,
                      unknown
                    >
                : {};

            return String(
              payload.poaTaskId ||
              ''
            ) ===
              body.poaTaskId;
          }
        );

      if (duplicate) {
        return {
          ...duplicate,
          deal,
        };
      }
    }

    const supplierName =
      body.supplierName
        ?.trim();

    const task =
      await this.prisma
        .task
        .create({
          data: {
            dealId:
              body.dealId,
            type:
              TaskType.ETRN,
            status:
              TaskStatus.NEW,
            urgent:
              Boolean(
                body.urgent
              ),
            title:
              supplierName
                ? 'Создать ЭТРН: ' +
                  supplierName
                : 'Создать ЭТРН',
            description:
              body.comment
                ?.trim() ||
              undefined,
            createdById:
              body.actorId,
            details: {
              ...details,
              poaNumber,
            } as any,
            payload: {
              kind:
                'ETRN',
              poaTaskId:
                body.poaTaskId ||
                null,
              supplierName:
                supplierName ||
                null,
            } as any,
          },
        });

    await this.prisma
      .auditEvent
      .create({
        data: {
          dealId:
            body.dealId,
          actorId:
            body.actorId,
          action:
            'ETRN_REQUESTED',
          entityType:
            'Task',
          entityId:
            task.id,
          newValue: {
            poaTaskId:
              body.poaTaskId ||
              null,
            poaNumber,
            supplierName:
              supplierName ||
              null,
          },
          reason:
            body.comment
              ?.trim() ||
            undefined,
        },
      });

    return {
      ...task,
      deal,
    };
  }


`,
      'service createEtrn'
    );
}

/* =========================================================
   API
   ========================================================= */

if (
  !api.includes(
    'PART_V064_N1_V5B_POA_FLAG_API'
  )
) {
  api =
    replaceOnce(
      api,
`    urgent?: boolean;
    requestKey: string;`,
`    urgent?: boolean;
    // PART_V064_N1_V5B_POA_FLAG_API
    requestEtrn?: boolean;
    requestKey: string;`,
      'api POA requestEtrn'
    );
}

if (
  !api.includes(
    'PART_V064_N1_V5B_ETRN_API'
  )
) {
  api =
    insertBeforeOnce(
      api,
`export async function completePowerOfAttorneyTask(`,
`// PART_V064_N1_V5B_ETRN_API
export async function createEtrnTask(
  payload: {
    dealId: string;
    actorId: string;
    urgent?: boolean;
    poaTaskId?: string;
    supplierName?: string;
    details?:
      Record<
        string,
        unknown
      >;
    comment?: string;
  },
) {
  return json<Task>(
    '/tasks/etrn',
    {
      method: 'POST',
      body:
        JSON.stringify(
          payload
        ),
    },
  );
}


`,
      'api createEtrnTask'
    );
}

/* =========================================================
   POWER OF ATTORNEY UI
   ========================================================= */

if (
  !power.includes(
    "from './PoaEtrnPanel'"
  )
) {
  power =
    "import { PoaEtrnPanel } from './PoaEtrnPanel';\n" +
    power;
}

if (
  !power.includes(
    'PART_V064_N1_V5B_CREATE_WITH_ETRN'
  )
) {
  power =
    replaceOnce(
      power,
`  async function createTask(
    requestKey: string,
  ) {`,
`  async function createTask(
    requestKey: string,
    withEtrn = false,
  ) {
    // PART_V064_N1_V5B_CREATE_WITH_ETRN`,
      'Power createTask signature'
    );

  power =
    replaceOnce(
      power,
`      urgent,
      requestKey,`,
`      urgent,
      requestEtrn:
        withEtrn,
      requestKey,`,
      'Power createTask payload'
    );
}

if (
  !power.includes(
    'PART_V064_N1_V5B_SUBMIT_WITH_ETRN'
  )
) {
  power =
    replaceOnce(
      power,
`  async function submit() {
    setError('');`,
`  async function submit(
    withEtrn = false,
  ) {
    // PART_V064_N1_V5B_SUBMIT_WITH_ETRN
    setError('');`,
      'Power submit signature'
    );

  const callCount =
    power.split(
      'await createTask(requestKey);'
    ).length - 1;

  if (callCount !== 2) {
    fail(
      'Power createTask calls: ожидалось 2, найдено ' +
      callCount
    );
  }

  power =
    power.replaceAll(
      'await createTask(requestKey);',
`await createTask(
            requestKey,
            withEtrn,
          );`
    );
}

if (
  !power.includes(
    'PART_V064_N1_V5B_SUBMIT_BUTTONS'
  )
) {
  const submitButtonRegex =
    /<button\s+type="button"\s+className="primary wide"\s+disabled=\{saving\}\s+onClick=\{submit\}\s*>[\s\S]*?Отправить бухгалтерии[\s\S]*?<\/button>/g;

  const matches =
    power.match(
      submitButtonRegex
    ) || [];

  if (matches.length !== 1) {
    fail(
      'Power submit buttons: ожидалось 1 совпадение, найдено ' +
      matches.length
    );
  }

  power =
    power.replace(
      submitButtonRegex,
`{/* PART_V064_N1_V5B_SUBMIT_BUTTONS */}
          <div className="powerSubmitActions">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() => {
                void submit(false);
              }}
            >
              Доверенность
            </button>

            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={() => {
                void submit(true);
              }}
            >
              Доверенность + ЭТРН
            </button>
          </div>`
    );
}

if (
  !power.includes(
    'PART_V064_N1_V5B_READY_POA_ETRN'
  )
) {
  power =
    insertBeforeOnce(
      power,
`                  {sourceFiles.length > 0 &&
                    resultFiles.length === 0 && (`,
`                  {/* PART_V064_N1_V5B_READY_POA_ETRN */}
                  <PoaEtrnPanel
                    deal={deal}
                    user={user}
                    task={task}
                    onChanged={onChanged}
                  />


`,
      'Power ready POA ETRN panel'
    );
}

/* =========================================================
   CSS + NEW FILE
   ========================================================= */

if (
  !styles.includes(
    'PART_V064_N1_V5B_POA_ETRN'
  )
) {
  styles =
    styles.replace(
      /\s*$/,
      ''
    ) +
    '\n\n' +
    cssContent +
    '\n';
}

if (
  fs.existsSync(
    paths.panel
  )
) {
  const existing =
    fs.readFileSync(
      paths.panel,
      'utf8'
    );

  if (
    !existing.includes(
      'PART_V064_N1_V5B_POA_ETRN_PANEL'
    )
  ) {
    fail(
      'PoaEtrnPanel.tsx уже существует и не принадлежит v5b'
    );
  }
}

/* =========================================================
   VERIFY
   ========================================================= */

const checks = [
  [
    controller.includes(
      'PART_V064_N1_V5B_POA_FLAG_CONTROLLER'
    ),
    'POA flag controller'
  ],
  [
    controller.includes(
      "@Post('etrn')"
    ),
    'ETRN endpoint'
  ],
  [
    service.includes(
      'PART_V064_N1_V5B_POA_FLAG_SERVICE'
    ),
    'POA flag service'
  ],
  [
    service.includes(
      'PART_V064_N1_V5B_ETRN_SERVICE'
    ),
    'ETRN service'
  ],
  [
    service.includes(
      'TaskType.ETRN'
    ),
    'TaskType.ETRN'
  ],
  [
    api.includes(
      'createEtrnTask'
    ),
    'ETRN API'
  ],
  [
    power.includes(
      'Доверенность + ЭТРН'
    ),
    'POA + ETRN button'
  ],
  [
    power.includes(
      '<PoaEtrnPanel'
    ),
    'ready POA ETRN'
  ],
  [
    styles.includes(
      'PART_V064_N1_V5B_POA_ETRN'
    ),
    'ETRN styles'
  ],
];

console.log('');
console.log(
  'v064-N1 v5c — Доверенность → ЭТРН'
);
console.log(
  '================================='
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

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

let changed = 0;

if (
  !fs.existsSync(
    paths.panel
  )
) {
  fs.writeFileSync(
    paths.panel,
    panelContent,
    'utf8'
  );
  changed++;
}

for (
  const [
    file,
    source,
    next,
  ]
  of [
    [
      paths.controller,
      controllerSource,
      controller,
    ],
    [
      paths.service,
      serviceSource,
      service,
    ],
    [
      paths.api,
      apiSource,
      api,
    ],
    [
      paths.power,
      powerSource,
      power,
    ],
    [
      paths.styles,
      stylesSource,
      styles,
    ],
  ]
) {
  if (
    save(
      file,
      source,
      next
    )
  ) {
    changed++;
  }
}

console.log('');
console.log(
  'v064-N1 v5b применён. Изменено файлов: ' +
  changed
);
