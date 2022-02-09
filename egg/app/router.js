'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller,io } = app;
  router.get('/', controller.home.index);
  io.of('/').route('server', io.controller.task.server);
  io.of('/').route('message', io.controller.task.catch);
  io.of('/').route('catch', io.controller.task.catch);
};
