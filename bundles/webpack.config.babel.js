
let path = require('path')
let webpack = require('webpack')
let glob = require('glob')
let bundles = require('./oskari-bundle-loader');

module.exports = {
  entry:{
       'app.bundle': bundles()
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    publicPath: '../dist/',
    filename: '[name].js',
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
  plugins:[
      new webpack.optimize.UglifyJsPlugin({
    output: {
        comments: false
    }
  }),
  ],
  performance: {
    hints: false
  },
  devtool: '#eval-source-map'
}