const fs = require('fs');
const path = require('path');

const root = process.cwd();

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const apiPath = path.join(
  root,
  'frontend',
  'src',
  'api.ts'
);

const cssPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

for (const file of [
  appPath,
  apiPath,
  cssPath,
]) {
  if (!fs.existsSync(file)) {
    console.error(
      'Не найден файл: ' + file
    );

    process.exit(1);
  }

  fs.copyFileSync(
    file,
    file + '.bak-v038'
  );
}


// ======================================================
// API TYPE
// ======================================================

let api =
  fs.readFileSync(
    apiPath,
    'utf8'
  );

if (
  !api.includes(
    'createdAt?: string;'
  )
) {
  api = api.replace(
    `  description?: string;
  deal: Deal;`,

    `  description?: string;
  createdAt?: string;
  updatedAt?: string;
  deal: Deal;`
  );
}


// ======================================================
// APP
// ======================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );

const tasksStart =
  app.indexOf(
    'function TasksView('
  );

const taskDetailStart =
  app.indexOf(
    'function TaskDetail(',
    tasksStart
  );

if (
  tasksStart === -1 ||
  taskDetailStart === -1
) {
  console.error(
    'Не найден TasksView'
  );

  process.exit(1);
}


const tasksView = `
function TasksView({ user, onChanged }: { user: CurrentUser; onChanged: () => void }) {

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState<Task | null>(null);

  const [
    showCompleted,
    setShowCompleted,
  ] = useState(false);


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
        window.location.hash
          .replace(
            /^#/,
            ''
          );


      if (
        !hash.startsWith(
          'tasks/'
        )
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


      const found =
        tasks.find(
          (item) =>
            item.id === taskId
        );


      if (found) {
        setSelected(found);
      }
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


  function taskTime(
    task: Task
  ) {

    if (!task.createdAt) {
      return 0;
    }


    const value =
      new Date(
        task.createdAt
      ).getTime();


    return Number.isFinite(value)
      ? value
      : 0;
  }


  function sortActive(
    items: Task[]
  ) {

    return [...items].sort(
      (a, b) => {

        // Срочные первыми
        // только внутри своей группы.
        if (
          a.urgent !==
          b.urgent
        ) {

          return a.urgent
            ? -1
            : 1;
        }


        // Старые выше новых.
        return (
          taskTime(a) -
          taskTime(b)
        );
      }
    );
  }


  const inProgress =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'IN_PROGRESS'
          )
        ),
      [tasks]
    );


  const newTasks =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'NEW'
          )
        ),
      [tasks]
    );


  const needData =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'NEED_DATA'
          )
        ),
      [tasks]
    );


  const otherActive =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              ![
                'IN_PROGRESS',
                'NEW',
                'NEED_DATA',
                'DONE',
                'CANCELLED',
              ].includes(
                task.status
              )
          )
        ),
      [tasks]
    );


  const completed =
    useMemo(
      () =>
        [...tasks]
          .filter(
            (task) =>
              [
                'DONE',
                'CANCELLED',
              ].includes(
                task.status
              )
          )
          .sort(
            (a, b) =>
              taskTime(b) -
              taskTime(a)
          ),
      [tasks]
    );


  const activeCount =
    inProgress.length +
    newTasks.length +
    needData.length +
    otherActive.length;


  function openTask(
    task: Task
  ) {

    window.location.hash =
      '#tasks/' +
      encodeURIComponent(
        task.id
      );

    setSelected(task);
  }


  function renderTask(
    task: Task,
    completedTask = false
  ) {

    const statusClass =
      task.status
        .toLowerCase()
        .replace(
          /_/g,
          '-'
        );


    return (

      <button
        key={task.id}

        className={
          'taskCard taskCardStatus-' +
          statusClass +
          (
            task.urgent &&
            !completedTask
              ? ' taskCardUrgent'
              : ''
          ) +
          (
            completedTask
              ? ' taskCardCompleted'
              : ''
          )
        }

        onClick={() =>
          openTask(task)
        }
      >

        <div className="taskCardMain">

          <div className="taskCardTitle">

            <strong>
              {task.title}
            </strong>


            {task.urgent &&
              !completedTask && (

              <b className="urgent">
                СРОЧНО
              </b>

            )}

          </div>


          <span className="taskClient">

            {task.deal.clientName}

            {' · '}

            ЗК-
            {task.deal.internalNumber}

          </span>


          {task.createdAt && (

            <span className="taskCreated">

              Создана{' '}

              {
                new Date(
                  task.createdAt
                ).toLocaleString(
                  'ru-RU',
                  {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )
              }

            </span>

          )}

        </div>


        <div className="taskState">

          <span
            className={
              'taskStatusBadge taskStatus-' +
              statusClass
            }
          >

            {
              taskStatus(
                task.status
              )
            }

          </span>

        </div>

      </button>

    );
  }


  function renderGroup(
    title: string,
    items: Task[],
    className: string
  ) {

    if (
      items.length === 0
    ) {
      return null;
    }


    return (

      <div
        className={
          'taskGroup ' +
          className
        }
      >

        <div className="taskGroupHead">

          <strong>
            {title}
          </strong>

          <span>
            {items.length}
          </span>

        </div>


        <div className="dealList">

          {items.map(
            (task) =>
              renderTask(task)
          )}

        </div>

      </div>

    );
  }


  if (selected) {

    return (

      <TaskDetail
        task={selected}
        user={user}

        onBack={() => {

          window.location.hash =
            '#tasks';

          setSelected(null);

          void reloadTasks(
            false
          );

          onChanged();
        }}
      />

    );
  }


  return (

    <section className="content">

      <div className="sectionHead">

        <div>

          <h2>
            Задачи бухгалтерии
          </h2>

          <div className="taskQueueCaption">
            Активных задач: {activeCount}
          </div>

        </div>


        <span>
          {activeCount}
        </span>

      </div>


      {loading ? (

        <div className="empty">
          Загрузка…
        </div>

      ) : activeCount === 0 ? (

        <div className="empty">
          Активных задач нет
        </div>

      ) : (

        <div className="taskQueue">

          {renderGroup(
            'В работе',
            inProgress,
            'taskGroupWorking'
          )}


          {renderGroup(
            'Новые',
            newTasks,
            'taskGroupNew'
          )}


          {renderGroup(
            'Нужны данные',
            needData,
            'taskGroupNeedData'
          )}


          {renderGroup(
            'Остальные',
            otherActive,
            'taskGroupOther'
          )}

        </div>

      )}


      {completed.length > 0 && (

        <div className="completedTasksBlock">

          <button
            type="button"
            className="completedToggle"

            onClick={() =>
              setShowCompleted(
                (value) =>
                  !value
              )
            }
          >

            <span>
              {showCompleted
                ? 'Скрыть выполненные'
                : 'Показать выполненные'}
            </span>

            <b>
              {completed.length}
            </b>

          </button>


          {showCompleted && (

            <div className="completedTasksList">

              {completed.map(
                (task) =>
                  renderTask(
                    task,
                    true
                  )
              )}

            </div>

          )}

        </div>

      )}

    </section>
  );
}
`;


