import { validateEnvironment } from '../env.schema.js';

const validEnvironment = {
  API_PREFIX: 'api',
  APP_PORT: '3101',
  APP_VERSION: '0.0.0',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_NAME: 'frontend_study',
  DATABASE_PASSWORD: 'secret',
  DATABASE_PORT: '3306',
  DATABASE_URL: 'mysql://user:secret@127.0.0.1:3306/frontend_study',
  DATABASE_USER: 'user',
  NODE_ENV: 'test',
  REDIS_DB: '1',
  REDIS_HOST: '127.0.0.1',
  REDIS_KEY_PREFIX: 'frontend-study:',
  REDIS_PASSWORD: 'secret',
  REDIS_PORT: '6379',
  WEB_ORIGIN: 'http://localhost:3100',
};

describe('validateEnvironment', () => {
  it('parses and coerces a valid configuration', () => {
    const environment = validateEnvironment(validEnvironment);

    expect(environment.APP_PORT).toBe(3101);
    expect(environment.DATABASE_NAME).toBe('frontend_study');
    expect(environment.REDIS_DB).toBe(1);
  });

  it('normalizes an empty Redis username for password-only authentication', () => {
    const environment = validateEnvironment({
      ...validEnvironment,
      REDIS_USERNAME: '',
    });

    expect(environment.REDIS_USERNAME).toBeUndefined();
  });

  it('rejects a Redis database other than DB 1', () => {
    expect(() => {
      validateEnvironment({
        ...validEnvironment,
        REDIS_DB: '0',
      });
    }).toThrow('REDIS_DB');
  });

  it('rejects a database outside the project namespace', () => {
    expect(() => {
      validateEnvironment({
        ...validEnvironment,
        DATABASE_NAME: 'other_database',
      });
    }).toThrow('DATABASE_NAME');
  });
});
