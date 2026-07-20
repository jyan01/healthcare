import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../member/entities/member.entity';
import { SimulatorClientService } from './simulator-client.service';
import { HealthDataModule } from '../health-data/health-data.module';
import { AlertModule } from '../alert/alert.module';
import { RealtimeGatewayModule } from '../realtime-gateway/realtime-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member]),
    HealthDataModule,
    AlertModule,
    RealtimeGatewayModule,
  ],
  providers: [SimulatorClientService],
})
export class SimulatorClientModule {}