app =
  app.slice(
    0,
    tasksStart
  ) +

  tasksView.trim() +
  '\n\n' +

  app.slice(
    taskDetailStart
  );


// ======================================================
// CSS
// ======================================================

let css =
  fs.readFileSync(
    cssPath,
    'utf8'
  );


if (
  !css.includes(
    '/* MSM task queue v0.3.8 */'
  )
) {

  css += `

/* MSM task queue v0.3.8 */

.taskQueue {
  display: grid;
  gap: 22px;
}

.taskQueueCaption {
  margin-top: 4px;
  font-size: 12px;
  color: #78716c;
}

.taskGroup {
  display: grid;
  gap: 9px;
}

.taskGroupHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 3px;
}

.taskGroupHead strong {
  font-size: 13px;
  letter-spacing: .01em;
}

.taskGroupHead span {
  display: grid;
  place-items: center;
  min-width: 25px;
  height: 25px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}


/* В работе */

.taskGroupWorking
.taskGroupHead strong {
  color: #1d4ed8;
}

.taskGroupWorking
.taskGroupHead span {
  background: #dbeafe;
  color: #1d4ed8;
}


/* Новые */

.taskGroupNew
.taskGroupHead strong {
  color: #b45309;
}

.taskGroupNew
.taskGroupHead span {
  background: #fef3c7;
  color: #92400e;
}


/* Нужны данные */

.taskGroupNeedData
.taskGroupHead strong {
  color: #7c3aed;
}

.taskGroupNeedData
.taskGroupHead span {
  background: #ede9fe;
  color: #6d28d9;
}


.taskCard {
  position: relative;
  overflow: hidden;
  align-items: center;
  min-height: 82px;
  border-left-width: 4px;
  box-shadow:
    0 2px 10px
    rgba(0,0,0,.025);
}


/* В работе */

.taskCardStatus-in-progress {
  border-left-color: #3b82f6;
  background: #f8fbff;
}


/* Новая */

.taskCardStatus-new {
  border-left-color: #f59e0b;
  background: #fffdf7;
}


/* Нужны данные */

.taskCardStatus-need-data {
  border-left-color: #8b5cf6;
  background: #fbfaff;
}


.taskCardMain {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.taskCardTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.taskCardTitle strong {
  font-size: 15px;
}

.taskClient {
  color: #57534e !important;
  font-size: 12px !important;
}

.taskCreated {
  color: #a8a29e !important;
  font-size: 10px !important;
}


/* Статус */

.taskStatusBadge {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  margin: 0 !important;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 11px !important;
  font-weight: 800;
  white-space: nowrap;
}

.taskStatus-in-progress {
  background: #dbeafe;
  color: #1d4ed8 !important;
}

.taskStatus-new {
  background: #fef3c7;
  color: #92400e !important;
}

.taskStatus-need-data {
  background: #ede9fe;
  color: #6d28d9 !important;
}

.taskStatus-done,
.taskStatus-cancelled {
  background: #e7e5e4;
  color: #78716c !important;
}


/* Срочная активная */

.taskCardUrgent {
  box-shadow:
    0 0 0 1px
    rgba(185,28,28,.08),
    0 4px 16px
    rgba(185,28,28,.06);
}


/* Выполненные */

.completedTasksBlock {
  display: grid;
  gap: 10px;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid #e7e5e4;
}

.completedToggle {
  width: 100%;
  border: 0;
  background: transparent;
  color: #78716c;
  padding: 8px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  font-weight: 700;
}

.completedToggle b {
  display: grid;
  place-items: center;
  min-width: 25px;
  height: 25px;
  padding: 0 7px;
  border-radius: 999px;
  background: #e7e5e4;
  color: #78716c;
  font-size: 11px;
}

.completedTasksList {
  display: grid;
  gap: 7px;
  animation:
    msmFadeUp
    180ms
    ease-out
    both;
}

.taskCardCompleted {
  background: #f5f5f4;
  border-color: #e7e5e4;
  border-left-color: #d6d3d1;
  box-shadow: none;
  opacity: .62;
}

.taskCardCompleted:hover {
  opacity: .82;
}

.taskCardCompleted
.urgent {
  display: none;
}


/* Наведение */

.taskCard:not(.taskCardCompleted):hover {
  box-shadow:
    0 6px 20px
    rgba(0,0,0,.055);
}


/* Телефон */

@media (max-width: 520px) {

  .taskCard {
    align-items: flex-start;
  }

  .taskState {
    min-width: max-content;
  }

  .taskCardTitle {
    align-items: flex-start;
  }

  .taskQueue {
    gap: 19px;
  }
}
`;
}


// ======================================================
// SAVE
// ======================================================

fs.writeFileSync(
  appPath,
  app,
  'utf8'
);

fs.writeFileSync(
  apiPath,
  api,
  'utf8'
);

fs.writeFileSync(
  cssPath,
  css,
  'utf8'
);


console.log('');
console.log(
  'ГОТОВО — MSM v0.3.8'
);

console.log('');

console.log(
  '✓ В работе всегда сверху'
);

console.log(
  '✓ Новые идут от старых к новым'
);

console.log(
  '✓ Срочные первыми внутри статуса'
);

console.log(
  '✓ Нужны данные отдельной группой'
);

console.log(
  '✓ Выполненные скрыты'
);

console.log(
  '✓ Есть Показать выполненные'
);

console.log(
  '✓ Выполненные серые и неактивные'
);

console.log(
  '✓ Срочность у выполненных скрыта'
);

console.log(
  '✓ Цветовые акценты по статусам'
);

console.log('');

console.log(
  'Миграция базы не нужна.'
);