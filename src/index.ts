/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import  { logger } from './logger';
import WebpackPluginStylex from './custom-webpack-plugin';

let count = 0;

const stylexPlugin =
  ({ rootDir, filename = 'stylex-bundle.css', ...pluginOptions }: { rootDir: string, filename?: string, [key: string]: any }) =>
  (nextConfig: any = {}) => {
    return {
      ...nextConfig,
      webpack(config: { optimization: { splitChunks: { cacheGroups: any; }; }; plugins: WebpackPluginStylex[]; }, options: { buildId: any; dev: any; isServer: any; }) {
        if (typeof nextConfig.webpack === 'function') {
          config = nextConfig.webpack(config, options);
        }

        const { buildId, dev, isServer } = options;

        logger.debug(
          [
            'GETTING WEBPACK CONFIG',
            '======================',
            `Count: ${++count}`,
            `Build ID: ${buildId}`,
            `Server: ${isServer}`,
            `Env: ${dev ? 'dev' : 'prod'}`,
          ].join('\n'),
        );

        config.optimization.splitChunks ||= { cacheGroups: {} };
        if (config.optimization.splitChunks?.cacheGroups?.styles) {
          config.optimization.splitChunks.cacheGroups.styles = {
            name: 'styles',
            test: /\.css$/,
            chunks: 'all',
            enforce: true,
          };
        }

        const webpackPluginOptions = {
          babelConfig: {
            babelrc: pluginOptions.babelrc ?? true,
            buildId,
            isServer,
            count,
            dev,
          },
          rootDir,
          appendTo: (name: string) => name.endsWith('.css'),
          filename,
          dev,
          ...pluginOptions,
        };

        const stylexPlugin = new WebpackPluginStylex(webpackPluginOptions);
        config.plugins.push(stylexPlugin);
        return config;
      },
    };
  };

export default stylexPlugin
