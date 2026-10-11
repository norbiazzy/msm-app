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
      if (
        ch === '*' &&
        next === '/'
      ) {
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

      if (ch === quote) {
        mode = 'code';
      }
      continue;
    }

    if (
      ch === '/' &&
      next === '/'
    ) {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (
      ch === '/' &&
      next === '*'
    ) {
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
      continue;
    }

    if (ch === ')') {
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
      if (
        ch === '*' &&
        next === '/'
      ) {
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

      if (ch === quote) {
        mode = 'code';
      }
      continue;
    }

    if (
      ch === '/' &&
      next === '/'
    ) {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (
      ch === '/' &&
      next === '*'
    ) {
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
      continue;
    }

    if (ch === '}') {
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

  if (openParen < 0) {
    return null;
  }

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
    end:
      closeBrace + 1,
    text:
      text.slice(
        start,
        closeBrace + 1
      ),
  };
}

function findOpeningTagAfter(
  text,
  startIndex,
  endIndex
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
      match.index >= endIndex
    ) {
      return null;
    }

    if (
      match[0].endsWith('/>')
    ) {
      continue;
    }

    return {
      name: match[1],
      start:
        match.index,
      end:
        re.lastIndex,
      tag:
        match[0],
    };
  }

  return null;
}

function findMatchingJsxClose(
  text,
  opening
) {
  const tagName =
    opening.name.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

  const re =
    new RegExp(
      `<\\/?${tagName}\\b[^>]*>`,
      'g'
    );

  re.lastIndex =
    opening.start;

  let depth = 0;
  let match;

  while (
    (match = re.exec(text))
  ) {
    const token =
      match[0];

    const closing =
      token.startsWith('</');

    const selfClosing =
      token.endsWith('/>');

    if (closing) {
      depth--;

      if (depth === 0) {
        return {
          start:
            match.index,
          end:
            re.lastIndex,
        };
      }

      continue;
    }

    if (!selfClosing) {
      depth++;
    }
  }

  return null;
}

function commentExpr(
  variableName
) {
  return `String(
            (
              (${variableName} as any).returnComment ??
              (${variableName} as any).returnNote ??
              (${variableName} as any).returnMessage ??
              ''
            )
          ).trim()`;
}

function commentValueExpr(
  variableName
) {
  return `String(
              (
                (${variableName} as any).returnComment ??
                (${variableName} as any).returnNote ??
                (${variableName} as any).returnMessage ??
                ''
              )
            )`;
}

function feedbackJsx(
  variableName,
  marker,
  indent
) {
  return `
${indent}{/* ${marker} */}
${indent}{${commentExpr(variableName)} && (
${indent}  <div className="taskReturnCommentInline">
${indent}    <strong>Комментарий бухгалтера:</strong>
${indent}    <span>
${indent}      {${commentValueExpr(variableName)}}
${indent}    </span>
${indent}  </div>
${indent})}
`;
}

let app =
  read(appPath);

let styles =
  read(stylesPath);


/*
 * A. TASK LIST CARD
 */
const cardMarker =
  'PART_1N_K5_RETURN_COMMENT_CARD';

if (!app.includes(cardMarker)) {
  const phraseIndex =
    app.indexOf(
      'Нужно исправить'
    );

  if (phraseIndex < 0) {
    fail(
      'В App.tsx не найден текст «Нужно исправить».'
    );
  }

  const searchStart =
    Math.max(
      0,
      phraseIndex - 5000
    );

  const before =
    app.slice(
      searchStart,
      phraseIndex
    );

  const statusRegex =
    /([A-Za-z_$][A-Za-z0-9_$]*)\.status\s*===\s*['"]NEED_DATA['"]/g;

  let match;
  let last = null;

  while (
    (match =
      statusRegex.exec(before))
  ) {
    last = match;
  }

  if (!last) {
    fail(
      'Перед «Нужно исправить» не найдено *.status === NEED_DATA.'
    );
  }

  const cardVariable =
    last[1];

  const conditionIndex =
    searchStart +
    last.index;

  const opening =
    findOpeningTagAfter(
      app,
      conditionIndex,
      phraseIndex + 5000
    );

  if (!opening) {
    fail(
      'Не найден JSX-контейнер возвращённой карточки.'
    );
  }

  const closing =
    findMatchingJsxClose(
      app,
      opening
    );

  if (!closing) {
    fail(
      'Не найден конец JSX-контейнера возвращённой карточки.'
    );
  }

  const cardBlock =
    app.slice(
      opening.start,
      closing.end
    );

  if (
    !cardBlock.includes(
      'Нужно исправить'
    )
  ) {
    fail(
      'Контейнер NEED_DATA не содержит «Нужно исправить».'
    );
  }

  app =
    app.slice(
      0,
      closing.start
    ) +
    feedbackJsx(
      cardVariable,
      cardMarker,
      '          '
    ) +
    app.slice(
      closing.start
    );
}


/*
 * B. OPEN TASK / TaskDetail
 */
const detailMarker =
  'PART_1N_K5_RETURN_COMMENT_DETAIL';

if (!app.includes(detailMarker)) {
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
      'В TaskDetail не найден return (...).'
    );
  }

  const opening =
    findOpeningTagAfter(
      local,
      returnMatch.index,
      local.length
    );

  if (!opening) {
    fail(
      'В TaskDetail не найден корневой JSX-тег.'
    );
  }

  const absoluteOpeningEnd =
    range.start +
    opening.end;

  const detailBlock =
`
      {/* ${detailMarker} */}
      {status === 'NEED_DATA' &&
        ${commentExpr('task')} && (
        <div className="taskReturnCommentInline taskReturnCommentDetail">
          <strong>Комментарий бухгалтера:</strong>
          <span>
            {${commentValueExpr('task')}}
          </span>
        </div>
      )}
`;

  app =
    app.slice(
      0,
      absoluteOpeningEnd
    ) +
    detailBlock +
    app.slice(
      absoluteOpeningEnd
    );
}


/*
 * C. Styles
 */
const styleMarker =
  'PART_1N_K5_RETURN_COMMENT_STYLES';

if (!styles.includes(styleMarker)) {
  styles += `

/* ${styleMarker} */
.taskReturnCommentInline {
  display: grid;
  gap: 4px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.22);
  font-size: 14px;
  line-height: 1.35;
}

.taskReturnCommentInline strong {
  font-size: 12px;
  opacity: 0.7;
}

.taskReturnCommentInline span {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.taskReturnCommentDetail {
  margin-bottom: 14px;
}
`;
}


/*
 * Verification
 */
if (!app.includes(cardMarker)) {
  fail(
    'Комментарий не добавлен в карточку.'
  );
}

if (!app.includes(detailMarker)) {
  fail(
    'Комментарий не добавлен в открытую задачу.'
  );
}

if (!styles.includes(styleMarker)) {
  fail(
    'Стили комментария не добавлены.'
  );
}

console.log('');
console.log(
  'Проверка Part 1N-K5:'
);
console.log(
  '  NEED_DATA карточка: комментарий бухгалтера добавлен: OK'
);
console.log(
  '  Открытая NEED_DATA задача: комментарий бухгалтера добавлен: OK'
);
console.log(
  '  Пустой комментарий не показывается: OK'
);
console.log(
  '  Причина возврата / файлы / повторная отправка не меняются'
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
      '.before-part1n-k5-' +
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
  'Part 1N-K5 применён.'
);
