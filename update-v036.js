const fs = require('fs');
const path = require('path');

const root = process.cwd();

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const filesServicePath = path.join(
  root,
  'backend',
  'src',
  'files',
  'files.service.ts'
);

const dealsServicePath = path.join(
  root,
  'backend',
  'src',
  'deals',
  'deals.service.ts'
);

for (const file of [
  appPath,
  filesServicePath,
  dealsServicePath,
]) {
  if (!fs.existsSync(file)) {
    console.error('Не найден: ' + file);
    process.exit(1);
  }

  fs.copyFileSync(
    file,
    file + '.bak-v036'
  );
}


// ======================================================
// FILES SERVICE
// Исправление имени + транслитерация
// ======================================================

const filesService = `
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  FileProvider,
} from '@prisma/client';

import {
  randomUUID,
} from 'crypto';

import {
  mkdir,
  readFile,
  writeFile,
} from 'fs/promises';

import {
  extname,
  join,
} from 'path';

import {
  PrismaService,
} from '../prisma/prisma.service';

import {
  TelegramStorageService,
} from './telegram-storage.service';


@Injectable()
export class FilesService {

  constructor(
    private readonly prisma:
      PrismaService,

    private readonly telegram:
      TelegramStorageService,
  ) {}


  private uploadsDir() {
    return join(
      process.cwd(),
      'uploads',
    );
  }


  private restoreUtf8Name(
    name: string,
  ) {

    try {

      const restored =
        Buffer
          .from(
            name,
            'latin1',
          )
          .toString(
            'utf8',
          );


      // Используем восстановленное имя,
      // только если в нём появилась кириллица.
      if (
        /[А-Яа-яЁё]/.test(
          restored,
        )
      ) {
        return restored;
      }

    } catch {
      // оставляем исходное имя
    }


    return name;
  }


  private transliterate(
    value: string,
  ) {

    const map:
      Record<string, string> = {

      А: 'A',
      Б: 'B',
      В: 'V',
      Г: 'G',
      Д: 'D',
      Е: 'E',
      Ё: 'E',
      Ж: 'Zh',
      З: 'Z',
      И: 'I',
      Й: 'Y',
      К: 'K',
      Л: 'L',
      М: 'M',
      Н: 'N',
      О: 'O',
      П: 'P',
      Р: 'R',
      С: 'S',
      Т: 'T',
      У: 'U',
      Ф: 'F',
      Х: 'Kh',
      Ц: 'Ts',
      Ч: 'Ch',
      Ш: 'Sh',
      Щ: 'Sch',
      Ъ: '',
      Ы: 'Y',
      Ь: '',
      Э: 'E',
      Ю: 'Yu',
      Я: 'Ya',

      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'e',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'y',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'kh',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'sch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya',
    };


    return Array
      .from(value)
      .map(
        (char) =>
          map[char] ??
          char
      )
      .join('');
  }


  private safeFileName(
    originalName: string,
  ) {

    const restored =
      this.restoreUtf8Name(
        originalName,
      );


    const latin =
      this.transliterate(
        restored,
      );


    const safe =
      latin

        .replace(
          /[^A-Za-z0-9._()\\-]+/g,
          '_',
        )

        .replace(
          /_+/g,
          '_',
        )

        .replace(
          /^_+|_+$/g,
          ''
        );


    return (
      safe ||
      'file'
    );
  }


  private prepareFile(
    file:
      Express.Multer.File,
  ) {

    const safeName =
      this.safeFileName(
        file.originalname,
      );


    return {
      ...file,
      originalname:
        safeName,
    };
  }


  private async saveLocal(
    dealId: string,
    category: string,
    file:
      Express.Multer.File,
  ) {

    const prepared =
      this.prepareFile(file);


    const uploadsDir =
      this.uploadsDir();


    await mkdir(
      uploadsDir,
      {
        recursive: true,
      },
    );


    const extension =
      extname(
        prepared.originalname,
      );


    const storedName =
      randomUUID() +
      extension;


    await writeFile(
      join(
        uploadsDir,
        storedName,
      ),
      prepared.buffer,
    );


    return this.prisma
      .storedFile
      .create({
        data: {

          dealId,
          category,

          provider:
            FileProvider.EXTERNAL,

          originalName:
            prepared.originalname,

          mimeType:
            prepared.mimetype,

          size:
            prepared.size,

          externalUrl:
            'local:' +
            storedName,
        },
      });
  }


  async upload(
    dealId: string,
    category: string,
    file:
      Express.Multer.File,
  ) {

    if (!file) {

      throw new BadRequestException(
        'Файл не передан',
      );
    }


    const prepared =
      this.prepareFile(
        file,
      );


    try {

      const remote =
        await this.telegram.upload(
          prepared,

          category +
          ' · ' +
          dealId,
        );


      return this.prisma
        .storedFile
        .create({
          data: {

            dealId,
            category,

            provider:
              FileProvider.TELEGRAM,

            originalName:
              prepared.originalname,

            mimeType:
              prepared.mimetype,

            size:
              prepared.size,

            telegramFileId:
              remote.fileId,

            telegramUniqueId:
              remote.uniqueId,

            telegramMessageId:
              remote.messageId,

            telegramChatId:
              remote.chatId,
          },
        });


    } catch (error) {

      console.warn(
        'Telegram upload failed. Saving locally.',
      );


      return this.saveLocal(
        dealId,
        category,
        prepared,
      );
    }
  }


  async download(
    fileId: string,
  ) {

    const stored =
      await this.prisma
        .storedFile
        .findUniqueOrThrow({
          where: {
            id: fileId,
          },
        });


    if (
      stored.telegramFileId
    ) {

      const buffer =
        await this.telegram.download(
          stored.telegramFileId,
        );


      return {
        buffer,

        fileName:
          stored.originalName,

        mimeType:
          stored.mimeType,
      };
    }


    if (
      stored.externalUrl
        ?.startsWith(
          'local:',
        )
    ) {

      const storedName =
        stored.externalUrl.slice(
          'local:'.length,
        );


      const buffer =
        await readFile(
          join(
            this.uploadsDir(),
            storedName,
          ),
        );


      return {
        buffer,

        fileName:
          stored.originalName,

        mimeType:
          stored.mimeType,
      };
    }


    throw new BadRequestException(
      'Файл недоступен',
    );
  }
}
`;


