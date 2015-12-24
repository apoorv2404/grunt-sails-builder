/**
 * Name: BuildUtility.js
 * Description: Build Swagger JSON and JSEN Rule file from schema
 * Author: Apoorv Agarwal
 * Date: 19 Nov 2015
 */

var fs = require('fs');
var q = require('q');

var BuildUtility = function(options) {
  var swaggerOutput = options && options.swaggerOutput ? options.swaggerOutput : './swagger.json';
  var jsenOutput = options && options.jsenOutput ? options.jsenOutput : './jsenRules.json';
  var swaggerSpecs = options && options.swaggerSpecs ? options.swaggerSpecs :
    './swaggerSpecs.json';
  var grunt = options.grunt;

  var buildResponses = function(responses) {
    var swaggerContent = grunt.file.readJSON(swaggerSpecs);
    var baseResponse = swaggerContent.defaultResponse;
    var finalResponse = {};
    var count = {
      type: 'integer'
    };

    for (var key in responses) {

      finalResponse[key] = {};

      if (key >= 200 && key <= 206) {
        finalResponse[key].schema = baseResponse.success;
      } else {
        finalResponse[key].schema = baseResponse.error;
      }

      if (responses[key].result) {
        finalResponse[key].schema.properties.result = responses[key].result;
      } else if (responses[key].results) {
        finalResponse[key].schema.properties.count = count;
        finalResponse[key].schema.properties.results = responses[key].results;
      }

      if (responses[key].description) {
        finalResponse[key].description = responses[key].description;
      }
    }

    return finalResponse;
  };

  var buildParameters = function(schema) {
    var paramArray = [];
    var requiredParam = schema.required;
    for (var item in schema.properties) {
      var param = {};
      param.name = item;
      param.in = schema.properties[item].in;
      param.description = schema.properties[item].description;
      if (requiredParam.indexOf(item) > -1) {
        param.required = 'true';
      }

      if (schema.properties[item].type) {
        param.type = schema.properties[item].type;
      } else {
        var ref = schema.properties[item].$ref;
        var definitions = '/definitions/';

        ref = ref.slice(0, 1) + definitions + ref.slice(1);

        param.schema = {};
        param.schema.$ref = ref;
      }

      if (schema.properties[item].format) {
        param.format = schema.properties[item].format;
      }
      paramArray.push(param);
    }
    return paramArray;
  };

  var buildJSON = function(fileContents) {
    var returnPromise = q.defer();
    fileContents.parameters = buildParameters(fileContents.schema);
    var route = {};
    var method = {};
    var description = fileContents.description;
    var produces = fileContents.produces;
    var parameters = fileContents.parameters;
    var responses = fileContents.responses;
    var fileRoute = fileContents.route;
    var fileMethod = fileContents.method;
    var authenticated = fileContents.authenticated;
    var code = {};
    var tags = fileContents.tags;

    var swaggerSpecsContents = grunt.file.readJSON(swaggerSpecs);
    var headers = swaggerSpecsContents.headers;

    var swaggerContent = {};

    method.tags = tags;
    method.description = description;
    method.produces = produces;
    method.parameters = parameters;
    method.responses = responses;
    route[fileMethod] = method;
    if (!grunt.file.exists(swaggerOutput)) {

      var jsonToConvert = {};

      if (grunt.file.exists(swaggerSpecs)) {
        swaggerContent = swaggerSpecsContents;
      } else {
        returnPromise.reject('Could not find swagger specs file');
        return returnPromise.promise;
      }

      jsonToConvert[fileRoute] = route;

      if (!swaggerContent.paths) {
        swaggerContent.paths = {};
      }

      swaggerContent.paths = jsonToConvert;
    } else {
      swaggerContent = grunt.file.readJSON(swaggerOutput);
      swaggerContent.paths[fileRoute] = route;
    }

    if (authenticated === true) {
      var authHeaders = headers.authenticated;
      var params = swaggerContent.paths[fileRoute][fileMethod].parameters;

      for (var i = 0; i < authHeaders.length; i++) {
        params.push(authHeaders[i]);
      }

      swaggerContent.paths[fileRoute][fileMethod].parameters = params;
    }

    swaggerContent.paths[fileRoute][fileMethod].responses = buildResponses(fileContents.responses);

    delete swaggerContent.headers;
    delete swaggerContent.defaultResponse;

    grunt.file.write(swaggerOutput, JSON.stringify(swaggerContent, null, 2));
    returnPromise.resolve();
    return returnPromise.promise;
  };

  var buildJSEN = function(fileContents) {
    var returnPromise = q.defer();
    var controller = fileContents.controller;
    var action = fileContents.action;
    var jsonToConvert = {};

    if (grunt.file.exists(jsenOutput)) {
      jsonToConvert = grunt.file.readJSON(jsenOutput);
    }

    if (!jsonToConvert[controller]) {
      jsonToConvert[controller] = {};
    }

    jsonToConvert[controller][action] = fileContents.schema;
    grunt.file.write(jsenOutput, JSON.stringify(jsonToConvert, null, 2));
    returnPromise.resolve();
    return returnPromise.promise;
  };

  var _build = function(fileContents) {
    var returnPromise = q.defer();
    var fakePromise = q.defer();
    buildJSEN(fileContents)
      .then(function() {
        var buildSwagger = fileContents.swagger === true ||
          fileContents.swagger === undefined;

        if (buildSwagger) {
          return buildJSON(fileContents);
        }

        return fakePromise.resolve();
      })
      .then(function() {
        returnPromise.resolve();
      })
      .catch(function(err) {
        returnPromise.reject(err);
      });
    return returnPromise.promise;
  };

  return {
    build: _build
  };
};

module.exports = BuildUtility;
