import type { Dispatch, SetStateAction } from 'react';
import { requestInvoiceCorrection, withdrawInvoiceCorrection } from '../../../api';
import { startBackgroundUploadJob } from '../../../backgroundUploads';
import type { CurrentUser, Deal, Invoice, SellerType } from '../../../types';

type Set<T> = Dispatch<SetStateAction<T>>;

type DealInvoiceCorrectionActionArgs = {
  dealId: string;
  user: CurrentUser;
  deal: Deal | null;
  current: Invoice | undefined;
  correction: string;
  correctionPrimaryFile: File | null;
  correctionFiles: File[];
  urgent: boolean;
  correctionSellerType: SellerType;
  setSaving: Set<boolean>;
  setError: Set<string>;
  setCorrectionWithdrawOpen: Set<boolean>;
  setCorrection: Set<string>;
  setCorrectionPrimaryFile: Set<File | null>;
  setCorrectionFiles: Set<File[]>;
  setUrgent: Set<boolean>;
  setCorrectionOpen: Set<boolean>;
  reload: (showLoading?: boolean) => Promise<void>;
};

/** Existing correction/withdraw handlers extracted without behavioral changes. */
export function createDealInvoiceCorrectionActions({
  dealId, user, deal, current, correction, correctionPrimaryFile,
  correctionFiles, urgent, correctionSellerType, setSaving, setError,
  setCorrectionWithdrawOpen, setCorrection, setCorrectionPrimaryFile,
  setCorrectionFiles, setUrgent, setCorrectionOpen, reload,
}: DealInvoiceCorrectionActionArgs) {
  async function withdrawCorrectionRequest() {

    if (!current) {
      return;
    }


    setSaving(true);
    setError('');


    try {
      await withdrawInvoiceCorrection(
        dealId,
        current.id,
        user.id,
      );

      setCorrectionWithdrawOpen(false);
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


  async function sendCorrection() {

    if (!current) {
      return;
    }


    const activeDeal =
      deal;


    if (!activeDeal) {
      return;
    }


    const hasFiles =
      Boolean(
        correctionPrimaryFile
      ) ||
      correctionFiles.length > 0;


    const correctionText =
      correction.trim() ||
      (
        hasFiles
          ? 'Приложены документы для корректировки'
          : ''
      );


    if (!correctionText) {
      return;
    }


    setSaving(true);
    setError('');


    try {

      const task:
        any =
        await requestInvoiceCorrection(
          dealId,
          current.id,
          {
            actorId:
              user.id,

            comment:
              correctionText,

            urgent,

            sellerType:
              correctionSellerType,
          },
        );


      const filesToUpload =
        [
          ...(
            correctionPrimaryFile
              ? [correctionPrimaryFile]
              : []
          ),
          ...correctionFiles,
        ];


      if (
        filesToUpload.length > 0
      ) {

        const primaryFile =
          correctionPrimaryFile;


        const extraFiles =
          [...correctionFiles];


        startBackgroundUploadJob({

          taskId:
            task.id,

          // PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS
          dealId:
            activeDeal.id,

          title:
            'Отправляем документы на корректировку',

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
                  activeDeal.id,
                  primaryFile,

                  'CORRECTION_PRIMARY_' +
                  task.id,

                  uploadIndex,
                  filesToUpload.length,
                );


                uploadIndex++;
              }


              for (
                let index = 0;
                index <
                  extraFiles.length;
                index++
              ) {

                await upload(
                  activeDeal.id,

                  extraFiles[
                    index
                  ],

                  'CORRECTION_ATTACHMENT_' +
                  task.id,

                  uploadIndex,
                  filesToUpload.length,
                );


                uploadIndex++;
              }


              setProgress(99);
            },
        });
      }


      setCorrection('');
      setCorrectionPrimaryFile(null);
      setCorrectionFiles([]);
      setUrgent(false);
      setCorrectionOpen(false);


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

  return { withdrawCorrectionRequest, sendCorrection };
}
