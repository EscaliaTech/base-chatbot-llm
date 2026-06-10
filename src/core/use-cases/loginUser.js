// Task 3.5 — loginUser: use case for authenticating a user and issuing tokens
import bcrypt from 'bcryptjs'

export function makeLoginUser({ userRepo, jwtService, refreshTokenRepo }) {
  return async function loginUser({ email, password }) {
    const user = await userRepo.findByEmail(email)
    if (!user) throw new Error('INVALID_CREDENTIALS')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new Error('INVALID_CREDENTIALS')

    if (!user.isActive) throw new Error('ACCOUNT_DISABLED')

    const payload = { userId: user.id, role: user.role, name: user.name }
    const accessToken = jwtService.generateAccessToken(payload)
    const refreshToken = jwtService.generateRefreshToken(payload)

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role, name: user.name } }
  }
}
