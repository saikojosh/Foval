/*
 * Tests if we can use the formatters outside of the validator.
 */

var Foval  = require('../foval');
var output = Foval.format('07123456789', 'telephone', {
  format:        'uk-local',
  international: false
});

console.log('output', output);

