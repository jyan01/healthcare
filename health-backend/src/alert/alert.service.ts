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
import { AiAgentService } from '../ai-agent/ai-agent.service';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly aiAgentService: AiAgentService,
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

  /**
   * AI Agent API(health-ai)에 이상 수치를 전달해 Slack 알림 문구를 작성시킨다.
   * AI 호출이 실패(타임아웃 등)해도 알림 자체는 지연 없이 나가야 하므로 실패 시 fallback 문구로 대체한다.
   */
  private async composeAlertMessage(
    prompt: string,
    fallback: string,
  ): Promise<string> {
    try {
      const aiMessage = await this.aiAgentService.ask(prompt);
      return aiMessage.trim() || fallback;
    } catch (error) {
      this.logger.warn(
        `AI 알림 문구 생성 실패, 기본 문구로 대체: ${(error as Error).message}`,
      );
      return fallback;
    }
  }

  async checkHeartRate(
    memberId: string,
    memberName: string,
    record: HeartRateRecord,
  ): Promise<void> {
    if (!isAlertTarget('heartRate', record.status)) return;
    const fallback = `[이상감지] ${memberId} ${memberName} - 심박수 ${record.heartRate}bpm (${record.measuredAt})`;
    const message = await this.composeAlertMessage(
      `환자 ${memberName}(회원ID ${memberId})의 심박수가 ${record.heartRate}bpm으로 측정되어 이상 수치로 감지되었습니다(측정시각 ${record.measuredAt}). 의료진에게 전달할 Slack 알림 메시지를 한국어 1~2문장으로 간결하게 작성해줘. 수치와 필요한 조치를 포함해줘.`,
      fallback,
    );
    await this.sendSlackMessage(message);
  }

  async checkBloodPressure(
    memberId: string,
    memberName: string,
    record: BloodPressureRecord,
  ): Promise<void> {
    if (!isAlertTarget('bloodPressure', record.status)) return;
    const fallback = `[이상감지] ${memberId} ${memberName} - 혈압 ${record.systolic}/${record.diastolic}mmHg (${record.measuredAt})`;
    const message = await this.composeAlertMessage(
      `환자 ${memberName}(회원ID ${memberId})의 혈압이 ${record.systolic}/${record.diastolic}mmHg로 측정되어 이상 수치로 감지되었습니다(측정시각 ${record.measuredAt}). 의료진에게 전달할 Slack 알림 메시지를 한국어 1~2문장으로 간결하게 작성해줘. 수치와 필요한 조치를 포함해줘.`,
      fallback,
    );
    await this.sendSlackMessage(message);
  }

  async checkGlucose(
    memberId: string,
    memberName: string,
    record: GlucoseRecord,
  ): Promise<void> {
    if (!isAlertTarget('glucose', record.status)) return;
    const fallback = `[이상감지] ${memberId} ${memberName} - 혈당 ${record.glucoseValue}mg/dL (${record.measuredAt})`;
    const message = await this.composeAlertMessage(
      `환자 ${memberName}(회원ID ${memberId})의 혈당이 ${record.glucoseValue}mg/dL로 측정되어 이상 수치로 감지되었습니다(측정시각 ${record.measuredAt}). 의료진에게 전달할 Slack 알림 메시지를 한국어 1~2문장으로 간결하게 작성해줘. 수치와 필요한 조치를 포함해줘.`,
      fallback,
    );
    await this.sendSlackMessage(message);
  }
}
