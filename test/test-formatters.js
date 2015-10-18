/*
 * Tests if we can use the formatters outside of the validator.
 */

var Foval  = require('../foval');

// Perform some local tests.
var localTests = ['+44.7949523641', '07949523641'];
for (var a = 0, alen = localTests.length ; a < alen ; a++) {
  var localTest = localTests[a];

  console.log('');
  console.log(localTest, '>',
    Foval.format(localTest, 'telephone', {
      format:        'uk-local',
      international: false
    })
  );
}

// Perform some international tests.
var internationalTests = ['+44.7949523641', '07949523641'];
for (var b = 0, blen = internationalTests.length ; b < blen ; b++) {
  var internationalTest = internationalTests[b];

  console.log('');
  console.log(internationalTest, '>',
    Foval.format(internationalTest, 'telephone', {
      format:        'uk-local',
      international: true,
      countryCode:   '44'
    })
  );
}
