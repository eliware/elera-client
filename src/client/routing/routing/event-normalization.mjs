import { ROUTING_RESYNC } from "../../../routing/internal-events.mjs";

export function normalizeRoutingUpdate(event) {
  const update =
    event.type === "routing.update"
      ? { ...event }
      : event.type === ROUTING_RESYNC
        ? { ...event.bundle }
        : undefined;
  if (update?.type) delete update.type;
  if (update?.version !== undefined) delete update.version;
  if (update?.generatedAt !== undefined) delete update.generatedAt;
  return update;
}
