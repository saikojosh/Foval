/*
 * FOVAL.
 * Wonderfully easy form validation for Node.js.
 */

var crypto       = require('crypto');
var async        = require('async');
var Countersign  = require('countersign');
var escapeRegExp = require('escape-regexp');
var extender     = require('object-extender');
var parseBool    = require('parse-bool');
var ErrorNinja   = require('error-ninja').define({
  'duplicate-field':                      'You have tried to define more than one field with the same name.',
  'invalid-data-type':                    'The field type you entered is not valid!',
  'invalid-transform':                    'The transform you have specified is invalid.',
  'invalid-validation':                   'The validation you have specified is invalid.',
  'transform-wrong-data-type':            'The data type of the field is incorrect for this transform.',
  'validation-wrong-data-type':           'The data type of the field is incorrect for this validation.',
  'custom-transform-no-function':         'A function has not be provided to the custom transform.',
  'str-case-invalid-case':                'The string case you provided is invalid.',
  'str-replace-transform-invalid-regexp': 'The regular expression you provided is invalid.',
  'custom-validation-no-function':        'A function has not be provided to the custom validation.',
  'in-list-validation-invalid-list':      'The list you provided is invalid.',
  'match-field-validation-invalid-field': 'The match field you provided is invalid.',
  'regexp-validation-invalid-regexp':     'The regular expression you provided is invalid.'
});

/*
 * Private Variables.
 */
var validDataTypes = {
  'string':    'string',
  'str':       'string',
  'number':    'int',
  'int':       'int',
  'float':     'float',
  'email':     'email',
  'telephone': 'telephone',
  'tel':       'telephone',
  'url':       'url',
  'boolean':   'boolean',
  'bool':      'boolean',
  'checkbox':  'checkbox',
  'password':  'password'
};

/*
 * Constructor.
 */
function Foval (data, options) {

  options = extender.defaults({
    id:                  null,   //an ID to identify this Foval instance by.
    stopOnInvalid:       true,   //set false to run all validations even if one fails.
    checkboxTrueValue:   'ON',   //alter the string value that counts are true, does not affect values given as bools.
    urlsRequireProtocol: true    //set false to validate all URL fields even if they don't contain protocols.
  }, options);

  // Store the options.
  this.id                     = options.id;
  this.stopOnInvalid          = options.stopOnInvalid;
  this.checkboxTrueValue      = options.checkboxTrueValue;
  this.urlsRequireProtocol    = options.urlsRequireProtocol;

  // Placeholder values.
  this.rawData                = data;
  this.definitions            = {};
  this.additionalValidationFn = null;

};

/*
 * Returns the ID of the Foval instance.
 */
Foval.prototype.identify = function () {
  return this.id;
};

/*
 * Define multiple fields.
 */
Foval.prototype.defineFields = function (arr) {

  // Define each of the fields in the array.
  for (var i = 0, ilen = arr.length ; i < ilen ; i++) {
    this.defineField(arr[i]);
  }

  // Enable chaining.
  return this;

};

/*
 * Define a single field.
 */
