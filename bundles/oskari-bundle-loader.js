import json from './bundlesToLoad.js';
module.exports = () => {
    let bundles = [];
    for (const key of Object.keys(json)) {
        json[key].forEach( (file) => {
            bundles.push(file);
        });
    }
    return bundles;
}