const webpack = require('webpack')
const config = require('./webpack.config')
const compiler = webpack(config())
const exec = require('child_process').exec


let displayError = true;
let inforErrors = true;
let inforWarnings = true;
let isStarted = false;
let lastHash = '';

compiler.watch({
	watch: true, 
	poll: false,
	aggregateTimeout: 1000,
	ignored: ['./dist/**', 'node_modules/**']
}, (err, stats) => {
	if(!isStarted) {
		isStarted = true;
		console.log('Webpack Watcher Started')
	}
	if(err && displayError) {
		console.error(err.stack || err);
		if (err.details) {
			console.error(err.details);
		}
		displayError = false;
		return;
	} else if(!err) {
		displayError = true;
	}

	const info = stats.toJson();

	if (stats.hasErrors() && inforErrors) {
		info.errors.forEach(e => {
			console.error(e);
		});
		inforErrors = false;
	} else if(!stats.hasErrors()) {
		inforErrors = true;
	}

	if (stats.hasWarnings() && inforWarnings) {
		console.warn('Warnings', info.warnings);
		inforWarnings = false;
	} else if(!stats.hasWarnings()) {
		inforWarnings = true;
	}
	if(info.hash !== lastHash 
		&& inforWarnings 
		&& inforErrors 
		&& displayError) {
			console.log('Success', info.hash);
			lastHash = info.hash;
		}
})

