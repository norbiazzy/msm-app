
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  SellerType,
  TaskStatus,
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

                deliveryAddresses:
                  dto.deliveryAddresses
                    ?.map(
                      (value) =>
                        value.trim()
                    )
                    .filter(Boolean),

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


          if (!dto.deferInvoiceTask) {

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
          }


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


          auditEvents: {
            where: {
              action:
                'INVOICE_REQUEST_RETURNED',
            },

            orderBy: {
              createdAt: 'desc',
            },

            take: 1,
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


          supplierPurchases: {
            orderBy: {
              createdAt: 'asc',
            },
          },


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

  async submitInvoiceRequest(
    id: string,
    body: {
      actorId: string;
      urgent?: boolean;
    },
  ) {

    const deal =
      await this.prisma.deal
        .findUniqueOrThrow({
          where: { id },
        });


    const active =
      await this.prisma.task
        .findFirst({
          where: {
            dealId: id,
            type: TaskType.ISSUE_CLIENT_INVOICE,
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


    if (active?.status === TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Бухгалтер уже взял запрос в работу',
      );
    }


    const task = active
      ? await this.prisma.task.update({
          where: { id: active.id },
          data: {
            status: TaskStatus.NEW,
            assigneeId: null,
            completedAt: null,
            urgent:
              body.urgent !== undefined
                ? Boolean(body.urgent)
                : active.urgent,
            description:
              deal.accountingComment ||
              active.description,
          },
        })
      : await this.prisma.task.create({
          data: {
            dealId: id,
            type: TaskType.ISSUE_CLIENT_INVOICE,
            title: 'Выставить счёт',
            description:
              deal.accountingComment || undefined,
            urgent: Boolean(body.urgent),
            createdById: body.actorId,
          },
        });


    await this.prisma.auditEvent.create({
      data: {
        dealId: id,
        actorId: body.actorId,
        action: active
          ? 'INVOICE_REQUEST_RESUBMITTED'
          : 'INVOICE_REQUEST_SUBMITTED',
        entityType: 'Task',
        entityId: task.id,
        newValue: {
          status: TaskStatus.NEW,
        },
      },
    });


    return task;
  }


  async withdrawInvoiceRequest(
    id: string,
    actorId: string,
  ) {

    const task =
      await this.prisma.task
        .findFirst({
          where: {
            dealId: id,
            type: TaskType.ISSUE_CLIENT_INVOICE,
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
        'Активный запрос на счёт не найден',
      );
    }


    if (task.status === TaskStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Бухгалтер уже взял запрос в работу. Отозвать его автоматически нельзя.',
      );
    }


    const updated =
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.CANCELLED,
          completedAt: new Date(),
        },
      });


    await this.prisma.auditEvent.create({
      data: {
        dealId: id,
        actorId,
        action: 'INVOICE_REQUEST_WITHDRAWN',
        entityType: 'Task',
        entityId: task.id,
        oldValue: {
          status: task.status,
        },
        newValue: {
          status: TaskStatus.CANCELLED,
        },
      },
    });


    return updated;
  }


  async updateInfo(
    id: string,

    body: {
      sellerType?: SellerType;
      clientName?: string;
      contactName?: string;
      clientPhone?: string;
      managerComment?: string;
      accountingComment?: string;
      marginMode?: string;
      marginValue?: number;
      deliveryAddresses?: string[];
      actorId: string;
    },
  ) {

    const current =
      await this.prisma
        .deal
        .findUniqueOrThrow({
          where: {
            id,
          },
        });


    if (
      body.sellerType !== undefined &&
      body.sellerType !== current.sellerType
    ) {

      const existingInvoice =
        await this.prisma
          .clientInvoice
          .findFirst({
            where: {
              dealId: id,
              isCurrent: true,
            },

            select: {
              id: true,
            },
          });


      if (existingInvoice) {

        throw new BadRequestException(
          'После выставления счёта изменить СТ / МСМ / ИП нельзя',
        );
      }
    }


    const currentAddresses =
      Array.isArray(
        current.deliveryAddresses
      )

        ? current.deliveryAddresses
            .filter(
              (
                value,
              ): value is string =>
                typeof value ===
                'string'
            )

        : [];


    const nextContactName =
      body.contactName !==
        undefined

        ? body.contactName
            .trim() ||
          null

        : current.contactName;


    const nextPhone =
      body.clientPhone !==
        undefined

        ? body.clientPhone
            .trim() ||
          null

        : current.clientPhone;


    const nextComment =
      body.managerComment !==
        undefined

        ? body.managerComment
            .trim() ||
          null

        : current.managerComment;


    const nextAddresses =
      body.deliveryAddresses !==
        undefined

        ? body.deliveryAddresses
            .map(
              (value) =>
                value.trim()
            )
            .filter(Boolean)

        : currentAddresses;


    const nextSellerType =
      body.sellerType !== undefined
        ? body.sellerType
        : current.sellerType;


    const nextClientName =
      body.clientName !== undefined
        ? body.clientName.trim() || current.clientName
        : current.clientName;


    const nextAccountingComment =
      body.accountingComment !== undefined
        ? body.accountingComment.trim() || null
        : current.accountingComment;


    const nextMarginMode =
      body.marginMode !== undefined
        ? body.marginMode || null
        : current.marginMode;


    const nextMarginValue =
      body.marginValue !== undefined
        ? body.marginValue
        : current.marginValue;


    return this.prisma
      .$transaction(
        async (tx) => {

          const updated =
            await tx.deal.update({
              where: {
                id,
              },

              data: {
                sellerType:
                  nextSellerType,

                clientName:
                  nextClientName,

                contactName:
                  nextContactName,

                clientPhone:
                  nextPhone,

                managerComment:
                  nextComment,

                accountingComment:
                  nextAccountingComment,

                marginMode:
                  nextMarginMode,

                marginValue:
                  nextMarginValue,

                deliveryAddresses:
                  nextAddresses,
              },
            });


          if (
            current.sellerType !==
            nextSellerType
          ) {

            await tx.auditEvent.create({
              data: {
                dealId:
                  id,

                actorId:
                  body.actorId,

                action:
                  'DEAL_SELLER_CHANGED',

                entityType:
                  'Deal',

                entityId:
                  id,

                oldValue: {
                  sellerType:
                    current.sellerType,
                },

                newValue: {
                  sellerType:
                    nextSellerType,
                },
              },
            });
          }


          if (
            (current.contactName || null) !==
            (nextContactName || null)
          ) {

            await tx.auditEvent.create({
              data: {
                dealId:
                  id,

                actorId:
                  body.actorId,

                action:
                  'DEAL_CONTACT_CHANGED',

                entityType:
                  'Deal',

                entityId:
                  id,

                oldValue: {
                  contactName:
                    current.contactName ||
                    null,
                },

                newValue: {
                  contactName:
                    nextContactName ||
                    null,
                },
              },
            });
          }


          if (
            (current.clientPhone || null) !==
            (nextPhone || null)
          ) {

            await tx.auditEvent.create({
              data: {
                dealId:
                  id,

                actorId:
                  body.actorId,

                action:
                  'DEAL_PHONE_CHANGED',

                entityType:
                  'Deal',

                entityId:
                  id,

                oldValue: {
                  clientPhone:
                    current.clientPhone ||
                    null,
                },

                newValue: {
                  clientPhone:
                    nextPhone ||
                    null,
                },
              },
            });
          }


          if (
            (current.managerComment || null) !==
            (nextComment || null)
          ) {

            await tx.auditEvent.create({
              data: {
                dealId:
                  id,

                actorId:
                  body.actorId,

                action:
                  'MANAGER_COMMENT_CHANGED',

                entityType:
                  'Deal',

                entityId:
                  id,
              },
            });
          }


          if (
            JSON.stringify(
              currentAddresses
            ) !==
            JSON.stringify(
              nextAddresses
            )
          ) {

            await tx.auditEvent.create({
              data: {
                dealId:
                  id,

                actorId:
                  body.actorId,

                action:
                  'DELIVERY_ADDRESSES_CHANGED',

                entityType:
                  'Deal',

                entityId:
                  id,

                oldValue: {
                  deliveryAddresses:
                    currentAddresses,
                },

                newValue: {
                  deliveryAddresses:
                    nextAddresses,
                },
              },
            });
          }


          return updated;
        },
      );
  }


  async updateShipmentDate(
    id: string,

    body: {
      plannedShipmentAt?: string;
      actorId: string;
    },
  ) {

    const current =
      await this.prisma
        .deal
        .findUniqueOrThrow({

          where: {
            id,
          },
        });


    const nextDate =
      body.plannedShipmentAt

        ? new Date(
            body.plannedShipmentAt +
            'T12:00:00.000Z'
          )

        : null;


    const updated =
      await this.prisma
        .deal
        .update({

          where: {
            id,
          },

          data: {
            plannedShipmentAt:
              nextDate,
          },
        });


    const oldDate =
      current.plannedShipmentAt
        ?.toISOString()
        .slice(0, 10) ??
      null;


    const newDate =
      updated.plannedShipmentAt
        ?.toISOString()
        .slice(0, 10) ??
      null;


    if (
      oldDate !== newDate
    ) {

      await this.prisma
        .auditEvent
        .create({

          data: {

            dealId:
              id,

            actorId:
              body.actorId,

            action:
              'SHIPMENT_DATE_CHANGED',

            entityType:
              'Deal',

            entityId:
              id,

            oldValue: {
              plannedShipmentAt:
                oldDate,
            },

            newValue: {
              plannedShipmentAt:
                newDate,
            },
          },
        });
    }


    return updated;
  }



}
