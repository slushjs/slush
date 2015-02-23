'use strict';
var spawn = require('child_process').spawn,
    path = require('path');

describe('slush', function () {
  it('should list installed generators', function (done) {
    var slush = runSlush();
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(0);
      data.should.match(/\[slush\] ├── bad/);
      data.should.match(/\[slush\] └── test/);
      done();
    });
  });

  it('should list tasks for given generator', function (done) {
    var slush = runSlush(['test', '--tasks']);
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(0);
      data.should.match(/├── default/);
      data.should.match(/└── app/);
      done();
    });
  });

  it('should run `default` task in generator, when task is not provided', function (done) {
    var slush = runSlush(['test']);
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(0);
      data.should.match(/\ndefault\n/);
      done();
    });
  });

  it('should run provided task in generator', function (done) {
    var slush = runSlush(['test:app']);
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(0);
      data.should.match(/\napp\n/);
      done();
    });
  });

  it('should run provided task with arguments in generator', function (done) {
    var slush = runSlush(['test:app', 'arg1', 'arg2']);
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(0);
      data.should.match(/\napp \(arg1, arg2\)\n/);
      done();
    });
  });

  it('should fail when running a non-existing task in a generator', function (done) {
    var slush = runSlush(['test:noexist']);
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(1);
      data.should.match(/\[slush\] Task 'noexist' was not defined in `slush-test`/);
      done();
    });
  });

  it('should fail when running a generator without slushfile', function (done) {
    var slush = runSlush(['bad']);
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(1);
      data.should.match(/\[slush\] No slushfile found/);
      data.should.match(/\[slush\].+issue with.+`slush-bad`/);
      done();
    });
  });

  it('should fail trying to run a non-existing generator', function (done) {
    var slush = runSlush(['noexist']);
    var data = '';
    slush.stdout.on('data', function (chunk) {
      data += chunk;
    });
    slush.on('close', function (code) {
      code.should.equal(1);
      data.should.match(/\[slush\] No generator by name: "noexist" was found/);
      done();
    });
  });
});

function runSlush (args) {
  args = args || [];
  var slush = spawn('node', [path.join(__dirname, '..', 'bin', 'slush.js')].concat(args), {cwd: __dirname});
  slush.stdout.setEncoding('utf8');
  return slush;
}