// ======================================================
// DEALS SERVICE
// Убираем BigInt из ответа -> исправляем 500
// ======================================================

const dealsService = `
import {
  Injectable,
} from '@nestjs/common';

import {
  TaskType,
} from '@prisma/client';

import {
  PrismaService,
} from '../prisma/prisma.service';

import {
  CreateDealDto,
} from './dto';


@Injectable()
export class DealsService {

  constructor(
    private readonly prisma:
      PrismaService,
  ) {}


  async create(
    dto: CreateDealDto,
  ) {

    return this.prisma
      .$transaction(
        async (tx) => {

          const deal =
            await tx.deal.create({
              data: {

                sellerType:
                  dto.sellerType,

                clientName:
                  dto.clientName,

                clientPhone:
                  dto.clientPhone,

                contactName:
                  dto.contactName,

                leadSource:
                  dto.leadSource,

                requestMode:
                  dto.requestMode,

                requestText:
                  dto.requestText,

                marginMode:
                  dto.marginMode,

                marginValue:
                  dto.marginValue,

                accountingComment:
                  dto.accountingComment,

                managerComment:
                  dto.managerComment,

                managerId:
                  dto.managerId,

                createdById:
                  dto.createdById,
              },
            });


          await tx.task.create({
            data: {

              dealId:
                deal.id,

              type:
                TaskType
                  .ISSUE_CLIENT_INVOICE,

              title:
                'Выставить счёт',

              description:
                dto.accountingComment,

              urgent:
                Boolean(
                  dto.urgent,
                ),

              createdById:
                dto.createdById,
            },
          });


          await tx
            .auditEvent
            .create({
              data: {

                dealId:
                  deal.id,

                actorId:
                  dto.createdById,

                action:
                  'CREATE',

                entityType:
                  'Deal',

                entityId:
                  deal.id,

                newValue: {

                  sellerType:
                    dto.sellerType,

                  clientName:
                    dto.clientName,
                },
              },
            });


          return deal;
        },
      );
  }


  list(
    managerId?: string,
  ) {

    return this.prisma
      .deal
      .findMany({

        where:
          managerId
            ? { managerId }
            : undefined,

        orderBy: [
          {
            status: 'asc',
          },

          {
            plannedShipmentAt:
              'asc',
          },

          {
            createdAt: 'desc',
          },
        ],


        include: {

          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },


          invoices: {
            where: {
              isCurrent: true,
            },

            orderBy: {
              createdAt: 'desc',
            },

            take: 1,
          },


          tasks: {
            where: {
              status: {
                notIn: [
                  'DONE',
                  'CANCELLED',
                ],
              },
            },

            orderBy: [
              {
                urgent: 'desc',
              },

              {
                createdAt: 'asc',
              },
            ],
          },
        },
      });
  }


  get(
    id: string,
  ) {

    return this.prisma
      .deal
      .findUniqueOrThrow({

        where: {
          id,
        },


        include: {

          manager: {

            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },

          },


          invoices: {

            orderBy: {
              createdAt: 'desc',
            },

            include: {
              file: true,
            },
          },


          tasks: {

            orderBy: [
              {
                urgent: 'desc',
              },

              {
                createdAt: 'desc',
              },
            ],
          },


          files: true,


          clientPayments: {

            orderBy: {
              paidAt: 'desc',
            },

            include: {

              file: true,

              actor: {

                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },

              },
            },
          },


          auditEvents: {

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
            },
          },
        },
      });
  }
}
`;


