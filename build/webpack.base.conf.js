import path from 'path';
import utils from './utils';
import config from '../config';
import core from './core';
import startupSequence from '../startupSequence.json';

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}
module.exports = {
  entry: {
    "oskari.min": core.coreFiles(),
    oskaripackages: core.packages(),
    vendor: [resolve('libraries')+"/jquery/jquery-1.7.1.min.js",resolve('libraries')+"/ol3/ol-v3.20.1-oskari.js", resolve('libraries')+"/proj4js-2.4.3/dist/proj4-src.js",
     resolve('libraries')+"/lodash/2.3.0/lodash.js"]
  },
  output: {
    path: config.build.assetsRoot,
    filename: '[name].js',
    publicPath: process.env.NODE_ENV === 'production'
      ? config.build.assetsPublicPath
      : config.dev.assetsPublicPath,
      library: ["Oskari", "[name]"]
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      libraries: resolve('libraries')
    }
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        loader: 'eslint-loader',
        enforce: 'pre',
        include: [resolve('bundles'), resolve('src')],
        options: {
          formatter: require('eslint-friendly-formatter')
        }
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [resolve('bundles'), resolve('src')]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: utils.assetsPath('fonts/[name].[hash:7].[ext]')
        }
      }
    ]
  }
}