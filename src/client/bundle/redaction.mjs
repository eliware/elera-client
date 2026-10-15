export const redactBundle = (bundle) => {
  if (!bundle) return bundle;
  const { credentials: _credentials, ...redacted } = bundle;
  return redacted;
};
