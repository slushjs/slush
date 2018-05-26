'use strict';

var gulp = require('gulp');
var log = require('gulp-util').log;

var jshint = require('gulp-jshint');

var codeFiles = ['**/*.js', '!node_modules/**'];

function taskSpec(tasks) {
  return gulp.parallel ? gulp.parallel(tasks) : tasks;
}

gulp.task('lint', function() {
  log('Linting Files');
  return gulp.src(codeFiles)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter());
});

gulp.task('watch', function() {
  log('Watching Files');
  gulp.watch(codeFiles, taskSpec(['lint']));
});

gulp.task('default', taskSpec(['lint', 'watch']));
