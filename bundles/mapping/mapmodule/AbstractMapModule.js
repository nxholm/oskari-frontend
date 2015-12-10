/**
 * @class Oskari.mapping.mapmodule.AbstractMapModule
 *
 * Provides map functionality/Wraps actual map implementation (Openlayers).
 * Currently hardcoded at 13 zoomlevels (0-12) and SRS projection code 'EPSG:3067'.
 * There are plans to make these more configurable in the future.
 *
 * See http://www.oskari.org/trac/wiki/DocumentationBundleMapmodule
 */
Oskari.AbstractFunc = function () {
    var name = arguments[0];
    return function () {
        throw 'AbstractFuncCalled: ' + name;
    };
};

Oskari.clazz.define(
    'Oskari.mapping.mapmodule.AbstractMapModule',
    /**
     * @method create called automatically on construction
     * @static
     *
     * @param {String} id
     *      Unigue ID for this map
     * @param {String} imageUrl
     *      base url for marker etc images
     * @param {Array} map options, example data:
     *  {
     *      resolutions : [2000, 1000, 500, 200, 100, 50, 20, 10, 4, 2, 1, 0.5, 0.25],
     *      maxExtent : {
     *          left : 0,
     *          bottom : 0,
     *          right : 10000000,
     *          top : 10000000
     *      },
     srsName : "EPSG:3067"
     *  }
     */
    function (id, imageUrl, options, mapDivId) {
        var me = this,
            key;

        me._id = id;
        me._mapDivId = mapDivId;
        // FIXME: use imageUrl || '/Oskari/bundles';
        // requires db update since currently uses /Oskari/resources
        me._imageUrl = '/Oskari/bundles';
        // defaults
        me._options = {
            resolutions: [2000, 1000, 500, 200, 100, 50, 20, 10, 4, 2, 1, 0.5, 0.25],
            srsName : 'EPSG:3067',
            units : 'm'
        };
        if (options) {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    me._options[key] = options[key];
                }
            }
        }

        me._controls = {};
        me._layerPlugins = {};

        /** @static @property {String} _projectionCode SRS projection code, defaults
         * to 'EPSG:3067' */
        me._projection = null;
        me._projectionCode = me._options.srsName;
        me._supportedFormats = {};

        me._map = null;

        // _mapScales are calculated in _calculateScalesImpl based on resolutions in options
        me._mapScales = [];
        // array of resolutions
        me._mapResolutions = me._options.resolutions;
        // props: left,bottom,right, top
        me._maxExtent = me._options.maxExtent || {
            left : 0, 
            bottom : 0, 
            right: 10000000, 
            top: 10000000
        };

        me._sandbox = null;
        me._stealth = false;

        me._pluginInstances = {};

        // mapcontrols assumes this to be present before init or start
        me._localization = null;

        /* array of { id: <id>, name: <name>, layer: layer, impl: layerImpl } */
        me.layerDefs = [];
        me.layerDefsById = {};
    }, {
        /**
         * @method init
         * Implements Module protocol init method. Creates the Map.
         * @param {Oskari.mapframework.sandbox.Sandbox} sandbox
         * @return {Map}
         */
        init: function (sandbox) {
            var me = this;
            sandbox.printDebug(
                'Initializing oskari map module...#############################################'
            );

            me._sandbox = sandbox;

            if (me._options) {
                if (me._options.resolutions) {
                    me._mapResolutions = me._options.resolutions;
                }
                if (me._options.srsName) {
                    me._projectionCode = me._options.srsName;
                    // set srsName to Oskari.mapframework.domain.Map
                    if (me._sandbox) {
                        me._sandbox.getMap().setSrsName(me._projectionCode);
                    }
                }
            }

            me._map = me.createMap();

            // changed to resolutions based map zoom levels
            // -> calculate scales array for backward compatibility
            me._calculateScalesImpl(me._mapResolutions);

            return me._initImpl(me._sandbox, me._options, me._map);
        },
        /**
         * @method _initImpl
         * Init for implementation specific functionality.
         * @param {Oskari.mapframework.sandbox.Sandbox} sandbox
         * @param {Map} map
         * @return {Map}
         */
        _initImpl: function (sandbox, options, map) {
            return map;
        },
        /**
         * @method createMap
         * Creates the Implementation specific Map object
         * @return {Map}
         */
        createMap: Oskari.AbstractFunc('createMap'),
        /**
         * @method getMap
         * Returns a reference to the actual OpenLayers implementation
         * @return {OpenLayers.Map}
         */
        getMap: function () {
            return this._map;
        },
        getMapElementId : function() {
            return this._mapDivId;
        },
        /**
         * @method start
         * implements BundleInstance protocol start method
         * Starts the plugins registered on the map and adds
         * selected layers on the map if layers were selected before
         * mapmodule was registered to listen to these events.
         * @param {Oskari.mapframework.sandbox.Sandbox} sandbox
         */
        start: function (sandbox) {
            if (this.started) {
                return;
            }

            sandbox.printDebug('Starting ' + this.getName());

            // register events handlers
            for (var p in this.eventHandlers) {
                if (this.eventHandlers.hasOwnProperty(p)) {
                    sandbox.registerForEventByName(this, p);
                }
            }

            //register request handlers
            this.requestHandlers = {
                mapLayerUpdateHandler: Oskari.clazz.create('Oskari.mapframework.bundle.mapmodule.request.MapLayerUpdateRequestHandler', sandbox, this),
                mapMoveRequestHandler: Oskari.clazz.create('Oskari.mapframework.bundle.mapmodule.request.MapMoveRequestHandler', sandbox, this),
                showSpinnerRequestHandler: Oskari.clazz.create('Oskari.mapframework.bundle.mapmodule.request.ShowProgressSpinnerRequestHandler', sandbox, this)
            };
            sandbox.addRequestHandler('MapModulePlugin.MapLayerUpdateRequest', this.requestHandlers.mapLayerUpdateHandler);
            sandbox.addRequestHandler('MapMoveRequest', this.requestHandlers.mapMoveRequestHandler);
            sandbox.addRequestHandler('ShowProgressSpinnerRequest', this.requestHandlers.showSpinnerRequestHandler);

            this.startPlugins(sandbox);
            this.updateCurrentState();
            this.started = this._startImpl();
        },

        _startImpl: function () {
            return true;
        },
        /**
         * @method stop
         * implements BundleInstance protocol stop method
         * Stops the plugins registered on the map.
         * @param {Oskari.mapframework.sandbox.Sandbox} sandbox
         */
        stop: function (sandbox) {

            if (!this.started) {
                return;
            }

            this.stopPlugins(sandbox);
            this.started = this._stopImpl();
        },
        _stopImpl: function () {
            return false;
        },

        /**
         * @property eventHandlers
         * @static
         */
        eventHandlers: {
            'AfterMapLayerAddEvent': function (event) {
                this.afterMapLayerAddEvent(event);
            },
            'LayerToolsEditModeEvent': function (event) {
                this._isInLayerToolsEditMode = event.isInMode();
            },
            AfterRearrangeSelectedMapLayerEvent: function (event) {
                this.afterRearrangeSelectedMapLayerEvent(event);
            }
        },

/* ---------------- SHARED FUNCTIONS --------------- */
        /**
         * @method getMaxZoomLevel
         * Gets map max zoom level.
         *
         * @return {Integer} map max zoom level
        */
        getMaxZoomLevel: function(){
            // getNumZoomLevels returns OL map resolutions length, so need decreased by one (this return max OL zoom)
            return this.getResolutionArray().length - 1;
        },

        /**
         * Returns a reference to the map implementation
         * @return {[type]} [description]
         */
        getMap : function() {
            return this._map;
        },
        /**
         * @method getMapEl
         * Get jQuery map element
         */
        getMapEl: function () {
            var mapDiv = jQuery('#' + this._mapDivId);
            if (!mapDiv.length) {
                this.getSandbox().printWarn('mapDiv not found with #' + this._mapDivId);
            }
            return mapDiv;
        },
        /**
         * @method getImageUrl
         * Returns a base url for plugins to show. Can be set in constructor and
         * defaults to "/Oskari/bundles" if not set.
         * @return {String}
         */
        getImageUrl: function () {
            return this._imageUrl;
        },
        /**
         * @method notifyStartMove
         * Notify other components that the map has started moving. Sends a MapMoveStartEvent.
         * Not sent always, preferrably track map movements by listening to AfterMapMoveEvent.
         * Ignores the call if map is in stealth mode
         */
        notifyStartMove: function () {
            if (this.getStealth()) {
                // ignore if in "stealth mode"
                return;
            }
            this.getSandbox().getMap().setMoving(true);
            var centerX = this.getMapCenter().lon,
                centerY = this.getMapCenter().lat,
                evt = this.getSandbox().getEventBuilder('MapMoveStartEvent')(centerX, centerY);
            this.getSandbox().notifyAll(evt);
        },
        /**
         * @method notifyMoveEnd
         * Notify other components that the map has moved. Sends a AfterMapMoveEvent and updates the
         * sandbox map domain object with the current map properties.
         * Ignores the call if map is in stealth mode. Plugins should use this to notify other components
         * if they move the map through OpenLayers reference. All map movement methods implemented in mapmodule
         * (this class) calls this automatically if not stated otherwise in API documentation.
         * @param {String} creator
         *        class identifier of object that sends event
         */
        notifyMoveEnd: function (creator) {
            if (this.getStealth()) {
                // ignore if in "stealth mode"
                return;
            }
            var sandbox = this.getSandbox();
            sandbox.getMap().setMoving(false);

            var lonlat = this.getMapCenter();
            this.updateDomain();
            var evt = sandbox.getEventBuilder('AfterMapMoveEvent')(lonlat.lon, lonlat.lat, this.getMapZoom(), false, this.getMapScale(), creator);
            sandbox.notifyAll(evt);
        },
        /**
         * @method zoomToScale
         * Pans the map to the given position.
         * @param {float} scale the new scale
         * @param {Boolean} closest find the zoom level that most closely fits the specified scale.
         *   Note that this may result in a zoom that does not exactly contain the entire extent.  Default is false
         * @param {Boolean} suppressEnd true to NOT send an event about the map move
         *  (other components wont know that the map has moved, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         */
        zoomToScale: function (scale, closest, suppressEnd) {
            var zoom = this.getZoomForScale(scale, closest);
            this.setZoomLevel(zoom, suppressEnd);
        },
        /**
         * Returns zoom level for any scale
         * Find 1st the scale range of OL3 resolution scales of requested scale
         * @param scale any scale
         * @param {Boolean} closest  closest resolution for scale
         * @returns {number}  zoom level ( OL3 scale range min or closest)
         */
        getZoomForScale: function (scale, closest) {
            var resolution = this.calculateScaleResolution(scale),
                zoom = this.getResolutionArray().indexOf(resolution);
            return  (zoom !== -1) ? zoom : 5;
        },
        /**
         * @method calculateScaleResolution
         * Calculate max resolution for the scale
         * If scale is not defined return default
         * @param {Number} scale
         * @return {Number[]} calculated resolution
         */
        calculateScaleResolution: function (scale) {
            var resIndex = -1,
                defIndex = 5,
                i;
            if(scale) {
                for (i = 1; i < this._mapScales.length; i += 1) {
                    if ((scale > this._mapScales[i]) && (scale <= this._mapScales[i-1])) {
                        // resolutions are in the same order as scales so just use them
                        resIndex = i - 1;
                        break;
                    }
                }
                // Is scale out of OL3 scale ranges
                if(resIndex === -1){
                    resIndex = scale < this._mapScales[this._mapScales.length - 1] ?  this._mapScales.length - 1 : 0;
                }
                return this.getResolutionArray()[resIndex];
            }

            return this.getResolutionArray()[defIndex];
        },

        /**
         * @method getMapScales
         * @return {Number[]} calculated mapscales
         */
        getMapScales: function () {
            return this._mapScales;
        },
        getMapScale: function () {
            var scales = this.getMapScales();
            return scales[this.getMapZoom()];
        },
        /**
         * @method moveMapToLonLat
         * Moves the map to the given position.
         * NOTE! Doesn't send an event if zoom level is not changed.
         * Call notifyMoveEnd() afterwards to notify other components about changed state.
         * @param {Number[] | Object} lonlat coordinates to move the map to
         * @param {Number} zoomAdjust relative change to the zoom level f.ex -1 (optional)
         * @param {Boolean} pIsDragging true if the user is dragging the map to a new location currently (optional)
         */
        moveMapToLonLat: function (lonlat, zoomAdjust, pIsDragging) {
            var blnSilent = true;
            var requestedZoomLevel = this.getMapZoom();
            
            if (zoomAdjust) {
                requestedZoomLevel = this._getNewZoomLevel(zoomAdjust);
                blnSilent = false;
            }
            this.centerMap(lonlat, requestedZoomLevel, blnSilent);
        },
        /**
         * Get map max extent.
         * @method getMaxExtent
         * @return {Object} max extent
         */
        getMaxExtent: function(){
            var bbox = this._maxExtent;
            return {
                bottom: bbox.bottom,
                left: bbox.left,
                right: bbox.right,
                top: bbox.top
            };
        },
        /**
         * @method updateDomain
         * Updates the sandbox map domain object with the current map properties.
         * Ignores the call if map is in stealth mode.
         */
        updateDomain: function() {

            if (this.getStealth()) {
                // ignore if in "stealth mode"
                return;
            }
            var sandbox = this.getSandbox();
            var mapVO = sandbox.getMap();
            var lonlat = this.getMapCenter();
            var zoom = this.getMapZoom();
            mapVO.moveTo(lonlat.lon, lonlat.lat, zoom);

            mapVO.setScale(this.getMapScale());
            var resolution = this.getResolutionArray()[zoom];
            mapVO.setResolution(resolution);

            var size = this.getSize();
            mapVO.setWidth(size.width);
            mapVO.setHeight(size.height);

            mapVO.setExtent(this.getCurrentExtent());
            mapVO.setBbox(this.getCurrentExtent());
            mapVO.setMaxExtent(this.getMaxExtent());
        },
        updateSize: function() {
            this._updateSizeImpl();
            this.updateDomain();

            var sandbox = this.getSandbox(),
                mapVO = sandbox.getMap(),
                width =  mapVO.getWidth(),
                height = mapVO.getHeight();

            // send as an event forward
            if(width && height) {
              var evt = sandbox.getEventBuilder(
                  'MapSizeChangedEvent'
              )(width, height);
              sandbox.notifyAll(evt);
            }
        },
        /**
         * Changes array to object
         * @param  {Object | Number[]} lonlat [description]
         * @return {Object}        [description]
         */
        normalizeLonLat : function(lonlat) {
            if (_.isArray(lonlat)) {
                return {
                    lon : lonlat[0],
                    lat : lonlat[1]
                };
            }
            return lonlat;
        },
        /**
         * @method _getNewZoomLevel
         * @private
         * Does a sanity check on a zoomlevel adjustment to see if the adjusted zoomlevel is
         * supported by the map (is between 0-12). Returns the adjusted zoom level if it is valid or
         * current zoom level if the adjusted one is out of bounds.
         * @return {Number} sanitized absolute zoom level
         */
        _getNewZoomLevel: function (adjustment) {
            // TODO: check isNaN?
            var requestedZoomLevel = this.getMapZoom() + adjustment;

            if (requestedZoomLevel >= 0 && requestedZoomLevel <= this.getMaxZoomLevel()) {
                return requestedZoomLevel;
            }
            // if not in valid bounds, return original
            return this.getMapZoom();
        },
        /**
         * @method adjustZoomLevel
         * Adjusts the maps zoom level by given relative number
         * @param {Number} zoomAdjust relative change to the zoom level f.ex -1
         * @param {Boolean} suppressEvent true to NOT send an event about the map move
         *  (other components wont know that the map has moved, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         */
        adjustZoomLevel: function (amount, suppressEvent) {
            var requestedZoomLevel = this._getNewZoomLevel(amount);
            this.setZoomLevel(requestedZoomLevel, suppressEvent);
        },
        /**
         * @method setZoomLevel
         * Sets the maps zoom level to given absolute number
         * @param {Number} newZoomLevel absolute zoom level
         * @param {Boolean} suppressEvent true to NOT send an event about the map move
         *  (other components wont know that the map has moved, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         */
        setZoomLevel: function (newZoomLevel, suppressEvent) {
            if (newZoomLevel < 0 || newZoomLevel > this.getMaxZoomLevel()) {
                newZoomLevel = this.getMapZoom();
            }
            this._setZoomLevelImpl(newZoomLevel);
            this.updateDomain();
            if (suppressEvent !== true) {
                //send note about map change
                this.notifyMoveEnd();
            }
        },
/* --------------- /SHARED FUNCTIONS --------------- */

/* Impl specific - found in ol2 AND ol3 modules
------------------------------------------------------------------> */
        getPixelFromCoordinate: Oskari.AbstractFunc('getPixelFromCoordinate'),
        getMapCenter: Oskari.AbstractFunc('getMapCenter'),
        getMapZoom: Oskari.AbstractFunc('getMapZoom'),
        getSize: Oskari.AbstractFunc('getSize'),
        getCurrentExtent: Oskari.AbstractFunc('getCurrentExtent'),
        /**
         * @method centerMap
         * Moves the map to the given position and zoomlevel.
         * @param {OpenLayers.LonLat} lonlat coordinates to move the map to
         * @param {Number} zoomLevel absolute zoomlevel to set the map to
         * @param {Boolean} suppressEnd true to NOT send an event about the map move
         *  (other components wont know that the map has moved, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         */
        centerMap: Oskari.AbstractFunc('centerMap'),
        /**
         * @method zoomToExtent
         * Zooms the map to fit given bounds on the viewport
         * @param {Object} bounds BoundingBox with left,top,bottom,right keys that should be visible on the viewport
         * @param {Boolean} suppressStart true to NOT send an event about the map starting to move
         *  (other components wont know that the map has started moving, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         * @param {Boolean} suppressEnd true to NOT send an event about the map move
         *  (other components wont know that the map has moved, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         */
        zoomToExtent: Oskari.AbstractFunc('zoomToExtent'),
        /**
         * @method panMapByPixels
         * Pans the map by given amount of pixels.
         * @param {Number} pX amount of pixels to pan on x axis
         * @param {Number} pY amount of pixels to pan on y axis
         * @param {Boolean} suppressStart true to NOT send an event about the map starting to move
         *  (other components wont know that the map has started moving, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         * @param {Boolean} suppressEnd true to NOT send an event about the map move
         *  (other components wont know that the map has moved, only use when chaining moves and
         *     wanting to notify at end of the chain for performance reasons or similar) (optional)
         * @param {Boolean} isDrag true if the user is dragging the map to a new location currently (optional)
         */
        panMapByPixels: Oskari.AbstractFunc('panMapByPixels'),
        orderLayersByZIndex: Oskari.AbstractFunc('orderLayersByZIndex'),
/* --------- /Impl specific --------------------------------------> */


/* Impl specific - PRIVATE
------------------------------------------------------------------> */
        _calculateScalesImpl: Oskari.AbstractFunc('_calculateScalesImpl(resolutions)'),
        _updateSizeImpl: Oskari.AbstractFunc('_updateSizeImpl'),
        _setZoomLevelImpl: Oskari.AbstractFunc('_setZoomLevelImpl'),
/* --------- /Impl specific - PRIVATE ----------------------------> */


/* Impl specific - found in ol2 AND ol3 modules BUT parameters and/or return value differ!!
------------------------------------------------------------------> */
        addLayer: Oskari.AbstractFunc('addLayer'),
        removeLayer: Oskari.AbstractFunc('removeLayer'),
        bringToTop: Oskari.AbstractFunc('bringToTop'),
        getLayerIndex: Oskari.AbstractFunc('getLayerIndex'),
        setLayerIndex: Oskari.AbstractFunc('setLayerIndex'),
        _addMapControlImpl: Oskari.AbstractFunc('_addMapControlImpl(ctl)'),
        _removeMapControlImpl: Oskari.AbstractFunc('_removeMapControlImpl(ctl)'),
        getStyle: Oskari.AbstractFunc('getStyle'),
/* --------- /Impl specific - PARAM DIFFERENCES  ----------------> */




        /**
         * @method getControls
         * Returns map controls - storage for controls by id. See getMapControl for getting single control.
         * @return {Object} contains control names as keys and control
         *      objects as values
         */
        getControls: function () {
            return this._controls;
        },
        /**
         * @method getMapControl
         * Returns a single map control that matches the given id/name.
         *  See getControls for getting all controls.
         * @param {String} id name of the map control
         * @return {OpenLayers.Control} control matching the id or undefined if not found
         */
        getMapControl: function (id) {
            return this._controls[id];
        },
        /**
         * @method addMapControl
         * Adds a control to the map and saves a reference so the control
         * can be accessed with getControls/getMapControl.
         * @param {String} id control id/name
         * @param {OpenLayers.Control} ctl
         */
        addMapControl: function (id, ctl) {
            this._controls[id] = ctl;
            this._addMapControlImpl(ctl);
        },
        /**
         * @method removeMapControl
         * Removes a control from the map matching the given id/name and
         * also removes it from references gotten by getControls()
         * @param {String} id control id/name
         */
        removeMapControl: function (id) {
            var ctl = this._controls[id];
            this._removeMapControlImpl(ctl);
            delete this._controls[id];
        },
        /**
         * @method setLayerPlugin
         * Adds a plugin to the map that is responsible for rendering maplayers on the map. Other types of
         * plugins doesn't need to be registered like this.
         * Saves a reference so the plugin so it can be accessed with getLayerPlugins/getLayerPlugin.
         *
         * The plugin handling rendering a layer is responsible for calling this method and registering
         * itself as a layersplugin.
         *
         * @param {String} id plugin id/name
         * @param {Oskari.mapframework.ui.module.common.mapmodule.Plugin} plug, set to null if you want to remove the entry
         */
        setLayerPlugin: function (id, plug) {
            if (id === null || id === undefined || !id.length) {
                this._sandbox.printWarn(
                    'Setting layer plugin', plug, 'with a non-existent ID:', id
                );
            }
            if (plug === null || plug === undefined) {
                delete this._layerPlugins[id];
            } else {
                this._layerPlugins[id] = plug;
            }
        },
        /**
         * @method getLayerPlugin
         * Returns a single map layer plugin that matches the given id
         * See getLayerPlugins for getting all plugins.
         * See setLayerPlugin for more about layerplugins.
         * @return {Oskari.mapframework.ui.module.common.mapmodule.Plugin} plugin matching the id or undefined if not found
         */
        getLayerPlugin: function (id) {
            return this._layerPlugins[id];
        },
        /**
         * @method getControls
         * Returns plugins that have been registered as layer plugins. See setLayerPlugin for more about layerplugins.
         * See getLayerPlugin for getting single plugin.
         * @return {Object} contains plugin ids keys and plugin objects as values
         */
        getLayerPlugins: function () {
            return this._layerPlugins;
        },

        /**
         * @method getName
         * @return {String} the name for the component
         */
        getName: function () {
            return this._id + 'MapModule';
        },
        /**
         * @method getSandbox
         * Returns reference to Oskari sandbox
         * @return {Oskari.mapframework.sandbox.Sandbox}
         */
        getSandbox: function () {
            return this._sandbox;
        },
        /**
         * @method getLocalization
         * Returns JSON presentation of bundles localization data for current
         * language.
         * If key-parameter is not given, returns the whole localization data.
         *
         * @param {String} key (optional) if given, returns the value for key
         * @param {Boolean} force (optional) true to force reload for localization data
         * @return {String/Object} returns single localization string or
         *      JSON object for complete data depending on localization
         *      structure and if parameter key is given
         */
        getLocalization: function (key, force) {
            if (!this._localization || force === true) {
                this._localization = Oskari.getLocalization('MapModule');
            }
            if (key) {
                return this._localization[key];
            }
            return this._localization;
        },

        /**
         * @method getPluginInstances
         * Returns object containing plugins that have been registered to the map.
         * @return {Object} contains plugin ids as keys and plugin objects as values
         */
        getPluginInstances: function () {
            return this._pluginInstances;
        },
        /**
         * @method getPluginInstance
         * Returns plugin with given name if it registered on the map
         * @param {String} pluginName name of the plugin to get
         * @return {Oskari.mapframework.ui.module.common.mapmodule.Plugin}
         */
        getPluginInstance: function (pluginName) {
            return this._pluginInstances[this.getName() + pluginName];
        },
        /**
         * @method isPluginActivated
         * Checks if a plugin matching the given name is registered to the map
         * @param {String} pluginName name of the plugin to check
         * @return {Boolean} true if a plugin with given name is registered to the map
         */
        isPluginActivated: function (pluginName) {
            var plugin = this._pluginInstances[this.getName() + pluginName];
            if (plugin) {
                return true;
            }
            return false;
        },
        /**
         * @method registerPlugin
         * Registers the given plugin to this map module. Sets the mapmodule reference to the plugin and
         * calls plugins register method. Saves a reference to the plugin that can be fetched through
         * getPluginInstances().
         * @param {Oskari.mapframework.ui.module.common.mapmodule.Plugin} plugin
         */
        registerPlugin: function (plugin) {
            var sandbox = this.getSandbox();
            plugin.setMapModule(this);
            var pluginName = plugin.getName();
            sandbox.printDebug(
                '[' + this.getName() + ']' + ' Registering ' + pluginName
            );
            plugin.register();
            this._pluginInstances[pluginName] = plugin;
        },
        /**
         * @method unregisterPlugin
         * Unregisters the given plugin from this map module. Sets the mapmodule reference on the plugin
         * to <null> and calls plugins unregister method. Removes the reference to the plugin from
         * getPluginInstances().
         * @param {Oskari.mapframework.ui.module.common.mapmodule.Plugin} plugin
         */
        unregisterPlugin: function (plugin) {
            var sandbox = this.getSandbox(),
                pluginName = plugin.getName();

            sandbox.printDebug(
                '[' + this.getName() + ']' + ' Unregistering ' + pluginName
            );
            plugin.unregister();
            this._pluginInstances[pluginName] = undefined;
            plugin.setMapModule(null);
            delete this._pluginInstances[pluginName];
        },
        /**
         * @method startPlugin
         * Starts the given plugin by calling its startPlugin() method.
         * @param {Oskari.mapframework.ui.module.common.mapmodule.Plugin} plugin
         */
        startPlugin: function (plugin) {
            var sandbox = this.getSandbox(),
                pluginName = plugin.getName();

            sandbox.printDebug(
                '[' + this.getName() + ']' + ' Starting ' + pluginName
            );
            plugin.startPlugin(sandbox);
        },
        /**
         * @method stopPlugin
         * Stops the given plugin by calling its stopPlugin() method.
         * @param {Oskari.mapframework.ui.module.common.mapmodule.Plugin} plugin
         */
        stopPlugin: function (plugin) {
            var sandbox = this.getSandbox(),
                pluginName = plugin.getName();

            sandbox.printDebug(
                '[' + this.getName() + ']' + ' Starting ' + pluginName
            );
            plugin.stopPlugin(sandbox);
        },
        /**
         * @method startPlugin
         * Starts all registered plugins (see getPluginInstances() and registerPlugin()) by
         * calling its startPlugin() method.
         * @param {Oskari.mapframework.sandbox.Sandbox} sandbox
         */
        startPlugins: function (sandbox) {
            var pluginName;
            for (pluginName in this._pluginInstances) {
                if (this._pluginInstances.hasOwnProperty(pluginName)) {
                    sandbox.printDebug(
                        '[' + this.getName() + ']' + ' Starting ' + pluginName
                    );
                    this._pluginInstances[pluginName].startPlugin(sandbox);
                }
            }
        },
        /**
         * @method stopPlugins
         * Stops all registered plugins (see getPluginInstances() and registerPlugin()) by
         * calling its stopPlugin() method.
         * @param {Oskari.mapframework.sandbox.Sandbox} sandbox
         */
        stopPlugins: function (sandbox) {
            var pluginName;
            for (pluginName in this._pluginInstances) {
                if (this._pluginInstances.hasOwnProperty(pluginName)) {
                    sandbox.printDebug(
                        '[' + this.getName() + ']' + ' Starting ' + pluginName
                    );
                    this._pluginInstances[pluginName].stopPlugin(sandbox);
                }
            }
        },
        /**
         * @method getStealth
         * Returns boolean true if map is in "stealth mode". Stealth mode means that the map doesn't send events
         * and doesn't update the map domain object in sandbox
         * @return {Boolean}
         */
        getStealth: function () {
            return this._stealth;
        },
        /**
         * @method setStealth
         * Enables/disables the maps "stealth mode". Stealth mode means that the map doesn't send events
         * and doesn't update the map domain object in sandbox
         * @param {Boolean} bln true to enable stealth mode
         */
        setStealth: function (bln) {
            this._stealth = !!bln;
        },
        /**
         * @method notifyAll
         * Calls sandbox.notifyAll with the parameters if stealth mode is not enabled
         * @param {Oskari.mapframework.event.Event} event - event to send
         * @param {Boolean} retainEvent true to not send event but only print debug which modules are listening, usually left undefined (optional)
         */
        notifyAll: function (event, retainEvent) {
            // propably not called anymore?
            if (this.getStealth()) {
                return;
            }

            this.getSandbox().notifyAll(event, retainEvent);
        },

        /**
         * @method getProjection
         * Returns the SRS projection code for the map.
         * Currently always 'EPSG:3067'
         * @return {String}
         */
        getProjection: function () {
            return this._projectionCode;
        },
        getResolutionArray: function () {
            return this._mapResolutions;
        },
        getResolution: function () {
            return this.getResolutionArray()[this.getMapZoom()];
        },

        /**
         * @method isValidLonLat
         * Checks that lat and lon are within bounds of the map extent
         * @param {Number} lon longitude to check
         * @param {Number} lat latitude to check
         * @return {Boolean} true if coordinates are inside boundaries
         */
        isValidLonLat: function (lon, lat) {
            var maxExtent = this.getMaxExtent();

            if(isNaN(lon) || isNaN(lat)) {
                return false;
            } else if(lon < maxExtent.left || lon > maxExtent.right || lat < maxExtent.bottom || lat > maxExtent.top) {
                return false;
            } else {
                return true;
            }
        },

        /**
         * @method getClosestZoomLevel
         * Calculate closest zoom level given the given boundaries.
         * If map is zoomed too close -> returns the closest zoom level level possible within given bounds
         * If map is zoomed too far out -> returns the furthest zoom level possible within given bounds
         * If the boundaries are within current zoomlevel or undefined, returns the current zoomLevel
         * @param {Number} maxScale maximum scale boundary (optional)
         * @param {Number} minScale minimum scale boundary (optional)
         * @return {Number} zoomLevel (0-12)
         */
        getClosestZoomLevel: function (maxScale, minScale) {
            var zoomLevel = this.getMapZoom();
            // FIXME: shouldn't we check appropriate level if even one is defined? '||' should be '&&'?
            if (!minScale || !maxScale) {
                return zoomLevel;
            }

            var scale = this.getMapScale(),
                i;

            if (scale < minScale) {
                // zoom out
                //for(i = this._mapScales.length; i > zoomLevel; i--) {
                for (i = zoomLevel; i > 0; i -= 1) {
                    if (this._mapScales[i] >= minScale) {
                        return i;
                    }
                }
            } else if (scale > maxScale) {
                // zoom in
                for (i = zoomLevel; i < this._mapScales.length; i += 1) {
                    if (this._mapScales[i] <= maxScale) {
                        return i;
                    }
                }
            }
            return zoomLevel;
        },

        /**
         * Formats the measurement of the geometry.
         * Returns a string with the measurement and
         * an appropriate unit (m/km or m²/km²)
         * or an empty string for point.
         *
         * @public @method formatMeasurementResult
         *
         * @param  {OpenLayers.Geometry} geometry
         * @param  {String} drawMode
         * @return {String}
         *
         */
        formatMeasurementResult: function(geometry, drawMode) {
            var measurement,
                unit;

            if (drawMode === 'area') {
                measurement = (Math.round(100 * geometry.getGeodesicArea(this._projectionCode)) / 100);
                unit = ' m²';
                // 1 000 000 m² === 1 km²
                if (measurement >= 1000000) {
                    measurement = (Math.round(measurement) / 1000000);
                    unit = ' km²';
                }
            } else if (drawMode === 'line') {
                measurement = (Math.round(100 * geometry.getGeodesicLength(this._projectionCode)) / 100);
                unit = ' m';
                // 1 000 m === 1 km
                if (measurement >= 1000) {
                    measurement = (Math.round(measurement) / 1000);
                    unit = ' km';
                }
            } else {
                return '';
            }
            return measurement.toFixed(3).replace(
                '.',
                Oskari.getDecimalSeparator()
            ) + unit;
        },


        /**
         * @method onEvent
         * @param {Oskari.mapframework.event.Event} event a Oskari event object
         * Event is handled forwarded to correct #eventHandlers if found or discarded
         * if not.
         */
        onEvent: function (event) {
            var handler = this.eventHandlers[event.getName()];
            if (!handler) {
                return;
            }

            return handler.apply(this, [event]);
        },
        /**
         * Removes all the css classes which respond to given regex from all elements
         * and adds the given class to them.
         *
         * @method changeCssClasses
         * @param {String} classToAdd the css class to add to all elements.
         * @param {RegExp} removeClassRegex the regex to test against to determine which classes should be removec
         * @param {Array[jQuery]} elements The elements where the classes should be changed.
         */
        changeCssClasses: function (classToAdd, removeClassRegex, elements) {

            //TODO: deprecate this, make some error message appear or smthng

            var i,
                j,
                el;

            for (i = 0; i < elements.length; i += 1) {
                el = elements[i];
                // FIXME build the function outside the loop
                el.removeClass(function (index, classes) {
                    var removeThese = '',
                        classNames = classes.split(' ');

                    // Check if there are any old font classes.
                    for (j = 0; j < classNames.length; j += 1) {
                        if (removeClassRegex.test(classNames[j])) {
                            removeThese += classNames[j] + ' ';
                        }
                    }

                    // Return the class names to be removed.
                    return removeThese;
                });

                // Add the new font as a CSS class.
                el.addClass(classToAdd);
            }
        },
        /**
         * Adds the layer to the map through the correct plugin for the layer's type.
         *
         * @method afterMapLayerAddEvent
         * @param  {Object} layer Oskari layer of any type registered to the mapmodule plugin
         * @param  {Boolean} keepLayersOrder
         * @param  {Boolean} isBaseMap
         * @return {undefined}
         */
        afterMapLayerAddEvent: function (event) {
            var map = this.getMap(),
                layer = event.getMapLayer(),
                keepLayersOrder = event.getKeepLayersOrder(),
                isBaseMap = event.isBasemap(),
                layerPlugins = this.getLayerPlugins(),
                layerFunctions = [],
                i;

            _.each(layerPlugins, function (plugin) {
                //FIXME if (plugin && _.isFunction(plugin.addMapLayerToMap)) {
                if (_.isFunction(plugin.addMapLayerToMap)) {
                    var layerFunction = plugin.addMapLayerToMap(layer, keepLayersOrder, isBaseMap);
                    if (_.isFunction(layerFunction)) {
                        layerFunctions.push(layerFunction);
                    }
                }
            });

            // Execute each layer function
            for (i = 0; i < layerFunctions.length; i += 1) {
                layerFunctions[i].apply();
            }
        },


        isInLayerToolsEditMode: function () {
            return this._isInLayerToolsEditMode;
        },

        /**
         * @method afterRearrangeSelectedMapLayerEvent
         * @private
         * Handles AfterRearrangeSelectedMapLayerEvent.
         * Changes the layer order in Openlayers to match the selected layers list in
         * Oskari.
         *
         * @param
         * {Oskari.mapframework.event.common.AfterRearrangeSelectedMapLayerEvent}
         *            event
         */
        afterRearrangeSelectedMapLayerEvent: function (event) {
            var layers = this.getSandbox().findAllSelectedMapLayers(),
                layerIndex = 0;

            var i,
                ilen,
                j,
                jlen,
                olLayers;

            for (i = 0, ilen = layers.length; i < ilen; i += 1) {
                if (layers[i] !== null && layers[i] !== undefined) {
                    olLayers =
                        this.getOLMapLayers(layers[i].getId());
                    for (j = 0, jlen = olLayers.length; j < jlen; j += 1) {
                        this.setLayerIndex(olLayers[j], layerIndex);
                        layerIndex += 1;
                    }
                }
            }
            this.orderLayersByZIndex();
        },

        /**
         * @method getOLMapLayers
         * Returns references to OpenLayers layer objects for requested layer or null if layer is not added to map.
         * Internally calls getOLMapLayers() on all registered layersplugins.
         * @param {String} layerId
         * @return {OpenLayers.Layer[]}
         */
        getOLMapLayers: function (layerId) {
            var me = this,
                sandbox = me._sandbox,
                layer = sandbox.findMapLayerFromSelectedMapLayers(layerId);
            if (!layer) {
                // not found
                return null;
            }
            var lps = this.getLayerPlugins(),
                p,
                layersPlugin,
                layerList,
                results = [];
            // let the actual layerplugins find the layer since the name depends on
            // type
            for (p in lps) {
                if (lps.hasOwnProperty(p)) {
                    layersPlugin = lps[p];
                    if (!layersPlugin) {
                        me.getSandbox().printWarn(
                            'LayerPlugins has no entry for "' + p + '"'
                        );
                    }
                    // find the actual openlayers layers (can be many)
                    layerList = layersPlugin ? layersPlugin.getOLMapLayers(layer): null;
                    if (layerList) {
                        // if found -> add to results
                        // otherwise continue looping
                        results = results.concat(layerList);
                    }
                }
            }
            return results;
        },

        /**
         * Sets the style to be used on plugins and asks all the active plugins that support changing style to change their style accordingly.
         *
         * @method changeToolStyle
         * @param {Object} style The style object to be applied on all plugins that support changing style.
         */
        changeToolStyle: function(style) {
            var me = this;

            if (me._options) {
                me._options.style = _.cloneDeep(style);
            }

            //notify plugins of the style change.
            if (style) {
                _.each(me._pluginInstances, function(plugin) {
                    if (plugin && plugin.hasUI()) {
                        var styleConfig = me._options.style.toolStyle !== "default" ? me._options.style.toolStyle : null;
                        if (plugin.changeToolStyle && typeof plugin.changeToolStyle === 'function') {
                            plugin.changeToolStyle(styleConfig);
                        }
                        if (plugin.changeFont && typeof plugin.changeFont === 'function') {
                            plugin.changeFont(me._options.style.font);
                        }
                    }
                });
            }
        },
        /**
         * Gets the style to be used on plugins
         *
         * @method getToolStyle
         * @return {String} style The mapmodule's style configuration.
         */
        getToolStyle: function() {
            var me = this;
            if (me._options && me._options.style && me._options.style.toolStyle) {
                return me._options.style.toolStyle && me._options.style.toolStyle !== "default" ? me._options.style.toolStyle : null;
            } else {
                return null;
            }
        },
        /**
         * Gets the font to be used on plugins
         * @method getToolFont
         * @return {String} font The mapmodule's font configuration or null if not set.
         */
        getToolFont: function() {
            var me = this;
            if (me._options && me._options.style && me._options.style.font) {
                return me._options.style.font;
            } else {
                return null;
            }
        },
        /**
         * Gets the colourscheme to be used on plugins
         * @method getToolColourScheme
         * @return {String} font The mapmodule's font configuration or null if not set.
         */
        getToolColourScheme: function() {
            var me = this;
            if (me._options && me._options.style && me._options.style.colourScheme) {
                return me._options.style.colourScheme;
            } else {
                return null;
            }
        },
        /**
         * @method updateCurrentState
         * Setup layers from selected layers
         * This is needed if map layers are added before mapmodule/plugins are started.
         * Should be called only on startup, preferrably not even then
         * (workaround for timing issues).
         * If layers are already in map, this adds them twice and they cannot be
         * removed anymore by removemaplayerrequest (it should be sent twice but ui doesn't
         * offer that).
         */
        updateCurrentState: function () {

            var me = this,
                sandbox = me._sandbox,
                layers = sandbox.findAllSelectedMapLayers(),
                lps = this.getLayerPlugins(),
                layersPlugin,
                p;

            for (p in lps) {
                if (lps.hasOwnProperty(p)) {
                    layersPlugin = lps[p];

                    sandbox.printDebug('preselecting ' + p);
                    layersPlugin.preselectLayers(layers);
                }
            }
        },

        /*
         * moved here to make generalization easier
         */
        getLayersByName: function (name) {
            var results = [],
                layerDefs = this.layerDefs,
                l,
                ldef;

            for (l = 0; l < layerDefs.length; l += 1) {

                ldef = layerDefs[l];

                if (ldef.name.indexOf(name) !== -1) {
                    results.push(ldef.impl);
                }

            }

            return results;
        },

        /**
         * @method calculateLayerScales
         * Calculate a subset of maps scales array that matches the given boundaries.
         * If boundaries are not defined, returns all possible scales.
         * @param {Number} maxScale maximum scale boundary (optional)
         * @param {Number} minScale minimum scale boundary (optional)
         * @return {Number[]} calculated mapscales that are within given bounds
         */
        calculateLayerMinMaxResolutions: function (maxScale, minScale) {
            var minScaleZoom,
                maxScaleZoom,
                i;

            for (i = 0; i < this._mapScales.length; i += 1) {
                if ((!minScale || minScale >= this._mapScales[i]) && (!maxScale || maxScale <= this._mapScales[i])) {
                    if (minScaleZoom === undefined) {
                        minScaleZoom = i;
                    }
                    maxScaleZoom = i;
                }
            }
            return {
                min: minScaleZoom,
                max: maxScaleZoom
            };
        },
        /**
         * @method calculateLayerScales
         * Calculate a subset of maps scales array that matches the given boundaries.
         * If boundaries are not defined, returns all possible scales.
         * @param {Number} maxScale maximum scale boundary (optional)
         * @param {Number} minScale minimum scale boundary (optional)
         * @return {Number[]} calculated mapscales that are within given bounds
         */
        calculateLayerScales: function (maxScale, minScale) {
            var layerScales = [],
                i;

            for (i = 0; i < this._mapScales.length; i += 1) {
                if ((!minScale || minScale >= this._mapScales[i]) && (!maxScale || maxScale <= this._mapScales[i])) {
                    layerScales.push(this._mapScales[i]);
                }
            }
            return layerScales;
        },
        /**
         * @method calculateLayerResolutions
         * Calculate a subset of maps resolutions array that matches the given boundaries.
         * If boundaries are not defined, returns all possible resolutions.
         * @param {Number} maxScale maximum scale boundary (optional)
         * @param {Number} minScale minimum scale boundary (optional)
         * @return {Number[]} calculated resolutions that are within given bounds
         */
        calculateLayerResolutions: function (maxScale, minScale) {
            var layerResolutions = [],
                i;

            for (i = 0; i < this._mapScales.length; i += 1) {
                if ((!minScale || minScale >= this._mapScales[i]) && (!maxScale || maxScale <= this._mapScales[i])) {
                    // resolutions are in the same order as scales so just use them
                    layerResolutions.push(this._options.resolutions[i]);
                }
            }
            return layerResolutions;
        },
        /**
         * Returns state for mapmodule including plugins that have getState() function
         * @method getState
         * @return {Object} properties for each pluginName
         */
        getState : function() {
            var state = {
                    plugins: {}
                },
                pluginName;

            for (pluginName in this._pluginInstances) {
                if (this._pluginInstances.hasOwnProperty(pluginName) && this._pluginInstances[pluginName].getState) {
                    state.plugins[pluginName] = this._pluginInstances[pluginName].getState();
                }
            }
            return state;
        },
        /**
         * Returns state for mapmodule including plugins that have getStateParameters() function
         * @method getStateParameters
         * @return {String} link parameters for map state
         */
        getStateParameters: function () {
            var params = '',
                pluginName;

            for (pluginName in this._pluginInstances) {
                if (this._pluginInstances.hasOwnProperty(pluginName) && this._pluginInstances[pluginName].getStateParameters) {
                    params = params + this._pluginInstances[pluginName].getStateParameters();
                }
            }
            return params;
        },
        /**
         * Sets state for mapmodule including plugins that have setState() function
         * NOTE! Not used for now
         * @method setState
         * @param {Object} properties for each pluginName
         */
        setState : function(state) {
            var pluginName;

            for (pluginName in this._pluginInstances) {
                if (this._pluginInstances.hasOwnProperty(pluginName) && state[pluginName] && this._pluginInstances[pluginName].setState) {
                    this._pluginInstances[pluginName].setState(state[pluginName]);
                }
            }
        },
        _getContainerWithClasses: function (containerClasses) {
            var mapDiv = this.getMapEl(),
                containerDiv = jQuery(
                    '<div class="mapplugins">' +
                    '  <div class="mappluginsContainer">' +
                    '    <div class="mappluginsContent"></div>' +
                    '  </div>' +
                    '</div>'
                );

            containerDiv.addClass(containerClasses);
            containerDiv.attr('data-location', containerClasses);
            return containerDiv;
        },

        _getContainerClasses: function () {
            return [
                'bottom center',
                'center top',
                'center right',
                'center left',
                'bottom right',
                'bottom left',
                'right top',
                'left top'
            ];
        },

        /**
         * Adds containers for map control plugins
         */
        _addMapControlPluginContainers: function () {
            var containerClasses = this._getContainerClasses(),
                containerDiv,
                mapDiv = this.getMapEl(),
                i;

            for (i = 0; i < containerClasses.length; i += 1) {
                mapDiv.append(
                    this._getContainerWithClasses(containerClasses[i])
                );
            }
        },

        _getMapControlPluginContainer: function (containerClasses) {
            var splitClasses = (containerClasses + '').split(' '),
                selector = '.mapplugins.' + splitClasses.join('.'),
                containerDiv,
                mapDiv = this.getMapEl();

            containerDiv = mapDiv.find(selector);
            if (!containerDiv.length) {
                var containersClasses = this._getContainerClasses(),
                    currentClasses,
                    previousFound = null,
                    current,
                    classesMatch,
                    i,
                    j;

                for (i = 0; i < containersClasses.length; i += 1) {
                    currentClasses = containersClasses[i].split(' ');
                    current = mapDiv.find('.mapplugins.' + currentClasses.join('.'));
                    if (current.length) {
                        // container was found in DOM
                        previousFound = current;
                    } else {
                        // container not in DOM, see if it's the one we're supposed to add
                        classesMatch = true;
                        for (j = 0; j < currentClasses.length; j += 1) {
                            if (jQuery.inArray(currentClasses[j], splitClasses) < 0) {
                                classesMatch = false;
                                break;
                            }
                        }
                        if (classesMatch) {
                            // It's the one we're supposed to add
                            containerDiv = this._getContainerWithClasses(
                                currentClasses
                            );
                            if (previousFound !== null && previousFound.length) {
                                previousFound.after(containerDiv);
                            } else {
                                mapDiv.prepend(containerDiv);
                            }
                        }
                    }
                }
            }
            return containerDiv;
        },

        /**
         * @method setMapControlPlugin
         * Inserts a map control plugin instance to the map DOM
         * @param  {Object} element          Control container (jQuery)
         * @param  {String} containerClasses List of container classes separated by space, e.g. 'top left'
         * @param  {Number} slot             Preferred slot/position for the plugin element. Inverted for bottom corners (at least).
         */

        setMapControlPlugin: function (element, containerClasses, position) {
            // Get the container
            var container = this._getMapControlPluginContainer(containerClasses),
                content = container.find('.mappluginsContainer .mappluginsContent'),
                pos = position + '',
                inverted = /^(?=.*\bbottom\b)((?=.*\bleft\b)|(?=.*\bright\b)).+/.test(containerClasses), // bottom corner container?
                precedingPlugin = null,
                curr;

            if (!element) {
                throw 'Element is non-existent.';
            }
            if (!containerClasses) {
                throw 'No container classes.';
            }
            if (!content || !content.length) {
                throw 'Container with classes "' + containerClasses + '" not found.';
            }
            if (content.length > 1) {
                throw 'Found more than one container with classes "' + containerClasses + '".';
            }

            // Add slot to element
            element.attr('data-position', position);
            // Detach element
            element.detach();
            // Get container's children, iterate through them
            if (position !== null && position !== undefined) {
                content.find('.mapplugin').each(function () {
                    curr = jQuery(this);
                    // if plugin's slot isn't bigger (or smaller for bottom corners) than ours, store it to precedingPlugin
                    if ((!inverted && curr.attr('data-position') <= pos) ||
                        (inverted && curr.attr('data-position') > pos)) {
                        precedingPlugin = curr;
                    }
                });
                if (!precedingPlugin) {
                    // no preceding plugin found, just slap our plugin to the beginning of the container
                    content.prepend(element);
                } else {
                    // preceding plugin found, insert ours after it.
                    precedingPlugin.after(element);
                }
            } else {
                // no position given, add to end
                content.append(element);
            }
            // Make sure container is visible
            container.css('display', '');
        },

        /**
         * @method removeMapControlPlugin
         * Removes a map control plugin instance from the map DOM
         * @param  {Object} element Control container (jQuery)
         * @param  {Boolean} keepContainerVisible Keep container visible even if there's no children left.
         */
        removeMapControlPlugin: function (element, keepContainerVisible) {
            var container = element.parents('.mapplugins'),
                content = element.parents('.mappluginsContent');
            // TODO take this into use in all UI plugins so we can hide unused containers...
            element.remove();
            if (!keepContainerVisible && content.children().length === 0) {
                container.css('display', 'none');
            }
        }
    }, {
        /**
         * @static @property {String[]} protocol
         */
        protocol: ['Oskari.mapframework.module.Module']
    }
);