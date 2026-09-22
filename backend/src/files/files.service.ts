
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
          /[^A-Za-z0-9._()\-]+/g,
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
