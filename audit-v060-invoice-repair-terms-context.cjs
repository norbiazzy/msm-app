const fs = require('fs');
const path = require('path');

const root = __dirname;

const file = path.join(
  root,
  'frontend',
  'src',
  'InvoiceRequestTaskPanel.tsx'
);

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(file)) {
  fail(
    'Не найден frontend/src/InvoiceRequestTaskPanel.tsx'
  );
}

const text = fs.readFileSync(
  file,
  'utf8'
);

const token =
  'function InvoiceRequestManagerRepair';

const start =
  text.indexOf(token);

if (start < 0) {
  fail(
    'Не найден InvoiceRequestManagerRepair().'
  );
}

/*
 * Take a generous local slice only from this component.
 */
let end =
  text.indexOf(
    '\nexport function ',
    start + token.length
  );

if (end < 0) {
  end =
    Math.min(
      text.length,
      start + 18000
    );
}

const block =
  text.slice(
    start,
    end
  );

const baseLine =
  text
    .slice(0, start)
    .split('\n')
    .length;

const lines =
  block.split('\n');

const keywords = [
  'marginMode',
  'marginValue',
  'Услов',
  'услов',
  'Марж',
  'марж',
  'Нацен',
  'нацен',
  'TOTAL_PLUS',
  'PER_UNIT',
  '<Field',
  '<label',
  '<select',
];

const hitLines = [];

for (
  let i = 0;
  i < lines.length;
  i++
) {
  if (
    keywords.some(
      (key) =>
        lines[i].includes(key)
    )
  ) {
    hitLines.push(i);
  }
}

if (hitLines.length === 0) {
  console.log('');
  console.log(
    'В InvoiceRequestManagerRepair не найдены margin/условия.'
  );
  console.log('');
  console.log(
    'Первые 220 строк компонента:'
  );

  for (
    let i = 0;
    i < Math.min(
      220,
      lines.length
    );
    i++
  ) {
    console.log(
      String(
        baseLine + i
      ).padStart(5, ' ') +
      ' | ' +
      lines[i]
    );
  }

  process.exit(0);
}

/*
 * Merge context windows around hits.
 */
const wanted = new Set();

for (
  const hit
  of hitLines
) {
  const from =
    Math.max(
      0,
      hit - 12
    );

  const to =
    Math.min(
      lines.length - 1,
      hit + 18
    );

  for (
    let i = from;
    i <= to;
    i++
  ) {
    wanted.add(i);
  }
}

console.log('');
console.log(
  'InvoiceRequestManagerRepair — контекст поля условий'
);
console.log(
  '==================================================='
);
console.log('');

let previous = -2;

for (
  const i
  of [...wanted].sort(
    (a, b) => a - b
  )
) {
  if (
    i > previous + 1
  ) {
    console.log(
      '-----'
    );
  }

  console.log(
    String(
      baseLine + i
    ).padStart(5, ' ') +
    ' | ' +
    lines[i]
  );

  previous = i;
}

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
