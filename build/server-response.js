import axios from 'axios';
import fs from 'fs';

( function() {
    console.log("getting data");
    axios.get('http://localhost:7070/action?action_route=GetAppSetup', {

    })
    .then(function (response) {
      var start = response.data.startupSequence;
      fs.writeFile('startupSequence.json', JSON.stringify(start, null, 4));
    })
    .catch(function (error) {
      console.log(error);
    });
} )();