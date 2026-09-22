const fs = require('fs');
const path = require('path');

const root = process.cwd();

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const typesPath = path.join(
  root,
  'frontend',
  'src',
  'types.ts'
);

const filesControllerPath = path.join(
  root,
  'backend',
  'src',
  'files',
  'files.controller.ts'
);

const filesServicePath = path.join(
  root,
  'backend',
  'src',
  'files',
  'files.service.ts'
);

const tasksServicePath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.service.ts'
);

const frontendPackagePath = path.join(
  root,
  'frontend',
  'package.json'
);

const requiredFiles = [
  appPath,
  typesPath,
  filesControllerPath,
  filesServicePath,
  tasksServicePath,
  frontendPackagePath,
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(
      'Не найден файл: ' + file
    );

    process.exit(1);
  }
}


function replaceSection(
  source,
  startMarker,
  endMarker,
  replacement,
  label
) {
  const start =
    source.indexOf(startMarker);

  const end =
    source.indexOf(
      endMarker,
      start + startMarker.length
    );

  if (
    start === -1 ||
    end === -1 ||
    end <= start
  ) {
    console.error(
      'Не найден раздел: ' +
      label
    );

    process.exit(1);
  }

  return (
    source.slice(0, start) +
    replacement.trim() +
    '\n\n' +
    source.slice(end)
  );
}


// ============================================================
// BACKUP
// ============================================================

for (const file of requiredFiles) {
  fs.copyFileSync(
    file,
    file + '.bak-v035'
  );
}


// ============================================================
// FILES CONTROLLER
// ============================================================

const filesController = `
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import type {
  Response,
} from 'express';

import {
  FilesService,
} from './files.service';


@Controller('files')
export class FilesController {

  constructor(
    private readonly files:
      FilesService,
  ) {}


  @Post('deal/:dealId')
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        limits: {
          fileSize:
            50 *
            1024 *
            1024,
        },
      },
    ),
  )
  upload(
    @Param('dealId')
    dealId: string,

    @Body('category')
    category: string,

    @UploadedFile()
    file:
      Express.Multer.File,
  ) {

    if (!file) {
      throw new BadRequestException(
        'Файл не передан',
      );
    }

    return this.files.upload(
      dealId,
      category ||
        'MANAGER_ATTACHMENT',
      file,
    );
  }


  @Get(':fileId/download')
  async download(
    @Param('fileId')
    fileId: string,

    @Res()
    res: Response,
  ) {

    const file =
      await this.files.download(
        fileId,
      );

    res.setHeader(
      'Content-Type',
      file.mimeType ||
        'application/octet-stream',
    );

    res.setHeader(
      'Content-Disposition',
      \`inline; filename*=UTF-8''\${encodeURIComponent(
        file.fileName,
      )}\`,
    );

    res.send(file.buffer);
  }
}
`;


