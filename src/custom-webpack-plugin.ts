/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */

import path from "path";
import stylexBabelPlugin from "@stylexjs/babel-plugin";
import fs from "fs/promises";
import { PLUGIN_NAME } from "./const";
import  { Compilation, Compiler, NormalModule, WebpackError } from "webpack";
import  { sources } from "webpack";
import  { logger } from "./logger";

const { RawSource, ConcatSource } = sources;


const IS_DEV_ENV =
  process.env.NODE_ENV === "development" ||
  process.env.BABEL_ENV === "development";

/*::
type PluginOptions = $ReadOnly<{
  dev?: boolean,
  useRemForFontSize?: boolean,
  stylexImports?: $ReadOnlyArray<string>,
  babelConfig?: $ReadOnly<{
    plugins?: $ReadOnlyArray<mixed>,
    presets?: $ReadOnlyArray<mixed>,
    babelrc?: boolean,
  }>,
  babelOptions?: $ReadOnly<{
     dev?: boolean,
     useRemForFontSize?: number,
     aliases?: string[],
     runtimeInjection?: boolean,
     genConditionalClasses?: boolean,
     treeshakeCompensation?: boolean,
     unstable_moduleResolution?: {
       type: 'commonJS',
       rootDir: string,
     },
     importSources?: $ReadOnlyArray<string>,
  }>
  filename?: string,
  appendTo?: string | (string) => boolean,
  useCSSLayers?: boolean,
}>
*/

const stylexRules: {[key: string]: any} = {};
const cssFiles: Set<string> = new Set();

class StylexPlugin {
  [x: string]: any;
  filesInLastRun = null;
  filePath: string | null = null;
  appendTo: any;
  dev: any;
  filename: any;
  babelConfig: any;

  constructor({
    dev = IS_DEV_ENV,
    useRemForFontSize,
    appendTo,
    filename = appendTo == null ? "stylex.css" : undefined,
    stylexImports = ["stylex", "@stylexjs/stylex"],
    rootDir = "", // Add a default value for rootDir
    babelConfig = {},
    aliases,
    babelOptions = {},
    useCSSLayers = false,
  }: any /*: PluginOptions */ = {}) {
    this.dev = dev;
    this.appendTo = appendTo;
    this.filename = filename;
    this.babelConfig = {
      plugins: [],
      presets: [],
      babelrc: [],
      ...babelConfig,
    };
    this.stylexImports = babelOptions.stylexImports ?? stylexImports;
    this.babelPlugin = [
      stylexBabelPlugin,
      {
        dev: babelOptions.dev ?? dev,
        useRemForFontSize: babelOptions.useRemForFontSize ?? useRemForFontSize,
        aliases: babelOptions.aliases ?? aliases,
        runtimeInjection: babelOptions.runtimeInjection ?? false,
        genConditionalClasses: babelOptions.genConditionalClasses ?? true,
        treeshakeCompensation: babelOptions.treeshakeCompensation ?? true,
        unstable_moduleResolution: {
          type: babelOptions.unstable_moduleResolution?.type ?? "commonJS",
          rootDir: babelOptions.unstable_moduleResolution?.rootDir ?? rootDir,
        },
        importSources: this.stylexImports,
      },
    ];
    this.useCSSLayers = useCSSLayers;
  }

  async apply(compiler: Compiler) {
    compiler.hooks.make.tap(PLUGIN_NAME, (compilation) => {
      // Apply loader to JS modules.
      NormalModule.getCompilationHooks(compilation).loader.tap(
        PLUGIN_NAME,
        (loaderContext, module) => {
          if (
            // JavaScript (and Flow) modules
            /\.jsx?/.test(path.extname(module.resource)) ||
            // TypeScript modules
            /\.tsx?/.test(path.extname(module.resource))
          ) {
            // We use .push() here instead of .unshift()
            // Webpack usually runs loaders in reverse order and we want to ideally run
            // our loader before anything else.
            module.loaders.push({
              loader: path.resolve(__dirname, "custom-webpack-loader.js"),
              options: {
                stylexPlugin: {
                  babelConfig: this.babelConfig,
                  babelPlugin: this.babelPlugin,
                  stylexRules,
                  cssFiles,
                  stylexImports:this.stylexImports
                },
              },
            } as any);
          }

          if (
            // JavaScript (and Flow) modules
            /\.css/.test(path.extname(module.resource))
          ) {
            cssFiles.add(module.resource);
          }
        }
      );

      const getStyleXRules = () => {
        if (Object.keys(stylexRules).length === 0) {
          return null;
        }
        // Take styles for the modules that were included in the last compilation.
        const allRules = Object.keys(stylexRules)
          .map((filename) => stylexRules[filename])
          .flat();
        return stylexBabelPlugin.processStylexRules(
          allRules,
          this.useCSSLayers
        );
      };

      if (this.appendTo) {
        compilation.hooks.processAssets.tap(
          {
            name: PLUGIN_NAME,
            stage: Compilation.PROCESS_ASSETS_STAGE_PRE_PROCESS, // see below for more stages
          },
          (assets: any) => {
            const cssFileName = Object.keys(assets).find(
              typeof this.appendTo === "function"
                ? this.appendTo
                : (filename) => filename.endsWith(this.appendTo)
            );
            const stylexCSS = getStyleXRules();

            if (cssFileName && stylexCSS != null) {
              this.filePath = path.join(process.cwd(), ".next", cssFileName);

              const updatedSource = new ConcatSource(
                new RawSource(assets[cssFileName].source()),
                new RawSource(stylexCSS)
              );

              compilation.updateAsset(cssFileName, updatedSource);
            }
          }
        );
      } else {
        // Consume collected rules and emit the stylex CSS asset
        compilation.hooks.additionalAssets.tap(PLUGIN_NAME, () => {
          try {
            const collectedCSS = getStyleXRules();
            if (collectedCSS) {
              logger.info("emitting asset", this.filename, collectedCSS);
              compilation.emitAsset(this.filename, new RawSource(collectedCSS));
              fs.writeFile(this.filename, collectedCSS).then(() =>
                logger.info("wrote file", this.filename)
              );
            }
          } catch (e) {
            compilation.errors.push(e as WebpackError);
          }
        });
      }
    });
  }

  // reprocessStyles() {
  //   if (metadata.stylex != null && metadata.stylex.length > 0) {
  //     const oldRules = stylexPlugin.stylexRules[filename] || [];
  //     stylexPlugin.stylexRules[filename] = metadata.stylex;
  //     logger.debug(`Read stylex styles from ${filename}:`, metadata.stylex);

  //     const oldClassNames = new Set(oldRules.map((rule) => rule[0]));
  //     const newClassNames = new Set(metadata.stylex.map((rule) => rule[0]));

  //     // If there are any new classNames in the output we need to recompile
  //     // the CSS bundle.
  //     if (
  //       oldClassNames.size !== newClassNames.size ||
  //       [...newClassNames].some((className) => !oldClassNames.has(className)) ||
  //       filename.endsWith(".stylex.ts") ||
  //       filename.endsWith(".stylex.tsx") ||
  //       filename.endsWith(".stylex.js")
  //     ) {
  //       stylexPlugin.compilers.forEach((compiler) => {
  //         stylexPlugin.cssFiles.forEach((cssFile) => {
  //           compiler.watchFileSystem.watcher.fileWatchers
  //             .get(cssFile)
  //             .watcher.emit("change");
  //         });
  //       });
  //     }
  //   }
  // }
}

export default StylexPlugin;
