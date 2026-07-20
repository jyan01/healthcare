import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { HealthDataService } from './health-data.service';

@Injectable()
export class HealthDataCleanupService {
  private readonly logger = new Logger(HealthDataCleanupService.name);

  constructor(
    private readonly healthDataService: HealthDataService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup(): Promise<void> {
    const retentionDays = Number(
      this.configService.get('HEALTH_DATA_RETENTION_DAYS') ?? 7,
    );
    this.logger.log('오래된 건강데이터 정리 작업 시작');
    await this.healthDataService.cleanupOldData(retentionDays);
  }
}
