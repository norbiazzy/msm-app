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
  app:
    path.join(
      root,
      'frontend',
      'src',
      'App.tsx',
    ),
  styles:
    path.join(
      root,
      'frontend',
      'src',
      'styles.css',
    ),
  etrnTask:
    path.join(
      root,
      'frontend',
      'src',
      'EtrnTask.tsx',
    ),
  poaEtrn:
    path.join(
      root,
      'frontend',
      'src',
      'PoaEtrnPanel.tsx',
    ),
};

const etrnTaskContent =
  "/* PART_V064_N1_ETRN_TASK */\nimport {\n  resubmitEtrnTask,\n  updateTaskStatus,\n  type Task,\n} from './api';\n\nimport type {\n  CurrentUser,\n} from './types';\n\nimport {\n  TaskStructuredFields,\n  type TaskDetails,\n} from './TaskStructuredFields';\n\nimport {\n  ReturnToManagerPanel,\n} from './ReturnToManagerPanel';\n\nfunction statusLabel(\n  status: string,\n) {\n  return ({\n    NEW: 'Новая',\n    IN_PROGRESS: 'В работе',\n    NEED_DATA: 'Нужно исправить',\n    DONE: 'Готова',\n    CANCELLED: 'Отменена',\n  } as Record<string, string>)[status] || status;\n}\n\nfunction payloadDetails(\n  task: Task,\n): TaskDetails {\n  const fromPayload =\n    task.payload?.details;\n\n  if (\n    fromPayload &&\n    typeof fromPayload === 'object' &&\n    !Array.isArray(fromPayload)\n  ) {\n    return {\n      ...(fromPayload as TaskDetails),\n    };\n  }\n\n  return {\n    ...(task.details || {}),\n  };\n}\n\nexport function EtrnTask({\n  task,\n  user,\n  onBack,\n}: {\n  task: Task;\n  user: CurrentUser;\n  onBack: () => void;\n}) {\n  const [\n    status,\n    setStatus,\n  ] = useState(\n    task.status\n  );\n\n  const [\n    details,\n    setDetails,\n  ] = useState<TaskDetails>(\n    () => payloadDetails(task)\n  );\n\n  const [\n    description,\n    setDescription,\n  ] = useState(\n    task.description || ''\n  );\n\n  const [\n    urgent,\n    setUrgent,\n  ] = useState(\n    task.urgent\n  );\n\n  const [\n    saving,\n    setSaving,\n  ] = useState(false);\n\n  const [\n    error,\n    setError,\n  ] = useState('');\n\n  const isAccountant =\n    user.role ===\n      'ACCOUNTANT';\n\n  async function take() {\n    setSaving(true);\n    setError('');\n\n    try {\n      await updateTaskStatus(\n        task.id,\n        'IN_PROGRESS',\n        user.id,\n      );\n\n      setStatus(\n        'IN_PROGRESS'\n      );\n    } catch (e) {\n      setError(\n        e instanceof Error\n          ? e.message\n          : String(e)\n      );\n    } finally {\n      setSaving(false);\n    }\n  }\n\n  async function finish() {\n    setSaving(true);\n    setError('');\n\n    try {\n      await updateTaskStatus(\n        task.id,\n        'DONE',\n        user.id,\n      );\n\n      setStatus('DONE');\n      onBack();\n    } catch (e) {\n      setError(\n        e instanceof Error\n          ? e.message\n          : String(e)\n      );\n    } finally {\n      setSaving(false);\n    }\n  }\n\n  async function resubmit() {\n    const poaNumber =\n      String(\n        details.poaNumber ||\n        ''\n      ).trim();\n\n    if (!poaNumber) {\n      setError(\n        'Укажите № доверенности.'\n      );\n      return;\n    }\n\n    setSaving(true);\n    setError('');\n\n    try {\n      await resubmitEtrnTask(\n        task.id,\n        {\n          actorId:\n            user.id,\n          urgent,\n          description:\n            description.trim() ||\n            undefined,\n          details,\n        },\n      );\n\n      onBack();\n    } catch (e) {\n      setError(\n        e instanceof Error\n          ? e.message\n          : String(e)\n      );\n    } finally {\n      setSaving(false);\n    }\n  }\n\n  return (\n    <section\n      className=\"content form taskWorkspace etrnTaskWorkspace\"\n      data-task-status={status}\n    >\n      <button\n        type=\"button\"\n        className=\"backLink\"\n        onClick={onBack}\n      >\n        ← К задачам\n      </button>\n\n      <div className=\"detailHero\">\n        <div className=\"eyebrow\">\n          ЗК-{task.deal.internalNumber}\n        </div>\n\n        <h2>\n          Создать ЭТРН\n        </h2>\n\n        <p>\n          {task.deal.clientName}\n        </p>\n\n        <div className=\"statusPill\">\n          {statusLabel(status)}\n        </div>\n\n        {urgent && (\n          <b className=\"urgent\">\n            СРОЧНО\n          </b>\n        )}\n      </div>\n\n      {status === 'NEED_DATA' &&\n      !isAccountant ? (\n        <div className=\"etrnManagerRepair\">\n          <div className=\"etrnRepairHead\">\n            <strong>\n              Исправьте данные ЭТРН\n            </strong>\n            <span>\n              После отправки эта же задача\n              вернётся бухгалтерии.\n            </span>\n          </div>\n\n          <TaskStructuredFields\n            taskType=\"ETRN\"\n            value={details}\n            onChange={setDetails}\n          />\n\n          <label className=\"field\">\n            <span>\n              Комментарий менеджера\n            </span>\n\n            <textarea\n              rows={3}\n              value={description}\n              disabled={saving}\n              onChange={(event) =>\n                setDescription(\n                  event.target.value\n                )\n              }\n              placeholder=\"Необязательно\"\n            />\n          </label>\n\n          <label className=\"urgentToggle\">\n            <input\n              type=\"checkbox\"\n              checked={urgent}\n              disabled={saving}\n              onChange={(event) =>\n                setUrgent(\n                  event.target.checked\n                )\n              }\n            />\n            <span>Срочно</span>\n          </label>\n\n          <button\n            type=\"button\"\n            className=\"primary wide\"\n            disabled={saving}\n            onClick={() => {\n              void resubmit();\n            }}\n          >\n            {saving\n              ? 'Отправляем…'\n              : 'Повторно отправить бухгалтерии'}\n          </button>\n        </div>\n      ) : (\n        <TaskStructuredFields\n          taskType=\"ETRN\"\n          value={details}\n          readOnly\n        />\n      )}\n\n      {isAccountant &&\n        (\n          status === 'NEW' ||\n          status ===\n            'IN_PROGRESS'\n        ) && (\n        <div className=\"etrnTaskActions\">\n          <ReturnToManagerPanel\n            taskId={task.id}\n            actorId={user.id}\n            disabled={saving}\n            onReturned={onBack}\n          />\n\n          {status === 'NEW' ? (\n            <button\n              type=\"button\"\n              className=\"primary\"\n              disabled={saving}\n              onClick={() => {\n                void take();\n              }}\n            >\n              {saving\n                ? 'Сохраняем…'\n                : 'В работу'}\n            </button>\n          ) : (\n            <button\n              type=\"button\"\n              className=\"primary\"\n              disabled={saving}\n              onClick={() => {\n                void finish();\n              }}\n            >\n              {saving\n                ? 'Сохраняем…'\n                : 'ЭТРН создана'}\n            </button>\n          )}\n        </div>\n      )}\n\n      {status === 'DONE' && (\n        <div className=\"infoBox etrnDoneBox\">\n          <strong>\n            ЭТРН создана\n          </strong>\n          <p>\n            Задача завершена.\n          </p>\n        </div>\n      )}\n\n      {error && (\n        <div className=\"error\">\n          {error}\n        </div>\n      )}\n    </section>\n  );\n}\n\n/* END_PART_V064_N1_ETRN_TASK */\n";

