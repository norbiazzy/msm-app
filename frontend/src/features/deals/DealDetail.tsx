import { useEffect, useState } from 'react';
import { Field } from '../../shared/Field';
import { formatMoneyInput, money, parseMoneyInput, paymentStatusLabel, sellerLabels } from '../../shared/formatters';
import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';
import { TaskContextStrip } from '../../TaskContextStrip';
import { MultiFilePicker, SingleFilePicker } from '../../MultiFilePicker';
import { startBackgroundUploadJob, useBackgroundUploads } from '../../backgroundUploads';
import { PurchasesBlock } from '../../PurchasesBlock';
import { PowerOfAttorneyBlock } from '../../PowerOfAttorneyBlock';
import { updateDealInfo, updateShipmentDate, updateSupplierPurchase, updateInvoiceAmount, confirmInvoice, dealFileUrl, getDeal, requestInvoiceCorrection, resubmitInvoiceRequest, withdrawInvoiceRequest, withdrawInvoiceCorrection } from '../../api';
import type { CurrentUser, Deal, SellerType } from '../../types';
import { InvoiceBlock } from './invoices/InvoiceViews';
import { PaymentBlock } from './payments/PaymentBlock';
import { dealInvoiceWorkflowLabel, dealInvoiceWorkflowTone, supplierIncomingWorkflowLabel } from './dealWorkflow';
import { DealSummarySections } from './DealSummarySections';
import { DealUploadProgress } from './DealUploadProgress';
import { DealSidebar } from './DealSidebar';
import { DealAttention } from './DealAttention';
import { DealClientSection } from './DealClientSection';
import { DealOverview } from './DealOverview';
import { DealIncomingInvoices } from './DealIncomingInvoices';

