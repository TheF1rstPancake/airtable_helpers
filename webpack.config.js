const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json');

module.exports = function configure() {
	return {
		entry: './src/index.ts',
		mode: pkg.mode,
		devtool: 'source-map',
		resolve: {
			extensions: ['.ts','.tsx','.js', '.json', '.scss']
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
				exclude: /node_modules/,
				loader: "ts-loader"
			}, {
				enforce: "pre",
				test: /\.js$/,
				loader: "source-map-loader"
			}, {
				test: /\.scss$/,
				use: [
				  'style-loader',
				  'css-loader',
				  'sass-loader',
				],
			}]
		}
	}
}