Foval.prototype.defineField = function (input) {

  // Have we already defined this field?
  if (this.definitions[input.fieldName]) {
    throw new ErrorNinja('duplicate-field', { fieldName: input.fieldName });
  }

  // Is the data type valid?
  var normalisedDataType = validDataTypes[input.dataType];
  if (normalisedDataType) {
    input.dataType = normalisedDataType;
  } else {
    throw new ErrorNinja('invalid-data-type', {
      dataType:   input.dataType,
      validTypes: Object.keys(validDataTypes)
    });
  }

  // Do we need to typecast the value?
  var rawValue = this.rawData[input.fieldName];
  if (input.typecasting !== false) {
    switch (normalisedDataType) {
      case 'string':
      case 'email':
      case 'telephone':
                      rawValue = String(rawValue);       break;
      case 'int':     rawValue = parseInt(rawValue, 10); break;
      case 'float':   rawValue = parseFloat(rawValue);   break;
      case 'boolean': rawValue = parseBool(rawValue);    break;
      case 'checkbox':     break; ///?????
    }
  }

  // Ensure we have these objects so we can add the automatic transforms/validations if necessary.
  if (!input.validations)       { input.validations       = {}; }
  if (!input.transforms)        { input.transforms        = {}; }
  if (!input.transforms.before) { input.transforms.before = {}; }
  if (!input.transforms.after)  { input.transforms.after  = {}; }

  // Ensure all the transforms are valid.
  for (var b in input.transforms.before) {
    if (!input.transforms.before.hasOwnProperty(b)) { continue; }
    if (typeof this.transforms[b] !== 'function') {
      throw new ErrorNinja('invalid-transform', { transform: b });
    }
  }
  for (var a in input.transforms.after) {
    if (!input.transforms.after.hasOwnProperty(a)) { continue; }
    if (typeof this.transforms[a] !== 'function') {
      throw new ErrorNinja('invalid-transform', { transform: a });
    }
  }

  // Ensure all the validations are valid.
  for (var v in input.validations) {
    if (!input.validations.hasOwnProperty(v)) { continue; }
    if (typeof this.validations[v] !== 'function') {
      throw new ErrorNinja('invalid-validation', { validation: v });
    }
  }

  // Automatic transforms based on properties.
  if (input.modify   && !input.transforms.before['custom'])   { input.transforms.before['custom']   = input.modify; }
  if (input.trim     && !input.transforms.before['str-trim']) { input.transforms.before['str-trim'] = true;         }

  // Automatic validations based on properties.
  if (input.required && !input.validations['required'])       { input.validations['required']       = true;         }

  // Automatic transforms and validations based on data type.
  switch (input.dataType) {

    case 'email':
      if (!input.validations['email'])          { input.validations['email']          = true; }
      if (!input.transforms.before['str-trim']) { input.transforms.before['str-trim'] = true; }
      break;

    case 'telephone':
      if (!input.validations['telephone'])      { input.validations['telephone']      = true; }
      if (!input.transforms.before['str-trim']) { input.transforms.before['str-trim'] = true; }
      break;

    case 'url':
      if (!input.validations['url'])            { input.validations['url']            = true; }
      if (!input.transforms.before['str-trim']) { input.transforms.before['str-trim'] = true; }
      break;

  }

  // Save the definition.
  this.definitions[input.fieldName] = extender.merge({
    // Overwritable properties.
    fieldName:    null,
    dataType:     null,
    defaultValue: null,
    required:     null,
    trim:         null,
    modify:       null,
    transforms:  {
      before: {},
      after:  {}
    },
    validations: {}
  }, input, {
    // Uneditable properties.
    rawValue: rawValue,
    value:    null,
    isValid:  null   //null = not checked.
  });

  // Enable changing.
  return this;

};

/*
 * Add a single function to perform some extra validation on the field data, for
 * example querying the database.
 * fn(this, fieldHash, finish);
 * finish(err, isValid, reason);
 */
Foval.prototype.additionalValidation = function (fn) {

  // Store the function.
  if (typeof fn === 'function') { this.additionalValidationFn = fn; }

  // Enable changing.
  return this;

};

/*
 * Perform the form validation and call the callback with the result.
 * callback(err, success, validationResults, fieldHash);
 */
Foval.prototype.validate = function (callback) {

  var form          = this;
  var stopOnInvalid = this.stopOnInvalid;

  async.waterfall([

    // First, check each of the fields in turn.
    function validateFields (next) {

      var validationResults = {};
      var isFormValid       = true;

      // Cycle form fields.
      async.each(form.definitions, function (definition, nextField) {

        // Do we need to transform the data before we validate it?
        form.runTransforms(definition, 'before', function (err, transformedValue) {

          if (err) { return nextField(err); }

          // Store the new value.
          definition.value = transformedValue;

          // Validate the value.
          form.runValidations(definition, function (err, isFieldValid, result) {

            if (err) { return nextField(err); }

            // Store the validation result.
            validationResults[definition.fieldName] = result;
            if (!isFieldValid) { isFormValid = false; }

            // By default, we stop when we encounter the first invalid value.
            if (!isFieldValid && stopOnInvalid) { return nextField('stop'); }

            // Do we need to transform the data after we've validated it?
            form.runTransforms(definition, 'after', function (err, transformedValue) {

              if (err) { return nextField(err); }

              // Store the new value & continue.
              definition.value = transformedValue;
              return nextField(null);

            });

          });

        });

      }, function (err) {

        // The field is invalid.
        if (err && err === 'stop') { return next('stop', isFormValid, validationResults); }

        // Other error.
        else if (err) { return next(err); }

        // Success!
        return next(null, isFormValid, validationResults);

      });

    },

    // Second, perform the additional validation, if any.
    function performAdditionalValidation (next, isFormValid, validationResults) {

      // Collect up the field values.
      var fieldHash            = form.generateFieldHash();
      var additionalValidation = form.additionalValidationFn;

      // No extra validation to perform.
      if (typeof additionalValidation !== 'function') {
        return next(null, isFormValid, validationResults, fieldHash);
      }

      // Do the extra validation.
      additionalValidation(this, fieldHash, function (err, isAdditionalValid, reason) {

        if (err) { return next(err); }

        // Include the additional result with the validation results.
        validationResults['additionalValidation'] = {
          isValid: isAdditionalValid,
          reason:  reason || null
        };

        // Save & continue;
        if (!isAdditionalValid) { isFormValid = false; }
        return next(null, isFormValid, validationResults, fieldHash);

      });

    }

  ], function (err, isFormValid, validationResults, fieldHash) {

    // A field is invalid.
    if (err && err === 'stop') { return callback(null, false, validationResults, fieldHash); }

    // Other error.
    else if (err) { return callback(err); }

    // Success!
    return callback(null, isFormValid, validationResults, fieldHash);

  });

};

