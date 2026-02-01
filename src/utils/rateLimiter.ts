import { TIME_BETWEEN_REQUESTS } from '../constants';

export interface RateLimiter {
  waitIfNeeded: () => Promise<void>;
}

export function createRateLimiter(
  timeBetweenRequests: number = TIME_BETWEEN_REQUESTS,
): RateLimiter {
  let lastRequestTimestamp = 0;

  const waitIfNeeded = async (): Promise<void> => {
    const timestamp = Date.now();
    const difference = timestamp - lastRequestTimestamp;
    lastRequestTimestamp = timestamp;

    if (difference < timeBetweenRequests) {
      await new Promise((resolve) =>
        setTimeout(resolve, timeBetweenRequests - difference),
      );
    }
  };

  return { waitIfNeeded };
}
