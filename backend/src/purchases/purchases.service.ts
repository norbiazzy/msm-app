

import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  SupplierPurchaseStatus,
  TaskStatus,
  TaskType,
} from '@prisma/client';

import {
  PrismaService,
} from '../prisma/prisma.service';


@Injectable()
export class PurchasesService {

  constructor(
    private readonly prisma:
      PrismaService,
  ) {}


  private async realizationAccess(dealId: string, purchaseId: string, actorId: string) {
    const purchase = await this.prisma.supplierPurchase.findFirstOrThrow({ where: { id: purchaseId, dealId } });
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!user || !['MANAGER','ACCOUNTANT','LEADER','ADMIN'].includes(user.role)) {
      throw new BadRequestException('Нет прав на изменение реализаций');
    }
    return purchase;
  }

  async addRealization(dealId: string, purchaseId: string, actorId: string) {
    const purchase = await this.realizationAccess(dealId, purchaseId, actorId);
    if (purchase.noRealizations) throw new BadRequestException('Сначала отмените отметку «Реализаций не будет»');
    return this.prisma.$transaction(async tx => {
      const row = await tx.supplierRealization.create({ data: { purchaseId, number: '', createdById: actorId } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_ADDED', entityType: 'SupplierRealization', entityId: row.id, newValue: { purchaseId, number: '' } } });
      return row;
    });
  }

  async editRealization(dealId: string, purchaseId: string, rowId: string, actorId: string, number: string) {
    await this.realizationAccess(dealId, purchaseId, actorId);
    const previous = await this.prisma.supplierRealization.findFirstOrThrow({ where: { id: rowId, purchaseId } });
    const nextNumber = typeof number === 'string' ? number.trim().slice(0, 120) : '';
    return this.prisma.$transaction(async tx => {
      const row = await tx.supplierRealization.update({ where: { id: previous.id }, data: { number: nextNumber } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_EDITED', entityType: 'SupplierRealization', entityId: row.id, oldValue: { number: previous.number }, newValue: { number: nextNumber } } });
      return row;
    });
  }

  async deleteRealization(dealId: string, purchaseId: string, rowId: string, actorId: string) {
    await this.realizationAccess(dealId, purchaseId, actorId);
    const previous = await this.prisma.supplierRealization.findFirstOrThrow({ where: { id: rowId, purchaseId } });
    return this.prisma.$transaction(async tx => {
      await tx.supplierRealization.delete({ where: { id: rowId } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_DELETED', entityType: 'SupplierRealization', entityId: rowId, oldValue: { number: previous.number, purchaseId } } });
      return { ok: true };
    });
  }

  async setNoRealizations(dealId: string, purchaseId: string, actorId: string, value: boolean) {
    const purchase = await this.realizationAccess(dealId, purchaseId, actorId);
    if (value) {
      const count = await this.prisma.supplierRealization.count({ where: { purchaseId } });
      if (count) throw new BadRequestException('Перед отметкой «Реализаций не будет» удалите строки реализаций');
    }
    return this.prisma.$transaction(async tx => {
      const updated = await tx.supplierPurchase.update({ where: { id: purchaseId }, data: { noRealizations: Boolean(value) } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_NONE_CHANGED', entityType: 'SupplierPurchase', entityId: purchaseId, oldValue: { noRealizations: purchase.noRealizations }, newValue: { noRealizations: Boolean(value) } } });
      return updated;
    });
  }

  async list(
    dealId: string,
  ) {

    return this.prisma
      .supplierPurchase
      .findMany({

        where: {
          dealId,
        },

        orderBy: {
          createdAt: 'asc',
        },

        include: {
          realizations: { orderBy: { createdAt: 'asc' } },

          payments: {

            orderBy: {
              paidAt: 'asc',
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


          tasks: {
            where: {
              status: {
                notIn: [
                  TaskStatus.DONE,
                  TaskStatus.CANCELLED,
                ],
              },
            },
            select: {
              id: true,
              type: true,
              status: true,
              title: true,
              payload: true,
            },
          },
        },
      });
  }


  async create(
    dealId: string,
    body: any,
  ) {

    return this.prisma
      .$transaction(
        async (tx) => {

          const purchase =
            await tx.supplierPurchase
              .create({

                data: {

                  dealId,

                  supplierName:
                    body.supplierName
                      ?.trim() ||
                    'Тестовый поставщик',

                  incomingInvoiceNumber:
                    body
                      .incomingInvoiceNumber
                      ?.trim() ||
                    undefined,

                  incomingInvoiceAmount:
                    body
                      .incomingInvoiceAmount,

                  comment:
                    body.comment
                      ?.trim() ||
                    undefined,

                  createdById:
                    body.createdById,
                },

                include: {
                  payments: true,
                },
              });


          if (body.sourceFileId) {

            const source =
              await tx.storedFile
                .findFirst({
                  where: {
                    id:
                      body.sourceFileId,
                    dealId,
                  },
                });


            if (source) {

              await tx.storedFile
                .create({
                  data: {
                    dealId,
                    provider:
                      source.provider,
                    category:
                      'SUPPLIER_INVOICE_' +
                      purchase.id,
                    originalName:
                      source.originalName,
                    mimeType:
                      source.mimeType,
                    size:
                      source.size,
                    telegramFileId:
                      source.telegramFileId,
                    telegramUniqueId:
                      source.telegramUniqueId,
                    telegramMessageId:
                      source.telegramMessageId,
                    telegramChatId:
                      source.telegramChatId,
                    externalUrl:
                      source.externalUrl,
                  },
                });
            }
          }


          await tx.auditEvent.create({
            data: {
              dealId,
              actorId:
                body.createdById,
              action:
                'SUPPLIER_PURCHASE_CREATED',
              entityType:
                'SupplierPurchase',
              entityId:
                purchase.id,
              newValue: {
                supplierName:
                  purchase.supplierName,
                amount:
                  purchase
                    .incomingInvoiceAmount
                    ?.toString() ??
                  null,
              },
            },
          });


          return purchase;
        },
      );
  }


  async update(
    dealId: string,
    purchaseId: string,
    body: any,
  ) {

    const current =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({
          where: {
            id: purchaseId,
            dealId,
          },
        });


    // MSM_PURCHASE_DRAFT_EDIT_V11: supplier/payment changes are forbidden once sent to accounting.
    const changeDraft = body.supplierName !== undefined || body.requestedAmount !== undefined;
    if (changeDraft) {
      if (current.status !== SupplierPurchaseStatus.DRAFT) {
        throw new BadRequestException('Редактирование завода и суммы возможно только до отправки задачи бухгалтерии');
      }
      const [tasksCount, paymentsCount] = await Promise.all([
        this.prisma.task.count({ where: { supplierPurchaseId: purchaseId, type: TaskType.PAY_SUPPLIER } }),
        this.prisma.supplierPayment.count({ where: { purchaseId } }),
      ]);
      if (tasksCount > 0 || paymentsCount > 0) {
        throw new BadRequestException('По закупке уже создавалась задача или проводилась оплата. Изменения недоступны');
      }
      if (!body.actorId) throw new BadRequestException('Не указан пользователь для записи в историю');
      const actor = await this.prisma.user.findUnique({ where: { id: body.actorId }, select: { role: true } });
      if (!actor || !['MANAGER', 'LEADER', 'ADMIN'].includes(actor.role)) {
        throw new BadRequestException('Нет прав менять завод и сумму к оплате');
      }
      if (body.supplierName !== undefined) {
        if (typeof body.supplierName !== 'string' || !body.supplierName.trim()) {
          throw new BadRequestException('Укажите завод или поставщика');
        }
        body.supplierName = body.supplierName.trim();
      }
      if (body.requestedAmount !== undefined) {
        const value = Number(body.requestedAmount);
        if (!Number.isFinite(value) || value <= 0 || value >= 1000000000000) {
          throw new BadRequestException('Укажите корректную положительную сумму к оплате');
        }
        body.requestedAmount = Math.round(value * 100) / 100;
      }
    }

    const updated =
      await this.prisma
        .supplierPurchase
        .update({

          where: {
            id: purchaseId,
          },

          data: {

            supplierName:
              body.supplierName !== undefined
                ? body.supplierName
                : current.supplierName,

            incomingInvoiceNumber:
              body.incomingInvoiceNumber !== undefined
                ? body.incomingInvoiceNumber
                : current.incomingInvoiceNumber,

            requestedAmount:
              body.requestedAmount !== undefined
                ? body.requestedAmount
                : current.requestedAmount,

            incomingInvoiceAmount:
              body.incomingInvoiceAmount !== undefined
                ? body.incomingInvoiceAmount
                : current.incomingInvoiceAmount,

            comment:
              body.comment !== undefined
                ? body.comment
                : current.comment,
          },

          include: {
            payments: true,
          },
        });


    if (changeDraft && body.actorId && (
      updated.supplierName !== current.supplierName ||
      Number(updated.requestedAmount ?? updated.incomingInvoiceAmount) !==
        Number(current.requestedAmount ?? current.incomingInvoiceAmount)
    )) {
      await this.prisma.auditEvent.create({
        data: {
          dealId,
          actorId: body.actorId,
          action: 'SUPPLIER_PAYMENT_DRAFT_EDITED',
          entityType: 'SupplierPurchase', entityId: purchaseId,
          oldValue: {
            supplierName: current.supplierName,
            requestedAmount: current.requestedAmount?.toString() ?? current.incomingInvoiceAmount?.toString() ?? null,
          },
          newValue: {
            supplierName: updated.supplierName,
            requestedAmount: updated.requestedAmount?.toString() ?? null,
          },
        },
      });
    }

    if (body.sourceFileId) {

      const source =
        await this.prisma
          .storedFile
          .findFirst({
            where: {
              id: body.sourceFileId,
              dealId,
            },
          });


      if (!source) {
        throw new BadRequestException(
          'Выбранный входящий счёт не найден в сделке',
        );
      }


      const linked =
        await this.prisma
          .storedFile
          .create({
            data: {
              dealId,
              provider: source.provider,
              category:
                'SUPPLIER_INVOICE_' +
                purchaseId,
              originalName:
                source.originalName,
              mimeType:
                source.mimeType,
              size:
                source.size,
              telegramFileId:
                source.telegramFileId,
              telegramUniqueId:
                source.telegramUniqueId,
              telegramMessageId:
                source.telegramMessageId,
              telegramChatId:
                source.telegramChatId,
              externalUrl:
                source.externalUrl,
            },
          });


      if (body.actorId) {
        await this.prisma.auditEvent.create({
          data: {
            dealId,
            actorId: body.actorId,
            action:
              'SUPPLIER_INVOICE_CHANGED',
            entityType:
              'SupplierPurchase',
            entityId:
              purchaseId,
            newValue: {
              supplierName:
                updated.supplierName,
              fileId:
                linked.id,
              fileName:
                linked.originalName,
            },
          },
        });
      }
    }


    if (
      body.actorId &&
      body.incomingInvoiceAmount !== undefined &&
      Number(current.incomingInvoiceAmount || 0) !==
        Number(updated.incomingInvoiceAmount || 0)
    ) {
      await this.prisma.auditEvent.create({
        data: {
          dealId,
          actorId: body.actorId,
          action:
            'SUPPLIER_PURCHASE_UPDATED',
          entityType:
            'SupplierPurchase',
          entityId:
            purchaseId,
          oldValue: {
            amount:
              current.incomingInvoiceAmount
                ?.toString() ?? null,
          },
          newValue: {
            amount:
              updated.incomingInvoiceAmount
                ?.toString() ?? null,
            supplierName:
              updated.supplierName,
          },
        },
      });
    }


    return updated;
  }


  async requestPayment(
    dealId: string,
    purchaseId: string,
    body: any,
  ) {

    const purchase =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({

          where: {
            id: purchaseId,
            dealId,
          },
        });


    const existing =
      await this.prisma
        .task
        .findFirst({

          where: {

            supplierPurchaseId:
              purchaseId,

            type:
              TaskType.PAY_SUPPLIER,

            status: {

              notIn: [
                TaskStatus.DONE,
                TaskStatus.CANCELLED,
              ],
            },
          },
        });


    if (existing) {

      throw new BadRequestException(
        'По этому поставщику уже есть активная задача на оплату',
      );
    }


    return this.prisma
      .$transaction(
        async (tx) => {

          await tx
            .supplierPurchase
            .update({

              where: {
                id: purchaseId,
              },

              data: {

                requestedAmount:
                  purchase.requestedAmount ??
                  purchase.incomingInvoiceAmount ??
                  body.amount,

                status:
                  SupplierPurchaseStatus
                    .PAYMENT_REQUESTED,
              },
            });


          const task =
            await tx.task.create({

              data: {

                dealId,

                supplierPurchaseId:
                  purchaseId,

                type:
                  TaskType.PAY_SUPPLIER,

                title:
                  'Оплатить поставщику: ' +
                  purchase.supplierName,

                description:
                  body.comment
                    ?.trim() ||
                  purchase.comment ||
                  undefined,

                urgent:
                  Boolean(
                    body.urgent
                  ),

                payload: {
                  kind:
                    'PAY_SUPPLIER',
                  amountToPay:
                    body.amount ?? null,
                },

                createdById:
                  body.actorId,
              },
            });


          await tx
            .auditEvent
            .create({

              data: {

                dealId,

                actorId:
                  body.actorId,

                action:
                  'SUPPLIER_PAYMENT_REQUESTED',

                entityType:
                  'SupplierPurchase',

                entityId:
                  purchaseId,

                newValue: {
                  amount:
                    body.amount,

                  supplierName:
                    purchase
                      .supplierName,
                },
              },
            });


          return task;
        },
      );
  }


  private paymentState(
    purchase: any,
    payments: any[],
  ) {

    const totalPaid =
      payments.reduce(
        (
          sum,
          payment,
        ) =>
          sum +
          Number(
            payment.amount
          ),
        0,
      );


    const target =
      purchase.requestedAmount
        ? Number(
            purchase
              .requestedAmount
          )

        : purchase
            .incomingInvoiceAmount
          ? Number(
              purchase
                .incomingInvoiceAmount
            )

          : null;


    const financiallyComplete =
      target === null
        ? totalPaid > 0
        : totalPaid >= target;


    const allDocumentsSatisfied =
      payments.length > 0 &&
      payments.every(
        (payment) =>
          Boolean(
            payment
              .paymentOrderStamped
          ) ||
          Boolean(
            payment
              .paidFromBalance
          )
      );


    // Оплата и наличие платёжки — разные этапы.
    // Как только нужная сумма оплачена, закупка считается
    // оплаченной и задача оплаты закрывается. Документ с
    // печатью можно запросить отдельно позже.
    const complete =
      financiallyComplete;


    return {
      totalPaid,
      target,
      financiallyComplete,
      allDocumentsSatisfied,
      complete,
    };
  }


  async addPayment(
    dealId: string,
    purchaseId: string,
    body: any,
  ) {

    const amount =
      Number(
        body.amount || 0
      );


    return this.prisma
      .$transaction(
        async (tx) => {

          const purchase =
            await tx
              .supplierPurchase
              .findFirstOrThrow({

                where: {
                  id: purchaseId,
                  dealId,
                },

                include: {
                  payments: true,
                },
              });


          const payment =
            await tx
              .supplierPayment
              .create({

                data: {

                  purchaseId,

                  amount,

                  paidAt:
                    body.paidAt
                      ? new Date(
                          body.paidAt
                        )
                      : new Date(),

                  paymentOrderStamped:
                    Boolean(
                      body
                        .paymentOrderStamped
                    ),

                  paidFromBalance:
                    Boolean(
                      body
                        .paidFromBalance
                    ),

                  comment:
                    body.comment
                      ?.trim() ||
                    undefined,

                  actorId:
                    body.actorId,
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
              });


          const state =
            this.paymentState(
              purchase,
              [
                ...purchase.payments,
                payment,
              ],
            );


          const nextStatus =
            state.complete

              ? SupplierPurchaseStatus.PAID

              : state.totalPaid > 0

                ? SupplierPurchaseStatus
                    .PARTIALLY_PAID

                : SupplierPurchaseStatus
                    .PAYMENT_REQUESTED;


          await tx
            .supplierPurchase
            .update({

              where: {
                id: purchaseId,
              },

              data: {
                status:
                  nextStatus,
              },
            });


          if (
            state.complete
          ) {

            await tx.task
              .updateMany({

                where: {

                  supplierPurchaseId:
                    purchaseId,

                  type:
                    TaskType
                      .PAY_SUPPLIER,

                  status: {

                    notIn: [
                      TaskStatus.DONE,
                      TaskStatus.CANCELLED,
                    ],
                  },
                },

                data: {

                  status:
                    TaskStatus.DONE,

                  completedAt:
                    new Date(),
                },
              });
          }


          await tx
            .auditEvent
            .create({

              data: {

                dealId,

                actorId:
                  body.actorId,

                action:
                  'SUPPLIER_PAYMENT_ADDED',

                entityType:
                  'SupplierPayment',

                entityId:
                  payment.id,

                newValue: {

                  supplierName:
                    purchase
                      .supplierName,

                  amount,

                  paymentOrderStamped:
                    Boolean(
                      body
                        .paymentOrderStamped
                    ),

                  paidFromBalance:
                    Boolean(
                      body
                        .paidFromBalance
                    ),

                  totalPaid:
                    state.totalPaid,
                },
              },
            });


          return payment;
        },
      );
  }


  async requestBalanceCorrection(
    dealId: string,
    purchaseId: string,
    body: {
      actualAmount: number;
      comment?: string;
      actorId: string;
    },
  ) {

    const actualAmount =
      Number(body.actualAmount);


    if (
      !Number.isFinite(actualAmount) ||
      actualAmount < 0
    ) {
      throw new BadRequestException(
        'Укажите фактическую сумму списания с остатка',
      );
    }


    const purchase =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({
          where: {
            id: purchaseId,
            dealId,
          },
          include: {
            payments: {
              orderBy: {
                paidAt: 'desc',
              },
            },
            tasks: {
              where: {
                type:
                  TaskType.OTHER,
                status: {
                  notIn: [
                    TaskStatus.DONE,
                    TaskStatus.CANCELLED,
                  ],
                },
              },
            },
          },
        });


    const balancePayment =
      purchase.payments.find(
        (payment) =>
          payment.paidFromBalance,
      );


    if (!balancePayment) {
      throw new BadRequestException(
        'По этой закупке нет оплаты с остатка',
      );
    }


    const existing =
      purchase.tasks.find(
        (task) => {
          const payload =
            task.payload as
              | Record<string, unknown>
              | null;

          return payload?.kind ===
            'SUPPLIER_BALANCE_CORRECTION';
        },
      );


    if (existing) {
      throw new BadRequestException(
        'Корректировка оплаты с остатка уже отправлена бухгалтерии',
      );
    }


    const oldAmount =
      Number(balancePayment.amount);


    if (
      Math.abs(
        oldAmount - actualAmount,
      ) < 0.001
    ) {
      throw new BadRequestException(
        'Фактическая сумма не изменилась',
      );
    }


    const task =
      await this.prisma.task.create({
        data: {
          dealId,
          supplierPurchaseId:
            purchaseId,
          type:
            TaskType.OTHER,
          title:
            'Уточнить списание с остатка: ' +
            purchase.supplierName,
          description:
            body.comment?.trim() ||
            undefined,
          createdById:
            body.actorId,
          payload: {
            kind:
              'SUPPLIER_BALANCE_CORRECTION',
            paymentId:
              balancePayment.id,
            oldAmount,
            requestedAmount:
              actualAmount,
            supplierName:
              purchase.supplierName,
          },
        },
      });


    await this.prisma.auditEvent.create({
      data: {
        dealId,
        actorId:
          body.actorId,
        action:
          'SUPPLIER_BALANCE_CORRECTION_REQUESTED',
        entityType:
          'SupplierPayment',
        entityId:
          balancePayment.id,
        oldValue: {
          amount:
            balancePayment.amount
              .toString(),
        },
        newValue: {
          amount:
            actualAmount,
          supplierName:
            purchase.supplierName,
          paidFromBalance:
            true,
        },
        reason:
          body.comment?.trim() ||
          undefined,
      },
    });


    return task;
  }


  async requestStampedPayment(
    dealId: string,
    purchaseId: string,
    actorId: string,
  ) {

    const purchase =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({
          where: {
            id: purchaseId,
            dealId,
          },
          include: {
            payments: true,
          },
        });


    const needsStampedDocument =
      purchase.payments.some(
        (payment) =>
          !payment.paymentOrderStamped &&
          !payment.paidFromBalance
      );


    if (!needsStampedDocument) {
      throw new BadRequestException(
        'По этой закупке нет оплаты, для которой нужна платёжка с печатью',
      );
    }


    const existing =
      await this.prisma.task.findFirst({
        where: {
          supplierPurchaseId: purchaseId,
          type: TaskType.PAY_SUPPLIER,
          status: {
            notIn: [
              TaskStatus.DONE,
              TaskStatus.CANCELLED,
            ],
          },
        },
      });


    if (existing) {
      throw new BadRequestException(
        'Запрос платёжки с печатью уже передан бухгалтерии',
      );
    }


    return this.prisma.$transaction(
      async (tx) => {

        const task = await tx.task.create({
          data: {
            dealId,
            supplierPurchaseId: purchaseId,
            type: TaskType.PAY_SUPPLIER,
            title:
              'Приложить платёжку с печатью: ' +
              purchase.supplierName,
            description:
              'Оплата уже проведена. Нужна платёжка с печатью.',
            createdById: actorId,
          },
        });


        await tx.auditEvent.create({
          data: {
            dealId,
            actorId,
            action: 'SUPPLIER_STAMP_REQUESTED',
            entityType: 'SupplierPurchase',
            entityId: purchaseId,
            newValue: {
              supplierName: purchase.supplierName,
            },
          },
        });


        return task;
      },
    );
  }


  async markPaymentStamped(
    dealId: string,
    purchaseId: string,
    paymentId: string,
    actorId: string,
  ) {

    return this.prisma
      .$transaction(
        async (tx) => {

          const purchase =
            await tx
              .supplierPurchase
              .findFirstOrThrow({

                where: {
                  id: purchaseId,
                  dealId,
                },
              });


          const existing =
            await tx
              .supplierPayment
              .findFirstOrThrow({

                where: {
                  id: paymentId,
                  purchaseId,
                },
              });


          const updated =
            await tx
              .supplierPayment
              .update({

                where: {
                  id: paymentId,
                },

                data: {
                  paymentOrderStamped:
                    true,
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
              });


          const payments =
            await tx
              .supplierPayment
              .findMany({

                where: {
                  purchaseId,
                },

                orderBy: {
                  paidAt: 'asc',
                },
              });


          const state =
            this.paymentState(
              purchase,
              payments,
            );


          await tx
            .supplierPurchase
            .update({

              where: {
                id: purchaseId,
              },

              data: {

                status:
                  state.complete

                    ? SupplierPurchaseStatus
                        .PAID

                    : state.totalPaid > 0

                      ? SupplierPurchaseStatus
                          .PARTIALLY_PAID

                      : SupplierPurchaseStatus
                          .PAYMENT_REQUESTED,
              },
            });


          if (
            state.complete
          ) {

            await tx.task
              .updateMany({

                where: {

                  supplierPurchaseId:
                    purchaseId,

                  type:
                    TaskType
                      .PAY_SUPPLIER,

                  status: {

                    notIn: [
                      TaskStatus.DONE,
                      TaskStatus.CANCELLED,
                    ],
                  },
                },

                data: {

                  status:
                    TaskStatus.DONE,

                  completedAt:
                    new Date(),
                },
              });
          }


          await tx
            .auditEvent
            .create({

              data: {

                dealId,

                actorId,

                action:
                  'SUPPLIER_PAYMENT_STAMPED',

                entityType:
                  'SupplierPayment',

                entityId:
                  paymentId,

                oldValue: {
                  paymentOrderStamped:
                    existing
                      .paymentOrderStamped,
                },

                newValue: {
                  paymentOrderStamped:
                    true,

                  supplierName:
                    purchase
                      .supplierName,
                },
              },
            });


          return updated;
        },
      );
  }

  async cancelPurchase(
    dealId: string,
    purchaseId: string,
  ) {

    const purchase =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({

          where: {
            id: purchaseId,
            dealId,
          },

          include: {

            payments: true,

            tasks: {

              where: {
                type:
                  TaskType
                    .PAY_SUPPLIER,
              },

              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });


    if (
      purchase.payments.length > 0
    ) {

      throw new BadRequestException(
        'По этой закупке уже есть оплата. Автоматическая отмена невозможна.',
      );
    }


    const inWork =
      purchase.tasks.find(
        (task) =>
          task.status ===
            TaskStatus
              .IN_PROGRESS ||
          task.status ===
            TaskStatus
              .NEED_DATA
      );


    if (inWork) {

      throw new BadRequestException(
        'Бухгалтер уже взял оплату в работу. Автоматически отменить её нельзя.',
      );
    }


    const completed =
      purchase.tasks.find(
        (task) =>
          task.status ===
            TaskStatus.DONE
      );


    if (completed) {

      throw new BadRequestException(
        'Задача по оплате уже выполнена. Автоматическая отмена невозможна.',
      );
    }


    await this.prisma
      .$transaction(
        async (tx) => {

          // If request was sent but accountant
          // has not started it yet, remove task.

          await tx.task
            .deleteMany({

              where: {
                supplierPurchaseId:
                  purchaseId,
              },
            });


          // Remove database references to
          // supplier draft attachments.

          await tx.storedFile
            .deleteMany({

              where: {

                dealId,

                category: {
                  in: [
                    'SUPPLIER_INVOICE_' +
                      purchaseId,
                    'SUPPLIER_ATTACHMENT_' +
                      purchaseId,
                  ],
                },
              },
            });


          // User requested no history
          // when draft/request is cancelled
          // before accountant starts work.

          await tx.auditEvent
            .deleteMany({

              where: {

                dealId,

                entityType:
                  'SupplierPurchase',

                entityId:
                  purchaseId,
              },
            });


          await tx
            .supplierPurchase
            .delete({

              where: {
                id: purchaseId,
              },
            });
        },
      );


    return {
      success: true,
    };
  }

}
