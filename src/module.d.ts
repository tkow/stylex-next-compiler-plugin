

declare module "@babel/core" {
  const babel: {transformAsync: any};
  export const transformAsync: any;
  export default babel
}

declare module "@babel/plugin-syntax-typescript" {}
declare module "@babel/plugin-syntax-jsx" {}
declare module "@babel/plugin-syntax-flow" {}
