import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import type { ConfigService } from '@nestjs/config';
import { AlertService } from '../../src/alert/alert.service';
import { AiAgentService } from '../../src/ai-agent/ai-agent.service';
import type { HeartRateRecord } from '../../../shared/types';

function buildHeartRateRecord(
  overrides: Partial<HeartRateRecord> = {},
): HeartRateRecord {
  return {
    memberId: 'user_003',
    heartRate: 105,
    status: '이상',
    remark: null,
    measuredAt: '2026-07-21T10:00:00+09:00',
    ...overrides,
  };
}

describe('AlertService', () => {
  let httpService: { post: jest.Mock };
  let configService: { get: jest.Mock };
  let aiAgentService: jest.Mocked<Pick<AiAgentService, 'ask'>>;
  let service: AlertService;

  beforeEach(() => {
    httpService = { post: jest.fn().mockReturnValue(of({ data: 'ok' })) };
    configService = {
      get: jest.fn().mockReturnValue('https://hooks.slack.com/services/xxx'),
    };
    aiAgentService = { ask: jest.fn() };

    service = new AlertService(
      httpService as unknown as HttpService,
      configService as unknown as ConfigService,
      aiAgentService as unknown as AiAgentService,
    );
  });

  it('정상 수치는 알림을 보내지 않는다', async () => {
    await service.checkHeartRate(
      'user_003',
      '박지훈',
      buildHeartRateRecord({ status: '정상' }),
    );

    expect(aiAgentService.ask).not.toHaveBeenCalled();
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('이상 수치 감지 시 AI가 작성한 문구를 Slack으로 전송한다', async () => {
    aiAgentService.ask.mockResolvedValue('박지훈님의 심박수가 105bpm으로 높습니다. 확인이 필요합니다.');

    await service.checkHeartRate('user_003', '박지훈', buildHeartRateRecord());

    expect(aiAgentService.ask).toHaveBeenCalledTimes(1);
    expect(httpService.post).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/xxx',
      { text: '박지훈님의 심박수가 105bpm으로 높습니다. 확인이 필요합니다.' },
    );
  });

  it('AI 호출이 실패하면 기본 문구로 대체해서 전송한다', async () => {
    aiAgentService.ask.mockRejectedValue(new Error('timeout'));

    await service.checkHeartRate('user_003', '박지훈', buildHeartRateRecord());

    expect(httpService.post).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/xxx',
      {
        text: '[이상감지] user_003 박지훈 - 심박수 105bpm (2026-07-21T10:00:00+09:00)',
      },
    );
  });

  it('Slack 발송 자체가 실패해도 예외를 던지지 않고 sent:false를 반환한다', async () => {
    httpService.post.mockReturnValue(throwError(() => new Error('network')));
    aiAgentService.ask.mockResolvedValue('메시지');

    await expect(
      service.checkHeartRate('user_003', '박지훈', buildHeartRateRecord()),
    ).resolves.toBeUndefined();
  });
});
