'use strict';
const {robotRoom, rackRoom, lockpointRoom} = require('./../app/utils/constant');
module.exports = appInfo => {
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = 'egg_socket_1645756188220_7135';

  config.serverBaseUrl = 'http://172.31.239.58:9001';
  config.session = {
    renew: true,
    maxAge: 7 * 24 * 3600 * 1000,
  };

  config.servicetask = [
    /* { room: rackRoom, name: 'rackService' },
    { room: lockpointRoom, name: 'lockPointService' }, */
    { room: robotRoom, name: 'robotService' },
  ];

  // 关闭 csrf
  config.security = {
    csrf: {
      enable: false,
    },
  };

  // cors 跨域配置
  config.cors = {
    origin: '*',
    // 允许请求的方法
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
  };

	config.io = {
		init: { }, // passed to engine.io
		namespace: {
			/* '/': {
			  connectionMiddleware: ['connection'], //中间件
			  packetMiddleware: [],//中间件
			}, */
      '/control': {
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
