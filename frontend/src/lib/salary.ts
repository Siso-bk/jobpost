export const SALARY_PERIODS = ['hour', 'day', 'week', 'month', 'year'] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export type Salary = {
  min?: number;
  max?: number;
  currency?: string;
  period?: SalaryPeriod;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

export const formatSalary = (salary?: Salary) => {
  if (!salary) return '';
  const { min, max, currency, period } = salary;
  const hasMin = typeof min === 'number' && !Number.isNaN(min);
  const hasMax = typeof max === 'number' && !Number.isNaN(max);
  const range = hasMin && hasMax
    ? `${formatNumber(min)} - ${formatNumber(max)}`
    : hasMin
      ? `${formatNumber(min)}`
      : hasMax
        ? `${formatNumber(max)}`
        : '';
  const currencyLabel = currency ? currency.toUpperCase() : '';
  const base = [range, currencyLabel].filter(Boolean).join(' ');
  if (!base) return '';
  const resolvedPeriod = period || 'year';
  const per = resolvedPeriod ? `per ${resolvedPeriod}` : '';
  return [base, per].filter(Boolean).join(' ');
};
