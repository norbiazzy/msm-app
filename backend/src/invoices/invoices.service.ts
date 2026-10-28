/* MSM_FIXES_V10 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InvoiceStatus, SellerType, TaskStatus, TaskType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dealId: string, body: {
    number: string;
    invoiceDate?: string;
    amount?: number;
    fileId?: string;
    actorId: string;
  }) {
    if (!body.fileId) {
      throw new BadRequestException(
        'Прикрепите файл готового счёта',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });
      const latest = await tx.clientInvoice.findFirst({
        where: { dealId },
        orderBy: { version: 'desc' },
      });

      const activeInvoiceTask =
        await tx.task.findFirst({
          where: {
            dealId,
            type: {
              in: [
                TaskType.ISSUE_CLIENT_INVOICE,
                TaskType.CORRECT_CLIENT_INVOICE,
              ],
            },
            status: {
              notIn: [
                TaskStatus.DONE,
                TaskStatus.CANCELLED,
              ],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      if (
        !activeInvoiceTask &&
        latest?.isCurrent
      ) {
        const latestAmount =
          latest.amount === null
            ? undefined
            : Number(latest.amount);

        const sameAmount =
          latestAmount === body.amount ||
          (
            latestAmount === undefined &&
            body.amount === undefined
          );

        const sameFile =
          (latest.fileId ?? undefined) ===
          body.fileId;

        if (
          latest.number === (body.number?.trim() || 'Ожидает проверки') &&
          sameAmount &&
          sameFile
        ) {
          return latest;
        }
      }

      await tx.clientInvoice.updateMany({ where: { dealId, isCurrent: true }, data: { isCurrent: false } });
      const invoice = await tx.clientInvoice.create({
        data: {
          dealId,
          sellerType: deal.sellerType as SellerType,
          number: body.number?.trim() || 'Ожидает проверки',
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
          amount: null,
          fileId: body.fileId,
          version: (latest?.version ?? 0) + 1,
          isCurrent: true,
          status: InvoiceStatus.WAITING_MANAGER_REVIEW,
        },
      });

      await tx.task.updateMany({
        where: {
          dealId,
          type: { in: [TaskType.ISSUE_CLIENT_INVOICE, TaskType.CORRECT_CLIENT_INVOICE] },
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        },
        data: { status: TaskStatus.DONE, completedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId: body.actorId,
          action: 'UPLOAD',
          entityType: 'ClientInvoice',
          entityId: invoice.id,
          newValue: { number: body.number, amount: body.amount, version: invoice.version },
        },
      });

      return invoice;
    });
  }

  async updateAmount(
    dealId: string,
    invoiceId: string,

    body: {
      amount?: number;
      actorId: string;
    },
  ) {

    const invoice =
      await this.prisma
        .clientInvoice
        .findFirstOrThrow({

          where: {
            id: invoiceId,
            dealId,
          },
        });


    if (!invoice.isCurrent) {

      throw new BadRequestException(
        'Изменить сумму можно только у актуальной версии счёта',
      );
    }


    const updated =
      await this.prisma
        .clientInvoice
        .update({

          where: {
            id: invoiceId,
          },

          data: {
            amount:
              body.amount ??
              null,
          },
        });


    await this.prisma
      .auditEvent
      .create({

        data: {

          dealId,

          actorId:
            body.actorId,

          action:
            'INVOICE_AMOUNT_CHANGED',

          entityType:
            'ClientInvoice',

          entityId:
            invoiceId,

          oldValue: {
            amount:
              invoice.amount
                ?.toString() ??
              null,
          },

          newValue: {
            amount:
              updated.amount
                ?.toString() ??
              null,

            number:
              invoice.number,

            version:
              invoice.version,
          },
        },
      });


    return updated;
  }


  async reviewDetails(dealId: string, invoiceId: string, body: {actorId: string; number: string; amount: number}) {
    const number = (body.number || '').trim();
    const amount = Number(body.amount);
    if (!number || number === 'Ожидает проверки' || !Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Укажите корректный номер и сумму счёта');
    return this.prisma.$transaction(async tx => {
      const actor = await tx.user.findUnique({where:{id:body.actorId},select:{role:true}});
      if (!actor || !['MANAGER','LEADER','ADMIN'].includes(String(actor.role)))
        throw new BadRequestException('Реквизиты подтверждает менеджер или руководитель');
      const invoice = await tx.clientInvoice.findFirstOrThrow({where:{id:invoiceId,dealId}});
      if (!invoice.isCurrent || invoice.status !== InvoiceStatus.WAITING_MANAGER_REVIEW)
        throw new BadRequestException('Изменять реквизиты можно до подтверждения текущего счёта');
      const result = await tx.clientInvoice.update({where:{id:invoiceId},data:{number,amount}});
      await tx.auditEvent.create({data:{dealId,actorId:body.actorId,action:'INVOICE_DETAILS_REVIEWED',
        entityType:'ClientInvoice',entityId:invoiceId,
        oldValue:{number:invoice.number,amount:invoice.amount?.toString() ?? null},
        newValue:{number,amount:String(amount)}}});
      return result;
    });
  }

  async confirm(dealId: string, invoiceId: string, actorId: string, details: {number?:string;amount?:number} = {}) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.clientInvoice.findFirstOrThrow({ where: { id: invoiceId, dealId } });
      if (!invoice.isCurrent) throw new BadRequestException('Подтвердить можно только актуальную версию счёта');

      if (invoice.status !== InvoiceStatus.WAITING_MANAGER_REVIEW) {
        throw new BadRequestException('Счёт уже прошёл проверку менеджера');
      }
      const reviewer = await tx.user.findUnique({where:{id:actorId},select:{role:true}});
      if (!reviewer || !['MANAGER','LEADER','ADMIN'].includes(String(reviewer.role)))
        throw new BadRequestException('Подтвердить счёт может менеджер или руководитель');
      // Approval and details are persisted in the same transaction.
      const recognized = invoice.fileId
        ? await tx.documentRecognition.findUnique({ where: { fileId: invoice.fileId } }) : null;
      const result = recognized?.status === 'DONE' && recognized.result && typeof recognized.result === 'object'
        ? recognized.result as Record<string, unknown> : {};
      const number = details.number !== undefined ? (typeof details.number === 'string' ? details.number.trim() : '') : invoice.number?.trim() && invoice.number !== 'Ожидает проверки'
        ? invoice.number.trim() : typeof result.number === 'string' ? result.number.trim() : '';
      const amount = details.amount !== undefined ? (typeof details.amount === 'number' ? details.amount : NaN) : invoice.amount == null ? Number(result.amount) : Number(invoice.amount);
      if (!number || number === 'Ожидает проверки' || !Number.isFinite(amount) || amount <= 0)
        throw new BadRequestException('Не удалось определить номер или сумму счёта. Дождитесь распознавания или отправьте счёт на корректировку.');
      await tx.auditEvent.create({data:{dealId,actorId,action:'INVOICE_DETAILS_REVIEWED',
        entityType:'ClientInvoice',entityId:invoiceId,
        oldValue:{number:invoice.number,amount:invoice.amount?.toString() ?? null},
        newValue:{number,amount:String(amount)}}});

      const updated = await tx.clientInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.CONFIRMED, number, amount },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId,
          action: 'CONFIRM',
          entityType: 'ClientInvoice',
          entityId: invoiceId,
          oldValue: { status: invoice.status },
          newValue: { status: InvoiceStatus.CONFIRMED },
        },
      });

      return updated;
    });
  }

  async approve(dealId: string, invoiceId: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.clientInvoice.findFirstOrThrow({ where: { id: invoiceId, dealId } });

      if (!invoice.isCurrent) {
        throw new BadRequestException('Согласовать можно только актуальную версию счёта');
      }

      if (invoice.status !== InvoiceStatus.CONFIRMED) {
        throw new BadRequestException('Счёт ещё не находится на согласовании с заказчиком');
      }

      const updated = await tx.clientInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.AGREED },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId,
          action: 'CUSTOMER_APPROVED',
          entityType: 'ClientInvoice',
          entityId: invoiceId,
          oldValue: { status: invoice.status },
          newValue: { status: InvoiceStatus.AGREED },
        },
      });

      return updated;
    });
  }

  async withdrawCorrection(
    dealId: string,
    invoiceId: string,
    actorId: string,
  ) {

    return this.prisma.$transaction(
      async (tx) => {

        const invoice =
          await tx.clientInvoice
            .findFirstOrThrow({
              where: {
                id: invoiceId,
                dealId,
              },
            });


        if (!invoice.isCurrent) {
          throw new BadRequestException(
            'Отозвать можно только корректировку актуальной версии счёта',
          );
        }


        if (
          invoice.status !==
          InvoiceStatus.CORRECTION_REQUESTED
        ) {
          throw new BadRequestException(
            'По этому счёту нет активной корректировки',
          );
        }


        const task =
          await tx.task.findFirst({
            where: {
              dealId,
              type:
                TaskType.CORRECT_CLIENT_INVOICE,
              status: {
                notIn: [
                  TaskStatus.DONE,
                  TaskStatus.CANCELLED,
                ],
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });


        if (!task) {
          throw new BadRequestException(
            'Активная задача на корректировку не найдена',
          );
        }


        if (
          task.status ===
          TaskStatus.IN_PROGRESS
        ) {
          throw new BadRequestException(
            'Бухгалтер уже взял корректировку в работу. Автоматически отозвать её нельзя.',
          );
        }


        const requestEvent =
          await tx.auditEvent.findFirst({
            where: {
              dealId,
              action:
                'REQUEST_CORRECTION',
              entityId:
                invoiceId,
            },
            orderBy: {
              createdAt: 'desc',
            },
          });


        const oldValue =
          requestEvent?.oldValue as
            | Record<string, unknown>
            | null
            | undefined;

        const previousStatus =
          oldValue?.status ===
            InvoiceStatus.CONFIRMED
            ? InvoiceStatus.CONFIRMED
            : InvoiceStatus
                .WAITING_MANAGER_REVIEW;


        const updated =
          await tx.clientInvoice.update({
            where: {
              id: invoiceId,
            },
            data: {
              status:
                previousStatus,
            },
          });


        const sellerChange =
          await tx.auditEvent.findFirst({
            where: {
              dealId,
              action:
                'DEAL_SELLER_CHANGED',
              reason:
                'Изменено при отправке счёта на корректировку',
              createdAt: {
                gte: task.createdAt,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });


        const sellerOldValue =
          sellerChange?.oldValue as
            | Record<string, unknown>
            | null
            | undefined;

        const previousSeller =
          sellerOldValue?.sellerType;


        if (
          previousSeller === SellerType.ST ||
          previousSeller === SellerType.MSM ||
          previousSeller === SellerType.IP
        ) {
          await tx.deal.update({
            where: { id: dealId },
            data: {
              sellerType:
                previousSeller,
            },
          });
        }


        await tx.task.update({
          where: {
            id: task.id,
          },
          data: {
            status:
              TaskStatus.CANCELLED,
            completedAt:
              new Date(),
          },
        });


        await tx.storedFile.deleteMany({
          where: {
            dealId,
            category: {
              in: [
                'CORRECTION_PRIMARY_' +
                  task.id,
                'CORRECTION_ATTACHMENT_' +
                  task.id,
                'CORRECTION_TASK_' +
                  task.id,
              ],
            },
          },
        });


        await tx.auditEvent.create({
          data: {
            dealId,
            actorId,
            action:
              'CORRECTION_WITHDRAWN',
            entityType:
              'ClientInvoice',
            entityId:
              invoiceId,
            oldValue: {
              status:
                InvoiceStatus
                  .CORRECTION_REQUESTED,
            },
            newValue: {
              status:
                previousStatus,
            },
          },
        });


        return updated;
      },
    );
  }


  async requestCorrection(
    dealId: string,
    invoiceId: string,
    body: { actorId: string; comment: string; urgent?: boolean; sellerType?: SellerType },
  ) {
    const comment = body.comment?.trim();
    if (!comment) throw new BadRequestException('Укажите, что нужно скорректировать');

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.clientInvoice.findFirstOrThrow({ where: { id: invoiceId, dealId } });
      if (!invoice.isCurrent) throw new BadRequestException('Корректировать можно только актуальную версию счёта');

      const deal = await tx.deal.findUniqueOrThrow({ where: { id: dealId } });

      if (
        body.sellerType &&
        body.sellerType !== deal.sellerType
      ) {
        await tx.deal.update({
          where: { id: dealId },
          data: { sellerType: body.sellerType },
        });

        await tx.auditEvent.create({
          data: {
            dealId,
            actorId: body.actorId,
            action: 'DEAL_SELLER_CHANGED',
            entityType: 'Deal',
            entityId: dealId,
            oldValue: { sellerType: deal.sellerType },
            newValue: { sellerType: body.sellerType },
            reason: 'Изменено при отправке счёта на корректировку',
          },
        });
      }

      const existing = await tx.task.findFirst({
        where: {
          dealId,
          type: TaskType.CORRECT_CLIENT_INVOICE,
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        },
      });
      if (existing) throw new BadRequestException('По этому счёту уже есть активная задача на корректировку');

      await tx.clientInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.CORRECTION_REQUESTED },
      });

      const task = await tx.task.create({
        data: {
          dealId,
          type: TaskType.CORRECT_CLIENT_INVOICE,
          title: `Скорректировать счёт ${invoice.number}`,
          description: comment,
          urgent: Boolean(body.urgent),
          createdById: body.actorId,
        },
      });

      await tx.auditEvent.create({
        data: {
          dealId,
          actorId: body.actorId,
          action: 'REQUEST_CORRECTION',
          entityType: 'ClientInvoice',
          entityId: invoiceId,
          oldValue: { status: invoice.status },
          newValue: { status: InvoiceStatus.CORRECTION_REQUESTED, comment, urgent: Boolean(body.urgent) },
          reason: comment,
        },
      });

      return task;
    });
  }
}
