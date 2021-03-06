"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * enhances the webpack config to add url-loader on fonts loaded through css
 */
exports.fontPlugin = (nextConfig = {}) => {
    return Object.assign({}, nextConfig, {
        webpack(config, options) {
            if (!options.defaultLoaders) {
                throw new Error("This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade");
            }
            config.module.rules.push({
                test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
                use: [
                    {
                        loader: "url-loader",
                        options: {
                            limit: 8192,
                            fallback: "file-loader",
                            publicPath: "/_next/static/fonts/",
                            outputPath: "static/fonts/",
                            name: "[name]-[hash].[ext]"
                        }
                    }
                ]
            });
            if (typeof nextConfig.webpack === "function") {
                return nextConfig.webpack(config, options);
            }
            return config;
        }
    });
};
//# sourceMappingURL=font-plugin.js.map