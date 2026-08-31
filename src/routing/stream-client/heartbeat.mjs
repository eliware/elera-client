export function startHeartbeat({ getSocket, heartbeatMs, now }) {
  const heartbeat = setInterval(() => getSocket()?.send?.(JSON.stringify({ type: 'heartbeat', sentAt: now() })), heartbeatMs);
  heartbeat.unref?.();
  return heartbeat;
}

export function stopHeartbeat(heartbeat) {
  clearInterval(heartbeat);
}
