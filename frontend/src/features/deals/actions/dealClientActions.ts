import type { Dispatch, SetStateAction } from 'react';
import { updateDealInfo } from '../../../api';
import type { CurrentUser } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealClientActionArgs = {
  dealId: string;
  user: CurrentUser;
  editClientPhone: string;
  editClientName: string;
  editContactName: string;
  editManagerComment: string;
  editAddresses: string[];
  setEditAddresses: Set<string[]>;
  setDealInfoOpen: Set<boolean>;
  setPhoneMenuOpen: Set<boolean>;
  setSaving: Set<boolean>;
  setError: Set<string>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing client handlers, moved without changing their behavior. */
export function createDealClientActions({
  dealId, user, editClientPhone, editClientName,
  editContactName, editManagerComment, editAddresses,
  setEditAddresses, setDealInfoOpen, setPhoneMenuOpen,
  setSaving, setError, reload,
}: DealClientActionArgs) {
  function normalizedPhone() {

    let digits =
      editClientPhone
        .replace(/\D/g, '');


    if (
      digits.length === 11 &&
      digits.startsWith('8')
    ) {

      digits =
        '7' +
        digits.slice(1);
    }


    return digits;
  }


  async function saveDealInfo() {

    setSaving(true);
    setError('');


    try {

      await updateDealInfo(
        dealId,
        {
          clientName:
            editClientName
              .trim() ||
            undefined,

          contactName:
            editContactName
              .trim() ||
            undefined,

          clientPhone:
            editClientPhone
              .trim() ||
            undefined,

          managerComment:
            editManagerComment
              .trim() ||
            undefined,

          deliveryAddresses:
            editAddresses
              .map(
                (value) =>
                  value.trim()
              )
              .filter(Boolean),

          actorId:
            user.id,
        },
      );


      setDealInfoOpen(false);
      setPhoneMenuOpen(false);

      await reload(false);


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


  function addDeliveryAddress() {

    setEditAddresses(
      (current) => [
        ...current,
        '',
      ]
    );
  }


  function removeDeliveryAddress(
    index: number,
  ) {

    setEditAddresses(
      (current) =>
        current.filter(
          (_, currentIndex) =>
            currentIndex !==
            index
        )
    );
  }


  function openMax() {

    const digits =
      normalizedPhone();


    if (!digits) {
      return;
    }


    void navigator.clipboard
      ?.writeText(
        '+' + digits
      )
      .catch(
        () => undefined
      );


    window.open(
      'https://max.ru/',
      '_blank',
      'noopener,noreferrer'
    );
  }


  return {
    normalizedPhone,
    saveDealInfo,
    addDeliveryAddress,
    removeDeliveryAddress,
    openMax,
  };
}
