import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AlertService } from './alert.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [HttpModule],
  controllers: [WebhookController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
