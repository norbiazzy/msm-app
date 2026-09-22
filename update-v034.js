const fs = require('fs');
const path = require('path');

const root = process.cwd();

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const typesPath = path.join(
  root,
  'frontend',
  'src',
  'types.ts'
);

const tasksPath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.service.ts'
);

for (const file of [appPath, typesPath, tasksPath]) {
  if (!fs.existsSync(file)) {
    console.error('Не найден файл: ' + file);
    process.exit(1);
  }
}

let app = fs.readFileSync(appPath, 'utf8');
let types = fs.readFileSync(typesPath, 'utf8');

function replaceSection(
  source,
  startMarker,
  endMarker,
  replacement,
  name
) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(
    endMarker,
    start + startMarker.length
  );

  if (start === -1 || end === -1) {
    console.error(
      'Не удалось найти раздел: ' + name
    );
    process.exit(1);
  }

  return (
    source.slice(0, start) +
    replacement.trim() +
    '\n\n' +
    source.slice(end)
  );
}


// ======================================================
// НОВЫЙ СЧЁТ
// ======================================================

const newDealForm = `
function NewDealForm({ user, onCancel, onCreated }: { user: CurrentUser; onCancel: () => void; onCreated: () => void }) {
  const [sellerType, setSellerType] = useState<SellerType>('MSM');
  const [requestMode, setRequestMode] = useState<'TEXT' | 'INCOMING_INVOICE'>('TEXT');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [requestText, setRequestText] = useState('');
  const [marginMode, setMarginMode] = useState('TOTAL_PLUS');
  const [marginValue, setMarginValue] = useState('');
  const [accountingComment, setAccountingComment] = useState('');
  const [managerComment, setManagerComment] = useState('');
  const [incomingFiles, setIncomingFiles] = useState<File[]>([]);
  const [urgent, setUrgent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addIncomingFiles(files: FileList | null) {
    if (!files) return;

    const selected = Array.from(files);

    setIncomingFiles((current) => {
      const combined = [...current, ...selected];

      return combined.filter(
        (file, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.name === file.name &&
              candidate.size === file.size &&
              candidate.lastModified === file.lastModified
          ) === index
      );
    });
  }

  function removeIncomingFile(index: number) {
    setIncomingFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

    setError('');
    setSaving(true);

    try {
      const deal = await createDeal({
        sellerType,

        clientName:
          clientName.trim() ||
          'Тестовый клиент',

        clientPhone:
          clientPhone.trim() ||
          undefined,

        requestMode,

        requestText:
          requestText.trim() ||
          undefined,

        marginMode,

        marginValue:
          marginValue
            ? Number(marginValue)
            : undefined,

        accountingComment:
          accountingComment.trim() ||
          undefined,

        managerComment:
          managerComment.trim() ||
          undefined,

        urgent,

        managerId: user.id,
        createdById: user.id,
      });

      if (
        requestMode ===
        'INCOMING_INVOICE'
      ) {
        for (
          const incomingFile
          of incomingFiles
        ) {
          await uploadDealFile(
            deal.id,
            incomingFile,
            'INCOMING_SUPPLIER_INVOICE'
          );
        }
      }

      onCreated();

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Не удалось создать заявку'
      );

    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="content form"
      onSubmit={submit}
    >

      <Field title="От кого выставляем">
        <div className="segmented">

          {(
            ['ST', 'MSM', 'IP']
            as SellerType[]
          ).map((type) => (

            <button
              type="button"
              key={type}
              className={
                sellerType === type
                  ? 'selected'
                  : ''
              }
              onClick={() =>
                setSellerType(type)
              }
            >
              {sellerLabels[type]}
            </button>

          ))}

        </div>
      </Field>


      <Field title="Кому продаём">

        <input
          value={clientName}
          onChange={(e) =>
            setClientName(
              e.target.value
            )
          }
          placeholder="ООО «Главолснаб»"
        />

      </Field>


      <Field title="Телефон">

        <input
          value={clientPhone}
          onChange={(e) =>
            setClientPhone(
              e.target.value
            )
          }
          placeholder="+7…"
        />

      </Field>


      <Field title="Как передаём данные">

        <div className="segmented two">

          <button
            type="button"
            className={
              requestMode === 'TEXT'
                ? 'selected'
                : ''
            }
            onClick={() =>
              setRequestMode('TEXT')
            }
          >
            Позиции текстом
          </button>


          <button
            type="button"
            className={
              requestMode ===
              'INCOMING_INVOICE'
                ? 'selected'
                : ''
            }
            onClick={() =>
              setRequestMode(
                'INCOMING_INVOICE'
              )
            }
          >
            По входящему
          </button>

        </div>

      </Field>


      {requestMode ===
        'INCOMING_INVOICE' && (

        <Field title="Входящие счета">

          <div>

            <label className="fileButton">

              {incomingFiles.length
                ? '+ Прикрепить ещё'
                : 'Прикрепить счёт'}

              <input
                type="file"
                multiple
                accept="application/pdf,image/*"
                style={{
                  display: 'none'
                }}
                onChange={(e) => {

                  addIncomingFiles(
                    e.target.files
                  );

                  e.currentTarget.value =
                    '';
                }}
              />

            </label>


            {incomingFiles.length > 0 && (

              <div className="versionList">

                {incomingFiles.map(
                  (file, index) => (

                    <div
                      className="versionRow"
                      key={
                        file.name +
                        file.size +
                        file.lastModified
                      }
                    >

                      <div>

                        <b>
                          {file.name}
                        </b>

                        <span>
                          {
                            (
                              file.size /
                              1024 /
                              1024
                            ).toFixed(2)
                          } МБ
                        </span>

                      </div>


                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          removeIncomingFile(
                            index
                          )
                        }
                      >
                        Удалить
                      </button>

                    </div>

                  )
                )}

              </div>

            )}


            <div className="microcopy">
              Можно прикрепить один
              или несколько счетов.
              До отправки любой файл
              можно удалить.
            </div>

          </div>

        </Field>

      )}


      <Field
        title={
          requestMode === 'TEXT'
            ? 'Позиции и стоимость'
            : 'Описание входящего счёта'
        }
      >

        <textarea
          rows={5}
          value={requestText}
          onChange={(e) =>
            setRequestText(
              e.target.value
            )
          }
          placeholder="Bonolit D500 — 32,4 м³ × 5 600 ₽…"
        />

      </Field>


      <Field title="Наценка / цена">

        <div className="inline">

          <select
            value={marginMode}
            onChange={(e) =>
              setMarginMode(
                e.target.value
              )
            }
          >
            <option value="TOTAL_PLUS">
              + к сумме
            </option>

            <option value="UNIT_PLUS">
              + за единицу
            </option>

            <option value="PERCENT">
              + %
            </option>

            <option value="FINAL">
              Итоговая цена
            </option>
          </select>


          <input
            inputMode="decimal"
            value={marginValue}
            onChange={(e) =>
              setMarginValue(
                e.target.value
              )
            }
            placeholder="0"
          />

        </div>

      </Field>


      <Field title="Комментарий бухгалтерии">

        <textarea
          rows={3}
          value={accountingComment}
          onChange={(e) =>
            setAccountingComment(
              e.target.value
            )
          }
          placeholder="Доставку выделить отдельной строкой…"
        />

      </Field>


      <Field title="Мой комментарий">

        <textarea
          rows={3}
          value={managerComment}
          onChange={(e) =>
            setManagerComment(
              e.target.value
            )
          }
          placeholder="Позвонить клиенту после 14:00…"
        />

      </Field>


      <label className="urgentToggle">

        <input
          type="checkbox"
          checked={urgent}
          onChange={(e) =>
            setUrgent(
              e.target.checked
            )
          }
        />

        <span>
          Срочное
        </span>

      </label>


      {error && (
        <div className="error">
          {error}
        </div>
      )}


      <div className="actions">

        <button
          type="button"
          className="secondary"
          onClick={onCancel}
        >
          Отмена
        </button>


        <button
          className="primary"
          disabled={saving}
        >
          {saving
            ? 'Отправляем…'
            : 'Отправить бухгалтерии'}
        </button>

      </div>

    </form>
  );
}
`;