const poaEtrnContent =
  "/* PART_V064_N1_POA_ETRN_PANEL */\nimport {\n  useMemo,\n  useState,\n} from 'react';\n\nimport {\n  createEtrnTask,\n} from './api';\n\nimport {\n  TaskStructuredFields,\n  type TaskDetails,\n} from './TaskStructuredFields';\n\nimport type {\n  CurrentUser,\n  Deal,\n} from './types';\n\ntype PoaTaskLike = {\n  id: string;\n  type?: string;\n  status: string;\n  urgent: boolean;\n  payload?: Record<\n    string,\n    unknown\n  >;\n};\n\nfunction linkedStatus(\n  status: string,\n) {\n  return ({\n    NEW: 'новая',\n    IN_PROGRESS: 'в работе',\n    NEED_DATA: 'нужно исправить',\n    DONE: 'готова',\n    CANCELLED: 'отменена',\n  } as Record<string, string>)[status] || status;\n}\n\nexport function PoaEtrnPanel({\n  deal,\n  user,\n  task,\n  onChanged,\n}: {\n  deal: Deal;\n  user: CurrentUser;\n  task: PoaTaskLike;\n  onChanged:\n    () =>\n      void |\n      Promise<void>;\n}) {\n  const payload =\n    task.payload || {};\n\n  const linkedEtrn =\n    useMemo(\n      () =>\n        (deal.tasks || [])\n          .find(\n            (candidate) =>\n              candidate.type ===\n                'ETRN' &&\n              String(\n                candidate.payload\n                  ?.poaTaskId ||\n                ''\n              ) === task.id\n          ),\n      [\n        deal.tasks,\n        task.id,\n      ],\n    );\n\n  const [\n    open,\n    setOpen,\n  ] = useState(false);\n\n  const [\n    details,\n    setDetails,\n  ] = useState<TaskDetails>(\n    {}\n  );\n\n  const [\n    saving,\n    setSaving,\n  ] = useState(false);\n\n  const [\n    error,\n    setError,\n  ] = useState('');\n\n  if (\n    user.role ===\n      'ACCOUNTANT' ||\n    task.status !==\n      'DONE'\n  ) {\n    return null;\n  }\n\n  if (linkedEtrn) {\n    return (\n      <div className=\"powerEtrnAction\">\n        <span className=\"powerEtrnLinked\">\n          ЭТРН · {\n            linkedStatus(\n              linkedEtrn.status\n            )\n          }\n        </span>\n      </div>\n    );\n  }\n\n  function openForm() {\n    setError('');\n\n    setDetails({\n      poaNumber:\n        String(\n          payload.poaNumber ||\n          ''\n        ),\n      buyer:\n        deal.clientName,\n      unloadingAddress:\n        (\n          deal.deliveryAddresses ||\n          []\n        )[0] || '',\n      cargo:\n        String(\n          payload.goodsDescription ||\n          ''\n        ),\n    });\n\n    setOpen(true);\n  }\n\n  async function submit() {\n    const poaNumber =\n      String(\n        details.poaNumber ||\n        ''\n      ).trim();\n\n    if (!poaNumber) {\n      setError(\n        'Укажите № доверенности.'\n      );\n      return;\n    }\n\n    setSaving(true);\n    setError('');\n\n    try {\n      await createEtrnTask({\n        dealId:\n          deal.id,\n        actorId:\n          user.id,\n        urgent:\n          task.urgent,\n        poaTaskId:\n          task.id,\n        supplierName:\n          String(\n            payload.supplierName ||\n            ''\n          ) ||\n          undefined,\n        details,\n      });\n\n      setOpen(false);\n      await onChanged();\n    } catch (e) {\n      setError(\n        e instanceof Error\n          ? e.message\n          : String(e)\n      );\n    } finally {\n      setSaving(false);\n    }\n  }\n\n  const requestedTogether =\n    Boolean(\n      payload.requestEtrn\n    );\n\n  return (\n    <div className=\"powerEtrnAction\">\n      {!open ? (\n        <button\n          type=\"button\"\n          className={\n            requestedTogether\n              ? 'primary wide'\n              : 'secondary wide'\n          }\n          onClick={openForm}\n        >\n          {requestedTogether\n            ? 'Заполнить данные ЭТРН'\n            : '+ Запросить ЭТРН'}\n        </button>\n      ) : (\n        <div className=\"powerEtrnForm\">\n          <div className=\"powerEtrnFormHead\">\n            <strong>\n              Данные для ЭТРН\n            </strong>\n            <span>\n              № доверенности уже подставлен.\n              Заполните перевозку и отправьте\n              бухгалтерии.\n            </span>\n          </div>\n\n          <TaskStructuredFields\n            taskType=\"ETRN\"\n            value={details}\n            onChange={setDetails}\n          />\n\n          <div className=\"powerEtrnFormActions\">\n            <button\n              type=\"button\"\n              className=\"secondary\"\n              disabled={saving}\n              onClick={() =>\n                setOpen(false)\n              }\n            >\n              Отмена\n            </button>\n\n            <button\n              type=\"button\"\n              className=\"primary\"\n              disabled={saving}\n              onClick={() => {\n                void submit();\n              }}\n            >\n              {saving\n                ? 'Отправляем…'\n                : 'Отправить ЭТРН бухгалтерии'}\n            </button>\n          </div>\n\n          {error && (\n            <div className=\"error\">\n              {error}\n            </div>\n          )}\n        </div>\n      )}\n    </div>\n  );\n}\n\n/* END_PART_V064_N1_POA_ETRN_PANEL */\n";