/*
 * Runs all the transformations on the given field and passes the new value back.
 * callback(err, value);
 */
Foval.prototype.runTransforms = function (definition, type, callback) {

  var form       = this;
  var transforms = definition.transforms[type];
  var arrKeys    = Object.keys(transforms);
  var value      = definition.value;
  var dataType   = definition.dataType;

  // Cycle each transform.
  async.eachSeries(arrKeys, function (key, next) {

    var options = transforms[key];

    // Skip the transform if we have a falsey value.
    if (!options) { return next(null); }
    if (typeof options === 'object' && options.run === false) { return next(null); }

    // Do the transform.
    form.transforms[key](value, dataType, options, function (err, transformedValue) {

      if (err) { return next(err); }

      // Save & continue.
      value = transformedValue;
      return next(null);

    });

  }, function (err) {
    if (err) { return callback(err); }
    return callback(null, value);
  });

};

/*
 * Runs all the validations on the given field and passes the result back.
 * callback(err, isFieldValid, result);
 */
Foval.prototype.runValidations = function (definition, callback) {

  var form          = this;
  var validations   = definition.validations;
  var arrKeys       = Object.keys(validations);
  var isFieldValid  = true;
  var stopOnInvalid = this.stopOnInvalid;
  var result        = {};

  // Cycle each validation.
  async.eachSeries(arrKeys, function (key, next) {

    var options = validations[key];

    // Skip the validation if we have a falsey value.
    if (!options) { return next(null); }
    if (typeof options === 'object' && options.run === false) { return next(null); }

    // Do the validation.
    form.validations[key](form, definition, options, function (err, isValid, reason) {

      if (err) { return next(err); }

      // Store the result of the validation.
      if (!isValid) { isFieldValid = false; }
      result[key] = {
        isValid: isValid,
        reason:  reason || null
      };

      // By default, we stop when we encounter the first invalid value.
      if (!isValid && stopOnInvalid) { return next('stop'); }

      // Continue.
      return next(null);

    });

  }, function (err) {

    // The field is invalid.
    if (err && err === 'stop') { return callback(null, false, result); }

    // Other error.
    else if (err) { return callback(err); }

    // Success!
    return callback(null, isFieldValid, result);

  });

};

/*
 * Returns a hash of the fields and their values.
 */
Foval.prototype.generateFieldHash = function () {

  var hash = {};

  // Add each field and value to the hash.
  for (var i = 0, ilen = this.definitions.length ; i < ilen ; i++) {
    var definition = this.definitions[i];
    hash[definition.fieldName] = definition.value;
  }

  return hash;

};

/*
 * Returns an ErrorNinja if the given data type is not allowed, otherwise null.
 */
Foval.prototype.checkDataType = function (where, allowedDataTypes, dataType) {

  // Invalid data type.
  if (allowedDataTypes.indexOf(dataType) === -1) {
    return new ErrorNinja(where + '-wrong-data-type', {
      dataType: dataType,
      allowed:  allowedDataTypes
    });
  }

  // Valid data type.
  return true;

};

/*
 * Contains various transformer functions.
 * transform(value, dataType, options, callback);
 * callback(err, transformedValue);
 */
