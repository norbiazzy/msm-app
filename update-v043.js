const fs = require('fs');
const path = require('path');

const root = process.cwd();

const appPath =
  path.join(root, 'frontend/src/App.tsx');

const apiPath =
  path.join(root, 'frontend/src/api.ts');

const cssPath =
  path.join(root, 'frontend/src/styles.css');

const appModulePath =
  path.join(root, 'backend/src/app.module.ts');

const activityDir =
  path.join(root, 'backend/src/activity');

const recentPath =
  path.join(root, 'frontend/src/RecentActivityPanel.tsx');


for (const p of [
  appPath,
  apiPath,
  cssPath,
  appModulePath,
]) {

  if (!fs.existsSync(p)) {
    console.error('Missing: ' + p);
    process.exit(1);
  }
}


function backup(p) {

  const target =
    p + '.bak-v043';

  if (!fs.existsSync(target)) {
    fs.copyFileSync(p, target);
  }
}


[
  appPath,
  apiPath,
  cssPath,
  appModulePath,
].forEach(backup);


fs.mkdirSync(
  activityDir,
  { recursive: true }
);


// ======================================================
// BACKEND ACTIVITY
// ======================================================

fs.writeFileSync(
  path.join(
    activityDir,
    'activity.module.ts'
  ),

`import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
`,

  'utf8'
);


fs.writeFileSync(
  path.join(
    activityDir,
    'activity.controller.ts'
  ),

`import {
  Controller,
  Get,
} from '@nestjs/common';

import {
  ActivityService,
} from './activity.service';


@Controller('activity')
export class ActivityController {

  constructor(
    private readonly activity:
      ActivityService,
  ) {}


  @Get('recent')
  recent() {

    return this.activity.recent();
  }
}
`,

  'utf8'
);


fs.writeFileSync(
  path.join(
    activityDir,
    'activity.service.ts'
  ),

`import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';


@Injectable()
export class ActivityService {

  constructor(
    private readonly prisma:
      PrismaService,
  ) {}


  recent() {

    return this.prisma
      .auditEvent
      .findMany({

        take: 30,

        orderBy: {
          createdAt: 'desc',
        },

        include: {

          actor: {

            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },


          deal: {

            select: {

              id: true,
              internalNumber: true,
              clientName: true,
              sellerType: true,

              invoices: {

                where: {
                  isCurrent: true,
                },

                orderBy: {
                  createdAt: 'desc',
                },

                take: 1,

                select: {
                  number: true,
                },
              },
            },
          },
        },
      });
  }
}
`,

  'utf8'
);


// ======================================================
// APP MODULE
// ======================================================

let appModule =
  fs.readFileSync(
    appModulePath,
    'utf8'
  );


if (
  !appModule.includes(
    "./activity/activity.module"
  )
) {

  const moduleImport =
    "import { ActivityModule } from './activity/activity.module';\n";


  const lastImport =
    appModule.lastIndexOf(
      'import '
    );

  const endImport =
    appModule.indexOf(
      '\n',
      lastImport
    );


  appModule =
    appModule.slice(
      0,
      endImport + 1
    ) +
    moduleImport +
    appModule.slice(
      endImport + 1
    );
}


if (
  !/imports:\s*\[[^\]]*\bActivityModule\b/s
    .test(appModule)
) {

  appModule =
    appModule.replace(

      /imports:\s*\[([\s\S]*?)\]/,

      (
        full,
        inner,
      ) => {

        const clean =
          inner
            .trim()
            .replace(
              /,\s*$/,
              ''
            );


        return (
          'imports: [' +
          clean +
          ', ActivityModule]'
        );
      }
    );
}


fs.writeFileSync(
  appModulePath,
  appModule,
  'utf8'
);


// ======================================================
// FRONTEND API
// ======================================================

let api =
  fs.readFileSync(
    apiPath,
    'utf8'
  );


