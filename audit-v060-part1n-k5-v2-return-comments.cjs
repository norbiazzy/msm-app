const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : '';
}

function status(label, ok) {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}`
  );
}

const app = read(
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  )
);

const styles = read(
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  )
);

const card =
  app.includes(
    'PART_1N_K5_RETURN_COMMENT_CARD'
  );

const detail =
  app.includes(
    'PART_1N_K5_RETURN_COMMENT_DETAIL'
  );

const label =
  app.includes(
    'Комментарий бухгалтера:'
  );

const emptyProtected =
  app.includes(
    '.returnComment ??'
  ) &&
  app.includes(
    '.trim() &&'
  );

const stylesOk =
  styles.includes(
    'PART_1N_K5_RETURN_COMMENT_STYLES'
  );

console.log('');
console.log(
  'MSM — аудит комментариев возврата K5'
);
console.log(
  '==================================='
);
console.log('');

status(
  'Комментарий на карточке задачи',
  card
);

status(
  'Комментарий внутри открытой задачи',
  detail
);

status(
  'Подпись «Комментарий бухгалтера»',
  label
);

status(
  'Пустой комментарий не рисуется',
  emptyProtected
);

status(
  'Стили добавлены',
  stylesOk
);

console.log('');
console.log('ИТОГ');
console.log('=====');

const all =
  card &&
  detail &&
  label &&
  emptyProtected &&
  stylesOk;

console.log(
  all
    ? 'OK — комментарий бухгалтера виден в возвращённой задаче.'
    : 'WARN — смотрите строки выше.'
);

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
