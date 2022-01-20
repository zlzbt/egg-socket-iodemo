const { Service } = require("egg");
const api = require('../utils/api');
const room = 'BUCKET_DATA';
const pluginName = 'bucket-console-plugin';

let timers = {};
class TaskService extends Service{
    async bucketTimer(){
        const { ctx } = this;
        const { warehouseId } = ctx;
        const timer = setInterval(async () => {
            const res = await ctx.httpPost(api('', {warehouseId}).bucketApis.getBucketList, {}, {
                timeout: 50000, // 网络不稳定，现场导致接口请求超时的问题
                getBody: true,
            });
            if (res.success === false) {
                this.ctx.logger.error('[bucketTimer] Error Interval Data: ', res);
                return ctx.callback(res);
            }
            const zoneList = {};
            (res.data || []).forEach(ele => {
                if (!ele.zoneCode || !ele.pointCode || ele.pointCode === 'null' || ele.pointCode === '-1') {
                    return false;
                }
                let viewType = 'UNKNOWN';
                if (ele.enabled) {
                    viewType = 'MOBILE_BUCKET_ENABLE' // 启用
                } else {
                    viewType = 'MOBILE_BUCKET_DISABLE' // 禁用
                }
                const { pointCode, rackCode, heading = 0, digitalCode, type: bt } = ele
                const realHeading = heading ? heading / 100 : 0;
                const rack_rotation = (2.5 - realHeading / 180) * Math.PI;
                const point = {
                    digital_code: digitalCode,
                    code: rackCode,
                    viewType,
                    pointCode,
                    rotation: rack_rotation,
                    heading: `${realHeading}°`
                }
                // 设置货架规格
                point.width = bt.width
                point.length = bt.length
                point.height = bt.height
                if (bt.virtualType === 'virtual') {
                    if (ele.containerCode) {
                        point.viewType = 'CONTAINER'
                    } else {
                        point.viewType = 'VIRTUAL_FORKLIFT'
                    }
                } else if (bt.moveType === 'fixed') {
                    point.viewType = 'FIXED_BUCKET'
                }
                // 笼车
                if (bt.applyType === 'cageCar') {
                    point.viewType = ele.cageCarState || 'ready'
                }
                if (!(ele.zoneCode in zoneList)) {
                    zoneList[ele.zoneCode] = [];
                }
                zoneList[ele.zoneCode].push(point);
            });
            this.ctx.socket.nsp.to(room).emit('map_message', {
                code: pluginName,
                zoneList,
            });
        }, 1000)
        return timer;
    }

    async runtimer(){
        const { socket } = this.ctx;
        if (!timers[socket.nsp.name]) {
            console.log(`[${pluginName}] create ${socket.nsp.name} namespace`)
            const timer = await this.bucketTimer()
            timers[socket.nsp.name] = {
                timer: timer,
                socketids: [socket.id]
            }
        } else {
            console.log(`update ${socket.nsp.name} namespace connection ${socket.id}`)
            const index = timers[socket.nsp.name].socketids.indexOf(socket.id)
            if (index > -1) {
                console.log(`${socket.nsp.name} namespace existing connection ${socket.id}`)
            } else {
                timers[socket.nsp.name].socketids.push(socket.id)
            }
        }
    }

    async stoptimer() {
        const { socket } = this.ctx;
        const index = timers[socket.nsp.name].socketids.indexOf(socket.id)
        if (index > -1) {
            console.log(`remove ${socket.nsp.name} namespace connection ${socket.id}`)
            timers[socket.nsp.name].socketids.splice(index, 1)
            if (timers[socket.nsp.name].socketids.length === 0) {
                console.log(`${socket.nsp.name} namespace no connections remove timer`)
                clearInterval(timers[socket.nsp.name].timer)
                delete timers[socket.nsp.name]
            }
        } else {
            console.log(`Not found [${socket.id}] connect`)
        }
    }
}
module.exports = TaskService;