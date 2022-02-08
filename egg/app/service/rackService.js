const { Service } = require("egg");
const api = require('../utils/api');
const {runtimerControl, stoptimerControl} = require('../utils/taskTimer');
const {rackRoom: room} = require('../utils/constant');
const pluginName = 'bucket-console';

let timers = {};
class TaskService extends Service {
    async bucketTimer() {
        const { ctx } = this;
        const { warehouseId } = ctx;
        const timer = setInterval(async () => {
            const res = await ctx.httpPost(api('', { warehouseId }).bucketApis.getBucketList, {}, {
                timeout: 50000, // 网络不稳定，现场导致接口请求超时的问题
                getBody: true,
            });
            if (res.success === false) {
                this.ctx.logger.error('[bucketTimer] Error Interval Data: ', res);
                // return ctx.callback(res);
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

    async runtimer() {
        const { socket } = this.ctx;
        const timer = await this.bucketTimer();
        runtimerControl({ socket, timers, pluginName, timersObj: {timer}})
    }

    async stoptimer() {
        const { socket } = this.ctx;
        stoptimerControl({socket, timers, timerArr: ['timer']})
    }
}
module.exports = TaskService;