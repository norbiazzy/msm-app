const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const yes =
  process.argv.includes('--yes');

if (!yes) {
  console.log('');
  console.log(
    'Откат ничего не изменил.'
  );
  console.log(
    'Для подтверждения запусти:'
  );
  console.log(
    'node .\\restore-before-v064-o2.cjs --yes'
  );
  process.exit(0);
}

const backupRoot =
  path.join(
    root,
    '.backups'
  );

const latestFile =
  path.join(
    backupRoot,
    'LATEST-v064-o2.txt'
  );

if (!fs.existsSync(latestFile)) {
  console.error(
    'ОШИБКА: не найден указатель на последний backup.'
  );
  process.exit(1);
}

const dirName =
  fs.readFileSync(
    latestFile,
    'utf8'
  ).trim();

const backupDir =
  path.join(
    backupRoot,
    dirName
  );

const manifestFile =
  path.join(
    backupDir,
    'manifest.json'
  );

if (!fs.existsSync(manifestFile)) {
  console.error(
    'ОШИБКА: не найден manifest backup.'
  );
  process.exit(1);
}

const manifest =
  JSON.parse(
    fs.readFileSync(
      manifestFile,
      'utf8'
    )
  );

function hashFile(file) {
  const data = fs.readFileSync(file);

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

for (const item of manifest.files) {
  const src =
    path.join(
      backupDir,
      item.path
    );

  if (!fs.existsSync(src)) {
    console.error(
      'ОШИБКА: в backup отсутствует ' +
      item.path
    );
    process.exit(1);
  }

  const actual =
    hashFile(src);

  if (
    actual !==
    item.sha256
  ) {
    console.error(
      'ОШИБКА: контрольная сумма backup не совпала: ' +
      item.path
    );
    process.exit(1);
  }
}

/*
 * Before restore, preserve the current post-patch state.
 * Nothing is deleted.
 */
const safetyDir =
  path.join(
    backupRoot,
    'before-restore-' +
    Date.now()
  );

fs.mkdirSync(
  safetyDir,
  {
    recursive: true,
  }
);

for (const item of manifest.files) {
  const current =
    path.join(
      root,
      item.path
    );

  if (
    fs.existsSync(
      current
    )
  ) {
    const safety =
      path.join(
        safetyDir,
        item.path
      );

    fs.mkdirSync(
      path.dirname(
        safety
      ),
      {
        recursive: true,
      }
    );

    fs.copyFileSync(
      current,
      safety
    );
  }
}

for (const item of manifest.files) {
  const src =
    path.join(
      backupDir,
      item.path
    );

  const dest =
    path.join(
      root,
      item.path
    );

  fs.copyFileSync(
    src,
    dest
  );
}

console.log('');
console.log(
  'RESTORE OK'
);
console.log(
  'Восстановлен backup: ' +
  backupDir
);
console.log(
  'Состояние перед откатом дополнительно сохранено: ' +
  safetyDir
);
console.log('');
console.log(
  'Теперь проверь:'
);
console.log(
  'cd .\\frontend'
);
console.log(
  'npm run build'
);
