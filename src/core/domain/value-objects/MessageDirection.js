export const MessageDirection = Object.freeze({
  USER: 'user',
  BOT: 'bot',
  AGENT: 'agent',

  isValid: (direction) => ['user', 'bot', 'agent'].includes(direction),
})
