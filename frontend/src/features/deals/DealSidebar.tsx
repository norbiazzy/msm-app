import { useEffect, useState } from 'react';
import type { Deal, Invoice } from '../../types';
import { money, paymentStatusLabel, sellerLabels } from '../../shared/formatters';

type DealSidebarProps = {
  deal: Deal;
  current: Invoice | undefined;
  incomingTotal: number;
  canManageDeal: boolean;
  onEditDeal: () => void;
};

/* MSM_STEP23_ACTIVE_DEAL_NAV */
/* MSM_STEP24_ORDERED_NAV_NO_FLASH */
const DEAL_NAV_ITEMS = [
  { id: 'dealCOverview', label: 'Сводка сделки' },
  { id: 'dealCClient', label: 'Данные клиента' },
  { id: 'dealCInvoice', label: 'Счёт и корректировки' },
  { id: 'dealCPayments', label: 'Оплата клиента' },
  { id: 'dealCIncoming', label: 'Поставщики и закупки' },
  { id: 'dealCDocuments', label: 'Доверенности и ЭТрН' },
] as const;

type DealSectionId = (typeof DEAL_NAV_ITEMS)[number]['id'];

export function DealSidebar({ deal, current, incomingTotal, canManageDeal, onEditDeal }: DealSidebarProps) {
  const [activeSection, setActiveSection] = useState<DealSectionId>('dealCOverview');

  useEffect(() => {
    const sections = DEAL_NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    if (sections.length !== DEAL_NAV_ITEMS.length) return;

    let frame: number | undefined;
    const refresh = () => {
      frame = undefined;
      const readingLine = Math.min(180, Math.max(105, window.innerHeight * 0.23));
      let next: DealSectionId = 'dealCOverview';
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= readingLine) {
          next = section.id as DealSectionId;
        }
      }
      // The last section remains selected after its top moves out of view.
      if (window.scrollY > 0 &&
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 16) {
        next = 'dealCDocuments';
      }
      setActiveSection((previous) => previous === next ? previous : next);
    };
    const schedule = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(refresh);
    };

    // A passive listener tracks the reading position without layout changes.
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(schedule, { rootMargin: '-90px 0px -55% 0px' });
    sections.forEach((section) => observer?.observe(section));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [deal.id]);

  function goToSection(id: DealSectionId) {
    // Do not preselect on click; scrolling decides the active section.
    // This prevents selecting, deselecting and reselecting during smooth scroll.
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

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

            <div className="dealWorkspaceCActions" aria-label="Разделы сделки">
              {DEAL_NAV_ITEMS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className="secondary"
                  data-deal-section={id}
                  aria-current={activeSection === id ? 'location' : undefined}
                  onClick={() => goToSection(id)}
                >
                  {label}
                </button>
              ))}

              {canManageDeal && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    onEditDeal();
                    window.setTimeout(() =>
                      document.getElementById('dealCClient')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      }), 0);
                  }}
                >
                  Редактировать данные
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
