import type { Dispatch, SetStateAction } from 'react';
import type { Deal, Invoice } from '../../types';
import type { BackgroundUploadJob } from '../../backgroundUploads';
import { Field } from '../../shared/Field';
import { formatMoneyInput, money, paymentStatusLabel, sellerLabels } from '../../shared/formatters';
import { dealFileUrl } from '../../api';
import { dealInvoiceWorkflowLabel, dealInvoiceWorkflowTone } from './dealWorkflow';

type QuickEdit = 'invoiceAmount' | 'incomingAmount' | 'shipmentDate' | null;
type Setter<T> = Dispatch<SetStateAction<T>>;
type DealOverviewProps = {
  deal: Deal;
  current: Invoice | undefined;
  invoiceRequestUploadJob: BackgroundUploadJob | undefined;
  canManageDeal: boolean;
  quickEdit: QuickEdit;
  setQuickEdit: Setter<QuickEdit>;
  supplierPurchases: NonNullable<Deal['supplierPurchases']>;
  incomingTotal: number;
  supplierNames: string[];
  incomingWorkflowTone: string;
  incomingWorkflowStatus: string;
  managerAmount: string;
  setManagerAmount: Setter<string>;
  copyDealValue: (value: string) => void;
  saving: boolean;
  saveQuickInvoiceAmount: () => Promise<void>;
  editableIncomingPurchase: NonNullable<Deal['supplierPurchases']>[number] | undefined;
  incomingAmountDraft: string;
  setIncomingAmountDraft: Setter<string>;
  saveQuickIncomingAmount: () => Promise<void>;
  shipmentDate: string;
  setShipmentDate: Setter<string>;
  saveQuickShipmentDate: () => Promise<void>;
};

