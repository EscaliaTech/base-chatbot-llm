/**
 * Port: Job queue abstraction.
 * Implementations: BullMQAdapter
 *
 * @typedef {Object} IJobQueue
 * @property {(jobName: string, data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<void>} enqueue
 *   Add a job to the queue. Resolves when the job is successfully enqueued.
 */
