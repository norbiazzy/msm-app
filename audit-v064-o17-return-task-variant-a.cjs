const fs = require('fs');
const path = require('path');

const root = __dirname;

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const stylesPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

const app =
  fs.existsSync(appPath)
    ? fs.readFileSync(
        appPath,
        'utf8'
      )
    : '';

const css =
  fs.existsSync(stylesPath)
    ? fs.readFileSync(
        stylesPath,
        'utf8'
      )
    : '';

const checks = [
  [
    app.includes(
      'PART_V064_O17_RETURN_TASK_VARIANT_A'
    ),
    'патч установлен'
  ],
  [
    app.includes(
      'taskReturnNoticeV4'
    ),
    'возврат внутри карточки'
  ],
  [
    app.includes('↩'),
    'иконка возврата'
  ],
  [
    !app.includes(
      'Открыть и исправить →'
    ),
    'отдельной ссылки нет'
  ],
  [
    css.includes(
      '.taskCard.taskCardStatus-need-data'
    ),
    'NEED_DATA grid'
  ],
  [
    css.includes(
      '.taskReturnReasonText'
    ),
    'причина'
  ],
  [
    css.includes(
      '.taskReturnCommentText'
    ),
    'комментарий'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O1.7'
);
console.log(
  '======================'
);

let failed = false;

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    failed = true;
  }
}

console.log('');

if (failed) {
  console.log(
    'ИТОГ: есть ошибки.'
  );
  process.exit(1);
}

console.log(
  'ИТОГ: OK — возврат встроен в карточку, отдельной кнопки нет.'
);
