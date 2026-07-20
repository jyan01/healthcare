import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { HeartRate } from './entities/heart-rate.entity';
import { BloodPressure } from './entities/blood-pressure.entity';
import { BodyWeight } from './entities/body-weight.entity';
import { Glucose } from './entities/glucose.entity';
import { StepCount } from './entities/step-count.entity';
import {
  SimulatorBloodPressureEvent,
  SimulatorGlucoseEvent,
  SimulatorHeartRateEvent,
  SimulatorStepCountEvent,
  SimulatorWeightEvent,
} from './simulator-event.types';
import {
  BloodPressureRecord,
  BodyWeightRecord,
  GlucoseRecord,
  HeartRateRecord,
  StepCountRecord,
  judgeBloodPressureStatus,
  judgeBodyWeightStatus,
  judgeHeartRateStatus,
} from '../shared';

const RECENT_DAYS_DEFAULT = 7;

@Injectable()
export class HealthDataService {
  private readonly logger = new Logger(HealthDataService.name);

  constructor(
    @InjectRepository(HeartRate)
    private readonly heartRateRepo: Repository<HeartRate>,
    @InjectRepository(BloodPressure)
    private readonly bloodPressureRepo: Repository<BloodPressure>,
    @InjectRepository(BodyWeight)
    private readonly bodyWeightRepo: Repository<BodyWeight>,
    @InjectRepository(Glucose)
    private readonly glucoseRepo: Repository<Glucose>,
    @InjectRepository(StepCount)
    private readonly stepCountRepo: Repository<StepCount>,
  ) {}

  async saveHeartRate(
    event: SimulatorHeartRateEvent,
  ): Promise<HeartRateRecord> {
    const status = judgeHeartRateStatus(event.source);
    const saved = await this.heartRateRepo.save(
      this.heartRateRepo.create({
        memberId: event.userId,
        heartRate: event.heartRate,
        status,
        remark: event.note ?? null,
        measuredAt: new Date(event.timestamp),
      }),
    );
    return {
      memberId: saved.memberId,
      heartRate: saved.heartRate,
      status,
      remark: saved.remark,
      measuredAt: saved.measuredAt.toISOString(),
    };
  }

  async saveBloodPressure(
    event: SimulatorBloodPressureEvent,
  ): Promise<BloodPressureRecord> {
    const status = judgeBloodPressureStatus(event.systolic, event.diastolic);
    const saved = await this.bloodPressureRepo.save(
      this.bloodPressureRepo.create({
        memberId: event.userId,
        systolic: event.systolic,
        diastolic: event.diastolic,
        status,
        measuredAt: new Date(event.timestamp),
      }),
    );
    return {
      memberId: saved.memberId,
      systolic: saved.systolic,
      diastolic: saved.diastolic,
      status,
      measuredAt: saved.measuredAt.toISOString(),
    };
  }

  async saveBodyWeight(event: SimulatorWeightEvent): Promise<BodyWeightRecord> {
    const status = judgeBodyWeightStatus(event.bmi);
    const saved = await this.bodyWeightRepo.save(
      this.bodyWeightRepo.create({
        memberId: event.userId,
        weightKg: event.weightKg,
        bmi: event.bmi,
        skeletalMuscleMassKg: event.skeletalMuscleMassKg,
        bodyFatPercentage: event.bodyFatPercentage,
        status,
        measuredAt: new Date(event.timestamp),
      }),
    );
    return {
      memberId: saved.memberId,
      weightKg: saved.weightKg,
      bmi: saved.bmi,
      skeletalMuscleMassKg: saved.skeletalMuscleMassKg,
      bodyFatPercentage: saved.bodyFatPercentage,
      status,
      measuredAt: saved.measuredAt.toISOString(),
    };
  }

