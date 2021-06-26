/**
 * Created by 5156 on 2017/4/10.
 */
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const autoprefixer = require('autoprefixer');
//环境变量，开发环境或者生产环境，npm将通过这个值来区分打包。
const isDev = process.env.NODE_ENV === 'development';

const postcssLoader = {
    loader: 'postcss-loader',
    options: {
        plugins: (loader) => [autoprefixer({browsers: ['iOS 7', 'Android >= 4.0', '> 1%']})]
    }
};

module.exports = {
    context: path.join(__dirname, 'src'),
    //代码插入方式
    devtool: isDev ? 'eval-source-map' : 'source-map',
    //监听文件改动
    watch: isDev,
    output: {
        path: path.resolve(__dirname, isDev ? 'dev/' : 'dist/'),
        //文件命名
        filename: isDev ? 'js/[name].js?hash=[chunkHash:7]' : 'js/[name].[chunkHash:7].js',
    },
    //入口js文件
    entry: './index',
    plugins: [new HtmlWebpackPlugin({template: './index.html', filename: 'index.html'})].concat(
        isDev
            ? [ //开启多屏幕调试
            new BrowserSyncPlugin(
                {server: {baseDir: "dev", index: "index.html"}},
                {reload: true}
            )]

            : [ //开启代码压缩
            new webpack.optimize.UglifyJsPlugin({
                sourceMap: true,
                comments: false,
                compress: {warnings: true}
            })]
    ),
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', postcssLoader]
            },
            {
                test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 2048,
                        name: '/assets/[name].[hash:7].[ext]'
                    }
                }]
            }
        ]
    }
};