if (
  !api.includes(
    'export type RecentActivity'
  )
) {

  api += String.raw`


export type RecentActivity = {
  id: string;
  action: string;
  reason?: string;
  createdAt: string;

  newValue?: {
    amount?: number | string;
    supplierName?: string;
    number?: string;
  };

  actor?: {
    id: string;
    firstName: string;
    lastName?: string;
    role: string;
  };

  deal: {
    id: string;
    internalNumber: number;
    clientName: string;
    sellerType: 'ST' | 'MSM' | 'IP';

    invoices: {
      number: string;
    }[];
  };
};


export async function listRecentActivity() {

  return json<RecentActivity[]>(
    '/activity/recent'
  );
}
`;
}


fs.writeFileSync(
  apiPath,
  api,
  'utf8'
);


// ======================================================
// RECENT ACTIVITY PANEL
// ======================================================

const recentPanel = String.raw`
import {
  useEffect,
  useState,
} from 'react';

import {
  listRecentActivity,
  type RecentActivity,
} from './api';


const sellerLabels = {
  ST: '\u0421\u0422',
  MSM: '\u041c\u0421\u041c',
  IP: '\u0418\u041f',
};


function actionLabel(
  event: RecentActivity,
) {

  const supplier =
    event.newValue
      ?.supplierName;


  const amount =
    event.newValue
      ?.amount;


  if (
    event.action ===
    'SUPPLIER_PAYMENT_ADDED'
  ) {

    return supplier

      ? '\u041e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443 ' +
        supplier +
        (
          amount
            ? ' \u00b7 ' +
              Number(amount)
                .toLocaleString(
                  'ru-RU'
                ) +
              ' \u20bd'
            : ''
        )

      : '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443';
  }


  const labels:
    Record<string, string> = {

    CREATE:
      '\u0421\u043e\u0437\u0434\u0430\u043b \u0441\u0434\u0435\u043b\u043a\u0443',

    UPLOAD:
      '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u043b \u0441\u0447\u0451\u0442',

    CONFIRM:
      '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043b \u0441\u0447\u0451\u0442',

    REQUEST_CORRECTION:
      '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u043b \u0441\u0447\u0451\u0442 \u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443',

    CLIENT_PAYMENT_ADDED:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u043b \u043e\u043f\u043b\u0430\u0442\u0443 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',

    PAYMENT_STATUS_CHANGED:
      '\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0441\u0442\u0430\u0442\u0443\u0441 \u043e\u043f\u043b\u0430\u0442\u044b',

    SUPPLIER_PURCHASE_CREATED:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u043b \u0437\u0430\u043a\u0443\u043f\u043a\u0443',

    SUPPLIER_PURCHASE_UPDATED:
      '\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0437\u0430\u043a\u0443\u043f\u043a\u0443',

    SUPPLIER_PAYMENT_REQUESTED:
      '\u0417\u0430\u043f\u0440\u043e\u0441\u0438\u043b \u043e\u043f\u043b\u0430\u0442\u0443 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443',

    SUPPLIER_PAYMENT_STAMPED:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u043b \u043f\u043b\u0430\u0442\u0451\u0436\u043a\u0443 \u0441 \u043f\u0435\u0447\u0430\u0442\u044c\u044e',
  };


  return (
    labels[event.action] ||
    '\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0441\u0434\u0435\u043b\u043a\u0443'
  );
}


function dealLabel(
  event: RecentActivity,
) {

  const invoice =
    event.deal
      .invoices?.[0];


  if (invoice) {

    return (
      sellerLabels[
        event.deal.sellerType
      ] +
      '-' +
      invoice.number
    );
  }


  return (
    '\u0417\u041a-' +
    event.deal.internalNumber
  );
}


export function RecentActivityPanel() {

  const [
    events,
    setEvents,
  ] = useState<
    RecentActivity[]
  >([]);


  async function reload() {

    try {

      setEvents(
        await listRecentActivity()
      );

    } catch {
      // sidebar should not break deals
    }
  }


  useEffect(() => {

    void reload();


    const timer =
      window.setInterval(
        () => {
          void reload();
        },
        3000
      );


    return () =>
      window.clearInterval(
        timer
      );

  }, []);


  return (

    <aside className="recentActivity">

      <div className="recentActivityHead">

        <strong>
          \u041d\u0435\u0434\u0430\u0432\u043d\u0438\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f
        </strong>

        <span>
          {events.length}
        </span>

      </div>


      {events.length === 0 ? (

        <div className="recentActivityEmpty">
          \u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0441\u043e\u0431\u044b\u0442\u0438\u0439
        </div>

      ) : (

        <div className="recentActivityList">

          {events.slice(0, 15)
            .map(
              (event) => {

              const actor =
                event.actor

                  ? [
                      event.actor
                        .firstName,

                      event.actor
                        .lastName,
                    ]
                      .filter(Boolean)
                      .join(' ')

                  : '\u0421\u0438\u0441\u0442\u0435\u043c\u0430';


              return (

                <div
                  className="recentActivityRow"
                  key={event.id}
                >

                  <div className="recentActivityTop">

                    <b>
                      {dealLabel(event)}
                    </b>

                    <span>
                      {
                        new Date(
                          event.createdAt
                        )
                          .toLocaleTimeString(
                            'ru-RU',
                            {
                              hour:
                                '2-digit',
                              minute:
                                '2-digit',
                            }
                          )
                      }
                    </span>

                  </div>


                  <strong>
                    {actionLabel(event)}
                  </strong>


                  <div className="recentActivityWho">

                    {actor}

                    {' \u00b7 '}

                    {
                      event.deal
                        .clientName
                    }

                  </div>


                  {event.reason && (

                    <em>
                      {event.reason}
                    </em>

                  )}

                </div>

              );
            })}

        </div>

      )}

    </aside>
  );
}
`;


