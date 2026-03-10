export const log = {
  info(msg) {
    console.log(msg);
  },
  success(msg) {
    console.log(`[ok] ${msg}`);
  },
  warn(msg) {
    console.warn(`[warn] ${msg}`);
  },
  error(msg) {
    console.error(`[error] ${msg}`);
  },
  dryRun(msg) {
    console.log(`[dry-run] ${msg}`);
  },
};
