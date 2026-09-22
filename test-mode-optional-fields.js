const fs = require('fs');
const path = require('path');

const filePath = path.join(
  process.cwd(),
  'frontend',
  'src',
  'App.tsx'
);

if (!fs.existsSync(filePath)) {
  console.error('Не найден frontend/src/App.tsx');
  console.error('Запустите скрипт из D:\\job\\it\\msm-app');
  process.exit(1);
}

let text = fs.readFileSync(filePath, 'utf8');
const original = text;

function replaceSafe(search, replacement, name) {
  if (!text.includes(search)) {
    console.log('Уже изменено или не найдено: ' + name);
    return;
  }

  text = text.replace(search, replacement);
  console.log('✓ ' + name);
}


// --------------------------------------------------
// 1. Убираем HTML required со всех полей App.tsx
// --------------------------------------------------

text = text.replace(/\srequired(?=\s|\/?>)/g, '');

console.log('✓ Все HTML-поля теперь необязательные');


// --------------------------------------------------
// 2. Новый счёт:
// если клиент пустой — подставляем техническое имя
// --------------------------------------------------

replaceSafe(
  `createDeal({ sellerType, clientName, clientPhone:`,

  `createDeal({ sellerType, clientName: clientName.trim() || 'Тестовый клиент', clientPhone:`,

  'Пустое имя клиента разрешено'
);


// --------------------------------------------------
// 3. Корректировка счёта:
// комментарий можно не вводить
// --------------------------------------------------

replaceSafe(
  `if (!current || !correction.trim()) return;`,

  `if (!current) return;`,

  'Комментарий корректировки необязательный'
);

replaceSafe(
  `comment: correction.trim(), urgent`,

  `comment: correction.trim() || 'Тестовая корректировка', urgent`,

  'Технический комментарий для пустой корректировки'
);

replaceSafe(
  `disabled={saving || !correction.trim()}`,

  `disabled={saving}`,

  'Кнопка корректировки доступна без текста'
);


// --------------------------------------------------
// 4. Бухгалтер:
// номер готового счёта можно оставить пустым
// --------------------------------------------------

replaceSafe(
  `disabled={saving || !number}`,

  `disabled={saving}`,

  'Номер счёта необязательный'
);


// --------------------------------------------------
// 5. Оплата клиента:
// сумму можно оставить пустой для теста
// --------------------------------------------------

replaceSafe(
  `if (!amount || Number(amount) <= 0) return;`,

  ``,

  'Сумма платежа необязательная'
);

replaceSafe(
  `amount: Number(amount),`,

  `amount: amount ? Number(amount) : 0,`,

  'Пустая сумма платежа превращается в 0'
);

replaceSafe(
  `disabled={saving || !amount || Number(amount) <= 0}`,

  `disabled={saving}`,

  'Кнопка добавления платежа доступна без суммы'
);


// --------------------------------------------------
// Проверяем результат
// --------------------------------------------------

if (text === original) {
  console.log('');
  console.log('Изменений нет — возможно, тестовый режим уже установлен.');
  process.exit(0);
}


// --------------------------------------------------
// Резервная копия
// --------------------------------------------------

fs.copyFileSync(
  filePath,
  filePath + '.bak-test-mode'
);

fs.writeFileSync(
  filePath,
  text,
  'utf8'
);

console.log('');
console.log('ГОТОВО');
console.log('');
console.log('Включён тестовый режим:');
console.log('✓ клиент можно не указывать');
console.log('✓ позиции можно не указывать');
console.log('✓ телефон необязательный');
console.log('✓ комментарии необязательные');
console.log('✓ номер счёта необязательный');
console.log('✓ сумма счёта необязательная');
console.log('✓ PDF необязательный');
console.log('✓ корректировка без комментария');
console.log('✓ платёж без суммы разрешён для теста');
console.log('');
console.log(
  'Резервная копия: frontend/src/App.tsx.bak-test-mode'
);