fs.writeFileSync(
  recentPath,
  recentPanel,
  'utf8'
);


// ======================================================
// APP.TSX
// ======================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );


if (
  !app.includes(
    "from './RecentActivityPanel'"
  )
) {

  app =
`import {
  RecentActivityPanel,
} from './RecentActivityPanel';
` +
    app;
}


// Make sure background imports exist.

if (
  !app.includes(
    "from './backgroundUploads'"
  )
) {

  app =
`import {
  BackgroundUploadList,
  startBackgroundUploadJob,
  useBackgroundUploads,
} from './backgroundUploads';
` +
    app;
}


// ======================================================
// REPLACE HOME
// ======================================================

const homeStart =
  app.indexOf(
    'function Home('
  );

const dealCardStart =
  app.indexOf(
    'function DealCard(',
    homeStart
  );


if (
  homeStart === -1 ||
  dealCardStart === -1
) {

  console.error(
    'Home component not found'
  );

  process.exit(1);
}


const homeComponent = String.raw`
function Home({
  deals,
  onNew,
  onOpen,
}: {
  deals: Deal[];
  onNew: () => void;
  onOpen: (id: string) => void;
}) {

  const backgroundUploads =
    useBackgroundUploads();


  const active =
    useMemo(
      () =>
        deals.filter(
          (deal) =>
            deal.status !==
            'CLOSED'
        ),
      [deals]
    );


  return (

    <section className="content homeContent">

      <BackgroundUploadList
        jobs={backgroundUploads}
      />


      <div className="homeLayout">

        <div className="homeDeals">

          <button
            className="primary wide"
            onClick={onNew}
          >
            + \u041d\u043e\u0432\u044b\u0439 \u0441\u0447\u0451\u0442
          </button>


          <div className="sectionHead">

            <h2>
              \u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0441\u0434\u0435\u043b\u043a\u0438
            </h2>

            <span>
              {active.length}
            </span>

          </div>


          <div className="dealList">

            {active.length === 0 && (

              <div className="empty">
                \u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0441\u0434\u0435\u043b\u043e\u043a.
              </div>

            )}


            {active.map(
              (deal) => (

              <DealCard
                key={deal.id}
                deal={deal}
                onOpen={() =>
                  onOpen(
                    deal.id
                  )
                }
              />

            ))}

          </div>

        </div>


        <RecentActivityPanel />

      </div>

    </section>
  );
}


`;


app =
  app.slice(
    0,
    homeStart
  ) +
  homeComponent +
  app.slice(
    dealCardStart
  );


// ======================================================
// NEW DEAL ASYNC ATTACHMENTS
// ======================================================

