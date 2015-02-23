#!/usr/bin/env node

'use strict';

var path = require('path');
var glob = require('glob');
var archy = require('archy');
var chalk = require('chalk');
var resolve = require('resolve');

var params = process.argv.splice(2);

if (params.length > 0) {
  var tasks = params.shift().split(':');
  var generator = findGenerators(tasks.shift())[0];
  var gulpArgs = [];
  params.some(function(param) {
    if (param[0] !== '-') {
      gulpArgs.push(param);
      return false;
    }
    return true;
  });
  params.splice(0, gulpArgs.length);
  process.argv = process.argv.concat([
    '--gulpfile', generator.slushfilePath,
    '--cwd', '.'
  ], tasks, params);
  var gulpPath = resolve.sync('gulp', { basedir: generator.modulePath });
  var gulpInst = require(gulpPath);
  gulpInst.args = gulpArgs;
  return require('gulp-cli')();
}

var tree = {
  label: 'Installed generators',
  nodes: findGenerators('*').map(function(gen) {
    return { label: gen.name + (gen.version ? chalk.grey(' (' + gen.version + ')') : '') };
  })
};

console.log(archy(tree));

function getSearchPaths() {
  if (process.env.NODE_ENV === 'test') {
    return [path.join(__dirname, '..', 'test')];
  }
  var paths = [];
  if (process.platform === 'win32') {
    paths.push(path.join(process.env.APPDATA, 'npm', 'node_modules'));
  } else {
    paths.push('/usr/lib/node_modules');
  }
  paths.push(path.join(__dirname, '..', '..'));
  paths.push.apply(paths, require.main.paths);
  return paths.map(function(path) {
    return path.toLowerCase();
  }).filter(function(path, index, all) {
    return all.lastIndexOf(path) === index;
  });
}

function findGenerators(searchStr) {
  var matches = getSearchPaths().reduce(function(arr, searchPath) {
    return arr.concat(glob.sync(path.join(searchPath, 'slush-' + searchStr, 'slushfile.js')));
  }, []);
  return matches.map(function(slushfilePath) {
    var modulePath = path.dirname(slushfilePath);
    var generator = {
      name: path.basename(modulePath).slice(6),
      modulePath: modulePath,
      slushfilePath: slushfilePath
    };
    try {
      generator.version = require(path.join(modulePath, 'package.json')).version;
    } catch (e) {}
    return generator;
  });
}
