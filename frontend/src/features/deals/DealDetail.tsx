import { useEffect, useState } from 'react';
import { formatMoneyInput, parseMoneyInput } from '../../shared/formatters';
import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';
import { TaskContextStrip } from '../../TaskContextStrip';
import { startBackgroundUploadJob, useBackgroundUploads } from '../../backgroundUploads';
import { PurchasesBlock } from '../../PurchasesBlock';
import { PowerOfAttorneyBlock } from '../../PowerOfAttorneyBlock';
import { updateDealInfo, updateShipmentDate, updateSupplierPurchase, updateInvoiceAmount, confirmInvoice, getDeal, requestInvoiceCorrection, resubmitInvoiceRequest, withdrawInvoiceRequest, withdrawInvoiceCorrection } from '../../api';
import type { CurrentUser, Deal, SellerType } from '../../types';
import { PaymentBlock } from './payments/PaymentBlock';
import { supplierIncomingWorkflowLabel } from './dealWorkflow';
import { DealSummarySections } from './DealSummarySections';
import { DealUploadProgress } from './DealUploadProgress';
import { DealSidebar } from './DealSidebar';
import { DealAttention } from './DealAttention';
import { DealClientSection } from './DealClientSection';
import { DealOverview } from './DealOverview';
import { DealIncomingInvoices } from './DealIncomingInvoices';
import { InvoiceRequestPanel } from './invoices/InvoiceRequestPanel';
import { InvoiceCorrectionPanel } from './invoices/InvoiceCorrectionPanel';

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

      <InvoiceRequestPanel
        deal={deal}
        current={current}
        canManageDeal={canManageDeal}
        invoiceRequestEditOpen={invoiceRequestEditOpen}
        setInvoiceRequestEditOpen={setInvoiceRequestEditOpen}
        invoiceRequestTask={invoiceRequestTask}
        requestSellerType={requestSellerType}
        setRequestSellerType={setRequestSellerType}
        saving={saving}
        saveInvoiceRequestSeller={saveInvoiceRequestSeller}
        invoiceRequestUploadJob={invoiceRequestUploadJob}
        invoiceRequestNeedsData={invoiceRequestNeedsData}
        latestInvoiceReturn={latestInvoiceReturn}
        requestClientName={requestClientName}
        setRequestClientName={setRequestClientName}
        requestRequestText={requestRequestText}
        setRequestRequestText={setRequestRequestText}
        requestAccountingComment={requestAccountingComment}
        setRequestAccountingComment={setRequestAccountingComment}
        currentCustomerInvoice={currentCustomerInvoice}
        requestIncomingInvoice={requestIncomingInvoice}
        setRequestIncomingInvoice={setRequestIncomingInvoice}
        requestExistingExtraFiles={requestExistingExtraFiles}
        requestExtraFiles={requestExtraFiles}
        setRequestExtraFiles={setRequestExtraFiles}
        requestUrgent={requestUrgent}
        setRequestUrgent={setRequestUrgent}
        sendInvoiceRequestAgain={sendInvoiceRequestAgain}
        withdrawConfirmOpen={withdrawConfirmOpen}
        setWithdrawConfirmOpen={setWithdrawConfirmOpen}
        withdrawRequest={withdrawRequest}
      />

      <InvoiceCorrectionPanel
        deal={deal}
        current={current}
        canManageInvoice={canManageInvoice}
        canConfirm={canConfirm}
        saving={saving}
        openCorrectionEditor={openCorrectionEditor}
        confirm={confirm}
        correctionUploadRunning={correctionUploadRunning}
        correctionWithdrawOpen={correctionWithdrawOpen}
        setCorrectionWithdrawOpen={setCorrectionWithdrawOpen}
        withdrawCorrectionRequest={withdrawCorrectionRequest}
        correctionOpen={correctionOpen}
        setCorrectionOpen={setCorrectionOpen}
        correctionSellerType={correctionSellerType}
        setCorrectionSellerType={setCorrectionSellerType}
        correction={correction}
        setCorrection={setCorrection}
        correctionPrimaryFile={correctionPrimaryFile}
        setCorrectionPrimaryFile={setCorrectionPrimaryFile}
        correctionFiles={correctionFiles}
        setCorrectionFiles={setCorrectionFiles}
        urgent={urgent}
        setUrgent={setUrgent}
        sendCorrection={sendCorrection}
      />

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
