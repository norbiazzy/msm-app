import type { Deal, Invoice } from '../../types';
import { money, paymentStatusLabel, sellerLabels } from '../../shared/formatters';

type DealSidebarProps = {
  deal: Deal;
  current: Invoice | undefined;
  incomingTotal: number;
  canManageDeal: boolean;
  onEditDeal: () => void;
};

export function DealSidebar({ deal, current, incomingTotal, canManageDeal, onEditDeal }: DealSidebarProps) {
  return (
        <aside className="dealWorkspaceCSidebar">
          <div className="dealWorkspaceCSideCard">

            <div className="dealWorkspaceCDealNo">
              ЗК-{deal.internalNumber}
            </div>

            <div className="dealWorkspaceCClient">
              {deal.clientName}
            </div>

            <div className="dealWorkspaceCAddress">
              {
                deal.deliveryAddresses?.[0] ||
                'Адрес доставки не указан'
              }
            </div>

            <div className="dealWorkspaceCPills">
              {current && (
                <span className="dealWorkspaceCPill dealWorkspaceCPillBlue">
                  {
                    sellerLabels[
                      current.sellerType ||
                      deal.sellerType
                    ]
                  }
                  {' - '}
                  {current.number}
                </span>
              )}

              <span className="dealWorkspaceCPill dealWorkspaceCPillGreen">
                {
                  paymentStatusLabel(
                    deal.paymentStatus
                  )
                }
              </span>

              {
                deal.tasks.filter(
                  (task) =>
                    ![
                      'DONE',
                      'CANCELLED',
                    ].includes(
                      task.status
                    )
                ).length > 0 && (
                  <span className="dealWorkspaceCPill dealWorkspaceCPillYellow">
                    {
                      deal.tasks.filter(
                        (task) =>
                          ![
                            'DONE',
                            'CANCELLED',
                          ].includes(
                            task.status
                          )
                      ).length
                    }
                    {' '}
                    {
                      deal.tasks.filter(
                        (task) =>
                          ![
                            'DONE',
                            'CANCELLED',
                          ].includes(
                            task.status
                          )
                      ).length === 1
                        ? 'задача'
                        : 'задачи'
                    }
                  </span>
                )
              }
            </div>

            <div className="dealWorkspaceCActions">

              <button
                type="button"
                className="primary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCInvoice'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Счёт
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCPayments'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Оплата клиента
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCIncoming'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Входящие счета
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCDocuments'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Доверенность / ЭТРН
              </button>

              {canManageDeal && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    onEditDeal();

                    window.setTimeout(
                      () =>
                        document
                          .getElementById(
                            'dealCClient'
                          )
                          ?.scrollIntoView({
                            behavior:
                              'smooth',
                            block:
                              'start',
                          }),
                      0
                    );
                  }}
                >
                  Редактировать сделку
                </button>
              )}

            </div>

            <div className="dealWorkspaceCSubhead">
              Контакт на объекте
            </div>

            <div className="dealWorkspaceCContact">
              <strong>
                {
                  deal.contactName ||
                  'Не указан'
                }
              </strong>

              <span>
                {
                  deal.clientPhone ||
                  'Телефон не указан'
                }
              </span>
            </div>

            <div className="dealWorkspaceCSubhead">
              Финансы
            </div>

            <div className="dealWorkspaceCFinance">

              <div>
                <span>
                  Сумма сделки
                </span>
                <b>
                  {
                    current?.amount
                      ? money(
                          current.amount
                        )
                      : '—'
                  }
                </b>
              </div>

              <div>
                <span>
                  Получено от клиента
                </span>
                <b>
                  {
                    money(
                      (
                        deal.clientPayments ||
                        []
                      ).reduce(
                        (
                          sum,
                          payment,
                        ) =>
                          sum +
                          Number(
                            payment.amount ||
                            0
                          ),
                        0
                      )
                    )
                  }
                </b>
              </div>

              <div>
                <span>
                  Входящие счета
                </span>
                <b>
                  {
                    incomingTotal > 0
                      ? money(
                          incomingTotal
                        )
                      : '—'
                  }
                </b>
              </div>

            </div>

          </div>
        </aside>
  );
}
