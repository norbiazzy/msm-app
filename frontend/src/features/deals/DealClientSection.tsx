import { AutoTextarea } from '../../AutoTextarea';
import type { Dispatch, SetStateAction } from 'react';
import type { Deal } from '../../types';
import { Field } from '../../shared/Field';

type Setter<T> = Dispatch<SetStateAction<T>>;

type DealClientSectionProps = {
  deal: Deal;
  canManageDeal: boolean;
  dealInfoOpen: boolean;
  setDealInfoOpen: Setter<boolean>;
  phoneMenuOpen: boolean;
  setPhoneMenuOpen: Setter<boolean>;
  normalizedPhone: () => string;
  openMax: () => void;
  editClientName: string;
  setEditClientName: Setter<string>;
  editContactName: string;
  setEditContactName: Setter<string>;
  editClientPhone: string;
  setEditClientPhone: Setter<string>;
  editManagerComment: string;
  setEditManagerComment: Setter<string>;
  editAddresses: string[];
  setEditAddresses: Setter<string[]>;
  addDeliveryAddress: () => void;
  removeDeliveryAddress: (index: number) => void;
  saving: boolean;
  saveDealInfo: () => Promise<void>;
};

export function DealClientSection({
  deal,
  canManageDeal,
  dealInfoOpen,
  setDealInfoOpen,
  phoneMenuOpen,
  setPhoneMenuOpen,
  normalizedPhone,
  openMax,
  editClientName,
  setEditClientName,
  editContactName,
  setEditContactName,
  editClientPhone,
  setEditClientPhone,
  editManagerComment,
  setEditManagerComment,
  editAddresses,
  setEditAddresses,
  addDeliveryAddress,
  removeDeliveryAddress,
  saving,
  saveDealInfo,
}: DealClientSectionProps) {
  return (
      <div id="dealCClient" className="dealInfoBox dealCAnchor">

        <div className="dealInfoHead">

          <strong>
            Клиент
          </strong>


          {canManageDeal && (

            <button
              type="button"
              className="dealInfoEditButton"
              aria-label="Редактировать клиента"
              title="Редактировать клиента"

              onClick={() =>
                setDealInfoOpen(
                  (value) =>
                    !value
                )
              }
            >
              {dealInfoOpen ? '×' : '•••'}
            </button>

          )}

        </div>


        {!dealInfoOpen ? (

          <div className="dealInfoView">

            <div className="dealInfoRow dealInfoCompany">

              <span>
                Компания
              </span>

              <b>
                {deal.clientName}
              </b>

            </div>


            <div className="dealInfoRow">

              <span>
                Контактное лицо
              </span>

              <b>
                {
                  deal.contactName ||
                  'Не указано'
                }
              </b>

            </div>


            <div className="dealInfoRow">

              <span>
                Телефон заказчика
              </span>


              {deal.clientPhone ? (

                <div className="dealPhoneWrap">

                  <button
                    type="button"
                    className="dealPhoneButton"

                    onClick={() =>
                      setPhoneMenuOpen(
                        (value) =>
                          !value
                      )
                    }
                  >
                    {deal.clientPhone}
                    <b>•••</b>
                  </button>


                  {phoneMenuOpen && (

                    <>

                      <button
                        type="button"
                        className="popoverDismissLayer"
                        aria-label="Закрыть меню"
                        onClick={() =>
                          setPhoneMenuOpen(false)
                        }
                      />

                      <div
                        className="dealPhoneMenu"
                        onClick={() =>
                          setPhoneMenuOpen(false)
                        }
                      >

                      <a
                        href={
                          'tel:+' +
                          normalizedPhone()
                        }
                      >
                        Позвонить
                      </a>


                      <a
                        href={
                          'https://t.me/+' +
                          normalizedPhone()
                        }

                        target="_blank"
                        rel="noreferrer"
                      >
                        Telegram
                      </a>


                      <a
                        href={
                          'https://wa.me/' +
                          normalizedPhone()
                        }

                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>


                      <button
                        type="button"
                        onClick={openMax}
                      >
                        MAX
                      </button>


                      <button
                        type="button"

                        onClick={() => {

                          void navigator
                            .clipboard
                            ?.writeText(
                              deal.clientPhone ||
                              ''
                            );

                          setPhoneMenuOpen(
                            false
                          );
                        }}
                      >
                        Скопировать номер
                      </button>

                      </div>

                    </>

                  )}

                </div>

              ) : (

                <b>Не указан</b>

              )}

            </div>


            <div className="dealInfoRow dealInfoComment">

              <span>
                Комментарий менеджера
              </span>

              <b>
                {
                  deal.managerComment ||
                  'Нет комментария'
                }
              </b>

            </div>


            <div className="dealInfoRow dealInfoAddress">

              <span>
                Адреса доставки
              </span>


              {
                deal.deliveryAddresses &&
                deal.deliveryAddresses
                  .length > 0 ? (

                <div className="deliveryAddressList">

                  {deal.deliveryAddresses.map(
                    (
                      address,
                      index,
                    ) => (

                    <b
                      key={
                        address +
                        index
                      }
                    >
                      {address}
                    </b>

                  ))}

                </div>

              ) : (

                <b>
                  Не указаны
                </b>

              )}

            </div>

          </div>

        ) : (

          <div className="dealInfoForm">

            <Field title="Компания">

              <input
                value={editClientName}
                onChange={(e) =>
                  setEditClientName(
                    e.target.value
                  )
                }
                placeholder="ООО «Главолснаб»"
              />

            </Field>


            <Field title="Контактное лицо">

              <input
                value={
                  editContactName
                }

                onChange={(e) =>
                  setEditContactName(
                    e.target.value
                  )
                }

                placeholder="Имя заказчика"
              />

            </Field>


            <Field title="Телефон заказчика">

              <input
                value={
                  editClientPhone
                }

                onChange={(e) =>
                  setEditClientPhone(
                    e.target.value
                  )
                }

                placeholder="+7..."
              />

            </Field>


            <Field title="Комментарий менеджера">

              <AutoTextarea
                rows={3}

                value={
                  editManagerComment
                }

                onChange={(e) =>
                  setEditManagerComment(
                    e.target.value
                  )
                }

                placeholder="Например: созвониться перед отгрузкой"
              />

            </Field>


            <div className="deliveryAddressEditor">

              <div className="deliveryAddressEditorHead">

                <span>
                  Адреса доставки
                </span>

                <button
                  type="button"
                  className="secondary compactButton"

                  onClick={
                    addDeliveryAddress
                  }
                >
                  + Адрес
                </button>

              </div>


              {
                editAddresses.length ===
                  0 && (

                <div className="microcopy">
                  Адреса пока не добавлены
                </div>

              )}


              {editAddresses.map(
                (
                  address,
                  index,
                ) => (

                <div
                  className="deliveryAddressEditRow"
                  key={index}
                >

                  <input
                    value={address}

                    onChange={(e) => {

                      const value =
                        e.target.value;


                      setEditAddresses(
                        (current) =>
                          current.map(
                            (
                              item,
                              itemIndex,
                            ) =>
                              itemIndex ===
                                index
                                ? value
                                : item
                          )
                      );
                    }}

                    placeholder="Адрес доставки"
                  />


                  <button
                    type="button"
                    className="deliveryAddressRemove"

                    onClick={() =>
                      removeDeliveryAddress(
                        index
                      )
                    }
                  >
                    ×
                  </button>

                </div>

              ))}

            </div>


            <button
              type="button"
              className="primary wide"

              disabled={saving}

              onClick={
                saveDealInfo
              }
            >
              {
                saving
                  ? 'Сохраняем…'
                  : 'Сохранить информацию'
              }
            </button>

          </div>

        )}

      </div>
  );
}