const cssContent =
  "/* PART_V064_N1_ETRN_FLOW */\n\n.powerSubmitActions {\n  display: grid;\n  grid-template-columns:\n    minmax(0, 1fr)\n    minmax(0, 1fr);\n  gap: 8px;\n}\n\n.powerSubmitActions > button {\n  width: 100%;\n  min-height: 48px;\n}\n\n.powerEtrnAction {\n  display: grid;\n  gap: 8px;\n  margin-top: 10px;\n  padding-top: 10px;\n  border-top:\n    1px solid\n    var(--bo-line, #343437);\n}\n\n.powerEtrnLinked {\n  display: inline-flex;\n  align-items: center;\n  width: max-content;\n  max-width: 100%;\n  min-height: 28px;\n  border:\n    1px solid\n    color-mix(\n      in srgb,\n      var(--bo-green, #78a86b)\n        38%,\n      var(--bo-line, #343437)\n    );\n  border-radius: 5px;\n  background:\n    color-mix(\n      in srgb,\n      var(--bo-green, #78a86b)\n        10%,\n      transparent\n    );\n  color:\n    var(--bo-green, #78a86b);\n  font-size: 11px;\n  font-weight: 900;\n  padding: 5px 8px;\n}\n\n.powerEtrnForm {\n  display: grid;\n  gap: 10px;\n  border:\n    1px solid\n    var(--bo-line, #343437);\n  border-radius: 8px;\n  background:\n    var(--bo-panel, #1d2228);\n  padding: 12px;\n}\n\n.powerEtrnFormHead {\n  display: grid;\n  gap: 3px;\n}\n\n.powerEtrnFormHead strong {\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.powerEtrnFormHead span {\n  color:\n    var(--bo-muted, #9aa3ad);\n  font-size: 11px;\n  line-height: 1.4;\n}\n\n.powerEtrnFormActions {\n  display: grid;\n  grid-template-columns:\n    minmax(0, .7fr)\n    minmax(0, 1.3fr);\n  gap: 8px;\n}\n\n.poaCompletionNumber {\n  border:\n    1px solid\n    var(--bo-line, #343437);\n  border-radius: 8px;\n  background:\n    var(--bo-panel, #1d2228);\n  padding: 11px;\n}\n\n.poaCompletionNumber .field {\n  margin: 0;\n}\n\n.etrnTaskWorkspace\n.taskStructuredRead,\n.etrnTaskWorkspace\n.taskStructuredEdit {\n  margin-bottom: 10px;\n}\n\n.etrnTaskActions {\n  display: grid;\n  grid-template-columns:\n    minmax(0, 1fr)\n    minmax(0, 1fr);\n  gap: 8px;\n  align-items: stretch;\n}\n\n.etrnTaskActions > * {\n  min-width: 0;\n}\n\n.etrnTaskActions .primary {\n  width: 100%;\n  min-height: 46px;\n}\n\n.etrnManagerRepair {\n  display: grid;\n  gap: 10px;\n  border:\n    1px solid\n    color-mix(\n      in srgb,\n      var(--bo-red, #d27368)\n        35%,\n      var(--bo-line, #343437)\n    );\n  border-left:\n    4px solid\n    var(--bo-red, #d27368);\n  border-radius: 8px;\n  background:\n    var(--bo-panel, #1d2228);\n  padding: 12px;\n}\n\n.etrnRepairHead {\n  display: grid;\n  gap: 3px;\n}\n\n.etrnRepairHead strong {\n  color:\n    var(--bo-red, #d27368);\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.etrnRepairHead span {\n  color:\n    var(--bo-muted, #9aa3ad);\n  font-size: 11px;\n}\n\n.etrnDoneBox {\n  border-left:\n    4px solid\n    var(--bo-green, #78a86b)\n    !important;\n}\n\n@media (max-width: 720px) {\n  .powerSubmitActions,\n  .powerEtrnFormActions,\n  .etrnTaskActions {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* END_PART_V064_N1_ETRN_FLOW */";

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

