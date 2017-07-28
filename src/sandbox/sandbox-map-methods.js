/**
* @class Oskari.Sandbox.mapMethods
*
* This category class adds map related methods to Oskari sandbox as they were in
* the class itself.
*/
Oskari.clazz.category('Oskari.Sandbox', 'map-methods', {

  /**
  * @method getMap
  * Returns map domain object
  *
  * @return {Oskari.mapframework.domain.Map}
  */
  getMap: function () {
    return this.getService('mapmodule.state');
  },

  /**
  *
  * @method syncMapState
  * Convenience method to send out a map move request with the values on
  * {Oskari.mapframework.domain.Map} domain object (see #getMap()).
  *
  * @param {Boolean} blnInitialMove (optional)
  *          If true, will clear the map history after moving. Defaults to false.
  * @param {Oskari.mapframework.ui.module.common.MapModule} mapModule
  * (optional)
  *          Refreshes the map state so that the added layers are shown correctly
  */
  syncMapState: function (blnInitialMove, mapModule) {
    let mapDomain = this.getMap(),
    zoom = mapDomain.getZoom(),
    maxZoom = 13;

    if (mapModule) {
      maxZoom = mapModule.getMaxZoomLevel();
    }

    if (blnInitialMove === true && zoom === maxZoom) {
      // workaround, openlayers needs to be nudged a bit to actually draw
      // the map images if we enter at max zoomlevel
      // so if zoom == max zoom level -> send a dummy request to get openlayers working
      // correctly
      // TODO: find out why OL needs this
      this.postRequestByName('MapMoveRequest', [mapDomain.getX(), mapDomain.getY(), 0], true);
    }
    this.postRequestByName('MapMoveRequest', [mapDomain.getX(), mapDomain.getY(), zoom], true);
  },

  /**
  * @method generateMapLinkParameters
  * Generates query string for an URL that has the maps state with coordinates, zoom and selected map layers
  *
  * Options syntax/supported fields:  {
  *     marker : <boolean, default false>,
  *     forceCache : <boolean, default true>,
  *     noSavedState : <boolean, default true>
  * }
  *
  * @param {Object} options - overrides default parameter values (optional)
  * @return {String}
  */
  generateMapLinkParameters: function (options) {
    // get stateful component parameters
    // Note! These parameters must be passed to the server in index.js to be used
    let components = this.getStatefulComponents(),
    iterator = null,
    component = null,
    optionsLinkParameterArray = [],
    componentLinkParameterArray = [];
    for (iterator in components) {
      if (components.hasOwnProperty(iterator)) {
        component = components[iterator];

        // Make sure the function exists and is a function
        if (component.getStateParameters && typeof component.getStateParameters === "function") {
          let params = component.getStateParameters();
          if (params) {
            componentLinkParameterArray.push(params);
          }
        }
      }
    }

    // use given options or empty object to have the strings only once
    options = options || {
      "showMarker": false,
      "forceCache": false,
      "noSavedState": false
    };

    for (iterator in options) {
      if (options.hasOwnProperty(iterator)) {
        optionsLinkParameterArray.push(iterator + '=' + (options[iterator] !== false));
      }
    }

    // Use array join to make sure the values are always separated with '&', but not the first or last
    return componentLinkParameterArray.concat(optionsLinkParameterArray).join('&') || null;
  }
});
