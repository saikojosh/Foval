Foval
=====

**Wonderfully easy form validation for Node.js.**

Foval saves you an immense amount of time by providing a quick, easy and solid framework for validating your form fields. It is completely asynchronous and supports a wide range of data transformations and validations out of the box. You can even add custom ones if you wish.

# Quick Start
If you want to get started quickly, copy and paste the following code into your project:

```javascript
var form = new Foval({   //pass in the data as a set of key-value pairs.
  'fullName':        'Josh Cole',
  'telephoneNumber': '+44.7912345678',
  'aboutText':       'Lorum ipsum...',
  'hoursNeeded':     30
});

form.defineFields({
  fieldName: 'fullName',
  dataType:  'string',
  trim:      true,
  required:  true,
  transforms: {
    before: {
      'str-case': 'capitalise'
    }
  }
}, {
  fieldName: 'telephoneNumber',
  dataType:  'tel',  //automatic validation.
  required:  true
}, {
  fieldName: 'email',
  dataType:  'email',  //automatic validation.
  required:  true
}, {
  fieldName: 'aboutText',
  dataType:  'string',
  transforms: {
    after: {
      'str-line-break-to-br': true
    }
  },
  validations: {
    'str-length': {
      min: 100,
      max: 300
    }
  }
}, {
  fieldName: 'hoursNeeded',
  dataType:  'int',
  validations: {
    'numeric': {
      min: 1,
      max: 50
    }
  }
});

form.validate(function (err, isFormValid, validationResults, fieldHash); {

  // A fatal error, not a validation error.
  if (err) { return ...  }

  // The form failed to validate.
  if (!isFormValid) {
    // Use 'validationResults' to check what went wrong.
    return ...
  }

  // Form is valid!
  // Use 'fieldHash' to access the values.
  console.log(fieldHash);

});
```

# Full Guide
This section provides a full guide to form validation with Foval and explain each of the steps in more detail.

## Data Types
Foval supports the following internal data types, some of which automatically apply transformations and validations. Raw input from the form is automatically typecast depending on the data type chosen, this is useful for example with numerical fields which are passed through as strings, but really should be integers or floats.

| Data Type    | Becomes   | Typecast | Transform | Validation | Notes       |
|--------------|-----------|----------|-----------|------------|-------------|
| string       | string    | String   |           |            |             |
| str          | string    | String   |           |            |             |
| number       | int       | Number   |           |            |             |
| int          | int       | Number   |           |            |             |
| float        | float     | Number   |           |            |             |
| email        | email     | String   | str-trim  | email      |             |
| telephone    | telephone | String   | str-trim  | telephone  |             |
| tel          | telephone | String   | str-trim  | telephone  |             |
| url          | url       | String   | str-trim  | url        |             |
| boolean      | boolean   | Boolean  |           |            |             |
| bool         | boolean   | Boolean  |           |            |             |
| checkbox     | checkbox  | Boolean  |           |            |             |
| password     | password  | String   |           |            | Plain-text. |


## Defining Fields
In order to validate the form in a structured way you must first define each of the fields, the expected data types, validations you want to run, and any transformations you want to run on the data.

```javascript
form.defineFields({
  fieldName:    'firstName',
  dataType:     'string',
  defaultValue: 'Bob',
  required:     true,
  trim:         true,
  modify: function (value, finish) {
    ...
    return finish(null, isValid, reason);
  },
  transforms: {
    before: {
      ...
    },
    after: {
      ...
    }
  },
  validations: {
    ...
  }
});
```

## Shortcuts
When defining fields you might want to enable some transforms or validations on a regular basis. To save time you can use the following shortcuts.

### Transforms

| Shortcut | Data Type | Default | Transformer | When   |
|----------|-----------|---------|-------------|--------|
| trim     | Boolean   | False   | str-trim    | Before |
| modify   | Function  | Null    | custom      | Before |

### Validations

| Shortcut | Data Type | Default | Validation |
|----------|-----------|---------|------------|
| required | Boolean   | False   | required   |


## Setting Up Transformers
Transformers allow you to modify the data in the field both 'before' and 'after' it is validated. This is useful for example, if you need to trim whitespace from an email before validating it, and then want to run a custom transformer after validation, to split out the domain portion. When defining a field you must add transforms inside the 'transforms.before' or 'transforms.after' property. Transforms will be run in the order they are added.

### Use The Default Options
If you just pass 'true' the transform will run with the default options. Please note some transforms have required options.
```javascript
{
  ...
  transforms: {
    before: {
      'str-case': true
    },
    after: {
      ...
    }
  }
}
```

### Specifying Options
You can pass an object containing various options for the transform. The 'run' option is 'true' by default.
```javascript
{
  ...
  ...
  transforms: {
    before: {
      'str-case': {
        run:  true,
        case: 'upper'
      }
    },
    after: {
      ...
    }
  }
}
```

## Setting Up Validations
Validations allow you to test the field values against pre-defined rules. When defining a field you must add validations inside the 'validations' property. Validations will be run in the order they are added.

