/** @type {import('next').NextConfig} */
const nextConfig = {};
const stylexPlugin = require("@tkow/stylex-next-compiler-plugin").default;

const config = stylexPlugin({
  rootDir: process.cwd(),
  babelrc: false,
  babelOptions: {
    dev: process.env.NODE_ENV === "development",
    test: process.env.NODE_ENV === "test",
    // runtimeInjection: false,
    genConditionalClasses: true,
    treeshakeCompensation: true,
    unstable_moduleResolution: {
      type: "commonJS",
      rootDir: process.cwd(),
    },
  },
})(
  nextConfig
)

// module.exports = {}
module.exports = config