// ======================================================
// APP
// ======================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8',
  );


const taskStart =
  app.indexOf(
    'function TaskDetail('
  );

const moneyStart =
  app.indexOf(
    'function money(',
    taskStart
  );


if (
  taskStart === -1 ||
  moneyStart === -1
) {

  console.error(
    'Не найден TaskDetail'
  );

  process.exit(1);
}


const newTaskDetail = `
function TaskDetail({ task, user, onBack }: { task: Task; user: CurrentUser; onBack: () => void }) {

  const [status, setStatus] =
    useState(task.status);

  const [number, setNumber] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [
    invoiceFiles,
    setInvoiceFiles,
  ] = useState<File[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  useEffect(() => {

    setStatus(
      task.status
    );

  }, [
    task.id,
    task.status,
  ]);


  function addInvoiceFiles(
    files:
      FileList | null,
  ) {

    if (!files) return;


    const selected =
      Array.from(files);


    setInvoiceFiles(
      (current) => {

        const combined = [
          ...current,
          ...selected,
        ];


        return combined.filter(
          (
            file,
            index,
            all,
          ) =>

            all.findIndex(
              (candidate) =>

                candidate.name ===
                  file.name &&

                candidate.size ===
                  file.size &&

                candidate.lastModified ===
                  file.lastModified

            ) === index
        );
      }
    );
  }


  function removeInvoiceFile(
    index: number,
  ) {

    setInvoiceFiles(
      (current) =>
        current.filter(
          (_, fileIndex) =>
            fileIndex !==
            index
        )
    );
  }


  async function take() {

    setSaving(true);
    setError('');


    try {

      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id,
      );


      setStatus(
        'IN_PROGRESS',
      );


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


  async function finishInvoice() {

    setSaving(true);
    setError('');


    try {

      const uploadedIds:
        string[] = [];


      for (
        const invoiceFile
        of invoiceFiles
      ) {

        const uploaded =
          await uploadDealFile(
            task.deal.id,
            invoiceFile,
            'CLIENT_INVOICE_ATTACHMENT',
          );


        uploadedIds.push(
          uploaded.id,
        );
      }


      await createInvoice(
        task.deal.id,
        {

          number:
            number.trim(),

          amount:
            amount
              ? Number(amount)
              : undefined,

          invoiceDate:
            todayLocalDate(),

          fileId:
            uploadedIds[0],

          actorId:
            user.id,
        },
      );


      onBack();


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


  const canAttachInvoice =
    [
      'ISSUE_CLIENT_INVOICE',
      'CORRECT_CLIENT_INVOICE',
    ].includes(
      task.type,
    );


  const incomingFiles =
    task.deal.files || [];


  return (

    <section className="content form">


      <button
        className="backLink"
        onClick={onBack}
      >
        ← К задачам
      </button>


      <div className="detailHero">

        <div className="eyebrow">
          ЗК-
          {task.deal.internalNumber}
        </div>


        <h2>
          {task.title}
        </h2>


        <p>
          {task.deal.clientName}
        </p>


        <div className="statusPill">
          {
            taskStatus(
              status
            )
          }
        </div>


        {task.urgent && (

          <b className="urgent">
            СРОЧНО
          </b>

        )}

      </div>


      {task.deal.requestText && (

        <div className="infoBox">

          <strong>
            Запрос менеджера
          </strong>

          <p>
            {task.deal.requestText}
          </p>

        </div>

      )}


      {task.description && (

        <div className="infoBox">

          <strong>
            Комментарий
          </strong>

          <p>
            {task.description}
          </p>

        </div>

      )}


      {incomingFiles.length > 0 && (

        <div className="infoBox">

          <strong>
            Вложения менеджера
          </strong>


          <div className="versionList">

            {incomingFiles.map(
              (incomingFile) => (

              <div
                className="versionRow"
                key={
                  incomingFile.id
                }
              >

                <div>

                  <b>
                    {
                      incomingFile
                        .originalName
                    }
                  </b>

                  <span>
                    Вложение к заявке
                  </span>

                </div>


                <a
                  href={
                    dealFileUrl(
                      incomingFile.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

          </div>

        </div>

      )}


      {status === 'NEW' && (

        <button
          className="primary wide"
          disabled={saving}
          onClick={take}
        >
          {
            saving
              ? 'Сохраняем…'
              : 'В работу'
          }
        </button>

      )}


      {status === 'IN_PROGRESS' && (

        <div className="infoBox">

          <strong>
            Задача в работе
          </strong>

          <p>
            Заполните готовый счёт ниже.
          </p>

        </div>

      )}


      {canAttachInvoice &&
        status ===
          'IN_PROGRESS' && (

        <>

          <Field title="Номер готового счёта">

            <input
              value={number}

              onChange={(e) =>
                setNumber(
                  e.target.value
                )
              }

              placeholder="1548"
            />

          </Field>


          <Field title="Сумма">

            <input
              inputMode="decimal"

              value={amount}

              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }

              placeholder="420000"
            />

          </Field>


          <Field title="Файлы готового счёта">

            <div>

              <label className="fileButton">

                {
                  invoiceFiles.length
                    ? '+ Прикрепить ещё'
                    : '+ Прикрепить файлы'
                }


                <input
                  type="file"
                  multiple

                  style={{
                    display: 'none',
                  }}

                  onChange={(e) => {

                    addInvoiceFiles(
                      e.target.files
                    );

                    e.currentTarget.value =
                      '';
                  }}
                />

              </label>


              {invoiceFiles.length > 0 && (

                <div className="versionList">

                  {invoiceFiles.map(
                    (
                      invoiceFile,
                      index,
                    ) => (

                    <div
                      className="versionRow"

                      key={
                        invoiceFile.name +
                        invoiceFile.size +
                        invoiceFile.lastModified
                      }
                    >

                      <div>

                        <b>
                          {
                            invoiceFile.name
                          }
                        </b>

                        <span>
                          {
                            (
                              invoiceFile.size /
                              1024 /
                              1024
                            ).toFixed(2)
                          } МБ
                        </span>

                      </div>


                      <button
                        type="button"
                        className="secondary"

                        onClick={() =>
                          removeInvoiceFile(
                            index
                          )
                        }
                      >
                        Удалить
                      </button>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </Field>


          <button
            className="primary wide"
            disabled={saving}
            onClick={
              finishInvoice
            }
          >

            {
              saving
                ? 'Сохраняем…'
                : 'Счёт готов'
            }

          </button>


          <div className="microcopy">

            Дата счёта ставится
            автоматически —
            сегодняшняя.

            Номер счёта пока
            необязателен только
            для тестирования.

          </div>

        </>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>
  );
}


function todayLocalDate() {

  const now =
    new Date();


  const local =
    new Date(

      now.getTime() -

      now.getTimezoneOffset() *
        60000
    );


  return local
    .toISOString()
    .slice(0, 10);
}
`;


