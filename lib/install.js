'use strict';
var fs = require('fs'),
    path = require('path'),
    join = path.join.bind(path, process.cwd()),
    spawn = require('child_process').spawn;

module.exports = exports = function () {
  var cmds = exports.getCommands();
  if (!cmds.length) {
    return;
  }
  cmds.forEach(function (command) {
    spawn(command.cmd, command.args, {stdio: 'inherit', cwd: process.cwd()});
  });
};

exports.getCommands = function () {
  var cmds = [];
  if (fs.existsSync(join('package.json'))) {
    cmds.push({cmd: 'npm', args: ['install']});
  }
  if (fs.existsSync(join('bower.json'))) {
    cmds.push({cmd: 'bower', args: ['install']});
  }
  return cmds;
};

exports.getCommand = function () {
  return exports.getCommands().map(function (command) {
    return command.cmd + ' ' + command.args.join(' ');
  }).join(' && ');
};
