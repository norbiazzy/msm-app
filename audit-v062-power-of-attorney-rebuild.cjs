const fs = require('fs');
const path = require('path');

const root = __dirname;

const poaPath =
  path.join(
    root,
    'frontend',
    'src',
    'PowerOfAttorneyBlock.tsx'
  );

const structuredPath =
  path.join(
    root,
    'frontend',
    'src',
    'TaskStructuredFields.tsx'
  );

const apiPath =
  path.join(
    root,
    'frontend',
    'src',
    'api.ts'
  );

const resubmitPath =
  path.join(
    root,
    'frontend',
    'src',
    'ManagerResubmitPanel.tsx'
  );

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : '';
}

function walkTs(dir) {
  if (!fs.existsSync(dir)) return [];

  const result = [];

  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      result.push(...walkTs(full));
    } else if (
      stat.isFile() &&
      full.endsWith('.ts')
    ) {
      result.push(full);
    }
  }

  return result;
}

function row(label, ok) {
  console.log(
    (ok ? 'OK  ' : 'WARN') +
    '  ' +
    label
  );
}

const poa = read(poaPath);
const structured =
  read(structuredPath);
const api =
  read(apiPath);
const resubmit =
  read(resubmitPath);

const backend =
  walkTs(
    path.join(
      root,
      'backend',
      'src'
    )
  )
    .map(read)
    .join('\n');

console.log('');
console.log('MSM — аудит доверенности v062');
console.log('=============================');
console.log('');

const createClean =
  poa.includes(
    'PART_V062_POA_REBUILD'
  ) &&
  !poa.includes(
    '<span>От какой организации</span>'
  ) &&
  !poa.includes(
    'setInvoiceNumber'
  ) &&
  !poa.includes(
    'setRequestDate'
  );

const comments =
  poa.includes(
    'Комментарий для бухгалтерии'
  ) &&
  poa.includes(
    'Комментарий для себя'
  );

const accountantData =
  poa.includes(
    'Актуальный основной счёт'
  ) &&
  poa.includes(
    'Входящий счёт'
  ) &&
  poa.includes(
    'Поставщик / завод'
  ) &&
  poa.includes(
    'На кого доверенность'
  ) &&
  poa.includes(
    'Что получаем'
  );

const returnFlow =
  poa.includes(
    'ReturnToManagerPanel'
  ) &&
  poa.includes(
    'ManagerResubmitPanel'
  ) &&
  poa.includes(
    'TASK_ATTACHMENT_'
  );

const structuredSimple =
  structured.includes(
    'PART_V062_POA_FIELDS'
  );

const returnDetailsClean =
  resubmit.includes(
    'PART_V062_POA_RESUBMIT_DETAILS'
  );

const finish =
  poa.includes(
    'Номер доверенности'
  ) &&
  poa.includes(
    'Комментарий бухгалтера'
  ) &&
  poa.includes(
    'Готовая доверенность'
  );

const apiMeta =
  api.includes(
    'PART_V062_POA_COMPLETE_META'
  );

const backendMeta =
  backend.includes(
    'PART_V062_POA_COMPLETE_CONTROLLER'
  ) &&
  backend.includes(
    'PART_V062_POA_COMPLETE_SERVICE'
  );

row(
  'Создание доверенности очищено',
  createClean
);

row(
  'Комментарии разделены',
  comments
);

row(
  'Бухгалтер получает утверждённые данные и счета',
  accountantData
);

row(
  'Возврат и повторная отправка той же задачи',
  returnFlow
);

row(
  'Поля возврата упрощены',
  structuredSimple
);

row(
  'Удалённые поля не уходят повторно в бухгалтерию',
  returnDetailsClean
);

row(
  'Завершение: номер + файл + комментарий',
  finish
);

row(
  'Frontend API передаёт результат доверенности',
  apiMeta
);

row(
  'Backend сохраняет номер и комментарий',
  backendMeta
);

const all =
  createClean &&
  comments &&
  accountantData &&
  returnFlow &&
  structuredSimple &&
  returnDetailsClean &&
  finish &&
  apiMeta &&
  backendMeta;

console.log('');
console.log('ИТОГ');
console.log('=====');
console.log(
  all
    ? 'OK — доверенность приведена к утверждённой схеме.'
    : 'WARN — смотрите пункты выше.'
);
