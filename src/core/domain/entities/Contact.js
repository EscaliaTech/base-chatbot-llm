export class Contact {
  constructor({ id, phone, name = null, createdAt = new Date() }) {
    this.id = id
    this.phone = phone
    this.name = name
    this.createdAt = createdAt
  }
}
