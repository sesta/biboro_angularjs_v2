'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');
var env = require('gulp-env');
var fs = require('fs');

var $ = require('gulp-load-plugins')();

var preprocess = require('gulp-preprocess');
var wiredep = require('wiredep').stream;
var _ = require('lodash');

gulp.task('inject', ['scripts','styles'], function () {
  var injectStyles = gulp.src([
    path.join(conf.paths.tmp, '/serve/app/**/*.css'),
    path.join('!' + conf.paths.tmp, '/serve/app/vendor.css')
  ], { read: false });

  var injectScripts = gulp.src([
    path.join(conf.paths.tmp, '/serve/app/**/*.module.js'),
    path.join(conf.paths.tmp, '/serve/app/**/*.js'),
    path.join('!' + conf.paths.src, '/app/**/*.spec.js'),
    path.join('!' + conf.paths.src, '/app/**/*.mock.js')
  ], { read: false });

  var injectOptions = {
    ignorePath: [conf.paths.src, path.join(conf.paths.tmp, '/serve')],
    addRootSlash: false
  };

  if(fs.existsSync('./env.json')){
     env({ file: './env.json'});
  }

  console.log(process.env.STAGGING);
  

  return gulp.src(path.join(conf.paths.src, '/*.html'))
    .pipe($.inject(injectStyles, injectOptions))
    .pipe($.inject(injectScripts, injectOptions))
    .pipe(preprocess({context: {STAGGING: process.env.STAGGING}}))
    .pipe(wiredep(_.extend({}, conf.wiredep)))
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve')));
});
