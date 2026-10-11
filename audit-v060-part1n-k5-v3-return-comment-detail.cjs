const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

function status(label, ok) {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}`
  );
}

const app =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'App.tsx'
    )
  );

const styles =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'styles.css'
    )
  );

const noticeIndex =
  app.indexOf(
    'PART_1N_RETURN_NOTICE'
  );

const notice =
  noticeIndex >= 0
    ? app.slice(
        noticeIndex,
        Math.min(
          app.length,
          noticeIndex + 1800
        )
      )
    : '';

const cardHasComment =
  notice.includes(
    'returnComment'
  );

const detailHasComment =
  app.includes(
    'PART_1N_K5_V3_RETURN_COMMENT_DETAIL'
  ) &&
  app.includes(
    'Комментарий бухгалтера'
  );

const detailOnlyNeedData =
  app.includes(
    "status === 'NEED_DATA' &&"
  );

const stylesOk =
  styles.includes(
    'PART_1N_K5_V3_RETURN_COMMENT_DETAIL_STYLES'
  );

console.log('');
console.log(
  'MSM — аудит K5 v3'
);
console.log(
  '================='
);
console.log('');

status(
  'Карточка списка уже содержит returnComment',
  cardHasComment
);

status(
  'Комментарий добавлен в открытую задачу',
  detailHasComment
);

status(
  'Показывается только для NEED_DATA',
  detailOnlyNeedData
);

status(
  'Стили добавлены',
  stylesOk
);

console.log('');
console.log('ИТОГ');
console.log('=====');

const all =
  cardHasComment &&
  detailHasComment &&
  detailOnlyNeedData &&
  stylesOk;

console.log(
  all
    ? 'OK — комментарий бухгалтера виден и на карточке, и внутри задачи.'
    : 'WARN — смотрите строки выше.'
);

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