function save(
  file,
  source,
  next,
  tag,
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
      '.before-' +
      tag +
      '-' +
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

function methodRange(
  text,
  signature,
) {
  const start =
    text.indexOf(signature);

  if (start < 0) {
    return null;
  }

  /*
   * NestJS controller DTO/body types are multiline and
   * contain "\n  }" before the method call.
   * For the two controller methods touched by this patch,
   * use the next decorator as the method boundary.
   */
  if (
    signature ===
      'createPowerOfAttorney(' ||
    signature ===
      'completePowerOfAttorney('
  ) {
    const nextDecorator =
      text.indexOf(
        '\n  @',
        start +
          signature.length
      );

    return {
      start,
      end:
        nextDecorator >= 0
          ? nextDecorator
          : text.length,
    };
  }

  const candidates = [
    text.indexOf(
      '\n  async ',
      start +
        signature.length
    ),
    text.indexOf(
      '\n  @',
      start +
        signature.length
    ),
    text.indexOf(
      '\n  }',
      start +
        signature.length
    ),
  ].filter(
    (value) => value >= 0
  );

  return {
    start,
    end:
      candidates.length
        ? Math.min(
            ...candidates
          )
        : text.length,
  };
}

function insertAt(
  text,
  index,
  value,
) {
  return (
    text.slice(0, index) +
    value +
    text.slice(index)
  );
}

function replaceRange(
  text,
  start,
  end,
  oldValue,
  newValue,
  label,
) {
  const part =
    text.slice(start, end);

  if (
    !part.includes(oldValue)
  ) {
    fail(
      'Не найден фрагмент: ' +
      label
    );
  }

  return (
    text.slice(0, start) +
    part.replace(
      oldValue,
      newValue
    ) +
    text.slice(end)
  );
}

function ensureNewFile(
  file,
  marker,
  content,
) {
  if (
    !fs.existsSync(file)
  ) {
    return;
  }

  const existing =
    fs.readFileSync(
      file,
      'utf8'
    );

  if (
    !existing.includes(marker)
  ) {
    fail(
      'Файл уже существует и ' +
      'не принадлежит этому патчу: ' +
      file
    );
  }
}

const controllerSource =
  read(paths.controller);
const serviceSource =
  read(paths.service);
const apiSource =
  read(paths.api);
const powerSource =
  read(paths.power);
const appSource =
  read(paths.app);
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
let app =
  appSource.text;
let styles =
  stylesSource.text;

/* =========================================================
   BACKEND CONTROLLER
   ========================================================= */

if (
  !controller.includes(
    'PART_V064_N1_ETRN_CONTROLLER'
  )
) {
  const completeAnchor =
    controller.indexOf(
      "@Post(':id/complete-power-of-attorney')"
    );

  if (
    completeAnchor < 0
  ) {
    fail(
      'Не найден endpoint ' +
      'complete-power-of-attorney'
    );
  }

  const block =
`  // PART_V064_N1_ETRN_CONTROLLER
  @Post('etrn')
  createEtrn(
    @Body()
    body: {
      dealId: string;
      actorId: string;
      urgent?: boolean;
      poaTaskId?: string;
      supplierName?: string;
      details:
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

  @Post(':id/resubmit-etrn')
  resubmitEtrn(
    @Param('id')
    id: string,
    @Body()
    body: {
      actorId: string;
      urgent?: boolean;
      description?: string;
      details:
        Record<
          string,
          unknown
        >;
    },
  ) {
    return this.tasks
      .resubmitEtrn(
        id,
        body,
      );
  }


`;

  controller =
    insertAt(
      controller,
      completeAnchor,
      block
    );
}

/* POA controller body requestEtrn */
{
  const range =
    methodRange(
      controller,
      'createPowerOfAttorney('
    );

  if (!range) {
    fail(
      'Не найден createPowerOfAttorney controller'
    );
  }

  const part =
    controller.slice(
      range.start,
      range.end
    );

  if (
    !part.includes(
      'requestEtrn?: boolean;'
    )
  ) {
    const urgent =
      part.indexOf(
        'urgent?: boolean;'
      );

    if (urgent < 0) {
      fail(
        'Не найден urgent в POA controller'
      );
    }

    const absolute =
      range.start +
      urgent +
      'urgent?: boolean;'.length;

    controller =
      insertAt(
        controller,
        absolute,
        '\n      requestEtrn?: boolean;'
      );
  }
}

/* POA complete controller poaNumber */
if (
  !controller.includes(
    'PART_V064_N1_POA_COMPLETE_CONTROLLER'
  )
) {
  const range =
    methodRange(
      controller,
      'completePowerOfAttorney('
    );

  if (!range) {
    fail(
      'Не найден completePowerOfAttorney controller'
    );
  }

  const part =
    controller.slice(
      range.start,
      range.end
    );

  let nextPart = part;

  if (
    !nextPart.includes(
      'poaNumber: string'
    )
  ) {
    const actorType =
      /actorId:\s*string\s*;?/;

    if (
      !actorType.test(
        nextPart
      )
    ) {
      fail(
        'Не найден actorId в body ' +
        'completePowerOfAttorney controller'
      );
    }

    nextPart =
      nextPart.replace(
        actorType,
        (match) =>
          match +
          '\n      poaNumber: string;'
      );
  }

  if (
    !nextPart.includes(
      'body.poaNumber'
    )
  ) {
    const actorCall =
      /body\.actorId\s*,/;

    if (
      !actorCall.test(
        nextPart
      )
    ) {
      fail(
        'Не найден вызов body.actorId ' +
        'в completePowerOfAttorney controller'
      );
    }

    nextPart =
      nextPart.replace(
        actorCall,
        (match) =>
          match +
          '\n      body.poaNumber,'
      );
  }

  nextPart =
    `    // PART_V064_N1_POA_COMPLETE_CONTROLLER\n` +
    nextPart;

  controller =
    controller.slice(
      0,
      range.start
    ) +
    nextPart +
    controller.slice(
      range.end
    );
}

/* =========================================================
   BACKEND SERVICE
   ========================================================= */

/* requestEtrn in POA body and payload */
{
  let range =
    methodRange(
      service,
      'async createPowerOfAttorney('
    );

  if (!range) {
    fail(
      'Не найден createPowerOfAttorney service'
    );
  }

  let part =
    service.slice(
      range.start,
      range.end
    );

  if (
    !part.includes(
      'requestEtrn?: boolean;'
    )
  ) {
    const urgent =
      part.indexOf(
        'urgent?: boolean;'
      );

    if (urgent < 0) {
      fail(
        'Не найден urgent в POA service'
      );
    }

    const localAt =
      urgent +
      'urgent?: boolean;'.length;

    part =
      insertAt(
        part,
        localAt,
        '\n      requestEtrn?: boolean;'
      );
  }

  if (
    !part.includes(
      'requestEtrn:\n' +
      '              Boolean(\n' +
      '                body.requestEtrn'
    )
  ) {
    const payloadAt =
      part.indexOf(
        'payload: {'
      );

    if (
      payloadAt < 0
    ) {
      fail(
        'Не найден payload POA service'
      );
    }

    const requestKeyAt =
      part.indexOf(
        'requestKey:',
        payloadAt
      );

    if (
      requestKeyAt < 0
    ) {
      fail(
        'Не найден requestKey в POA payload'
      );
    }

    const lineStart =
      part.lastIndexOf(
        '\n',
        requestKeyAt
      ) + 1;

    part =
      insertAt(
        part,
        lineStart,
`            requestEtrn:
              Boolean(
                body.requestEtrn
              ),
`
      );
  }

  service =
    service.slice(
      0,
      range.start
    ) +
    part +
    service.slice(
      range.end
    );
}

/* Create / resubmit ETRN methods */
if (
  !service.includes(
    'PART_V064_N1_ETRN_SERVICE'
  )
) {
  const completeAt =
    service.indexOf(
      '  async completePowerOfAttorney('
    );

  if (
    completeAt < 0
  ) {
    fail(
      'Не найден completePowerOfAttorney service anchor'
    );
  }

  const block =
`  // PART_V064_N1_ETRN_SERVICE
  async createEtrn(
    body: {
      dealId: string;
      actorId: string;
      urgent?: boolean;
      poaTaskId?: string;
      supplierName?: string;
      details:
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
              item.payload &&
              typeof item.payload ===
                'object' &&
              !Array.isArray(
                item.payload
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
              'Создать ЭТРН' +
              (
                supplierName
                  ? ': ' +
                    supplierName
                  : ''
              ),
            description:
              body.comment
                ?.trim() ||
              undefined,
            createdById:
              body.actorId,
            payload: {
              kind:
                'ETRN',
              poaTaskId:
                body.poaTaskId ||
                null,
              poaNumber,
              supplierName:
                supplierName ||
                null,
              details: {
                ...details,
                poaNumber,
              },
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


  async resubmitEtrn(
    id: string,
    body: {
      actorId: string;
      urgent?: boolean;
      description?: string;
      details:
        Record<
          string,
          unknown
        >;
    },
  ) {
    const task =
      await this.prisma
        .task
        .findUniqueOrThrow({
          where: { id },
        });

    if (
      task.type !==
      TaskType.ETRN
    ) {
      throw new BadRequestException(
        'Это не задача ЭТРН'
      );
    }

    if (
      task.status !==
      TaskStatus.NEED_DATA
    ) {
      throw new BadRequestException(
        'ЭТРН не находится на исправлении'
      );
    }

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

    const currentPayload =
      task.payload &&
      typeof task.payload ===
        'object' &&
      !Array.isArray(
        task.payload
      )
        ? task.payload as
            Record<
              string,
              unknown
            >
        : {};

    const updated =
      await this.prisma
        .task
        .update({
          where: { id },
          data: {
            status:
              TaskStatus.NEW,
            assigneeId: null,
            completedAt: null,
            urgent:
              body.urgent !==
                undefined
                ? Boolean(
                    body.urgent
                  )
                : task.urgent,
            description:
              body.description
                ?.trim() ||
              task.description,
            payload: {
              ...currentPayload,
              poaNumber,
              details: {
                ...details,
                poaNumber,
              },
            } as any,
          },
        });

    await this.prisma
      .auditEvent
      .create({
        data: {
          dealId:
            task.dealId,
          actorId:
            body.actorId,
          action:
            'ETRN_RESUBMITTED',
          entityType:
            'Task',
          entityId:
            task.id,
          newValue: {
            status:
              TaskStatus.NEW,
            poaNumber,
          },
        },
      });

    return updated;
  }


`;

  service =
    insertAt(
      service,
      completeAt,
      block
    );
}

/* complete POA number */
if (
  !service.includes(
    'PART_V064_N1_POA_COMPLETE_SERVICE'
  )
) {
  const range =
    methodRange(
      service,
      'async completePowerOfAttorney('
    );

  if (!range) {
    fail(
      'Не найден completePowerOfAttorney service'
    );
  }

  let part =
    service.slice(
      range.start,
      range.end
    );

  part =
    part.replace(
`    actorId: string,
  ) {`,
`    actorId: string,
    poaNumber: string,
  ) {
    // PART_V064_N1_POA_COMPLETE_SERVICE

    const normalizedPoaNumber =
      poaNumber
        ?.trim();

    if (!normalizedPoaNumber) {
      throw new BadRequestException(
        'Укажите № доверенности'
      );
    }`
    );

  if (
    !part.includes(
      'PART_V064_N1_POA_COMPLETE_SERVICE'
    )
  ) {
    fail(
      'Не удалось изменить сигнатуру completePowerOfAttorney'
    );
  }

  const updatedAt =
    part.indexOf(
      'const updated ='
    );

  const dataAt =
    part.indexOf(
      'data: {',
      updatedAt
    );

  if (
    updatedAt < 0 ||
    dataAt < 0
  ) {
    fail(
      'Не найден update доверенности'
    );
  }

  const insertAfterData =
    dataAt +
    'data: {'.length;

  part =
    insertAt(
      part,
      insertAfterData,
`
              payload: {
                ...(
                  task.payload &&
                  typeof task.payload ===
                    'object' &&
                  !Array.isArray(
                    task.payload
                  )
                    ? task.payload as
                        Record<
                          string,
                          unknown
                        >
                    : {}
                ),
                poaNumber:
                  normalizedPoaNumber,
              } as any,`
    );

  service =
    service.slice(
      0,
      range.start
    ) +
    part +
    service.slice(
      range.end
    );
}

/* =========================================================
   FRONTEND API
   ========================================================= */

/* Ensure Task.details fallback type. */
{
  const taskAt =
    api.indexOf(
      'export type Task = {'
    );

  if (taskAt < 0) {
    fail(
      'Не найден type Task в api.ts'
    );
  }

  const taskEnd =
    api.indexOf(
      '\n};',
      taskAt
    );

  const part =
    api.slice(
      taskAt,
      taskEnd
    );

  if (
    !part.includes(
      'details?:'
    )
  ) {
    const payloadAt =
      api.indexOf(
        'payload?:',
        taskAt
      );

    if (
      payloadAt < 0 ||
      payloadAt >
        taskEnd
    ) {
      fail(
        'Не найден payload в Task type'
      );
    }

    const lineEnd =
      api.indexOf(
        '\n',
        payloadAt
      );

    api =
      insertAt(
        api,
        lineEnd + 1,
        '  details?: Record<string, unknown>;\n'
      );
  }
}

/* requestEtrn API POA body */
{
  const range =
    methodRange(
      api,
      'export async function createPowerOfAttorneyTask('
    );

  if (!range) {
    fail(
      'Не найден createPowerOfAttorneyTask API'
    );
  }

  const part =
    api.slice(
      range.start,
      range.end
    );

  if (
    !part.includes(
      'requestEtrn?: boolean;'
    )
  ) {
    const urgent =
      api.indexOf(
        'urgent?: boolean;',
        range.start
      );

    if (
      urgent < 0 ||
      urgent >
        range.end
    ) {
      fail(
        'Не найден urgent в POA API'
      );
    }

    api =
      insertAt(
        api,
        urgent +
          'urgent?: boolean;'.length,
        '\n    requestEtrn?: boolean;'
      );
  }
}

/* ETRN APIs */
if (
  !api.includes(
    'PART_V064_N1_ETRN_API'
  )
) {
  const anchor =
    api.indexOf(
      'export async function completePowerOfAttorneyTask('
    );

  if (
    anchor < 0
  ) {
    fail(
      'Не найден completePowerOfAttorneyTask API anchor'
    );
  }

  const block =
`// PART_V064_N1_ETRN_API
export async function createEtrnTask(
  payload: {
    dealId: string;
    actorId: string;
    urgent?: boolean;
    poaTaskId?: string;
    supplierName?: string;
    details:
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


export async function resubmitEtrnTask(
  taskId: string,
  payload: {
    actorId: string;
    urgent?: boolean;
    description?: string;
    details:
      Record<
        string,
        unknown
      >;
  },
) {
  return json<Task>(
    \`/tasks/\${taskId}/resubmit-etrn\`,
    {
      method: 'POST',
      body:
        JSON.stringify(
          payload
        ),
    },
  );
}


`;

  api =
    insertAt(
      api,
      anchor,
      block
    );
}

/* complete POA API poaNumber */
if (
  !api.includes(
    'PART_V064_N1_POA_COMPLETE_API'
  )
) {
  const range =
    methodRange(
      api,
      'export async function completePowerOfAttorneyTask('
    );

  if (!range) {
    fail(
      'Не найден completePowerOfAttorneyTask API'
    );
  }

  let part =
    api.slice(
      range.start,
      range.end
    );

  part =
    part.replace(
`  actorId: string,
) {`,
`  actorId: string,
  poaNumber: string,
) {
  // PART_V064_N1_POA_COMPLETE_API`
    );

  if (
    !part.includes(
      'PART_V064_N1_POA_COMPLETE_API'
    )
  ) {
    fail(
      'Не удалось изменить complete POA API signature'
    );
  }

  part =
    part.replace(
      'body: JSON.stringify({ actorId }),',
`body:
        JSON.stringify({
          actorId,
          poaNumber,
        }),`
    );

  api =
    api.slice(
      0,
      range.start
    ) +
    part +
    api.slice(
      range.end
    );
}

/* =========================================================
   POWER OF ATTORNEY UI
   ========================================================= */

/* import PoaEtrnPanel */
if (
  !power.includes(
    "from './PoaEtrnPanel'"
  )
) {
  const firstImport =
    power.indexOf('import ');

  power =
    insertAt(
      power,
      firstImport,
      "import { PoaEtrnPanel } from './PoaEtrnPanel';\n"
    );
}

/* createTask(withEtrn), submit(withEtrn) */
if (
  !power.includes(
    'PART_V064_N1_POA_REQUEST_MODE'
  )
) {
  const createRange =
    methodRange(
      power,
      'async function createTask('
    );

  if (!createRange) {
    fail(
      'Не найден createTask в PowerOfAttorneyBlock'
    );
  }

  let part =
    power.slice(
      createRange.start,
      createRange.end
    );

  part =
    part.replace(
`    requestKey: string,
  ) {`,
`    requestKey: string,
    withEtrn = false,
  ) {
    // PART_V064_N1_POA_REQUEST_MODE`
    );

  if (
    !part.includes(
      'PART_V064_N1_POA_REQUEST_MODE'
    )
  ) {
    fail(
      'Не удалось изменить createTask POA'
    );
  }

  const urgentAt =
    part.indexOf(
      'urgent,'
    );

  if (urgentAt < 0) {
    fail(
      'Не найден urgent в createTask POA payload'
    );
  }

  const urgentLineEnd =
    part.indexOf(
      '\n',
      urgentAt
    );

  part =
    insertAt(
      part,
      urgentLineEnd + 1,
`      requestEtrn:
        withEtrn,
`
    );

  power =
    power.slice(
      0,
      createRange.start
    ) +
    part +
    power.slice(
      createRange.end
    );

  const submitRange =
    methodRange(
      power,
      'async function submit('
    ) ||
    methodRange(
      power,
      'async function submit()'
    );

  if (!submitRange) {
    fail(
      'Не найден submit POA'
    );
  }

  let submitPart =
    power.slice(
      submitRange.start,
      submitRange.end
    );

  submitPart =
    submitPart.replace(
      /async function submit\(\)\s*\{/,
`async function submit(
    withEtrn = false,
  ) {`
    );

  submitPart =
    submitPart.replaceAll(
      'await createTask(requestKey);',
`await createTask(
            requestKey,
            withEtrn,
          );`
    );

  if (
    !submitPart.includes(
      'withEtrn'
    )
  ) {
    fail(
      'Не удалось изменить submit POA'
    );
  }

  power =
    power.slice(
      0,
      submitRange.start
    ) +
    submitPart +
    power.slice(
      submitRange.end
    );
}

/* Replace single submit button */
if (
  !power.includes(
    'PART_V064_N1_POA_SUBMIT_ACTIONS'
  )
) {
  const buttonRegex =
    /<button\s+type="button"\s+className="primary wide"\s+disabled=\{saving\}\s+onClick=\{submit\}\s*>[\s\S]*?Отправить бухгалтерии[\s\S]*?<\/button>/;

  if (
    !buttonRegex.test(power)
  ) {
    fail(
      'Не найдена исходная кнопка отправки доверенности'
    );
  }

  power =
    power.replace(
      buttonRegex,
`{/* PART_V064_N1_POA_SUBMIT_ACTIONS */}
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

/* Add ETRN panel in each POA card */
if (
  !power.includes(
    'PART_V064_N1_POA_ETRN_CARD'
  )
) {
  const mapAt =
    power.indexOf(
      '{requests.map('
    );

  const sourceAt =
    power.indexOf(
      '{sourceFiles.length > 0',
      mapAt
    );

  if (
    mapAt < 0 ||
    sourceAt < 0
  ) {
    fail(
      'Не найден POA card sourceFiles anchor'
    );
  }

  power =
    insertAt(
      power,
      sourceAt,
`{/* PART_V064_N1_POA_ETRN_CARD */}
                  <PoaEtrnPanel
                    deal={deal}
                    user={user}
                    task={task}
                    onChanged={onChanged}
                  />


                  `
    );
}

/* POA accountant number state */
if (
  !power.includes(
    'PART_V064_N1_POA_NUMBER_STATE'
  )
) {
  const taskAt =
    power.indexOf(
      'export function PowerOfAttorneyTask('
    );

  const filesAt =
    power.indexOf(
`  const [files, setFiles] =
    useState<File[]>([]);`,
      taskAt
    );

  if (
    taskAt < 0 ||
    filesAt < 0
  ) {
    fail(
      'Не найден files state PowerOfAttorneyTask'
    );
  }

  const afterFiles =
    filesAt +
`  const [files, setFiles] =
    useState<File[]>([]);`.length;

  power =
    insertAt(
      power,
      afterFiles,
`

  // PART_V064_N1_POA_NUMBER_STATE
  const [
    poaNumber,
    setPoaNumber,
  ] = useState(
    String(
      task.payload
        ?.poaNumber ||
      ''
    )
  );
`
    );
}

/* POA finish number validation + API arg */
if (
  !power.includes(
    'PART_V064_N1_POA_FINISH_NUMBER'
  )
) {
  const taskAt =
    power.indexOf(
      'export function PowerOfAttorneyTask('
    );

  const finishAt =
    power.indexOf(
      'function finish()',
      taskAt
    );

  if (finishAt < 0) {
    fail(
      'Не найден finish PowerOfAttorneyTask'
    );
  }

  const setErrorAt =
    power.indexOf(
      "setError('');",
      finishAt
    );

  if (
    setErrorAt < 0
  ) {
    fail(
      'Не найден setError в finish POA'
    );
  }

  const lineEnd =
    power.indexOf(
      '\n',
      setErrorAt
    );

  power =
    insertAt(
      power,
      lineEnd + 1,
`
    // PART_V064_N1_POA_FINISH_NUMBER
    if (!poaNumber.trim()) {
      setError(
        'Укажите № готовой доверенности.'
      );
      return;
    }

`
    );

  const completeAt =
    power.indexOf(
      'await completePowerOfAttorneyTask(',
      finishAt
    );

  const completeEnd =
    power.indexOf(
      ');',
      completeAt
    );

  if (
    completeAt < 0 ||
    completeEnd < 0
  ) {
    fail(
      'Не найден completePowerOfAttorneyTask call'
    );
  }

  const call =
    power.slice(
      completeAt,
      completeEnd + 2
    );

  if (
    !call.includes(
      'poaNumber.trim()'
    )
  ) {
    const newCall =
`await completePowerOfAttorneyTask(
          task.id,
          user.id,
          poaNumber.trim(),
        );`;

    power =
      power.slice(
        0,
        completeAt
      ) +
      newCall +
      power.slice(
        completeEnd + 2
      );
  }
}

/* POA number field before final file */
if (
  !power.includes(
    'PART_V064_N1_POA_NUMBER_UI'
  )
) {
  const taskAt =
    power.indexOf(
      'export function PowerOfAttorneyTask('
    );

  const labelAt =
    power.indexOf(
`<label className="field">
            <span>Готовая доверенность</span>`,
      taskAt
    );

  if (
    labelAt < 0
  ) {
    fail(
      'Не найден label готовой доверенности'
    );
  }

  power =
    insertAt(
      power,
      labelAt,
`{/* PART_V064_N1_POA_NUMBER_UI */}
          <div className="poaCompletionNumber">
            <label className="field">
              <span>
                № готовой доверенности
              </span>

              <input
                value={poaNumber}
                onChange={(event) =>
                  setPoaNumber(
                    event.target.value
                  )
                }
                placeholder="Например, 1757"
              />
            </label>
          </div>

          `
    );
}

/* =========================================================
   APP DISPATCH
   ========================================================= */

if (
  !app.includes(
    "from './EtrnTask'"
  )
) {
  const firstImport =
    app.indexOf('import ');

  app =
    insertAt(
      app,
      firstImport,
      "import { EtrnTask } from './EtrnTask';\n"
    );
}

if (
  !app.includes(
    'PART_V064_N1_ETRN_DISPATCH'
  )
) {
  const selectedAt =
    app.indexOf(
      'if (selected) {'
    );

  const poaReturnAt =
    app.indexOf(
      "return selected.type === 'POWER_OF_ATTORNEY'",
      selectedAt
    );

  if (
    selectedAt < 0 ||
    poaReturnAt < 0
  ) {
    fail(
      'Не найден dispatch выбранной задачи'
    );
  }

  app =
    insertAt(
      app,
      poaReturnAt,
`// PART_V064_N1_ETRN_DISPATCH
    if (
      selected.type ===
        'ETRN'
    ) {
      return (
        <EtrnTask
          task={selected}
          user={user}
          onBack={() => {
            window.location.hash =
              '#tasks';
            setSelected(null);
            void reloadTasks(false);
            onChanged();
          }}
        />
      );
    }


    `
    );
}

/* CSS */
if (
  !styles.includes(
    'PART_V064_N1_ETRN_FLOW'
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

/* New-file collision protection. */
ensureNewFile(
  paths.etrnTask,
  'PART_V064_N1_ETRN_TASK',
  etrnTaskContent
);

ensureNewFile(
  paths.poaEtrn,
  'PART_V064_N1_POA_ETRN_PANEL',
  poaEtrnContent
);

/* Checks */
const checks = [
  [
    controller.includes(
      "@Post('etrn')"
    ),
    'POST /tasks/etrn'
  ],
  [
    controller.includes(
      'resubmit-etrn'
    ),
    'resubmit ETRN endpoint'
  ],
  [
    service.includes(
      'PART_V064_N1_ETRN_SERVICE'
    ),
    'ETRN service'
  ],
  [
    service.includes(
      'payload: {'
    ) &&
    service.includes(
      "kind:\n                'ETRN'"
    ),
    'ETRN in payload'
  ],
  [
    service.includes(
      'requestEtrn'
    ),
    'POA request flag'
  ],
  [
    service.includes(
      'normalizedPoaNumber'
    ),
    'POA number save'
  ],
  [
    api.includes(
      'createEtrnTask'
    ),
    'createEtrnTask API'
  ],
  [
    api.includes(
      'resubmitEtrnTask'
    ),
    'resubmitEtrnTask API'
  ],
  [
    power.includes(
      'Доверенность + ЭТРН'
    ),
    'combined POA button'
  ],
  [
    power.includes(
      '<PoaEtrnPanel'
    ),
    'ready POA ETRN panel'
  ],
  [
    power.includes(
      '№ готовой доверенности'
    ),
    'POA number field'
  ],
  [
    app.includes(
      'PART_V064_N1_ETRN_DISPATCH'
    ),
    'ETRN task dispatch'
  ],
  [
    styles.includes(
      'PART_V064_N1_ETRN_FLOW'
    ),
    'ETRN styles'
  ],
];

console.log('');
console.log(
  'v064-N1 v3 — POA → ETRN'
);
console.log(
  '====================='
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
    paths.etrnTask
  )
) {
  fs.writeFileSync(
    paths.etrnTask,
    etrnTaskContent,
    'utf8'
  );
  changed++;
}

if (
  !fs.existsSync(
    paths.poaEtrn
  )
) {
  fs.writeFileSync(
    paths.poaEtrn,
    poaEtrnContent,
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
      paths.app,
      appSource,
      app,
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
      next,
      'v064-n1'
    )
  ) {
    changed++;
  }
}

console.log('');
console.log(
  'v064-N1 применён. Изменено файлов: ' +
  changed
);
