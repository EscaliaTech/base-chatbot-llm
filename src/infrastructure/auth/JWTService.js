// Task 2.10 — JWTService: JWT access + refresh token service
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'

const ACCESS_TOKEN_EXPIRES = '15m'
const REFRESH_TOKEN_EXPIRES = '7d'

/**
 * JWT service for issuing and verifying access and refresh tokens.
 * Access tokens are short-lived (15 min) and carry userId + role.
 * Refresh tokens are long-lived (7d) and must be stored hashed in DB.
 */
export const JWTService = {
  /**
   * Generate a signed JWT access token.
   * @param {{userId: string, role: string}} payload
   * @returns {string}
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES })
  },

  /**
   * Generate a signed JWT refresh token.
   * @param {{userId: string}} payload
   * @returns {string}
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES })
  },

  /**
   * Verify and decode a JWT access token.
   * Throws JsonWebTokenError or TokenExpiredError if invalid.
   * @param {string} token
   * @returns {{userId: string, role: string, iat: number, exp: number}}
   */
  verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_SECRET)
  },

  /**
   * Verify and decode a JWT refresh token.
   * Throws JsonWebTokenError or TokenExpiredError if invalid.
   * @param {string} token
   * @returns {{userId: string, iat: number, exp: number}}
   */
  verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET)
  },
}
