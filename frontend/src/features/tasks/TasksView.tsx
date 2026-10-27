/* MSM_FIXES_V10 */
/* MSM_DOCUMENT_FLOW_V9 */
import { AccountantDocumentPicker } from '../../DocumentPickerV9';
import { useEffect, useMemo, useState } from 'react';
import type { CurrentUser } from '../../types';
import { type Task, dealFileUrl, listTasks, returnInvoiceRequest, updateTaskStatus } from '../../api';
import { useBackgroundUploads } from '../../backgroundUploads';
import { clearInvoiceTaskDraft, loadInvoiceTaskDraftFiles, readInvoiceTaskDraftFields, saveInvoiceTaskDraftFields, saveInvoiceTaskDraftFiles } from '../../invoiceTaskDraft';
import { startInvoiceSubmission } from '../../invoiceSubmissionQueue';
import { LibraryFileChooser, type LibrarySelection } from '../../LibraryFileChooser';
import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';
import { TaskDataSection } from '../../TaskDataSection';
import { TaskWorkSection } from '../../TaskWorkSection';
/* MSM_STEP31_ACCOUNTANT_WORK_FORMS */
import { TaskContextStrip } from '../../TaskContextStrip';
import { SupplierBalanceCorrectionTask, SupplierPaymentTask } from '../../PurchasesBlock';
import { PowerOfAttorneyTask } from '../../PowerOfAttorneyBlock';
import { ReturnToManagerPanel } from '../../ReturnToManagerPanel';
import { ManagerResubmitPanel } from '../../ManagerResubmitPanel';
import { TaskStructuredFields } from '../../TaskStructuredFields';
import { InvoiceRequestDataCard, InvoiceRequestManagerRepair } from '../../InvoiceRequestTaskPanel';
import { TaskDocuments } from '../../TaskDocuments';
import { formatMoneyInput, parseMoneyInput, sellerLabels, taskStatus, todayLocalDate } from '../../shared/formatters';
import { Field } from '../../shared/Field';

