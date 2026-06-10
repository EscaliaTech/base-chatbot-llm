export const ConversationStatus = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',

  isValid: (status) =>
    ['open', 'in_progress', 'resolved', 'closed'].includes(status),

  transitions: {
    open: ['in_progress'],
    in_progress: ['resolved', 'open'],
    resolved: ['closed', 'in_progress'],
    closed: [],
  },

  canTransition: (from, to) =>
    ConversationStatus.transitions[from]?.includes(to) ?? false,
})
