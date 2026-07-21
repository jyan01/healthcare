import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MemberService } from './member.service';
import type { JwtPayload } from '../shared';

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @ApiOperation({
    summary: '회원 목록 조회',
    description:
      '의사는 전체 환자 목록(이름/성별 검색 가능), 환자는 본인 정보만 조회한다.',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: '이름 검색(부분일치, 의사만 적용)',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    description: '성별 검색(M/F, 의사만 적용)',
  })
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('name') name?: string,
    @Query('gender') gender?: string,
  ) {
    const members = await this.memberService.findAll(user, { name, gender });
    return { members };
  }

  @ApiOperation({
    summary: '회원 상세 조회',
    description:
      '회원 기본정보 + 최근 7일간 건강데이터(DB 조회). 이후 실시간 갱신은 WebSocket(/health)으로 이어받는다.',
  })
  @Get(':memberId')
  findDetail(
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.memberService.findDetail(memberId, user);
  }

  @ApiOperation({
    summary: '회원 건강데이터 기간 조회',
    description:
      '지정 기간(startAt~endAt)의 심박/혈압/체중/혈당/걸음수 이력을 전체 조회한다.',
  })
  @ApiQuery({
    name: 'startAt',
    required: true,
    description: '조회 시작일시 (ISO 8601)',
  })
  @ApiQuery({
    name: 'endAt',
    required: true,
    description: '조회 종료일시 (ISO 8601)',
  })
  @Get(':memberId/health-data')
  getHealthData(
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
    @Query('startAt') startAt: string,
    @Query('endAt') endAt: string,
  ) {
    return this.memberService.getHealthDataByPeriod(
      memberId,
      user,
      new Date(startAt),
      new Date(endAt),
    );
  }

  @ApiOperation({
    summary: '회원 AI 소견 요약',
    description:
      '최근 건강데이터와 보유질환을 AI Agent API(health-ai)에 전달해 의료진용 소견 요약을 받는다.',
  })
  @Get(':memberId/ai-summary')
  getAiSummary(
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.memberService.getAiSummary(memberId, user);
  }
}
