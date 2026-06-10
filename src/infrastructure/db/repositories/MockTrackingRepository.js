// Task 2.7 — MockTrackingRepository: implements ITrackingRepository with deterministic mock data
// Migrated from src/handler.js — will be replaced by a real tracking API adapter in a future phase.

/**
 * @type {Record<string, {status: string, location: string, estimatedDelivery: string|null}>}
 */
const MOCK_PACKAGES = {
  'ESC-12345': {
    status: 'En tránsito',
    location: 'Centro de distribución CABA',
    estimatedDelivery: 'mañana entre 9:00 y 14:00 hs',
  },
  'ESC-99999': {
    status: 'Entregado',
    location: 'Domicilio del cliente',
    estimatedDelivery: null,
  },
  'ESC-11111': {
    status: 'En depósito',
    location: 'Depósito Zona Norte — Vicente López',
    estimatedDelivery: 'hoy entre 14:00 y 18:00 hs',
  },
  'ESC-22222': {
    status: 'Pendiente de retiro',
    location: 'Sucursal Palermo — Honduras 4500, CABA',
    estimatedDelivery: null,
  },
  'ESC-33333': {
    status: 'Demorado',
    location: 'Centro de distribución Zona Sur',
    estimatedDelivery: 'en los próximos 2 días hábiles',
  },
}

/**
 * @type {import('../../../core/ports/ITrackingRepository.js').ITrackingRepository}
 */
export const MockTrackingRepository = {
  /**
   * Look up a shipment by tracking code.
   * Returns null if the tracking code is not found in the mock dataset.
   *
   * @param {string} trackingCode
   * @returns {Promise<import('../../../core/ports/ITrackingRepository.js').TrackingResult|null>}
   */
  async findByCode(trackingCode) {
    const pkg = MOCK_PACKAGES[trackingCode?.toUpperCase()]
    if (!pkg) return null

    return {
      trackingCode: trackingCode.toUpperCase(),
      status: pkg.status,
      description: pkg.status,
      estimatedDelivery: pkg.estimatedDelivery,
      lastLocation: pkg.location,
    }
  },
}