### Use The Default Options
If you just pass 'true' the validation will run with the default options. Please note some validations have required options.
```javascript
{
  ...
  validations: {
    'password': true
  }
}
```

### Specifying Options
You can pass an object containing various options for the validation. The 'run' option is 'true' by default.
```javascript
{
  ...
  validations: {
    'password': {
      run: true,
      requirements: {
        length:    6,
        lowercase: true,
        uppercase: true,
        common:    true
      }
    }
  }
}
```

# Transformers List
The following is a list of all the transformers and what they do. Remember, you can use these 'before' or 'after' the data is validated.

## 'custom'
Allows you to pass in an asynchronous function to do some transformation of the data.

### Options

| Property | Data Type | Default | Notes                                    |
|----------|-----------|---------|------------------------------------------|
| run      | Boolean   | True    | Set false to stop the transform running. |
| fn       | Function  | Null    | The custom transform function.           |

### Function Parameters

| Parameter | Data Type | Notes                                                 |
|-----------|-----------|-------------------------------------------------------|
| value     | Mixed     | The value of the field.                               |
| dataType  | String    | The Foval data type of the field.                     |
| finish    | Function  | The callback to call when your function has finished. |

### Finish Parameters

| Parameter         | Data Type | Notes                                         |
|-------------------|-----------|-----------------------------------------------|
| err               | Error     | An error to pass back or null.                |
| transformedValue  | Mixed     | The transformed/unchanged value to pass back. |

### Example
```javascript
{
  ...
  transforms: {
    before: {
      'custom': function (value, dataType, finish) {
        var transformedValue = value.replace(/a/gi, 'b');
        return finish(null, transformedValue);
      }
    }
  }
}, {
  ...
  transforms: {
    before: {
      'custom': {
        run: true,
        fn:  function (value, dataType, finish) {
          var transformedValue = value.replace(/a/gi, 'b');
          return finish(null, transformedValue);
        }
      }
    }
  }
}
```

## 'md5'
Creates an MD5 hash of the value. Non-string values will be typecast to strings first and this may have unexpected behaviour.

### Options

| Property | Data Type | Default | Notes                                                 |
|----------|-----------|---------|-------------------------------------------------------|
| run      | Boolean   | True    | Set false to stop the transform running.              |
| encoding | String    | 'hex'   | The encoding type. See Node's crypto documentation.   |
| seed     | Mixed     | Null    | Any value to use as a seed, optional.                 |
| random   | Bool      | False   | Set true to add a random value to seed the hash with. |

### Example
```javascript
{
  ...
  transforms: {
    before: {
      'md5': 'hex'
    }
  }
}, {
  ...
  transforms: {
    before: {
      'md5': {
        run:      true,
        encoding: 'hex'
      }
    }
  }
}
```

## 'str-br-to-line-break'
Converts <br> tags to line breaks.

### Options

| Property | Data Type | Default | Notes                                    |
|----------|-----------|---------|------------------------------------------|
| run      | Boolean   | True    | Set false to stop the transform running. |

### Example
```javascript
{
  ...
  transforms: {
    before: {
      'str-br-to-line-break': true
    }
  }
}, {
  ...
  transforms: {
    before: {
      'str-br-to-line-break': {
        run: true
      }
    }
  }
}
```

## 'str-case'
Change the case of a string.

### Options

| Property | Data Type | Default | Notes                                    |
|----------|-----------|---------|------------------------------------------|
| run      | Boolean   | True    | Set false to stop the transform running. |
| case     | String    | Null    | The new string case to apply.            |

### Values For 'case'

| Case       | Notes                                                                       |
|------------|-----------------------------------------------------------------------------|
| uppper     | Makes the whole string uppercase.                                           |
| lower      | Makes the whole string lowercase.                                           |
| capitalise | Capitalises the first letter of each word whilst making the rest lowercase. |
| capitalize | Capitalises the first letter of each word whilst making the rest lowercase. |


### Example
```javascript
{
  ...
  transforms: {
    before: {
      'str-case': 'upper'
    }
  }
}, {
  ...
  transforms: {
    before: {
      'str-case': {
        run:  true,
        case: 'upper'
      }
    }
  }
}
```

## 'str-collapse-whitespace'
Collapse multiple spaces or tabs into single spaces.

### Options

| Property | Data Type | Default | Notes                                    |
|----------|-----------|---------|------------------------------------------|
| run      | Boolean   | True    | Set false to stop the transform running. |

### Example
```javascript
{
  ...
  transforms: {
    before: {
      'str-collapse-whitespace': true
    }
  }
}, {
  ...
  transforms: {
    before: {
      'str-collapse-whitespace': {
        run: true
      }
    }
  }
}
```

## 'str-line-break-to-br'
Converts line breaks tags to <br> tags.

### Options

| Property | Data Type | Default | Notes                                    |
|----------|-----------|---------|------------------------------------------|
| run      | Boolean   | True    | Set false to stop the transform running. |

### Example
```javascript
{
  ...
  transforms: {
    before: {
      'str-line-break-to-br': true
    }
  }
}, {
  ...
  transforms: {
    before: {
      'str-line-break-to-br': {
        run: true
      }
    }
  }
}
```

