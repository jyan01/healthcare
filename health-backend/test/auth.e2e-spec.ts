import { Module, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';

/**
 * e2e 테스트 범위는 로그인(및 재발급)만 다룬다.
 * AppModule 전체를 부트스트랩하면 SimulatorClientModule이 실제 시뮬레이터 서버(healthsim)에
 * 라이브로 접속해버리므로, 로그인에 필요한 모듈(Config/TypeOrm/Auth)만 담은 최소 모듈로 구성한다.
 * .env의 실제 DB(211.253.27.76/db18)에 접속하며, 시드 데이터(admin 등)로 로그인을 검증한다.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
  ],
})
class AuthOnlyTestModule {}

interface LoginResponseBody {
  accessToken: string;
  refreshToken: string;
  member: { memberId: string; memberType: string };
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthOnlyTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login - 올바른 ID/비밀번호면 AccessToken/RefreshToken/회원정보를 반환한다', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ id: 'admin', passwd: 'admin001123!' })
      .expect(201);

    const body = response.body as LoginResponseBody;
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.member.memberId).toBe('admin');
    expect(body.member.memberType).toBe('D');
  });

  it('POST /auth/login - 비밀번호가 틀리면 401을 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ id: 'admin', passwd: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/login - 존재하지 않는 ID면 401을 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ id: 'no-such-user', passwd: 'whatever' })
      .expect(401);
  });

  it('POST /auth/refresh - 로그인으로 받은 RefreshToken으로 새 AccessToken을 재발급한다', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ id: 'admin', passwd: 'admin001123!' })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponseBody;
    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginBody.refreshToken })
      .expect(201);

    expect(refreshResponse.body).toHaveProperty('accessToken');
  });

  it('POST /auth/refresh - 유효하지 않은 RefreshToken이면 401을 반환한다', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' })
      .expect(401);
  });
});
