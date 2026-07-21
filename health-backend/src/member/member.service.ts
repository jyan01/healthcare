import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Member } from './entities/member.entity';
import { MemberDisease } from './entities/member-disease.entity';
import { DiseaseCode } from './entities/disease-code.entity';
import { HealthDataService } from '../health-data/health-data.service';
import { AiAgentService } from '../ai-agent/ai-agent.service';
import { DiseaseSummary, JwtPayload, MemberSummary } from '../shared';

type RecentHealthData = Awaited<ReturnType<HealthDataService['getRecent']>>;

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(MemberDisease)
    private readonly memberDiseaseRepo: Repository<MemberDisease>,
    @InjectRepository(DiseaseCode)
    private readonly diseaseCodeRepo: Repository<DiseaseCode>,
    private readonly healthDataService: HealthDataService,
    private readonly aiAgentService: AiAgentService,
  ) {}

  findById(memberId: string): Promise<Member | null> {
    return this.memberRepo.findOne({ where: { memberId } });
  }

  toSummary(member: Member): MemberSummary {
    return {
      memberId: member.memberId,
      name: member.memberName,
      gender: member.gender as 'M' | 'F',
      birthDate: member.birthDate,
    };
  }

  async findDiseases(memberId: string): Promise<DiseaseSummary[]> {
    const rows = await this.memberDiseaseRepo.find({ where: { memberId } });
    if (rows.length === 0) return [];

    const diseaseIds = [...new Set(rows.map((r) => r.diseaseId))];
    const diseases = await this.diseaseCodeRepo.find({
      where: { diseaseId: In(diseaseIds) },
    });
    const nameMap = new Map(
      diseases.map((d) => [d.diseaseId, d.diseaseNameKr]),
    );
    return diseaseIds.map((id) => ({
      diseaseId: id,
      nameKr: nameMap.get(id) ?? id,
    }));
  }

  /** 환자는 본인 데이터만, 의사는 전체 회원 데이터에 접근 가능 (요청자의 member_type 기준) */
  private async assertAccess(
    requester: JwtPayload,
    targetMemberId: string,
  ): Promise<Member> {
    const requesterMember = await this.findById(requester.userId);
    if (!requesterMember)
      throw new ForbiddenException('알 수 없는 요청자입니다.');
    if (
      requesterMember.memberType === 'P' &&
      requesterMember.memberId !== targetMemberId
    ) {
      throw new ForbiddenException('환자는 본인 데이터만 조회할 수 있습니다.');
    }
    return requesterMember;
  }

  async findAll(
    requester: JwtPayload,
    filters: { name?: string; gender?: string },
  ): Promise<MemberSummary[]> {
    const requesterMember = await this.findById(requester.userId);
    if (!requesterMember)
      throw new ForbiddenException('알 수 없는 요청자입니다.');

    if (requesterMember.memberType === 'P') {
      return [this.toSummary(requesterMember)];
    }

    const qb = this.memberRepo
      .createQueryBuilder('m')
      .where('m.member_type = :type', { type: 'P' });
    if (filters.name)
      qb.andWhere('m.member_name LIKE :name', { name: `%${filters.name}%` });
    if (filters.gender)
      qb.andWhere('m.gender = :gender', { gender: filters.gender });
    const members = await qb.orderBy('m.member_id', 'ASC').getMany();
    return members.map((m) => this.toSummary(m));
  }

  async findDetail(memberId: string, requester: JwtPayload) {
    await this.assertAccess(requester, memberId);
    const member = await this.findById(memberId);
    if (!member) throw new NotFoundException('회원을 찾을 수 없습니다.');

    const [diseases, recentHealthData] = await Promise.all([
      this.findDiseases(memberId),
      this.healthDataService.getRecent(memberId),
    ]);

    return {
      member: { ...this.toSummary(member), diseases },
      recentHealthData,
    };
  }

  async getHealthDataByPeriod(
    memberId: string,
    requester: JwtPayload,
    startAt: Date,
    endAt: Date,
  ) {
    await this.assertAccess(requester, memberId);
    return this.healthDataService.getByPeriod(memberId, startAt, endAt);
  }

  /** 최근 건강데이터 + 보유질환을 컨텍스트로 AI Agent API에 전달해 의료진용 소견 요약을 받는다 */
  async getAiSummary(
    memberId: string,
    requester: JwtPayload,
  ): Promise<{ summary: string }> {
    await this.assertAccess(requester, memberId);
    const member = await this.findById(memberId);
    if (!member) throw new NotFoundException('회원을 찾을 수 없습니다.');

    const [diseases, recentHealthData] = await Promise.all([
      this.findDiseases(memberId),
      this.healthDataService.getRecent(memberId),
    ]);

    const prompt = this.buildAiSummaryPrompt(member, diseases, recentHealthData);
    const summary = await this.aiAgentService.ask(prompt);
    return { summary };
  }

  private buildAiSummaryPrompt(
    member: Member,
    diseases: DiseaseSummary[],
    recentHealthData: RecentHealthData,
  ): string {
    const diseaseText = diseases.length
      ? diseases.map((d) => d.nameKr).join(', ')
      : '없음';
    const lastHeartRate = recentHealthData.heartRate.at(-1);
    const lastBloodPressure = recentHealthData.bloodPressure.at(-1);
    const lastGlucose = recentHealthData.glucose.at(-1);
    const lastWeight = recentHealthData.bodyWeight.at(-1);

    const lines = [
      `환자 ${member.memberName}(${member.gender === 'M' ? '남' : '여'}, 보유질환: ${diseaseText})의 최근 건강 데이터입니다.`,
    ];
    if (lastHeartRate)
      lines.push(
        `- 심박수: ${lastHeartRate.heartRate}bpm (${lastHeartRate.status})`,
      );
    if (lastBloodPressure)
      lines.push(
        `- 혈압: ${lastBloodPressure.systolic}/${lastBloodPressure.diastolic}mmHg (${lastBloodPressure.status})`,
      );
    if (lastGlucose)
      lines.push(
        `- 혈당: ${lastGlucose.glucoseValue}mg/dL (${lastGlucose.status})`,
      );
    if (lastWeight)
      lines.push(`- 체중: ${lastWeight.weightKg}kg, BMI ${lastWeight.bmi}`);
    lines.push(
      '위 수치만으로 답변 가능하니 별도 문서 검색 없이, 이 수치를 바탕으로 의료진이 참고할 한국어 소견을 3문장 이내로 간결하게 요약해줘.',
    );
    return lines.join('\n');
  }
}
