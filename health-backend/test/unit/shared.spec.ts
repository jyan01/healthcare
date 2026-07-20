import {
  isAlertTarget,
  judgeBloodPressureStatus,
  judgeBodyWeightStatus,
  judgeHeartRateStatus,
} from '../../../shared/types';

describe('judgeBloodPressureStatus', () => {
  it('수축기 140 이상이면 이상으로 판정한다', () => {
    expect(judgeBloodPressureStatus(140, 80)).toBe('이상');
  });

  it('이완기 90 이상이면 이상으로 판정한다', () => {
    expect(judgeBloodPressureStatus(120, 90)).toBe('이상');
  });

  it('수축기 130~139 구간이면 주의로 판정한다', () => {
    expect(judgeBloodPressureStatus(132, 80)).toBe('주의');
  });

  it('정상 범위면 정상으로 판정한다', () => {
    expect(judgeBloodPressureStatus(118, 76)).toBe('정상');
  });
});

describe('judgeBodyWeightStatus', () => {
  it.each([
    [17.9, '저체중'],
    [22.9, '정상'],
    [24.9, '과체중'],
    [25.1, '비만'],
  ])('BMI %s -> %s', (bmi, expected) => {
    expect(judgeBodyWeightStatus(bmi)).toBe(expected);
  });
});

describe('judgeHeartRateStatus', () => {
  it('source가 abnormal_event면 이상으로 판정한다', () => {
    expect(judgeHeartRateStatus('abnormal_event')).toBe('이상');
  });

  it('source가 simulation이면 정상으로 판정한다', () => {
    expect(judgeHeartRateStatus('simulation')).toBe('정상');
  });
});

describe('isAlertTarget', () => {
  it('혈당은 high일 때만 알림 대상이다', () => {
    expect(isAlertTarget('glucose', 'high')).toBe(true);
    expect(isAlertTarget('glucose', 'elevated')).toBe(false);
    expect(isAlertTarget('glucose', 'normal')).toBe(false);
  });

  it('심박/혈압은 이상 상태일 때만 알림 대상이다', () => {
    expect(isAlertTarget('heartRate', '이상')).toBe(true);
    expect(isAlertTarget('heartRate', '주의')).toBe(false);
    expect(isAlertTarget('bloodPressure', '이상')).toBe(true);
    expect(isAlertTarget('bloodPressure', '정상')).toBe(false);
  });
});
