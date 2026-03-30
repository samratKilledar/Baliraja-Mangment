const TYPOGRAPHY = {
  ratio: 1.25,
  android: {
    h1: 32,
    h2: 24,
    body: 16,
    support: 14,
    button: 16,
  },
  web: {
    h1: 48,
    h2: 32,
    body: 16,
    support: 14,
    button: 16,
  },
  lineHeight: {
    body: 26,
  },
  button: {
    letterSpacing: 0.5,
    fontWeight: '600' as const,
  },
  motion: {
    durationMs: 300,
    easing: [0.2, 0.0, 0.0, 1.0] as const,
    rippleColor: 'rgba(185, 168, 216, 0.2)',
  },
} as const;

export default TYPOGRAPHY;
