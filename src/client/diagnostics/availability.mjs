export function getAvailability(states) {
  const primaryAvailable = states.some((node) => node.route === "primary" && node.available);
  const primaryNodes = states.filter((node) => node.route === "primary");
  return {
    state: primaryAvailable
      ? "available"
      : primaryNodes.length <= 1
        ? "standalone-unavailable"
        : "cluster-unavailable",
    routes: {
      primary: primaryAvailable,
      balanced: states.some((node) => node.route === "balanced" && node.available),
    },
  };
}
