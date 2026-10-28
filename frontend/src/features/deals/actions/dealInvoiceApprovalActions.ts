import type { InvoiceReviewDraft } from '../../../InvoiceManagerReviewV10';
import type { Dispatch, SetStateAction } from 'react';
import { updateInvoiceAmount, updateShipmentDate, confirmInvoice } from '../../../api';
import type { CurrentUser, Deal, Invoice } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealInvoiceApprovalActionArgs = {
  invoiceReviewDraft: InvoiceReviewDraft | null;
  dealId: string;
  user: CurrentUser;
  deal: Deal | null;
  current: Invoice | undefined;
  managerAmount: string;
  shipmentDate: string;
  parsedManagerAmount: () => number | undefined;
  setInvoiceMenuOpen: Set<boolean>;
  setSaving: Set<boolean>;
  setError: Set<string>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing invoice approval and save handlers, extracted without behavioral changes. */
export function createDealInvoiceApprovalActions({
  invoiceReviewDraft,
  dealId, user, deal, current, managerAmount, shipmentDate,
  parsedManagerAmount, setInvoiceMenuOpen, setSaving, setError, reload,
}: DealInvoiceApprovalActionArgs) {
  async function saveInvoiceData() {

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

      const currentAmount =
        current.amount ===
          undefined ||
        current.amount ===
          null

          ? undefined

          : Number(
              current.amount
            );


      if (
        (
          parsed !== undefined &&
          (
            currentAmount ===
              undefined ||

            Math.abs(
              currentAmount -
              parsed
            ) > 0.001
          )
        ) ||

        (
          parsed === undefined &&
          currentAmount !==
            undefined
        )
      ) {

        await updateInvoiceAmount(
          dealId,
          current.id,
          {
            amount:
              parsed,

            actorId:
              user.id,
          },
        );
      }


      const currentShipment =
        deal?.plannedShipmentAt
          ?.slice(0, 10) ||
        '';


      if (
        shipmentDate !==
        currentShipment
      ) {

        await updateShipmentDate(
          dealId,
          {
            plannedShipmentAt:
              shipmentDate ||
              undefined,

            actorId:
              user.id,
          },
        );
      }


      setInvoiceMenuOpen(
        false
      );


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


  async function confirm() {

    if (!current) {
      return;
    }


    const draft = invoiceReviewDraft?.invoiceId === current.id ? invoiceReviewDraft : null;
    const parsedAmount = draft ? Number(draft.amount.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.')) : undefined;
    if (draft && (!draft.number.trim() || draft.number.trim() === 'Ожидает проверки' || !Number.isFinite(parsedAmount) || parsedAmount! <= 0)) {
      setError('Укажите номер счёта и сумму больше нуля.');return;
    }
    setSaving(true);
    setError('');
    try {
      await confirmInvoice(
        dealId,
        current.id,
        user.id,
        draft ? {number:draft.number.trim(),amount:parsedAmount!} : undefined,
      );


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




  return { saveInvoiceData, confirm };
}
