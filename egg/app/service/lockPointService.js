const { Service } = require("egg");
const api = require('../utils/api');
const { formaSpaceLockAreastData } = require('../utils/format');
const {runtimerControl, stoptimerControl} = require('../utils/taskTimer');
const {lockpointRoom: room} = require('../utils/constant');
const pluginName = 'lockpoint-console-plugin';
/**
 * 定时器
 */
let timers = {}
class TaskService extends Service {

  async lockTimer() {
    const timer = setInterval(async () => {
      const { ctx } = this;
      const { warehouseId } = ctx;
      const socketMap = ctx.getCornerCache() || {};
      const spaceLockType = ctx.getCornerCache() || {};
      // 故障锁闭
      let param = '?ownerType=ERROR';
      if (spaceLockType[warehouseId] && Array.isArray(spaceLockType[warehouseId])) {
        spaceLockType[warehouseId].forEach(type => {
          param = param.indexOf(type) > -1 ? param : param + `&ownerType=${type}`;
        })
      }
      const res = await ctx.httpGet(`${api('', { warehouseId }).lockApi.queryLockInfoByTypes}${param}`);
      if (res && res.success === false) {
        console.log(`[${pluginName}] LockTimer Interval Error Response: `, res)
        // return ctx.callback(res)
      }
      const spaceLockAreas = formaSpaceLockAreastData(res);
      ctx.socket.nsp.to(room).emit('map_message', {...spaceLockAreas, code: pluginName})
    }, 1000)
    return timer
  }

  async runtimer() {
    const { socket } = this.ctx;
    const timer = await this.lockTimer()
    const timersObj = {timer}
    runtimerControl({socket, timers, pluginName, timersObj})
  }

  async stoptimer() {
    const { socket } = this.ctx;
    stoptimerControl({socket, timers, timerArr: ['timer']})
  }
}
module.exports = TaskService;