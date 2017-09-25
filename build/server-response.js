import axios from 'axios';
import fs from 'fs';

( function() {
    console.log("getting data");
    axios.get('http://localhost:7070/action?action_route=GetAppSetup', {

    })
    .then(function ( response ) {
      var start = response.data.startupSequence;
      var files = parseResponse(start);
      fs.writeFile('startupSequence.json', JSON.stringify(files, null, 4));
    })
    .catch(function (error) {
      console.log(error);
    });
} )();

parseResponse = ( resp ) => {
  var files = [];
  resp.forEach( (key ) => {
    let metadata =  key.metadata; 
    let importkey = "Import-Bundle";
    if ( metadata.hasOwnProperty( importkey ) ) {
      let bundle = key.bundlename;
      let path = key.metadata[importkey][bundle].bundlePath;
      let replacedPath = path.replace('/Oskari', '.')
      var b = replacedPath + bundle + '/bundle.js';
      files.push(b);
    }
  });
  return files;
}