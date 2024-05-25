export const logger = {
  info: (...message: any) => {
    console.info(...message);
  },
  debug: (...message: any) => {
    console.debug(...message);
  },
  error: (...message: any) => {
    console.error(...message);
  },
};
