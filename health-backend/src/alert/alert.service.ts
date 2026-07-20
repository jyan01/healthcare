import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  BloodPressureRecord,
  GlucoseRecord,
  HeartRateRecord,
  isAlertTarget,
} from '../shared';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendSlackMessage(
    message: string,
  ): Promise<{ sent: boolean; sentAt: string }> {
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    const sentAt = new Date().toISOString();

    if (!webhookUrl) {
      this.logger.warn(
        'SLACK_WEBHOOK_URL이 설정되지 않아 알림을 보내지 않습니다.',
      );
      return { sent: false, sentAt };
    }

    try {
      await firstValueFrom(
        this.httpService.post(webhookUrl, { text: message }),
      );
      return { sent: true, sentAt };
    } catch (error) {
      this.logger.error(`Slack 알림 발송 실패: ${(error as Error).message}`);
      return { sent: false, sentAt };
    }
  }

  async checkHeartRate(
    memberId: string,
    memberName: string,
    record: HeartRateRecord,
  ): Promise<void> {
    if (!isAlertTarget('heartRate', record.status)) return;
    await this.sendSlackMessage(
      `[이상감지] ${memberId} ${memberName} - 심박수 ${record.heartRate}bpm (${record.measuredAt})`,
    );
  }

  async checkBloodPressure(
    memberId: string,
    memberName: string,
    record: BloodPressureRecord,
  ): Promise<void> {
    if (!isAlertTarget('bloodPressure', record.status)) return;
    await this.sendSlackMessage(
      `[이상감지] ${memberId} ${memberName} - 혈압 ${record.systolic}/${record.diastolic}mmHg (${record.measuredAt})`,
    );
  }

  async checkGlucose(
    memberId: string,
    memberName: string,
    record: GlucoseRecord,
  ): Promise<void> {
    if (!isAlertTarget('glucose', record.status)) return;
    await this.sendSlackMessage(
      `[이상감지] ${memberId} ${memberName} - 혈당 ${record.glucoseValue}mg/dL (${record.measuredAt})`,
    );
  }
}
