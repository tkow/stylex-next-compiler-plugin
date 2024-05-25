/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import * as babel from "@babel/core"
import { PLUGIN_NAME } from './const'
import path from 'path'
import flowSyntaxPlugin from '@babel/plugin-syntax-flow'
import jsxSyntaxPlugin from '@babel/plugin-syntax-jsx'
import typescriptSyntaxPlugin from '@babel/plugin-syntax-typescript'
import fs from 'fs/promises'

// This function is not called by Webpack directly.
// Instead, `NormalModule.getCompilationHooks` is used to inject a loader
// for JS modules. The loader than calls this function.
async function transformCode(stylexPlugin: any, inputCode: string, filename: string, logger: any, compiler: any) {
  const originalSource = stylexPlugin.babelConfig.babelrc
    ? await fs.readFile(filename, "utf8")
    : inputCode;

  if (
    stylexPlugin.stylexImports.some((importName: string) => originalSource.includes(importName))
  ) {
    const { code, map, metadata } = await babel.transformAsync(originalSource, {
      babelrc: stylexPlugin.babelConfig.babelrc,
      filename,
      // Use TypeScript syntax plugin if the filename ends with `.ts` or `.tsx`
      // and use the Flow syntax plugin otherwise.
      plugins: [
        ...stylexPlugin.babelConfig.plugins,
        /\.jsx?/.test(path.extname(filename))
          ? flowSyntaxPlugin
          : [typescriptSyntaxPlugin, { isTSX: true }],
        jsxSyntaxPlugin,
        stylexPlugin.babelPlugin,
      ],
      presets: stylexPlugin.babelConfig.presets,
    });

    if (metadata.stylex != null && metadata.stylex.length > 0) {

      console.log(stylexPlugin)
      const oldRules = stylexPlugin.stylexRules[filename] || [];
      stylexPlugin.stylexRules[filename] = metadata.stylex;
      logger.debug(`Read stylex styles from ${filename}:`, metadata.stylex);
      const oldClassNames = new Set(oldRules.map((rule: any) => rule[0]));
      const newClassNames = new Set(metadata.stylex.map((rule: any) => rule[0]));

      // If there are any new classNames in the output we need to recompile
      // the CSS bundle.
      if (
        oldClassNames.size !== newClassNames.size ||
        [...newClassNames].some((className) => !oldClassNames.has(className)) ||
        filename.endsWith(".stylex.ts") ||
        filename.endsWith(".stylex.tsx") ||
        filename.endsWith(".stylex.js")
      ) {
        stylexPlugin.cssFiles.forEach((cssFile: string) => {
          compiler.watchFileSystem.watcher.fileWatchers
            .get(cssFile)
            .watcher.emit("change");
        });
      }
    }


    if (!stylexPlugin.babelConfig.babelrc) {
      return { code, map };
    }
  }
  return { code: inputCode };
}

export default function stylexLoader(this: any, inputCode: string) {
  const callback = this.async();
  const { stylexPlugin } = this.getOptions();
  const logger = this._compiler.getInfrastructureLogger(PLUGIN_NAME);
  transformCode(stylexPlugin, inputCode, this.resourcePath, logger, this._compiler).then(
    ({ code, map }) => {
      callback(null, code, map);
    },
    (error) => {
      callback(error);
    }
  );
};
