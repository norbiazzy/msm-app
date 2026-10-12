import { TaskContextStrip } from './TaskContextStrip';
import { TaskDataSection } from './TaskDataSection';
import { TaskWorkSection } from './TaskWorkSection';
/* MSM_STEP31_ACCOUNTANT_WORK_FORMS */
/* MSM_STEP29_UNIFIED_TASK_LAYOUT */
import { TaskDocuments } from './TaskDocuments';
/* MSM_STEP28_SUPPLIER_PAYMENT_DOCUMENTS */
import {
  startBackgroundUploadJob,
} from './backgroundUploads';

import {
  useEffect,
  useState,
} from 'react';

import {
  addSupplierPayment,
  cancelSupplierPurchase,
  markSupplierPaymentStamped,
  createSupplierPurchase,
  dealFileUrl,
  listSupplierPurchases,
  requestSupplierPayment,
  requestSupplierStampedPayment,
  requestSupplierBalanceCorrection,
  completeSupplierBalanceCorrection,
  updateSupplierPurchase,
  updateTaskStatus,
  type Task,
} from './api';

import type {
  CurrentUser,
  Deal,
  SupplierPurchase,
} from './types';

import {
  MultiFilePicker,
  SingleFilePicker,
} from './MultiFilePicker';

import {
  ReturnToManagerPanel,
} from './ReturnToManagerPanel';

import {
  SupplierPaymentManagerEdit,
} from './SupplierPaymentManagerEdit';


function money(
  value?: string | number,
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '—';
  }


  return (
    Number(value)
      .toLocaleString(
        'ru-RU'
      ) +
    ' ₽'
  );
}


function parseMoney(
  value: string,
) {

  const normalized =
    value
      .replace(/\s+/g, '')
      .replace(',', '.');


  if (!normalized) {
    return undefined;
  }


  const parsed =
    Number(normalized);


  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}


function formatMoneyInput(
  value: string,
) {

  const normalized =
    value
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');

  if (!normalized) {
    return '';
  }

  const firstDot =
    normalized.indexOf('.');

  const integerPart =
    (
      firstDot >= 0
        ? normalized.slice(0, firstDot)
        : normalized
    ) || '0';

  const decimalPart =
    firstDot >= 0
      ? normalized
          .slice(firstDot + 1)
          .replace(/\./g, '')
          .slice(0, 2)
      : null;

  const formattedInteger =
    integerPart
      .replace(/^0+(?=\d)/, '')
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ' '
      );

  return decimalPart !== null
    ? formattedInteger + ',' + decimalPart
    : formattedInteger;
}


function todayLocalDate() {

  const now =
    new Date();


  const local =
    new Date(

      now.getTime() -

      now.getTimezoneOffset() *
        60000
    );


  return local
    .toISOString()
    .slice(0, 10);
}


// ======================================================
// BLOCK IN DEAL
// ======================================================

