// modules/custom-activity/webpack.config.js
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    filename: 'custom-activity.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'production',
  module: {
    rules: [
      { test: /\.m?js$/, exclude: /(node_modules)/, use: { loader: 'babel-loader', options: { presets: [] } } }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'html/index.html'), to: path.resolve(__dirname, 'dist/../html/index.html') }
      ]
    })
  ],
  devtool: false
};
