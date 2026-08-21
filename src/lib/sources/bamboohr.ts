/**
 * BambooHR, split by responsibility rather than by line count:
 *
 *   client.ts        every request, the endpoint guard, the egress log, photos
 *   cache.ts         what is kept on disk and how fresh each dataset is
 *   roster.ts        who reports to you, merged into the vault
 *   inbox.ts         approvals and absences, on the short clock
 *   compensation.ts  pay history, on its own clock
 *
 * This file re-exports them, so nothing that imports from '@/lib/sources/bamboohr'
 * had to change.
 */
export * from './bamboohr/cache';
export * from './bamboohr/client';
export * from './bamboohr/compensation';
export * from './bamboohr/inbox';
export * from './bamboohr/roster';
