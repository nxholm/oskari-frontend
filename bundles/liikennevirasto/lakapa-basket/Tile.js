/**
 * @class Oskari.liikennevirasto.bundle.lakapa.BasketBundle.Tile
 * Renders the "LakapaBasket" tile.
 */
Oskari.clazz.define('Oskari.liikennevirasto.bundle.lakapa.BasketBundle.Tile',

/**
 * @method create called automatically on construction
 * @static
 * @param {Oskari.liikennevirasto.bundle.lakapa.BasketBundleInstance} instance
 * 		reference to component that created the tile
 */
function(instance) {
	this.instance = instance;
	this.container = null;
	this.template = null;
}, {
	/**
	 * @method getName
	 * @return {String} the name for the component
	 */
	getName : function() {
		return 'Oskari.liikennevirasto.bundle.lakapa.BasketBundle.Tile';
	},
	/**
	 * @method setEl
	 * @param {Object} el
	 * 		reference to the container in browser
	 * @param {Number} width
	 * 		container size(?) - not used
	 * @param {Number} height
	 * 		container size(?) - not used
	 *
	 * Interface method implementation
	 */
	setEl : function(el, width, height) {
		this.container = jQuery(el);
	},
	/**
	 * @method startPlugin
	 * Interface method implementation, calls #refresh()
	 */
	startPlugin : function() {
		this.createUI();
	},
	/**
	 * @method stopPlugin
	 * Interface method implementation, clears the container
	 */
	stopPlugin : function() {
		this.container.empty();
	},
	/**
	 * @method getTitle
	 * @return {String} localized text for the title of the tile
	 */
	getTitle : function() {
		return this.instance.getLocalization('title');
	},
	/**
	 * @method getDescription
	 * @return {String} localized text for the description of the tile
	 */
	getDescription : function() {
	},
	/**
	 * @method getOptions
	 * Interface method implementation, does nothing atm
	 */
	getOptions : function() {

	},
	/**
	 * @method setState
	 * @param {Object} state
	 * 		state that this component should use
	 * Interface method implementation, does nothing atm
	 */
	setState : function(state) {
	},
	/**
	 * @method _createUI
	 * Creates the UI for a fresh start
	 */
	createUI : function() {
		this.container.addClass('lakapa-basket-tile');
		this.container.find('.oskari-tile-status').addClass('icon-bubble-right');
		jQuery('.lakapa-basket-tile .oskari-tile-status').html(0);
		if(jQuery('#lakapa-basket-container').length>0){
			jQuery('#lakapa-basket-container').append(this.container);
		}
	},
	refresh: function(){
		var me = this;
		var basketItems = jQuery('.lakapa-basket-data').length;
    	jQuery('.lakapa-basket-tile .oskari-tile-status').html(basketItems);
    	me.notifyUser();
	},
	clear: function(){
		var me = this;
		me.refresh();
	},
	notifyUser : function() {
        var me = this;
        var status = this.container.children('.oskari-tile-status');

        // stop current animation
        status.stop();
        // blink 2 times
        this._blink(status, 2);
    },
    _blink : function(element, count) {
        var me = this;
        if(!element) {
            return;
        }
        if(!count) {
            count = 1;
        }
        // animate to low opacity
        element.animate({
            opacity: 0.25
        }, 500, function() {
            // on complete, animate back to fully visible
             element.animate({
                opacity: 1
            }, 500,function() {
                // on complete, check and adjust the count parameter
                // recurse if count has not been reached yet
                if(count > 1) {
                    me._blink(element, --count);
                }
            });
        });
    }
}, {
	/**
	 * @property {String[]} protocol
	 * @static
	 */
	'protocol' : ['Oskari.userinterface.Tile']
});
