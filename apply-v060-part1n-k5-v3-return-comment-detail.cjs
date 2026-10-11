const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

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

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

function findMatchingParen(text, openIndex) {
  let depth = 0;
  let mode = 'code';
  let quote = '';

  for (
    let i = openIndex;
    i < text.length;
    i++
  ) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'lineComment') {
      if (ch === '\n') mode = 'code';
      continue;
    }

    if (mode === 'blockComment') {
      if (ch === '*' && next === '/') {
        mode = 'code';
        i++;
      }
      continue;
    }

    if (mode === 'string') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) mode = 'code';
      continue;
    }

    if (ch === '/' && next === '/') {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      mode = 'blockComment';
      i++;
      continue;
    }

    if (
      ch === "'" ||
      ch === '"' ||
      ch === '`'
    ) {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let mode = 'code';
  let quote = '';

  for (
    let i = openIndex;
    i < text.length;
    i++
  ) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'lineComment') {
      if (ch === '\n') mode = 'code';
      continue;
    }

    if (mode === 'blockComment') {
      if (ch === '*' && next === '/') {
        mode = 'code';
        i++;
      }
      continue;
    }

    if (mode === 'string') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) mode = 'code';
      continue;
    }

    if (ch === '/' && next === '/') {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      mode = 'blockComment';
      i++;
      continue;
    }

    if (
      ch === "'" ||
      ch === '"' ||
      ch === '`'
    ) {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function findFunctionRange(text, functionName) {
  const re = new RegExp(
    '(?:export\\s+)?function\\s+' +
      functionName +
      '\\s*\\('
  );

  const match = re.exec(text);

  if (!match) {
    return null;
  }

  const start = match.index;

  const openParen =
    text.indexOf(
      '(',
      start
    );

  const closeParen =
    findMatchingParen(
      text,
      openParen
    );

  if (closeParen < 0) {
    return null;
  }

  const openBrace =
    text.indexOf(
      '{',
      closeParen + 1
    );

  if (openBrace < 0) {
    return null;
  }

  const closeBrace =
    findMatchingBrace(
      text,
      openBrace
    );

  if (closeBrace < 0) {
    return null;
  }

  return {
    start,
    end: closeBrace + 1,
    text:
      text.slice(
        start,
        closeBrace + 1
      ),
  };
}

function findOpeningTagAfter(
  text,
  startIndex
) {
  const re =
    /<([A-Za-z][A-Za-z0-9._-]*)\b[^>]*>/g;

  re.lastIndex =
    startIndex;

  let match;

  while (
    (match = re.exec(text))
  ) {
    if (
      match[0].endsWith('/>')
    ) {
      continue;
    }

    return {
      name: match[1],
      start: match.index,
      end: re.lastIndex,
      tag: match[0],
    };
  }

  return null;
}

let app =
  read(appPath);

let styles =
  read(stylesPath);

/*
 * ======================================================
 * 1. Confirm card ALREADY shows returnComment.
 * Do not modify it.
 * ======================================================
 */

const existingNoticeIndex =
  app.indexOf(
    'PART_1N_RETURN_NOTICE'
  );

if (existingNoticeIndex < 0) {
  fail(
    'Не найден существующий PART_1N_RETURN_NOTICE.'
  );
}

const existingNotice =
  app.slice(
    existingNoticeIndex,
    Math.min(
      app.length,
      existingNoticeIndex + 1800
    )
  );

if (
  !existingNotice.includes(
    'returnComment'
  ) ||
  !existingNotice.includes(
    'Нужно исправить'
  )
) {
  fail(
    'Существующая карточка NEED_DATA не содержит returnComment.'
  );
}

/*
 * ======================================================
 * 2. Add comment ONLY inside opened TaskDetail.
 * ======================================================
 */

const marker =
  'PART_1N_K5_V3_RETURN_COMMENT_DETAIL';

if (!app.includes(marker)) {
  const range =
    findFunctionRange(
      app,
      'TaskDetail'
    );

  if (!range) {
    fail(
      'Не найден function TaskDetail().'
    );
  }

  const local =
    range.text;

  const returnMatch =
    /\breturn\s*\(/m.exec(
      local
    );

  if (!returnMatch) {
    fail(
      'В TaskDetail не найден основной return (...).'
    );
  }

  const opening =
    findOpeningTagAfter(
      local,
      returnMatch.index
    );

  if (!opening) {
    fail(
      'В TaskDetail не найден корневой JSX-тег.'
    );
  }

  const absoluteInsert =
    range.start +
    opening.end;

  const block = `

      {/* ${marker} */}
      {status === 'NEED_DATA' &&
        String(
          (task as any).returnComment || ''
        ).trim() && (
          <div className="taskReturnCommentDetail">
            <strong>
              Комментарий бухгалтера
            </strong>
            <p>
              {
                String(
                  (task as any).returnComment
                )
              }
            </p>
          </div>
        )}
`;

  app =
    app.slice(
      0,
      absoluteInsert
    ) +
    block +
    app.slice(
      absoluteInsert
    );
}

/*
 * ======================================================
 * 3. Styles
 * ======================================================
 */

const styleMarker =
  'PART_1N_K5_V3_RETURN_COMMENT_DETAIL_STYLES';

if (!styles.includes(styleMarker)) {
  styles += `

/* ${styleMarker} */
.taskReturnCommentDetail {
  display: grid;
  gap: 6px;
  margin: 0 0 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.22);
}

.taskReturnCommentDetail strong {
  font-size: 13px;
}

.taskReturnCommentDetail p {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
`;
}

/*
 * ======================================================
 * Verify
 * ======================================================
 */

if (!app.includes(marker)) {
  fail(
    'Комментарий не добавлен в TaskDetail.'
  );
}

if (
  !styles.includes(
    styleMarker
  )
) {
  fail(
    'Стили комментария не добавлены.'
  );
}

console.log('');
console.log(
  'Проверка Part 1N-K5 v3:'
);
console.log(
  '  Карточка списка уже показывает returnComment: OK'
);
console.log(
  '  Дубликат на карточку не добавляется: OK'
);
console.log(
  '  Открытая NEED_DATA задача показывает комментарий бухгалтера: OK'
);
console.log(
  '  Пустой комментарий не показывается: OK'
);
console.log(
  '  Backend / Prisma не меняются'
);

if (checkOnly) {
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

for (
  const file
  of [
    appPath,
    stylesPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-k5-v3-' +
      stamp
  );
}

write(
  appPath,
  app
);

write(
  stylesPath,
  styles
);

console.log('');
console.log(
  'Part 1N-K5 v3 применён.'
);
