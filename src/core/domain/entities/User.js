export class User {
  constructor({
    id,
    email,
    role,
    name,
    isActive = true,
    createdAt = new Date(),
  }) {
    this.id = id
    this.email = email
    this.role = role // 'admin' | 'supervisor' | 'asesor'
    this.name = name
    this.isActive = isActive
    this.createdAt = createdAt
  }
}
