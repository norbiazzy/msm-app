const fs = require('fs');
const path = require('path');

const root = process.cwd();

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const cssPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

if (!fs.existsSync(appPath) || !fs.existsSync(cssPath)) {
  console.error('Не найден App.tsx или styles.css');
  process.exit(1);
}

let app = fs.readFileSync(appPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

fs.copyFileSync(
  appPath,
  appPath + '.bak-v037'
);

fs.copyFileSync(
  cssPath,
  cssPath + '.bak-v037'
);


// ======================================================
// 1. Убираем видимый текст \n
// ======================================================

// Если \n оказался между двумя JSX-блоками
app = app.replace(
  /\}\s*\\n\s*\{/g,
  '}\n    {'
);

// Если \n находится отдельной строкой
app = app.replace(
  /^[ \t]*\\n[ \t]*$/gm,
  ''
);

console.log('✓ Лишний \\\\n удалён');


// ======================================================
// 2. Логика проверки / корректировки счёта
// ======================================================

const oldCanReview =
  /const canReview\s*=\s*current\s*&&\s*current\.status\s*===\s*'WAITING_MANAGER_REVIEW'\s*&&\s*\[\s*'MANAGER'\s*,\s*'LEADER'\s*,\s*'ADMIN'\s*\]\.includes\(user\.role\);/;

if (!oldCanReview.test(app)) {
  console.error(
    'Не найдена старая логика canReview'
  );

  process.exit(1);
}

app = app.replace(
  oldCanReview,

`const canManageInvoice =
    Boolean(current) &&
    ['MANAGER', 'LEADER', 'ADMIN'].includes(user.role);

  const canConfirm =
    canManageInvoice &&
    current?.status === 'WAITING_MANAGER_REVIEW';

  const canCorrect =
    canManageInvoice &&
    (
      current?.status === 'WAITING_MANAGER_REVIEW' ||
      current?.status === 'CONFIRMED'
    );`
);

console.log(
  '✓ Логика подтверждения счёта обновлена'
);


// ======================================================
// 3. Блок "Проверьте готовый счёт"
// ======================================================

const oldReviewBlock =
`    {canReview && <div className="reviewBox">
      <strong>Проверьте готовый счёт</strong>
      <p>Если всё правильно — подтвердите. Если нужна правка — отправьте комментарий бухгалтерии.</p>
      <div className="actions">
        <button className="secondary" disabled={saving} onClick={() => setCorrectionOpen((v) => !v)}>Скорректировать</button>
        <button className="primary" disabled={saving} onClick={confirm}>{saving ? 'Сохраняем…' : 'Всё верно'}</button>
      </div>
    </div>}`;

if (!app.includes(oldReviewBlock)) {
  console.error(
    'Не найден блок проверки готового счёта'
  );

  process.exit(1);
}

const newReviewBlock =
`    {canCorrect && current && (
      <div className="reviewBox">

        <strong>
          {current.status === 'CONFIRMED'
            ? 'Счёт подтверждён'
            : 'Проверьте готовый счёт'}
        </strong>

        <p>
          {current.status === 'CONFIRMED'
            ? 'Счёт уже подтверждён. Если позже обнаружилась ошибка, его всё равно можно отправить бухгалтерии на корректировку.'
            : 'Если всё правильно — подтвердите. Если нужна правка — отправьте комментарий бухгалтерии.'}
        </p>

        <div
          className={
            canConfirm
              ? 'actions'
              : 'actions singleAction'
          }
        >

          <button
            className="secondary"
            disabled={saving}
            onClick={() =>
              setCorrectionOpen(
                (value) => !value
              )
            }
          >
            Скорректировать
          </button>

          {canConfirm && (
            <button
              className="primary"
              disabled={saving}
              onClick={confirm}
            >
              {saving
                ? 'Сохраняем…'
                : 'Всё верно'}
            </button>
          )}

        </div>

      </div>
    )}

    {canManageInvoice &&
      current?.status === 'CORRECTION_REQUESTED' && (

      <div className="infoBox">

        <strong>
          Счёт отправлен на корректировку
        </strong>

        <p>
          Бухгалтерия получила задачу.
          После загрузки исправленного счёта
          появится новая версия для проверки.
        </p>

      </div>

    )}`;

app = app.replace(
  oldReviewBlock,
  newReviewBlock
);

console.log(
  '✓ Корректировка остаётся после подтверждения'
);


// ======================================================
// 4. Более плавные анимации
// ======================================================

if (
  !css.includes(
    '/* MSM smooth animations v0.3.7 */'
  )
) {

  css += `

/* MSM smooth animations v0.3.7 */

@keyframes msmFadeUp {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes msmFade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.dealCard,
.taskCard,
.detailHero,
.invoiceBlock,
.reviewBox,
.correctionBox,
.paymentBox,
.infoBox,
.versionRow {
  animation:
    msmFadeUp
    220ms
    ease-out
    both;
}

.paymentForm,
.versionList {
  animation:
    msmFade
    180ms
    ease-out
    both;
}

.primary,
.secondary,
.fileButton,
.taskCard,
.dealCard,
.backLink,
.segmented button,
.bottomNav button {
  transition:
    transform 160ms ease,
    opacity 160ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.primary:hover,
.secondary:hover,
.fileButton:hover,
.taskCard:hover,
.dealCard:hover {
  transform:
    translateY(-1px);
}

.primary:active,
.secondary:active,
.fileButton:active,
.taskCard:active,
.dealCard:active,
.segmented button:active {
  transform:
    scale(.985);
}

.primary:disabled,
.secondary:disabled {
  opacity: .55;
  cursor: default;
  transform: none;
}

.segmented button.selected {
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease,
    transform 160ms ease;
}

.actions.singleAction {
  grid-template-columns: 1fr;
}

@media (
  prefers-reduced-motion:
  reduce
) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;

  console.log(
    '✓ Плавные анимации добавлены'
  );
}


// ======================================================
// SAVE
// ======================================================

fs.writeFileSync(
  appPath,
  app,
  'utf8'
);

fs.writeFileSync(
  cssPath,
  css,
  'utf8'
);

console.log('');
console.log('ГОТОВО — MSM v0.3.7');
console.log('');
console.log('✓ Убран лишний \\\\n');
console.log('✓ Плавнее карточки и кнопки');
console.log('✓ Мягкое появление блоков');
console.log('✓ После "Всё верно" можно сделать корректировку');
console.log('✓ При активной корректировке повторная задача не создаётся');
console.log('');
console.log('Миграция базы не нужна.');