export function PurchasesBlock({
  deal,
  user,
  onChanged,
}: {
  deal: Deal;
  user: CurrentUser;
  onChanged:
    () =>
      void |
      Promise<void>;
}) {

  const [
    purchases,
    setPurchases,
  ] = useState<
    SupplierPurchase[]
  >([]);


  const [adding, setAdding] =
    useState(false);

  const [
    supplierName,
    setSupplierName,
  ] = useState('');

  const [
    invoiceAmount,
    setInvoiceAmount,
  ] = useState('');

  const [comment, setComment] =
    useState('');

  const [files, setFiles] =
    useState<File[]>([]);

  const [
    newIncomingFile,
    setNewIncomingFile,
  ] = useState<File | null>(null);

  const [
    selectedExistingFileId,
    setSelectedExistingFileId,
  ] = useState('');

  const [urgent, setUrgent] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  const canManage =
    user.role !==
    'ACCOUNTANT';


  const customerIncomingFiles =
    (
      deal.files || []
    )
      .filter(
        (file) =>
          file.category ===
            'CUSTOMER_INVOICE_PRIMARY' ||
          file.category
            ?.startsWith(
              'CORRECTION_PRIMARY_'
            )
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const defaultIncomingFileId =
    customerIncomingFiles[
      customerIncomingFiles.length - 1
    ]?.id || '';


  const selectedExistingFile =
    customerIncomingFiles.find(
      (file) =>
        file.id ===
        selectedExistingFileId
    );


  async function reload() {

    setPurchases(
      await listSupplierPurchases(
        deal.id
      )
    );
  }


  useEffect(() => {

    void reload();

  }, [
    deal.id,
  ]);


  useEffect(() => {
    setSelectedExistingFileId(
      defaultIncomingFileId
    );
  }, [
    deal.id,
    defaultIncomingFileId,
  ]);


  async function refreshAll() {

    await reload();
    await onChanged();
  }


  function resetForm() {

    setSupplierName('');
    setInvoiceAmount('');
    setComment('');
    setFiles([]);
    setNewIncomingFile(null);
    setSelectedExistingFileId(
      defaultIncomingFileId
    );
    setUrgent(false);
    setAdding(false);
  }


  async function submit(
    mode:
      'SAVE' |
      'PAY',
  ) {

    const supplier =
      supplierName.trim();


    const amount =
      parseMoney(
        invoiceAmount
      );


    if (!supplier) {

      setError(
        'Укажите поставщика.'
      );

      return;
    }


    if (
      amount === undefined
    ) {

      setError(
        'Укажите сумму закупки.'
      );

      return;
    }


    setSaving(true);
    setError('');


    try {

      const purchase =
        await createSupplierPurchase(
          deal.id,
          {

            supplierName:
              supplier,

            incomingInvoiceAmount:
              amount,

            comment:
              comment.trim() ||
              undefined,

            sourceFileId:
              newIncomingFile
                ? undefined
                : selectedExistingFileId ||
                  undefined,

            createdById:
              user.id,
          }
        );


      const mainFileToUpload =
        newIncomingFile;


      const extraFilesToUpload =
        [...files];


      const filesToUpload = [
        ...(mainFileToUpload
          ? [mainFileToUpload]
          : []),
        ...extraFilesToUpload,
      ];


      const commentToSend =
        comment.trim() ||
        undefined;


      const urgentToSend =
        urgent;


      resetForm();


      if (
        filesToUpload.length > 0 ||
        mode === 'PAY'
      ) {

        startBackgroundUploadJob({

        // PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS
        dealId:
          deal.id,

          title:
            mode === 'PAY'
              ? 'Передаём оплату бухгалтерии'
              : 'Сохраняем документы закупки',

          subtitle:
            supplier,

          files:
            filesToUpload,


          run:
            async ({
              upload,
              setProgress,
            }) => {

              let uploadIndex = 0;


              if (mainFileToUpload) {

                await upload(
                  deal.id,
                  mainFileToUpload,
                  'SUPPLIER_INVOICE_' +
                  purchase.id,
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              for (
                const extraFile of
                  extraFilesToUpload
              ) {

                await upload(
                  deal.id,
                  extraFile,
                  'SUPPLIER_ATTACHMENT_' +
                  purchase.id,
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              if (
                mode === 'PAY'
              ) {

                setProgress(94);


                await requestSupplierPayment(
                  deal.id,
                  purchase.id,
                  {

                    amount,

                    comment:
                      commentToSend,

                    urgent:
                      urgentToSend,

                    actorId:
                      user.id,
                  }
                );
              }


              setProgress(99);

              await refreshAll();
            },
        });


        await reload();
        await onChanged();

      } else {

        await refreshAll();
      }


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


  const showForm =
    canManage &&
    (
      purchases.length === 0 ||
      adding
    );


  return (

    <div className="purchaseBox purchaseBoxSimple">

      <div className="purchaseHead">

        <div>

          {/* PART_V064_O1_INCOMING_TITLE */}
          <span>
            Входящие счета
          </span>

          <strong>
            Поставщики
          </strong>

        </div>


        <b>
          {purchases.length}
        </b>

      </div>


      {showForm && (

        <div className="purchaseQuickForm">

          <div className="purchaseQuickMain">

            <label className="field">

              <span>
                Поставщик
              </span>

              <input
                value={
                  supplierName
                }

                onChange={(e) =>
                  setSupplierName(
                    e.target.value
                  )
                }

                placeholder="Например: Bonolit"
              />

            </label>


            <label className="field">

              <span>
                Сумма
              </span>

              <input
                inputMode="decimal"

                value={
                  invoiceAmount
                }

                onChange={(e) =>
                  setInvoiceAmount(
                    formatMoneyInput(
                      e.target.value
                    )
                  )
                }

                placeholder="215 000"
              />

            </label>

          </div>


          <div className="field purchaseExistingInvoiceField">

            <span>
              Основной входящий счёт
            </span>


            {customerIncomingFiles.length > 0 && (

              <select
                value={selectedExistingFileId}
                onChange={(e) => {
                  setSelectedExistingFileId(
                    e.target.value
                  );

                  if (e.target.value) {
                    setNewIncomingFile(null);
                  }
                }}
              >
                <option value="">
                  Не выбран
                </option>

                {[...customerIncomingFiles]
                  .reverse()
                  .map(
                    (file, index) => (
                    <option
                      key={file.id}
                      value={file.id}
                    >
                      {index === 0 ? 'Актуальный · ' : ''}
                      {file.originalName}
                    </option>
                  ))}
              </select>

            )}


            {selectedExistingFile &&
              !newIncomingFile && (

              <div className="purchaseSelectedInvoice">
                <div>
                  <b>
                    {selectedExistingFile.originalName}
                  </b>
                  <span>
                    Этот счёт будет привязан к поставщику
                  </span>
                </div>

                <a
                  href={
                    dealFileUrl(
                      selectedExistingFile.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>
              </div>

            )}


            <SingleFilePicker
              file={newIncomingFile}
              onChange={(file) => {
                setNewIncomingFile(file);

                if (file) {
                  setSelectedExistingFileId('');
                }
              }}
              title={
                selectedExistingFile
                  ? '+ Заменить другим входящим счётом'
                  : '+ Прикрепить входящий счёт'
              }
              accept="application/pdf,image/*"
            />

          </div>


          <label className="field purchaseFileField">

            <span>
              Дополнительные документы
            </span>

            <MultiFilePicker
              files={files}
              onChange={setFiles}
              title="+ Прикрепить документы"
            />

          </label>



          <label className="field">

            <span>
              Комментарий
              <small>
                необязательно
              </small>
            </span>

            <textarea
              rows={2}

              value={comment}

              onChange={(e) =>
                setComment(
                  e.target.value
                )
              }

              placeholder="Например: ДЗГИ, можно не оплачивать сразу"
            />

          </label>


          <label className="urgentToggle purchaseUrgent">

            <input
              type="checkbox"

              checked={urgent}

              onChange={(e) =>
                setUrgent(
                  e.target.checked
                )
              }
            />

            <span>
              Срочно
            </span>

          </label>


          <div className="purchaseQuickActions">

            {
              purchases.length > 0 && (

              <button
                type="button"
                className="secondary"

                disabled={saving}

                onClick={() => {

                  resetForm();
                }}
              >
                Отмена
              </button>

            )}


            <button
              type="button"
              className="secondary"

              disabled={saving}

              onClick={() =>
                void submit(
                  'SAVE'
                )
              }
            >
              Сохранить
            </button>


            <button
              type="button"
              className="primary"

              disabled={saving}

              onClick={() =>
                void submit(
                  'PAY'
                )
              }
            >
              {
                saving
                  ? 'Отправляем…'
                  : 'Отправить в оплату'
              }
            </button>

          </div>

        </div>

      )}


      {purchases.length > 0 && (

        <div className="purchaseList">

          {purchases.map(
            (purchase) => (

            <PurchaseCard
              key={purchase.id}
              deal={deal}
              purchase={purchase}
              user={user}
              canManage={canManage}
              onChanged={refreshAll}
            />

          ))}

        </div>

      )}


      {canManage &&
        purchases.length > 0 &&
        !adding && (

        <button
          type="button"
          className="purchaseAddAnother"

          onClick={() =>
            setAdding(true)
          }
        >
          + Добавить ещё поставщика
        </button>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </div>
  );
}


// ======================================================
// PURCHASE CARD
// ======================================================

function PurchaseCard({
  deal,
  purchase,
  user,
  canManage,
  onChanged,
}: {
  deal: Deal;
  purchase: SupplierPurchase;
  user: CurrentUser;
  canManage: boolean;
  onChanged:
    () =>
      void |
      Promise<void>;
}) {

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    invoiceEditOpen,
    setInvoiceEditOpen,
  ] = useState(false);

  const [
    selectedSourceFileId,
    setSelectedSourceFileId,
  ] = useState('');

  const [
    replacementInvoiceFile,
    setReplacementInvoiceFile,
  ] = useState<File | null>(null);

  const [
    cancelConfirmOpen,
    setCancelConfirmOpen,
  ] = useState(false);

  const [
    balanceCorrectionOpen,
    setBalanceCorrectionOpen,
  ] = useState(false);

  const [
    balanceCorrectionAmount,
    setBalanceCorrectionAmount,
  ] = useState('');

  const [
    balanceCorrectionComment,
    setBalanceCorrectionComment,
  ] = useState('');


  const paid =
    purchase.payments
      .reduce(
        (
          sum,
          payment,
        ) =>
          sum +
          Number(
            payment.amount
          ),
        0,
      );


  const purchaseFiles =
    (
      deal.files || []
    )
      .filter(
        (file) =>
          (
          file.category ===
            'SUPPLIER_INVOICE_' +
            purchase.id ||
          file.category ===
            'SUPPLIER_DOCUMENT_' +
            purchase.id
        )
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const currentPurchaseInvoice =
    purchaseFiles[
      purchaseFiles.length - 1
    ];


  const previousPurchaseInvoices =
    purchaseFiles.slice(
      0,
      -1,
    );


  const purchaseAttachments =
    (
      deal.files || []
    ).filter(
      (file) =>
        file.category ===
        'SUPPLIER_ATTACHMENT_' +
        purchase.id
    );


  const paymentFiles =
    (deal.files || []).filter(
      (file) =>
        file.category ===
        'SUPPLIER_PAYMENT_' +
        purchase.id
    );


  const paymentIds =
    new Set(
      purchase.payments.map(
        (payment) => payment.id
      )
    );


  const stampedPaymentFiles =
    (deal.files || []).filter(
      (file) => {
        const prefix =
          'SUPPLIER_PAYMENT_STAMP_';

        if (
          !file.category?.startsWith(
            prefix
          )
        ) {
          return false;
        }

        return paymentIds.has(
          file.category.slice(
            prefix.length
          )
        );
      }
    );


  const paymentTarget =
    purchase.requestedAmount
      ? Number(purchase.requestedAmount)
      : purchase.incomingInvoiceAmount
        ? Number(purchase.incomingInvoiceAmount)
        : null;


  const financiallyPaid =
    paymentTarget === null
      ? paid > 0
      : paid >= paymentTarget;


  const needsStampedDocument =
    financiallyPaid &&
    purchase.payments.some(
      (payment) =>
        !payment.paymentOrderStamped &&
        !payment.paidFromBalance
    );


  const paidOnlyFromBalance =
    purchase.payments.length > 0 &&
    purchase.payments.every(
      (payment) =>
        payment.paidFromBalance
    );


  const balancePayment =
    [...purchase.payments]
      .reverse()
      .find(
        (payment) =>
          payment.paidFromBalance
      );


  const activeBalanceCorrection =
    (purchase.tasks || []).find(
      (task) =>
        task.type === 'OTHER' &&
        task.payload?.kind ===
          'SUPPLIER_BALANCE_CORRECTION' &&
        !['DONE', 'CANCELLED'].includes(
          task.status
        )
    );


  const activeStampRequest =
    (purchase.tasks || []).some(
      (task) =>
        task.type === 'PAY_SUPPLIER' &&
        ![
          'DONE',
          'CANCELLED',
        ].includes(task.status)
    );


  const paymentDocumentStatus =
    paidOnlyFromBalance
      ? 'Оплачено с остатка'
      : needsStampedDocument
        ? 'Платёжка без печати'
        : purchase.payments.length > 0
          ? 'Платёжка с печатью'
          : '';


  const dealIncomingFiles =
    (
      deal.files || []
    )
      .filter(
        (file) =>
          file.category ===
            'CUSTOMER_INVOICE_PRIMARY' ||
          file.category
            ?.startsWith(
              'CORRECTION_PRIMARY_'
            )
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const activePaymentRequest =
    (purchase.tasks || []).some(
      (task) =>
        task.type === 'PAY_SUPPLIER' &&
        !['DONE', 'CANCELLED'].includes(
          task.status
        )
    );


  const supplierInvoiceStatus =
    !currentPurchaseInvoice
      ? 'Нет входящего'
      : financiallyPaid
        ? 'Входящий оплачен'
        : (
            purchase.status ===
              'PAYMENT_REQUESTED' ||
            activePaymentRequest
          )
          ? 'Входящий на оплате'
          : 'Входящий не оплачен';


  function openInvoiceEditor() {

    setSelectedSourceFileId('');
    setReplacementInvoiceFile(null);
    setInvoiceEditOpen(true);
  }


  async function savePurchaseInvoice() {

    setError('');


    if (replacementInvoiceFile) {

      const fileToUpload =
        replacementInvoiceFile;


      setInvoiceEditOpen(false);
      setReplacementInvoiceFile(null);


      startBackgroundUploadJob({

        // PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS
        dealId:
          deal.id,

        title:
          'Обновляем входящий счёт',

        subtitle:
          purchase.supplierName,

        files: [fileToUpload],

        run:
          async ({
            upload,
            setProgress,
          }) => {

            await upload(
              deal.id,
              fileToUpload,
              'SUPPLIER_INVOICE_' +
              purchase.id,
              0,
              1,
            );

            setProgress(99);
            await onChanged();
          },
      });

      return;
    }


    if (!selectedSourceFileId) {
      setError(
        'Выберите входящий счёт или прикрепите новый.'
      );
      return;
    }


    setSaving(true);


    try {

      await updateSupplierPurchase(
        deal.id,
        purchase.id,
        {
          sourceFileId:
            selectedSourceFileId,
          actorId:
            user.id,
        },
      );


      setInvoiceEditOpen(false);
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



  async function requestStampedDocument() {

    setSaving(true);
    setError('');


    try {

      await requestSupplierStampedPayment(
        deal.id,
        purchase.id,
        user.id,
      );


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


  async function requestBalanceCorrection() {

    const actualAmount =
      parseMoney(
        balanceCorrectionAmount
      );


    if (
      actualAmount === undefined
    ) {
      setError(
        'Укажите фактическую сумму списания с остатка.'
      );
      return;
    }


    setSaving(true);
    setError('');


    try {

      await requestSupplierBalanceCorrection(
        deal.id,
        purchase.id,
        {
          actualAmount,
          comment:
            balanceCorrectionComment
              .trim() ||
            undefined,
          actorId:
            user.id,
        },
      );


      setBalanceCorrectionOpen(false);
      setBalanceCorrectionAmount('');
      setBalanceCorrectionComment('');

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


  async function cancelPurchase() {

    setSaving(true);
    setError('');


    try {

      await cancelSupplierPurchase(
        deal.id,
        purchase.id,
      );


      setCancelConfirmOpen(
        false
      );


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


  function requestPayment() {

    setError('');


    const targetAmount =
      purchase.requestedAmount
        ? Number(
            purchase.requestedAmount
          )
        : purchase.incomingInvoiceAmount
          ? Number(
              purchase.incomingInvoiceAmount
            )
          : undefined;


    const amount =
      targetAmount === undefined
        ? undefined
        : Math.max(
            targetAmount - paid,
            0
          );


    if (
      amount === undefined ||
      !Number.isFinite(amount)
    ) {

      setError(
        'Для отправки в оплату укажите сумму закупки.'
      );

      return;
    }


    startBackgroundUploadJob({

        // PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS
        dealId:
          deal.id,

      title:
        'Передаём оплату бухгалтерии',

      subtitle:
        purchase.supplierName,

      files: [],


      run:
        async ({
          setProgress,
        }) => {

          setProgress(70);


          await requestSupplierPayment(
            deal.id,
            purchase.id,
            {

              amount,

              comment:
                purchase.comment ||
                undefined,

              urgent:
                false,

              actorId:
                user.id,
            }
          );


          setProgress(99);

          await onChanged();
        },
    });
  }


  return (

    <div className="purchaseCard purchaseCardCompact">

      <div className="purchaseCardTop">

        <div>

          <strong>
            {purchase.supplierName}
          </strong>

          <b className="purchaseAmountMain">
            {
              money(
                purchase
                  .incomingInvoiceAmount
              )
            }
          </b>

        </div>


        <span
          className={
            'purchaseStatus ' +
            'purchaseStatus-' +
            purchase.status
              .toLowerCase()
          }
        >

          {supplierInvoiceStatus}

        </span>

      </div>


      {purchase.comment && (

        <div className="purchaseComment">
          {purchase.comment}
        </div>

      )}


      <div className="purchaseInvoiceCurrent">

        <div className="purchaseInvoiceCurrentHead">
          <span>Входящий счёт</span>

          {canManage &&
            purchase.status !== 'PAID' && (
            <button
              type="button"
              className="purchaseInvoiceEditButton"
              onClick={() =>
                invoiceEditOpen
                  ? setInvoiceEditOpen(false)
                  : openInvoiceEditor()
              }
            >
              {invoiceEditOpen ? 'Закрыть' : 'Изменить'}
            </button>
          )}
        </div>


        {currentPurchaseInvoice ? (

          <div className="purchaseSelectedInvoice purchaseSelectedInvoiceCurrent">
            <div>
              <b>
                {currentPurchaseInvoice.originalName}
              </b>
              <span>
                Текущий счёт
                {previousPurchaseInvoices.length > 0
                  ? ' · ранее ' +
                    previousPurchaseInvoices.length
                  : ''}
              </span>
            </div>

            <a
              href={
                dealFileUrl(
                  currentPurchaseInvoice.id
                )
              }
              target="_blank"
              rel="noreferrer"
            >
              Открыть
            </a>
          </div>

        ) : (

          <div className="purchaseInvoiceMissing">
            Входящий счёт не выбран
          </div>

        )}

      </div>


      {invoiceEditOpen && (

        <div className="purchaseInvoiceEditor">

          {(
            purchase.status ===
              'PAYMENT_REQUESTED' ||
            purchase.status ===
              'PARTIALLY_PAID'
          ) && (
            <div className="purchaseInvoiceWarning">
              Оплата уже передана бухгалтерии. Новый файл сразу появится в закупке, но задача на оплату останется активной.
            </div>
          )}


          {dealIncomingFiles.length > 0 && (

            <label className="field">
              <span>Выбрать из входящих сделки</span>

              <select
                value={selectedSourceFileId}
                onChange={(e) => {
                  setSelectedSourceFileId(
                    e.target.value
                  );

                  if (e.target.value) {
                    setReplacementInvoiceFile(null);
                  }
                }}
              >
                <option value="">
                  Не выбран
                </option>

                {[...dealIncomingFiles]
                  .reverse()
                  .map(
                    (file, index) => (
                    <option
                      key={file.id}
                      value={file.id}
                    >
                      {index === 0 ? 'Актуальный · ' : ''}
                      {file.originalName}
                    </option>
                  ))}
              </select>
            </label>

          )}


          <label className="field">
            <span>Или прикрепить другой счёт</span>

            <SingleFilePicker
              file={replacementInvoiceFile}
              onChange={(file) => {
                setReplacementInvoiceFile(file);

                if (file) {
                  setSelectedSourceFileId('');
                }
              }}
              title="+ Прикрепить новый входящий счёт"
              accept="application/pdf,image/*"
            />
          </label>


          <div className="purchaseInvoiceEditorActions">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() => {
                setInvoiceEditOpen(false);
                setReplacementInvoiceFile(null);
              }}
            >
              Отмена
            </button>

            <button
              type="button"
              className="primary"
              disabled={
                saving ||
                (!selectedSourceFileId &&
                  !replacementInvoiceFile)
              }
              onClick={savePurchaseInvoice}
            >
              {saving ? 'Сохраняем…' : 'Сохранить счёт'}
            </button>
          </div>

        </div>

      )}


      {purchaseAttachments.length > 0 && (

        <div className="purchaseFiles purchaseFilesCompact">
          <span>Дополнительные документы</span>

          {purchaseAttachments.map(
            (file) => (
            <a
              key={file.id}
              href={dealFileUrl(file.id)}
              target="_blank"
              rel="noreferrer"
            >
              {file.originalName}
            </a>
          ))}
        </div>

      )}



      {paid > 0 && (

        <div className="purchasePaidMini">

          <span>
            Оплачено
          </span>

          <b>
            {money(paid)}
          </b>

        </div>

      )}


      {purchase.payments.length > 0 && (

        <div className="purchasePaymentDocuments">

          <div className="purchasePaymentDocumentsHead">
            <div>
              <span>Документы оплаты</span>
              <b>{paymentDocumentStatus}</b>
            </div>

            {needsStampedDocument &&
              canManage && (
              <button
                type="button"
                className="secondary compactButton"
                disabled={
                  saving ||
                  activeStampRequest
                }
                onClick={requestStampedDocument}
              >
                {
                  activeStampRequest
                    ? 'Запрос с печатью отправлен'
                    : 'Запросить с печатью'
                }
              </button>
            )}
          </div>


          {!paidOnlyFromBalance && (
            <div className="purchasePaymentFileList">

              {paymentFiles.length === 0 &&
                stampedPaymentFiles.length === 0 && (
                <span className="purchasePaymentFileMissing">
                  Файл платёжки не приложен
                </span>
              )}


              {paymentFiles.map(
                (file) => (
                <a
                  key={file.id}
                  href={dealFileUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.originalName}
                </a>
              ))}


              {stampedPaymentFiles.map(
                (file) => (
                <a
                  key={file.id}
                  href={dealFileUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {file.originalName} · с печатью
                </a>
              ))}

            </div>
          )}

        </div>

      )}


      {canManage &&
        purchase.status === 'PAID' &&
        balancePayment && (

        <div className="balanceCorrectionBlock">

          <div className="balanceCorrectionHead">
            <div>
              <span>Оплата с остатка</span>
              <b>
                {money(balancePayment.amount)}
              </b>
            </div>

            <button
              type="button"
              className="secondary compactButton"
              disabled={
                saving ||
                Boolean(activeBalanceCorrection)
              }
              onClick={() => {
                setBalanceCorrectionOpen(
                  (value) => !value
                );

                setBalanceCorrectionAmount(
                  formatMoneyInput(
                    String(balancePayment.amount)
                  )
                );
              }}
            >
              {activeBalanceCorrection
                ? 'Корректировка отправлена'
                : balanceCorrectionOpen
                  ? 'Закрыть'
                  : 'Скорректировать'}
            </button>
          </div>


          {balanceCorrectionOpen &&
            !activeBalanceCorrection && (

            <div className="balanceCorrectionForm">

              <label className="field">
                <span>
                  По факту списали с остатка
                </span>

                <input
                  inputMode="decimal"
                  value={balanceCorrectionAmount}
                  onChange={(e) =>
                    setBalanceCorrectionAmount(
                      formatMoneyInput(
                        e.target.value
                      )
                    )
                  }
                  placeholder="Например: 95 000"
                />
              </label>


              <label className="field">
                <span>Комментарий бухгалтерии</span>

                <textarea
                  rows={2}
                  value={balanceCorrectionComment}
                  onChange={(e) =>
                    setBalanceCorrectionComment(
                      e.target.value
                    )
                  }
                  placeholder="Например: завод списал по факту меньше"
                />
              </label>


              <button
                type="button"
                className="primary wide"
                disabled={saving}
                onClick={requestBalanceCorrection}
              >
                {saving
                  ? 'Отправляем…'
                  : 'Отправить бухгалтерии'}
              </button>

            </div>

          )}

        </div>

      )}


      {canManage &&
        (
          purchase.status === 'DRAFT' ||
          (
            purchase.status === 'PARTIALLY_PAID' &&
            !activePaymentRequest
          )
        ) && (

        <div className="purchaseCardActions">

          <button
            type="button"
            className="primary"

            onClick={
              requestPayment
            }
          >
            {purchase.status === 'PARTIALLY_PAID'
              ? 'Отправить остаток в оплату'
              : 'Отправить в оплату'}
          </button>


          <button
            type="button"
            className="purchaseDeleteMini"

            onClick={() =>
              setCancelConfirmOpen(
                true
              )
            }
          >
            Удалить
          </button>

        </div>

      )}


      {canManage &&
        purchase.status ===
          'PAYMENT_REQUESTED' && (

        <button
          type="button"
          className="purchaseCancelButton purchaseCancelCompact"

          disabled={saving}

          onClick={() =>
            setCancelConfirmOpen(
              true
            )
          }
        >
          Отменить запрос оплаты
        </button>

      )}


      {cancelConfirmOpen && (

        <div
          className="appModalBackdrop"

          onClick={() =>
            setCancelConfirmOpen(
              false
            )
          }
        >

          <div
            className="appModal"

            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <strong>

              {
                purchase.status ===
                  'PAYMENT_REQUESTED'

                  ? 'Отменить запрос оплаты?'
                  : 'Удалить закупку?'
              }

            </strong>


            <p>

              {
                purchase.status ===
                  'PAYMENT_REQUESTED'

                  ? 'Если бухгалтер ещё не взял задачу в работу, запрос и закупка будут удалены.'

                  : 'Закупка ещё не передана бухгалтерии и будет удалена без записи в историю.'
              }

            </p>


            <div className="appModalActions">

              <button
                type="button"
                className="secondary"

                disabled={saving}

                onClick={() =>
                  setCancelConfirmOpen(
                    false
                  )
                }
              >
                Не удалять
              </button>


              <button
                type="button"
                className="dangerButton"

                disabled={saving}

                onClick={
                  cancelPurchase
                }
              >

                {
                  saving
                    ? 'Удаляем…'
                    : purchase.status ===
                        'PAYMENT_REQUESTED'
                      ? 'Отменить запрос'
                      : 'Удалить'
                }

              </button>

            </div>

          </div>

        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </div>
  );
}


// ======================================================
// BALANCE CORRECTION TASK
// ======================================================

export function SupplierBalanceCorrectionTask({
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

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const payload =
    task.payload || {};

  const oldAmount =
    Number(payload.oldAmount || 0);

  const requestedAmount =
    Number(payload.requestedAmount || 0);

  const supplierName =
    String(
      payload.supplierName ||
      task.supplierPurchase?.supplierName ||
      'Поставщик'
    );


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


  async function complete() {
    setSaving(true);
    setError('');

    try {
      await completeSupplierBalanceCorrection(
        task.id,
        user.id,
      );
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


  return (
    <section
      className="content form taskWorkspace"
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
          Скорректировать оплату с остатка
        </h2>

        <p>{supplierName}</p>

        <div className="statusPill">
          {status === 'NEW'
            ? 'Новая'
            : status === 'IN_PROGRESS'
              ? 'В работе'
              : status}
        </div>
      </div>

      {/* PART_V064_L_BALANCE_TASK_CONTEXT */}
      <TaskContextStrip task={task} />


      <div className="balanceCorrectionTaskSummary">
        <div>
          <span>Было отмечено</span>
          <b>{money(oldAmount)}</b>
        </div>

        <div>
          <span>По факту списано</span>
          <b>{money(requestedAmount)}</b>
        </div>
      </div>


      {task.description && (
        <div className="infoBox">
          <strong>Комментарий менеджера</strong>
          <p>{task.description}</p>
        </div>
      )}


      {status === 'NEW' && (
        <button
          type="button"
          className="primary wide"
          disabled={saving}
          onClick={take}
        >
          {saving ? 'Сохраняем…' : 'В работу'}
        </button>
      )}


      {status === 'IN_PROGRESS' && (
        <button
          type="button"
          className="primary wide"
          disabled={saving}
          onClick={complete}
        >
          {saving
            ? 'Сохраняем…'
            : 'Подтвердить фактическую сумму'}
        </button>
      )}


      {error && (
        <div className="error">{error}</div>
      )}

    </section>
  );
}


// ======================================================
// ACCOUNTANT TASK
// ======================================================

export function SupplierPaymentTask({
  task,
  user,
  onBack,
}: {
  task: Task;
  user: CurrentUser;
  onBack: () => void;
}) {

  const purchase =
    task.supplierPurchase!;


  const stampOnlyTask =
    task.title.startsWith(
      'Приложить платёжку с печатью'
    );


  const [status, setStatus] =
    useState(task.status);


  const amountToPay =
    task.payload?.amountToPay !== undefined &&
    task.payload?.amountToPay !== null
      ? Number(task.payload.amountToPay)
      : purchase.requestedAmount
        ? Number(purchase.requestedAmount)
        : 0;


  const [amount, setAmount] =
    useState(
      amountToPay
        ? formatMoneyInput(
            String(amountToPay)
          )
        : ''
    );


  const [comment, setComment] =
    useState('');


  const [stamped, setStamped] =
    useState(false);


  const [
    paidFromBalance,
    setPaidFromBalance,
  ] = useState(false);


  const [files, setFiles] =
    useState<File[]>([]);


  const [
    payments,
    setPayments,
  ] = useState(
    purchase.payments || []
  );


  const [
    stampPaymentId,
    setStampPaymentId,
  ] = useState<
    string | null
  >(null);


  const [
    stampFiles,
    setStampFiles,
  ] = useState<File[]>([]);


  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  const purchaseIncomingFiles =
    (
      task.deal.files || []
    )
      .filter(
        (file) =>

          file.category ===
          'SUPPLIER_INVOICE_' +
          purchase.id
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const purchaseAdditionalFiles =
    (
      task.deal.files || []
    ).filter(
      (file) =>
        file.category ===
        'SUPPLIER_ATTACHMENT_' +
        purchase.id
    );


  const currentPurchaseIncoming =
    purchaseIncomingFiles[
      purchaseIncomingFiles.length - 1
    ];


  // Only files belonging to this supplier purchase or to its payments.
  // SupplierPaymentManagerEdit writes corrected extras into SUPPLIER_DOCUMENT_.
  const purchaseFilesForTask = task.deal.files || [];
  const extraPurchaseDocuments = purchaseFilesForTask.filter(
    (file) =>
      file.category === 'SUPPLIER_ATTACHMENT_' + purchase.id ||
      file.category === 'SUPPLIER_DOCUMENT_' + purchase.id,
  );
  const paymentOrderFiles = purchaseFilesForTask.filter(
    (file) => file.category === 'SUPPLIER_PAYMENT_' + purchase.id,
  );
  const paymentIdSet = new Set((purchase.payments || []).map((payment) => payment.id));
  const stampedPaymentOrderFiles = purchaseFilesForTask.filter((file) => {
    const prefix = 'SUPPLIER_PAYMENT_STAMP_';
    return file.category?.startsWith(prefix) &&
      paymentIdSet.has(file.category.slice(prefix.length));
  });
  const originalDealAttachments = !currentPurchaseIncoming
    ? purchaseFilesForTask.filter((file) => file.category === 'MANAGER_ATTACHMENT')
    : [];

  const supplierCurrentDocuments = [
    ...(currentPurchaseIncoming
      ? [{ file: currentPurchaseIncoming, description: 'Актуальный входящий счёт поставщика' }]
      : originalDealAttachments.map((file) => ({
          file, description: 'Вложение к исходной заявке',
        }))),
    ...purchaseAdditionalFiles.map((file) => ({
      file, description: 'Дополнительный документ поставщика',
    })),
    ...extraPurchaseDocuments.map((file) => ({
      file, description: 'Дополнено по закупке или при исправлении',
    })),
    ...paymentOrderFiles.map((file) => ({
      file, description: 'Платёжное поручение',
    })),
    ...stampedPaymentOrderFiles.map((file) => ({
      file, description: 'Платёжное поручение с отметкой банка',
    })),
  ];
  const supplierHistoryDocuments = purchaseIncomingFiles
    .slice(0, -1)
    .reverse()
    .map((file) => ({
      file, description: 'Предыдущий входящий счёт поставщика',
    }));

  const paidAlready =
    payments.reduce(
      (
        sum,
        payment,
      ) =>
        sum +
        Number(
          payment.amount
        ),
      0,
    );


  const target =
    purchase.requestedAmount
      ? Number(
          purchase
            .requestedAmount
        )

      : purchase
          .incomingInvoiceAmount
        ? Number(
            purchase
              .incomingInvoiceAmount
          )

        : null;


  const financiallyPaid =
    target === null
      ? paidAlready > 0
      : paidAlready >= target;


  const waitingStamp =
    financiallyPaid &&
    payments.some(
      (payment) =>
        !payment
          .paymentOrderStamped &&
        !payment
          .paidFromBalance
    );


  async function take() {

    setSaving(true);
    setError('');


    try {

      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id
      );


      setStatus(
        'IN_PROGRESS'
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


  function savePayment() {

    setError('');


    if (
      stamped &&
      !paidFromBalance &&
      files.length === 0
    ) {

      setError(
        'Если ставите «с печатью», прикрепите платёжку.'
      );

      return;
    }


    const paymentAmount =
      parseMoney(amount) || 0;


    const filesToUpload =
      paidFromBalance
        ? []
        : [...files];


    const commentToSave =
      comment.trim() ||
      undefined;


    const stampedValue =
      paidFromBalance
        ? false
        : stamped;


    const paidFromBalanceValue =
      paidFromBalance;


    setFiles([]);
    setAmount('');
    setComment('');
    setStamped(false);
    setPaidFromBalance(false);


    startBackgroundUploadJob({

        // PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS
        // PART_V064_O22_H1_SUPPLIER_TASK_DEAL_ID
        dealId:
          task.deal.id,

      taskId:
        task.id,

      title:
        'Отправляем оплату',

      subtitle:
        purchase.supplierName,

      files:
        filesToUpload,


      run:
        async ({
          upload,
          setProgress,
        }) => {

          for (
            let index = 0;
            index <
              filesToUpload.length;
            index++
          ) {

            await upload(
              task.deal.id,

              filesToUpload[
                index
              ],

              'SUPPLIER_PAYMENT_' +
              purchase.id,

              index,

              filesToUpload.length,
            );
          }


          setProgress(94);


          await addSupplierPayment(
            task.deal.id,
            purchase.id,
            {

              amount:
                paymentAmount,

              paidAt:
                todayLocalDate(),

              paymentOrderStamped:
                stampedValue,

              paidFromBalance:
                paidFromBalanceValue,

              comment:
                commentToSave,

              actorId:
                user.id,
            }
          );


          setProgress(99);
        },
    });


    onBack();
  }


  function sendStampedDocument(
    paymentId: string,
  ) {

    setError('');


    if (
      stampFiles.length === 0
    ) {

      setError(
        'Прикрепите платёжку с печатью.'
      );

      return;
    }


    const filesToUpload =
      [...stampFiles];


    setStampFiles([]);
    setStampPaymentId(null);


    startBackgroundUploadJob({

        // PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS
        dealId:
          task.deal.id,

      taskId:
        task.id,

      title:
        'Загружаем платёжку с печатью',

      subtitle:
        purchase.supplierName,

      files:
        filesToUpload,


      run:
        async ({
          upload,
          setProgress,
        }) => {

          for (
            let index = 0;
            index <
              filesToUpload.length;
            index++
          ) {

            await upload(
              task.deal.id,

              filesToUpload[
                index
              ],

              'SUPPLIER_PAYMENT_STAMP_' +
              paymentId,

              index,

              filesToUpload.length,
            );
          }


          setProgress(94);


          await markSupplierPaymentStamped(
            task.deal.id,
            purchase.id,
            paymentId,
            user.id,
          );


          setProgress(99);
        },
    });


    onBack();
  }


  return (

    <section
      className="content form taskWorkspace taskWorkspace--unified"
      data-task-status={status}
    >

      {/* PART_1N_B2_SUPPLIER_MANAGER_EDIT */}

      {status === 'NEED_DATA' &&
        user.role !== 'ACCOUNTANT' && (

        <SupplierPaymentManagerEdit
          taskId={task.id}
          dealId={task.deal.id}
          actorId={user.id}
          purchase={purchase}
          urgent={task.urgent}
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
          {
            stampOnlyTask
              ? 'Платёжка с печатью'
              : 'Оплатить поставщику'
          }
        </h2>


        <p>
          {purchase.supplierName}
        </p>


        <div className="statusPill">

          {
            waitingStamp
              ? 'Оплачено · ждём документ'

              : status === 'NEW'
                ? 'Новая'

                : status ===
                    'IN_PROGRESS'
                  ? 'В работе'

                  : status
          }

        </div>


        {task.urgent && (

          <b className="urgent">
            СРОЧНО
          </b>

        )}

      </div>

      {/* PART_V064_L_SUPPLIER_PAYMENT_CONTEXT */}
      <TaskContextStrip task={task} />


      <TaskDataSection
        title="Данные для оплаты поставщику"
        subtitle="Поставщик, входящий счёт и сумма к оплате"
        items={[
          { label: 'Поставщик', value: purchase.supplierName },
          { label: 'Входящий счёт', value: purchase.incomingInvoiceNumber || '—' },
          { label: stampOnlyTask ? 'Оплачено' : 'Нужно оплатить', value: stampOnlyTask ? money(paidAlready) : money(amountToPay) },
          { label: 'Уже оплачено', value: money(paidAlready) },
          { label: 'Документы', value: waitingStamp ? 'Ждём печать' : financiallyPaid ? 'Готово' : 'Оплата' },
          ...(task.description
            ? [{ label: 'Комментарий менеджера', value: task.description, wide: true }]
            : []),
        ]}
      />

      <TaskDocuments
        title="Документы оплаты поставщику"
        subtitle="Входящий счёт, платёжные поручения и документы с отметкой банка"
        current={supplierCurrentDocuments}
        history={supplierHistoryDocuments}
        emptyLabel="По этой закупке файлы пока не приложены"
      />

      {/* Unified actions: return first, take second. */}
      {status === 'NEW' && (
        <div className={financiallyPaid
          ? 'taskUnifiedStartActions taskUnifiedStartActions--single'
          : 'taskUnifiedStartActions'}>
          {!financiallyPaid && (
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
      {status === 'IN_PROGRESS' && !financiallyPaid && (
        <div className="taskUnifiedSingleAction">
          <ReturnToManagerPanel
            taskId={task.id}
            actorId={user.id}
            disabled={saving}
            onReturned={onBack}
          />
        </div>
      )}

{status ===
        'IN_PROGRESS' &&
        !financiallyPaid && (

        <TaskWorkSection
          title="Проведение оплаты поставщику"
          description="Укажите сумму и способ оплаты, приложите платёжное поручение при необходимости."
        >

          <label className="field">

            <span>
              Сумма этой оплаты
            </span>

            <input
              inputMode="decimal"
              value={amount}

              onChange={(e) =>
                setAmount(
                  formatMoneyInput(
                    e.target.value
                  )
                )
              }

              placeholder="Сумма"
            />

          </label>


          {!paidFromBalance && (

            <label className="field">

              <span>
                Платёжные документы
              </span>

              <MultiFilePicker
                files={files}
                onChange={setFiles}
                title="+ Прикрепить платёжки"
              />

            </label>

          )}


          <label className="field">

            <span>
              Комментарий
            </span>

            <textarea
              rows={2}
              value={comment}

              onChange={(e) =>
                setComment(
                  e.target.value
                )
              }
            />

          </label>


          <label data-bo-payment-choice="balance" className="stampToggle balancePaymentToggle">

            <input
              type="checkbox"
              checked={paidFromBalance}

              onChange={(e) => {

                const checked =
                  e.target.checked;


                setPaidFromBalance(
                  checked
                );


                if (checked) {
                  setStamped(false);
                  setFiles([]);
                }
              }}
            />


            <div>

              <strong>
                Оплата с остатка
              </strong>

              <span>
                Платёжка не требуется.
                После полной оплаты
                задача закроется как
                оплаченная.
              </span>

            </div>

          </label>


          {!paidFromBalance && (

          <label data-bo-payment-choice="stamped" className="stampToggle">

            <input
              type="checkbox"
              checked={stamped}

              onChange={(e) =>
                setStamped(
                  e.target.checked
                )
              }
            />


            <div>

              <strong>
                Платёжка с печатью
              </strong>

              <span>
                Если печати пока нет —
                не отмечайте.
                Её можно добавить позже.
              </span>

            </div>

          </label>

          )}


          <button
            type="button"
            className="primary wide"

            onClick={savePayment}
          >
            Отправить оплату
          </button>

        </TaskWorkSection>

      )}


      {payments.length > 0 && (

        <div className="infoBox">

          <strong>
            История оплат
          </strong>


          <div className="supplierPaymentHistory">

            {payments.map(
              (payment) => (

              <div
                key={payment.id}
                className={
                  payment.paidFromBalance ||
                  payment.paymentOrderStamped
                    ? 'supplierPaymentStamped'
                    : 'supplierPaymentNoStamp'
                }
              >

                <b>
                  {
                    money(
                      payment.amount
                    )
                  }
                </b>


                <span>

                  {
                    new Date(
                      payment.paidAt
                    )
                      .toLocaleDateString(
                        'ru-RU'
                      )
                  }

                  {' · '}

                  {
                    payment
                      .paidFromBalance

                      ? '✓ Оплата с остатка'

                      : payment
                          .paymentOrderStamped

                        ? '✓ Платёжка с печатью'
                        : '● Платёжка без печати'
                  }

                </span>


                {payment.comment && (

                  <em>
                    {payment.comment}
                  </em>

                )}


                {!payment
                  .paymentOrderStamped &&
                  !payment
                    .paidFromBalance && (

                  <button
                    type="button"
                    className="stampAddButton"

                    onClick={() => {

                      setStampPaymentId(
                        stampPaymentId ===
                          payment.id
                          ? null
                          : payment.id
                      );

                      setStampFiles([]);
                    }}
                  >

                    + Добавить с печатью

                  </button>

                )}


                {stampPaymentId ===
                  payment.id && (

                  <div className="stampUploadBox">

                    <MultiFilePicker
                      files={stampFiles}
                      onChange={setStampFiles}
                      title="+ Выбрать платёжку с печатью"
                    />


                    <button
                      type="button"
                      className="primary wide"

                      disabled={
                        stampFiles.length ===
                        0
                      }

                      onClick={() =>
                        sendStampedDocument(
                          payment.id
                        )
                      }
                    >
                      Отправить документ
                    </button>

                  </div>

                )}

              </div>

            ))}

          </div>

        </div>

      )}


      {waitingStamp && (

        <div className="waitingStampBox">

          <strong>
            Оплата проведена
          </strong>

          <span>
            Осталось прикрепить
            платёжку с печатью.
            Задача пока остаётся
            в работе.
          </span>

        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>
  );
}
