import glob from 'glob';

let bundles =  {
        "mapfull": glob.sync("./bundles/framework/mapfull/**/*.js"),
        "coordiantetool": glob.sync("./bundles/framework/coordiantetool/**/*.js")
    }
export { bundles }
