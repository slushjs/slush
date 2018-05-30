'use strict';
var spawn = require('child_process').spawn,
    path = require('path');

describe('slush', function () {
  it('should list installed generators', function (done) {
    runSlush(undefined, function(code, data) {
      code.should.equal(0);
      data.should.match(/\[slush\] ├── bad/);
      data.should.match(/\[slush\] └── test/);
    }, done);
  });

  it('should list tasks for given generator', function (done) {
    runSlush(['test', '--tasks'], function(code, data) {
      code.should.equal(0);
      data.should.match(/├── default/);
      data.should.match(/└── app/);
    }, done);
  });

  it('should run `default` task in generator, when task is not provided', function (done) {
    runSlush(['test'], function(code, data) {
      code.should.equal(0);
      data.should.match(/ Starting 'test:default'\.\.\./);
      data.should.match(/\ndefault\n/);
      data.should.match(/ Finished 'test:default' after /);
      data.should.match(/Scaffolding done/);
    }, done);
  });

  it('should run provided task in generator', function (done) {
    runSlush(['test:app'], function(code, data) {
      code.should.equal(0);
      data.should.match(/ Starting 'test:app'\.\.\./);
      data.should.match(/\napp\n/);
      data.should.match(/ Finished 'test:app' after /);
      data.should.match(/Scaffolding done/);
    }, done);
  });

  it('should run multiple tasks in generator', function (done) {
    runSlush(['test:app:default'], function(code, data) {
      code.should.equal(0);
      data.should.match(/ Starting 'test:app'\.\.\./);
      data.should.match(/\napp\n/);
      data.should.match(/ Finished 'test:app' after /);
      data.should.match(/ Starting 'test:default'\.\.\./);
      data.should.match(/\ndefault\n/);
      data.should.match(/ Finished 'test:default' after /);
      data.should.match(/Scaffolding done/);
    }, done);
  });

  it('should run provided task with arguments in generator', function (done) {
    runSlush(['test:app', 'arg1', 'arg2'], function(code, data) {
      code.should.equal(0);
      data.should.match(/ Starting 'test:app'\.\.\./);
      data.should.match(/\napp \(arg1, arg2\)\n/);
      data.should.match(/ Finished 'test:app' after /);
      data.should.match(/Scaffolding done/);
    }, done);
  });

  it('should fail when a task fails in generator', function (done) {
    runSlush(['test:app', 'fail'], function(code, data) {
      code.should.equal(1);
      data.should.match(/ Starting 'test:app'\.\.\./);
      data.should.match(/\napp \(fail\)\n/);
      data.should.match(/ 'test:app' errored after .* forced error\n/);
      data.should.not.match(/Scaffolding done/);
    }, done);
  });

  it('should fail when running a non-existing task in a generator', function (done) {
    runSlush(['test:noexist'], function(code, data) {
      code.should.equal(1);
      data.should.match(/\[slush\] Task 'noexist' was not defined in `slush-test`/);
      data.should.not.match(/Scaffolding done/);
    }, done);
  });

  it('should fail when running a generator without slushfile', function (done) {
    runSlush(['bad'], function(code, data) {
      code.should.equal(1);
      data.should.match(/\[slush\] No slushfile found/);
      data.should.match(/\[slush\].+issue with.+`slush-bad`/);
    }, done);
  });

  it('should fail trying to run a non-existing generator', function (done) {
    runSlush(['noexist'], function(code, data) {
      code.should.equal(1);
      data.should.match(/\[slush\] No generator by name: "noexist" was found/);
    }, done);
  });
});

function runSlush (args, doAssertions, done) {
  var slush = spawn('node',
    [path.join(__dirname, '..', 'bin', 'slush.js')].concat(args || []),
    {cwd: __dirname});
  var data = '';

  slush.stdout.setEncoding('utf8');

  slush.stdout.on('data', function (chunk) {
    data += chunk;
  });
  slush.stderr.on('data', function (chunk) {
    data += chunk;
  });
  slush.on('close', function (code) {
    try {
      doAssertions(code, data);
      done();
    } catch (e) {
      process.stderr.write(data);
      done(e);
    }
  });
}
