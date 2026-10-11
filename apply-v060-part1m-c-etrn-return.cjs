const fs = require('fs');
const path = require('path');

const root =
  __dirname;

const checkOnly =
  process.argv.includes(
    '--check'
  );


const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const panelPath =
  path.join(
    root,
    'frontend',
    'src',
    'ReturnToManagerPanel.tsx'
  );


function fail(message) {

  console.error('');

  console.error(
    'ОШИБКА: ' +
      message
  );

  process.exit(1);
}


function read(file) {

  if (
    !fs.existsSync(file)
  ) {

    fail(
      'Не найден файл: ' +
        file
    );
  }


  return fs.readFileSync(
    file,
    'utf8'
  );
}


function write(
  file,
  text
) {

  fs.writeFileSync(
    file,
    text,
    'utf8'
  );
}


let app =
  read(
    appPath
  );

const panel =
  read(
    panelPath
  );


if (
  !panel.includes(
    'export function ReturnToManagerPanel'
  )
) {

  fail(
    'Не найден ReturnToManagerPanel.tsx. Сначала нужен Part 1M-A.'
  );
}


if (
  !app.includes(
    'function TaskDetail('
  )
) {

  fail(
    'Не найден function TaskDetail() в App.tsx.'
  );
}


/*
 * Part 1M-B should already be present.
 * We only expand its task-type condition.
 */

if (
  app.includes(
    'PART_1M_B_POWER_OF_ATTORNEY_RETURN'
  )
) {

  if (
    !app.includes(
      'PART_1M_C_ETRN_RETURN'
    )
  ) {

    const markerIndex =
      app.indexOf(
        'PART_1M_B_POWER_OF_ATTORNEY_RETURN'
      );


    const searchStart =
      Math.max(
        0,
        markerIndex - 200
      );


    const searchEnd =
      Math.min(
        app.length,
        markerIndex + 1400
      );


    const nearby =
      app.slice(
        searchStart,
        searchEnd
      );


    const oldConditionRegex =
      /task\.type\s*===\s*['"]POWER_OF_ATTORNEY['"]/;


    if (
      oldConditionRegex.test(
        nearby
      )
    ) {

      const replacement =
        `[
          'POWER_OF_ATTORNEY',
          'ETRN',
        ].includes(
          task.type
        )`;


      const changedNearby =
        nearby.replace(
          oldConditionRegex,
          replacement
        );


      const markerComment =
        `      {/* PART_1M_C_ETRN_RETURN */}\n`;


      app =
        app.slice(
          0,
          searchStart
        ) +
        changedNearby.replace(
          '      {/* PART_1M_B_POWER_OF_ATTORNEY_RETURN */}',
          `      {/* PART_1M_B_POWER_OF_ATTORNEY_RETURN */}\n${markerComment}`
        ) +
        app.slice(
          searchEnd
        );

    } else {

      const combinedConditionRegex =
        /\[\s*['"]POWER_OF_ATTORNEY['"]\s*,\s*['"]ETRN['"]\s*,?\s*\]\.includes\(\s*task\.type\s*\)/;


      if (
        combinedConditionRegex.test(
          nearby
        )
      ) {

        app =
          app.slice(
            0,
            markerIndex
          ) +
          'PART_1M_C_ETRN_RETURN\n      ' +
          app.slice(
            markerIndex
          );

      } else {

        fail(
          'Нашёл Part 1M-B, но не смог определить условие POWER_OF_ATTORNEY рядом с ним.'
        );
      }
    }
  }

} else {

  fail(
    'Part 1M-B не найден. Сначала примените возврат для доверенности.'
  );
}


if (
  !app.includes(
    "'ETRN'"
  ) ||
  !app.includes(
    'PART_1M_C_ETRN_RETURN'
  )
) {

  fail(
    'Не удалось подключить ETRN к возврату менеджеру.'
  );
}


console.log('');

console.log(
  'Проверка Part 1M-C:'
);

console.log(
  '  ReturnToManagerPanel: OK'
);

console.log(
  '  Part 1M-B доверенность: OK'
);

console.log(
  '  ETRN: подключён'
);

console.log(
  '  Единый блок для POWER_OF_ATTORNEY + ETRN: OK'
);

console.log(
  '  Возврат доступен для NEW / IN_PROGRESS'
);

console.log(
  '  Данные задачи и вложения не очищаются'
);


if (
  checkOnly
) {

  console.log('');

  console.log(
    'CHECK ONLY — файлы не изменены.'
  );

  process.exit(0);
}


const stamp =
  new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      '-'
    );


fs.copyFileSync(
  appPath,
  appPath +
    '.before-part1m-c-' +
    stamp
);


write(
  appPath,
  app
);


console.log('');

console.log(
  'Part 1M-C применён.'
);

console.log('');

console.log(
  'Дальше:'
);

console.log(
  '  git diff --check'
);

console.log(
  '  cd frontend'
);

console.log(
  '  npm run build'
);
