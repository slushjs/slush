'use strict';

var path = require('path');
var spawn = require('child_process').spawn;

require('should');

describe('slush', function() {

  it('should list installed generators', function(done) {
    runSlush([], function(code, data) {
      code.should.equal(0);
      data.should.match(/\├── empty/);
      data.should.match(/\└── test/);
      done();
    });
  });

  it('should list tasks for given generator', function(done) {
    runSlush(['test', '--tasks'], function(code, data) {
      code.should.equal(0);
      data.should.match(/\├── app/);
      data.should.match(/\└── default/);
      done();
    });
  });

  it('should run `default` task in generator, when task is not provided', function(done) {
    runSlush(['test'], function(code, data) {
      code.should.equal(0);
      data.should.match(/\ndefault\n/);
      done();
    });
  });

  it('should run provided task in generator', function(done) {
    runSlush(['test:app'], function(code, data) {
      code.should.equal(0);
      data.should.match(/\napp\n/);
      done();
    });
  });

  it('should run provided task with arguments in generator', function (done) {
    runSlush(['test:app', 'arg1', 'arg2'], function(code, data) {
      code.should.equal(0);
      data.should.match(/\napp \(arg1, arg2\)\n/);
      done();
    });
  });

  xit('should fail trying to run a non-existing generator', function(done) {
    runSlush(['noexist'], function(code, data) {
      code.should.equal(1);
      data.should.match(/\[slush\] No generator by name: "noexist" was found/);
      done();
    });
  });

  xit('should fail when running a non-existing task in a generator', function(done) {
    runSlush(['test:noexist'], function(code, data) {
      code.should.equal(1);
      data.should.match(/\[slush\] Task 'noexist' was not defined in `slush-test`/);
      done();
    });
  });

});

function runSlush(args, cb) {
  var slush = spawn('node', [path.join(__dirname, '..', 'bin', 'slush.js')].concat(args), { cwd: __dirname });
  var data = '';
  slush.stdout.setEncoding('utf8');
  slush.stdout.on('data', function(chunk) {
    data += chunk;
  });
  slush.on('close', function(code) {
    cb(code, data);
  });
}
