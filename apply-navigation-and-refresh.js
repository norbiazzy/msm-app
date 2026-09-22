const fs = require('fs');
const path = require('path');

const filePath = path.join(
  process.cwd(),
  'frontend',
  'src',
  'App.tsx'
);

if (!fs.existsSync(filePath)) {
  console.error('Не найден frontend/src/App.tsx');
  console.error('Запустите скрипт из D:\\job\\it\\msm-app');
  process.exit(1);
}

let text = fs.readFileSync(filePath, 'utf8');
const original = text;

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  console.error('App.tsx не изменён.');
  process.exit(1);
}

function replaceRequired(regex, replacement, label) {
  if (!regex.test(text)) {
    fail('Не найден фрагмент: ' + label);
  }

  text = text.replace(regex, replacement);
}


// ============================================================
// 1. Маршруты приложения
// ============================================================

if (!text.includes('function readRoute()')) {

  const viewRegex =
    /(type View\s*=\s*'home'\s*\|\s*'new'\s*\|\s*'tasks'\s*\|\s*'deal';)/;

  replaceRequired(
    viewRegex,

`$1

function readRoute(): { view: View; dealId?: string } {
  const hash = window.location.hash.replace(/^#/, '');

  if (hash === 'new') {
    return { view: 'new' };
  }

  if (hash === 'tasks' || hash.startsWith('tasks/')) {
    return { view: 'tasks' };
  }

  if (hash.startsWith('deal/')) {
    return {
      view: 'deal',
      dealId: decodeURIComponent(
        hash.slice('deal/'.length)
      ),
    };
  }

  return { view: 'home' };
}

function routeHash(
  view: View,
  dealId?: string
) {
  if (view === 'deal' && dealId) {
    return '#deal/' + encodeURIComponent(dealId);
  }

  return '#' + view;
}`,

    'тип View'
  );
}


// ============================================================
// 2. Начальный экран берём из URL
// ============================================================

if (
  text.includes(
    "const [view, setView] = useState<View>('home');"
  )
) {
  text = text.replace(
    "const [view, setView] = useState<View>('home');",

`const [view, setView] = useState<View>(
    () => readRoute().view
  );`
  );
}

if (
  text.includes(
    'const [selectedDealId, setSelectedDealId] = useState<string | null>(null);'
  )
) {
  text = text.replace(
    'const [selectedDealId, setSelectedDealId] = useState<string | null>(null);',

`const [selectedDealId, setSelectedDealId] =
    useState<string | null>(
      () => readRoute().dealId ?? null
    );`
  );
}


// ============================================================
// 3. navigate() + браузер Назад / Вперёд
// ============================================================

if (!text.includes('function navigate(')) {

  const reloadRegex =
    /(  async function reload\(currentUser = user\)\s*\{[\s\S]*?setDeals\(data\);\s*\})/;

  replaceRequired(
    reloadRegex,

`$1

  function navigate(
    nextView: View,
    dealId?: string
  ) {
    const nextHash = routeHash(
      nextView,
      dealId
    );

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }

    setView(nextView);
    setSelectedDealId(dealId ?? null);
  }

  useEffect(() => {
    const syncRoute = () => {
      const route = readRoute();

      setView(route.view);
      setSelectedDealId(
        route.dealId ?? null
      );
    };

    if (!window.location.hash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname +
          window.location.search +
          '#home'
      );
    }

    syncRoute();

    window.addEventListener(
      'hashchange',
      syncRoute
    );

    return () => {
      window.removeEventListener(
        'hashchange',
        syncRoute
      );
    };
  }, []);`,

    'функция reload в App'
  );
}


// ============================================================
// 4. Автообновление общего списка сделок
// ============================================================

