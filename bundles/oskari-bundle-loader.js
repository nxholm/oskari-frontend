import { bundles } from './bundlesToLoad.js';

export default () => {
    let bundleFilePaths = [];
    for (const key of Object.keys(bundles)) {
        bundles[key].forEach( (file) => {
            bundleFilePaths.push(file);
        });
    }
    return bundleFilePaths;
}