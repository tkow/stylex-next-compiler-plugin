# @tkow/stylex-next-swc-plugin

This is extended of [@stylex/nextjs-plugin](https://github.com/facebook/stylex/blob/main/packages/nextjs-plugin/README.md) to work arround with nextjs compiler.

## Documentation Website
[https://stylexjs.com](https://stylexjs.com)

## Installation

Install the package by using:
```bash
npm install --save-dev @tkow/stylex-next-swc-plugin @stylexjs/babel-plugin
```

# Custom Babel Compiler Configuration

Add the following to your `.babelrc.js`

```javascript
module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      '@stylexjs/babel-plugin',
      {
        dev: process.env.NODE_ENV === 'development',
        runtimeInjection: false,
        genConditionalClasses: true,
        unstable_moduleResolution: {
          type: 'commonJS',
          rootDir: __dirname,
        },
      },
    ],
  ],
};
```

# Next Compiler Configuration (SWC)

Without `.babelrc.js` and other babel configuration files.

Add the following to your `next.config.js`

```javascript
const stylexPlugin = require('@tkow/stylex-next-swc-plugin');

module.exports = stylexPlugin({
  rootDir: process.env.cwd(),
  babelrc: false,
  babelOptions: {
    dev: process.env.NODE_ENV === 'development',
    runtimeInjection: false,
    genConditionalClasses: true,
    unstable_moduleResolution: {
      type: 'commonJS',
      rootDir: __dirname,
    },
  }
})({});
```

When you want to use Next-Compiler(SWC), you should specify babelrc option false. The babelOptions is optional and the schema is defined by @stylexjs/babel-plugin.
