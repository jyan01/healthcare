import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { MemberService } from '../../src/member/member.service';
import { Member } from '../../src/member/entities/member.entity';
import { MemberDisease } from '../../src/member/entities/member-disease.entity';
import { DiseaseCode } from '../../src/member/entities/disease-code.entity';
import { HealthDataService } from '../../src/health-data/health-data.service';
import { AiAgentService } from '../../src/ai-agent/ai-agent.service';
import type { JwtPayload } from '../../../shared/types';

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    memberId: 'user_003',
    password: 'hashed',
    memberName: '박지훈',
    gender: 'M',
    birthDate: '19810217',
    memberType: 'P',
    apiKey: 'key_003',
    regDate: new Date(),
    modDate: null,
    ...overrides,
  };
}

describe('MemberService', () => {
  let memberRepo: { findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let memberDiseaseRepo: { find: jest.Mock };
  let diseaseCodeRepo: { find: jest.Mock };
  let healthDataService: jest.Mocked<
    Pick<HealthDataService, 'getRecent' | 'getByPeriod'>
  >;
  let aiAgentService: jest.Mocked<Pick<AiAgentService, 'ask'>>;
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };
  let service: MemberService;

  const doctor: JwtPayload = {
    userId: 'admin',
    name: '김닥터',
    apiKey: 'admin',
  };
  const patient: JwtPayload = {
    userId: 'user_003',
    name: '박지훈',
    apiKey: 'key_003',
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn(),
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);

    memberRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    memberDiseaseRepo = { find: jest.fn().mockResolvedValue([]) };
    diseaseCodeRepo = { find: jest.fn().mockResolvedValue([]) };
    healthDataService = {
      getRecent: jest.fn().mockResolvedValue({
        heartRate: [],
        bloodPressure: [],
        bodyWeight: [],
        glucose: [],
        stepCount: [],
      }),
      getByPeriod: jest.fn().mockResolvedValue({}),
    };
    aiAgentService = {
      ask: jest.fn().mockResolvedValue('AI 요약 결과'),
    };

    service = new MemberService(
      memberRepo as unknown as Repository<Member>,
      memberDiseaseRepo as unknown as Repository<MemberDisease>,
      diseaseCodeRepo as unknown as Repository<DiseaseCode>,
      healthDataService as unknown as HealthDataService,
      aiAgentService as unknown as AiAgentService,
    );
  });

  describe('findAll', () => {
    it('의사가 요청하면 환자 전체 목록을 조회한다', async () => {
      memberRepo.findOne.mockResolvedValue(
        buildMember({ memberId: 'admin', memberType: 'D' }),
      );
      queryBuilder.getMany.mockResolvedValue([
        buildMember(),
        buildMember({ memberId: 'user_004' }),
      ]);

      const result = await service.findAll(doctor, {});

      expect(queryBuilder.where).toHaveBeenCalledWith('m.member_type = :type', {
        type: 'P',
      });
      expect(result).toHaveLength(2);
    });

    it('환자가 요청하면 본인 정보 1건만 반환한다', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      const result = await service.findAll(patient, {});

      expect(result).toEqual([
        {
          memberId: 'user_003',
          name: '박지훈',
          gender: 'M',
          birthDate: '19810217',
        },
      ]);
      expect(memberRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('요청자를 찾을 수 없으면 ForbiddenException을 던진다', async () => {
      memberRepo.findOne.mockResolvedValue(null);

      await expect(service.findAll(doctor, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('findDetail', () => {
    it('환자가 본인 상세정보를 조회하면 성공한다', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      const result = await service.findDetail('user_003', patient);

      expect(result.member.memberId).toBe('user_003');
      expect(healthDataService.getRecent).toHaveBeenCalledWith('user_003');
    });

    it('환자가 다른 회원의 상세정보를 조회하면 ForbiddenException을 던진다', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      await expect(
        service.findDetail('user_004', patient),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('의사는 임의 회원의 상세정보를 조회할 수 있다', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(
          buildMember({ memberId: 'admin', memberType: 'D' }),
        ) // assertAccess의 요청자 조회
        .mockResolvedValueOnce(buildMember({ memberId: 'user_004' })); // 대상 회원 조회

      const result = await service.findDetail('user_004', doctor);

      expect(result.member.memberId).toBe('user_004');
    });

    it('대상 회원이 존재하지 않으면 NotFoundException을 던진다', async () => {
      memberRepo.findOne
        .mockResolvedValueOnce(
          buildMember({ memberId: 'admin', memberType: 'D' }),
        )
        .mockResolvedValueOnce(null);

      await expect(
        service.findDetail('unknown', doctor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getHealthDataByPeriod', () => {
    it('환자가 본인 데이터를 조회하면 성공한다', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());
      const startAt = new Date('2026-07-01');
      const endAt = new Date('2026-07-08');

      await service.getHealthDataByPeriod('user_003', patient, startAt, endAt);

      expect(healthDataService.getByPeriod).toHaveBeenCalledWith(
        'user_003',
        startAt,
        endAt,
      );
    });

    it('환자가 다른 회원 데이터를 조회하면 ForbiddenException을 던진다', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      await expect(
        service.getHealthDataByPeriod(
          'user_004',
          patient,
          new Date(),
          new Date(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getAiSummary', () => {
    it('최근 건강데이터를 프롬프트로 구성해 AiAgentService에 전달하고 결과를 반환한다', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());
      healthDataService.getRecent.mockResolvedValue({
        heartRate: [
          { heartRate: 105, status: '이상', remark: null, measuredAt: '2026-07-21T00:00:00Z' },
        ],
        bloodPressure: [],
        bodyWeight: [],
        glucose: [],
        stepCount: [],
      });

      const result = await service.getAiSummary('user_003', patient);

      expect(aiAgentService.ask).toHaveBeenCalledTimes(1);
      const prompt = aiAgentService.ask.mock.calls[0][0] as string;
      expect(prompt).toContain('105bpm');
      expect(result).toEqual({ summary: 'AI 요약 결과' });
    });

    it('환자가 다른 회원의 AI 요약을 요청하면 ForbiddenException을 던진다', async () => {
      memberRepo.findOne.mockResolvedValue(buildMember());

      await expect(
        service.getAiSummary('user_004', patient),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