app =
  app.slice(
    0,
    taskStart,
  ) +

  newTaskDetail.trim() +
  '\n\n' +

  app.slice(
    moneyStart,
  );


// ======================================================
// Добавляем менеджеру список всех файлов бухгалтера
// ======================================================

if (
  !app.includes(
    'Файлы бухгалтерии'
  )
) {

  const marker =
    `{current ? <InvoiceBlock invoice={current} sellerType={deal.sellerType} /> : <div className="infoBox"><strong>Счёт ещё не готов</strong><p>Бухгалтерия пока не загрузила клиентский счёт.</p></div>}`;


  const extraBlock =
`
    {(deal.files || []).filter(
      (storedFile) =>
        storedFile.category ===
        'CLIENT_INVOICE_ATTACHMENT'
    ).length > 0 && (

      <div className="infoBox">

        <strong>
          Файлы бухгалтерии
        </strong>

        <div className="versionList">

          {(deal.files || [])
            .filter(
              (storedFile) =>
                storedFile.category ===
                'CLIENT_INVOICE_ATTACHMENT'
            )
            .map(
              (storedFile) => (

              <div
                className="versionRow"
                key={
                  storedFile.id
                }
              >

                <div>

                  <b>
                    {
                      storedFile
                        .originalName
                    }
                  </b>

                  <span>
                    Файл готового счёта
                  </span>

                </div>


                <a
                  href={
                    dealFileUrl(
                      storedFile.id
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

        </div>

      </div>

    )}
`;


  if (
    app.includes(marker)
  ) {

    app =
      app.replace(
        marker,

        marker +
        '\\n' +
        extraBlock,
      );

  } else {

    console.warn(
      'Блок файлов менеджеру автоматически не вставлен.'
    );
  }
}


// ======================================================
// SAVE
// ======================================================

fs.writeFileSync(
  filesServicePath,
  filesService,
  'utf8',
);

fs.writeFileSync(
  dealsServicePath,
  dealsService,
  'utf8',
);

fs.writeFileSync(
  appPath,
  app,
  'utf8',
);


console.log('');
console.log(
  'ГОТОВО — MSM v0.3.6'
);

console.log('');

console.log(
  '✓ Исправлен 500 при открытии сделки'
);

console.log(
  '✓ Кириллица переводится в латиницу'
);

console.log(
  '✓ Без дополнительных библиотек'
);

console.log(
  '✓ Бухгалтер может прикреплять несколько файлов'
);

console.log(
  '✓ Файл можно удалить до отправки'
);

console.log(
  '✓ Можно прикрепить ещё'
);

console.log(
  '✓ Менеджер видит файлы бухгалтерии'
);

console.log('');

console.log(
  'Миграция базы не нужна.'
);