const newDealStart =
  app.indexOf(
    'function NewDealForm('
  );

const tasksStart =
  app.indexOf(
    'function TasksView(',
    newDealStart
  );


if (
  newDealStart === -1 ||
  tasksStart === -1
) {

  console.error(
    'NewDealForm not found'
  );

  process.exit(1);
}


let newDealSection =
  app.slice(
    newDealStart,
    tasksStart
  );


if (
  !newDealSection.includes(
    'attachments'
  )
) {

  console.error(
    'attachments state not found in NewDealForm'
  );

  process.exit(1);
}


const submitStart =
  newDealSection.indexOf(
    'async function submit('
  );

const returnStart =
  newDealSection.indexOf(
    '\n\n  return (',
    submitStart
  );


if (
  submitStart === -1 ||
  returnStart === -1
) {

  console.error(
    'submit() not found in NewDealForm'
  );

  process.exit(1);
}


const submitFunction = String.raw`
async function submit(
    e: FormEvent,
  ) {

    e.preventDefault();

    setError('');
    setUploadStatus('');
    setSaving(true);


    try {

      const filesToUpload =
        [...attachments];


      const deal =
        await createDeal({

          sellerType,

          clientName:
            clientName.trim() ||
            '\u0422\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u043a\u043b\u0438\u0435\u043d\u0442',

          clientPhone:
            clientPhone.trim() ||
            undefined,

          requestMode:
            'TEXT',

          requestText:
            requestText.trim() ||
            undefined,

          marginMode,

          marginValue:
            parseMoneyInput(
              marginValue
            ),

          accountingComment:
            accountingComment
              .trim() ||
            undefined,

          managerComment:
            managerComment
              .trim() ||
            undefined,

          urgent,

          managerId:
            user.id,

          createdById:
            user.id,
        });


      if (
        filesToUpload.length > 0
      ) {

        startBackgroundUploadJob({

          title:
            '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u043c \u0431\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u0438',

          subtitle:
            clientName.trim() ||
            '\u041d\u043e\u0432\u0430\u044f \u0441\u0434\u0435\u043b\u043a\u0430',

          files:
            filesToUpload,


          run:
            async ({
              upload,
              setProgress,
            }) => {

              for (
                let index = 0;
                index <
                  filesToUpload.length;
                index++
              ) {

                await upload(
                  deal.id,

                  filesToUpload[
                    index
                  ],

                  'MANAGER_ATTACHMENT',

                  index,

                  filesToUpload.length,
                );
              }


              setProgress(99);
            },
        });
      }


      onCreated();


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443'
      );


    } finally {

      setSaving(false);
    }
  }
`;


newDealSection =
  newDealSection.slice(
    0,
    submitStart
  ) +
  submitFunction +
  newDealSection.slice(
    returnStart
  );


app =
  app.slice(
    0,
    newDealStart
  ) +
  newDealSection +
  app.slice(
    tasksStart
  );


// ======================================================
// REPAIR AUDIT LABEL FUNCTION
// ======================================================

const auditStart =
  app.indexOf(
    'function auditLabel('
  );

const auditEnd =
  app.indexOf(
    'function paymentStatusLabel(',
    auditStart
  );


if (
  auditStart !== -1 &&
  auditEnd !== -1
) {

  const audit = String.raw`
function auditLabel(
  action: string,
) {

  const labels:
    Record<string, string> = {

    CREATE:
      '\u0421\u043e\u0437\u0434\u0430\u043d\u0430 \u0441\u0434\u0435\u043b\u043a\u0430',

    UPLOAD:
      '\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043d \u0441\u0447\u0451\u0442',

    CONFIRM:
      '\u0421\u0447\u0451\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d',

    REQUEST_CORRECTION:
      '\u0417\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430',

    CLIENT_PAYMENT_ADDED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',

    PAYMENT_STATUS_CHANGED:
      '\u0418\u0437\u043c\u0435\u043d\u0451\u043d \u0441\u0442\u0430\u0442\u0443\u0441 \u043e\u043f\u043b\u0430\u0442\u044b',

    SUPPLIER_PURCHASE_CREATED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u0437\u0430\u043a\u0443\u043f\u043a\u0430',

    SUPPLIER_PURCHASE_UPDATED:
      '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u044b \u0434\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u043a\u0443\u043f\u043a\u0438',

    SUPPLIER_PAYMENT_REQUESTED:
      '\u0417\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443',

    SUPPLIER_PAYMENT_ADDED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443',

    SUPPLIER_PAYMENT_STAMPED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043f\u043b\u0430\u0442\u0451\u0436\u043a\u0430 \u0441 \u043f\u0435\u0447\u0430\u0442\u044c\u044e',
  };


  return (
    labels[action] ||
    '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u043f\u043e \u0441\u0434\u0435\u043b\u043a\u0435'
  );
}


`;


  app =
    app.slice(
      0,
      auditStart
    ) +
    audit +
    app.slice(
      auditEnd
    );
}


