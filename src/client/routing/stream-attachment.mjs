import { createRoutingEventHandler } from "./routing/events.mjs";

export async function attachRoutingStream({ stream, api, metrics, getPools, drainTimeoutMs }) {
  if (!stream?.connect) throw new TypeError("routing stream is required");
  metrics?.start?.(stream);
  stream.setTelemetry?.(metrics);
  stream.setOnUpdate?.(
    createRoutingEventHandler({
      refresh: (event) => api.refresh(event),
      getPools,
      drainTimeoutMs,
    }),
  );
  await stream.connect();
  return () => stream.close?.();
}
