import { Module } from '@nestjs/common';
import { HealthGateway } from './health.gateway';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [AuthModule, MemberModule],
  providers: [HealthGateway],
  exports: [HealthGateway],
})
export class RealtimeGatewayModule {}
