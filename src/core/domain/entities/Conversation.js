export class Conversation {
  constructor({
    id,
    contactId,
    status = 'open',
    assignedTo = null,
    transferredAt = null,
    closedAt = null,
    createdAt = new Date(),
  }) {
    this.id = id
    this.contactId = contactId
    this.status = status
    this.assignedTo = assignedTo
    this.transferredAt = transferredAt
    this.closedAt = closedAt
    this.createdAt = createdAt
  }

  transfer(agentId) {
    this.status = 'in_progress'
    this.assignedTo = agentId
    this.transferredAt = new Date()
  }

  resolve() {
    this.status = 'resolved'
  }

  close() {
    this.status = 'closed'
    this.closedAt = new Date()
  }

  isTransferred() {
    return this.status !== 'open'
  }
}
