/*
 * Ensures the Foval Client file is updated to the correct version.
 */

var fs          = require('fs');
var path        = require('path');
var packageJSON = require('./package.json');
var version     = packageJSON.version;
var filename    = path.join(__dirname, '/client/foval-client-jquery.js');

console.log('Reading client file...');

// First get the client file.
fs.readFile(filename, 'utf8', function (err, data) {

  if (err) { throw err; }

  console.log('Updating version string...');

  // Ensure the version is correct.
  data = data.replace(/(version:\s*')\d+\.\d+\.\d+(',)/, '$1' + version + '$2');

  console.log('Writing client file...');

  // Save the changes.
  fs.writeFile(filename, data, 'utf8', function (err) {

    if (err) { throw err; }

    console.log('Success!');

  });

});