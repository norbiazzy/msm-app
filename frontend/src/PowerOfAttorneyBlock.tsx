import { AutoTextarea } from './AutoTextarea';
/* MSM_FIXES_V10 */
/* MSM_DOCUMENT_FLOW_V9 */
import { AccountantDocumentPicker } from './DocumentPickerV9';
import { PoaEtrnPanel } from './PoaEtrnPanel';
import { LibraryFileChooser, linkLibraryFile, type LibrarySelection } from './LibraryFileChooser';
import { TaskLibraryLinks } from './TaskLibraryLinks';
import { RecognitionAudit } from './RecognitionAudit';
import { TaskContextStrip } from './TaskContextStrip';
import { TaskDataSection } from './TaskDataSection';
import { TaskWorkSection } from './TaskWorkSection';
/* MSM_STEP31_ACCOUNTANT_WORK_FORMS */
/* MSM_STEP29_UNIFIED_TASK_LAYOUT */
import { TaskDocuments } from './TaskDocuments';
/* MSM_STEP27_POA_ETRN_SHARED_DOCUMENTS */
import {
  useMemo,
  useState,
} from 'react';

import {
  completePowerOfAttorneyTask,
  createPowerOfAttorneyTask,
  dealFileUrl,
  updateDealInfo,
  updateTaskStatus,
  type Task,
} from './api';

import { MultiFilePicker } from './MultiFilePicker';
import {
  startBackgroundUploadJob,
} from './backgroundUploads';

import {
  ReturnToManagerPanel,
} from './ReturnToManagerPanel';

import {
  ManagerResubmitPanel,
} from './ManagerResubmitPanel';

import type {
  CurrentUser,
  Deal,
  SellerType,
} from './types';


const sellerLabels:
  Record<SellerType, string> = {
    ST: 'СТ',
    MSM: 'МСМ',
    IP: 'ИП',
  };


function todayLocalDate() {
  const now = new Date();
  const local = new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60000
  );

  return local
    .toISOString()
    .slice(0, 10);
}


function taskStatusLabel(
  status: string,
) {
  return ({
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    NEED_DATA: 'Нужны данные',
    DONE: 'Готова',
    CANCELLED: 'Отменена',
  } as Record<string, string>)[status] || status;
}


