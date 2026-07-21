import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from './entities/member.entity';
import { DiseaseCode } from './entities/disease-code.entity';
import { MemberDisease } from './entities/member-disease.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { HealthDataModule } from '../health-data/health-data.module';
import { AiAgentModule } from '../ai-agent/ai-agent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, DiseaseCode, MemberDisease]),
    HealthDataModule,
    AiAgentModule,
  ],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
