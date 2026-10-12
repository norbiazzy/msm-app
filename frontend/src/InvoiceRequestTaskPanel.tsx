import {
  useMemo,
  useState,
} from 'react';

import {
  submitInvoiceRequest,
  updateDealInfo,
  type Task,
} from './api';

import {
  SingleFilePicker,
  MultiFilePicker,
} from './MultiFilePicker';

import {
  startBackgroundUploadJob,
} from './backgroundUploads';
import { TaskDocuments } from './TaskDocuments';

import type {
  CurrentUser,
  SellerType,
} from './types';


const sellerLabels:
  Record<SellerType, string> = {
    ST: 'СТ',
    MSM: 'МСМ',
    IP: 'ИП',
  };


type InvoiceSnapshot = {
  requestMode: string;
  sellerType: SellerType;
  clientName: string;
  contactName: string;
  clientPhone: string;
  deliveryAddresses: string[];
  requestText: string;
  marginMode: string;
  marginValue: string;
  accountingComment: string;
};


function stringValue(
  value: unknown,
  fallback = '',
) {
  return (
    typeof value === 'string' ||
    typeof value === 'number'
  )
    ? String(value)
    : fallback;
}


function invoiceSnapshot(
  task: Task,
): InvoiceSnapshot {

  const typedTask =
    task as Task & {
      details?:
        Record<string, unknown>;
    };

  const details =
    typedTask.details || {};

  const deal =
    task.deal as typeof task.deal & {
      requestMode?: string;
    };


  const detailsAddresses =
    Array.isArray(
      details.deliveryAddresses
    )
      ? details.deliveryAddresses
          .filter(
            (
              value,
            ): value is string =>
              typeof value ===
              'string'
          )
      : null;


  const seller =
    stringValue(
      details.sellerType,
      deal.sellerType,
    );


  return {
    requestMode:
      stringValue(
        details.requestMode,
        deal.requestMode ||
          'TEXT',
      ),

    sellerType:
      (
        seller === 'ST' ||
        seller === 'MSM' ||
        seller === 'IP'
      )
        ? seller
        : deal.sellerType,

    clientName:
      stringValue(
        details.clientName,
        deal.clientName,
      ),

    contactName:
      stringValue(
        details.contactName,
        deal.contactName || '',
      ),

    clientPhone:
      stringValue(
        details.clientPhone,
        deal.clientPhone || '',
      ),

    deliveryAddresses:
      detailsAddresses ||
      (
        Array.isArray(
          deal.deliveryAddresses
        )
          ? deal.deliveryAddresses
          : []
      ),

    requestText:
      stringValue(
        details.requestText,
        deal.requestText || '',
      ),

    marginMode:
      stringValue(
        details.marginMode,
        deal.marginMode ||
          'TOTAL_PLUS',
      ),

    marginValue:
      stringValue(
        details.marginValue,
        deal.marginValue != null
          ? String(
              deal.marginValue
            )
          : '',
      ),

    accountingComment:
      stringValue(
        details.accountingComment,
        deal.accountingComment || '',
      ),
  };
}


function requestModeLabel(
  value: string,
) {
  return value ===
    'INCOMING_INVOICE'
    ? 'По входящему счёту'
    : 'Текстом / позициями';
}


function marginModeLabel(
  value: string,
) {
  if (value === 'PERCENT') {
    return '± %';
  }

  if (value === 'TOTAL_PLUS') {
    return '+ к сумме';
  }

  if (value === 'UNIT_PLUS') {
    return '+ за единицу';
  }

  if (value === 'FINAL') {
    return 'Итоговая цена';
  }

  return value || 'Не указано';
}


