import { log } from "@eliware/log";

for (const level of ["error", "warn", "info", "http", "verbose", "debug", "silly"])
  log[level] = () => log;
