/* eslint valid-jsdoc: "off" */

'use strict';

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1622168544530_5598';

  // add your middleware config here
  config.middleware = [];
	
  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };
	config.io = {
		init: { }, // passed to engine.io
		namespace: {
			'/': {
			  connectionMiddleware: [], //中间件
			  packetMiddleware: [],//中间件
			},
			'/catch': {},
			'/example': {
			  connectionMiddleware: [],
			  packetMiddleware: [],
			},
		},
	}
  return {
    ...config,
    ...userConfig,
  };
};