function invoiceRequestFiles(
  task: Task,
) {
  const files = task.deal.files || [];
  const newestFirst = (
    a: (typeof files)[number],
    b: (typeof files)[number],
  ) =>
    new Date(b.createdAt || 0).getTime() -
    new Date(a.createdAt || 0).getTime();

  const primaryHistory = files
    .filter((file) => file.category === 'CUSTOMER_INVOICE_PRIMARY')
    .sort(newestFirst);

  const currentPrimary = primaryHistory[0];
  const revisedAttachments = files
    .filter((file) => file.category === 'TASK_ATTACHMENT_' + task.id)
    .sort(newestFirst);
  const previousPrimary = primaryHistory.slice(1);
  const initialAttachments = files
    .filter((file) => file.category === 'MANAGER_ATTACHMENT')
    .sort(newestFirst);
  const otherIncoming = files
    .filter((file) => file.category === 'INCOMING_SUPPLIER_INVOICE')
    .sort(newestFirst);

  const candidates = [
    ...(currentPrimary
      ? [{ file: currentPrimary, description: 'Актуальный входящий счёт' }]
      : []),
    ...revisedAttachments.map((file) => ({
      file,
      description: 'Приложено при исправлении',
    })),
    ...previousPrimary.map((file) => ({
      file,
      description: 'Предыдущая версия входящего счёта',
    })),
    ...initialAttachments.map((file) => ({
      file,
      description: 'Ранее приложенный документ',
    })),
    ...otherIncoming.map((file) => ({
      file,
      description: 'Входящий счёт поставщика',
    })),
  ];

  const seenIds = new Set<string>();
  const documents = candidates.filter(({ file }) => {
    if (seenIds.has(file.id)) return false;
    seenIds.add(file.id);
    return true;
  });

  return { documents };
}


function RequestField({
  title,
  value,
}: {
  title: string;
  value: string;
}) {

  return (
    <div className="invoiceTaskField">
      <span>
        {title}
      </span>

      <strong>
        {value || 'Не указано'}
      </strong>
    </div>
  );
}


export function InvoiceRequestDataCard({
  task,
  documentsOnly = false,
}: {
  task: Task;
  documentsOnly?: boolean;
}) {

  const data =
    useMemo(
      () =>
        invoiceSnapshot(
          task
        ),
      [
        task.id,
        task.updatedAt,
        task.deal,
      ]
    );


  const { documents } = useMemo(
    () => invoiceRequestFiles(task),
    [task.id, task.deal.files],
  );

  // A re-submission keeps initial documents in the history, but they
  // remain current on a task that has not yet been corrected.
  const hasCorrections = documents.some(
    ({ description }) =>
      description === 'Приложено при исправлении' ||
      description === 'Предыдущая версия входящего счёта',
  );
  const currentDocuments = documents.filter(({ description }) =>
    description === 'Актуальный входящий счёт' ||
    description === 'Приложено при исправлении' ||
    description === 'Входящий счёт поставщика' ||
    (!hasCorrections && description === 'Ранее приложенный документ'),
  );
  const currentIds = new Set(currentDocuments.map(({ file }) => file.id));
  const historyDocuments = documents.filter(({ file }) => !currentIds.has(file.id));


  return (

    <div className="invoiceTaskData">

      {!documentsOnly && (
        <>
      <div className="invoiceTaskDataHead">

        <div>
          <strong>
            Данные для выставления счёта
          </strong>

          <span>
            Данные менеджера и приложенные документы
          </span>
        </div>

        {task.urgent && (
          <b className="urgent">
            СРОЧНО
          </b>
        )}

      </div>


      <div className="invoiceTaskDataGrid">
        {/* PART_V061_ACCOUNTANT_FIELDS */}

        <RequestField
          title="От какой организации выставлять"
          value={
            sellerLabels[
              data.sellerType
            ]
          }
        />

        <RequestField
          title="На кого выставлять"
          value={
            data.clientName
          }
        />
      </div>


      


      <div className="invoiceTaskTextBlock">
        <span>
          Что выставляем / текст запроса
        </span>

        <p>
          {
            data.requestText ||
            'Не указано'
          }
        </p>
      </div>


      <div className="invoiceTaskTextBlock">
        <span>
          Комментарий для бухгалтерии
        </span>

        <p>
          {
            data
              .accountingComment ||
            'Не указано'
          }
        </p>
      </div>


        </>
      )}

      <TaskDocuments
        title="Документы менеджера"
        subtitle="Актуальные документы и история исправлений"
        current={currentDocuments}
        history={historyDocuments}
      />
    </div>
  );
}


