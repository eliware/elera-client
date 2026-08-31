import { validateRoutingEvent } from '@eliware/elera-lib';

export function parseRoutingEvent(data) {
  return validateRoutingEvent(JSON.parse(data));
}
