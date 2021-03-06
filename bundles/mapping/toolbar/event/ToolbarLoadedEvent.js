/**
 * @class Oskari.mapframework.bundle.toolbar.event.ToolLoadedEvent
 *
 * Used to notify components that the toolbar has been loaded and is
 * available for tool button addition requests.
 */
Oskari.clazz.define('Oskari.mapframework.bundle.toolbar.event.ToolLoadedEvent',
    /**
     * @method create called automatically on construction
     * @static
     */
    function () {
    }, {
        /** @static @property __name event name */
        __name: 'Toolbar.ToolbarLoadedEvent',
        /**
         * @method getName
         * Returns event name
         * @return {String}
         */
        getName: function () {
            return this.__name;
        }
    }, {
        'protocol': ['Oskari.mapframework.event.Event']
    }
);
