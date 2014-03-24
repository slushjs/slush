# slush [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image]
> The streaming scaffolding system - Gulp as a replacement for Yeoman

## Use Gulp instead of Yeoman

Slush is a tool to be able to use Gulp for project scaffolding.

Slush does not contain anything "out of the box", except the ability to locate installed slush generators
and to run them with [`liftoff`](https://www.npmjs.org/package/liftoff).

To be able to provide functionality like Yeoman, see: [Yeoman like behavior](#yeoman-like-behavior) below.

## Install

Install `slush` globally with:

```bash
npm install -g slush
```

## Usage

```bash
slush <generator>[ <tasks>]
```

**Note** if `<tasks>` is not provided it will default to the `default` task in the generator's slushfile.

### List available generators

```bash
slush
```

### List available tasks in generator

```bash
slush <generator> --tasks
```

## Creating a generator

A Slush generator is an npm package following the naming convention `slush-*` and containing a `slushfile.js`.

Add `slushgenerator` as a keyword in your `package.json`.

As when building gulp plugins all slush generators need to have `gulp` installed as a local dependency.

All `slush-*` packages should be installed globally (for now) to be found by the slush executable.

**Note** remember to add gulp plugins (and gulp itself) as ordinary dependencies, instead of devDependencies, when building a slush generator.


## Documentation

### Things to remember

* Install `slush` globally
* Install slush generators globally
* When creating slush generators:
   - name them `slush-<name>`
   - add `slushgenerator` as package keyword
   - create a slushfile.js
   - Install `gulp` and used gulp plugins for your generator as ordinary dependencies

### Slush uses gulp

Slush is just the global excutable to trigger slush generators, under the hood it's still gulp that is run using each slushfile as config file.

Needing help writing slush generators? Check out [Gulp's documentation](https://github.com/gulpjs/gulp/blob/master/docs/README.md)!

### The slushfile

A slushfile is basically a gulpfile, but meant to be used to scaffold project structures.

#### Why not name it "gulpfile" then?

Because a Slush generator may want to use gulp locally for linting, testing and other purposes, in which case it will need to have a gulpfile.

#### Sample slushfile

Given a slush generator project structure with a web app project template inside `./templates/app/`, a slushfile could be designed like this:

```javascript
var gulp = require('gulp'),
    install = require('gulp-install'),
    conflict = require('gulp-conflict'),
    template = require('gulp-template'),
    inquirer = require('inquirer');

gulp.task('default', function (done) {
  inquirer.prompt([
    {type: 'confirm', name: 'app', message: 'Create a new app?'},
    {type: 'confirm', name: 'another', message: 'Something else?'}
  ],
  function (answers) {
    if (!answers.app) {
      return done();
    }
    gulp.src(__dirname + '/templates/app/**')  // Note use of __dirname to be relative to generator
      .pipe(template(answers))                 // Lodash template support
      .pipe(conflict('./'))                    // Confirms overwrites on file conflicts
      .pipe(gulp.dest('./'))                   // Without __dirname here = relative to cwd
      .pipe(install())                         // Run `bower install` and/or `npm install` if necessary
      .on('end', function () {
        done();                                // Finished!
      });
  });
});
```

## Yeoman like behavior

Use these packages/plugins:

- [inquirer](https://github.com/SBoudrias/Inquirer.js) - To prompt the user for input
- [gulp-install](https://github.com/klei/gulp-install) - To install npm and bower packages after scaffolding
- [gulp-conflict](https://github.com/klei/gulp-conflict) - To prompt before overwriting files on regeneration

## Want to contribute?

Anyone can help make this project better!


[npm-url]: https://npmjs.org/package/slush
[npm-image]: https://badge.fury.io/js/slush.png
[travis-url]: https://travis-ci.org/klei/slush
[travis-image]: https://travis-ci.org/klei/slush.png?branch=master
[depstat-url]: https://david-dm.org/klei/slush
[depstat-image]: https://david-dm.org/klei/slush.png
[daviddm-url]: https://david-dm.org/klei/slush.png?theme=shields.io
[daviddm-image]: https://david-dm.org/klei/slush
