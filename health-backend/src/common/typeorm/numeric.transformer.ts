import { ValueTransformer } from 'typeorm';

/** pg 드라이버가 numeric/decimal 컬럼을 문자열로 반환하는 것을 숫자로 변환 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
