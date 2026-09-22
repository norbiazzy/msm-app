import {
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