export function TasksView({ user, onChanged }: { user: CurrentUser; onChanged: () => void }) {
  const backgroundUploads =
    useBackgroundUploads();


  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selected, setSelected] =
    useState<Task | null>(null);

  const [
    showCompleted,
    setShowCompleted,
  ] = useState(false);

  // PART_V064_J_TASK_FILTER_STATE
  const [
    taskFilter,
    setTaskFilter,
  ] = useState<
    'ALL' |
    'IN_PROGRESS' |
    'NEW' |
    'NEED_DATA'
  >('ALL');

  // PART_V064_K_TASK_SEARCH_STATE
  const [
    taskSearch,
    setTaskSearch,
  ] = useState('');




  async function reloadTasks(
    showLoading = true
  ) {

    if (showLoading) {
      setLoading(true);
    }

    try {

      setTasks(
        await listTasks()
      );

    } finally {

      if (showLoading) {
        setLoading(false);
      }

    }
  }


  useEffect(() => {

    void reloadTasks(true);

    const timer =
      window.setInterval(
        () => {
          void reloadTasks(false);
        },
        7000
      );

    return () => {
      window.clearInterval(timer);
    };

  }, []);


  useEffect(() => {

    const syncSelectedTask = () => {

      const hash =
        window.location.hash
          .replace(
            /^#/,
            ''
          );


      if (
        !hash.startsWith(
          'tasks/'
        )
      ) {

        setSelected(null);
        return;
      }


      const taskId =
        decodeURIComponent(
          hash.slice(
            'tasks/'.length
          )
        );


      const found =
        tasks.find(
          (item) =>
            item.id === taskId
        );


      if (found) {
        setSelected(found);
      }
    };


    syncSelectedTask();


    window.addEventListener(
      'hashchange',
      syncSelectedTask
    );


    return () => {

      window.removeEventListener(
        'hashchange',
        syncSelectedTask
      );

    };

  }, [tasks]);


  function taskTime(
    task: Task
  ) {

    if (!task.createdAt) {
      return 0;
    }


    const value =
      new Date(
        task.createdAt
      ).getTime();


    return Number.isFinite(value)
      ? value
      : 0;
  }


  function sortActive(
    items: Task[]
  ) {

    return [...items].sort(
      (a, b) => {

        // Срочные первыми
        // только внутри своей группы.
        if (
          a.urgent !==
          b.urgent
        ) {

          return a.urgent
            ? -1
            : 1;
        }


        // Старые выше новых.
        return (
          taskTime(a) -
          taskTime(b)
        );
      }
    );
  }


  const inProgress =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'IN_PROGRESS'
          )
        ),
      [tasks]
    );


  const newTasks =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'NEW'
          )
        ),
      [tasks]
    );


  const needData =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              task.status ===
              'NEED_DATA'
          )
        ),
      [tasks]
    );


  const otherActive =
    useMemo(
      () =>
        sortActive(
          tasks.filter(
            (task) =>
              ![
                'IN_PROGRESS',
                'NEW',
                'NEED_DATA',
                'DONE',
                'CANCELLED',
              ].includes(
                task.status
              )
          )
        ),
      [tasks]
    );


  const completed =
    useMemo(
      () =>
        [...tasks]
          .filter(
            (task) =>
              [
                'DONE',
                'CANCELLED',
              ].includes(
                task.status
              )
          )
          .sort(
            (a, b) =>
              taskTime(b) -
              taskTime(a)
          ),
      [tasks]
    );


  const activeCount =
    inProgress.length +
    newTasks.length +
    needData.length +
    otherActive.length;


  function openTask(
    task: Task
  ) {

    window.location.hash =
      '#tasks/' +
      encodeURIComponent(
        task.id
      );

    setSelected(task);
  }


  function renderTask(
    task: Task,
    completedTask = false
  ) {

    // PART_V064_M2_CLEAN_RENDER_TASK
    const statusClass =
      task.status
        .toLowerCase()
        .replace(
          /_/g,
          '-'
        );

    const currentInvoice =
      task.deal.invoices.find(
        (invoice) =>
          invoice.isCurrent
      ) ??
      task.deal.invoices[0];

    const sellerType =
      currentInvoice?.sellerType ||
      task.deal.sellerType;

    const managerName =
      [
        task.createdBy?.firstName,
        task.createdBy?.lastName,
      ]
        .filter(Boolean)
        .join(' ');

    // PART_V064_O15_V3_ACCOUNTANT_RETURN_MESSAGE
    const accountantReturnEvent =
      task.deal.auditEvents?.find(
        (event) =>
          event.entityId === task.id &&
          (
            event.action ===
              'INVOICE_REQUEST_RETURNED' ||
            event.action ===
              'TASK_RETURNED_TO_MANAGER'
          )
      );

    const accountantReturnReason =
      task.status === 'NEED_DATA'
        ? String(
            accountantReturnEvent
              ?.newValue
              ?.reasonLabel ||
            task.payload?.returnReason ||
            'Бухгалтер вернул задачу на исправление'
          )
        : '';

    const accountantReturnComment =
      task.status === 'NEED_DATA'
        ? String(
            accountantReturnEvent?.reason ||
            task.payload?.returnComment ||
            ''
          )
        : '';

    const createdLabel =
      task.createdAt
        ? new Date(
            task.createdAt
          )
            .toLocaleString(
              'ru-RU',
              {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            )
            .replace(',', ' ·')
        : '';

    // PART_V064_O18_V2_TASK_UPLOAD_PROGRESS
    const taskUploadJob =
      backgroundUploads.find(
        (job) =>
          job.taskId === task.id &&
          (
            !job.scope ||
            job.scope === 'TASK'
          )
      );


    return (
      <button
        key={task.id}
        type="button"
        className={
          'taskCard taskCardStatus-' +
          statusClass +
          (
            task.urgent &&
            !completedTask
              ? ' taskCardUrgent'
              : ''
          ) +
          (
            completedTask
              ? ' taskCardCompleted'
              : ''
          )
        }
        onClick={() =>
          openTask(task)
        }
      >
        <div className="taskCardMain">
          <div className="taskCardTitle">
            <strong>
              {task.title}
            </strong>

            {task.urgent &&
              !completedTask && (
              <b className="urgent">
                СРОЧНО
              </b>
            )}
          </div>

          <span className="taskClient">
            {task.deal.clientName}
          </span>

          <div className="taskVariantAMeta">
            <span className="taskVariantADeal">
              ЗК-{task.deal.internalNumber}
            </span>

            {currentInvoice?.number && (
              <span className="taskVariantAPill taskVariantAInvoice">
                {sellerLabels[sellerType] || sellerType}
                {' - '}
                {currentInvoice.number}
              </span>
            )}

            {managerName && (
              <span className="taskVariantAPill taskVariantAManager">
                Менеджер: {managerName}
              </span>
            )}
          </div>

          {createdLabel && (
            <span className="taskCreated">
              {createdLabel}
            </span>
          )}
        </div>

        <div className="taskState">
          <span
            className={
              'taskStatusBadge taskStatus-' +
              statusClass
            }
          >
            {
              taskStatus(
                task.status
              )
            }
          </span>
        </div>

        {/* PART_V064_O17_RETURN_TASK_VARIANT_A */}
        {task.status === 'NEED_DATA' && (
          <div className="taskReturnNotice taskReturnNoticeV4">

            <div className="taskReturnNoticeTop">
              <span className="taskReturnNoticeIcon">
                ↩
              </span>

              <strong>
                Вернул бухгалтер
              </strong>
            </div>

            <b className="taskReturnReasonText">
              {accountantReturnReason}
            </b>

            {accountantReturnComment && (
              <p className="taskReturnCommentText">
                {accountantReturnComment}
              </p>
            )}

          </div>
        )}

        {taskUploadJob && (
          <div
            className={
              'taskUploadInline taskUpload-' +
              taskUploadJob.status.toLowerCase()
            }
          >
            <div className="taskUploadTop">
              <strong>
                {
                  taskUploadJob.status === 'SUCCESS'
                    ? '✓ ' +
                      (
                        taskUploadJob.successTitle ||
                        taskUploadJob.title
                      )
                    : taskUploadJob.status === 'ERROR'
                      ? 'Ошибка загрузки'
                      : '↑ ' + taskUploadJob.title
                }
              </strong>

              <b>
                {taskUploadJob.progress}%
              </b>
            </div>

            <div className="taskUploadBar">
              <div
                style={{
                  width:
                    Math.max(
                      0,
                      Math.min(
                        100,
                        taskUploadJob.progress
                      )
                    ) + '%',
                }}
              />
            </div>

            <div className="taskUploadMeta">
              {
                taskUploadJob.status === 'RUNNING'
                  ? (
                      taskUploadJob.totalFiles > 0
                        ? (
                            taskUploadJob.completedFiles +
                            ' из ' +
                            taskUploadJob.totalFiles +
                            ' файлов'
                          )
                        : 'Сохраняем данные…'
                    )
                  : taskUploadJob.status === 'SUCCESS'
                    ? 'Готово'
                    : (
                        taskUploadJob.error ||
                        'Не удалось загрузить файлы'
                      )
              }

              {
                taskUploadJob.currentFile
                  ? ' · ' +
                    taskUploadJob.currentFile
                  : ''
              }
            </div>
          </div>
        )}


      </button>
    );
  }

  function renderGroup(
    title: string,
    items: Task[],
    className: string
  ) {

    if (
      items.length === 0
    ) {
      return null;
    }


    return (

      <div
        className={
          'taskGroup ' +
          className
        }
      >

        <div className="taskGroupHead">

          <strong>
            {title}
          </strong>

          <span>
            {items.length}
          </span>

        </div>


        <div className="dealList">

          {items.map(
            (task) =>
              renderTask(task)
          )}

        </div>

      </div>

    );
  }


  if (selected) {

    // PART_1N_I1_INVOICE_MANAGER_TASK
    if (
      selected.type ===
        'ISSUE_CLIENT_INVOICE' &&
      selected.status ===
        'NEED_DATA' &&
      user.role !==
        'ACCOUNTANT'
    ) {

      return (
        <InvoiceRequestManagerRepair
          task={selected}
          user={user}
          onResubmitted={() => {
            window.location.hash =
              '#tasks';

            setSelected(null);

            void reloadTasks(
              false
            );

            onChanged();
          }}
        />
      );
    }


    return selected.type === 'POWER_OF_ATTORNEY' ? (

      <PowerOfAttorneyTask
        task={selected}
        user={user}
        onBack={() => {
          window.location.hash =
            '#tasks';

          setSelected(null);
          void reloadTasks(false);
          onChanged();
        }}
      />

    ) : selected.type === 'OTHER' &&
      selected.payload?.kind ===
        'SUPPLIER_BALANCE_CORRECTION' ? (

      <SupplierBalanceCorrectionTask
        task={selected}
        user={user}
        onBack={() => {
          window.location.hash =
            '#tasks';

          setSelected(null);
          void reloadTasks(false);
          onChanged();
        }}
      />

    ) : selected.type === 'PAY_SUPPLIER' &&
      selected.supplierPurchase ? (

      <SupplierPaymentTask
        task={selected}
        user={user}

        onBack={() => {

          window.location.hash =
            '#tasks';

          setSelected(null);

          void reloadTasks(
            false
          );

          onChanged();
        }}
      />

    ) : (

      <TaskDetail
        task={selected}
        user={user}

        onBack={() => {

          window.location.hash =
            '#tasks';

          setSelected(null);

          void reloadTasks(
            false
          );

          onChanged();
        }}
      />

    );
  }

  return (

    <section className="content">

      {/* PART_V064_J_APPROVED_TASK_LIST */}

      <div className="taskListIntro">
        <strong>
          {
            user.role === 'ACCOUNTANT'
              ? 'Бухгалтерия'
              : user.role === 'MANAGER'
                ? 'Менеджер'
                : user.role === 'LEADER'
                  ? 'Руководитель'
                  : 'Все роли'
          }
        </strong>

        <span>
          {activeCount} активных
        </span>
      </div>

      {/* PART_V064_K_TASK_SEARCH_UI */}
      <label className="taskSearch">
        <span>⌕</span>

        <input
          id="bo-task-search"
          value={taskSearch}
          onChange={(event) =>
            setTaskSearch(
              event.target.value
            )
          }
          placeholder="Поиск: ЗК, клиент, задача, МСМ/СТ/ИП, № счёта..."
        />

        {taskSearch && (
          <button
            type="button"
            className="taskSearchClear"
            aria-label="Очистить поиск"
            onClick={() =>
              setTaskSearch('')
            }
          >
            ×
          </button>
        )}
      </label>

      <div
        className="taskFilterBar"
        role="tablist"
        aria-label="Фильтр задач"
      >
        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'ALL'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('ALL')
          }
        >
          Все
          <b>{activeCount}</b>
        </button>

        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'IN_PROGRESS'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('IN_PROGRESS')
          }
        >
          В работе
          <b>{inProgress.length}</b>
        </button>

        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'NEW'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('NEW')
          }
        >
          Новые
          <b>{newTasks.length}</b>
        </button>

        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'NEED_DATA'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('NEED_DATA')
          }
        >
          Нужно исправить
          <b>{needData.length}</b>
        </button>
      </div>

      {loading ? (
        <div className="empty">
          Загрузка…
        </div>
      ) : activeCount === 0 ? (
        <div className="empty">
          Активных задач нет
        </div>
      ) : (() => {
        // PART_V064_K_TASK_SEARCH_FILTER
        const normalizedTaskSearch =
          taskSearch
            .trim()
            .toLowerCase();

        const visibleTasks = [
          ...inProgress,
          ...newTasks,
          ...needData,
          ...otherActive,
        ]
          .filter(
            (task) =>
              taskFilter === 'ALL' ||
              task.status === taskFilter
          )
          .filter((task) => {
            if (!normalizedTaskSearch) {
              return true;
            }

            const currentInvoice =
              task.deal.invoices.find(
                (invoice) =>
                  invoice.isCurrent
              ) ??
              task.deal.invoices[0];

            const taskSellerType =
              currentInvoice?.sellerType ||
              task.deal.sellerType;

            const haystack = [
              task.title,
              task.description,
              task.deal.clientName,
              'ЗК-' +
                task.deal.internalNumber,
              sellerLabels[
                taskSellerType
              ] ||
                taskSellerType,
              currentInvoice?.number,
              task.supplierPurchase
                ?.supplierName,
              task.payload
                ?.supplierName,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            return haystack.includes(
              normalizedTaskSearch
            );
          });

        return visibleTasks.length > 0 ? (
          <div className="taskFlatList">
            {visibleTasks.map(
              (task) =>
                renderTask(task)
            )}
          </div>
        ) : (
          <div className="empty">
            В этой категории задач нет
          </div>
        );
      })()}




      {completed.length > 0 && (

        <div className="completedTasksBlock">

          <button
            type="button"
            className="completedToggle"

            onClick={() =>
              setShowCompleted(
                (value) =>
                  !value
              )
            }
          >

            <span>
              {showCompleted
                ? 'Скрыть выполненные'
                : 'Показать выполненные'}
            </span>

            <b>
              {completed.length}
            </b>

          </button>


          {showCompleted && (

            <div className="completedTasksList">

              {completed.map(
                (task) =>
                  renderTask(
                    task,
                    true
                  )
              )}

            </div>

          )}

        </div>

      )}

    </section>
  );
}