export function InvoiceRequestManagerRepair({
  task,
  user,
  onResubmitted,
}: {
  task: Task;
  user: CurrentUser;
  onResubmitted:
    () => void | Promise<void>;
}) {

  const initial =
    useMemo(
      () =>
        invoiceSnapshot(
          task
        ),
      [task.id]
    );


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
    String(
      accountantReturnEvent
        ?.newValue
        ?.reasonLabel ||
      task.payload?.returnReason ||
      'Бухгалтер вернул задачу на исправление'
    );

  const accountantReturnComment =
    String(
      accountantReturnEvent?.reason ||
      task.payload?.returnComment ||
      ''
    );


  const [
    requestMode,
    setRequestMode,
  ] = useState(
    initial.requestMode
  );

  const [
    sellerType,
    setSellerType,
  ] = useState<SellerType>(
    initial.sellerType
  );

  const [
    clientName,
    setClientName,
  ] = useState(
    initial.clientName
  );

  const [
    contactName,
    setContactName,
  ] = useState(
    initial.contactName
  );

  const [
    clientPhone,
    setClientPhone,
  ] = useState(
    initial.clientPhone
  );

  const [
    deliveryAddresses,
    setDeliveryAddresses,
  ] = useState(
    initial
      .deliveryAddresses
      .join('\n')
  );

  const [
    requestText,
    setRequestText,
  ] = useState(
    initial.requestText
  );

  const [
    marginMode,
    setMarginMode,
  ] = useState(
    initial.marginMode
  );

  const [
    marginValue,
    setMarginValue,
  ] = useState(
    initial.marginValue
  );

  const [
    accountingComment,
    setAccountingComment,
  ] = useState(
    initial
      .accountingComment
  );

  const [
    urgent,
    setUrgent,
  ] = useState(
    Boolean(
      task.urgent
    )
  );

  const [
    primaryFile,
    setPrimaryFile,
  ] = useState<File | null>(
    null
  );

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


  async function saveData() {

    const numericMargin =
      marginValue.trim()
        ? Number(
            marginValue
              .replace(',', '.')
          )
        : undefined;


    if (
      numericMargin !==
        undefined &&
      !Number.isFinite(
        numericMargin
      )
    ) {
      throw new Error(
        'Проверьте значение условий'
      );
    }


    const addresses =
      deliveryAddresses
        .split(/\r?\n/)
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean);


    await updateDealInfo(
      task.deal.id,
      {
        requestMode:
          requestMode ||
          'TEXT',

        sellerType,

        clientName:
          clientName.trim() ||
          task.deal.clientName,

        contactName,
        clientPhone,

        deliveryAddresses:
          addresses,

        requestText,

        marginMode,

        marginValue:
          numericMargin,

        accountingComment,

        actorId:
          user.id,
      },
    );


    await submitInvoiceRequest(
      task.deal.id,
      {
        actorId:
          user.id,
        urgent,
      },
    );
  }


  async function submit() {

    setSaving(true);
    setError('');


    try {

      const files = [
        ...(primaryFile
          ? [primaryFile]
          : []),

        ...extraFiles,
      ];


      if (
        files.length === 0
      ) {

        await saveData();

        await onResubmitted();

        return;
      }


      startBackgroundUploadJob({

        taskId:
          task.id,

        dealId:
          task.deal.id,

        title:
          'Отправляем исправления по счёту',

        successTitle:
          'Исправления отправлены бухгалтерии',

        files,

        run:
          async ({
            upload,
            setProgress,
          }) => {

            let index = 0;


            if (primaryFile) {

              await upload(
                task.deal.id,
                primaryFile,
                'CUSTOMER_INVOICE_PRIMARY',
                index,
                files.length,
              );

              index++;
            }


            for (
              const file
              of extraFiles
            ) {

              await upload(
                task.deal.id,
                file,
                'TASK_ATTACHMENT_' +
                  task.id,
                index,
                files.length,
              );

              index++;
            }


            setProgress(94);

            await saveData();

            setProgress(99);
          },
      });


      await onResubmitted();


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

      setSaving(false);
    }
  }


  return (

    <section className="content">

      <div className="invoiceTaskRepairHead">

        <div>
          <div className="eyebrow">
            Нужно исправить
          </div>

          <h2>
            Выставить счёт
          </h2>

          <span>
            ЗК-
            {
              task.deal
                .internalNumber
            }
            {' · '}
            {
              task.deal
                .clientName
            }
          </span>
        </div>


        <a
          className="secondary"
          href={
            '#deal/' +
            encodeURIComponent(
              task.deal.id
            )
          }
        >
          Открыть сделку
        </a>

      </div>


      <div className="invoiceManagerReturnCard">

        <div className="invoiceManagerReturnHead">
          <span className="invoiceManagerReturnIcon">
            !
          </span>

          <div>
            <strong>
              Бухгалтер вернул задачу
            </strong>

            <small>
              Что нужно исправить
            </small>
          </div>
        </div>

        <div className="invoiceManagerReturnField">
          <span>
            Причина возврата
          </span>

          <b>
            {accountantReturnReason}
          </b>
        </div>

        {accountantReturnComment && (
          <div className="invoiceManagerReturnField invoiceManagerReturnComment">
            <span>
              Комментарий бухгалтера
            </span>

            <p>
              {accountantReturnComment}
            </p>
          </div>
        )}

      </div>


      <InvoiceRequestDataCard
        task={task}
        documentsOnly
      />


      <div className="invoiceTaskEdit">

        <h3>
          Исправить запрос
        </h3>

        {/* PART_V061_MANAGER_REPAIR_FIELDS */}


        


        <div className="field">

          <span>
            От какой организации выставлять
          </span>

          <div className="segmented">

            {(
              [
                'ST',
                'MSM',
                'IP',
              ] as SellerType[]
            ).map(
              (value) => (

                <button
                  type="button"
                  key={value}
                  className={
                    sellerType ===
                      value
                      ? 'selected'
                      : ''
                  }
                  disabled={saving}
                  onClick={() =>
                    setSellerType(
                      value
                    )
                  }
                >
                  {
                    sellerLabels[
                      value
                    ]
                  }
                </button>

              )
            )}

          </div>

        </div>


        <label className="field">
          <span>Формат запроса</span>
          <select value={requestMode} disabled={saving}
            onChange={(event) => setRequestMode(event.target.value)}>
            <option value="TEXT">Текстом / позициями</option>
            <option value="INCOMING_INVOICE">По входящему счёту</option>
          </select>
        </label>

        <label className="field">

          <span>
            На кого выставлять
          </span>

          <input
            value={clientName}
            disabled={saving}
            onChange={(event) =>
              setClientName(
                event.target.value
              )
            }
          />

        </label>


        


        


        <label className="field">
          <span>Контактное лицо</span>
          <input value={contactName} disabled={saving}
            onChange={(event) => setContactName(event.target.value)} />
        </label>

        <label className="field">
          <span>Телефон клиента</span>
          <input type="tel" value={clientPhone} disabled={saving}
            onChange={(event) => setClientPhone(event.target.value)} />
        </label>

        <label className="field">
          <span>Адреса доставки (каждый с новой строки)</span>
          <textarea rows={3} value={deliveryAddresses} disabled={saving}
            onChange={(event) => setDeliveryAddresses(event.target.value)} />
        </label>

        <label className="field">

          <span>
            Что выставляем / текст запроса
          </span>

          <textarea
            rows={5}
            value={requestText}
            disabled={saving}
            onChange={(event) =>
              setRequestText(
                event.target.value
              )
            }
          />

        </label>


        


        <label className="field">
          <span>Условие расчёта</span>
          <select value={marginMode} disabled={saving}
            onChange={(event) => setMarginMode(event.target.value)}>
            <option value="PERCENT">± %</option>
            <option value="TOTAL_PLUS">+ к сумме</option>
            <option value="UNIT_PLUS">+ за единицу</option>
            <option value="FINAL">Итоговая цена</option>
          </select>
        </label>

        <label className="field">
          <span>Значение условия</span>
          <input inputMode="decimal" value={marginValue} disabled={saving}
            onChange={(event) => setMarginValue(event.target.value)} />
        </label>

        <label className="field">

          <span>
            Комментарий для бухгалтерии
          </span>

          <textarea
            rows={3}
            value={
              accountingComment
            }
            disabled={saving}
            onChange={(event) =>
              setAccountingComment(
                event.target.value
              )
            }
          />

        </label>


        <label className="urgentToggle">
          <input type="checkbox" checked={urgent} disabled={saving}
            onChange={(event) => setUrgent(event.target.checked)} />
          <span>Срочно</span>
        </label>

        <div className="field">

          <span>
            Новый входящий счёт,
            если изменился
          </span>

          <SingleFilePicker
            file={primaryFile}
            onChange={
              setPrimaryFile
            }
            title="+ Новый входящий счёт"
            accept="application/pdf,image/*"
          />

        </div>


        <div className="field">

          <span>
            Новые дополнительные документы
          </span>

          <MultiFilePicker
            files={extraFiles}
            onChange={
              setExtraFiles
            }
            title="+ Прикрепить документы"
          />

        </div>


        


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
              : 'Сохранить и повторно отправить'
          }
        </button>

      </div>

    </section>
  );
}
