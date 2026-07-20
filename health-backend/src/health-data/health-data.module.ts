import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeartRate } from './entities/heart-rate.entity';
import { BloodPressure } from './entities/blood-pressure.entity';
import { BodyWeight } from './entities/body-weight.entity';
import { Glucose } from './entities/glucose.entity';
import { StepCount } from './entities/step-count.entity';
import { HealthDataService } from './health-data.service';
import { HealthDataCleanupService } from './health-data-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HeartRate,
      BloodPressure,
      BodyWeight,
      Glucose,
      StepCount,
    ]),
  ],
  providers: [HealthDataService, HealthDataCleanupService],
  exports: [HealthDataService],
})
export class HealthDataModule {}
