const { Service } = require("egg");

class SocketService extends Service {
    async connect() {
        const { config: { servicetask }, ctx } = this;
        const {socket} = ctx;
        for(const {name, room} of servicetask){
            // socket 添加 到 对应的 room
            socket.join(room);

            const service = ctx.getViewService(name);
            // 启动 定时 任务
            await service.runtimer();
        }
    }

    async disconnect() {
        console.log('namespace   disconnection!')
        const { config: { servicetask }, ctx } = this;
        const {socket} = ctx;
        for(const {name} of servicetask){
            const service = ctx.getViewService(name);
            // 停止 定时 任务
            // 与当客户端的连接丢失或者断开后，会自动的将其从房间移除
            await service.stoptimer();
        }
    }
}
module.exports = SocketService;