if (
  !text.includes(
    'void reload(user);'
  )
) {

  const loadingRegex =
    /(\n\s*if\s*\(loading\)\s*return\s*<ScreenMessage>Загрузка…<\/ScreenMessage>;)/;

  replaceRequired(
    loadingRegex,

`
  useEffect(() => {
    if (!user) return;

    const timer = window.setInterval(
      () => {
        void reload(user);
      },
      2000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [user?.id, user?.role]);
$1`,

    'экран загрузки App'
  );
}


// ============================================================
// 5. Навигация главного экрана
// ============================================================

text = text.replace(
  /onNew=\{\(\)\s*=>\s*setView\('new'\)\}/g,
  "onNew={() => navigate('new')}"
);

text = text.replace(
  /onOpen=\{\(id\)\s*=>\s*\{\s*setSelectedDealId\(id\);\s*setView\('deal'\);\s*\}\}/g,
  "onOpen={(id) => navigate('deal', id)}"
);


// ============================================================
// 6. Возврат из сделки
// ============================================================

text = text.replace(
  /onBack=\{async\s*\(\)\s*=>\s*\{\s*await reload\(\);\s*setView\('home'\);\s*\}\}/g,

`onBack={async () => {
            await reload();
            navigate('home');
          }}`
);


// ============================================================
// 7. Новый счёт: Отмена / Создан
// ============================================================

text = text.replace(
  /onCancel=\{\(\)\s*=>\s*setView\('home'\)\}/g,
  "onCancel={() => navigate('home')}"
);

text = text.replace(
  /onCreated=\{async\s*\(\)\s*=>\s*\{\s*await reload\(\);\s*setView\('home'\);\s*\}\}/g,

`onCreated={async () => {
            await reload();
            navigate('home');
          }}`
);


// ============================================================
// 8. Нижняя навигация
// ============================================================

text = text.replace(
  /onClick=\{\(\)\s*=>\s*setView\('home'\)\}/g,
  "onClick={() => navigate('home')}"
);

text = text.replace(
  /onClick=\{\(\)\s*=>\s*setView\('tasks'\)\}/g,
  "onClick={() => navigate('tasks')}"
);


// ============================================================
// 9. Карточка сделки:
//    автообновление без мигания
// ============================================================

const dealStart = text.indexOf('function DealDetail(');
const dealEnd = text.indexOf('function InvoiceBlock(');

if (dealStart === -1 || dealEnd === -1) {
  fail('DealDetail');
}

let dealSection = text.slice(
  dealStart,
  dealEnd
);

if (
  !dealSection.includes(
    'async function reload(showLoading'
  )
) {

  const dealReloadRegex =
    /async function reload\(\)\s*\{[\s\S]*?\}\s*useEffect\(\(\)\s*=>\s*\{\s*void reload\(\);\s*\},\s*\[dealId\]\);/;

  if (!dealReloadRegex.test(dealSection)) {
    fail('reload внутри DealDetail');
  }

  dealSection = dealSection.replace(
    dealReloadRegex,

`async function reload(
    showLoading = true
  ) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setDeal(
        await getDeal(dealId)
      );

      setError('');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void reload(true);

    const timer = window.setInterval(
      () => {
        void reload(false);
      },
      2000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [dealId]);`
  );

  text =
    text.slice(0, dealStart) +
    dealSection +
    text.slice(dealEnd);
}


// ============================================================
// 10. Задачи:
//     тихое автообновление
// ============================================================

const tasksStart = text.indexOf('function TasksView(');
const tasksEnd = text.indexOf('function TaskDetail(');

if (tasksStart === -1 || tasksEnd === -1) {
  fail('TasksView');
}

let tasksSection = text.slice(
  tasksStart,
  tasksEnd
);


// reloadTasks с фоновым режимом

if (
  !tasksSection.includes(
    'async function reloadTasks(showLoading'
  )
) {

  const reloadTasksRegex =
    /async function reloadTasks\(\)\s*\{[\s\S]*?setLoading\(false\);\s*\}\s*\}/;

  if (!reloadTasksRegex.test(tasksSection)) {
    fail('reloadTasks');
  }

  tasksSection = tasksSection.replace(
    reloadTasksRegex,

`async function reloadTasks(
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
  }`
  );
}


