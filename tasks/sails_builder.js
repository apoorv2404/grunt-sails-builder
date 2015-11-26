/*
 * grunt-sails-builder
 * https://github.com/apoorvagrawal/grunt-sails-builder
 *
 * Copyright (c) 2015 Apoorv Agrawal
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs');
var glob = require('glob');
var async = require('async');
var q = require('q');
var BuildUtility = require('./BuildUtility');

module.exports = function(grunt) {

  grunt.registerMultiTask('sails_builder',
    'Grunt tool for generating routes, validation and swagger from one file',
    function() {

      var done = this.async();
      var gruntOptions = this.data.options;

      //console.log('options: ', gruntOptions);

      var swaggerFileName = gruntOptions && gruntOptions.swaggerFileName ? gruntOptions.swaggerFileName :
        'swagger.json';

      var jsenFileName = gruntOptions && gruntOptions.jsenFileName ? gruntOptions.jsenFileName :
        'jsenRules.json';

      var swaggerSpecFile = gruntOptions && gruntOptions.swaggerSpecs ? gruntOptions.swaggerSpecs :
        'swaggerSpecs.json';

      if (grunt.file.exists(swaggerFileName)) {
        grunt.file.delete(swaggerFileName);
      }
      if (grunt.file.exists(jsenFileName)) {
        grunt.file.delete(jsenFileName);
      }

      var sourceRoutes = this.data.src[0];
      var destRoutes = this.data.dest[0];
      var files = glob.sync(sourceRoutes);
      var options = {
        swaggerOutput: destRoutes + swaggerFileName,
        jsenOutput: destRoutes + jsenFileName,
        swaggerSpecs: swaggerSpecFile
      };
      var buildUtil = BuildUtility(options);

      var fileWorker = function(task, callback) {
        buildUtil.build(task)
          .then(function() {
            console.log('response');
            callback();
          })
          .catch(function(err) {
            console.log('Error : ', err);
            callback(err);
          });
      };

      var fileQueue = async.queue(fileWorker, 1);

      for (var i = 0; i < files.length; i++) {
        var fileContents = JSON.parse(grunt.file.read(files[i]));

        fileQueue.push(fileContents, function(err) {
          if (err) {
            fileQueue.kill();
            done(err);
          }
        });
      }
      fileQueue.drain = function() {
        done();
      };
    });
};
