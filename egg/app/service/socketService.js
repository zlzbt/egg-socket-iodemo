const { Service } = require("egg");

class SocketService extends Service {
    async connect() {
        const { config: { servicetask }, ctx } = this;
        for(const name of servicetask){
            const service = ctx.getViewService(name);
            // 启动 定时 任务
            await service.runtimer();
        }
    }

    async disconnect() {
        console.log('namespace   disconnection!')
        const { config: { servicetask }, ctx } = this;
        for(const name of servicetask){
            const service = ctx.getViewService(name);
            // 停止 定时 任务
            await service.stoptimer();
        }
    }
}
module.exports = SocketService;