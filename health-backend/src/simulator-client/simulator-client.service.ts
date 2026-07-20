import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { Member } from '../member/entities/member.entity';
import { HealthDataService } from '../health-data/health-data.service';
import { AlertService } from '../alert/alert.service';
import { HealthGateway } from '../realtime-gateway/health.gateway';
import { HEALTH_WS_EVENT } from '../shared';
import {
  SimulatorBloodPressureEvent,
  SimulatorGlucoseEvent,
  SimulatorHeartRateEvent,
  SimulatorStepCountEvent,
  SimulatorWeightEvent,
} from '../health-data/simulator-event.types';

interface SimulatorEnvelope<T> {
  event: string;
  data: T;
}

@Injectable()
export class SimulatorClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorClientService.name);
  private readonly connections = new Map<string, Socket>();

  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly configService: ConfigService,
    private readonly healthDataService: HealthDataService,
    private readonly alertService: AlertService,
    private readonly healthGateway: HealthGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    const patients = await this.memberRepo.find({ where: { memberType: 'P' } });
    this.logger.log(`시뮬레이터 연결 대상: 환자 ${patients.length}명`);
    for (const member of patients) {
      this.connect(member);
    }
  }

  onModuleDestroy(): void {
    for (const socket of this.connections.values()) {
      socket.disconnect();
    }
  }

  private connect(member: Member): void {
    const baseUrl = this.configService.get<string>('SIMULATOR_WS_URL');
    const socket: Socket = io(baseUrl as string, {
      transports: ['websocket'],
      query: { userId: member.memberId, apiKey: member.apiKey },
      reconnectionDelay: 3000,
      timeout: 5000,
    });

    socket.on('connect', () =>
      this.logger.log(`시뮬레이터 연결 성공: ${member.memberId}`),
    );
    socket.on('disconnect', (reason: string) =>
      this.logger.warn(`시뮬레이터 연결 종료: ${member.memberId} (${reason})`),
    );
    socket.on('connect_error', (err: Error) =>
      this.logger.error(
        `시뮬레이터 연결 실패: ${member.memberId} - ${err.message}`,
      ),
    );
    socket.on('error', (payload: unknown) =>
      this.logger.error(
        `시뮬레이터 인증 오류: ${member.memberId} - ${JSON.stringify(payload)}`,
      ),
    );

    socket.on('heartRate', (msg: SimulatorEnvelope<SimulatorHeartRateEvent>) =>
      this.onHeartRate(member, msg.data),
    );
    socket.on(
      'bloodPressure',
      (msg: SimulatorEnvelope<SimulatorBloodPressureEvent>) =>
        this.onBloodPressure(member, msg.data),
    );
    socket.on('weight', (msg: SimulatorEnvelope<SimulatorWeightEvent>) =>
      this.onWeight(member, msg.data),
    );
    socket.on('glucose', (msg: SimulatorEnvelope<SimulatorGlucoseEvent>) =>
      this.onGlucose(member, msg.data),
    );
    socket.on('stepCount', (msg: SimulatorEnvelope<SimulatorStepCountEvent>) =>
      this.onStepCount(member, msg.data),
    );

    this.connections.set(member.memberId, socket);
  }

  private async onHeartRate(
    member: Member,
    event: SimulatorHeartRateEvent,
  ): Promise<void> {
    const record = await this.healthDataService.saveHeartRate(event);
    this.healthGateway.emitToMember(
      member.memberId,
      HEALTH_WS_EVENT.HEART_RATE,
      record,
    );
    await this.alertService.checkHeartRate(
      member.memberId,
      member.memberName,
      record,
    );
  }

  private async onBloodPressure(
    member: Member,
    event: SimulatorBloodPressureEvent,
  ): Promise<void> {
    const record = await this.healthDataService.saveBloodPressure(event);
    this.healthGateway.emitToMember(
      member.memberId,
      HEALTH_WS_EVENT.BLOOD_PRESSURE,
      record,
    );
    await this.alertService.checkBloodPressure(
      member.memberId,
      member.memberName,
      record,
    );
  }

  private async onWeight(
    member: Member,
    event: SimulatorWeightEvent,
  ): Promise<void> {
    const record = await this.healthDataService.saveBodyWeight(event);
    this.healthGateway.emitToMember(
      member.memberId,
      HEALTH_WS_EVENT.BODY_WEIGHT,
      record,
    );
  }

  private async onGlucose(
    member: Member,
    event: SimulatorGlucoseEvent,
  ): Promise<void> {
    const record = await this.healthDataService.saveGlucose(event);
    this.healthGateway.emitToMember(
      member.memberId,
      HEALTH_WS_EVENT.GLUCOSE,
      record,
    );
    await this.alertService.checkGlucose(
      member.memberId,
      member.memberName,
      record,
    );
  }

  private async onStepCount(
    member: Member,
    event: SimulatorStepCountEvent,
  ): Promise<void> {
    const record = await this.healthDataService.saveStepCount(event);
    this.healthGateway.emitToMember(
      member.memberId,
      HEALTH_WS_EVENT.STEP_COUNT,
      record,
    );
  }
}
