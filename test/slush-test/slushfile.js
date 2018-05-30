'use strict';
var gulp = require('gulp');

gulp.task('default', function (done) {
  console.log('default');
  done();
});

gulp.task('app', function (done) {
  console.log('app' + (this.args.length ? ' (' + this.args.join(', ') + ')' : ''));
  done(this.args[0] === 'fail' ? new Error('forced error') : undefined);
});
