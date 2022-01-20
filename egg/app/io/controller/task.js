'use strict';
/**
 * 与client端进行socket通信处理中心
 */
const Controller = require('egg').Controller;
class homeController extends Controller {
  async server() {
    const { ctx, app } = this;
    const nsp = app.io.of('/');
    const message = ctx.args[0] || {};
    const socket = ctx.socket;
    const socketId = socket.id;  //发过来信息的  ws 连接 id
    await nsp.emit('server', "服务器收到")   //这里注意全部用户都会接收到 只要链接着
    //   await nsp.sockets[socketId].emit("server","服务器收到")  //只发送信息给这个socketId 的ws而且只有他会接受到
    /* setTimeout(()=>{
      nsp.sockets[socketId].emit("server","模拟实时推送1")  //
    },1000)
    setTimeout(()=>{
          nsp.sockets[socketId].emit("server","模拟实时推送2")  //
    },1000) */
  }

  async catch() {
    const { ctx, app } = this;
    const nsp = app.io.of('/catch');
    const message = ctx.args[0] || {};
    const socket = ctx.socket;
    const socketId = socket.id;  //发过来信息的  ws 连接 id
    await nsp.emit('catch', message, socketId)   //这里注意全部用户都会接收到 只要链接着
  }
}
module.exports = homeController;