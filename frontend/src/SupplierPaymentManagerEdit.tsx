import { AutoTextarea } from './AutoTextarea';
/* MSM_DOCUMENT_FLOW_V9 */
import { ManagerDocumentPicker } from './DocumentPickerV9';
import {
  useState,
} from 'react';

import {
  resubmitSupplierPaymentTask,
} from './api';

import {
  startBackgroundUploadJob,
} from './backgroundUploads';

import type {
  SupplierPurchase,
} from './types';


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
        ? normalized.slice(
            0,
            firstDot
          )
        : normalized
    ) || '0';


  const decimalPart =
    firstDot >= 0
      ? normalized
          .slice(
            firstDot + 1
          )
          .replace(
            /\./g,
            ''
          )
          .slice(
            0,
            2
          )
      : null;


  const formattedInteger =
    integerPart
      .replace(
        /^0+(?=\d)/,
        ''
      )
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ' '
      );


  return decimalPart !== null
    ? formattedInteger +
        ',' +
        decimalPart
    : formattedInteger;
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


  return Number.isFinite(
    parsed
  )
    ? parsed
    : undefined;
}


export function SupplierPaymentManagerEdit({
  taskId,
  dealId,
  actorId,
  purchase,
  urgent,
  onResubmitted,
}: {
  taskId: string;
  dealId: string;
  actorId: string;
  purchase: SupplierPurchase;
  urgent: boolean;
  onResubmitted:
    () =>
      void |
      Promise<void>;
}) {

  const [
    supplierName,
    setSupplierName,
  ] = useState(
    purchase.supplierName ||
      ''
  );


  const [
    invoiceNumber,
    setInvoiceNumber,
  ] = useState(
    purchase
      .incomingInvoiceNumber ||
      ''
  );


  const [
    amount,
    setAmount,
  ] = useState(
    purchase.requestedAmount
      ? formatMoneyInput(
          String(
            purchase
              .requestedAmount
          )
        )

      : purchase
          .incomingInvoiceAmount
        ? formatMoneyInput(
            String(
              purchase
                .incomingInvoiceAmount
            )
          )

        : ''
  );


  const [
    comment,
    setComment,
  ] = useState(
    purchase.comment ||
      ''
  );


  const [
    urgentValue,
    setUrgentValue,
  ] = useState(
    urgent
  );


  const [
    primaryInvoice,
    setPrimaryInvoice,
  ] = useState<
    File | null
  >(null);


  const [
    extraFiles,
    setExtraFiles,
  ] = useState<File[]>([]);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState('');


  function payload() {

    const parsedAmount =
      parseMoney(amount);


    return {
      parsedAmount,

      data: {
        actorId,

        supplierName:
          supplierName
            .trim() ||
          undefined,

        incomingInvoiceNumber:
          invoiceNumber
            .trim() ||
          undefined,

        amount:
          parsedAmount,

        comment:
          comment.trim() ||
          undefined,

        urgent:
          urgentValue,
      },
    };
  }


  async function submit() {

    const {
      parsedAmount,
      data,
    } = payload();


    if (
      amount.trim() &&
      parsedAmount ===
        undefined
    ) {

      setError(
        'Проверьте сумму.'
      );

      return;
    }


    const filesToUpload = [
      ...(primaryInvoice
        ? [primaryInvoice]
        : []),
      ...extraFiles,
    ];


    if (
      filesToUpload.length === 0
    ) {

      setSaving(true);
      setError('');


      try {

        await resubmitSupplierPaymentTask(
          taskId,
          data,
        );


        await onResubmitted();


      } catch (e) {

        setError(
          e instanceof Error
            ? e.message
            : String(e)
        );


      } finally {

        setSaving(false);
      }


      return;
    }


    setError('');


    const primary =
      primaryInvoice;

    const extras =
      [...extraFiles];


    startBackgroundUploadJob({

      taskId,

      dealId,

      title:
        'Повторно отправляем бухгалтерии',

      successTitle:
        'Задача повторно отправлена',

      subtitle:
        supplierName.trim() ||
        purchase.supplierName,

      files:
        filesToUpload,


      run:
        async ({
          upload,
          setProgress,
        }) => {

          let uploadIndex = 0;


          if (primary) {

            await upload(
              dealId,
              primary,
              'SUPPLIER_INVOICE_' +
                purchase.id,
              uploadIndex,
              filesToUpload.length,
            );

            uploadIndex++;
          }


          for (
            let index = 0;
            index < extras.length;
            index++
          ) {

            await upload(
              dealId,
              extras[index],
              'SUPPLIER_DOCUMENT_' +
                purchase.id,
              uploadIndex,
              filesToUpload.length,
            );

            uploadIndex++;
          }


          setProgress(94);


          await resubmitSupplierPaymentTask(
            taskId,
            data,
          );


          setProgress(99);
        },
    });


    setPrimaryInvoice(
      null
    );

    setExtraFiles([]);


    /*
     * Important UX:
     * return to task list immediately.
     * Upload continues in background and is
     * displayed on this task card by taskId.
     */
    await onResubmitted();
  }


  return (

    <div className="managerResubmitPanel supplierManagerEdit">

      <div className="managerResubmitHead">

        <strong>
          Исправить оплату поставщику
        </strong>

        <span>
          Все текущие данные и ранее
          загруженные файлы сохраняются.
          Можно добавить новый счёт
          и документы.
        </span>

      </div>


      <label className="field">

        <span>
          Поставщик
        </span>

        <input
          value={supplierName}
          disabled={saving}
          onChange={(event) =>
            setSupplierName(
              event.target.value
            )
          }
        />

      </label>


      <label className="field">

        <span>
          № входящего счёта
        </span>

        <input
          value={invoiceNumber}
          disabled={saving}
          onChange={(event) =>
            setInvoiceNumber(
              event.target.value
            )
          }
          placeholder="Не указан"
        />

      </label>


      <label className="field">

        <span>
          Сумма к оплате
        </span>

        <input
          inputMode="decimal"
          value={amount}
          disabled={saving}
          onChange={(event) =>
            setAmount(
              formatMoneyInput(
                event.target.value
              )
            )
          }
          placeholder="0"
        />

      </label>


      <label className="field">

        <span>
          Комментарий
        </span>

        <AutoTextarea
          rows={4}
          value={comment}
          disabled={saving}
          onChange={(event) =>
            setComment(
              event.target.value
            )
          }
        />

      </label>


      <div className="field"><span>Документы для исправления</span>
          <ManagerDocumentPicker primaryFile={primaryInvoice} onPrimaryChange={setPrimaryInvoice} files={extraFiles} onChange={setExtraFiles} />
        </div>


      <label className="urgentToggle">

        <input
          type="checkbox"
          checked={urgentValue}
          disabled={saving}
          onChange={(event) =>
            setUrgentValue(
              event.target.checked
            )
          }
        />

        <span>
          Срочно
        </span>

      </label>


      {error && (

        <div className="error">
          {error}
        </div>

      )}


      <button
        type="button"
        className="primary wide"
        disabled={saving}
        onClick={() =>
          void submit()
        }
      >

        {
          saving
            ? 'Отправляем…'
            : 'Сохранить и повторно отправить бухгалтерии'
        }

      </button>

    </div>
  );
}
