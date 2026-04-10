type SessionReason = 'expired' | 'unauthorized';
type SessionListener = (reason: SessionReason) => void;

let sessionListener: SessionListener | null = null;

export function registerSessionListener(listener: SessionListener) {
  sessionListener = listener;
  return () => {
    if (sessionListener === listener) {
      sessionListener = null;
    }
  };
}

export function notifySessionExpired(reason: SessionReason = 'expired') {
  if (sessionListener) {
    sessionListener(reason);
  }
}
