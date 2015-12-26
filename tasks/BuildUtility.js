/**
 * Name: BuildUtility.js
 * Description: Build Swagger JSON and JSEN Rule file from schema
 * Author: Apoorv Agarwal
 * Date: 19 Nov 2015
 */

var fs = require('fs');
var q = require('q');
var _ = require('lodash');

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
    var properties = schema.properties;
    var definitions = grunt.file.readJSON(swaggerSpecs)
      .definitions;

    //console.log(Object.keys(properties).length);
    for (var item in properties) {
      var param = {};
      var prop = properties[item];

      if (prop.type) {
        param.type = prop.type;
      } else {
        var ref = prop.$ref;
        var key = ref.slice(1);

        if (prop.root === true) {
          var refParams = buildParameters(definitions[key]);
          paramArray = paramArray.concat(refParams);
          continue;
        }

        param.schema = {};
        param.schema.$ref = ref;
      }

      param.name = item;
      param.in = prop.in;
      param.description = prop.description;
      if (requiredParam.indexOf(item) > -1) {
        param.required = 'true';
      }

      if (prop.enum) {
        param.enum = prop.enum;
      }

      if (prop.format) {
        param.format = prop.format;
      }
      paramArray.push(param);
    }

    return paramArray;
  };

  var wrapRef = function(obj, keyToChange, finalKey) {

    for (var key in obj) {

      if (!obj[key]) {
        continue;
      }

      if (key === finalKey && obj[key][keyToChange]) {
        var tempKey = obj[key][keyToChange];
        if (tempKey.indexOf('/') < 0) {
          tempKey = tempKey.slice(0, 1) + '/definitions/' + tempKey.slice(1);
        }
        obj[key][keyToChange] = tempKey;
        continue;
      }

      if (obj[key].constructor === Object) {
        obj[key] = wrapRef(obj[key], keyToChange, finalKey);
      }

      if (obj[key].constructor === Array) {
        for (var i = 0; i < obj[key].length; ++i) {
          obj[key][i] = wrapRef(obj[key][i], keyToChange, finalKey);
        }
      }

      if (key === keyToChange) {
        var def = '/definitions/';
        var temp = obj[key].slice(0, 1) + def + obj[key].slice(1);
        obj[finalKey] = {};
        obj[finalKey][key] = temp;
        delete obj[key];
      }
    }

    return obj;
  };

  var buildJSON = function(fileContents) {
    var returnPromise = q.defer();
    var route = {};
    var method = {};
    var description = fileContents.description;
    var produces = fileContents.produces;
    var swaggerSpecsContents = grunt.file.readJSON(swaggerSpecs);
    var definitions = swaggerSpecsContents.definitions;

    if (fileContents.schema.$ref && fileContents.schema.root === true) {
      var ref = fileContents.schema.$ref;
      var key = ref.slice(1);
      fileContents.schema = definitions[key];
    }

    fileContents.parameters = buildParameters(fileContents.schema);

    fileContents.parameters = wrapRef(fileContents.parameters, '$ref', 'schema');

    var parameters = fileContents.parameters;
    var responses = fileContents.responses;
    var fileRoute = fileContents.route;
    var fileMethod = fileContents.method;
    var authenticated = fileContents.authenticated;
    var code = {};
    var tags = fileContents.tags;

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

    var finalDefinitions = wrapRef(definitions, '$ref', 'schema');

    swaggerContent.definitions = finalDefinitions;
    swaggerContent.paths[fileRoute][fileMethod].responses = buildResponses(fileContents.responses);

    delete swaggerContent.headers;
    delete swaggerContent.defaultResponse;

    grunt.file.write(swaggerOutput, JSON.stringify(swaggerContent, null, 2));
    returnPromise.resolve();
    return returnPromise.promise;
  };

  var buildSchema = function(finalSchema) {
    var schema = _.cloneDeep(finalSchema);
    var definitions = grunt.file.readJSON(swaggerSpecs)
      .definitions;

    if (schema.$ref) {
      if (schema.root === true) {
        var ref = schema.$ref;
        var key = ref.slice(1);
        schema = definitions[key];
      }
      delete schema.root;
    } else {
      var properties = schema.properties;
      var required = schema.required;

      for (var prop in properties) {
        var value = properties[prop];
        if (value.$ref && value.root === true) {
          var ref = value.$ref;
          var key = ref.slice(1);
          var def = definitions[key];

          var index = required.indexOf(prop);

          if (index > -1) {
            required.splice(index, 1);
          }

          for (var property in def.properties) {
            schema.properties[property] = def.properties[property];
            if (def.required.indexOf(property) > -1) {
              required.push(property);
            }
          }
          delete properties[prop];
        }
      }
    }
    return schema;
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

    var schema = buildSchema(fileContents.schema);

    jsonToConvert[controller][action] = schema;
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
