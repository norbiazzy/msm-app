import { money, sellerLabels } from '../../../shared/formatters';
import { dealFileUrl } from '../../../api';
import type { Invoice, SellerType } from '../../../types';

export function InvoiceBlock({
  invoice,
  sellerType,
}: {
  invoice: Invoice;
  sellerType: SellerType;
}) {

  return (

    <div className="invoiceBlock">


      <div className="currentVersionLabel">
        Версия {invoice.version || 1}
        {' · '}
        Текущая
      </div>


      <div>

        <span>
          Счёт
        </span>

        <strong>
          {
            sellerLabels[
              sellerType
            ]
          }-{invoice.number}
        </strong>

      </div>


      <div>

        <span>
          Сумма
        </span>

        <strong>
          {
            invoice.amount
              ? money(
                  invoice.amount
                )
              : 'не указана'
          }
        </strong>

      </div>


      <div>

        <span>
          Дата счёта
        </span>

        <strong>

          {
            invoice.invoiceDate

              ? new Date(
                  invoice.invoiceDate
                )
                  .toLocaleDateString(
                    'ru-RU'
                  )

              : 'не указана'
          }

        </strong>

      </div>


      {(invoice.fileId || invoice.file?.id) && (

        <a
          className="fileButton"

          href={
            dealFileUrl(
              invoice.fileId ||
              invoice.file!.id
            )
          }

          target="_blank"
          rel="noreferrer"
        >
          Открыть готовый счёт
        </a>

      )}

    </div>
  );
}


export function InvoiceVersion({
  invoice,
  sellerType,
}: {
  invoice: Invoice;
  sellerType: SellerType;
}) {

  let stateLabel =
    'Не актуален';


  if (invoice.isCurrent) {

    if (
      invoice.status === 'AGREED' ||
      invoice.status === 'CONFIRMED'
    ) {

      stateLabel =
        'Текущая · готов';

    } else if (
      invoice.status ===
      'CORRECTION_REQUESTED'
    ) {

      stateLabel =
        'Текущая · на корректировке';

    } else {

      stateLabel =
        'Текущая · ожидает проверки';
    }

  } else if (
    invoice.status ===
    'CORRECTION_REQUESTED'
  ) {

    stateLabel =
      'Скорректирован · не актуален';
  }


  return (

    <div
      className={
        'invoiceVersionRow ' +
        (
          invoice.isCurrent
            ? 'invoiceVersionCurrent'
            : 'invoiceVersionOld'
        )
      }
    >

      <div className="invoiceVersionMain">

        <div className="invoiceVersionTitle">

          <b>
            Версия {invoice.version || 1}
          </b>


          <span
            className={
              invoice.isCurrent
                ? 'invoiceVersionBadge current'
                : 'invoiceVersionBadge old'
            }
          >
            {stateLabel}
          </span>

        </div>


        <strong>
          {
            sellerLabels[
              sellerType
            ]
          }-{invoice.number}
        </strong>


        <span>

          {
            invoice.amount
              ? money(
                  invoice.amount
                )
              : 'Сумма не указана'
          }

          {' · '}

          {
            invoice.invoiceDate

              ? new Date(
                  invoice.invoiceDate
                )
                  .toLocaleDateString(
                    'ru-RU'
                  )

              : 'дата не указана'
          }

        </span>

      </div>


      {(invoice.fileId || invoice.file?.id) && (

        <a
          href={
            dealFileUrl(
              invoice.fileId ||
              invoice.file!.id
            )
          }

          target="_blank"
          rel="noreferrer"
        >
          Открыть
        </a>

      )}

    </div>
  );
}
