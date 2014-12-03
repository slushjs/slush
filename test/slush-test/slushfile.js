'use strict';

var gulp = require('gulp');

gulp.task('app', function() {
  console.log('app' + (this.args.length ? ' (' + this.args.join(', ') + ')' : ''));
});

gulp.task('default', function() {
  console.log('default');
});
