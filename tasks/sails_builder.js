/*
 * grunt-sails-builder
 * https://github.com/apoorvagrawal/grunt-sails-builder
 *
 * Copyright (c) 2015 Apoorv Agrawal
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('sails_builder', 'Grunt tool for generating routes, validation and swagger from one file', function() {
    console.log('Here: ', this.target, this.data);

    // // Merge task-specific and/or target-specific options with these defaults.
    // var options = this.options();
    //
    // this.files.forEach(function(f) {
    //   // Concat specified files.
    //   var src = f.src.filter(function(filepath) {
    //     // Warn on and remove invalid source files (if nonull was set).
    //     if (!grunt.file.exists(filepath)) {
    //       grunt.log.warn('Source file "' + filepath + '" not found.');
    //       return false;
    //     } else {
    //       return true;
    //     }
    //   }).map(function(filepath) {
    //     // Read file source.
    //     return grunt.file.read(filepath);
    //   }).join(grunt.util.normalizelf(options.separator));
    //
    //   // Handle options.
    //   src += options.punctuation;
    //
    //   // Write the destination file.
    //   grunt.file.write(f.dest, src);
    //
    //   // Print a success message.
    //   grunt.log.writeln('File "' + f.dest + '" created.');
    // });
  });

};