  async saveGlucose(event: SimulatorGlucoseEvent): Promise<GlucoseRecord> {
    const saved = await this.glucoseRepo.save(
      this.glucoseRepo.create({
        memberId: event.userId,
        glucoseValue: event.glucoseMgDl,
        status: event.status,
        measuredAt: new Date(event.timestamp),
      }),
    );
    return {
      memberId: saved.memberId,
      glucoseValue: saved.glucoseValue,
      status: event.status,
      measuredAt: saved.measuredAt.toISOString(),
    };
  }

  async saveStepCount(
    event: SimulatorStepCountEvent,
  ): Promise<StepCountRecord> {
    const saved = await this.stepCountRepo.save(
      this.stepCountRepo.create({
        memberId: event.userId,
        totalSteps: event.stepCount,
        measuredAt: new Date(event.timestamp),
      }),
    );
    return {
      memberId: saved.memberId,
      totalSteps: saved.totalSteps,
      measuredAt: saved.measuredAt.toISOString(),
    };
  }

  getRecent(memberId: string, days = RECENT_DAYS_DEFAULT) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.getByRange(memberId, since, new Date());
  }

  getByPeriod(memberId: string, startAt: Date, endAt: Date) {
    return this.getByRange(memberId, startAt, endAt);
  }

  private async getByRange(memberId: string, startAt: Date, endAt: Date) {
    const [heartRate, bloodPressure, bodyWeight, glucose, stepCount] =
      await Promise.all([
        this.heartRateRepo.find({
          where: { memberId, measuredAt: Between(startAt, endAt) },
          order: { measuredAt: 'ASC' },
        }),
        this.bloodPressureRepo.find({
          where: { memberId, measuredAt: Between(startAt, endAt) },
          order: { measuredAt: 'ASC' },
        }),
        this.bodyWeightRepo.find({
          where: { memberId, measuredAt: Between(startAt, endAt) },
          order: { measuredAt: 'ASC' },
        }),
        this.glucoseRepo.find({
          where: { memberId, measuredAt: Between(startAt, endAt) },
          order: { measuredAt: 'ASC' },
        }),
        this.stepCountRepo.find({
          where: { memberId, measuredAt: Between(startAt, endAt) },
          order: { measuredAt: 'ASC' },
        }),
      ]);

    return {
      heartRate: heartRate.map((r) => ({
        heartRate: r.heartRate,
        status: r.status,
        remark: r.remark,
        measuredAt: r.measuredAt.toISOString(),
      })),
      bloodPressure: bloodPressure.map((r) => ({
        systolic: r.systolic,
        diastolic: r.diastolic,
        status: r.status,
        measuredAt: r.measuredAt.toISOString(),
      })),
      bodyWeight: bodyWeight.map((r) => ({
        weightKg: r.weightKg,
        bmi: r.bmi,
        skeletalMuscleMassKg: r.skeletalMuscleMassKg,
        bodyFatPercentage: r.bodyFatPercentage,
        status: r.status,
        measuredAt: r.measuredAt.toISOString(),
      })),
      glucose: glucose.map((r) => ({
        glucoseValue: r.glucoseValue,
        status: r.status,
        measuredAt: r.measuredAt.toISOString(),
      })),
      stepCount: stepCount.map((r) => ({
        totalSteps: r.totalSteps,
        measuredAt: r.measuredAt.toISOString(),
      })),
    };
  }

  async cleanupOldData(retentionDays: number): Promise<void> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const results = await Promise.all([
      this.heartRateRepo.delete({ measuredAt: LessThan(cutoff) }),
      this.bloodPressureRepo.delete({ measuredAt: LessThan(cutoff) }),
      this.bodyWeightRepo.delete({ measuredAt: LessThan(cutoff) }),
      this.glucoseRepo.delete({ measuredAt: LessThan(cutoff) }),
      this.stepCountRepo.delete({ measuredAt: LessThan(cutoff) }),
    ]);
    const totalDeleted = results.reduce((sum, r) => sum + (r.affected ?? 0), 0);
    this.logger.log(
      `오래된 건강데이터 정리 완료: ${totalDeleted}건 삭제 (cutoff=${cutoff.toISOString()})`,
    );
  }
}
