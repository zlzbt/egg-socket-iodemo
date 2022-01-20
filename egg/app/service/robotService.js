const { Service } = require("egg");
const api = require('../utils/api');
const room = 'BUCKET_DATA';
const pluginName = 'robot-console-plugin';

let timers = {};
class TaskService extends Service{
    async runtimer(){
        const { socket } = this.ctx;
    }

    async stoptimer() {
        const { socket } = this.ctx;
        clearInterval(timers[socket.nsp.name].timer)
        delete timers[socket.nsp.name];
        console.log(`remove ${socket.nsp.name} namespace connection ${socket.id}`)
    }
}
module.exports = TaskService;