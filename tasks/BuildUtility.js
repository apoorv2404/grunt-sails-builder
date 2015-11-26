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
  var swaggerSpecs = options && options.swaggerSpecs ? options.swaggerSpecs : './swaggerSpecs.json';
  var buildParameters = function(schema) {
    var paramArray = [];
    var requiredParam = schema['required'];
    for (var item in schema['properties']) {
      var param = {};
      param.name = item;
      param.in = schema['properties'][item].documentation.in;
      param.description = schema['properties'][item].documentation.description;
      if (requiredParam.indexOf(item) > -1)
        param.required = 'true';
      param.type = schema['properties'][item].type;
      param.format = '[TODO]';
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
    var responses = {};
    var resCode = fileContents.responses.code;
    var code = {};
    var resDesc = fileContents.responses.description;

    code['description'] = resDesc;
    responses[resCode] = code;
    method['description'] = description;
    method['produces'] = produces;
    method['parameters'] = parameters;
    method['responses'] = responses;
    route[fileContents.method] = method;
    fs.stat(swaggerOutput, function(err, res) {
      if (err) {
        var jsonToConvert = {};
        var swaggerContent = require(__dirname + '/../' + swaggerSpecs);
        jsonToConvert[fileContents.route] = route;
        if (!swaggerContent['paths']) {
          swaggerContent['paths'] = {};
        }
        swaggerContent['paths'] = jsonToConvert;

        fs.writeFileSync(swaggerOutput, JSON.stringify(swaggerContent, null, 2));
      } else {
        var content = require(__dirname + '/../' + swaggerOutput);
        content['paths'][fileContents.route] = route;
        fs.writeFileSync(swaggerOutput, JSON.stringify(content, null, 2));
      }
      returnPromise.resolve();
    });
    return returnPromise.promise;
  };

  var buildJSEN = function(fileContents) {
    var returnPromise = q.defer();
    var controller = fileContents.controller;
    var action = fileContents.action;
    fs.stat(jsenOutput, function(err, res) {
      if (err) {
        var jsonToConvert = {};
        jsonToConvert[controller] = {};
        jsonToConvert[controller][action] = fileContents.schema;
        fs.writeFileSync(jsenOutput, JSON.stringify(jsonToConvert, null, 2));
      } else {
        var content = require(__dirname + '/../' + jsenOutput);
        if (!content[controller]) {
          content[controller] = {};
        }
        content[controller][action] = fileContents.schema;
        fs.writeFileSync(jsenOutput, JSON.stringify(content, null, 2));
      }
      returnPromise.resolve();
    });
    return returnPromise.promise;
  };

  var _build = function(fileContents) {
    var returnPromise = q.defer();
    buildJSEN(fileContents)
      .then(function() {
        console.log('Built JSEN');
        return buildJSON(fileContents);
      })
      .then(function() {
        console.log('Build JSON');
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