// автообновление списка задач

if (
  !tasksSection.includes(
    'void reloadTasks(false);'
  )
) {

  const oldEffectRegex =
    /useEffect\(\(\)\s*=>\s*\{\s*void reloadTasks\(\);\s*\},\s*\[\]\);/;

  if (!oldEffectRegex.test(tasksSection)) {
    fail('useEffect списка задач');
  }

  tasksSection = tasksSection.replace(
    oldEffectRegex,

`useEffect(() => {
    void reloadTasks(true);

    const timer = window.setInterval(
      () => {
        void reloadTasks(false);
      },
      2000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);`
  );
}


// ============================================================
// 11. Стрелки браузера внутри конкретной задачи
// ============================================================

if (
  !tasksSection.includes(
    'const syncSelectedTask'
  )
) {

  const taskEffectMarker =
    /useEffect\(\(\)\s*=>\s*\{[\s\S]*?void reloadTasks\(true\);[\s\S]*?\},\s*\[\]\);/;

  const match =
    tasksSection.match(taskEffectMarker);

  if (!match) {
    fail('место для навигации внутри задач');
  }

  tasksSection = tasksSection.replace(
    match[0],

`${match[0]}

  useEffect(() => {
    const syncSelectedTask = () => {
      const hash =
        window.location.hash.replace(
          /^#/,
          ''
        );

      if (!hash.startsWith('tasks/')) {
        setSelected(null);
        return;
      }

      const taskId =
        decodeURIComponent(
          hash.slice('tasks/'.length)
        );

      const task =
        tasks.find(
          (item) => item.id === taskId
        );

      setSelected(task ?? null);
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
  }, [tasks]);`
  );
}


// При открытии задачи меняем URL

tasksSection = tasksSection.replace(
  /onClick=\{\(\)\s*=>\s*setSelected\(task\)\}/g,

`onClick={() => {
  window.location.hash =
    '#tasks/' +
    encodeURIComponent(task.id);

  setSelected(task);
}}`
);


// Назад из задачи возвращает #tasks

tasksSection = tasksSection.replace(
  /if\s*\(selected\)\s*return\s*<TaskDetail\s+task=\{selected\}\s+user=\{user\}\s+onBack=\{\(\)\s*=>\s*\{\s*setSelected\(null\);\s*void reloadTasks\(\);\s*onChanged\(\);\s*\}\}\s*\/>;/,

`if (selected) {
    return (
      <TaskDetail
        task={selected}
        user={user}
        onBack={() => {
          window.location.hash = '#tasks';
          setSelected(null);
          void reloadTasks(false);
          onChanged();
        }}
      />
    );
  }`
);


// возвращаем изменённый TasksView

text =
  text.slice(0, tasksStart) +
  tasksSection +
  text.slice(tasksEnd);


// ============================================================
// 12. Проверяем, что изменения реально получились
// ============================================================

if (text === original) {
  console.log('');
  console.log(
    'Изменять нечего — обновление уже установлено.'
  );
  process.exit(0);
}


// ============================================================
// 13. Сохраняем резервную копию и новый App.tsx
// ============================================================

const backupPath =
  filePath + '.bak';

fs.copyFileSync(
  filePath,
  backupPath
);

fs.writeFileSync(
  filePath,
  text,
  'utf8'
);

console.log('');
console.log('ГОТОВО');
console.log('');
console.log(
  'Изменён frontend/src/App.tsx'
);
console.log('');
console.log('Добавлено:');
console.log(
  '✓ автообновление сделок'
);
console.log(
  '✓ автообновление задач'
);
console.log(
  '✓ обновление без мигания'
);
console.log(
  '✓ браузер Назад / Вперёд'
);
console.log(
  '✓ навигация внутри конкретной задачи'
);
console.log('');
console.log(
  'Резервная копия: frontend/src/App.tsx.bak'
);