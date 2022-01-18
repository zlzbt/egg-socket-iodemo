'use strict';

const Controller = require('egg').Controller;
let i = 0, j = 0;
class homeController extends Controller {
   async server() {
      console.log('>>>>>>>>>>>server', i++)
      const { ctx, app } = this;
      const nsp = app.io.of('/');
      const message = ctx.args[0] || {};
      const socket = ctx.socket;
      const socketId = socket.id;  //发过来信息的  ws 连接 id
      await nsp.emit('server',"服务器收到")   //这里注意全部用户都会接收到 只要链接着
	//   await nsp.sockets[socketId].emit("server","服务器收到")  //只发送信息给这个socketId 的ws而且只有他会接受到
	  /* setTimeout(()=>{
		  nsp.sockets[socketId].emit("server","模拟实时推送1")  //
	  },1000)
	  setTimeout(()=>{
	  		  nsp.sockets[socketId].emit("server","模拟实时推送2")  //
	  },1000) */
    }

    async catch() {
      console.log('>>>>>>>>>>>catch', j++)
      const { ctx, app } = this;
      const nsp = app.io.of('/catch');
      const message = ctx.args[0] || {};
      const socket = ctx.socket;
      const socketId = socket.id;  //发过来信息的  ws 连接 id
      await nsp.emit('catch',"服务器收到")   //这里注意全部用户都会接收到 只要链接着
      //   await nsp.sockets[socketId].emit("server","服务器收到")  //只发送信息给这个socketId 的ws而且只有他会接受到
    }
}
module.exports = homeController;