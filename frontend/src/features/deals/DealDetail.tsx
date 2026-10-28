import type { InvoiceReviewDraft } from '../../InvoiceManagerReviewV10';
/* MSM_FIXES_V10 */
import { useEffect, useState } from 'react';
import { formatMoneyInput } from '../../shared/formatters';
import { EtrnSourceDocuments } from '../../EtrnSourceDocuments';
import { TaskContextStrip } from '../../TaskContextStrip';
import { useBackgroundUploads } from '../../backgroundUploads';
import { PurchasesBlock } from '../../PurchasesBlock';
import { PowerOfAttorneyBlock } from '../../PowerOfAttorneyBlock';
import { updateDealInfo, getDeal } from '../../api';
import { DealStageControl } from './DealStageControl';
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
import { createDealQuickActions } from './actions/dealQuickActions';
import { createDealClientActions } from './actions/dealClientActions';
import { createDealInvoiceRequestActions } from './actions/dealInvoiceRequestActions';
import { createDealInvoiceApprovalActions } from './actions/dealInvoiceApprovalActions';
import { createDealInvoiceCorrectionActions } from './actions/dealInvoiceCorrectionActions';

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

  const [invoiceReviewDraft, setInvoiceReviewDraft] = useState<InvoiceReviewDraft | null>(null);

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


  const {
    parsedManagerAmount,
    copyDealValue,
    saveQuickInvoiceAmount,
    saveQuickShipmentDate,
    saveQuickIncomingAmount,
  } = createDealQuickActions({
    dealId, user, current, managerAmount, shipmentDate,
    incomingAmountDraft, editableIncomingPurchase,
    setQuickEdit, setSaving, setError, reload,
  });


  function openCorrectionEditor() {
    if (correctionOpen) {setCorrectionOpen(false);return;}
    const activeDeal = deal;

    if (!activeDeal) {
      return;
    }

    setCorrectionSellerType(
      activeDeal.sellerType
    );
    setCorrectionOpen(true);
  }


  const {
    normalizedPhone,
    saveDealInfo,
    addDeliveryAddress,
    removeDeliveryAddress,
    openMax,
  } = createDealClientActions({
    dealId, user, editClientPhone, editClientName,
    editContactName, editManagerComment, editAddresses,
    setEditAddresses, setDealInfoOpen, setPhoneMenuOpen,
    setSaving, setError, reload,
  });


  const {
    saveInvoiceRequestSeller,
    sendInvoiceRequestAgain,
    withdrawRequest,
  } = createDealInvoiceRequestActions({
    dealId, user, deal, requestSellerType, requestUrgent,
    requestClientName, requestAccountingComment, requestRequestText,
    requestIncomingInvoice, requestExtraFiles, setSaving, setError,
    setInvoiceRequestEditOpen, setRequestIncomingInvoice,
    setRequestExtraFiles, setRequestUrgent, setWithdrawConfirmOpen, reload,
  });


  const { saveInvoiceData, confirm } = createDealInvoiceApprovalActions({
    invoiceReviewDraft,
    dealId, user, deal, current, managerAmount, shipmentDate,
    parsedManagerAmount, setInvoiceMenuOpen, setSaving, setError, reload,
  });


  const { withdrawCorrectionRequest, sendCorrection } = createDealInvoiceCorrectionActions({
    dealId, user, deal, current, correction, correctionPrimaryFile,
    correctionFiles, urgent, correctionSellerType, setSaving, setError,
    setCorrectionWithdrawOpen, setCorrection, setCorrectionPrimaryFile,
    setCorrectionFiles, setUrgent, setCorrectionOpen, reload,
  });


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
          <DealStageControl deal={deal} user={user} onChanged={() => reload(false)} />

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
        invoiceReviewDraft={invoiceReviewDraft}
        setInvoiceReviewDraft={setInvoiceReviewDraft}
        deal={deal}
        current={current}
        canManageDeal={canManageDeal}
        reviewerId={user.id}
        onInvoiceReviewed={() => reload(false)}
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
