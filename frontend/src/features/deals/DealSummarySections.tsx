import type { Deal } from '../../types';
import { auditLabel } from '../../shared/formatters';
import { InvoiceVersion } from './invoices/InvoiceViews';

export function DealSummarySections({ deal }: { deal: Deal }) {
  return (
    <>
      <div className="infoBox">

        <strong>
          Исходный запрос
        </strong>

        <p>
          {
            deal.requestText ||
            'Не указан'
          }
        </p>

        {deal.accountingComment && (

          <p>

            <b>
              Комментарий бухгалтерии:
            </b>

            {' '}

            {deal.accountingComment}

          </p>

        )}

      </div>


      {deal.invoices.length > 0 && (

        <div className="infoBox">

          <strong>
            Версии счёта
          </strong>


          <div className="versionList">

            {[...deal.invoices]
              .sort(
                (a, b) =>
                  Number(
                    b.version || 0
                  ) -
                  Number(
                    a.version || 0
                  )
              )
              .map(
                (invoice) => (

                <InvoiceVersion
                  key={invoice.id}
                  invoice={invoice}
                  sellerType={
                    invoice.sellerType ||
                    deal.sellerType
                  }
                />

              ))}

          </div>

        </div>

      )}


      {deal.auditEvents &&
        deal.auditEvents.length >
          0 && (

        <div className="infoBox">

          <strong>
            Лента сделки
          </strong>


          <div className="historyList">

            {deal.auditEvents
              .slice(0, 12)
              .map(
                (event) => (

                <div key={event.id}>

                  <span>
                    {
                      new Date(
                        event.createdAt
                      )
                        .toLocaleString(
                          'ru-RU'
                        )
                    }
                  </span>


                  <b>
                    {
                      auditLabel(
                        event.action,
                        event.oldValue,
                        event.newValue
                      )
                    }
                  </b>


                  {event.reason && (

                    <em>
                      {event.reason}
                    </em>

                  )}

                </div>

              ))}

          </div>

        </div>

      )}
    </>
  );
}
