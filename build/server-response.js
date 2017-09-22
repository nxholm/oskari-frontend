import axios from 'axios';
import fs from 'fs';

function response() {
    console.log("getting data");
    axios.get('http://localhost:7070/action?action_route=GetAppSetup', {

    })
    .then(function (response) {
        console.log(response.data.startupSequence);
      var start = response.data.startupSequence;
      fs.writeFile('startupSequence.json', JSON.stringify(start));
    })
    .catch(function (error) {
      console.log(error);
    });
  }

response();