function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {

  /* MSM_STEP26_PREFILL_CORRECTION_INVOICE_NUMBER */
  // Only a correction uses the existing invoice number as a default.
  // Draft edits have priority and the input stays fully editable.
  const correctionSourceNumber =
    task.type === 'CORRECT_CLIENT_INVOICE'
      ? String(
          (
            task.deal.invoices?.find((invoice) => invoice.isCurrent) ??
            task.deal.invoices?.[0]
          )?.number || ''
        )
      : '';

  const [status, setStatus] =
    useState(task.status);

  const [number, setNumber] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [
    invoiceFiles,
    setInvoiceFiles,
  ] = useState<File[]>([]);
  const [msmInvoiceLibraryFile, setMsmInvoiceLibraryFile] = useState<LibrarySelection | null>(null);
  useEffect(() => { setMsmInvoiceLibraryFile(null); }, [task.id]);

  const [
    invoiceDraftReady,
    setInvoiceDraftReady,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    returnModalOpen,
    setReturnModalOpen,
  ] = useState(false);

  const [
    returnReason,
    setReturnReason,
  ] = useState('');

  const [
    returnComment,
    setReturnComment,
  ] = useState('');


  useEffect(() => {

    setStatus(
      task.status
    );

  }, [
    task.id,
    task.status,
  ]);

  useEffect(() => {

    if (
      ![
        'ISSUE_CLIENT_INVOICE',
        'CORRECT_CLIENT_INVOICE',
      ].includes(task.type)
    ) {
      setInvoiceDraftReady(true);
      return;
    }


    let cancelled = false;

    setInvoiceDraftReady(false);


    const fields =
      readInvoiceTaskDraftFields(
        task.id,
      );

    setNumber(
      fields.number.trim()
        ? fields.number
        : correctionSourceNumber
    );
    setAmount(fields.amount);


    void loadInvoiceTaskDraftFiles(
      task.id,
    )
      .then((files) => {

        if (cancelled) {
          return;
        }

        setInvoiceFiles(files);
        setInvoiceDraftReady(true);
      })
      .catch(() => {

        if (!cancelled) {
          setInvoiceDraftReady(true);
        }
      });


    return () => {
      cancelled = true;
    };

  }, [task.id, task.type, correctionSourceNumber]);


  useEffect(() => {

    if (
      !invoiceDraftReady ||
      ![
        'ISSUE_CLIENT_INVOICE',
        'CORRECT_CLIENT_INVOICE',
      ].includes(task.type)
    ) {
      return;
    }


    try {
      saveInvoiceTaskDraftFields(
        task.id,
        {
          number,
          amount,
        },
      );
    } catch (e) {
      console.warn(
        'Не удалось сохранить поля черновика счёта',
        e,
      );
    }

  }, [
    invoiceDraftReady,
    task.id,
    task.type,
    number,
    amount,
  ]);


  useEffect(() => {

    if (
      !invoiceDraftReady ||
      ![
        'ISSUE_CLIENT_INVOICE',
        'CORRECT_CLIENT_INVOICE',
      ].includes(task.type)
    ) {
      return;
    }


    void saveInvoiceTaskDraftFiles(
      task.id,
      invoiceFiles,
    ).catch((e) => {
      console.warn(
        'Не удалось сохранить файлы черновика счёта',
        e,
      );
    });

  }, [
    invoiceDraftReady,
    task.id,
    task.type,
    invoiceFiles,
  ]);



  async function take() {

    setSaving(true);
    setError('');


    try {

      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id,
      );


      setStatus(
        'IN_PROGRESS',
      );


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  async function sendBackToManager() {

    if (!returnReason) {
      setError(
        'Выберите причину возврата'
      );
      return;
    }


    if (
      returnReason === 'OTHER' &&
      !returnComment.trim()
    ) {
      setError(
        'Для причины «Другое» добавьте комментарий'
      );
      return;
    }


    setSaving(true);
    setError('');


    try {
      await returnInvoiceRequest(
        task.id,
        {
          actorId:
            user.id,
          reasonCode:
            returnReason,
          comment:
            returnComment.trim() ||
            undefined,
        },
      );

      setReturnModalOpen(false);
      setReturnReason('');
      setReturnComment('');

      await clearInvoiceTaskDraft(
        task.id,
      ).catch(() => undefined);

      onBack();

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {
      setSaving(false);
    }
  }


  async function finishInvoice() {

    setError('');


    const filesToUpload = [...invoiceFiles];
    if (filesToUpload.length > 1) { setError('Выберите один готовый счёт. В черновике осталось несколько файлов из старой версии.'); return; }


    if (filesToUpload.length === 0 && !msmInvoiceLibraryFile) {
      setError(
        'Прикрепите файл готового счёта.'
      );
      return;
    }


    const numberToSave = '';


    const amountToSave = undefined;


    setSaving(true);


    try {

      await startInvoiceSubmission({

        taskId:
          task.id,

        dealId:
          task.deal.id,

        clientName:
          task.deal.clientName,

        number:
          numberToSave,

        amount:
          amountToSave,

        invoiceDate:
          todayLocalDate(),

        actorId:
          user.id,

        files:
          filesToUpload,
        linkedFileId: msmInvoiceLibraryFile?.id,
      });


      onBack();

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

      setSaving(false);
    }
  }


  const canAttachInvoice =
    [
      'ISSUE_CLIENT_INVOICE',
      'CORRECT_CLIENT_INVOICE',
    ].includes(
      task.type,
    );


  const allDealFiles =
    task.deal.files || [];


  const managerIncomingFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'MANAGER_ATTACHMENT'
    );


  const correctionPrimaryFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'CORRECTION_PRIMARY_' +
        task.id
    );


  const correctionExtraFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'CORRECTION_ATTACHMENT_' +
        task.id
    );


  const legacyCorrectionFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
        'CORRECTION_TASK_' +
        task.id
    );


  const issueExtraFiles =
    allDealFiles.filter(
      (file) =>
        file.category ===
          'MANAGER_ATTACHMENT' ||

        file.category ===
          'INCOMING_SUPPLIER_INVOICE'
    );


  // Sort versions without changing their stored order or categories.
  const orderedCorrectionPrimaryFiles = [...correctionPrimaryFiles].sort(
    (a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0),
  );
  const latestCorrectionPrimary = orderedCorrectionPrimaryFiles[0];
  const correctionCurrentDocuments = [
    ...(latestCorrectionPrimary
      ? [{ file: latestCorrectionPrimary, description: 'Основной входящий счёт' }]
      : []),
    ...correctionExtraFiles.map((file) => ({ file, description: 'Дополнительный документ' })),
    ...(!latestCorrectionPrimary
      ? legacyCorrectionFiles.map((file) => ({ file, description: 'Документ корректировки (старый формат)' }))
      : []),
  ];
  const initialCorrectionDocs = managerIncomingFiles.map((file) => ({
    file,
    description: 'Исходное вложение сделки',
  }));
  const correctionHistoryDocuments = [
    ...orderedCorrectionPrimaryFiles.slice(1).map((file) => ({
      file,
      description: 'Предыдущая версия основного счёта',
    })),
    ...(latestCorrectionPrimary
      ? legacyCorrectionFiles.map((file) => ({
          file,
          description: 'Ранее приложенный документ корректировки',
        }))
      : []),
    ...(correctionCurrentDocuments.length > 0 ? initialCorrectionDocs : []),
  ];
  if (correctionCurrentDocuments.length === 0) {
    correctionCurrentDocuments.push(...initialCorrectionDocs);
  }

  // MSM_STEP30_ETRN_UNIFIED_LAYOUT: only for the ETRN display, never written back to the task.
  const etrnDetails = task.details || {};
  const etrnPayload = task.payload || {};
  const etrnValue = (key: string) => String(etrnDetails[key] || etrnPayload[key] || '—');
  const etrnInvoiceNumber = String(etrnDetails.invoiceNumber || etrnPayload.invoiceNumber || '');
  const etrnInvoiceSellerType = String(etrnDetails.invoiceSellerType || etrnPayload.invoiceSellerType || '');
  const etrnSellerLabel = ({MSM: 'МСМ', ST: 'СТ', IP: 'ИП'} as Record<string, string>)[etrnInvoiceSellerType] || etrnInvoiceSellerType;
  const etrnInvoiceLabel = etrnInvoiceNumber
    ? [etrnSellerLabel, etrnInvoiceNumber].filter(Boolean).join(' - ')
    : '—';

  const currentTaskInvoice =
    task.deal.invoices?.find((invoice) => invoice.isCurrent) ??
    task.deal.invoices?.[0];


  return (

    <section
      className={'content form taskWorkspace' + (task.type === 'ISSUE_CLIENT_INVOICE' ? ' taskWorkspace--invoiceIssue' : '') + (task.type === 'ETRN' ? ' taskWorkspace--unified taskWorkspace--etrn' : '')}
      data-task-status={status}
    >

      {/* PART_1N_K5_V3_RETURN_COMMENT_DETAIL */}
      {status === 'NEED_DATA' && task.type !== 'ETRN' &&
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





      {/* PART_1N_H1_TASK_DETAIL_DEAL_LINK */}

      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.type !== 'ETRN' && (
      <a
        className="taskDetailDealLink"
        href={
          '#deal/' +
          encodeURIComponent(
            task.deal.id
          )
        }
      >
        <strong>
          ЗК-
          {task.deal.internalNumber}
        </strong>

        <span>
          {task.deal.clientName}
        </span>

        <b>
          Открыть сделку →
        </b>
      </a>
      )}


      {/* ETRN documents now follow its header and data. */}


      {/* PART_1N_E1_STRUCTURED_TASK_DETAILS */}

      {task.type === 'POWER_OF_ATTORNEY' &&
        task.details && Object.keys(task.details).length > 0 && (
          <TaskStructuredFields taskType={task.type} value={task.details} readOnly />
        )}

      {/* PART_1N_D1_V2_UNIVERSAL_MANAGER_RESUBMIT */}
      {/* PART_1N_B1_MANAGER_RESUBMIT */}

      {status === 'NEED_DATA' && task.type !== 'ETRN' &&
        user.role !== 'ACCOUNTANT' &&
        (
          task.type !== 'ISSUE_CLIENT_INVOICE' &&
          task.type !== 'PAY_SUPPLIER'
        ) && (

        <ManagerResubmitPanel
          taskId={task.id}
          dealId={task.deal.id}
          taskType={task.type}
          actorId={user.id}
          initialDescription={
            task.description
          }
          initialUrgent={
            task.urgent
          }
          initialDetails={
            task.details
          }
          onResubmitted={onBack}
        />

      )}



      <button
        className="backLink"
        onClick={onBack}
      >
        ← К задачам
      </button>


      <div className="detailHero">

        <div className="eyebrow">
          ЗК-
          {task.deal.internalNumber}
        </div>


        <h2>
          {task.title}
        </h2>


        <p>
          {task.deal.clientName}
        </p>


        <div className="statusPill">
          {
            taskStatus(
              status
            )
          }
        </div>


        {task.urgent && (

          <b className="urgent">
            СРОЧНО
          </b>

        )}

      </div>

      {/* PART_V064_L_GENERIC_TASK_CONTEXT */}
      <TaskContextStrip task={task} />
        

      {/* MSM_STEP30_ETRN_UNIFIED_LAYOUT: structured details and documents after the task header. */}
      {task.type === 'ETRN' && (
        <>
          <TaskDataSection
            title="Данные для ЭТрН"
            subtitle="Маршрут, перевозчик и контактные лица"
            items={[
              {label: '№ доверенности', value: etrnValue('poaNumber')},
              {label: 'Актуальный счёт', value: etrnInvoiceLabel},
              {label: 'Адрес погрузки', value: etrnValue('loadingAddress'), wide: true},
              {label: 'Адрес выгрузки', value: etrnValue('unloadingAddress'), wide: true},
              {label: 'Контакт на объекте', value: etrnValue('objectContactName')},
              {label: 'Телефон на объекте', value: etrnValue('objectContactPhone')},
              {label: 'Перевозчик / ООО', value: etrnValue('carrierCompany')},
              {label: 'Контакт перевозчика', value: etrnValue('carrierContactName')},
              {label: 'Телефон перевозчика', value: etrnValue('carrierPhone')},
              ...(task.description
                ? [{label: 'Комментарий менеджера', value: task.description, wide: true}]
                : []),
            ]}
          />
          <EtrnSourceDocuments task={task} />
          {status === 'NEED_DATA' && user.role !== 'ACCOUNTANT' && (
            <>
              {String((task as any).returnComment || '').trim() && (
                <div className="taskReturnCommentDetail">
                  <strong>Комментарий бухгалтера</strong>
                  <p>{String((task as any).returnComment)}</p>
                </div>
              )}
              <ManagerResubmitPanel
                taskId={task.id}
                dealId={task.deal.id}
                taskType={task.type}
                actorId={user.id}
                initialDescription={task.description}
                initialUrgent={task.urgent}
                initialDetails={task.details}
                onResubmitted={onBack}
              />
            </>
          )}
          {status === 'NEW' && user.role === 'ACCOUNTANT' && (
            <div className="taskUnifiedStartActions">
              <ReturnToManagerPanel
                taskId={task.id}
                actorId={user.id}
                disabled={saving}
                onReturned={onBack}
              />
              <button type="button" className="primary wide" disabled={saving} onClick={take}>
                {saving ? 'Сохраняем…' : 'В работу'}
              </button>
            </div>
          )}
          {status === 'IN_PROGRESS' && user.role === 'ACCOUNTANT' && (
            <>
              <div className="taskUnifiedSingleAction">
                <ReturnToManagerPanel
                  taskId={task.id}
                  actorId={user.id}
                  disabled={saving}
                  onReturned={onBack}
                />
              </div>
              <TaskWorkSection
                title="Подготовка ЭТрН"
                description="Данные маршрута, перевозчика и документы приведены выше."
              >
                <p className="taskAccountantWorkHint">В этом экране пока нет действия завершения ЭТрН. Для проверки и выпуска ЭТрН через оператора ЭПД потребуется отдельная интеграция.</p>
              </TaskWorkSection>
            </>
          )}
        </>
      )}

      {/* END_MSM_STEP30_ETRN_UNIFIED_LAYOUT */}

      {/* PART_1N_I1_INVOICE_DATA_CARD */}

      {task.type ===
        'ISSUE_CLIENT_INVOICE' && (

        <InvoiceRequestDataCard
          task={task}
        />

      )}


      {canAttachInvoice && task.type !== 'ISSUE_CLIENT_INVOICE' && (

        <div className="invoiceTaskBrief">

          <div>
            <span>От кого</span>
            <b className="sellerTaskBadge">
              {
                sellerLabels[
                  task.deal.sellerType
                ]
              }
            </b>
          </div>

          <div>
            <span>На кого</span>
            <b>
              {task.deal.clientName}
            </b>
          </div>

        </div>

      )}


      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.type !== 'ETRN' && task.deal.requestText && (

        <div className="infoBox">

          <strong>
            Запрос менеджера
          </strong>

          <p>
            {task.deal.requestText}
          </p>

        </div>

      )}


      {task.type !== 'ISSUE_CLIENT_INVOICE' && task.type !== 'ETRN' && task.description && (

        <div className="infoBox">

          <strong>
            Комментарий
          </strong>

          <p>
            {task.description}
          </p>

        </div>

      )}


      {/* PART_V064_O14_V2_CORRECTION_TAKE_BUTTON */}
      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        status === 'NEW' && (

        <div className="correctionTaskStartActions">

          <button
            type="button"
            className="primary wide"
            disabled={saving}
            onClick={take}
          >
            {
              saving
                ? 'Сохраняем…'
                : 'В работу'
            }
          </button>

        </div>

      )}


      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        currentTaskInvoice && (

        <div className="infoBox correctionTargetBox">

          <strong>
            Корректируем наш счёт
          </strong>

          <p>
            {
              sellerLabels[
                task.deal.sellerType
              ]
            }-{currentTaskInvoice.number}
            {' · '}
            версия {
              currentTaskInvoice.version ||
              1
            }
          </p>


          {currentTaskInvoice.fileId && (

            <a
              className="correctionTargetLink"

              href={
                dealFileUrl(
                  currentTaskInvoice.fileId
                )
              }

              target="_blank"
              rel="noreferrer"
            >
              Открыть текущий PDF
            </a>

          )}

        </div>

      )}


      {task.type === 'CORRECT_CLIENT_INVOICE' && (
        <TaskDocuments
          title="Документы корректировки"
          subtitle={correctionPrimaryFiles.length === 0 && legacyCorrectionFiles.length > 0
            ? 'Старый формат: проверьте документы вместе с комментарием менеджера'
            : 'Основной счёт, дополнительные материалы и предыдущие вложения'}
          current={correctionCurrentDocuments}
          history={correctionHistoryDocuments}
        />
      )}

      {task.type !== 'CORRECT_CLIENT_INVOICE' &&
        task.type !== 'ISSUE_CLIENT_INVOICE' &&
        task.type !== 'ETRN' &&
        issueExtraFiles.length > 0 && (
          <TaskDocuments
            title="Дополнительные вложения"
            current={issueExtraFiles.map((file) => ({
              file,
              description: 'Вложение к заявке',
            }))}
          />
        )}

            {/* PART_1N_D1_V2_UNIVERSAL_ACCOUNTANT_RETURN */}
      {/* PART_1M_B_POWER_OF_ATTORNEY_RETURN */}
      {/* PART_1M_C_ETRN_RETURN */}


      {(
      task.type !== 'ISSUE_CLIENT_INVOICE' &&
      task.type !== 'PAY_SUPPLIER' &&
      task.type !== 'ETRN'
    ) &&
        (
          status === 'NEW' ||
          status === 'IN_PROGRESS'
        ) && (

        <ReturnToManagerPanel
          taskId={task.id}
          actorId={user.id}
          disabled={saving}
          onReturned={onBack}
        />

      )}


