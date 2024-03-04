import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const __dirname = dirname(join(new URL(import.meta.url).pathname, '..'));

function execShellCommand(cmd) {
  return new Promise((res) => {
    exec(cmd, (_, stdout, stderr) => {
      res(stdout ? stdout : stderr);
    });
  });
}

function clearAndUpper(text) {
  return text.replace(/-/, '').toUpperCase();
}

function toCamelCase(text) {
  return text.replace(/-\w/g, clearAndUpper);
}

function toPascalCase(text) {
  return text.replace(/(^\w|-\w)/g, clearAndUpper);
}

function pipe(...fns) {
  return (x) => fns.reduce((v, f) => f(v), x);
}

function spreadProps(svg) {
  return svg.replace(/<svg/, `<svg width="1em" height="1em" {...props} ref={ref}`);
}

function convertSvgPropsToPreactProps(svg) {
  return svg.replace(
    /(clip-rule|fill-rule|stroke-linecap|stroke-linejoin|stroke-width)/g,
    (match) => {
      return toCamelCase(match);
    },
  );
}

function removeFill(svg) {
  return svg.replace(/ fill="#fff"/, '');
}

function setStrokeToCurrent(svg) {
  return svg.replace(/stroke="#[a-zA-Z0-9]+"/, ' stroke="currentColor"');
}

function properlyIndent(svg) {
  return svg.trim().split('\n').join('\n    ');
}

const processSVG = pipe(
  spreadProps,
  convertSvgPropsToPreactProps,
  removeFill,
  setStrokeToCurrent,
  properlyIndent,
);

const heroicons = join(__dirname, 'heroicons');
const iconsFolder = join(__dirname, 'src');

const gitRepo = 'git clone https://github.com/tailwindlabs/heroicons.git';

const imports = [];

const iconTypes = {
  outline: ['24', 'outline'],
  solid: ['24', 'solid'],
  'mini-solid': ['20', 'solid'],
};

const processRepo = async () => {
  try {
    const folderPromises = Object.entries(iconTypes).map(
      async ([svgType, iconPath]) => {
        const srcFolder = join(heroicons, 'optimized', ...iconPath);
        const outFolder = join(iconsFolder, svgType);

        if (existsSync(outFolder))
          await rm(outFolder, { recursive: true, force: true });
        await mkdir(outFolder);
        const iconFiles = await readdir(srcFolder);
        const iconPromises = iconFiles.map(async (svg) => {
          const src = join(srcFolder, svg);

          const everythingButExtension = svg.slice(0, svg.lastIndexOf('.'));
          const outName = everythingButExtension + '-' + svgType;
          const outFileName = `${outName}.tsx`;
          const out = join(outFolder, outFileName);
          const pascalName = toPascalCase(outName);
          const original = (await readFile(src)).toString();
          imports.push([join(svgType, outFileName), pascalName]);

          const component = processSVG(original);

          await writeFile(
            out,
            `
/** @jsx h */
import { forwardRef } from 'preact/compat';
import { h } from 'preact';
import { HeroIcon } from "../types";

export const ${pascalName}: HeroIcon = forwardRef((props, ref) => {
  return (
    ${component}
  )
})
          `.trim() + '\n',
          );
        });

        await Promise.all(iconPromises);
      },
    );

    await Promise.all(folderPromises);
    console.log(`Built ${imports.length} icons!`);
    await writeFile(
      join(iconsFolder, 'index.ts'),
      imports
        .sort(([_, a], [__, b]) => a.localeCompare(b))
        .map(
          ([importPath, name]) =>
            // mandatory file extensions: https://nodejs.org/api/esm.html#esm_mandatory_file_extensions
            `export { ${name} } from "./${importPath.split('.')[0]}.js";`,
        )
        .join('\n') +
        '\n' +
        `export type { HeroIcon } from "./types";`,
    );
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  console.time('Generating Icon Components');
  console.log(`Cloning ${gitRepo} to ${heroicons}`);
  await execShellCommand(`${gitRepo} ${heroicons}`);
  await processRepo();
  console.log('Removing the repo...');
  await rm(heroicons, { recursive: true, force: true });
  console.timeEnd('Generating Icon Components');
  if (existsSync(join(__dirname, 'dist')))
    await rm(join(__dirname, 'dist'), { recursive: true, force: true });
})();
