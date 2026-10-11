import type { Dispatch, SetStateAction } from 'react';
import { updateDealInfo, resubmitInvoiceRequest, withdrawInvoiceRequest } from '../../../api';
import { startBackgroundUploadJob } from '../../../backgroundUploads';
import type { CurrentUser, Deal, SellerType } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealInvoiceRequestActionArgs = {
  dealId: string;
  user: CurrentUser;
  deal: Deal | null;
  requestSellerType: SellerType;
  requestUrgent: boolean;
  requestClientName: string;
  requestAccountingComment: string;
  requestRequestText: string;
  requestIncomingInvoice: File | null;
  requestExtraFiles: File[];
  setSaving: Set<boolean>;
  setError: Set<string>;
  setInvoiceRequestEditOpen: Set<boolean>;
  setRequestIncomingInvoice: Set<File | null>;
  setRequestExtraFiles: Set<File[]>;
  setRequestUrgent: Set<boolean>;
  setWithdrawConfirmOpen: Set<boolean>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing request/resubmission/withdraw handlers, moved without changing behavior. */
export function createDealInvoiceRequestActions({
  dealId, user, deal, requestSellerType, requestUrgent,
  requestClientName, requestAccountingComment, requestRequestText,
  requestIncomingInvoice, requestExtraFiles, setSaving, setError,
  setInvoiceRequestEditOpen, setRequestIncomingInvoice,
  setRequestExtraFiles, setRequestUrgent, setWithdrawConfirmOpen, reload,
}: DealInvoiceRequestActionArgs) {
  async function saveInvoiceRequestSeller() {

    const activeDeal = deal;

    if (!activeDeal) {
      return;
    }

    if (
      requestSellerType ===
      activeDeal.sellerType
    ) {
      return;
    }


    setSaving(true);
    setError('');


    try {

      await updateDealInfo(
        dealId,
        {
          sellerType:
            requestSellerType,

          actorId:
            user.id,
        },
      );


      setInvoiceRequestEditOpen(false);

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


  async function sendInvoiceRequestAgain() {

    const activeDeal = deal;

    if (!activeDeal) {
      return;
    }


    setSaving(true);
    setError('');


    const requestPayload = {
      actorId:
        user.id,
      urgent:
        requestUrgent,
      sellerType:
        requestSellerType,
      clientName:
        requestClientName.trim() ||
        activeDeal.clientName,
      accountingComment:
        requestAccountingComment
          .trim() ||
        undefined,
      requestText:
        requestRequestText
          .trim() ||
        undefined,
    };


    try {

      const primaryFile =
        requestIncomingInvoice;

      const extraFiles =
        [...requestExtraFiles];

      const filesToUpload = [
        ...(primaryFile
          ? [primaryFile]
          : []),
        ...extraFiles,
      ];


      if (filesToUpload.length > 0) {

        startBackgroundUploadJob({
          dealId,
          title:
            'Отправляем документы бухгалтерии',
          successTitle:
            'Запрос отправлен бухгалтерии',
          subtitle:
            activeDeal.clientName,
          files:
            filesToUpload,

          run:
            async ({
              upload,
              setProgress,
            }) => {

              let uploadIndex = 0;


              if (primaryFile) {
                await upload(
                  dealId,
                  primaryFile,
                  'CUSTOMER_INVOICE_PRIMARY',
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              for (
                let index = 0;
                index < extraFiles.length;
                index++
              ) {
                await upload(
                  dealId,
                  extraFiles[index],
                  'MANAGER_ATTACHMENT',
                  uploadIndex,
                  filesToUpload.length,
                );

                uploadIndex++;
              }


              setProgress(95);

              await resubmitInvoiceRequest(
                dealId,
                requestPayload,
              );

              setProgress(99);
              await reload(false);
            },
        });


        setRequestIncomingInvoice(null);
        setRequestExtraFiles([]);
        setRequestUrgent(false);
        setInvoiceRequestEditOpen(false);
        setSaving(false);
        return;
      }


      await resubmitInvoiceRequest(
        dealId,
        requestPayload,
      );


      setRequestIncomingInvoice(null);
      setRequestExtraFiles([]);
      setRequestUrgent(false);
      setInvoiceRequestEditOpen(false);

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


  async function withdrawRequest() {

    setSaving(true);
    setError('');


    try {
      await withdrawInvoiceRequest(
        dealId,
        user.id,
      );

      setWithdrawConfirmOpen(false);
      setInvoiceRequestEditOpen(true);
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
    saveInvoiceRequestSeller,
    sendInvoiceRequestAgain,
    withdrawRequest,
  };
}