// ======================================================
// ЗАДАЧИ
// ======================================================

const tasksView = `
function TasksView({ user, onChanged }: { user: CurrentUser; onChanged: () => void }) {
  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState<Task | null>(null);


  async function reloadTasks(
    showLoading = true
  ) {

    if (showLoading) {
      setLoading(true);
    }

    try {

      setTasks(
        await listTasks()
      );

    } finally {

      if (showLoading) {
        setLoading(false);
      }

    }
  }


  useEffect(() => {

    void reloadTasks(true);

    const timer =
      window.setInterval(
        () => {
          void reloadTasks(false);
        },
        2000
      );

    return () => {
      window.clearInterval(timer);
    };

  }, []);


  useEffect(() => {

    const syncSelectedTask = () => {

      const hash =
        window.location.hash.replace(
          /^#/,
          ''
        );

      if (
        !hash.startsWith('tasks/')
      ) {

        setSelected(null);
        return;
      }

      const taskId =
        decodeURIComponent(
          hash.slice(
            'tasks/'.length
          )
        );

      const task =
        tasks.find(
          (item) =>
            item.id === taskId
        );

      setSelected(
        task ?? null
      );
    };


    syncSelectedTask();


    window.addEventListener(
      'hashchange',
      syncSelectedTask
    );


    return () => {

      window.removeEventListener(
        'hashchange',
        syncSelectedTask
      );

    };

  }, [tasks]);


  if (selected) {

    return (

      <TaskDetail
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


  return (

    <section className="content">

      <div className="sectionHead">

        <h2>
          Задачи бухгалтерии
        </h2>

        <span>
          {
            tasks.filter(
              (task) =>
                ![
                  'DONE',
                  'CANCELLED'
                ].includes(
                  task.status
                )
            ).length
          }
        </span>

      </div>


      {loading ? (

        <div className="empty">
          Загрузка…
        </div>

      ) : (

        <div className="dealList">

          {tasks.map((task) => (

            <button
              key={task.id}
              className="taskCard"

              onClick={() => {

                window.location.hash =
                  '#tasks/' +
                  encodeURIComponent(
                    task.id
                  );

                setSelected(task);
              }}
            >

              <div>

                <strong>
                  {task.title}
                </strong>

                <span>
                  {task.deal.clientName}
                  {' · '}
                  ЗК-
                  {task.deal.internalNumber}
                </span>

              </div>


              <div className="taskState">

                {task.urgent && (
                  <b className="urgent">
                    СРОЧНО
                  </b>
                )}

                <span>
                  {
                    taskStatus(
                      task.status
                    )
                  }
                </span>

              </div>

            </button>

          ))}

        </div>

      )}

    </section>
  );
}
`;


