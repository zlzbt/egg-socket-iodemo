'use strict';
const {robotRoom, rackRoom, lockpointRoom} = require('./../app/utils/constant');
module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = 'egg_socket_1622168544530_5598';

  config.serverBaseUrl = '172.31.239.151:9001';
  config.session = {
    renew: true,
    // maxAge: 7 * 24 * 3600 * 1000,
  };

  config.servicetask = [
    { room: rackRoom, name: 'rackService' },
    { room: lockpointRoom, name: 'lockPointService' },
    { room: robotRoom, name: 'robotService' },
  ];
	config.io = {
		init: { }, // passed to engine.io
		namespace: {
			'/': {
			  connectionMiddleware: ['connection'], //中间件
			  packetMiddleware: [],//中间件
			},
			'/catch': {},
		},
	}
  return {
    ...config,
  };
};
