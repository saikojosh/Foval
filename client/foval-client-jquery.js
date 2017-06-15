/*
 * FOVAL CLIENT (for jQuery)
 * Captures form submissions and submits them via AJAX. Formats field values in
 * a way Foval will understand them.
 */

var FovalClient = {

  /*
   * Global properties.
   */
  prop: {
    version:        '0.0.20',
    forms:          {},
    defaultTimeout: 10000   //10 seconds
  },

  /*
   * Prepares the given form.
   * [options]
   *  action          (string)  The form action URL (by default uses the form tag 'action' attribute).
   *  method          (string)  The form method, either POST or GET (by default uses the form tag 'method' attribute).
   *  timeout         (int)     The number of milliseconds to wait for a form submission to complete.
   *  manageErrors    (bool)    False to prevent FovalClient from managing the errors in the user interface.
   *  hashFields      (arr)     An array of fields with multiple inputs/selections that need to be hashed together.
   *  onBeforeSubmit  (func)    A handler to run code before the form is submitted.
   *  onSuccess       (func)    A handler to run if the form submitted without any errors.
   *  onFailure       (func)    A handler to run if the form contains errors.
   *  onAjaxError     (func)    A callback to handle ajax errors.
   *  onComplete      (func)    A handler to run after the form has submitted, regardless of whether there were form or ajax errors.
   *  scope           (obj)     The scope to call the handler functions with (optional).
   */
  setupForm: function (formId, options) {

    var $form = $('#' + formId);
    if (!$form[0]) { return false; }

    var formAction = window.location.protocol + '//' + window.location.host + ($form.attr('action') || '');
    var formMethod = ($form.attr('method') || '').toUpperCase();

    // Default options.
    options = $.extend({
      action:         formAction || null,
      method:         formMethod || 'POST',
      timeout:        FovalClient.prop.defaultTimeout,
      manageErrors:   true,
      hashFields:     [],
      onBeforeSubmit: null,
      onSuccess:      null,
      onFailure:      null,
      onAjaxError:    null,
      onComplete:     null,
      scope:          this
    }, options);

    // Attach the submit handler.
    FovalClient.attachSubmitHandler(formId, $form);

    // Store form object.
    FovalClient.prop.forms[formId] = {
      formId:         formId,
      $form:          $form,
      action:         options.action,
      method:         options.method,
      timeout:        options.timeout,
      manageErrors:   options.manageErrors,
      hashFields:     options.hashFields,
      onBeforeSubmit: options.onBeforeSubmit,
      onSuccess:      options.onSuccess,
      onFailure:      options.onFailure,
      onAjaxError:    options.onAjaxError,
      onComplete:     options.onComplete,
      scope:          options.scope
    };

    // Return the form object immediately.
    return FovalClient.prop.forms[formId];

  },

  /*
   * Sets up a submit handler for the given form.
   */
  attachSubmitHandler: function (formId, $form) {
    $form.on('submit', FovalClient.submitHandler.bind(FovalClient, formId));
  },

  /*
   * Returns the form field values as an object.
   */
  getFormValues: function (form, finish) {

    // Setup
    var $form    = form.$form;
    var inputEls = $form[0].elements;
    var i        = 0;
    var output   = {};

    return FovalClient.getValue(form, inputEls, i, output, finish);

  },

  /*
   * Gets an individual field's value. Can be used recursively.
   */
  getValue: function (form, inputEls, i, output, finish) {

    // What's next?
    if (i === inputEls.length) { return finish(output); }
    else { var next = FovalClient.getValue; }

    var $field  = $(inputEls[i]);
    var name    = $field.attr('name') || $field.attr('id');
    var tag     = $field.prop('tagName');
    var type    = ($field.attr('type') ? $field.attr('type') : null);
    var isInput = Boolean(tag === 'INPUT');
    var isDisabled = $field.prop('disabled') || false;

    // If a field doesn't have a name.
    if (!name) { return next(form, inputEls, ++i, output, finish); }

    // If a field is disabled.
    if (isDisabled) { return next(form, inputEls, ++i, output, finish); }

    // Ignore certain field types.
    if ((isInput && type === 'submit') || tag === 'FIELDSET') {
      return next(form, inputEls, ++i, output, finish);
    }

    // Hash fields (MUST BE BEFORE CHECKBOXES).
    else if (isInput && form.hashFields.indexOf(name) > -1) {
      if (!output[name]) { output[name] = {}; }
      var hashCmpVal = $field.val() || $field.attr('id');
      output[name][hashCmpVal] = $field.prop('checked');
      return next(form, inputEls, ++i, output, finish);
    }

    // Checkboxes.
    else if (isInput && type === 'checkbox') {
      output[name] = $field.prop('checked');
      return next(form, inputEls, ++i, output, finish);
    }

    // Radio buttons.
    else if (isInput && type === 'radio') {
      if ($field.is(':checked')) output[name] = $field.val();
      return next(form, inputEls, ++i, output, finish);
    }

    // File inputs.
    else if (isInput && type === 'file') {

      // Was a file selected?
      var file = ($field[0].files ? $field[0].files[0] : null);
      if (!file) {
        output[name] = {
          filename: null,
          size:     null,
          mimeType: null,
          data:     null
        };
        return next(form, inputEls, ++i, output, finish);
      }

      // Do we support HTML5?
      if (!window.FileReader) {
        output[name] = {
          filename: file.name,
          size:     file.size,
          mime:     file.type,
          data:     null
        };
        return next(form, inputEls, ++i, output, finish);
      }

      // Read in the file asynchronously.
      var reader = new FileReader();
      reader.onload = function(e) {
        output[name] = {
          filename: file.name,
          size:     file.size,
          mime:     file.type,
          data:     e.target.result
        };
        return next(form, inputEls, ++i, output, finish);
      };
      return reader.readAsDataURL($field[0].files[0]);

    }

    // Most other field types
    if (name.match(/\[\]$/)) {
      if (!output[name]) { output[name] = []; }
      output[name].push($field.val());
    }
    else {
      output[name] = $field.val();
    }

    return next(form, inputEls, ++i, output, finish);

  },

  /*
   * Handles the form submission over AJAX.
   */
  submitHandler: function (formId, e) {

    // Prevent form submission.
    e.preventDefault();

    var form = FovalClient.prop.forms[formId];

    // Get form values (asynchronously).
    FovalClient.getFormValues(form, function (formValues) {

      // Reset form erorrs.
      if (form.manageErrors) { FovalClient.resetErrors(form); }

      // On before submit handler.
      if (typeof form.onBeforeSubmit === 'function') {
        form.onBeforeSubmit.call(form.scope, form);
      }

      // Add the FovalClient version to the form values.
      formValues.__FovalClientVersion = FovalClient.prop.version;

      // Submit the form via AJAX.
      $.ajax({
        url:      form.action,
        type:     form.method,
        cache:    false,
        dataType:	'json',
        data:     formValues,
        success:  FovalClient.responseHandler.bind(FovalClient, form),
        error: function (jqXHR, textStatus, errorThrown) {

          var response   = $.parseJSON(jqXHR.responseText);
          var readyState = jqXHR.readyState;

          // On ajax error handler.
          if (typeof form.onAjaxError === 'function') {
            form.onAjaxError.call(form.scope, response, readyState);
          }

          // Otherwise just alert an error message.
          else {
            alert('There was a problem communicating with the server.');
          }

        },
        complete:	function(jqXHR, textStatus) {

          var response = $.parseJSON(jqXHR.responseText);

          // On complete event handler.
          if (typeof form.onComplete === 'function') {
            form.onComplete.call(form.scope, response, form);
          }

        },
        context: FovalClient
      });

    });

  },

  /*
   * Handles the ajax response from the server.
   */
  responseHandler: function (form, obj, textStatus, jqXHR) {

    // Success.
    if (obj.success) {

      // Custom callback.
      if (typeof form.onSuccess === 'function') {
        form.onSuccess.call(form.scope, obj, form);
      }

    }

    // Problem.
    else {

      // Custom callback.
      if (typeof form.onFailure === 'function') {
        form.onFailure.call(form.scope, obj, form);
      }

      // Show form errors.
      if (form.manageErrors) { FovalClient.showErrors(form, obj.errors); }

    }

  },

  /*
   * Resets any form errors.
   */
  resetErrors: function (form) {

    // Unhighlight fields.
    $(form.$form[0].elements).removeClass('error').removeClass('invalid');

  },

  /*
   * Shows form field errors.
   */
  showErrors: function (form, errors) {

    // Unknown error.
    if (!errors) {
      alert('An unknown error occured!');
      return;
    }

    // Cycle fields.
    for (var fieldName in errors) {
      if (!errors.hasOwnProperty(fieldName)) { continue; }

      // Mark up the field if we have an error.
      if (!errors[fieldName].isValid) {
        var $fieldInput = $(form.$form[0].elements).filter('[name=' + fieldName + ']');
        if (!$fieldInput[0]) { $fieldInput = $(form.$form[0].elements).filter('#' + fieldName); }

        $fieldInput.addClass('error').addClass('invalid');
      }
    }

  }

};
