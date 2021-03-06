/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const cssnano = require('cssnano');
const filepath = require('filepath');
const fm = require('front-matter');
const fs = require('fs-extra');
const glob = require('glob-promise');
const rimraf = require('rimraf');
const shell = require('shelljs');

const CWD = process.cwd();

const siteConfig = require(CWD + '/website/siteConfig.js');
const buildDir = CWD + '/website/build';
const docsDir = CWD + '/docs';
const staticCSSDir = CWD + '/website/static/css';

let inputMarkdownFiles = [];
let inputAssetsFiles = [];
let outputHTMLFiles = [];
let outputAssetsFiles = [];

function generateSite() {
  shell.cd('website');
  shell.exec('yarn build');
}

function clearBuildFolder() {
  return rimraf(buildDir);
}

beforeEach(() => {
  shell.cd(CWD);
});

beforeAll(() => {
  generateSite();
  return Promise.all([
    glob(docsDir + '/**/*.md'),
    glob(buildDir + '/' + siteConfig.projectName + '/docs/**/*.html'),
    glob(docsDir + '/assets/*'),
    glob(buildDir + '/' + siteConfig.projectName + '/img/*'),
  ]).then(function(results) {
    [
      inputMarkdownFiles,
      outputHTMLFiles,
      inputAssetsFiles,
      outputAssetsFiles,
    ] = results;
    return;
  });
});

afterAll(() => {
  clearBuildFolder();
});

test('Build folder exists', function() {
  return fs.stat(buildDir).then(function(status) {
    expect(status.isDirectory()).toBeTruthy();
  });
});

test('Generated HTML for each Markdown resource', function() {
  let metadata = [];
  outputHTMLFiles.forEach(function(file) {
    const path = filepath.create(file);
    metadata.push(path.basename());
  });
  inputMarkdownFiles.forEach(function(file) {
    const data = fs.readFileSync(file, 'utf8');
    const frontmatter = fm(data);
    expect(metadata).toContain(frontmatter.attributes.id + '.html');
  });
});

test('Generated table of contents', function() {
  outputHTMLFiles.forEach(function(file) {
    const fileContents = fs.readFileSync(file, 'utf8');
    expect(fileContents).not.toContain('<AUTOGENERATED_TABLE_OF_CONTENTS>');
  });
});

test('Concatenated CSS files', function() {
  return Promise.all([
    glob(staticCSSDir + '/*.css'),
    fs.readFile(
      buildDir + '/' + siteConfig.projectName + '/css/main.css',
      'utf8'
    ),
  ]).then(function(results) {
    const [inputFiles, outputFile] = results;
    inputFiles.forEach(async function(file) {
      const contents = fs.readFileSync(file, 'utf8');
      const {css} = await cssnano.process(contents, {}, {preset: 'default'});
      expect(outputFile).toContain(css);
    });
  });
});

test('Copied assets from /docs/assets', function() {
  let metadata = [];
  outputAssetsFiles.forEach(function(file) {
    const path = filepath.create(file);
    metadata.push(path.basename());
  });
  inputAssetsFiles.forEach(function(file) {
    const path = filepath.create(file);
    expect(metadata).toContain(path.basename());
  });
});
