export function activeEndpointFromShutdown(current, event) {
  return typeof event.loadBalancerEndpoint === "string" && event.loadBalancerEndpoint
    ? event.loadBalancerEndpoint
    : current;
}
