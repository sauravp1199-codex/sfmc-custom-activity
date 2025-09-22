// modules/custom-activity/webpack.config.js
const path = require('path');
module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    filename: 'js/customActivity.js',
    path: path.resolve(__dirname, '../../public'),
    clean: false
  },
  mode: 'production',
  module: {
    rules: []
  },
  plugins: [],
  devtool: false
};
