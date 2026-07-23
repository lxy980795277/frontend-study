import { z } from 'zod';

const REDIS_DATABASE = 1;
const REDIS_KEY_PREFIX = 'frontend-study:';
const optionalNonEmptyString = z.preprocess((value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}, z.string().trim().min(1).optional());

export const environmentSchema = z.object({
  API_PREFIX: z.string().trim().min(1).default('api'),
  APP_PORT: z.coerce.number().int().positive().max(65_535).default(3101),
  APP_VERSION: z.string().trim().min(1).default('0.0.0'),
  DATABASE_HOST: z.string().trim().min(1),
  DATABASE_NAME: z.literal('frontend_study'),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive().max(65_535).default(3306),
  DATABASE_URL: z.url().startsWith('mysql://'),
  DATABASE_USER: z.string().trim().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REDIS_DB: z.coerce
    .number()
    .int()
    .refine((value) => {
      return value === REDIS_DATABASE;
    }, 'REDIS_DB 必须为 1'),
  REDIS_HOST: z.string().trim().min(1),
  REDIS_KEY_PREFIX: z.literal(REDIS_KEY_PREFIX),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_PORT: z.coerce.number().int().positive().max(65_535),
  REDIS_USERNAME: optionalNonEmptyString,
  WEB_ORIGIN: z.url().default('http://localhost:3100'),
});

export type Environment = z.infer<typeof environmentSchema>;

export const validateEnvironment = (configuration: Record<string, unknown>): Environment => {
  const result = environmentSchema.safeParse(configuration);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => {
      return issue.path.join('.');
    });
    throw new Error(`环境变量校验失败：${fields.join(', ')}`);
  }

  return result.data;
};
