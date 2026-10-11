import type { Dispatch, SetStateAction } from 'react';
import { parseMoneyInput } from '../../../shared/formatters';
import { updateInvoiceAmount, updateShipmentDate, updateSupplierPurchase } from '../../../api';
import type { CurrentUser, Deal, Invoice } from '../../../types';

type QuickEdit = 'invoiceAmount' | 'incomingAmount' | 'shipmentDate' | null;
type Set<T> = Dispatch<SetStateAction<T>>;

type DealQuickActionArgs = {
  dealId: string;
  user: CurrentUser;
  current: Invoice | undefined;
  managerAmount: string;
  shipmentDate: string;
  incomingAmountDraft: string;
  editableIncomingPurchase: NonNullable<Deal['supplierPurchases']>[number] | undefined;
  setQuickEdit: Set<QuickEdit>;
  setSaving: Set<boolean>;
  setError: Set<string>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Provides the existing quick-edit behavior without changing API requests. */
export function createDealQuickActions({
  dealId, user, current, managerAmount, shipmentDate,
  incomingAmountDraft, editableIncomingPurchase,
  setQuickEdit, setSaving, setError, reload,
}: DealQuickActionArgs) {
  function parsedManagerAmount() {

    return parseMoneyInput(
      managerAmount
    );
  }


  function copyDealValue(
    value: string,
  ) {
    void navigator.clipboard
      ?.writeText(value)
      .catch(
        () => undefined
      );
  }


  async function saveQuickInvoiceAmount() {

    if (!current) {
      return;
    }

    const parsed =
      parsedManagerAmount();

    if (
      managerAmount.trim() &&
      parsed === undefined
    ) {
      setError(
        'Проверьте сумму счёта'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateInvoiceAmount(
        dealId,
        current.id,
        {
          amount: parsed,
          actorId: user.id,
        },
      );

      setQuickEdit(null);
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


  async function saveQuickShipmentDate() {

    setSaving(true);
    setError('');

    try {
      await updateShipmentDate(
        dealId,
        {
          plannedShipmentAt:
            shipmentDate ||
            undefined,
          actorId: user.id,
        },
      );

      setQuickEdit(null);
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


  async function saveQuickIncomingAmount() {

    if (!editableIncomingPurchase) {
      return;
    }

    const parsed =
      parseMoneyInput(
        incomingAmountDraft
      );

    if (
      incomingAmountDraft.trim() &&
      parsed === undefined
    ) {
      setError(
        'Проверьте входящую сумму'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await updateSupplierPurchase(
        dealId,
        editableIncomingPurchase.id,
        {
          incomingInvoiceAmount:
            parsed,
          actorId: user.id,
        },
      );

      setQuickEdit(null);
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


  return {
    parsedManagerAmount,
    copyDealValue,
    saveQuickInvoiceAmount,
    saveQuickShipmentDate,
    saveQuickIncomingAmount,
  };
}
