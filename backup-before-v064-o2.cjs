const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = __dirname;

const files = [
  'frontend/src/App.tsx',
  'frontend/src/styles.css',
];

function hashFile(file) {
  const data = fs.readFileSync(file);
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

function timestamp() {
  const d = new Date();

  const pad = (n) =>
    String(n).padStart(2, '0');

  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

for (const rel of files) {
  const full = path.join(root, rel);

  if (!fs.existsSync(full)) {
    console.error(
      'ОШИБКА: не найден файл: ' +
      rel
    );
    process.exit(1);
  }
}

const backupRoot =
  path.join(
    root,
    '.backups'
  );

fs.mkdirSync(
  backupRoot,
  {
    recursive: true,
  }
);

const dirName =
  'before-v064-o2-' +
  timestamp();

const backupDir =
  path.join(
    backupRoot,
    dirName
  );

fs.mkdirSync(
  backupDir,
  {
    recursive: true,
  }
);

const manifest = {
  createdAt:
    new Date()
      .toISOString(),
  purpose:
    'Backup before v064-O2 deal page cleanup',
  files: [],
};

for (const rel of files) {
  const src =
    path.join(
      root,
      rel
    );

  const dest =
    path.join(
      backupDir,
      rel
    );

  fs.mkdirSync(
    path.dirname(dest),
    {
      recursive: true,
    }
  );

  fs.copyFileSync(
    src,
    dest
  );

  manifest.files.push({
    path: rel,
    sha256:
      hashFile(src),
  });
}

try {
  const status =
    execFileSync(
      'git',
      [
        'status',
        '--short',
      ],
      {
        cwd: root,
        encoding: 'utf8',
      }
    );

  fs.writeFileSync(
    path.join(
      backupDir,
      'git-status-before.txt'
    ),
    status,
    'utf8'
  );
} catch (e) {
  fs.writeFileSync(
    path.join(
      backupDir,
      'git-status-before.txt'
    ),
    'Не удалось получить git status.\n',
    'utf8'
  );
}

try {
  const diff =
    execFileSync(
      'git',
      [
        'diff',
        '--',
        'frontend/src/App.tsx',
        'frontend/src/styles.css',
      ],
      {
        cwd: root,
        encoding: 'utf8',
      }
    );

  fs.writeFileSync(
    path.join(
      backupDir,
      'git-diff-before.patch'
    ),
    diff,
    'utf8'
  );
} catch (e) {
  fs.writeFileSync(
    path.join(
      backupDir,
      'git-diff-before.patch'
    ),
    '',
    'utf8'
  );
}

fs.writeFileSync(
  path.join(
    backupDir,
    'manifest.json'
  ),
  JSON.stringify(
    manifest,
    null,
    2
  ),
  'utf8'
);

fs.writeFileSync(
  path.join(
    backupRoot,
    'LATEST-v064-o2.txt'
  ),
  dirName,
  'utf8'
);

console.log('');
console.log(
  'BACKUP OK'
);
console.log(
  'Папка: ' +
  backupDir
);
console.log('');
console.log(
  'Сохранены:'
);

for (const item of manifest.files) {
  console.log(
    ' - ' +
    item.path
  );
}

console.log('');
console.log(
  'Для отката:'
);
console.log(
  'node .\\restore-before-v064-o2.cjs --yes'
);
