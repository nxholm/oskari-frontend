define([
	"oskari",
	"jquery",
	"./instance",
	"../../../framework/bundle/mapfull/enhancement/start-map-with-link-enhancement",
	"../../../framework/bundle/mapfull/request/MapResizeEnabledRequest",
	"../../../framework/bundle/mapfull/request/MapResizeEnabledRequestHandler",
	"../../../framework/bundle/mapfull/request/MapWindowFullScreenRequest",
	"../../../framework/bundle/mapfull/request/MapWindowFullScreenRequestHandler",
	"css!resources/framework/bundle/mapfull/css/style.css"
], function(Oskari, jQuery) {
	return Oskari.bundleCls("mapfull").category({
		create: function() {
			return Oskari.clazz.create("Oskari.leaflet.bundle.mapfull.MapFullBundleInstance");
		},
		update: function(manager, bundle, bi, info) {

		}
	})
});