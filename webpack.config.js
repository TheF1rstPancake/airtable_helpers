const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json');
const nodeExternals = require('webpack-node-externals');

console.log(pkg.mode);
module.exports = function configure() {
  return {
    entry: './src/index.ts',
    target: 'node',
    mode: pkg.mode,
    entry: './src/index.ts',
    /*externals: {
      '@airtable/blocks/models': '@airtable/blocks/models',
      '@airtable/blocks/ui': '@airtable/blocks/ui',
      '@airtable/blocks/types': '@airtable/blocks/types'
    },*/
    externals: [
      //nodeExternals()
    ],
    plugins: [
      //new webpack.IgnorePlugin(/@airtable\/blocks/)
    ],
    resolve: {
      modules: [path.resolve(__dirname, 'node_modules')],
      extensions: ['.ts', '.tsx', '.js', '.json', '.scss']
    },
    output: {
      path: path.join(__dirname, './dist'),
      filename: 'index.js',
      library: 'airtable_helpers',
      libraryTarget: 'umd'
    },
    module: {
      rules: [{
        test: /\.ts(x?)$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        loader: "ts-loader"
      }, {
        enforce: "pre",
        test: /\.js$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        loader: "source-map-loader"
      }, {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
        ],
        include: path.resolve(__dirname, 'src/scss'),
        exclude: /node_modules/,
      }]
    }
  }
}