{status === 'NEW' && task.type !== 'ETRN' && (

        task.type ===
          'ISSUE_CLIENT_INVOICE' ? (

          <div className="invoiceTaskStartActions">

            <ReturnToManagerPanel
              taskId={task.id}
              actorId={user.id}
              disabled={saving}
              mode="invoice"
              onReturned={onBack}
            />

            <button
              className="primary"
              disabled={saving}
              onClick={take}
            >
              {
                saving
                  ? 'Сохраняем…'
                  : 'В работу'
              }
            </button>

          </div>

        ) : (

          <button
            className="primary wide"
            disabled={saving}
            onClick={take}
          
              hidden>
            {
              saving
                ? 'Сохраняем…'
                : 'В работу'
            }
          </button>
        )

      )}


      {status === 'IN_PROGRESS' && task.type !== 'ETRN' && (

        <div className="infoBox invoiceTaskInWorkBox">

          <div>
            <strong>
              Задача в работе
            </strong>

            <p>
              Заполните готовый счёт ниже.
            </p>
          </div>

          {task.type ===
            'ISSUE_CLIENT_INVOICE' && (
            <ReturnToManagerPanel
              taskId={task.id}
              actorId={user.id}
              disabled={saving}
              mode="invoice"
              onReturned={onBack}
            />
          )}

        </div>

      )}


      {false &&
        returnModalOpen &&
        task.type ===
          'ISSUE_CLIENT_INVOICE' && (

        <div
          className="appModalBackdrop"
          onClick={() =>
            setReturnModalOpen(false)
          }
        >
          <div
            className="appModal invoiceReturnModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <strong>
              Отказать / вернуть менеджеру
            </strong>

            <p>
              Выберите, чего не хватает для выставления счёта. Менеджер увидит причину и сможет повторно отправить эту же задачу.
            </p>


            <div className="invoiceReturnReasons">

              {[
                [
                  'NO_INCOMING_INVOICE',
                  'Нет входящего счёта',
                ],
                [
                  'NO_TERMS',
                  'Нет условий',
                ],
                [
                  'NO_DETAILS',
                  'Нет реквизитов / непонятно, на кого делать',
                ],
                [
                  'OTHER',
                  'Другое',
                ],
              ].map(
                ([value, label]) => (

                <button
                  type="button"
                  key={value}
                  className={
                    returnReason === value
                      ? 'invoiceReturnReason selected'
                      : 'invoiceReturnReason'
                  }
                  onClick={() =>
                    setReturnReason(value)
                  }
                >
                  <span className="invoiceReturnRadio" />
                  <b>{label}</b>
                </button>

              ))}

            </div>


            <Field title="Комментарий">
              <textarea
                rows={3}
                value={returnComment}
                onChange={(e) =>
                  setReturnComment(
                    e.target.value
                  )
                }
                placeholder="Что нужно добавить или уточнить"
              />
            </Field>


            {error && (
              <div className="error">
                {error}
              </div>
            )}


            <div className="appModalActions">
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() =>
                  setReturnModalOpen(false)
                }
              >
                Отмена
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving || !returnReason}
                onClick={sendBackToManager}
              >
                {
                  saving
                    ? 'Отправляем…'
                    : 'Отказать / вернуть'
                }
              </button>
            </div>

          </div>
        </div>

      )}


      {canAttachInvoice &&
        status ===
          'IN_PROGRESS' && (

        <TaskWorkSection
          title={task.type === 'CORRECT_CLIENT_INVOICE' ? 'Исправление готового счёта' : 'Подготовка готового счёта'}
          description="Приложите готовый документ. Реквизиты распознаются автоматически и проверяются менеджером."
        >

          


          <Field title="Готовый счёт">
            <AccountantDocumentPicker files={invoiceFiles} onChange={setInvoiceFiles} accept="application/pdf,image/*,.xml" />
          </Field>


          <button
            className="primary wide"
            disabled={saving}
            onClick={
              finishInvoice
            }
          >

            {
              saving
                ? 'Сохраняем…'
                : 'Счёт готов'
            }

          </button>


          <div className="microcopy">

            Черновик номера, суммы и файлов
            сохраняется на этом устройстве
            автоматически.

            Дата счёта ставится
            автоматически —
            сегодняшняя.

            Номер счёта пока
            необязателен только
            для тестирования.

          </div>

        </TaskWorkSection>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>
  );
}