export function DealDetail({
  dealId,
  user,
  onBack,
}: {
  dealId: string;
  user: CurrentUser;
  onBack: () => void;
}) {

  const backgroundUploads =
    useBackgroundUploads();

  const [deal, setDeal] =
    useState<Deal | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    correctionOpen,
    setCorrectionOpen,
  ] = useState(false);

  const [
    correction,
    setCorrection,
  ] = useState('');

  const [
    correctionFiles,
    setCorrectionFiles,
  ] = useState<File[]>([]);

  const [
    correctionPrimaryFile,
    setCorrectionPrimaryFile,
  ] = useState<File | null>(null);

  const [urgent, setUrgent] =
    useState(false);

  const [
    correctionSellerType,
    setCorrectionSellerType,
  ] = useState<SellerType>('MSM');

  const [
    quickEdit,
    setQuickEdit,
  ] = useState<
    'invoiceAmount' |
    'incomingAmount' |
    'shipmentDate' |
    null
  >(null);

  const [
    incomingAmountDraft,
    setIncomingAmountDraft,
  ] = useState('');

  const [saving, setSaving] =
    useState(false);

  const [
    managerAmount,
    setManagerAmount,
  ] = useState('');

  const [
    invoiceMenuOpen,
    setInvoiceMenuOpen,
  ] = useState(false);

  const [
    shipmentDate,
    setShipmentDate,
  ] = useState('');

  const [
    dealInfoOpen,
    setDealInfoOpen,
  ] = useState(false);

  const [
    phoneMenuOpen,
    setPhoneMenuOpen,
  ] = useState(false);

  const [
    incomingHistoryOpen,
    setIncomingHistoryOpen,
  ] = useState(false);

  const [
    editClientName,
    setEditClientName,
  ] = useState('');

  const [
    editContactName,
    setEditContactName,
  ] = useState('');

  const [
    editClientPhone,
    setEditClientPhone,
  ] = useState('');

  const [
    editManagerComment,
    setEditManagerComment,
  ] = useState('');

  const [
    editAddresses,
    setEditAddresses,
  ] = useState<string[]>([]);

  const [
    requestClientName,
    setRequestClientName,
  ] = useState('');

  const [
    requestSellerType,
    setRequestSellerType,
  ] = useState<SellerType>('MSM');

  const [
    requestAccountingComment,
    setRequestAccountingComment,
  ] = useState('');

  const [
    requestRequestText,
    setRequestRequestText,
  ] = useState('');

  const [
    requestIncomingInvoice,
    setRequestIncomingInvoice,
  ] = useState<File | null>(null);

  const [
    requestExtraFiles,
    setRequestExtraFiles,
  ] = useState<File[]>([]);

  const [
    requestUrgent,
    setRequestUrgent,
  ] = useState(false);

  const [
    withdrawConfirmOpen,
    setWithdrawConfirmOpen,
  ] = useState(false);

  const [
    correctionWithdrawOpen,
    setCorrectionWithdrawOpen,
  ] = useState(false);

  const [
    invoiceRequestEditOpen,
    setInvoiceRequestEditOpen,
  ] = useState(false);


  async function reload(
    showLoading = true,
  ) {

    if (showLoading) {
      setLoading(true);
    }


    try {

      const next =
        await getDeal(
          dealId
        );


      setDeal(next);
      setError('');


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      if (showLoading) {
        setLoading(false);
      }
    }
  }


  useEffect(
    () => {

      void reload(true);

    },
    [dealId],
  );


  useEffect(
    () => {

      if (!deal) {
        return;
      }


      const currentInvoice =
        deal.invoices.find(
          (invoice) =>
            invoice.isCurrent
        ) ??
        deal.invoices[0];


      setManagerAmount(
        currentInvoice?.amount
          ? formatMoneyInput(
              String(
                currentInvoice.amount
              )
            )
          : ''
      );

    },
    [deal],
  );


  useEffect(
    () => {

      setShipmentDate(
        deal?.plannedShipmentAt
          ?.slice(0, 10) ||
        ''
      );

    },
    [
      deal?.plannedShipmentAt,
    ],
  );


  useEffect(
    () => {
      const purchases =
        deal?.supplierPurchases || [];

      if (purchases.length === 1) {
        setIncomingAmountDraft(
          purchases[0]
            .incomingInvoiceAmount
            ? formatMoneyInput(
                String(
                  purchases[0]
                    .incomingInvoiceAmount
                )
              )
            : ''
        );
      } else {
        setIncomingAmountDraft('');
      }
    },
    [deal?.supplierPurchases],
  );


  useEffect(
    () => {

      setEditClientName(
        deal?.clientName ||
        ''
      );

      setEditContactName(
        deal?.contactName ||
        ''
      );

      setEditClientPhone(
        deal?.clientPhone ||
        ''
      );

      setEditManagerComment(
        deal?.managerComment ||
        ''
      );

      setEditAddresses(
        deal?.deliveryAddresses &&
        Array.isArray(
          deal.deliveryAddresses
        )
          ? [...deal.deliveryAddresses]
          : []
      );

      const activeInvoiceRequest =
        deal?.tasks.find(
          (task) =>
            task.type ===
              'ISSUE_CLIENT_INVOICE' &&
            ![
              'DONE',
              'CANCELLED',
            ].includes(task.status)
        );

      setRequestClientName(
        deal?.clientName || ''
      );

      setRequestRequestText(
        deal?.requestText || ''
      );

      setRequestUrgent(
        Boolean(activeInvoiceRequest?.urgent)
      );

      setRequestSellerType(
        deal?.sellerType ||
        'MSM'
      );

      setCorrectionSellerType(
        deal?.sellerType ||
        'MSM'
      );

      setRequestAccountingComment(
        deal?.accountingComment || ''
      );

    },
    [
      deal?.contactName,
      deal?.clientPhone,
      deal?.managerComment,
      deal?.deliveryAddresses,
      deal?.clientName,
      deal?.requestText,
      deal?.tasks,
      deal?.sellerType,
      deal?.accountingComment,
    ],
  );


  useEffect(
    () => {
      if (!phoneMenuOpen) {
        return;
      }

      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setPhoneMenuOpen(false);
        }
      };

      window.addEventListener('keydown', closeOnEscape);

      return () => {
        window.removeEventListener('keydown', closeOnEscape);
      };
    },
    [phoneMenuOpen],
  );


  if (loading) {

    return (

      <section className="content">

        <div className="empty">
          Загрузка сделки…
        </div>

      </section>
    );
  }


  if (!deal) {

    return (

      <section className="content">

        <div className="error">
          {
            error ||
            'Сделка не найдена'
          }
        </div>

      </section>
    );
  }


  const current =
    deal.invoices.find(
      (invoice) =>
        invoice.isCurrent
    ) ??
    deal.invoices[0];


  const customerInvoiceHistory =
    (deal.files || [])
      .filter(
        (file) =>
          file.category ===
            'CUSTOMER_INVOICE_PRIMARY' ||
          file.category
            ?.startsWith(
              'CORRECTION_PRIMARY_'
            )
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const currentCustomerInvoice =
    customerInvoiceHistory[
      customerInvoiceHistory.length - 1
    ];


  const previousCustomerInvoices =
    customerInvoiceHistory.slice(
      0,
      -1,
    );


  const requestExistingExtraFiles =
    (deal.files || [])
      .filter(
        (file) =>
          file.category ===
          'MANAGER_ATTACHMENT'
      )
      .sort(
        (a, b) =>
          new Date(
            a.createdAt || 0
          ).getTime() -
          new Date(
            b.createdAt || 0
          ).getTime()
      );


  const invoiceRequestTask =
    deal.tasks.find(
      (task) =>
        task.type ===
          'ISSUE_CLIENT_INVOICE' &&
        ![
          'DONE',
          'CANCELLED',
        ].includes(
          task.status
        )
    );

  // PART_1N_J1_TS_INVOICE_NEED_DATA
  const invoiceRequestNeedsData: boolean =
    Boolean(
      invoiceRequestTask &&
      invoiceRequestTask.status ===
        'NEED_DATA'
    );



  const invoiceRequestUploadJob =
    backgroundUploads.find(
      (job) =>
        job.dealId === dealId &&
        (
          !job.scope ||
          job.scope === 'DEAL'
        )
    );


  // PART_V064_O22_EXISTING_DEAL_UPLOAD_PROGRESS
  const dealUploadJob =
    invoiceRequestUploadJob;


  const correctionTask =
    deal.tasks.find(
      (task) =>
        task.type ===
          'CORRECT_CLIENT_INVOICE' &&
        !['DONE', 'CANCELLED'].includes(
          task.status
        )
    );


  const correctionUploadRunning =
    Boolean(
      correctionTask &&
      backgroundUploads.some(
        (job) =>
          job.taskId ===
            correctionTask.id &&
          job.status === 'RUNNING'
      )
    );


  const latestInvoiceReturn =
    deal.auditEvents?.find(
      (event) =>
        event.action ===
          'INVOICE_REQUEST_RETURNED' &&
        (
          !invoiceRequestTask ||
          !event.entityId ||
          event.entityId ===
            invoiceRequestTask.id
        )
    );


  const supplierPurchases =
    deal.supplierPurchases || [];


  const incomingTotal =
    supplierPurchases.reduce(
      (sum, purchase) =>
        sum +
        Number(
          purchase.incomingInvoiceAmount ||
          0
        ),
      0,
    );


  const supplierNames =
    Array.from(
      new Set(
        supplierPurchases
          .map(
            (purchase) =>
              purchase.supplierName
          )
          .filter(Boolean)
      )
    );


  const supplierIncomingRows =
    supplierPurchases
      .map((purchase) => {

        const purchaseFiles =
          (deal.files || [])
            .filter(
              (file) =>
                file.category ===
                'SUPPLIER_INVOICE_' +
                purchase.id
            )
            .sort(
              (a, b) =>
                new Date(
                  a.createdAt || 0
                ).getTime() -
                new Date(
                  b.createdAt || 0
                ).getTime()
            );


        const file =
          purchaseFiles[
            purchaseFiles.length - 1
          ];


        return file
          ? { purchase, file }
          : null;
      })
      .filter(
        (item): item is {
          purchase: (typeof supplierPurchases)[number];
          file: NonNullable<Deal['files']>[number];
        } => Boolean(item)
      );


  const showDealIncomingInvoices =
    supplierIncomingRows.length > 0 ||
    Boolean(currentCustomerInvoice);


  const incomingWorkflowStatus =
    supplierIncomingWorkflowLabel(
      deal
    );


  const incomingWorkflowTone =
    incomingWorkflowStatus ===
      'Входящий оплачен'
      ? 'paid'
      : incomingWorkflowStatus ===
          'Входящий на оплате'
        ? 'paying'
        : incomingWorkflowStatus ===
            'Входящий не оплачен'
          ? 'unpaid'
          : 'empty';


  const editableIncomingPurchase =
    supplierPurchases.length === 1
      ? supplierPurchases[0]
      : undefined;


  const canManageDeal =
    [
      'MANAGER',
      'LEADER',
      'ADMIN',
    ].includes(
      user.role
    );


  const canManageInvoice =
    Boolean(current) &&
    canManageDeal;


  const canConfirm =
    canManageInvoice &&
    current?.status ===
      'WAITING_MANAGER_REVIEW';


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


  function openCorrectionEditor() {
    const activeDeal = deal;

    if (!activeDeal) {
      return;
    }

    setCorrectionSellerType(
      activeDeal.sellerType
    );
    setCorrectionOpen(true);
  }


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
        current.amount === null

          ? undefined

          : Number(
              current.amount
            );


      if (
        parsed !== undefined &&
        (
          currentAmount ===
            undefined ||

          Math.abs(
            currentAmount -
            parsed
          ) > 0.001
        )
      ) {

        await updateInvoiceAmount(
          dealId,
          current.id,
          {
            amount: parsed,
            actorId: user.id,
          },
        );
      }


      await confirmInvoice(
        dealId,
        current.id,
        user.id,
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

  return (

    <section className="content form dealWorkspaceCPage">
      <DealUploadProgress
        dealUploadJob={dealUploadJob}
        invoiceRequestUploadJob={invoiceRequestUploadJob}
      />

      <button
        className="backLink"
        onClick={onBack}
      >
        ← К сделкам
      </button>

      {/* PART_V064_O1_DEAL_WORKSPACE_C */}
      <div className="dealWorkspaceCLayout">

        <DealSidebar
          deal={deal}
          current={current}
          incomingTotal={incomingTotal}
          canManageDeal={canManageDeal}
          onEditDeal={() => setDealInfoOpen(true)}
        />

        <div className="dealWorkspaceCMain">

          <DealAttention deal={deal} />

      <DealOverview
        deal={deal}
        current={current}
        invoiceRequestUploadJob={invoiceRequestUploadJob}
        canManageDeal={canManageDeal}
        quickEdit={quickEdit}
        setQuickEdit={setQuickEdit}
        supplierPurchases={supplierPurchases}
        incomingTotal={incomingTotal}
        supplierNames={supplierNames}
        incomingWorkflowTone={incomingWorkflowTone}
        incomingWorkflowStatus={incomingWorkflowStatus}
        managerAmount={managerAmount}
        setManagerAmount={setManagerAmount}
        copyDealValue={copyDealValue}
        saving={saving}
        saveQuickInvoiceAmount={saveQuickInvoiceAmount}
        editableIncomingPurchase={editableIncomingPurchase}
        incomingAmountDraft={incomingAmountDraft}
        setIncomingAmountDraft={setIncomingAmountDraft}
        saveQuickIncomingAmount={saveQuickIncomingAmount}
        shipmentDate={shipmentDate}
        setShipmentDate={setShipmentDate}
        saveQuickShipmentDate={saveQuickShipmentDate}
      />

      <DealIncomingInvoices
        showDealIncomingInvoices={showDealIncomingInvoices}
        supplierIncomingRows={supplierIncomingRows}
        currentCustomerInvoice={currentCustomerInvoice}
        previousCustomerInvoices={previousCustomerInvoices}
        incomingHistoryOpen={incomingHistoryOpen}
        setIncomingHistoryOpen={setIncomingHistoryOpen}
      />

      <DealClientSection
        deal={deal}
        canManageDeal={canManageDeal}
        dealInfoOpen={dealInfoOpen}
        setDealInfoOpen={setDealInfoOpen}
        phoneMenuOpen={phoneMenuOpen}
        setPhoneMenuOpen={setPhoneMenuOpen}
        normalizedPhone={normalizedPhone}
        openMax={openMax}
        editClientName={editClientName}
        setEditClientName={setEditClientName}
        editContactName={editContactName}
        setEditContactName={setEditContactName}
        editClientPhone={editClientPhone}
        setEditClientPhone={setEditClientPhone}
        editManagerComment={editManagerComment}
        setEditManagerComment={setEditManagerComment}
        editAddresses={editAddresses}
        setEditAddresses={setEditAddresses}
        addDeliveryAddress={addDeliveryAddress}
        removeDeliveryAddress={removeDeliveryAddress}
        saving={saving}
        saveDealInfo={saveDealInfo}
      />

      <div
        id="dealCInvoice"
        className="dealCAnchor"
      >
      {current ? (

        <InvoiceBlock
          invoice={current}
          sellerType={
            current.sellerType ||
            deal.sellerType
          }
        />

      ) : (

        <div className="infoBox">

          <strong>
            Счёт ещё не готов
          </strong>

          <p>
            Бухгалтерия пока не
            загрузила клиентский счёт.
          </p>

        </div>

      )}
      </div>


      {!current &&
        canManageDeal && (

        <div className="invoiceRequestManagerBox">

          {!invoiceRequestEditOpen &&
            invoiceRequestTask?.status !== 'NEED_DATA' && (

          <div className="invoiceRequestSellerSummary">

            <div>
              <span>
                От кого выставляем
              </span>

              <strong>
                {sellerLabels[deal.sellerType]}
              </strong>
            </div>


            {invoiceRequestTask &&
              invoiceRequestTask.status !== 'NEED_DATA' && (

              <button
                type="button"
                className="secondary compactButton"
                onClick={() =>
                  setInvoiceRequestEditOpen(
                    (value) => !value
                  )
                }
              >
                {
                  invoiceRequestEditOpen
                    ? 'Закрыть'
                    : 'Изменить'
                }
              </button>

            )}

          </div>

          )}


          {invoiceRequestEditOpen &&
            invoiceRequestTask &&
            invoiceRequestTask.status !== 'NEED_DATA' && (

            <div className="invoiceRequestSellerEditor">

              {invoiceRequestTask.status ===
                'IN_PROGRESS' && (

                <div className="invoiceRequestEditWarning">
                  Бухгалтер уже работает. Изменение «от кого» сразу отобразится в задаче.
                </div>

              )}


              <div className="segmented">

                {(['ST', 'MSM', 'IP'] as SellerType[]).map(
                  (type) => (

                  <button
                    type="button"
                    key={type}
                    className={
                      requestSellerType === type
                        ? 'selected'
                        : ''
                    }
                    onClick={() =>
                      setRequestSellerType(type)
                    }
                  >
                    {sellerLabels[type]}
                  </button>

                ))}

              </div>


              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={saving}
                  onClick={() => {
                    setRequestSellerType(
                      deal.sellerType
                    );
                    setInvoiceRequestEditOpen(false);
                  }}
                >
                  Отмена
                </button>

                <button
                  type="button"
                  className="primary"
                  disabled={
                    saving ||
                    requestSellerType === deal.sellerType
                  }
                  onClick={saveInvoiceRequestSeller}
                >
                  {
                    saving
                      ? 'Сохраняем…'
                      : 'Сохранить'
                  }
                </button>
              </div>

            </div>

          )}





          {invoiceRequestUploadJob && (

            <div
              className={
                'invoiceRequestUploadState invoiceRequestUpload-' +
                invoiceRequestUploadJob.status.toLowerCase()
              }
            >

              <div className="invoiceRequestUploadTop">
                <strong>
                  {
                    invoiceRequestUploadJob.status === 'SUCCESS'
                      ? '✓ ' +
                        (invoiceRequestUploadJob.successTitle ||
                          invoiceRequestUploadJob.title)
                      : invoiceRequestUploadJob.status === 'ERROR'
                        ? 'Не удалось отправить документы'
                        : invoiceRequestUploadJob.title
                  }
                </strong>

                <b>
                  {invoiceRequestUploadJob.progress}%
                </b>
              </div>

              <div className="invoiceRequestUploadBar">
                <span
                  style={{
                    width:
                      invoiceRequestUploadJob.progress + '%',
                  }}
                />
              </div>

              {invoiceRequestUploadJob.status === 'RUNNING' && (
                <span>
                  {
                    invoiceRequestUploadJob.currentFile
                      ? 'Сейчас: ' +
                        invoiceRequestUploadJob.currentFile
                      : 'Сохраняем данные и отправляем запрос…'
                  }
                </span>
              )}

              {invoiceRequestUploadJob.status === 'ERROR' &&
                invoiceRequestUploadJob.error && (
                  <span>
                    {invoiceRequestUploadJob.error}
                  </span>
                )}

            </div>

          )}


          {(
            !invoiceRequestTask &&
            invoiceRequestEditOpen
          ) ? (

            <>

              {invoiceRequestNeedsData ? (

                <>
                  <div className="invoiceRequestReturnedHead">
                    <div>
                      <strong>
                        Бухгалтерия вернула запрос
                      </strong>

                      <span>
                        Исправьте данные и отправьте ту же задачу повторно.
                      </span>
                    </div>

                    <b>Нужны данные</b>
                  </div>


                  <div className="invoiceReturnReason">
                    <span>Причина</span>
                    <strong>
                      {
                        String(
                          latestInvoiceReturn
                            ?.newValue
                            ?.reasonLabel ||
                          'Не указана'
                        )
                      }
                    </strong>

                    {latestInvoiceReturn?.reason && (
                      <p>
                        {latestInvoiceReturn.reason}
                      </p>
                    )}
                  </div>
                </>

              ) : (

                <div className="invoiceRequestReturnedHead invoiceRequestWithdrawnHead">
                  <div>
                    <strong>
                      Запрос отозван
                    </strong>

                    <span>
                      Внесите нужные изменения и отправьте запрос бухгалтерии заново.
                    </span>
                  </div>

                  <b>Редактирование</b>
                </div>

              )}


              <div className="invoiceRequestRepairForm">

                <Field title="От кого выставляем">
                  <div className="segmented">
                    {(['ST', 'MSM', 'IP'] as SellerType[]).map(
                      (type) => (
                      <button
                        type="button"
                        key={type}
                        className={
                          requestSellerType === type
                            ? 'selected'
                            : ''
                        }
                        onClick={() =>
                          setRequestSellerType(type)
                        }
                      >
                        {sellerLabels[type]}
                      </button>
                    ))}
                  </div>
                </Field>


                <Field title="На кого выставлять">
                  <input
                    value={requestClientName}
                    onChange={(e) =>
                      setRequestClientName(
                        e.target.value
                      )
                    }
                  />
                </Field>

                <Field title="Позиции и стоимость">
                  <textarea
                    rows={5}
                    value={requestRequestText}
                    onChange={(e) =>
                      setRequestRequestText(
                        e.target.value
                      )
                    }
                    placeholder="Bonolit D500 — 32,4 м³ × 5 600 ₽…"
                  />
                </Field>


                <Field title="Комментарий бухгалтерии">
                  <textarea
                    rows={3}
                    value={requestAccountingComment}
                    onChange={(e) =>
                      setRequestAccountingComment(
                        e.target.value
                      )
                    }
                    placeholder="Условия, уточнения и всё, что нужно бухгалтеру для выставления счёта"
                  />
                </Field>

                <div className="requestPreviousIncoming">

                  <span>
                    Входящий счёт, который уже был отправлен бухгалтерии
                  </span>

                  {currentCustomerInvoice ? (

                    <div className="versionRow">

                      <div>
                        <b>
                          {currentCustomerInvoice.originalName}
                        </b>

                        <span>
                          Текущий исходный документ
                        </span>
                      </div>

                      <a
                        href={
                          dealFileUrl(
                            currentCustomerInvoice.id
                          )
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть
                      </a>

                    </div>

                  ) : (

                    <div className="requestPreviousIncomingEmpty">
                      Входящий счёт ранее не прикладывался
                    </div>

                  )}

                </div>


                <Field title="Заменить входящий счёт, если нужно">
                  <SingleFilePicker
                    file={requestIncomingInvoice}
                    onChange={setRequestIncomingInvoice}
                    title="+ Выбрать новый входящий счёт"
                    accept="application/pdf,image/*"
                  />
                </Field>


                {requestExistingExtraFiles.length > 0 && (
                  <div className="requestPreviousIncoming">
                    <span>
                      Документы / реквизиты, которые уже были отправлены бухгалтерии
                    </span>

                    <div className="versionList">
                      {requestExistingExtraFiles.map(
                        (file) => (
                          <div
                            className="versionRow"
                            key={file.id}
                          >
                            <div>
                              <b>{file.originalName}</b>
                              <span>Ранее отправленный документ</span>
                            </div>

                            <a
                              href={dealFileUrl(file.id)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Открыть
                            </a>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}


                <Field title="Добавить новые документы / реквизиты">
                  <MultiFilePicker
                    files={requestExtraFiles}
                    onChange={setRequestExtraFiles}
                    title="+ Прикрепить документы"
                  />
                </Field>


                <label className="urgentToggle">
                  <input
                    type="checkbox"
                    checked={requestUrgent}
                    onChange={(e) =>
                      setRequestUrgent(
                        e.target.checked
                      )
                    }
                  />
                  <span>Срочно</span>
                </label>


                <button
                  type="button"
                  className="primary wide"
                  disabled={saving}
                  onClick={sendInvoiceRequestAgain}
                >
                  {
                    saving
                      ? 'Отправляем…'
                      : invoiceRequestNeedsData
                        ? 'Сохранить и повторно отправить'
                        : 'Сохранить и отправить бухгалтерии'
                  }
                </button>


                {invoiceRequestNeedsData ? (
                  <button
                    type="button"
                    className="purchaseCancelButton"
                    disabled={saving}
                    onClick={() =>
                      setWithdrawConfirmOpen(true)
                    }
                  >
                    Отозвать запрос на счёт
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary wide"
                    disabled={saving}
                    onClick={() =>
                      setInvoiceRequestEditOpen(false)
                    }
                  >
                    Отмена
                  </button>
                )}

              </div>
            </>

          ) : invoiceRequestTask ? (

            <>
              {/* PART_1N_I1_DEAL_REPAIR_MOVED */}

              {invoiceRequestNeedsData ? (

                <div className="invoiceRequestMovedToTask">
                  <div>
                    <strong>
                      Бухгалтерия вернула запрос
                    </strong>

                    <span>
                      Исправление теперь выполняется
                      непосредственно в задаче.
                    </span>
                  </div>

                  <a
                    className="primary"
                    href={
                      '#tasks/' +
                      encodeURIComponent(
                        invoiceRequestTask.id
                      )
                    }
                  >
                    Открыть задачу и исправить
                  </a>
                </div>

              ) : (

          

            <div className="invoiceRequestStateRow">
              <div>
                <strong>
                  {
                    invoiceRequestTask.status ===
                      'IN_PROGRESS'
                      ? 'Бухгалтер выставляет счёт'
                      : 'Запрос отправлен бухгалтерии'
                  }
                </strong>

                <span>
                  {
                    invoiceRequestTask.status ===
                      'IN_PROGRESS'
                      ? 'Задача уже взята в работу.'
                      : 'Все загруженные документы доступны бухгалтерии.'
                  }
                </span>
              </div>

              {invoiceRequestTask.status !==
                'IN_PROGRESS' && (
                <button
                  type="button"
                  className="purchaseCancelButton invoiceRequestWithdrawCompact"
                  disabled={saving}
                  onClick={() =>
                    setWithdrawConfirmOpen(true)
                  }
                >
                  Отозвать
                </button>
              )}
            </div>

          

              )}

            </>

          ) : (

            <div className="invoiceRequestStateRow">
              <div>
                <strong>
                  Запрос на счёт не активен
                </strong>
                <span>
                  Его можно отправить бухгалтерии снова.
                </span>
              </div>

              <button
                type="button"
                className="primary"
                disabled={
                  saving ||
                  invoiceRequestUploadJob?.status === 'RUNNING'
                }
                onClick={() =>
                  setInvoiceRequestEditOpen(true)
                }
              >
                Редактировать и отправить снова
              </button>
            </div>

          )}


          {withdrawConfirmOpen && (
            <div
              className="appModalBackdrop"
              onClick={() =>
                setWithdrawConfirmOpen(false)
              }
            >
              <div
                className="appModal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <strong>
                  Отозвать запрос на счёт?
                </strong>

                <p>
                  Если бухгалтер ещё не начал работу, задача будет отменена. Сама сделка и документы останутся в приложении.
                </p>

                <div className="appModalActions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={saving}
                    onClick={() =>
                      setWithdrawConfirmOpen(false)
                    }
                  >
                    Не отзывать
                  </button>

                  <button
                    type="button"
                    className="dangerButton"
                    disabled={saving}
                    onClick={withdrawRequest}
                  >
                    {
                      saving
                        ? 'Отзываем…'
                        : 'Отозвать'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      )}


      {current &&
        canManageInvoice &&
        current.status !== 'CORRECTION_REQUESTED' && (

        <div
          className={
            'invoiceDecisionBar' +
            (!canConfirm
              ? ' invoiceDecisionBarSingle'
              : '')
          }
        >

          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={openCorrectionEditor}
          >
            Скорректировать
          </button>

          {canConfirm && (
            <button
              type="button"
              className="primary"
              disabled={saving}
              onClick={confirm}
            >
              {
                saving
                  ? 'Сохраняем…'
                  : 'Всё верно'
              }
            </button>
          )}

        </div>

      )}


      {current?.status ===
        'CORRECTION_REQUESTED' && (

        <div className="infoBox correctionPending">

          <div className="correctionPendingHead">
            <div>
              <strong>
                Счёт отправлен на корректировку
              </strong>

              <p>
                Текущая версия остаётся видна в истории. Пока бухгалтер не взял корректировку в работу, её можно отозвать.
              </p>
            </div>

            {canManageInvoice && (
              <button
                type="button"
                className="secondary compactButton"
                disabled={
                  saving ||
                  correctionUploadRunning
                }
                onClick={() =>
                  setCorrectionWithdrawOpen(true)
                }
              >
                {correctionUploadRunning
                  ? 'Загружаем документы…'
                  : 'Отозвать корректировку'}
              </button>
            )}
          </div>

        </div>

      )}


      {correctionWithdrawOpen &&
        current && (

        <div
          className="appModalBackdrop"
          onClick={() =>
            setCorrectionWithdrawOpen(false)
          }
        >
          <div
            className="appModal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <strong>
              Отозвать корректировку?
            </strong>

            <p>
              Если бухгалтер ещё не начал работу, задача на корректировку будет отменена, а текущая версия счёта вернётся в предыдущее состояние.
            </p>

            <div className="appModalActions">
              <button
                type="button"
                className="secondary"
                disabled={saving}
                onClick={() =>
                  setCorrectionWithdrawOpen(false)
                }
              >
                Не отзывать
              </button>

              <button
                type="button"
                className="dangerButton"
                disabled={saving}
                onClick={withdrawCorrectionRequest}
              >
                {saving
                  ? 'Отзываем…'
                  : 'Отозвать'}
              </button>
            </div>
          </div>
        </div>

      )}


      {correctionOpen &&
        current && (

        <div className="correctionBox">

          <div className="correctionTitle">

            <div>

              <strong>
                Корректировка счёта
              </strong>

              <span>
                Текущий счёт {sellerLabels[current.sellerType || deal.sellerType]}-{current.number}. Новую версию выставить от {sellerLabels[correctionSellerType]}.
              </span>

            </div>


            <button
              type="button"
              className="invoiceMenuClose"

              onClick={() =>
                setCorrectionOpen(
                  false
                )
              }
            >
              ×
            </button>

          </div>


          <Field title="От кого выставляем">

            <div className="segmented">
              {(['ST', 'MSM', 'IP'] as SellerType[]).map(
                (type) => (
                <button
                  type="button"
                  key={type}
                  className={
                    correctionSellerType === type
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setCorrectionSellerType(type)
                  }
                >
                  {sellerLabels[type]}
                </button>
              ))}
            </div>

          </Field>


          <Field title="Что нужно изменить">

            <textarea
              rows={4}

              value={correction}

              onChange={(e) =>
                setCorrection(
                  e.target.value
                )
              }

              placeholder="Например: изменить количество или стоимость"
            />

          </Field>


          <Field title="Основной входящий счёт">

            <SingleFilePicker
              file={correctionPrimaryFile}
              onChange={setCorrectionPrimaryFile}
              title="+ Выбрать основной счёт"
              accept="application/pdf,image/*"
            />

            <span className="fieldHint">
              Бухгалтеру ориентироваться по этому файлу
            </span>

          </Field>


          <Field title="Дополнительные документы">

            <MultiFilePicker
              files={correctionFiles}
              onChange={
                setCorrectionFiles
              }
              title="+ Прикрепить дополнительно"
            />

          </Field>


          <label className="urgentToggle">

            <input
              type="checkbox"

              checked={urgent}

              onChange={(e) =>
                setUrgent(
                  e.target.checked
                )
              }
            />

            <span>
              Срочная корректировка
            </span>

          </label>


          <button
            className="primary wide"
            disabled={
              saving ||
              (
                !correction.trim() &&
                !correctionPrimaryFile &&
                correctionFiles.length ===
                  0
              )
            }

            onClick={sendCorrection}
          >

            {
              saving
                ? 'Отправляем…'
                : 'Отправить на корректировку'
            }

          </button>

        </div>

      )}


      <div
        id="dealCPayments"
        className="dealCAnchor"
      >
      <PaymentBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />
      </div>


      <div
        id="dealCIncoming"
        className="dealCAnchor"
      >
      <PurchasesBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />
      </div>


      <div
        id="dealCDocuments"
        className="dealCAnchor"
      >
      <PowerOfAttorneyBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />
      </div>


      <DealSummarySections deal={deal} />

      {error && (

        <div className="error">
          {error}
        </div>

      )}

        </div>
      </div>

    </section>
  );
}
