const fs = require('fs');
const path = require('path');

const root = __dirname;

const targets = [
  {
    file: path.join(
      root,
      'frontend',
      'src',
      'App.tsx'
    ),
    needles: [
      '<ReturnToManagerPanel',
      'Отказать / вернуть',
    ],
    label: 'App.tsx / TaskDetail',
  },
  {
    file: path.join(
      root,
      'frontend',
      'src',
      'PurchasesBlock.tsx'
    ),
    needles: [
      '<ReturnToManagerPanel',
    ],
    label: 'PurchasesBlock.tsx / SupplierPaymentTask',
  },
];

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' +
      message
  );
  process.exit(1);
}

function lineOf(
  text,
  index
) {
  return (
    text
      .slice(0, index)
      .split('\n')
      .length
  );
}

function clipLines(
  text,
  line,
  before = 14,
  after = 18
) {
  const lines =
    text.split('\n');

  const start =
    Math.max(
      0,
      line - 1 - before
    );

  const end =
    Math.min(
      lines.length,
      line + after
    );

  return lines
    .slice(
      start,
      end
    )
    .map(
      (value, idx) => {
        const n =
          start +
          idx +
          1;

        return (
          String(n)
            .padStart(
              5,
              ' '
            ) +
          ' | ' +
          value
        );
      }
    )
    .join('\n');
}

console.log('');
console.log(
  'MSM — контекст возвратов'
);
console.log(
  '========================'
);

for (
  const target
  of targets
) {
  if (
    !fs.existsSync(
      target.file
    )
  ) {
    fail(
      'Не найден файл: ' +
        target.file
    );
  }

  const text =
    fs.readFileSync(
      target.file,
      'utf8'
    );

  console.log('');
  console.log(
    '### ' +
      target.label
  );

  for (
    const needle
    of target.needles
  ) {
    let index = 0;
    let ordinal = 0;

    while (true) {
      const found =
        text.indexOf(
          needle,
          index
        );

      if (found < 0) {
        break;
      }

      ordinal++;

      const line =
        lineOf(
          text,
          found
        );

      console.log('');
      console.log(
        `--- ${needle} #${ordinal} · строка ${line} ---`
      );

      console.log(
        clipLines(
          text,
          line
        )
      );

      index =
        found +
        needle.length;
    }
  }
}

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
