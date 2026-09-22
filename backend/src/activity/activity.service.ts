import {
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
