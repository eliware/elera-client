export const websocketUrl = (endpoint) =>
  `${endpoint.replace(/^http/i, "ws").replace(/\/$/, "")}/api/v1/routing/stream`;

export const activeStreamUrl = (state) => websocketUrl(state.activeEndpoint);
