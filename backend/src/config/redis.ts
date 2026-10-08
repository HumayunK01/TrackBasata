import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { env } from "./env.js";

let redisClient: Redis | null = null;
let standardLimiter: Ratelimit | null = null;
let mutationLimiter: Ratelimit | null = null;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  redisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Standard API rate limit: 120 requests per minute
  standardLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(120, "60 s"),
    analytics: true,
    prefix: "trackbasata:rl:standard",
  });

  // Mutation / counter tap limit: 60 requests per minute per user/ip
  mutationLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(60, "60 s"),
    analytics: true,
    prefix: "trackbasata:rl:mutation",
  });
}

export { redisClient, standardLimiter, mutationLimiter };
