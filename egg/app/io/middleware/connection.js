'use strict';
const serviceName = 'socketService';
module.exports = () => {
  return async (ctx, next) => {
    const service = ctx.getViewService(serviceName);
    console.log('>>>>>>>>>>#6 packet')
    if (typeof service.connect === 'function') {
      // socket 连接
      await service.connect();
    }

    await next();

    console.log('>>>>>>>>>>#14 disconnect')

    if (typeof service.disconnect === 'function') {
      // socket 断开连接
      await service.disconnect();
    }
  };
};
