// modules/custom-activity/webpack.config.js
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    filename: 'custom-activity.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  mode: 'production',
  module: {
    rules: []
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'html/index.html'),
          to: path.resolve(__dirname, 'dist/index.html')
        }
      ]
    })
  ],
  devtool: false
};
