'use strict';
const serviceName = 'socketService';
module.exports = () => {
  return async (ctx, next) => {
    const service = ctx.getViewService(serviceName);
    if (typeof service.connect === 'function') {
      // socket 连接
      await service.connect();
    }

    await next();

    if (typeof service.disconnect === 'function') {
      // socket 断开连接
      await service.disconnect();
    }

    // 连接中断
    // console.log('namespace', ctx.socket.nsp.name, 'disconnection!')
  };
};
