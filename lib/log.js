var chalk = require('chalk');

module.exports = function(){
  var sig = '['+chalk.green('slush')+']';
  var args = Array.prototype.slice.call(arguments);
  args.unshift(sig);
  console.log.apply(console, args);
  return this;
};
