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
var tasks = generatorAndTasks;

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

cli.launch({
  // Setting cwd and slushfile dir:
  cwd: process.cwd(),
  configPath: path.join(generator.path, 'slushfile.js')
}, handleArguments);

function handleArguments(env) {
  var tasksFlag = argv.T || argv.tasks;
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
    } else if (gulpInst.start) {
      // Gulp <= 3.9.1 (gulp.start() is unsupported and breaks under Node 10)
      return gulpInst.start.apply(gulpInst, toRun);
    }
    runGulpV4Tasks(gulpInst, toRun);
  });
}

// For Gulp 4, we have to bind gulpInst to task functions individually. We
// trigger our own `task_not_found` and `finished` events to maintain the same
// Slush interface between Gulp versions (rather than relying on the default
// Gulp 4 behavior).
function runGulpV4Tasks(gulpInst, toRun) {
  toRun.forEach(function(task) {
    var gulpTask = gulpInst.task(task);
    if (gulpTask === undefined) {
      gulpInst.emit('task_not_found', { task: task });
    }
    gulpInst.task(task, gulpTask.bind(gulpInst));
  });
  gulpInst.parallel(toRun)(function(err) {
    if (err) {
      process.exit(1);
    }
    gulpInst.emit('finished');
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
  // Gulp <= 3.9.1 uses gulp.tasks; Gulp >= 4.0.0 uses gulp.tree().
  var tree = localGulp.tasks ? taskTree(localGulp.tasks) : localGulp.tree();
  tree.label = 'Tasks for generator ' + chalk.magenta(name);
  archy(tree).split('\n').forEach(function(v) {
    if (v.trim().length === 0) return;
    gutil.log(v);
  });
}

// format orchestrator errors
function formatError(e) {
  var err = e.err || e.error;
  if (!err) return e.message;
  if (err.message) return err.message;
  return JSON.stringify(err);
}

// wire up logging events
function logEvents(name, gulpInst) {
  var names = getEventNames(gulpInst);

  gulpInst.on(names.task_start, function(e) {
    gutil.log('Starting', "'" + chalk.cyan(name + ':' + taskName(e)) + "'...");
  });

  gulpInst.on(names.task_stop, function(e) {
    gutil.log('Finished', "'" + chalk.cyan(name + ':' + taskName(e)) + "'", 'after', chalk.magenta(taskDuration(e)));
  });

  gulpInst.on(names.task_error, function(e) {
    console.error('ERR', e);
    var msg = formatError(e);
    gutil.log("'" + chalk.cyan(name + ':' + taskName(e)) + "'", 'errored after', chalk.magenta(taskDuration(e)), chalk.red(msg));
  });

  gulpInst.on('task_not_found', function(err) {
    log(chalk.red("Task '" + err.task + "' was not defined in `slush-" + name + "` but you tried to run it."));
    process.exit(1);
  });

  gulpInst.on(names.finished, function () {
    log('Scaffolding done');
  });
}

function taskName(event) {
  return event.task || event.name;
}

function taskDuration(event) {
  return prettyTime(event.hrDuration || event.duration);
}

function getEventNames(gulpInst) {
  if (gulpInst.tasks) {
    // Gulp v3.9.1 and earlier
    return {
      task_start: 'task_start',
      task_stop: 'task_stop',
      task_error: 'task_err',
      finished: 'stop'
    };
  }
  // Gulp v4.0.0 and later
  return {
    task_start: 'start',
    task_stop: 'stop',
    task_error: 'error',
    finished: 'finished'
  };
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
