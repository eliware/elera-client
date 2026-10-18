export const hasUsablePool = (pool) => pool?.nodes?.some((node) => node.available);