// ============================================================
// FILES SERVICE
// Telegram + local fallback
// ============================================================

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


  private async saveLocal(
    dealId: string,
    category: string,
    file:
      Express.Multer.File,
  ) {

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
        file.originalname,
      );

    const storedName =
      randomUUID() +
      extension;

    await writeFile(
      join(
        uploadsDir,
        storedName,
      ),
      file.buffer,
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
            file.originalname,

          mimeType:
            file.mimetype,

          size:
            file.size,

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


    try {

      const remote =
        await this.telegram.upload(
          file,
          \`\${category} · \${dealId}\`,
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
              file.originalname,

            mimeType:
              file.mimetype,

            size:
              file.size,

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
        'Telegram upload failed. ' +
        'Saving file locally.',
        error,
      );

      return this.saveLocal(
        dealId,
        category,
        file,
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


// ============================================================
// TASKS SERVICE
// Показываем бухгалтеру все файлы менеджера
// ============================================================

const tasksService = `
import {
  Injectable,
} from '@nestjs/common';

import {
  TaskStatus,
} from '@prisma/client';

import {
  PrismaService,
} from '../prisma/prisma.service';


@Injectable()
export class TasksService {

  constructor(
    private readonly prisma:
      PrismaService,
  ) {}


  list() {

    return this.prisma
      .task
      .findMany({

        orderBy: [
          {
            urgent: 'desc',
          },

          {
            createdAt: 'asc',
          },
        ],


        include: {

          deal: {

            include: {

              invoices: {
                where: {
                  isCurrent: true,
                },

                take: 1,
              },


              files: {

                where: {

                  category: {
                    in: [
                      'MANAGER_ATTACHMENT',
                      'INCOMING_SUPPLIER_INVOICE',
                    ],
                  },

                },

                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },


          assignee: {

            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },

          },
        },
      });
  }


  async updateStatus(
    id: string,
    status: TaskStatus,
    assigneeId?: string,
  ) {

    return this.prisma
      .task
      .update({

        where: {
          id,
        },

        data: {

          status,

          assigneeId,

          completedAt:
            status ===
            TaskStatus.DONE
              ? new Date()
              : null,
        },
      });
  }
}
`;


// ============================================================
// FRONTEND
// ============================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8',
  );


const newDealForm = `
function NewDealForm({ user, onCancel, onCreated }: { user: CurrentUser; onCancel: () => void; onCreated: () => void }) {

  const [sellerType, setSellerType] =
    useState<SellerType>('MSM');

  const [requestMode, setRequestMode] =
    useState<
      'TEXT' |
      'INCOMING_INVOICE'
    >('TEXT');

  const [clientName, setClientName] =
    useState('');

  const [clientPhone, setClientPhone] =
    useState('');

  const [requestText, setRequestText] =
    useState('');

  const [marginMode, setMarginMode] =
    useState('TOTAL_PLUS');

  const [marginValue, setMarginValue] =
    useState('');

  const [
    accountingComment,
    setAccountingComment,
  ] = useState('');

  const [
    managerComment,
    setManagerComment,
  ] = useState('');

  const [
    attachments,
    setAttachments,
  ] = useState<File[]>([]);

  const [uploadStatus, setUploadStatus] =
    useState('');

  const [urgent, setUrgent] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  function addAttachments(
    files:
      FileList | null,
  ) {

    if (!files) return;


    const newFiles =
      Array.from(files);


    setAttachments(
      (current) => {

        const combined = [
          ...current,
          ...newFiles,
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


  function removeAttachment(
    index: number,
  ) {

    setAttachments(
      (current) =>

        current.filter(
          (_, fileIndex) =>
            fileIndex !==
            index
        )
    );
  }


  async function submit(
    e: FormEvent,
  ) {

    e.preventDefault();

    setError('');
    setUploadStatus('');
    setSaving(true);


    try {

      const deal =
        await createDeal({

          sellerType,

          clientName:
            clientName.trim() ||
            'Тестовый клиент',

          clientPhone:
            clientPhone.trim() ||
            undefined,

          requestMode,

          requestText:
            requestText.trim() ||
            undefined,

          marginMode,

          marginValue:
            marginValue
              ? Number(
                  marginValue
                )
              : undefined,

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


      const category =
        requestMode ===
        'INCOMING_INVOICE'
          ? 'INCOMING_SUPPLIER_INVOICE'
          : 'MANAGER_ATTACHMENT';


      for (
        let i = 0;
        i < attachments.length;
        i++
      ) {

        const attachment =
          attachments[i];


        setUploadStatus(
          'Загрузка файла ' +
          (i + 1) +
          ' из ' +
          attachments.length +
          ': ' +
          attachment.name
        );


        await uploadDealFile(
          deal.id,
          attachment,
          category,
        );
      }


      setUploadStatus('');

      onCreated();

    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : 'Не удалось создать заявку'
      );

    } finally {

      setSaving(false);

    }
  }


  return (

    <form
      className="content form"
      onSubmit={submit}
    >


      <Field title="От кого выставляем">

        <div className="segmented">

          {(['ST', 'MSM', 'IP'] as SellerType[]).map(
            (type) => (

              <button
                type="button"
                key={type}

                className={
                  sellerType === type
                    ? 'selected'
                    : ''
                }

                onClick={() =>
                  setSellerType(
                    type
                  )
                }
              >
                {
                  sellerLabels[
                    type
                  ]
                }
              </button>

            )
          )}

        </div>

      </Field>


      <Field title="Кому продаём">

        <input
          value={clientName}

          onChange={(e) =>
            setClientName(
              e.target.value
            )
          }

          placeholder="ООО «Главолснаб»"
        />

      </Field>


      <Field title="Телефон">

        <input
          value={clientPhone}

          onChange={(e) =>
            setClientPhone(
              e.target.value
            )
          }

          placeholder="+7…"
        />

      </Field>


      <Field title="Как передаём данные">

        <div className="segmented two">

          <button
            type="button"

            className={
              requestMode ===
              'TEXT'
                ? 'selected'
                : ''
            }

            onClick={() =>
              setRequestMode(
                'TEXT'
              )
            }
          >
            Позиции текстом
          </button>


          <button
            type="button"

            className={
              requestMode ===
              'INCOMING_INVOICE'
                ? 'selected'
                : ''
            }

            onClick={() =>
              setRequestMode(
                'INCOMING_INVOICE'
              )
            }
          >
            По входящему
          </button>

        </div>

      </Field>


      <Field
        title={
          requestMode ===
          'INCOMING_INVOICE'
            ? 'Входящие счета и вложения'
            : 'Вложения'
        }
      >

        <div>

          <label className="fileButton">

            {
              attachments.length
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

                addAttachments(
                  e.target.files
                );

                e.currentTarget.value =
                  '';
              }}
            />

          </label>


          {
            attachments.length >
              0 && (

            <div className="versionList">

              {attachments.map(
                (
                  attachment,
                  index,
                ) => (

                <div
                  className="versionRow"

                  key={
                    attachment.name +
                    attachment.size +
                    attachment.lastModified
                  }
                >

                  <div>

                    <b>
                      {
                        attachment.name
                      }
                    </b>

                    <span>
                      {
                        (
                          attachment.size /
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
                      removeAttachment(
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


          <div className="microcopy">

            Можно выбрать несколько
            файлов любого типа.

            До отправки любой файл
            можно удалить или
            прикрепить ещё.

          </div>

        </div>

      </Field>


      <Field
        title={
          requestMode === 'TEXT'
            ? 'Позиции и стоимость'
            : 'Описание входящего счёта'
        }
      >

        <textarea
          rows={5}

          value={requestText}

          onChange={(e) =>
            setRequestText(
              e.target.value
            )
          }

          placeholder="Bonolit D500 — 32,4 м³ × 5 600 ₽…"
        />

      </Field>


      <Field title="Наценка / цена">

        <div className="inline">

          <select
            value={marginMode}

            onChange={(e) =>
              setMarginMode(
                e.target.value
              )
            }
          >

            <option value="TOTAL_PLUS">
              + к сумме
            </option>

            <option value="UNIT_PLUS">
              + за единицу
            </option>

            <option value="PERCENT">
              + %
            </option>

            <option value="FINAL">
              Итоговая цена
            </option>

          </select>


          <input
            inputMode="decimal"

            value={marginValue}

            onChange={(e) =>
              setMarginValue(
                e.target.value
              )
            }

            placeholder="0"
          />

        </div>

      </Field>


      <Field title="Комментарий бухгалтерии">

        <textarea
          rows={3}

          value={
            accountingComment
          }

          onChange={(e) =>
            setAccountingComment(
              e.target.value
            )
          }

          placeholder="Доставку выделить отдельной строкой…"
        />

      </Field>


      <Field title="Мой комментарий">

        <textarea
          rows={3}

          value={managerComment}

          onChange={(e) =>
            setManagerComment(
              e.target.value
            )
          }

          placeholder="Позвонить клиенту после 14:00…"
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
          Срочное
        </span>

      </label>


      {uploadStatus && (

        <div className="infoBox">
          {uploadStatus}
        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}


      <div className="actions">

        <button
          type="button"
          className="secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </button>


        <button
          className="primary"
          disabled={saving}
        >

          {
            saving
              ? 'Отправляем…'
              : 'Отправить бухгалтерии'
          }

        </button>

      </div>

    </form>
  );
}
`;


// ============================================================
// TASK DETAIL
// ============================================================

const taskDetailStart =
  app.indexOf(
    'function TaskDetail('
  );

const moneyStart =
  app.indexOf(
    'function money(',
    taskDetailStart
  );

if (
  taskDetailStart === -1 ||
  moneyStart === -1
) {
  console.error(
    'Не найден TaskDetail'
  );

  process.exit(1);
}


let taskDetail =
  app.slice(
    taskDetailStart,
    moneyStart
  );


taskDetail =
  taskDetail.replace(
    /<strong>\s*Входящие счета\s*<\/strong>/g,
    '<strong>Вложения менеджера</strong>'
  );


taskDetail =
  taskDetail.replace(
    /<span>\s*Файл от менеджера\s*<\/span>/g,
    '<span>Вложение к заявке</span>'
  );


// если текущая версия вдруг
// не содержит блока файлов,
// добавим его перед "В работу"

if (
  !taskDetail.includes(
    'Вложения менеджера'
  )
) {

  const marker =
    "{status === 'NEW' && (";

  const attachmentBlock = `

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
                key={incomingFile.id}
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


`;

  const markerIndex =
    taskDetail.indexOf(
      marker
    );

  if (markerIndex !== -1) {

    taskDetail =
      taskDetail.slice(
        0,
        markerIndex
      ) +
      attachmentBlock +
      taskDetail.slice(
        markerIndex
      );
  }
}


app =
  app.slice(
    0,
    taskDetailStart
  ) +
  taskDetail +
  app.slice(
    moneyStart
  );


// ============================================================
// ЗАМЕНЯЕМ NEW DEAL FORM
// ============================================================

app = replaceSection(
  app,
  'function NewDealForm(',
  'function TasksView(',
  newDealForm,
  'NewDealForm',
);


// ============================================================
// TYPES
// ============================================================

let types =
  fs.readFileSync(
    typesPath,
    'utf8'
  );


if (
  !types.includes(
    'category?: string;'
  )
) {

  types = types.replace(
    '  mimeType?: string;',

    '  mimeType?: string;\n' +
    '  category?: string;'
  );
}


if (
  !types.includes(
    'files?: StoredFile[];'
  )
) {

  types = types.replace(
    '  tasks: DealTask[];',

    '  tasks: DealTask[];\n' +
    '  files?: StoredFile[];'
  );
}


// ============================================================
// FRONTEND BUILD SCRIPT
// Убираем проблемный tsc -b
// ============================================================

const frontendPackage =
  JSON.parse(
    fs.readFileSync(
      frontendPackagePath,
      'utf8'
    )
  );


frontendPackage.scripts.build =
  'tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit && vite build';


// ============================================================
// SAVE
// ============================================================

fs.writeFileSync(
  appPath,
  app,
  'utf8'
);

fs.writeFileSync(
  typesPath,
  types,
  'utf8'
);

fs.writeFileSync(
  filesControllerPath,
  filesController,
  'utf8'
);

fs.writeFileSync(
  filesServicePath,
  filesService,
  'utf8'
);

fs.writeFileSync(
  tasksServicePath,
  tasksService,
  'utf8'
);

fs.writeFileSync(
  frontendPackagePath,
  JSON.stringify(
    frontendPackage,
    null,
    2
  ) + '\n',
  'utf8'
);


console.log('');
console.log(
  'ГОТОВО — MSM v0.3.5'
);

console.log('');

console.log(
  '✓ Несколько вложений'
);

console.log(
  '✓ Любые типы файлов'
);

console.log(
  '✓ Удаление до отправки'
);

console.log(
  '✓ Добавить ещё'
);

console.log(
  '✓ Файлы видны бухгалтеру'
);

console.log(
  '✓ Telegram + локальный fallback'
);

console.log(
  '✓ Лимит одного файла 50 МБ'
);

console.log(
  '✓ Стабильный frontend build'
);

console.log('');

console.log(
  'Миграция базы не требуется.'
);