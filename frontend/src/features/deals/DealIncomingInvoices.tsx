import type { Dispatch, SetStateAction } from 'react';
import type { StoredFile, SupplierPurchase } from '../../types';
import { dealFileUrl } from '../../api';

type Setter<T> = Dispatch<SetStateAction<T>>;
type DealIncomingInvoicesProps = {
  showDealIncomingInvoices: boolean;
  supplierIncomingRows: Array<{ purchase: SupplierPurchase; file: StoredFile }>;
  currentCustomerInvoice: StoredFile | undefined;
  previousCustomerInvoices: StoredFile[];
  incomingHistoryOpen: boolean;
  setIncomingHistoryOpen: Setter<boolean>;
};

export function DealIncomingInvoices({
  showDealIncomingInvoices,
  supplierIncomingRows,
  currentCustomerInvoice,
  previousCustomerInvoices,
  incomingHistoryOpen,
  setIncomingHistoryOpen,
}: DealIncomingInvoicesProps) {
  return (
    <>
      {showDealIncomingInvoices && (

        <div className="dealIncomingInvoiceCard">

          <div className="dealIncomingInvoiceHead">
            <div>
              <span>Входящие счета</span>
              <strong>
                {
                  supplierIncomingRows.length > 0
                    ? 'По поставщикам · ' +
                      supplierIncomingRows.length
                    : currentCustomerInvoice
                      ? currentCustomerInvoice.originalName
                      : ''
                }
              </strong>
            </div>


            {supplierIncomingRows.length === 0 &&
              previousCustomerInvoices.length > 0 && (
              <button
                type="button"
                className="secondary compactButton"
                onClick={() =>
                  setIncomingHistoryOpen(
                    (value) => !value
                  )
                }
              >
                {
                  incomingHistoryOpen
                    ? 'Скрыть историю'
                    : 'История · ' +
                      previousCustomerInvoices.length
                }
              </button>
            )}
          </div>


          {supplierIncomingRows.length > 0 ? (

            <div className="dealIncomingSupplierList">
              {supplierIncomingRows.map(
                ({ purchase, file }) => (

                <div
                  className="dealIncomingSupplierRow"
                  key={purchase.id}
                >
                  <div>
                    <b>{purchase.supplierName}</b>
                    <span>{file.originalName}</span>
                  </div>

                  <a
                    href={dealFileUrl(file.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Открыть
                  </a>
                </div>

              ))}
            </div>

          ) : currentCustomerInvoice ? (

            <div className="dealIncomingSupplierRow">
              <div>
                <b>Из запроса на счёт</b>
                <span>{currentCustomerInvoice.originalName}</span>
              </div>

              <a
                href={dealFileUrl(currentCustomerInvoice.id)}
                target="_blank"
                rel="noreferrer"
              >
                Открыть
              </a>
            </div>

          ) : null}


          {supplierIncomingRows.length === 0 &&
            incomingHistoryOpen &&
            previousCustomerInvoices.length > 0 && (

            <div className="dealIncomingInvoiceHistory">
              {[...previousCustomerInvoices]
                .reverse()
                .map(
                  (file, index) => (

                  <div
                    className="dealIncomingInvoiceHistoryRow"
                    key={file.id}
                  >
                    <div>
                      <b>{file.originalName}</b>
                      <span>
                        Версия {
                          previousCustomerInvoices.length -
                          index
                        }
                        {file.createdAt
                          ? ' · ' +
                            new Date(
                              file.createdAt
                            ).toLocaleDateString(
                              'ru-RU'
                            )
                          : ''}
                      </span>
                    </div>

                    <a
                      href={dealFileUrl(file.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Открыть
                    </a>
                  </div>

                ))}
            </div>

          )}

        </div>

      )}
    </>
  );
}