export function DealOverview({
  deal,
  current,
  invoiceRequestUploadJob,
  canManageDeal,
  quickEdit,
  setQuickEdit,
  supplierPurchases,
  incomingTotal,
  supplierNames,
  incomingWorkflowTone,
  incomingWorkflowStatus,
  managerAmount,
  setManagerAmount,
  copyDealValue,
  saving,
  saveQuickInvoiceAmount,
  editableIncomingPurchase,
  incomingAmountDraft,
  setIncomingAmountDraft,
  saveQuickIncomingAmount,
  shipmentDate,
  setShipmentDate,
  saveQuickShipmentDate,
}: DealOverviewProps) {
  return (
      <div id="dealCOverview" className="dealOverview dealCAnchor">

        <div className="dealOverviewHead">

          <div>
            <div className="dealOverviewMeta">
              <span>
                ЗК-{deal.internalNumber}
              </span>

              <span>
                {
                  deal.createdAt
                    ? 'Создан ' +
                      new Date(
                        deal.createdAt
                      ).toLocaleString(
                        'ru-RU',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                    : 'Дата создания не указана'
                }
              </span>
            </div>

            <h2>
              {
                current
                  ? sellerLabels[
                      current.sellerType ||
                      deal.sellerType
                    ] +
                    '-' +
                    current.number
                  : 'Счёт готовится'
              }
            </h2>

            {(current?.fileId || current?.file?.id) && (
              <a
                className="dealOverviewInvoiceLink"
                href={
                  dealFileUrl(
                    current.fileId ||
                    current.file!.id
                  )
                }
                target="_blank"
                rel="noreferrer"
              >
                Открыть готовый счёт
              </a>
            )}
          </div>

          <div
            className={
              'dealOverviewInvoiceStatus dealInvoiceStatus-' +
              (
                invoiceRequestUploadJob?.status === 'RUNNING' &&
                !current
                  ? 'creating'
                  : dealInvoiceWorkflowTone(deal)
              )
            }
          >
            <span>
              Статус счёта
            </span>
            <b>
              {
                invoiceRequestUploadJob?.status === 'RUNNING' &&
                !current
                  ? 'Счёт на создании'
                  : dealInvoiceWorkflowLabel(deal)
              }
            </b>
          </div>

        </div>


        <div className="dealOverviewGrid">

          <button
            type="button"
            className="dealMetric dealMetricButton"
            disabled={!current || !canManageDeal}
            onClick={() =>
              setQuickEdit(
                quickEdit === 'invoiceAmount'
                  ? null
                  : 'invoiceAmount'
              )
            }
          >
            <span>Сумма счёта</span>
            <b>
              {
                current?.amount
                  ? money(
                      current.amount
                    )
                  : 'Не указана'
              }
            </b>
            {current && canManageDeal && (
              <em>Изменить / скопировать</em>
            )}
          </button>


          <button
            type="button"
            className="dealMetric dealMetricButton"
            disabled={
              supplierPurchases.length === 0 ||
              !canManageDeal
            }
            onClick={() =>
              setQuickEdit(
                quickEdit === 'incomingAmount'
                  ? null
                  : 'incomingAmount'
              )
            }
          >
            <span>Входящая сумма</span>
            <b>
              {
                incomingTotal > 0
                  ? money(incomingTotal)
                  : 'Не указана'
              }
            </b>
            {supplierPurchases.length > 0 &&
              canManageDeal && (
              <em>Изменить / скопировать</em>
            )}
          </button>


          <button
            type="button"
            className="dealMetric dealMetricButton"
            disabled={!canManageDeal}
            onClick={() =>
              setQuickEdit(
                quickEdit === 'shipmentDate'
                  ? null
                  : 'shipmentDate'
              )
            }
          >
            <span>Дата доставки</span>
            <b>
              {
                deal.plannedShipmentAt
                  ? new Date(
                      deal.plannedShipmentAt
                    ).toLocaleDateString(
                      'ru-RU'
                    )
                  : 'Не указана'
              }
            </b>
            {canManageDeal && (
              <em>Изменить / скопировать</em>
            )}
          </button>


          <div className="dealMetric">
            <span>Поставщик</span>

            {supplierNames.length > 0 ? (
              <div className="supplierBadgeList">
                {supplierNames.map(
                  (supplier, index) => (
                  <b
                    className="supplierBadge"
                    key={supplier + index}
                  >
                    {supplier}
                  </b>
                ))}
              </div>
            ) : (
              <b>Поставщик не выбран</b>
            )}
          </div>


          <div
            className={
              'dealMetric dealIncomingWorkflow dealIncomingWorkflow-' +
              incomingWorkflowTone
            }
          >
            <span>Входящий</span>
            <b>{incomingWorkflowStatus}</b>
          </div>


          <div className="dealMetric">
            <span>Оплата клиента</span>
            <b>
              {
                paymentStatusLabel(
                  deal.paymentStatus
                )
              }
            </b>
          </div>

        </div>


        {quickEdit === 'invoiceAmount' &&
          current && (

          <div className="dealQuickEditor">

            <Field title="Сумма счёта">
              <input
                inputMode="decimal"
                value={managerAmount}
                onChange={(e) =>
                  setManagerAmount(
                    formatMoneyInput(
                      e.target.value
                    )
                  )
                }
                placeholder="215 000"
              />
            </Field>

            <div className="dealQuickActions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  copyDealValue(
                    current.amount
                      ? money(current.amount)
                      : ''
                  )
                }
              >
                Скопировать
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={saveQuickInvoiceAmount}
              >
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>

              <button
                type="button"
                className="dealQuickClose"
                onClick={() =>
                  setQuickEdit(null)
                }
              >
                ×
              </button>
            </div>

          </div>

        )}


        {quickEdit === 'incomingAmount' && (

          <div className="dealQuickEditor">

            {editableIncomingPurchase ? (
              <>
                <Field title="Входящая сумма">
                  <input
                    inputMode="decimal"
                    value={incomingAmountDraft}
                    onChange={(e) =>
                      setIncomingAmountDraft(
                        formatMoneyInput(
                          e.target.value
                        )
                      )
                    }
                    placeholder="180 000"
                  />
                </Field>

                <div className="dealQuickActions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      copyDealValue(
                        incomingTotal > 0
                          ? money(incomingTotal)
                          : ''
                      )
                    }
                  >
                    Скопировать
                  </button>

                  <button
                    type="button"
                    className="primary"
                    disabled={saving}
                    onClick={saveQuickIncomingAmount}
                  >
                    {saving ? 'Сохраняем…' : 'Сохранить'}
                  </button>

                  <button
                    type="button"
                    className="dealQuickClose"
                    onClick={() =>
                      setQuickEdit(null)
                    }
                  >
                    ×
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="dealQuickMessage">
                  {
                    supplierPurchases.length > 1
                      ? 'Сумма рассчитана по нескольким поставщикам. Измените нужную закупку в блоке «Поставщики».'
                      : 'Сначала добавьте поставщика и сумму входящего счёта.'
                  }
                </div>

                <div className="dealQuickActions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={incomingTotal <= 0}
                    onClick={() =>
                      copyDealValue(
                        incomingTotal > 0
                          ? money(incomingTotal)
                          : ''
                      )
                    }
                  >
                    Скопировать
                  </button>

                  <button
                    type="button"
                    className="dealQuickClose"
                    onClick={() =>
                      setQuickEdit(null)
                    }
                  >
                    ×
                  </button>
                </div>
              </>
            )}

          </div>

        )}


        {quickEdit === 'shipmentDate' && (

          <div className="dealQuickEditor">

            <Field title="Дата доставки">
              <input
                type="date"
                value={shipmentDate}
                onChange={(e) =>
                  setShipmentDate(
                    e.target.value
                  )
                }
              />
            </Field>

            <div className="dealQuickActions">
              <button
                type="button"
                className="secondary"
                disabled={!deal.plannedShipmentAt}
                onClick={() =>
                  copyDealValue(
                    deal.plannedShipmentAt
                      ? new Date(
                          deal.plannedShipmentAt
                        ).toLocaleDateString(
                          'ru-RU'
                        )
                      : ''
                  )
                }
              >
                Скопировать
              </button>

              <button
                type="button"
                className="primary"
                disabled={saving}
                onClick={saveQuickShipmentDate}
              >
                {saving ? 'Сохраняем…' : 'Сохранить'}
              </button>

              <button
                type="button"
                className="dealQuickClose"
                onClick={() =>
                  setQuickEdit(null)
                }
              >
                ×
              </button>
            </div>

          </div>

        )}

      </div>
  );
}
