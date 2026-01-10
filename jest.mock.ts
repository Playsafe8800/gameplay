/**
 *  common mocks across the project can be added here,
 *  It is configured in jest.config for env setup
 */
import 'jest';

jest.mock('./src/utils/lock/redlock', () => {
  return {
    redlock: {
      Lock: {
        acquire: jest.fn(),
        release: jest.fn(),
      },
    },
  };
});


jest.mock('redis', () => jest.requireActual('redis-mock'));
