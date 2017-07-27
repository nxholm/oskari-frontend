exports.coreFiles = function() {
    let files = [ 
      './libraries/requirejs/require-2.3.4.min.js',
      './libraries/requirejs/text-plugin-2.0.14.js',
      './libraries/mobile-detect/mobile-detect-1.3.2.js',
      './libraries/dompurify/purify_0.8.0.min.js',
      './src/polyfills.js',
      './src/oskari.js',
      './src/counter.js',
      './src/logger.js',
      './src/store.js',
      './src/events.js',
      './src/util.js',
      './src/i18n.js',
      './src/message_types.js',
      // class system
      './src/O2ClassSystem.js',
      './src/bundle_manager.js',
      // user and sandbox
      './src/user.js',
      './src/sandbox_factory.js',
      './src/sandbox/sandbox.js',
      './src/sandbox/sandbox-state-methods.js',
      './src/sandbox/sandbox-map-layer-methods.js',
      './src/sandbox/sandbox-map-methods.js',
      './src/sandbox/sandbox-abstraction-methods.js',
      // Oskari application helpers
      './src/oskari.app.js', 
      './src/loader.js',
      './src/oskari-loader.js'
      ];

    return files;
}
exports.bundlesToLoad = function(){
  
}