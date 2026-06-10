/**
 * @typedef {Object} TrackingResult
 * @property {string} trackingCode - The queried tracking code
 * @property {string} status - Current shipment status (e.g. "en_camino", "entregado")
 * @property {string} description - Human-readable status description
 * @property {string | null} estimatedDelivery - ISO date string or null
 * @property {string | null} lastLocation - Last known location or null
 */

/**
 * Port: Package tracking abstraction.
 * Implementations: MockTrackingRepository, RealTrackingApiAdapter (future)
 *
 * @typedef {Object} ITrackingRepository
 * @property {(trackingCode: string) => Promise<TrackingResult | null>} findByCode
 *   Look up a shipment by tracking code. Returns null if not found.
 */