fs.writeFileSync(
  appPath,
  app,
  'utf8'
);


// ======================================================
// CSS
// ======================================================

let css =
  fs.readFileSync(
    cssPath,
    'utf8'
  );


if (
  !css.includes(
    '/* MSM recent activity v0.4.3 */'
  )
) {

  css += `

/* MSM recent activity v0.4.3 */

.shell {
  max-width: 1100px;
}

.bottomNav {
  width: min(
    1100px,
    100%
  );
}

.content:not(.homeContent) {
  max-width: 760px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.homeLayout {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    320px;
  gap: 18px;
  align-items: start;
}

.homeDeals {
  min-width: 0;
}

.recentActivity {
  position: sticky;
  top: 92px;

  display: grid;
  gap: 10px;

  min-width: 0;

  padding: 14px;

  background: #fff;

  border: 1px solid #e7e5e4;
  border-radius: 18px;
}

.recentActivityHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.recentActivityHead strong {
  font-size: 15px;
}

.recentActivityHead span {
  display: grid;
  place-items: center;

  min-width: 24px;
  height: 24px;

  padding: 0 6px;

  border-radius: 999px;

  background: #f5f5f4;

  color: #57534e;

  font-size: 10px;
  font-weight: 800;
}

.recentActivityList {
  display: grid;
  gap: 3px;

  max-height:
    calc(100vh - 180px);

  overflow-y: auto;
}

.recentActivityRow {
  display: grid;
  gap: 3px;

  padding: 10px 2px;

  border-bottom:
    1px solid #f0efed;
}

.recentActivityRow:last-child {
  border-bottom: 0;
}

.recentActivityTop {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.recentActivityTop b {
  font-size: 12px;
}

.recentActivityTop span {
  color: #a8a29e;
  font-size: 10px;
}

.recentActivityRow > strong {
  font-size: 12px;
}

.recentActivityWho {
  color: #78716c;
  font-size: 10px;
}

.recentActivityRow em {
  color: #57534e;
  font-size: 10px;
  font-style: normal;
}

.recentActivityEmpty {
  padding: 18px 4px;

  color: #78716c;
  text-align: center;
  font-size: 12px;
}


/* dark */

html[data-theme='dark']
.recentActivity {
  background: #1d1d1f;
  border-color: #343437;
}

html[data-theme='dark']
.recentActivityRow {
  border-color: #303033;
}

html[data-theme='dark']
.recentActivityHead span {
  background: #303033;
  color: #d6d3d1;
}


/* mobile */

@media (max-width: 820px) {

  .shell {
    max-width: 760px;
  }

  .bottomNav {
    width: min(
      760px,
      100%
    );
  }

  .homeLayout {
    grid-template-columns: 1fr;
  }

  .recentActivity {
    position: static;
  }

  .recentActivityList {
    max-height: none;
  }
}
`;
}


fs.writeFileSync(
  cssPath,
  css,
  'utf8'
);


console.log('');
console.log('MSM v0.4.3 applied');
console.log('');
console.log('OK: supplier recursion fixed');
console.log('OK: manager files upload in background');
console.log('OK: progress visible after leaving new deal');
console.log('OK: recent activity sidebar');
console.log('OK: actor + deal/invoice shown');
console.log('OK: activity refresh every 3 seconds');
console.log('OK: no database migration');