var path = require('path')
var webpack = require('webpack')
var glob = require('glob')
var nodeExternals = require('webpack-node-externals')

module.exports = {
  entry:{
    'bundle':[
      './libraries/requirejs/require-2.2.0.min.js',
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
    ]
  },
  output: {
    path: path.resolve(__dirname, './bundles'),
    publicPath: '/Oskari/',
    filename: '[name].js',
    library:'Oskari'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]'
        }
      }
    ]
  },
  externals:[
    nodeExternals()
  ],
  //   resolve: {
  //   extensions: ['.js'],
  //   alias: {
  //     'Oskari': path.resolve(__dirname, './src/oskari-loader.js')
  //   }
  // },
  plugins:[
      new webpack.optimize.UglifyJsPlugin({
    output: {
        comments: false
    }
}),
//  new webpack.ProvidePlugin({
//       'Oskari': 'Oskari'
//     }),
  // Extract all 3rd party modules into a separate 'vendor' chunk
  // new webpack.optimize.CommonsChunkPlugin({
  //   name:'vendor',
  //   chunks:['vendor'],
  //   minChunks:Infinity
  // }),
  //   new webpack.optimize.CommonsChunkPlugin({
  //   name:'mapfull',
  //   chunks:['mapfull'],
  //   minChunks:Infinity
  // })

  ],
  devServer: {
    historyApiFallback: true,
    noInfo: true
  },
  performance: {
    hints: false
  },
  devtool: '#eval-source-map'
}