// ======================================================
// ОТКРЫТАЯ ЗАДАЧА
// ======================================================

const taskDetail = `
function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {

  const [status, setStatus] =
    useState(task.status);

  const [number, setNumber] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [file, setFile] =
    useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  useEffect(() => {

    setStatus(task.status);

  }, [
    task.id,
    task.status
  ]);


  async function take() {

    setSaving(true);
    setError('');

    try {

      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id
      );

      // остаёмся внутри задачи
      setStatus(
        'IN_PROGRESS'
      );

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {

      setSaving(false);

    }
  }


  async function finishInvoice() {

    setSaving(true);
    setError('');

    try {

      let fileId:
        string | undefined;


      if (file) {

        const uploaded =
          await uploadDealFile(
            task.deal.id,
            file,
            'CLIENT_INVOICE'
          );

        fileId =
          uploaded.id;
      }


      await createInvoice(
        task.deal.id,
        {

          // Пока тестовый режим.
          // Перед рабочим запуском
          // номер делаем обязательным.
          number:
            number.trim(),

          amount:
            amount
              ? Number(amount)
              : undefined,

          invoiceDate:
            todayLocalDate(),

          fileId,

          actorId:
            user.id,
        }
      );


      onBack();

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {

      setSaving(false);

    }
  }


  const canAttachInvoice =
    [
      'ISSUE_CLIENT_INVOICE',
      'CORRECT_CLIENT_INVOICE'
    ].includes(
      task.type
    );


  const incomingFiles =
    task.deal.files || [];


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
          ЗК-
          {task.deal.internalNumber}
        </div>


        <h2>
          {task.title}
        </h2>


        <p>
          {task.deal.clientName}
        </p>


        <div className="statusPill">
          {taskStatus(status)}
        </div>


        {task.urgent && (

          <b className="urgent">
            СРОЧНО
          </b>

        )}

      </div>


      {task.deal.requestText && (

        <div className="infoBox">

          <strong>
            Запрос менеджера
          </strong>

          <p>
            {task.deal.requestText}
          </p>

        </div>

      )}


      {task.description && (

        <div className="infoBox">

          <strong>
            Комментарий
          </strong>

          <p>
            {task.description}
          </p>

        </div>

      )}


      {incomingFiles.length > 0 && (

        <div className="infoBox">

          <strong>
            Входящие счета
          </strong>


          <div className="versionList">

            {incomingFiles.map(
              (incomingFile) => (

                <div
                  className="versionRow"
                  key={
                    incomingFile.id
                  }
                >

                  <div>

                    <b>
                      {
                        incomingFile
                          .originalName
                      }
                    </b>

                    <span>
                      Файл от менеджера
                    </span>

                  </div>


                  <a
                    href={
                      dealFileUrl(
                        incomingFile.id
                      )
                    }
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


      {status === 'NEW' && (

        <button
          className="primary wide"
          disabled={saving}
          onClick={take}
        >

          {saving
            ? 'Сохраняем…'
            : 'В работу'}

        </button>

      )}


      {status ===
        'IN_PROGRESS' && (

        <div className="infoBox">

          <strong>
            Задача в работе
          </strong>

          <p>
            Заполните готовый счёт ниже.
          </p>

        </div>

      )}


      {canAttachInvoice &&
        status ===
          'IN_PROGRESS' && (

        <>

          <Field title="Номер готового счёта">

            <input
              value={number}
              onChange={(e) =>
                setNumber(
                  e.target.value
                )
              }
              placeholder="1548"
            />

          </Field>


          <Field title="Сумма">

            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }
              placeholder="420000"
            />

          </Field>


          <Field title="PDF счёта">

            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) =>
                setFile(
                  e.target.files?.[0] ||
                  null
                )
              }
            />

          </Field>


          <button
            className="primary wide"
            disabled={saving}
            onClick={finishInvoice}
          >

            {saving
              ? 'Сохраняем…'
              : 'Счёт готов'}

          </button>


          <div className="microcopy">

            Дата счёта ставится
            автоматически — сегодняшняя.

            Сейчас тестовый режим:
            номер счёта можно
            оставить пустым.

            Перед рабочим запуском
            номер счёта станет
            обязательным.

          </div>

        </>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>
  );
}


function todayLocalDate() {

  const now =
    new Date();

  const local =
    new Date(
      now.getTime() -
      now.getTimezoneOffset() *
        60000
    );

  return local
    .toISOString()
    .slice(0, 10);
}
`;