export function PowerOfAttorneyBlock({
  deal,
  user,
  onChanged,
}: {
  deal: Deal;
  user: CurrentUser;
  onChanged:
    () => void | Promise<void>;
}) {

  const [open, setOpen] =
    useState(false);

  const [supplierName, setSupplierName] =
    useState('');
const [recipientName, setRecipientName] =
    useState('');
const [goodsDescription, setGoodsDescription] =
    useState('');

  /* PART_V062_POA_REBUILD */
  const [
    accountingComment,
    setAccountingComment,
  ] = useState('');

  const [
    managerComment,
    setManagerComment,
  ] = useState(
    deal.managerComment || ''
  );

  const [files, setFiles] =
    useState<File[]>([]);

  const [urgent, setUrgent] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  const requests = useMemo(
    () =>
      (deal.tasks || [])
        .filter(
          (task) =>
            task.type ===
            'POWER_OF_ATTORNEY'
        ),
    [deal.tasks],
  );


  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (deal.supplierPurchases || [])
            .map(
              (purchase) =>
                purchase.supplierName
            )
            .filter(Boolean)
        )
      ),
    [deal.supplierPurchases],
  );


  function resetForm() {
    setSupplierName('');
setRecipientName('');
setGoodsDescription('');
    setAccountingComment('');
    setManagerComment(deal.managerComment || '');
    setFiles([]);
    setUrgent(false);
    setOpen(false);
  }


  async function createTask(
    requestKey: string,
    withEtrn = false,
  ) {
    // PART_V064_N1_V5B_CREATE_WITH_ETRN
    const normalizedManagerComment =
      managerComment.trim();

    if (
      normalizedManagerComment !==
      String(deal.managerComment || '').trim()
    ) {
      await updateDealInfo(
        deal.id,
        {
          managerComment:
            normalizedManagerComment,
          actorId: user.id,
        },
      );
    }

    await createPowerOfAttorneyTask({
      dealId: deal.id,
      actorId: user.id,
      urgent,
      requestEtrn:
        withEtrn,
      requestKey,
      supplierName:
        supplierName.trim(),
      organization: deal.sellerType,
      recipientName:
        recipientName.trim(),
      goodsDescription:
        goodsDescription.trim(),
      comment:
        accountingComment.trim() ||
        undefined,
    });
  }


  async function submit(
    withEtrn = false,
  ) {
    // PART_V064_N1_V5B_SUBMIT_WITH_ETRN
    setError('');
const requestKey =
      'poa-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 8);

    const filesToUpload =
      [...files];


    if (filesToUpload.length > 0) {
      startBackgroundUploadJob({
        dealId: deal.id,
        title:
          'Отправляем запрос на доверенность',
        successTitle:
          'Запрос на доверенность отправлен',
        subtitle:
          supplierName.trim(),
        files: filesToUpload,

        run: async ({
          upload,
          setProgress,
        }) => {
          for (
            let index = 0;
            index < filesToUpload.length;
            index++
          ) {
            await upload(
              deal.id,
              filesToUpload[index],
              'POWER_OF_ATTORNEY_SOURCE_' +
              requestKey,
              index,
              filesToUpload.length,
            );
          }

          setProgress(95);
          await createTask(
            requestKey,
            withEtrn,
          );
          setProgress(99);
          await onChanged();
        },
      });
      resetForm();
      return;
    }


    setSaving(true);

    try {
      await createTask(
            requestKey,
            withEtrn,
          );
      resetForm();
      await onChanged();
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


  return (
    <div className="powerBox">

      <div className="powerHead">
        <div>
          <span>Документы</span>
          <strong>Доверенности</strong>
        </div>

        <b>{requests.length}</b>
      </div>


      {requests.length > 0 && (
        <div className="powerList">
          {requests.map(
            (task) => {
              const payload =
                task.payload || {};

              const details =
                ((task as any).details || {}) as
                  Record<string, unknown>;

              const resultNumber =
                String(
                  details.poaNumber || ''
                ).trim();

              const resultComment =
                String(
                  details.accountantComment ||
                  ''
                ).trim();

              const requestKey =
                String(
                  payload.requestKey || ''
                );

              const resultFiles =
                (deal.files || []).filter(
                  (file) =>
                    file.category ===
                    'POWER_OF_ATTORNEY_RESULT_' +
                    task.id
                );

              const sourceFiles =
                requestKey
                  ? (deal.files || []).filter(
                      (file) =>
                        file.category ===
                        'POWER_OF_ATTORNEY_SOURCE_' +
                        requestKey
                    )
                  : [];

              return (
                <div
                  className="powerCard"
                  key={task.id}
                >
                  <div className="powerCardHead">
                    <div>
                      <strong>
                        {String(
                          details.supplierOrFactory ||
                          payload.supplierName ||
                          'Доверенность'
                        )}
                      </strong>

                      <span>
                        На кого: {' '}
                        {String(
                          details.attorneyPerson ||
                            payload.recipientName ||
                            'не указано'
                        )}
                      </span>
                    </div>

                    <b className={
                      'powerStatus powerStatus-' +
                      task.status.toLowerCase()
                    }>
                      {taskStatusLabel(
                        task.status
                      )}
                    </b>
                  </div>


                  {(resultNumber || resultComment) && (
                    <div className="powerMeta">
                      {resultNumber && (
                        <span>
                          Доверенность №{resultNumber}
                        </span>
                      )}

                      {resultComment && (
                        <span>
                          Комментарий бухгалтера: {resultComment}
                        </span>
                      )}
                    </div>
                  )}


                  {resultFiles.length > 0 && (
                    <div className="powerFiles">
                      <span>
                        Готовая доверенность
                      </span>

                      {resultFiles.map(
                        (file) => (
                        <a
                          key={file.id}
                          href={dealFileUrl(
                            file.id
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {file.originalName}
                        </a>
                      ))}
                      {user.role !== 'ACCOUNTANT' && resultFiles.map((file) => (
                        <RecognitionAudit key={file.id} fileId={file.id} expectedNumber={resultNumber} />
                      ))}
                    </div>
                  )}


                  <TaskLibraryLinks taskIds={[task.id]} showRecognition={user.role !== 'ACCOUNTANT'} expectedNumber={resultNumber} />
                  {/* PART_V064_N1_V5B_READY_POA_ETRN */}
                  <PoaEtrnPanel
                    deal={deal}
                    user={user}
                    task={task}
                    onChanged={onChanged}
                  />


                  {sourceFiles.length > 0 &&
                    resultFiles.length === 0 && (
                    <div className="powerFiles powerSourceFiles">
                      <span>
                        Приложено к запросу
                      </span>

                      {sourceFiles.map(
                        (file) => (
                        <a
                          key={file.id}
                          href={dealFileUrl(
                            file.id
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {file.originalName}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}


      {user.role !== 'ACCOUNTANT' && (
        <button
          type="button"
          className={
            open
              ? 'secondary wide'
              : 'primary wide'
          }
          onClick={() =>
            setOpen(
              (value) => !value
            )
          }
        >
          {open
            ? 'Закрыть'
            : '+ Запросить доверенность'}
        </button>
      )}


      {open && (
        <div className="powerForm">

          <label className="field">
            <span>Поставщик / завод</span>
            <input
              list="power-suppliers"
              value={supplierName}
              onChange={(e) =>
                setSupplierName(
                  e.target.value
                )
              }
              placeholder="Например: ДЗГИ"
            />
            <datalist id="power-suppliers">
              {supplierOptions.map(
                (name) => (
                <option
                  key={name}
                  value={name}
                />
              ))}
            </datalist>
          </label>





          <label className="field">
            <span>На кого доверенность</span>
            <AutoTextarea
              rows={4}
              value={recipientName}
              onChange={(e) =>
                setRecipientName(
                  e.target.value
                )
              }
              placeholder="ФИО / данные получателя"
            />
          </label>





          <label className="field">
            <span>Что получаем</span>
            <AutoTextarea
              rows={4}
              value={goodsDescription}
              onChange={(e) =>
                setGoodsDescription(
                  e.target.value
                )
              }
              placeholder="Материал, объём, позиции"
            />
          </label>


          <label className="field">
            <span>Комментарий для бухгалтерии</span>
            <AutoTextarea
              rows={3}
              value={accountingComment}
              onChange={(e) =>
                setAccountingComment(
                  e.target.value
                )
              }
              placeholder="Что важно знать бухгалтерии"
            />
          </label>

          <label className="field">
            <span>Комментарий для себя</span>
            <AutoTextarea
              rows={3}
              value={managerComment}
              onChange={(e) =>
                setManagerComment(
                  e.target.value
                )
              }
              placeholder="Останется в сделке"
            />
          </label>


          <label className="field">
            <span>Документы к доверенности</span>
            <MultiFilePicker
              files={files}
              onChange={setFiles}
              title="+ Прикрепить документы"
            />
          </label>


          <label className="urgentToggle">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) =>
                setUrgent(
                  e.target.checked
                )
              }
            />
            <span>Срочно</span>
          </label>


          {/* PART_V064_N1_V5B_SUBMIT_BUTTONS */}
          <div className="powerSubmitActions">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() => {
                void submit(false);
              }}
            >
              Доверенность
            </button>

            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={() => {
                void submit(true);
              }}
            >
              Доверенность + ЭТРН
            </button>
          </div>
        </div>
      )}


      {error && (
        <div className="error">{error}</div>
      )}

    </div>
  );
}


export function PowerOfAttorneyTask({
  task,
  user,
  onBack,
}: {
  task: Task;
  user: CurrentUser;
  onBack: () => void;
}) {

  const [status, setStatus] =
    useState(task.status);

  const [files, setFiles] =
    useState<File[]>([]);
  const [msmPoaLibraryFile, setMsmPoaLibraryFile] = useState<LibrarySelection | null>(null);

  const [
    accountantComment,
    setAccountantComment,
  ] = useState('');

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const payload =
    task.payload || {};

  const details =
    ((task as any).details || {}) as
                  Record<string, unknown>;

  const supplierName =
    String(
      details.supplierOrFactory ||
      payload.supplierName ||
      ''
    );

  const recipientName =
    String(
      details.attorneyPerson ||
      payload.recipientName ||
      ''
    );

  const goodsDescription =
    String(
      details.items ||
      payload.goodsDescription ||
      ''
    );

  const editableDetails = {
    ...details,
    supplierOrFactory:
      details.supplierOrFactory ||
      payload.supplierName ||
      '',
    attorneyPerson:
      details.attorneyPerson ||
      payload.recipientName ||
      '',
    items:
      details.items ||
      payload.goodsDescription ||
      '',
  };

  const dealFiles =
    task.deal.files || [];

  const dealAny =
    task.deal as any;

  const invoiceRows =
    Array.isArray(dealAny.invoices)
      ? dealAny.invoices
      : [];

  const currentInvoice =
    invoiceRows.find(
      (invoice: any) =>
        invoice?.isCurrent
    ) ||
    invoiceRows[0];

  const currentCustomerInvoiceFile =
    dealFiles.find(
      (file) =>
        currentInvoice?.fileId &&
        file.id === currentInvoice.fileId
    ) ||
    [...dealFiles]
      .reverse()
      .find(
        (file) =>
          file.category ===
            'CUSTOMER_INVOICE_PRIMARY' ||
          file.category?.startsWith(
            'CORRECTION_PRIMARY_'
          )
      );

  const currentCustomerInvoiceNumber =
    String(
      currentInvoice?.number ||
      currentInvoice?.invoiceNumber ||
      currentInvoice?.invoiceNo ||
      ''
    ).trim();

  const purchases =
    Array.isArray(
      dealAny.supplierPurchases
    )
      ? dealAny.supplierPurchases
      : [];

  const matchingPurchase =
    [...purchases]
      .reverse()
      .find(
        (purchase: any) =>
          String(
            purchase?.supplierName || ''
          ).trim().toLowerCase() ===
          supplierName
            .trim()
            .toLowerCase()
      );

  const incomingInvoiceFile =
    dealFiles.find(
      (file) =>
        matchingPurchase?.sourceFileId &&
        file.id ===
          matchingPurchase.sourceFileId
    ) ||
    dealFiles.find(
      (file) =>
        matchingPurchase?.id &&
        file.category ===
          'SUPPLIER_INVOICE_' +
          matchingPurchase.id
    );

  const incomingInvoiceNumber =
    String(
      matchingPurchase
        ?.incomingInvoiceNumber ||
      ''
    ).trim();

  const taskAny =
    task as any;

  const returnReason =
    String(
      taskAny.returnReason ||
      taskAny.returnReasonCode ||
      taskAny.returnDetails?.reason ||
      taskAny.returnDetails?.reasonCode ||
      taskAny.payload?.returnReason ||
      ''
    ).trim();

  const returnComment =
    String(
      taskAny.returnComment ||
      taskAny.returnNote ||
      taskAny.returnDetails?.comment ||
      taskAny.payload?.returnComment ||
      ''
    ).trim();

  const requestKey =
    String(
      payload.requestKey || ''
    );

  const sourceFiles =
    (task.deal.files || [])
      .filter(
        (file) =>
          (
            requestKey &&
            file.category ===
              'POWER_OF_ATTORNEY_SOURCE_' +
              requestKey
          ) ||
          file.category ===
            'TASK_ATTACHMENT_' +
            task.id
      );

  // New files after a return are current; originals remain available in history.
  const revisedSourceFiles = sourceFiles.filter(
    (file) => file.category === 'TASK_ATTACHMENT_' + task.id,
  );
  const originalSourceFiles = sourceFiles.filter(
    (file) => file.category !== 'TASK_ATTACHMENT_' + task.id,
  );
  const poaCurrentDocs = [
    ...(currentCustomerInvoiceFile
      ? [{ file: currentCustomerInvoiceFile, description: 'Актуальный счёт заказчику' }]
      : []),
    ...(incomingInvoiceFile
      ? [{ file: incomingInvoiceFile, description: 'Входящий счёт поставщика' }]
      : []),
    ...(revisedSourceFiles.length ? revisedSourceFiles : originalSourceFiles).map(
      (file) => ({ file, description: revisedSourceFiles.length ? 'Приложено при исправлении' : 'Документ к доверенности' }),
    ),
  ];
  const poaHistoryDocs = revisedSourceFiles.length
    ? originalSourceFiles.map((file) => ({ file, description: 'Исходное вложение' }))
    : [];


  async function take() {
    setSaving(true);
    setError('');

    try {
      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id,
      );
      setStatus('IN_PROGRESS');
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


  function finish() {
    setError('');

    if (files.length === 0 && !msmPoaLibraryFile) {
      setError(
        'Прикрепите готовую доверенность.'
      );
      return;
    }

    const filesToUpload =
      [...files];
    const linkedPoaId = msmPoaLibraryFile?.id;

    setFiles([]);
    setMsmPoaLibraryFile(null);

    startBackgroundUploadJob({
      taskId: task.id,
      dealId: task.deal.id,
      title:
        'Загружаем доверенность',
      successTitle:
        'Доверенность готова',
      subtitle:
        String(
          payload.supplierName ||
          task.deal.clientName
        ),
      files: filesToUpload,

      run: async ({
        upload,
        setProgress,
      }) => {
        for (
          let index = 0;
          index < filesToUpload.length;
          index++
        ) {
          await upload(
            task.deal.id,
            filesToUpload[index],
            'POWER_OF_ATTORNEY_RESULT_' +
            task.id,
            index,
            filesToUpload.length,
          );
        }

        setProgress(95);
        if (linkedPoaId) {
          await linkLibraryFile(linkedPoaId, task.deal.id, task.id, user.id);
        }
        await completePowerOfAttorneyTask(
          task.id,
          {
            actorId: user.id,
            accountantComment:
              accountantComment
                .trim() ||
              undefined,
            libraryResultFileId: linkedPoaId,
          },
        );
        setProgress(99);
      },
    });

    onBack();
  }


  if (
    status === 'NEED_DATA' &&
    user.role !== 'ACCOUNTANT'
  ) {
    return (
      <section
      className="content form taskWorkspace taskWorkspace--unified"
      data-task-status={status}
    >
        <button
          className="backLink"
          onClick={onBack}
        >
          ← К задачам
        </button>

        <div className="detailHero">
          <div className="eyebrow">
            ЗК-{task.deal.internalNumber}
          </div>

          <h2>
            Исправить доверенность
          </h2>

          <p>
            {supplierName ||
              task.deal.clientName}
          </p>

          <div className="statusPill">
            Нужно исправить
          </div>
        </div>

      {/* PART_V064_L_POA_TASK_CONTEXT */}
      <TaskContextStrip task={task} />

      <TaskDataSection
        title="Данные для доверенности"
        subtitle="Кому выдаём, откуда получаем и какие документы используем"
        items={[
          { label: 'Поставщик / завод', value: supplierName || '—' },
          { label: 'На кого доверенность', value: recipientName || '—' },
          { label: 'Что получаем', value: goodsDescription || '—', wide: true },
          ...(currentCustomerInvoiceNumber
            ? [{ label: 'Счёт заказчику', value: currentCustomerInvoiceNumber }]
            : []),
          ...(incomingInvoiceNumber
            ? [{ label: 'Входящий счёт', value: incomingInvoiceNumber }]
            : []),
          ...(task.description
            ? [{ label: 'Комментарий для бухгалтерии', value: task.description, wide: true }]
            : []),
        ]}
      />

        {(returnReason ||
          returnComment) && (
          <div className="taskReturnNotice">
            <strong>
              Возвращено бухгалтерией
            </strong>

            {returnReason && (
              <span>
                Причина: {returnReason}
              </span>
            )}

            {returnComment && (
              <p>
                Комментарий бухгалтера:
                {' '}
                {returnComment}
              </p>
            )}
          </div>
        )}

        {(poaCurrentDocs.length > 0 || poaHistoryDocs.length > 0) && (
          <TaskDocuments
            title="Документы доверенности"
            subtitle="Актуальные файлы и вложения до исправления"
            current={poaCurrentDocs}
            history={poaHistoryDocs}
          />
        )}

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
            editableDetails
          }
          onResubmitted={onBack}
        />
      </section>
    );
  }


  return (
    <section className="content form taskWorkspace taskWorkspace--unified" data-task-status={status}>

      <button
        className="backLink"
        onClick={onBack}
      >
        ← К задачам
      </button>


      <div className="detailHero">
        <div className="eyebrow">
          ЗК-{task.deal.internalNumber}
        </div>

        <h2>Сделать доверенность</h2>

        <p>
          {String(
            payload.supplierName ||
            task.deal.clientName
          )}
        </p>

        <div className="statusPill">
          {taskStatusLabel(status)}
        </div>

        {task.urgent && (
          <b className="urgent">
            СРОЧНО
          </b>
        )}
      </div>


      <TaskContextStrip task={task} />

      <TaskDataSection
        title="Данные для доверенности"
        subtitle="Кому выдаём, откуда получаем и какие документы используем"
        items={[
          { label: 'Поставщик / завод', value: supplierName || '—' },
          { label: 'На кого доверенность', value: recipientName || '—' },
          { label: 'Что получаем', value: goodsDescription || '—', wide: true },
          ...(currentCustomerInvoiceNumber
            ? [{ label: 'Счёт заказчику', value: currentCustomerInvoiceNumber }]
            : []),
          ...(incomingInvoiceNumber
            ? [{ label: 'Входящий счёт', value: incomingInvoiceNumber }]
            : []),
          ...(task.description
            ? [{ label: 'Комментарий для бухгалтерии', value: task.description, wide: true }]
            : []),
        ]}
      />

      {(poaCurrentDocs.length > 0 || poaHistoryDocs.length > 0) && (
        <TaskDocuments
          title="Документы доверенности"
          subtitle="Счета и приложенные документы"
          current={poaCurrentDocs}
          history={poaHistoryDocs}
        />
      )}

      {status === 'NEW' && (
        <div className="taskUnifiedStartActions">
          {user.role === 'ACCOUNTANT' && (
            <ReturnToManagerPanel
              taskId={task.id}
              actorId={user.id}
              disabled={saving}
              onReturned={onBack}
            />
          )}
          <button type="button" className="primary wide" disabled={saving} onClick={take}>
            {saving ? 'Сохраняем…' : 'В работу'}
          </button>
        </div>
      )}
      {user.role === 'ACCOUNTANT' && status === 'IN_PROGRESS' && (
        <div className="taskUnifiedSingleAction">
          <ReturnToManagerPanel
            taskId={task.id}
            actorId={user.id}
            disabled={saving}
            onReturned={onBack}
          />
        </div>
      )}

      {status === 'IN_PROGRESS' && (
        <TaskWorkSection
          title="Оформление доверенности"
          description="Приложите готовую доверенность. Номер извлечём автоматически, менеджер проверит результат."
        >

          {/* MSM_UPLOAD_V7_POA */}
          <div className="field msmDocumentField">
            <span>Готовая доверенность</span>
            <div className="msmDocumentPair">
              <AccountantDocumentPicker files={files} onChange={next => { setFiles(next); if (next.length) setMsmPoaLibraryFile(null); }} />
              <div className="msmTaskLibrarySelection"><LibraryFileChooser value={msmPoaLibraryFile} onSelect={item => { setMsmPoaLibraryFile(item); if (item) setFiles([]); }}
                allowedExtensions={['pdf','jpg','jpeg','png','webp']} /></div>
            </div>
            <small className="msmTaskLibraryHint">Если документ уже в библиотеке, выбирайте его без повторной загрузки.</small>
          </div>

          <label className="field">
            <span>
              Комментарий бухгалтера
            </span>
            <AutoTextarea
              rows={3}
              value={accountantComment}
              disabled={saving}
              onChange={(event) =>
                setAccountantComment(
                  event.target.value
                )
              }
              placeholder="Необязательно"
            />
          </label>

          <button
            type="button"
            className="primary wide"
            disabled={saving}
            onClick={finish}
          >
            Доверенность готова
          </button>
        </TaskWorkSection>
      )}


      {error && (
        <div className="error">{error}</div>
      )}

    </section>
  );
}
