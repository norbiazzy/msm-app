const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcRoot = path.join(
  root,
  'frontend',
  'src'
);

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(srcRoot)) {
  fail('Не найдена папка frontend/src.');
}

function walk(dir) {
  const result = [];

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
    const full = path.join(
      dir,
      entry.name
    );

    if (entry.isDirectory()) {
      result.push(
        ...walk(full)
      );
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith('.tsx') &&
      !entry.name.includes('.before-') &&
      !entry.name.includes('.broken-')
    ) {
      result.push(full);
    }
  }

  return result;
}

function lineOf(text, index) {
  return (
    text
      .slice(0, index)
      .split('\n')
      .length
  );
}

function findMatchingBrace(
  text,
  openIndex
) {
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
      if (ch === '\n') {
        mode = 'code';
      }
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

function extractFunctions(
  text
) {
  const items = [];
  const regex =
    /(?:export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;

  let match;

  while (
    (match = regex.exec(text))
  ) {
    const name = match[1];

    const openParen =
      text.indexOf(
        '(',
        match.index
      );

    let parenDepth = 0;
    let closeParen = -1;

    for (
      let i = openParen;
      i < text.length;
      i++
    ) {
      if (text[i] === '(') {
        parenDepth++;
      } else if (
        text[i] === ')'
      ) {
        parenDepth--;

        if (parenDepth === 0) {
          closeParen = i;
          break;
        }
      }
    }

    if (closeParen < 0) {
      continue;
    }

    const openBrace =
      text.indexOf(
        '{',
        closeParen + 1
      );

    if (openBrace < 0) {
      continue;
    }

    const closeBrace =
      findMatchingBrace(
        text,
        openBrace
      );

    if (closeBrace < 0) {
      continue;
    }

    items.push({
      name,
      start: match.index,
      end: closeBrace + 1,
      body:
        text.slice(
          match.index,
          closeBrace + 1
        ),
    });

    regex.lastIndex =
      closeBrace + 1;
  }

  return items;
}

function countRegex(
  text,
  regex
) {
  const matches =
    text.match(regex);

  return matches
    ? matches.length
    : 0;
}

function collectControls(
  body
) {
  const controls = [];

  const panelRegex =
    /<ReturnToManagerPanel\b/g;

  let match;

  while (
    (match =
      panelRegex.exec(body))
  ) {
    controls.push({
      kind:
        'ReturnToManagerPanel',
      index:
        match.index,
    });
  }

  const buttonRegex =
    /<button\b[\s\S]*?<\/button>/g;

  while (
    (match =
      buttonRegex.exec(body))
  ) {
    const block =
      match[0];

    if (
      /Вернуть\s+менеджеру/i.test(
        block
      )
    ) {
      controls.push({
        kind:
          'button: Вернуть менеджеру',
        index:
          match.index,
      });
    }

    if (
      /Отказать\s*\/\s*вернуть/i.test(
        block
      )
    ) {
      controls.push({
        kind:
          'legacy button: Отказать / вернуть',
        index:
          match.index,
      });
    }
  }

  return controls;
}

const files =
  walk(srcRoot);

const findings = [];

console.log('');
console.log(
  'MSM — аудит кнопок «Вернуть менеджеру»'
);
console.log(
  '======================================='
);
console.log('');

for (const file of files) {
  const text =
    fs.readFileSync(
      file,
      'utf8'
    );

  const rel =
    path.relative(
      root,
      file
    );

  const functions =
    extractFunctions(text);

  for (const fn of functions) {
    if (
      fn.name ===
      'ReturnToManagerPanel'
    ) {
      continue;
    }

    const controls =
      collectControls(
        fn.body
      );

    if (
      controls.length === 0
    ) {
      continue;
    }

    const normalized =
      controls.map(
        (control) => ({
          ...control,
          line:
            lineOf(
              text,
              fn.start +
                control.index
            ),
        })
      );

    findings.push({
      file: rel,
      component: fn.name,
      controls: normalized,
    });
  }
}

if (
  findings.length === 0
) {
  console.log(
    'WARN — использования возврата в task-компонентах не найдены.'
  );
  process.exit(0);
}

for (const item of findings) {
  const duplicate =
    item.controls.length > 1;

  console.log(
    `${duplicate ? 'DUPLICATE' : 'OK'}  ${item.component}`
  );

  console.log(
    `    ${item.file}`
  );

  for (
    const control
    of item.controls
  ) {
    console.log(
      `    строка ${control.line}: ${control.kind}`
    );
  }

  console.log('');
}

const duplicates =
  findings.filter(
    (item) =>
      item.controls.length > 1
  );

console.log(
  'ИТОГ'
);
console.log(
  '====='
);

if (
  duplicates.length === 0
) {
  console.log(
    'OK — внутри отдельных task-компонентов двойных кнопок не найдено.'
  );
} else {
  console.log(
    `Найдены компоненты с несколькими возвратами: ${duplicates.length}`
  );

  for (
    const item
    of duplicates
  ) {
    console.log(
      ` - ${item.component} (${item.file})`
    );
  }
}

console.log('');
console.log(
  'Дополнительная проверка App.tsx:'
);

const appPath =
  path.join(
    srcRoot,
    'App.tsx'
  );

if (
  fs.existsSync(appPath)
) {
  const app =
    fs.readFileSync(
      appPath,
      'utf8'
    );

  const oldInvoiceButtons =
    countRegex(
      app,
      /Отказать\s*\/\s*вернуть/gi
    );

  const invoicePanels =
    countRegex(
      app,
      /mode\s*=\s*["']invoice["']/g
    );

  console.log(
    `  mode="invoice": ${invoicePanels}`
  );

  console.log(
    `  текст «Отказать / вернуть»: ${oldInvoiceButtons}`
  );
}

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
