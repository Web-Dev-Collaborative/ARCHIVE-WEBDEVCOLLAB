import { join } from 'path';
import { outputFileSync } from 'fs-extra';
import { Compiler, TranspileOutput, TranspileOpts } from '@teambit/compiler';
import { BuiltTaskResult, BuildContext } from '@teambit/builder';
import { compileSync as mdxCompileSync } from '@teambit/mdx.modules.mdx-compiler';
import minimatch from 'minimatch';
import { transpileFileContent as babelTranspileFileContent } from '@teambit/compilation.modules.babel-compiler';
import type { TransformOptions } from '@babel/core';

export type MDXCompilerOpts = {
  ignoredExtensions?: string[];
  ignoredPatterns?: string[];
  babelTransformOptions?: TransformOptions;
};
export class MDXCompiler implements Compiler {
  displayName = 'MDX';

  shouldCopyNonSupportedFiles = true;

  distDir = 'dist';

  constructor(readonly id: string, readonly config: MDXCompilerOpts) {}

  displayConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  transpileFile(fileContent: string, options: TranspileOpts): TranspileOutput {
    const afterMdxCompile = mdxCompileSync(fileContent, {
      filepath: options.filePath,
      // this compiler is not indented to compile according to the bit flavour.
      bitFlavour: false,
    });
    const filePathAfterMdxCompile = this.replaceFileExtToJs(options.filePath);
    const afterBabelCompile = babelTranspileFileContent(
      afterMdxCompile.contents,
      {
        rootDir: options.componentDir,
        filePath: filePathAfterMdxCompile,
      },
      this.config.babelTransformOptions || {}
    );

    return afterBabelCompile;
  }

  /**
   * compile components inside isolated capsules. this being used during tag for the release.
   * meaning, the final package of the component has the dists generated by this method.
   */
  async build(context: BuildContext): Promise<BuiltTaskResult> {
    const capsules = context.capsuleNetwork.seedersCapsules;
    const componentsResults = capsules.map((capsule) => {
      const srcFiles = capsule.component.filesystem.files.filter((file) => {
        return this.isFileSupported(file.relative);
      });

      const errors = srcFiles.map((srcFile) => {
        try {
          const afterMdxCompile = mdxCompileSync(srcFile.contents.toString('utf-8'));
          const afterBabelCompile = babelTranspileFileContent(
            afterMdxCompile.contents,
            {
              rootDir: capsule.path,
              filePath: this.replaceFileExtToJs(srcFile.relative),
            },
            this.config.babelTransformOptions || {}
          );
          if (!afterBabelCompile) {
            return undefined;
          }
          outputFileSync(
            join(capsule.path, this.getDistPathBySrcPath(afterBabelCompile[0].outputPath)),
            afterBabelCompile[0].outputText
          );
          if (afterBabelCompile.length > 1) {
            outputFileSync(
              join(capsule.path, this.distDir, afterBabelCompile[1].outputPath),
              afterBabelCompile[1].outputText
            );
          }
          return undefined;
        } catch (err) {
          return err;
        }
      });

      return {
        errors: errors.filter((err) => !!err),
        component: capsule.component,
      };
    });

    return {
      componentsResults,
      artifacts: [
        {
          name: 'dist',
          globPatterns: [`${this.distDir}/**`],
        },
      ],
    };
  }

  /**
   * given a source file, return its parallel in the dists. e.g. "index.ts" => "dist/index.js"
   * both, the return path and the given path are relative paths.
   */
  getDistPathBySrcPath(srcPath: string): string {
    const fileWithNewExt = this.replaceFileExtToJs(srcPath);
    return join(this.distDir, fileWithNewExt);
  }

  private replaceFileExtToJs(srcPath: string): string {
    let fileWithNewExt = srcPath;
    if (this.isFileSupported(srcPath)) {
      fileWithNewExt = srcPath.replace('.mdx', '.mdx.js');
    }
    return fileWithNewExt;
  }

  /**
   * only supported files matching get compiled. others, are copied to the dist dir.
   */
  isFileSupported(filePath: string): boolean {
    const ignoredExtensions = this.config.ignoredExtensions ?? [];
    const ignoredExt = ignoredExtensions.find((ext) => filePath.endsWith(ext));
    const ignoredPatterns = this.config.ignoredPatterns ?? [];
    const ignoredPattern = ignoredPatterns.find((pattern) => minimatch(filePath, pattern));
    return !ignoredExt && !ignoredPattern && (filePath.endsWith('.mdx') || filePath.endsWith('.md'));
  }

  /**
   * returns the version of the current compiler instance (e.g. '4.0.1').
   */
  version(): string {
    return '';
  }
}