/*
 * grunt-sails-builder
 * https://github.com/apoorv2404/grunt-sails-builder
 *
 * Copyright (c) 2015 Apoorv Agrawal
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    release: {
      options: {
        changelog: false,
        add: true,
        commit: true,
        tag: false,
        push: true,
        pushTags: true,
        npm: true,
        npmtag: false,
        commitMessage: '[Grunt-Sails-Builder] Release Commit <%= version %>',
        tagMessage: 'Release Build <%= version %>',
        github: {
          repo: 'apoorv2404/grunt-sails-builder',
          accessTokenVar: 'GITHUB_ACCESS_TOKEN'
        }
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    // Configuration to be run (and then tested).
    sails_builder: {
      build: {
        options: {
          swaggerFileName: 'swagger.json',
          jsenFileName: 'jsenRules.json',
          routesFile: 'routes.js',
          swaggerSpecs: 'swaggerSpecs.json'
        },
        src: 'routeTemplates/src/',
        dest: 'routeTemplates/build/'
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-release');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'sails_builder', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
