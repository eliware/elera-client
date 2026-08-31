export const websocketUrl = (endpoint) => `${endpoint.replace(/^http/i, 'ws').replace(/\/$/, '')}/api/v1/routing/stream`;

export const activeEndpointFromShutdown = (current, event) => typeof event.loadBalancerEndpoint === 'string' && event.loadBalancerEndpoint ? event.loadBalancerEndpoint : current;