## 'str-replace'
Replaces something in a string. Can be passed a regular expression or a string. If a string is passed in it will automatically be escape.

### Options

| Property | Data Type     | Default | Notes                                    |
|----------|---------------|---------|------------------------------------------|
| run      | Boolean       | True    | Set false to stop the transform running. |
| find     | RegExp/String | Null    | The RegExp object or raw string to use.  |
| flags    | Boolean       | Null    | Used if a string is passed to 'find'.    |
| replace  | String        | Null    | The string to replace with.              |

### Example
```javascript
{
  ...
  transforms: {
    before: {
      'str-replace': {
        run:     true,
        find:    'abc',
        flags:   'gi',
        replace: 'def'
      }
    }
  }
}
```

## 'str-trim'
Trims whitespace from the start and end of a string.

### Options

| Property | Data Type | Default | Notes                                    |
|----------|-----------|---------|------------------------------------------|
| run      | Boolean   | True    | Set false to stop the transform running. |

### Example
```javascript
{
  ...
  transforms: {
    before: {
      'str-trim': true
    }
  }
}, {
  ...
  transforms: {
    before: {
      'str-trim': {
        run: true
      }
    }
  }
}
```

# Validations List

## 'custom'
Allows you to pass in an asynchronous function to do some validation of the data.

### Options

| Property | Data Type | Default | Notes                                     |
|----------|-----------|---------|-------------------------------------------|
| run      | Boolean   | True    | Set false to stop the validation running. |
| fn       | Function  | Null    | The custom validation function.           |

### Function Parameters

| Parameter | Data Type | Notes                                                 |
|-----------|-----------|-------------------------------------------------------|
| value     | Mixed     | The value of the field.                               |
| dataType  | String    | The Foval data type of the field.                     |
| finish    | Function  | The callback to call when your function has finished. |

### Finish Parameters

| Parameter | Data Type | Notes                                                |
|-----------|-----------|------------------------------------------------------|
| err       | Error     | An error to pass back or null.                       |
| isValid   | Boolean   | Set true if the validation passed, otherwise false.  |
| reason    | String    | A short string denoting the failure reason, or Null. |

### Example
```javascript
{
  ...
  validations: {
    'custom': function (value, dataType, finish) {
      ...
      return finish(null, isValid, reason);
    }
  }
}, {
  ...
  validations: {
    'custom': {
      run: true,
      fn:  function (value, dataType, finish) {
        ...
        return finish(null, isValid, reason);
      }
    }
  }
}
```

## 'email'
...

## 'in-list'
...

## 'match-field'
...

## 'numeric'
...

## 'password'
Uses the Countersign module to test the strength of the password.

### Options

| Property     | Data Type | Default | Notes                                                                                |
|--------------|-----------|---------|--------------------------------------------------------------------------------------|
| run          | Boolean   | True    | Set false to stop the transform running.                                             |
| requirements | Object    | {}      | Pass in any of the [Countersign](https://www.npmjs.com/package/countersign) options. |

## Default Requirements
See the [Countersign](https://www.npmjs.com/package/countersign) documentation for the options you can use.

| Property  | Value |
|-----------|-------|
| length    | 6     |
| lowercase | True  |
| uppercase | True  |
| common    | True  |

### Example
```javascript
{
  ...
  validations: {
    'password': true
  }
}, {
  ...
  validations: {
    'password': {
      run: true,
      requirements: {
        length:    6,
        lowercase: true,
        uppercase: true,
        common:    true
      }
    }
  }
}
```

## 'regexp'
...

## 'required'
...

## 'str-length'
...

## 'telephone'
Checks to ensure we have a valid telephone number. The validation will only pass if the telephone number is a string in one of these formats:

- **International Format:** '+44.7912345678'
- **Local Format:** '07912345678'

### Options

| Property  | Data Type | Default | Notes                                                                             |
|-----------|-----------|---------|-----------------------------------------------------------------------------------|
| run       | Boolean   | True    | Set false to stop the transform running.                                          |
| minDigits | Int       | 1       | The minimum number of digits in the phone number, not including the country code. |
| maxDigits | Int       | Null    | The maximum number of digits in the phone number, not including the country code. |

### Example
```javascript
{
  ...
  validations: {
    'telephone': true
  }
}, {
  ...
  validations: {
    'telephone': {
      run:       true,
      minDigits: 5,
      maxDigits: 11
    }
  }
}
```

## 'url'
Checks to ensure we have a valid URL.

### Options

| Property        | Data Type | Default | Notes                                                         |
|-----------------|-----------|---------|---------------------------------------------------------------|
| run             | Boolean   | True    | Set false to stop the transform running.                      |
| requireProtocol | Boolean   | True    | Set false to validate URLs that don't have a HTTP/S protocol. |

### Example
```javascript
{
  ...
  validations: {
    'url': true
  }
}, {
  ...
  validations: {
    'url': {
      run:             true,
      requireProtocol: false
    }
  }
}
```