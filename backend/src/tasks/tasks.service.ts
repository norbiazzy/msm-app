import { BadRequestException, Injectable } from '@nestjs/common';
import { TaskStatus, TaskType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {

  constructor(
    private readonly prisma:
      PrismaService
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
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },


          supplierPurchase: {

            include: {

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


  async returnInvoiceRequest(
    id: string,
    body: {
      actorId: string;
      reasonCode: string;
      comment?: string;
    },
  ) {

    const reasons:
      Record<string, string> = {
      NO_INCOMING_INVOICE:
        'Нет входящего счёта',
      NO_TERMS:
        'Нет условий',
      NO_DETAILS:
        'Нет реквизитов / непонятно, на кого делать',
      OTHER:
        'Другое',
    };


    const reasonLabel =
      reasons[body.reasonCode];


    if (!reasonLabel) {
      throw new BadRequestException(
        'Выберите причину возврата',
      );
    }


    const comment =
      body.comment?.trim() || '';


    if (
      body.reasonCode === 'OTHER' &&
      !comment
    ) {
      throw new BadRequestException(
        'Для причины «Другое» добавьте комментарий',
      );
    }


    return this.prisma.$transaction(
      async (tx) => {

        const task =
          await tx.task
            .findUniqueOrThrow({
              where: { id },
            });


        if (
          task.type !==
          TaskType.ISSUE_CLIENT_INVOICE
        ) {
          throw new BadRequestException(
            'Эту задачу нельзя вернуть как запрос на счёт',
          );
        }


        if (
          !(task.status === TaskStatus.NEW || task.status === TaskStatus.IN_PROGRESS)
        ) {
          throw new BadRequestException(
            'Задача уже не находится на этапе выставления счёта',
          );
        }


        const updated =
          await tx.task.update({
            where: { id },
            data: {
              status:
                TaskStatus.NEED_DATA,
              assigneeId:
                body.actorId,
              completedAt: null,
            },
          });


        await tx.auditEvent.create({
          data: {
            dealId:
              task.dealId,
            actorId:
              body.actorId,
            action:
              'INVOICE_REQUEST_RETURNED',
            entityType:
              'Task',
            entityId:
              task.id,
            oldValue: {
              status:
                task.status,
            },
            newValue: {
              status:
                TaskStatus.NEED_DATA,
              reasonCode:
                body.reasonCode,
              reasonLabel,
            },
            reason:
              comment || undefined,
          },
        });


        return updated;
      },
    );
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
