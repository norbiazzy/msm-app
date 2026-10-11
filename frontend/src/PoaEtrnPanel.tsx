/* PART_V064_N2_ETRN_REQUEST_FORM */
import {
  useMemo,
  useState,
} from 'react';

import {
  createEtrnTask,
  dealFileUrl,
} from './api';

import {
  TaskStructuredFields,
  type TaskDetails,
} from './TaskStructuredFields';

import type {
  CurrentUser,
  Deal,
  SellerType,
} from './types';

function etrnStatusLabel(
  status: string,
) {
  return ({
    NEW: 'новая',
    IN_PROGRESS: 'в работе',
    NEED_DATA: 'нужно исправить',
    DONE: 'готова',
    CANCELLED: 'отменена',
  } as Record<string, string>)[status] || status;
}

function sellerLabel(
  value:
    SellerType |
    string |
    undefined,
) {
  return ({
    MSM: 'МСМ',
    ST: 'СТ',
    IP: 'ИП',
  } as Record<string, string>)[
    String(value || '')
  ] || String(value || '');
}

export function PoaEtrnPanel({
  deal,
  user,
  task,
  onChanged,
}: {
  deal: Deal;
  user: CurrentUser;
  task: any;
  onChanged:
    () =>
      void |
      Promise<void>;
}) {
  const payload =
    (
      task?.payload &&
      typeof task.payload ===
        'object'
    )
      ? task.payload as
          Record<
            string,
            unknown
          >
      : {};

  const poaDetails =
    (
      task?.details &&
      typeof task.details ===
        'object'
    )
      ? task.details as
          Record<
            string,
            unknown
          >
      : {};

  const currentInvoice =
    deal.invoices.find(
      (invoice) =>
        invoice.isCurrent
    ) ??
    deal.invoices[0];

  const poaFile =
    (
      deal.files ||
      []
    ).find(
      (file) =>
        file.category ===
        'POWER_OF_ATTORNEY_RESULT_' +
        task.id
    );

  const linkedEtrn =
    useMemo(
      () =>
        (
          (
            deal.tasks ||
            []
          ) as any[]
        ).find(
          (candidate) => {
            if (
              candidate.type !==
              'ETRN'
            ) {
              return false;
            }

            const candidatePayload =
              (
                candidate.payload &&
                typeof candidate.payload ===
                  'object'
              )
                ? candidate.payload as
                    Record<
                      string,
                      unknown
                    >
                : {};

            return String(
              candidatePayload
                .poaTaskId ||
              ''
            ) === task.id;
          }
        ),
      [
        deal.tasks,
        task.id,
      ],
    );

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    details,
    setDetails,
  ] = useState<TaskDetails>(
    {}
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  if (
    user.role ===
      'ACCOUNTANT' ||
    task.status !==
      'DONE'
  ) {
    return null;
  }

  if (linkedEtrn) {
    return (
      <div className="powerEtrnAction">
        <span className="powerEtrnLinked">
          ЭТРН · {
            etrnStatusLabel(
              linkedEtrn.status
            )
          }
        </span>
      </div>
    );
  }

  function openForm() {
    const deliveryAddresses =
      Array.isArray(
        deal.deliveryAddresses
      )
        ? deal.deliveryAddresses
        : [];

    setDetails({
      poaNumber:
        String(
          poaDetails.poaNumber ||
          ''
        ),
      invoiceNumber:
        currentInvoice?.number ||
        '',
      invoiceSellerType:
        currentInvoice
          ?.sellerType ||
        deal.sellerType,
      loadingAddress:
        '',
      unloadingAddress:
        String(
          deliveryAddresses[0] ||
          ''
        ),
      objectContactName:
        deal.contactName ||
        '',
      objectContactPhone:
        deal.clientPhone ||
        '',
      carrierCompany:
        '',
      carrierContactName:
        '',
      carrierPhone:
        '',
    });

    setError('');
    setOpen(true);
  }

  async function submit() {
    const required = [
      [
        'Адрес погрузки',
        details.loadingAddress,
      ],
      [
        'Адрес выгрузки',
        details.unloadingAddress,
      ],
      [
        'Имя контакта на объекте',
        details.objectContactName,
      ],
      [
        'Телефон контакта на объекте',
        details.objectContactPhone,
      ],
      [
        'Перевозчик / ООО',
        details.carrierCompany,
      ],
      [
        'Контакт перевозчика',
        details.carrierContactName,
      ],
      [
        'Телефон перевозчика',
        details.carrierPhone,
      ],
    ] as const;

    const missing =
      required.find(
        ([, value]) =>
          !String(
            value ||
            ''
          ).trim()
      );

    if (missing) {
      setError(
        'Заполните поле: ' +
        missing[0]
      );
      return;
    }

    if (
      !String(
        details.poaNumber ||
        ''
      ).trim()
    ) {
      setError(
        'В готовой доверенности не указан номер.'
      );
      return;
    }

    if (!currentInvoice) {
      setError(
        'В сделке нет актуального счёта.'
      );
      return;
    }

    if (!poaFile) {
      setError(
        'Не найден файл готовой доверенности.'
      );
      return;
    }

    if (
      !currentInvoice.fileId
    ) {
      setError(
        'У актуального счёта нет файла.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createEtrnTask({
        dealId:
          deal.id,
        actorId:
          user.id,
        urgent:
          Boolean(
            task.urgent
          ),
        poaTaskId:
          task.id,
        supplierName:
          String(
            payload.supplierName ||
            ''
          ) ||
          undefined,
        details,
      });

      setOpen(false);
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

  const requestedTogether =
    Boolean(
      payload.requestEtrn
    );

  const invoiceTitle =
    currentInvoice
      ? (
          sellerLabel(
            currentInvoice
              .sellerType ||
            deal.sellerType
          ) +
          ' - ' +
          currentInvoice.number
        )
      : 'Актуальный счёт не найден';

  return (
    <div className="powerEtrnAction">
      {!open ? (
        <button
          type="button"
          className={
            requestedTogether
              ? 'primary wide'
              : 'secondary wide'
          }
          onClick={openForm}
        >
          {requestedTogether
            ? 'Заполнить данные ЭТРН'
            : '+ Запросить ЭТРН'}
        </button>
      ) : (
        <div className="powerEtrnForm">
          <div className="powerEtrnFormHead">
            <strong>
              Заявка на ЭТРН
            </strong>

            <span>
              Доверенность, актуальный счёт
              и данные объекта подтягиваются
              из сделки автоматически.
            </span>
          </div>

          <div className="etrnAutoDocs">
            <div className="etrnAutoDocRow">
              <div>
                <span>
                  Доверенность
                </span>
                <strong>
                  № {
                    String(
                      poaDetails.poaNumber ||
                      'не указан'
                    )
                  }
                </strong>
              </div>

              {poaFile ? (
                <a
                  href={
                    dealFileUrl(
                      poaFile.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>
              ) : (
                <b className="etrnDocMissing">
                  Файл не найден
                </b>
              )}
            </div>

            <div className="etrnAutoDocRow">
              <div>
                <span>
                  Актуальный счёт
                </span>
                <strong>
                  {invoiceTitle}
                </strong>
              </div>

              {currentInvoice
                ?.fileId ? (
                <a
                  href={
                    dealFileUrl(
                      currentInvoice
                        .fileId
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>
              ) : (
                <b className="etrnDocMissing">
                  Файл не найден
                </b>
              )}
            </div>
          </div>

          <TaskStructuredFields
            taskType="ETRN"
            value={details}
            onChange={setDetails}
          />

          <div className="powerEtrnFormActions">
            <button
              type="button"
              className="secondary"
              disabled={saving}
              onClick={() =>
                setOpen(false)
              }
            >
              Отмена
            </button>

            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={() => {
                void submit();
              }}
            >
              {saving
                ? 'Отправляем…'
                : 'Отправить бухгалтерии'}
            </button>
          </div>

          {error && (
            <div className="error">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* END_PART_V064_N2_ETRN_REQUEST_FORM */