// ======================================================
// ЗАМЕНЯЕМ ФУНКЦИИ
// ======================================================

app = replaceSection(
  app,
  'function NewDealForm(',
  'function TasksView(',
  newDealForm,
  'NewDealForm'
);


app = replaceSection(
  app,
  'function TasksView(',
  'function TaskDetail(',
  tasksView,
  'TasksView'
);


app = replaceSection(
  app,
  'function TaskDetail(',
  'function money(',
  taskDetail,
  'TaskDetail'
);


// ======================================================
// TYPES
// ======================================================

if (
  !types.includes(
    'category?: string;'
  )
) {

  types = types.replace(
    '  mimeType?: string;\n};',

    '  mimeType?: string;\n' +
    '  category?: string;\n' +
    '};'
  );
}


if (
  !types.includes(
    'files?: StoredFile[];'
  )
) {

  types = types.replace(
    '  tasks: DealTask[];',

    '  tasks: DealTask[];\n' +
    '  files?: StoredFile[];'
  );
}


// ======================================================
// TASKS SERVICE
// ======================================================

const tasksService =
`import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  list() {
    return this.prisma.task.findMany({
      orderBy: [
        { urgent: 'desc' },
        { createdAt: 'asc' },
      ],

      include: {
        deal: {
          include: {
            invoices: {
              where: {
                isCurrent: true,
              },
              take: 1,
            },

            files: {
              where: {
                category:
                  'INCOMING_SUPPLIER_INVOICE',
              },

              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },

        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    assigneeId?: string,
  ) {
    return this.prisma.task.update({
      where: {
        id,
      },

      data: {
        status,
        assigneeId,

        completedAt:
          status === TaskStatus.DONE
            ? new Date()
            : null,
      },
    });
  }
}
`;


// ======================================================
// BACKUP
// ======================================================

fs.copyFileSync(
  appPath,
  appPath + '.bak-v034'
);

fs.copyFileSync(
  typesPath,
  typesPath + '.bak-v034'
);

fs.copyFileSync(
  tasksPath,
  tasksPath + '.bak-v034'
);


// ======================================================
// SAVE
// ======================================================

fs.writeFileSync(
  appPath,
  app,
  'utf8'
);

fs.writeFileSync(
  typesPath,
  types,
  'utf8'
);

fs.writeFileSync(
  tasksPath,
  tasksService,
  'utf8'
);


console.log('');
console.log('ГОТОВО — MSM v0.3.4');
console.log('');
console.log('Добавлено:');
console.log('✓ В работу без выхода из задачи');
console.log('✓ Статус меняется сразу');
console.log('✓ Поля счёта появляются после В работу');
console.log('✓ Дата автоматически сегодня');
console.log('✓ Поле даты удалено');
console.log('✓ Несколько входящих счетов');
console.log('✓ Удаление выбранных файлов');
console.log('✓ Можно прикреплять ещё');
console.log('✓ Входящие счета видны бухгалтеру');
console.log('✓ Исправленный список задач');
console.log('');
console.log('Миграция базы не нужна.');