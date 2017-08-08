const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const DashboardPlugin = require('webpack-dashboard/plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

var config = {
	devtool: isProd ? 'hidden-source-map' : 'cheap-eval-source-map',
	context: path.resolve('./src'),
	entry: {
		app: './index.ts',
		vendor: './vendor.ts',
		tabDelim: './tabDelim/tabDelim.ts',
	},
	output: {
		path: path.resolve('./dist'),
		filename: '[name].bundle.js',
		sourceMapFilename: '[name].map',
		devtoolModuleFilenameTemplate: function (info) {
			return 'file:///' + info.absoluteResourcePath;
		}
	},
	module: {
		rules: [
			{ enforce: 'pre', test: /\.ts$/, exclude: ['node_modules'], loader: 'ts-loader' },
			{ test: /\.html$/, loader: 'html' },
			{ test: /\.css$/, loaders: ['style', 'css'] }
		]
	},
	resolve: {
		extensions: ['.ts', '.js'],
		modules: [path.resolve('./src'), 'node_modules']
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env': { // eslint-disable-line quote-props
				NODE_ENV: JSON.stringify(nodeEnv)
			}
		}),
		new HtmlWebpackPlugin({
			title: 'kaler',
			template: '!!ejs-loader!src/index.html',
			filename: 'index.html',
			chunks: ['app', 'vendor']
		}),
		new HtmlWebpackPlugin({
			title: 'kaler-tab',
			template: '!!ejs-loader!src/tabDelim/tabDelim.html',
			filename: 'tabDelim.html',
			chunks: ['tabDelim', 'vendor']
		}),
		new CopyWebpackPlugin([
			{from: 'assets', to: 'assets'}
		]),
		new webpack.optimize.CommonsChunkPlugin({
			name: 'vendor',
			minChunks: Infinity,
			filename: 'vendor.bundle.js'
		}),
		new webpack.optimize.UglifyJsPlugin({
			compress: { warnings: false },
			output: { comments: false },
			sourceMap: false
		}),
		new DashboardPlugin(),
		new webpack.LoaderOptionsPlugin({
			options: {
				tslint: {
					emitErrors: true,
					failOnHint: true
				}
			}
		})
	]
};

module.exports = config;