Foval.prototype.transforms = {

  /*
   * Perform a custom transform using the function passed in.
   * custom(value, finish);
   * finish(err, transformedValue);
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   *  fn  (function)  The custom transform function.
   * [reason]
   *  The custom function can pass back its own reason string.
   */
  'custom': function (value, dataType, options, callback) {

    // Ensure options is always a hash and not a single value.
    if (typeof options !== 'object' || options.constructor.name !== 'Object') {
      options = {
        fn: options
      };
    }

    // Default options.
    options = extender.defaults({
      fn: null
    }, options);

    // Ensure we have a function!
    if (typeof options.fn !== 'function') {
      throw new ErrorNinja('custom-transform-no-function');
    }

    // Run the custom transform function.
    options.fn(value, dataType, function (err, transformedValue) {
      if (err) { return callback(err); }
      return callback(null, transformedValue);
    });

  },

  /*
   * Creates an MD5 hash of the value. Non-string values will be typecast to
   * strings first and this may have unexpected behaviour.
   * [options]
   *  run      (bool>true)  Set false to prevent it from running.
   *  encoding (string)     The encoding type. See Node's crypto documentation.
   *  seed     (mixed)      Any value to use as a seed, optional.
   *  random   (bool>false) Set true to add a random value to seed the hash with.
   */
  'md5': function (value, dataType, options, callback) {

    // Ensure options is always a hash and not a single value.
    if (typeof options !== 'object' || options.constructor.name !== 'Object') {
      options = {
        'encoding': options
      };
    }

    // Default options.
    options = extender.defaults({
      encoding: 'hex',
      seed:     null,
      random:   false
    }, options);

    // Prepare the value.
    value = String(value);
    if (options.seed)   { value += options.seed;               }
    if (options.random) { value += Math.random() + Date.now(); }

    // Create the algorithm.
    var algo = crypto.createHash('md5');
    algo.update(value);

    // Create hash in the given encoding.
    value = algo.digest(options.encoding);

    // Continue.
    return callback(null, value);

  },

  /*
   * Converts <br> tags to line breaks.
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   */
  'str-br-to-line-break': function (value, dataType, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('transform', ['string'], dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Do the transform.
    value = value.replace(/<br>/gi, '\n');

    // Continue.
    return callback(null, value);

  },

  /*
   * Change the case of a string.
   * [options]
   *  run  (bool>true) Set false to prevent it from running.
   *  case (string)    The new string case to apply.
   */
  'str-case': function (value, dataType, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('transform', ['string'], dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Ensure options is always a hash and not a single value.
    if (typeof options !== 'object' || options.constructor.name !== 'Object') {
      options = {
        'case': options
      };
    }

    // Default options.
    options = extender.defaults({
      'case': null
    }, options);

    // Do the transform.
    switch (options.case) {
      case 'lower': value = value.toLowerCase(); break;
      case 'upper': value = value.toUpperCase(); break;
      case 'capitalise':
      case 'capitalize':
        value = value.toLowerCase().replace(/(?:^|\s)\S/g, function(a) {
          return a.toUpperCase();
        });
        break;

      // No valid case provided.
      default:
        throw new ErrorNinja('str-case-invalid-case', {
          'case': options.case
        });
    }

    // Continue.
    return callback(null, value);

  },

  /*
   * Collapse multiple spaces or tabs into single spaces.
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   */
  'str-collapse-whitespace': function (value, dataType, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('transform', ['string'], dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Do the transform.
    value = value.replace(/\s+/gi, ' ');

    // Continue.
    return callback(null, value);

  },

  /*
   * Converts line breaks to <br> tags.
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   */
  'str-line-break-to-br': function (value, dataType, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('transform', ['string'], dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Do the transform.
    value = value.replace(/\n/gi, '<br>');

    // Continue.
    return callback(null, value);

  },

  /*
   * Replaces a regular expression in a string.
   * [options]
   *  run     (bool>true)     Set false to prevent it from running.
   *  find    (regexp|string) The regular expression or a literal string to find.
   *  flags   (string)        If a string was passed in we can also specify the flags for the regexp.
   *  replace (string)        The value we should replace with.
   */
  'str-replace': function (value, dataType, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('transform', ['string', 'email', 'telephone', 'url'], dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Default options.
    options = extender.defaults({
      find:    null,
      flags:   null,
      replace: null
    }, options);

    // Prepare the regular expression.
    var regexp;
    if (typeof options.find === 'string') {
      regexp = new RegExp(escapeRegExp(options.find), options.flags || '');
    } else {
      regexp = options.find;
    }

    // No RegExp provided.
    if (Object.prototype.toString.call(regexp) !== '[object RegExp]') {
      throw new ErrorNinja('str-replace-transform-invalid-regexp', {
        test:  options.test,
        flags: options.flags
      });
    }

    // Do the transform.
    value = value.replace(regexp, options.replace);

    // Continue.
    return callback(null, value);

  },

  /*
   * Trims whitespace from the beginning and end of a string.
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   */
  'str-trim': function (value, dataType, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('transform', ['string', 'email', 'telephone', 'url'], dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Do the transform.
    value = value.trim();

    // Continue.
    return callback(null, value);

  }

};

/*
 * Contains various data validator functions.
 * validate(form, definition, options, callback);
 * callback(err, isValid, reason);
 */
Foval.prototype.validators = {

  /*
   * Perform a custom validation using the function passed in.
   * custom(value, dataType, finish);
   * finish(err, isValid, reason);
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   *  fn  (function)  The custom validation function.
   * [reason]
   *  The custom function can pass back its own reason string.
   */
  'custom': function (form, definition, options, callback) {

    // Ensure options is always a hash and not a single value.
    if (typeof options !== 'object' || options.constructor.name !== 'Object') {
      options = {
        fn: options
      };
    }

    // Default options.
    options = extender.defaults({
      fn: null
    }, options);

    // Ensure we have a function!
    if (typeof options.fn !== 'function') {
      throw new ErrorNinja('custom-validation-no-function');
    }

    // Run the custom validation function.
    options.fn(definition.value, definition.dataType, function (err, isValid, reason) {
      if (err) { return callback(err); }
      return callback(null, isValid, reason);
    });

  },

  /*
   * A string field must represent an email address.
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   * [reasons]
   *  'invalid' The value isn't an email address.
   */
  'email': function (form, definition, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('validation', ['email'], definition.dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    var regexp = /^(([\w\d!#$%&'*+-\/=?^_`{|}~.]+)@((?:[\w\d\-]+)(?:\.[\w\d\-]+)+))$/i;

    // Not a valid email address (as best we can tell!)
    if (!definition.value.match(regexp)) {
      return callback(null, false, 'invalid');
    }

    // Success!
    return callback(null, true);

  },

  /*
   * The field value must be one of the ones in the given list.
   * [options]
   *  run  (bool>true) Set false to prevent it from running.
   *  list (arr)       An array of the values.
   * [reasons]
   *  'not-in-list' The value isn't in the allowed list.
   */
  'in-list': function (form, definition, options, callback) {

    // Ensure options is always a hash and not a single value.
    if (typeof options !== 'object' || options.constructor.name !== 'Object') {
      options = {
        list: options
      };
    }

    // Default options.
    options = extender.defaults({
      list: null
    }, options);

    // No list provided.
    if (Object.prototype.toString.call(options.list) !== '[object Array]') {
      throw new ErrorNinja('in-list-validation-invalid-list', {
        list: list
      });
    }

    // Not in the list.
    if (options.list.indexOf(definition.value) === -1) {
      return callback(null, false, 'not-in-list');
    }

    // Success!
    return callback(null, true);

  },

  /*
   * A string field must be a certain length.
   * [options]
   *  run        (bool>true)  Set false to prevent it from running.
   *  matchField (string)     The name of the other field we must match.
   *  strict     (bool>false) Set true to do a string test (including typeof and dataType).
   * [reasons]
   *  'no-match'    The fields don't match at all.
   *  'loose-match' The fields match loosely, but don't satisfy the 'strict' option.
   */
  'match-field': function (form, definition, options, callback) {

    // Ensure options is always a hash and not a single value.
    if (typeof options !== 'object' || options.constructor.name !== 'Object') {
      options = {
        matchField: options
      };
    }

    // Default options.
    options = extender.defaults({
      matchField: null,
      strict:     false
    }, options);

    // Get the match field.
    var otherDefinition = form.getField(options.matchField);
    if (!otherDefinition) {
      throw new ErrorNinja('match-field-validation-invalid-field', {
        matchField: options.matchField
      });
    }

    var value1          = definition.value;
    var value2          = otherDefinition.value;
    var dataType1       = definition.dataType;
    var dataType2       = otherDefinition.dataType;
    var strictMatch     = true;
    var looseMatch      = true;

    // Do the matching.
    if (value1 != value2) { looseMatch = false; strictMatch = false; }  //must be a loose equality operator.
    else if (value1 !== value2 || dataType1 !== dataType2) { strictMatch = false; }

    // Fields don't match at all.
    if (!strictMatch && !looseMatch) {
      return callback(null, false, 'no-match');
    }

    // Fields loosely match but they don't satisfy the 'strict' option.
    else if (!strictMatch && looseMatch && options.strict) {
      return callback(null, false, 'loose-match');
    }

    // Success!
    return callback(null, true);

  },

  /*
   * Various tests on a numeric field.
   * [options]
   *  run       (bool>true) Set false to prevent it from running.
   *  min       (float)     The minimum number allowed.
   *  max       (float)     The maximum number allowed.
   *  allowZero (bool>true) Set false to disallow zero.
   * [reasons]
   *  'too-small'         The number is too small.
   *  'too-large'         The number is too large.
   *  'zero-not-allowed'  A zero value is not allowed.
   */
  'numeric': function (form, definition, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('validation', ['int', 'float'], definition.dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Ensure options is always a hash and not a single value.
    options = extender.defaults({
      min:       null,
      max:       null,
      allowZero: true
    }, options);

    // The number is too small.
    if (typeof options.min === 'number' && definition.value < options.min) {
      return callback(null, false, 'too-small');
    }

    // The number is too large.
    if (typeof options.max === 'number' && definition.value > options.max) {
      return callback(null, false, 'too-large');
    }

    // Zero is not allowed!
    if (!options.allowZero && definition.value === 0) {
      return callback(null, false, 'zero-not-allowed');
    }

    // Success!
    return callback(null, true);

  },

  /*
   * Uses the Countersign module to test the strength of the password.
   * [options]
   *  run          (bool>true) Set false to prevent it from running.
   *  requirements (hash)      A list of options to pass to the Countersign module.
   *  minScore     (int)       The minimum score required to pass.
   * [reasons]
   *  'invalid' The regular expression did not match.
   */
  'password': function (form, definition, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('validation', ['password'], definition.dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Ensure options is always a hash and not a single value.
    options = extender.defaults({
      requirements: {
        length:      6,
        lowercase:   true,
        uppercase:   true,
        digits:      false,
        whitespace:  false,
        punctuation: false,
        common:      true
      },
      minScore: 0
    }, options);

    // Test the password.
    var cs = new Countersign(options.requirements);
    cs.test(definition.value, options.minScore, function (err, success, result) {

      if (err) { throw err; }

      // Success!
      return callback(null, false, result);

      // Success!
      return callback(null, true, result);

    });

  },

  /*
   * Tests the field value against a regular expression.
   * [options]
   *  run     (bool>true)     Set false to prevent it from running.
   *  test    (regexp|string) The regular expression or a literal string to test with.
   *  flags   (string)        If a string was passed in we can also specify the flags for the regexp.
   * [reasons]
   *  'no-regexp' A valid regular expression was not provided.
   *  'invalid'   The regular expression did not match.
   */
  'regexp': function (form, definition, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('validation', ['string', 'email', 'telephone', 'url'], definition.dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Ensure options is always a hash and not a single value.
    if (typeof options !== 'object' || options.constructor.name !== 'Object') {
      options = {
        test: options
      };
    }

    // Default options.
    options = extender.defaults({
      test:  null,
      flags: null
    }, options);

    // Prepare the regular expression.
    var regexp;
    if (typeof options.test === 'string') {
      regexp = new RegExp(escapeRegExp(options.test), options.flags || '');
    } else {
      regexp = options.test;
    }

    // No RegExp provided.
    if (Object.prototype.toString.call(regexp) !== '[object RegExp]') {
      throw new ErrorNinja('regexp-validation-invalid-regexp', {
        test:  options.test,
        flags: options.flags
      });
    }

    // Check validity.
    if (!definition.value.match(regexp)) {
      return callback(null, false, 'invalid');
    }

    // Success!
    return callback(null, true);

  },

  /*
   * The field is required.
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   * [reasons]
   *  'required' The field is required but a valid value is not present.
   */
  'required': function (form, definition, options, callback) {

    var isPop = null;
    var value = definition.value;

    // Checks for the given data type.
    switch (definition.dataType) {

      case 'boolean':  isPop = Boolean(value === true || value === false);              break;

      case 'checkbox': isPop = Boolean(value === true);                                 break;

      case 'int':      isPop = Boolean(!isNaN(parseInt(value, 10)) && isFinite(value)); break;

      case 'float':    isPop = Boolean(!isNaN(parseFloat(value)) && isFinite(value));   break;

      default:         isPop = Boolean(value);                                          break;

    }

    // Required field isn't present.
    if (!isPop) { return callback(null, false, 'required'); }

    // Success!
    return callback(null, true);

  },

  /*
   * A string field must be a certain length.
   * [options]
   *  run (bool>true) Set false to prevent it from running.
   *  min (int)       The minimum number of characters allowed.
   *  max (int)       The maximum number of characters allowed.
   * [reasons]
   *  'too-short' The string is too short.
   *  'too-long'  The string is too long.
   */
  'str-length': function (form, definition, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('validation', ['string', 'email'], definition.dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Ensure options is always a hash and not a single value.
    options = extender.defaults({
      min: null,
      max: null
    }, options);

    // String too short.
    if (typeof options.min === 'number' && definition.value.length < options.min) {
      return callback(null, false, 'too-short');
    }

    // String too long.
    if (typeof options.max === 'number' && definition.value.length > options.max) {
      return callback(null, false, 'too-long');
    }

    // Success!
    return callback(null, true);

  },

  /*
   * A string field must represent a telephone number which must contain only
   * digits unless using the international format.
   * [formats]
   *  '+44.7912345678' International format.
   *  '07912345678'    Local format.
   * [options]
   *  run       (bool>true) Set false to prevent it from running.
   *  minDigits (int>1)     The minimum number of digits allowed.
   *  maxDigits (int)       The maximum number of digits allowed.
   * [reasons]
   *  'invalid'   The value isn't a telephone number.
   *  'too-short' There are too few digits.
   *  'too-long'  There are too many digits.
   */
  'telephone': function (form, definition, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('validation', ['telephone'], definition.dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Ensure options is always a hash and not a single value.
    options = extender.defaults({
      minDigits: 1,
      maxDigits: null
    }, options);

    var regexp    = /(?:\+(\d+)\.)?(\d+)/i;
    var match     = definition.value.match(regexp);
    var minDigits = options.minDigits;
    var maxDigits = options.maxDigits;

    // Not a telephone number.
    if (!match) { return callback(null, false, 'invalid'); }

    var isInternational = Boolean(match[1]);
    var numberPart      = match[2];

    // International numbers usually drop the first digit '0'.
    if (isInternational) {
      if (minDigits > 1) { minDigits--; }
      if (maxDigits) { maxDigits--; }
    }

    // Not enough digits.
    if (typeof minDigits === 'number' && numberPart.length < minDigits) {
      return callback(null, false, 'too-short');
    }

    // Too many digits.
    if (typeof maxDigits === 'number' && numberPart.length > maxDigits) {
      return callback(null, false, 'too-long');
    }

    // Success!
    return callback(null, true);

  },

  /*
   * A string must represent a URL, by default the protocol is required but this
   * can be disabled.
   * [options]
   *  run             (bool>true) Set false to prevent it from running.
   *  requireProtocol (bool>true) Set false to allow URLs without any URL.
   * [reasons]
   *  'invalid'           The value isn't a telephone number.
   *  'protocol-required' The protocol is required but isn't present.
   */
  'url': function (form, definition, options, callback) {

    // Check the data type is correct.
    var err = form.checkDataType('validation', ['url'], definition.dataType);
    if (ErrorNinja.isNinja(err)) { throw err; }

    // Ensure options is always a hash and not a single value.
    options = extender.defaults({
      requireProtocol: form.urlsRequireProtocol
    }, options);

    var regexp = /(^|\s|>)((?:(https?):\/\/|(www\.))(?:([\w%]+):([\w%]+)@)?((?:[\w]+\.)?(?:[\w\-_]+){1}(?:\.[a-z]+)+\.*)(?::(\d+))?((?:\/[a-z0-9\-._~:\/?#\[\]%!$&'()*+,;=]+)?[^,\.;:?'"-]\/*))($|\s|<|,|\.|;|:|\?|'|"|-)/gi;
    var match  = definition.value.match(regexp);

    // Not a URL.
    if (!match) { return callback(null, false, 'invalid'); }

    // Protocol required but not present.
    if (options.requireProtocol && !definition.value.match(/^https?:\/\//i)) {
      return callback(null, false, 'protocol-required');
    }

    // Success!
    return callback(null, true);

  }

};

/*
 * Export the class.
 */
module.exports = Foval;