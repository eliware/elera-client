export function trackNodeConnection(connection, lifecycle) {
  lifecycle.begin();
  const release = connection.release.bind(connection);
  let released = false;
  connection.release = () => {
    if (released) return;
    released = true;
    lifecycle.end();
    release();
  };
  return connection;
}
