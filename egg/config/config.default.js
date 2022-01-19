'use strict';
const Path = require('path');
module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = 'egg_socket_1622168544530_5598';

  config.serverBaseUrl = '172.31.239.151:9001';
  config.session = {
    renew: true,
    // maxAge: 7 * 24 * 3600 * 1000,
  };
  const getLog = filename => Path.join(appInfo.root, 'logs', appInfo.name, `${filename}.log`);
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
  };
};
