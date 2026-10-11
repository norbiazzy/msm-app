const fs = require('fs');
const path = require('path');

const root = __dirname;
const file = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

console.log('');
console.log(
  'MSM — аудит v064-O1.6'
);
console.log(
  '======================'
);

if (!fs.existsSync(file)) {
  console.log(
    'FAIL styles.css отсутствует'
  );
  process.exit(1);
}

const css =
  fs.readFileSync(
    file,
    'utf8'
  );

const checks = [
  [
    css.includes(
      'PART_V064_O16_RETURN_NOTICE_POLISH'
    ),
    'патч установлен'
  ],
  [
    /\.taskReturnNoticeV3::before[\s\S]*?content:\s*none\s*!important/.test(
      css
    ),
    'двойная ! отключена'
  ],
  [
    /\.taskReturnNoticeV3[\s\S]*?grid-template-columns:[\s\S]*?auto\s*!important/.test(
      css
    ),
    'desktop компактная сетка'
  ],
  [
    /\.taskReturnNoticeCommentField[\s\S]*?grid-column:\s*2\s*!important/.test(
      css
    ),
    'комментарий справа'
  ],
  [
    /@media\s*\(max-width:\s*760px\)[\s\S]*?grid-template-columns:\s*1fr\s*!important/.test(
      css
    ),
    'mobile в одну колонку'
  ],
  [
    css.includes(
      '.invoiceManagerReturnCard'
    ),
    'открытая задача'
  ],
];

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
  'ИТОГ: OK — блок возврата компактный, одна иконка, причина и комментарий выровнены.'
);
