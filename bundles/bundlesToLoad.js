import glob from 'glob';

let bundles =  {
        "mapfull": glob.sync("./bundles/framework/mapfull/**/*.js"),
        "divmanazer": glob.sync("./bundles/framework/divmanazer/**/*.js")
    }
export {bundles}
