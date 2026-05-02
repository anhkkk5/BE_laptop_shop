import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const createService = () => {
    const notificationRepo = {
      count: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((value: unknown) => value),
      createQueryBuilder: jest.fn(),
    };

    const redis = {
      llen: jest.fn(),
      zcard: jest.fn(),
      lrange: jest.fn(),
      lpop: jest.fn(),
      rpush: jest.fn(),
      zrangebyscore: jest.fn(),
      zrem: jest.fn(),
      zadd: jest.fn(),
    };

    const streamService = {
      publishToUser: jest.fn(),
    };

    const service = new NotificationService(
      notificationRepo as never,
      redis as never,
      streamService as never,
    );

    return { service, redis };
  };

  it('should return queue stats', async () => {
    const { service, redis } = createService();
    redis.llen.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    redis.zcard.mockResolvedValue(2);

    const result = await service.getQueueStats();

    expect(result).toEqual({ pending: 3, retrying: 2, deadLetter: 1 });
  });

  it('should parse dead letter jobs safely', async () => {
    const { service, redis } = createService();
    redis.lrange.mockResolvedValue(['{"attempts":3}', 'invalid-json']);

    const result = await service.getDeadLetterJobs(2);

    expect(result).toEqual([
      { index: 0, payload: { attempts: 3 }, raw: '{"attempts":3}' },
      { index: 1, payload: null, raw: 'invalid-json' },
    ]);
  });

  it('should retry dead letter jobs into main queue', async () => {
    const { service, redis } = createService();
    redis.lpop
      .mockResolvedValueOnce('{"job":1}')
      .mockResolvedValueOnce('{"job":2}')
      .mockResolvedValueOnce(null);

    const result = await service.retryDeadLetterJobs(5);

    expect(result).toEqual({ retried: 2 });
    expect(redis.rpush).toHaveBeenCalledTimes(2);
    expect(redis.rpush).toHaveBeenNthCalledWith(
      1,
      'notifications:queue',
      '{"job":1}',
    );
    expect(redis.rpush).toHaveBeenNthCalledWith(
      2,
      'notifications:queue',
      '{"job":2}',
    );
  });
});
