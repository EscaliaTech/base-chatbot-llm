// Task 2.8 — MessageQueue: implements IJobQueue using BullMQ
import { Queue } from 'bullmq'
import { bullmqConnection } from '../redis/client.js'

const messageQueue = new Queue('whatsapp-messages', { connection: bullmqConnection })

/**
 * @type {import('../../core/ports/IJobQueue.js').IJobQueue}
 */
export const MessageQueue = {
  /**
   * Enqueue a job for async processing.
   * Configures 3 retry attempts with exponential backoff starting at 2s.
   *
   * @param {string} jobName - Logical job name (e.g. 'process-message')
   * @param {Record<string, unknown>} data - Job payload
   */
  async enqueue(jobName, data) {
    await messageQueue.add(jobName, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    })
  },
}

export { messageQueue }
