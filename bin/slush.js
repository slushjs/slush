#!/usr/bin/env node

'use strict';
var gutil = require('gulp-util');
var prettyTime = require('pretty-hrtime');
var glob = require('glob');
var path = require('path');
var chalk = require('chalk');
var archy = require('archy');
var Liftoff = require('liftoff');
var taskTree = require('../lib/taskTree');
var log = require('../lib/log');
var slushPackage = require('../package');
var argv = require('minimist')(process.argv.slice(2));
var versionFlag = argv.v || argv.version;
var params = argv._.slice();
var generatorAndTasks = params.length ? params.shift().split(':') : [];
var generatorName = generatorAndTasks.shift();

if (!generatorName) {
  if (versionFlag) {
    log(slushPackage.version);
  } else {
    logGenerators(getAllGenerators());
  }
  process.exit(0);
}

var generator = getGenerator(generatorName);

if (!generator) {
  log(chalk.red('No generator by name: "' + generatorName + '" was found!'));
  log(chalk.red('Try installing it with `npm install -g slush-' + generatorName + '` first.'));
  process.exit(1);
}

// Setting cwd and slushfile dir:
argv.cwd = process.cwd();
argv.slushfile = path.join(generator.path, 'slushfile.js');
argv._ = generatorAndTasks;

var cli = new Liftoff({
  processTitle: 'slush',
  moduleName: 'gulp',
  configName: 'slushfile'
  // completions: require('../lib/completion') FIXME
});

cli.on('require', function(name) {
  gutil.log('Requiring external module', chalk.magenta(name));
});

cli.on('requireFail', function(name) {
  gutil.log(chalk.red('Failed to load external module'), chalk.magenta(name));
});

cli.launch(handleArguments, argv);

function handleArguments(env) {

  var argv = env.argv;
  var tasksFlag = argv.T || argv.tasks;
  var tasks = argv._;
  var toRun = tasks.length ? tasks : ['default'];
  var args = params;

  if (versionFlag) {
    log(slushPackage.version);
    if (env.modulePackage) {
      gutil.log(env.modulePackage.version);
    }
    if (generator.pkg.version) {
      console.log('[' + chalk.green('slush-' + generator.name) + '] ' + generator.pkg.version);
    }
    process.exit(0);
  }

  if (!env.modulePath) {
    gutil.log(chalk.red('No local gulp install found in'), chalk.magenta(generator.path));
    log(chalk.red('This is an issue with the `slush-' + generator.name + '` generator'));
    process.exit(1);
  }

  if (!env.configPath) {
    log(chalk.red('No slushfile found'));
    log(chalk.red('This is an issue with the `slush-' + generator.name + '` generator'));
    process.exit(1);
  }

  require(env.configPath);
  log('Using slushfile', chalk.magenta(env.configPath));

  var gulpInst = require(env.modulePath);
  gulpInst.args = args;
  logEvents(generator.name, gulpInst);

  if (process.cwd() !== env.cwd) {
    process.chdir(env.cwd);
    gutil.log('Working directory changed to', chalk.magenta(env.cwd));
  }

  process.nextTick(function() {
    if (tasksFlag) {
      return logTasks(generator.name, gulpInst);
    }
    gulpInst.start.apply(gulpInst, toRun);
  });
}

function logGenerators(generators) {
  var tree = {
    label: 'Installed generators',
    nodes: generators.map(function (gen) {
      return {label: gen.name + (gen.pkg.version ? chalk.grey(' (' + gen.pkg.version + ')') : '')};
    })
  };
  archy(tree).split('\n').forEach(function(v) {
    if (v.trim().length === 0) return;
    log(v);
  });
}

function logTasks(name, localGulp) {
  var tree = taskTree(localGulp.tasks);
  tree.label = 'Tasks for generator ' + chalk.magenta(name);
  archy(tree).split('\n').forEach(function(v) {
    if (v.trim().length === 0) return;
    gutil.log(v);
  });
}

// format orchestrator errors
function formatError(e) {
  if (!e.err) return e.message;
  if (e.err.message) return e.err.message;
  return JSON.stringify(e.err);
}

// wire up logging events
function logEvents(name, gulpInst) {
  gulpInst.on('task_start', function(e) {
    gutil.log('Starting', "'" + chalk.cyan(name + ':' + e.task) + "'...");
  });

  gulpInst.on('task_stop', function(e) {
    var time = prettyTime(e.hrDuration);
    gutil.log('Finished', "'" + chalk.cyan(name + ':' + e.task) + "'", 'after', chalk.magenta(time));
  });

  gulpInst.on('task_err', function(e) {
    var msg = formatError(e);
    var time = prettyTime(e.hrDuration);
    gutil.log("'" + chalk.cyan(name + ':' + e.task) + "'", 'errored after', chalk.magenta(time), chalk.red(msg));
  });

  gulpInst.on('task_not_found', function(err) {
    log(chalk.red("Task '" + err.task + "' was not defined in `slush-" + name + "` but you tried to run it."));
    process.exit(1);
  });

  gulpInst.on('stop', function () {
    log('Scaffolding done');
  });
}

function getGenerator (name) {
  return getAllGenerators().filter(function (gen) {
    return gen.name === name;
  })[0];
}

function getAllGenerators () {
  return findGenerators(getModulesPaths());
}

function getModulesPaths () {
  if (process.env.NODE_ENV === 'test') {
    return [path.join(__dirname, '..', 'test')];
  }
  var sep = (process.platform === 'win32') ? ';' : ':';
  var paths = [];

  if (process.env.NODE_PATH) {
    paths = paths.concat(process.env.NODE_PATH.split(sep));
  } else {
    if (process.platform === 'win32') {
      paths.push(path.join(process.env.APPDATA, 'npm', 'node_modules'));
    } else {
      paths.push('/usr/lib/node_modules');
    }
  }

  paths.push(path.join(__dirname, '..', '..'));
  paths.push.apply(paths, require.main.paths);
  return paths.filter(function(path, index, all){
    return all.lastIndexOf(path) === index;
  });
}

function findGenerators (searchpaths) {
  return searchpaths.reduce(function (arr, searchpath) {
    return arr.concat(glob.sync('{@*/,}slush-*', {cwd: searchpath, stat: true}).map(function (match) {
      var generator = {path: path.join(searchpath, match), name: match.replace(/(?:@[\w]+[\/|\\]+)?slush-/, ""), pkg: {}};
      try {
        generator.pkg = require(path.join(searchpath, match, 'package.json'));
      } catch (e) {
      }
      return generator;
    }));
  }, []);
}
