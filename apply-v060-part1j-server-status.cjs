const fs = require('fs');
const path = require('path');

const root =
  __dirname;

const checkOnly =
  process.argv.includes(
    '--check'
  );


const mainPath =
  path.join(
    root,
    'frontend',
    'src',
    'main.tsx'
  );

const swPath =
  path.join(
    root,
    'frontend',
    'public',
    'sw.js'
  );

const controllerPath =
  path.join(
    root,
    'backend',
    'src',
    'app.controller.ts'
  );

const componentSourcePath =
  path.join(
    root,
    'ServerStatusBanner.part1j.tmp'
  );

const cssSourcePath =
  path.join(
    root,
    'serverStatus.part1j.tmp'
  );

const componentPath =
  path.join(
    root,
    'frontend',
    'src',
    'ServerStatusBanner.tsx'
  );

const cssPath =
  path.join(
    root,
    'frontend',
    'src',
    'serverStatus.css'
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


let main =
  read(mainPath);

let sw =
  read(swPath);

let controller =
  read(controllerPath);

const componentSource =
  read(
    componentSourcePath
  );

const cssSource =
  read(
    cssSourcePath
  );


/*
 * 1. Backend /health.
 */

if (
  !controller.includes(
    "@Get('health')"
  ) &&
  !controller.includes(
    '@Get("health")'
  )
) {

  const nestImportRegex =
    /import\s*\{([^}]*)\}\s*from\s*['"]@nestjs\/common['"];?/;


  const importMatch =
    controller.match(
      nestImportRegex
    );


  if (!importMatch) {

    fail(
      'Не найден import @nestjs/common в app.controller.ts.'
    );
  }


  const names =
    importMatch[1]
      .split(',')
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean);


  if (
    !names.includes(
      'Get'
    )
  ) {

    names.push(
      'Get'
    );
  }


  controller =
    controller.replace(
      nestImportRegex,
      "import { " +
        names.join(', ') +
        " } from '@nestjs/common';"
    );


  const classMarker =
    'export class AppController {';


  const classIndex =
    controller.indexOf(
      classMarker
    );


  if (
    classIndex < 0
  ) {

    fail(
      'Не найден AppController.'
    );
  }


  const insertAt =
    classIndex +
    classMarker.length;


  controller =
    controller.slice(
      0,
      insertAt
    ) +
    `

  @Get('health')
  health() {
    return {
      ok: true,
      service: 'msm-backend',
    };
  }
` +
    controller.slice(
      insertAt
    );
}


/*
 * 2. Service Worker:
 * /api/health must never use cached API data.
 */

if (
  !sw.includes(
    "url.pathname === '/api/health'"
  ) &&
  !sw.includes(
    'url.pathname === "/api/health"'
  )
) {

  const apiBranchRegex =
    /(\s*)if\s*\(\s*url\.pathname\.startsWith\(\s*['"]\/api\/['"]\s*\)\s*\)\s*\{/;


  const match =
    sw.match(
      apiBranchRegex
    );


  if (!match) {

    fail(
      'Не найден /api/ branch в sw.js.'
    );
  }


  const indent =
    match[1];


  const bypass =
    `${indent}if (
${indent}  url.pathname === '/api/health'
${indent}) {
${indent}  event.respondWith(
${indent}    fetch(request)
${indent}  );
${indent}  return;
${indent}}

`;


  sw =
    sw.slice(
      0,
      match.index
    ) +
    bypass +
    sw.slice(
      match.index
    );
}


/*
 * 3. main.tsx imports.
 */

if (
  !main.includes(
    "from './ServerStatusBanner'"
  )
) {

  const appImportRegex =
    /import\s+App\s+from\s+['"]\.\/App['"];?/;


  const appImportMatch =
    main.match(
      appImportRegex
    );


  if (!appImportMatch) {

    fail(
      'Не найден import App в main.tsx.'
    );
  }


  const insertAt =
    appImportMatch.index +
    appImportMatch[0].length;


  main =
    main.slice(
      0,
      insertAt
    ) +
    "\nimport ServerStatusBanner from './ServerStatusBanner';" +
    main.slice(
      insertAt
    );
}


if (
  !main.includes(
    "import './serverStatus.css'"
  )
) {

  const stylesImportRegex =
    /import\s+['"]\.\/styles\.css['"];?/;


  const stylesMatch =
    main.match(
      stylesImportRegex
    );


  if (!stylesMatch) {

    fail(
      'Не найден import styles.css в main.tsx.'
    );
  }


  const insertAt =
    stylesMatch.index +
    stylesMatch[0].length;


  main =
    main.slice(
      0,
      insertAt
    ) +
    "\nimport './serverStatus.css';" +
    main.slice(
      insertAt
    );
}


/*
 * 4. Render banner once before App.
 */

if (
  !main.includes(
    '<ServerStatusBanner />'
  )
) {

  const appRenderRegex =
    /(\s*)<App\s*\/>/;


  const renderMatch =
    main.match(
      appRenderRegex
    );


  if (!renderMatch) {

    fail(
      'Не найден <App /> в main.tsx.'
    );
  }


  const indent =
    renderMatch[1];


  main =
    main.replace(
      appRenderRegex,
      `${indent}<ServerStatusBanner />${indent}<App />`
    );
}


console.log('');

console.log(
  'Проверка Part 1J:'
);

console.log(
  '  Backend /health: OK'
);

console.log(
  '  Service Worker health bypass: OK'
);

console.log(
  '  ServerStatusBanner: OK'
);

console.log(
  '  main.tsx integration: OK'
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


for (
  const file
  of [
    mainPath,
    swPath,
    controllerPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1j-' +
      stamp
  );
}


write(
  mainPath,
  main
);

write(
  swPath,
  sw
);

write(
  controllerPath,
  controller
);

write(
  componentPath,
  componentSource
);

write(
  cssPath,
  cssSource
);


console.log('');

console.log(
  'Part 1J применён.'
);

console.log('');

console.log(
  'Дальше:'
);

console.log(
  '  git diff --check'
);

console.log(
  '  cd backend && npm run build'
);

console.log(
  '  cd ../frontend && npm run build'
);
