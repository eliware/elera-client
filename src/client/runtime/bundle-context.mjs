export function updateBundleMetricsContext(metrics, bundle) {
  metrics?.setContext?.({
    application: bundle.application,
    credentialName: bundle.credentialName,
    database: bundle.database,
    scopes: bundle.scopes,
  });
}
