const { Service } = require("egg");
const api = require('../utils/api');
const { formatData, formatCharger, formatRbtData } = require('../utils/format');
const { runtimerControl, stoptimerControl } = require('../utils/taskTimer');
const { robotRoom: room, socketId2AgvCodeMapKey, warehouse2AgvCodeMapKey } = require('../utils/constant');
const _L = require('lodash');

const pluginName = 'robot-console-plugin';
const mapPluginName = 'map-console-plugin';
const lockPluginName = 'lockpoint-console-plugin';

let timers = {};
class TaskService extends Service {

    robotTimer() {
        let robotTypeMap = this.ctx.getCornerCache('robotTypeMap')

        const timer = setInterval(async () => {
            const { ctx } = this;
            const { socket, warehouseId, session } = ctx;
            const mapZones = session.mapZones || ''.split(',')
            if (!mapZones || mapZones.length === 0) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval mapZones is NULL `, warehouseId)
                return false
            }

            const apis = api('', { warehouseId });
            let chargeConfig = ctx.getCornerCache('robot#chargeThreshold');
            if (!chargeConfig) {
                const chargerData = await ctx.httpGet(`${api('', { warehouseId }).getChargeThreshold}?confingGroup=RCS&configName=MIN_POWER`)
                ctx.setCornerCache('robot#chargeThreshold', chargerData)
            }

            // 查询AGV
            const res = await ctx.httpGet(`${api('', { warehouseId }).robotApis.getRobotListConsole}?zoneCodes=${mapZones}`, {}, true)
            if (res && res.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval getRobotListConsole Error Response: `, res)
                return false
            }

            if (JSON.stringify(robotTypeMap) === "{}") {
                const getAGVType = await ctx.httpPost(apis.robotApis.getRobotType, {}, true);
                if (getAGVType.success) {
                    let map = {};
                    getAGVType.data && getAGVType.data.forEach(item => {
                        map[item.robotTypeCode] = { name: item.robotTypeName, type: item.firstClassification, secondClassification: item.secondClassification }
                    })
                    ctx.setCornerCache('robotTypeMap', map)
                    robotTypeMap = map;
                } else {
                    ctx.logger.error(`[${pluginName}] RobotTimer Interval getRobotType Error Response: `, getAGVType)
                    return false
                }
            }

            // 机器人信息
            const robotListData = (res.data && res.data.statusList) || []

            // 整理机器人数据
            const data = formatData(robotListData, ctx, chargeConfig, robotTypeMap);

            if (Object.keys(data.zoneList).length === 0 && res.success === false) {
                ctx.logger.error('Robot response data:', res)
                return false
            }
            const { zoneList, cardprops, bindContainers } = data;
            // 发送机器人信息
            socket.nsp.to(room).emit('map_message', {
                code: pluginName,
                zoneList,
                cardprops,
                bindContainers,
            })

        }, 1000);
        return timer
    }

    /**
   * 获取图层信息
   * @param { mapZones}
   * @returns 
   */
    async getLayerListData(ctx, mapZones, robotListData = []) {
        const { warehouseId, socket } = ctx;
        const { config: { serverBaseUrl: phoenixRcs } } = this;
        let getAreaType = [];
        if (ctx.session.layout_areaType) {
            getAreaType = ctx.session.layout_areaType || [];
        } else {
            const res = await this.ctx.httpPost(`${api(phoenixRcs).i18nApis.queryWithCode}?language=${this.ctx.__getLocale()}`, { query: { keyCode: 'basic_area_type' } });
            if (res && res.success === false) {
                this.ctx.logger.error(`[${pluginName}] getLayerListData basic_area_type Response Error : `, res)
                return
            }
            getAreaType = res
        }
        const areas = await ctx.httpGet(`${api(phoenixRcs, { warehouseId }).layerApis.areaQuery}`, "", true);
        const areasObj = {};
        if (areas.data && areas.success) {
            areas.data.forEach(area => {
                const { areaType, areaCode, areaName, zoneCode } = area;
                if (mapZones.indexOf(zoneCode) > -1) {
                    if (!areasObj[areaType]) {
                        areasObj[areaType] = []
                    }
                    areasObj[areaType].push({ title: areaName || areaCode, key: areaCode, layerType: 'areaChildren', parentType: areaType })
                }
            })
        }
        const areaTypeOptions = (_L.isArray(getAreaType) ? getAreaType : []).map(e => {
            const { valueCode, i18nCode } = e;
            return { title: i18nCode, key: valueCode, layerType: 'area', children: areasObj[valueCode] }
        }) || []

        const robotOptions = robotListData.map(e => {
            return { title: e.robotCode, key: e.robotCode, layerType: 'robotPath' }
        })
        let layerData = [{
            lock: {
                title: ctx.__('agvConsole.layer.lock.lock'),
                key: 'lock',
                children: [
                    {
                        title: ctx.__('agvConsole.layer.lock.faultLocking'),
                        key: 'faultLocking',
                    }, {
                        title: ctx.__('agvConsole.layer.lock.trolleyLocking'),
                        key: 'trolleyLocking',
                    }, {
                        title: ctx.__('agvConsole.layer.lock.shelfLocking'),
                        key: 'shelfLocking',
                    },
                ],
            },
            robotPath: {
                title: ctx.__('agvConsole.layer.robotPath'),
                key: 'robotPath',
                children: robotOptions,
            },
            area: {
                title: ctx.__('agvConsole.layer.area'),
                key: 'area',
                children: areaTypeOptions
            },
            groundCode: {
                title: ctx.__('agvConsole.layer.groundCode'),
                key: 'groundCode'
            },
        }];
        ctx.session.layout_areaType = getAreaType
        return layerData
    }

    /**
   * 获取统计信息
   */
    async getGlobalStatistics(apis, { taskChartData }) {
        let globalStatisticsData = {
            robotChartData: [],
            taskChartData: [],
            jobChartData: [],
            chargeChartData: [],
            powerChartData: 0,
            rackChartData: [],
        }
        //获取机器人汇总信息
        const getRobotInfoSummary = await this.ctx.httpGet(apis.getRobotInfoSummary);
        if (getRobotInfoSummary && getRobotInfoSummary.success === false) {
            this.ctx.logger.error(`[${pluginName}] RobotTimer Interval getRobotInfoSummary Error Response: `, getRobotInfoSummary)
            globalStatisticsData.robotChartData = []
        } else {
            globalStatisticsData.robotChartData = await this.formatStateTypeI18n(getRobotInfoSummary, 'state')
        }

        //获取小车电量汇总信息
        const getRobotBatteryInfoSummary = await this.ctx.httpGet(apis.getRobotBatteryInfoSummary);
        if (getRobotBatteryInfoSummary && getRobotBatteryInfoSummary.success === false) {
            this.ctx.logger.error(`[${pluginName}] RobotTimer Interval getRobotBatteryInfoSummary Error Response: `, getRobotBatteryInfoSummary)
            globalStatisticsData.powerChartData = 0
        } else {
            globalStatisticsData.powerChartData = getRobotBatteryInfoSummary / 100
        }
        //获取任务汇总信息
        const taskChartDataSummary = Object.keys(taskChartData).map(a => taskChartData[a])
        globalStatisticsData.taskChartData = await this.formatStateTypeI18n(taskChartDataSummary, 'type')
        //获取作业单汇总信息
        const getTransportOrderStatistics = await this.ctx.httpGet(apis.getTransportOrderStatistics);
        if (getTransportOrderStatistics && getTransportOrderStatistics.success === false) {
            this.ctx.logger.error(`[${pluginName}] RobotTimer Interval getTransportOrderStatistics Error Response: `, getTransportOrderStatistics)
            globalStatisticsData.jobChartData = []
        } else {
            globalStatisticsData.jobChartData = await this.formatStateTypeI18n(getTransportOrderStatistics, 'state', 'stateType', 'wcs.')
        }
        //获取充电桩汇总信息
        const getChargeStationSummary = await this.ctx.httpGet(apis.getChargeStationSummary);
        if (getChargeStationSummary && getChargeStationSummary.success === false) {
            this.ctx.logger.error(`[${pluginName}] RobotTimer Interval getChargeStationSummary Error Response: `, getChargeStationSummary)
            globalStatisticsData.chargeChartData = []
        } else {
            globalStatisticsData.chargeChartData = await this.formatStateTypeI18n(getChargeStationSummary, 'label')
        }
        //获取货架汇总信息
        const getBucketInfoSummary = await this.ctx.httpGet(apis.getBucketInfoSummary);
        if (getBucketInfoSummary && getBucketInfoSummary.success === false) {
            this.ctx.logger.error(`[${pluginName}] RobotTimer Interval getBucketInfoSummary Error Response: `, getBucketInfoSummary)
            globalStatisticsData.rackChartData = []
        } else {
            globalStatisticsData.rackChartData = await this.formatStateTypeI18n(getBucketInfoSummary, 'label')
        }

        return [globalStatisticsData];
    }
    /**
     * 状态国际化转换
     * @param {*} data 
     * @param {*} key 
     */
    async formatStateTypeI18n(data = [], key, i18nPrefix = 'stateType', prefix = '') {
        /* if (typeof this.ctx.getLocaleCache === 'function') {
            this.ctx.__getLocale() // 获取并更新当前系统缓存客户端国际化
            await this.ctx.getLocaleCache(); // 获取当前系统动态查询国际化语言
        }
        data.forEach(item => {
            const i18nType = this.ctx.__(`agvConsole.${i18nPrefix}.${prefix}${item[key]}`)
            item[key] = i18nType;
        }) */
        return data
    }

    /**
     * 中控左侧列表信息展示
     * @getRobotListConsole 机器人 @getRobotCount 机器人分类数量
     * @getTaskList 任务 @taskCount 任务分类数量
     * @getTransportOrderList 作业单 @transportOrderCount 作业单分类数量
     * @getMessageList 告警  @getAlarmCount 告警分类数量
     * @getLayerList 图层 
     * @globalStatisticsData 统计
     */
    leftNavTimer() {
        const timer = setInterval(async () => {
            const { config: { serverBaseUrl: phoenixRcs }, ctx } = this;
            const { socket, session, warehouseId } = ctx
            const mapZones = (session.mapZones || '').split(',')
            if (!mapZones || mapZones.length === 0) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval mapZones is NULL `, warehouseId)
            }
            const apis = api(phoenixRcs, { warehouseId });

            // 获取小车列表
            const getRobotListConsole = await ctx.httpGet(`${apis.robotApis.getRobotListConsole}?zoneCodes=${mapZones}`, {}, true)
            if (getRobotListConsole && getRobotListConsole.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval robot Info List Error Response: `, getRobotListConsole)
            }
            const { statistics = {}, statusList: robotListData = [] } = (getRobotListConsole.data) || {}
            // 机器人分类数量
            const getRobotCount = {};
            (statistics.status || []).forEach(ele => {
                const { text, value } = ele || {};
                getRobotCount[text] = value;
            });
            getRobotCount['ALL'] = robotListData.length;

            // 获取任务列表
            let getTaskList = await ctx.httpGet(apis.leftListApis.getTaskLists, {}, true);
            if (getTaskList && getTaskList.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval Task List Error Response: `, getTaskList)
            }
            const getTaskListData = getTaskList.data || [];
            // 获取任务分类数量
            let taskCount = {
                "WAITING": 0,
                "EXECUTING": 0,
                "ALL": getTaskListData.length
            };

            // 任务统计
            const taskChartData = {};
            getTaskListData.forEach(ele => {
                const { jobState } = ele;
                if (!jobState) return;
                if (taskCount[jobState] || taskCount[jobState] === 0) {
                    taskCount[jobState] = taskCount[jobState] + 1
                }
                if (!taskChartData[jobState]) {
                    taskChartData[jobState] = {
                        type: jobState,
                        summary: 1,
                        percent: getTaskListData.length / 1
                    }
                } else {
                    const { summary } = taskChartData[jobState]
                    taskChartData[jobState].summary = summary + 1;
                    taskChartData[jobState].percent = getTaskListData.length / summary + 1;
                }
            });

            // 获取作业单列表
            let getTransportOrderList = await ctx.httpGet(apis.leftListApis.getTransportOrderList);
            if (getTransportOrderList && getTransportOrderList.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval Job List Error Response: `, getTransportOrderList);
                getTransportOrderList = [];
            }
            // 获取作业单分类数量
            let transportOrderCount = await ctx.httpGet(apis.leftListApis.getTransportOrderCount) || {};
            if (transportOrderCount.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval WCS Job Count Error Response: `, transportOrderCount)
            }

            // 获取告警列表
            let getMessageList = await ctx.httpGet(`${api(phoenixRcs, { warehouseId }).leftListApis.getMessageList}`)
            if (getMessageList && getMessageList.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval robot Info List Error Response: `, getMessageList)
                getMessageList = []
            }

            // 获取告警分类数量
            let getAlarmCount = await ctx.httpGet(api(phoenixRcs, { warehouseId }).leftListApis.getAlarmCount) || {};
            if (getAlarmCount.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval robot Info List Error Response: `, getAlarmCount)
                getAlarmCount = {}
            }

            // 获取图层数据
            const getLayerList = await this.getLayerListData(ctx, mapZones, robotListData)

            //获取统计信息
            let globalStatisticsData = await this.getGlobalStatistics(apis.summaryApis, { robotChartData: statistics.status, taskChartData })
            if (globalStatisticsData && globalStatisticsData.success === false) {
                ctx.logger.error(`[${pluginName}] RobotTimer Interval globalStatisticsData List Error Response: `, globalStatisticsData)
            }

            // 左侧列表所有信息格式化
            const total_data = formatTotalDataInfo(robotListData, getTaskListData, getTransportOrderList, getMessageList, getLayerList,
                getRobotCount, transportOrderCount, taskCount, getAlarmCount, globalStatisticsData, ctx);
            const { code, listInfo, count } = total_data

            // 发送机器人统计信息
            socket.nsp.to(room).emit('map_message', {
                code,
                totalType: "total",
                listInfo,
                count
            })

        }, 5 * 1000);
        return timer
    }

    /**
   * 获取机器人类型列表
   */
    async getRobotType() {
        const { socket, warehouseId } = this.ctx
        const { phoenixRcs } = this.config;
        const apis = api(phoenixRcs, { warehouseId });
        const getAGVType = await this.ctx.httpPost(apis.robotApis.getRobotType, {}, true);

        let map = {};
        if (getAGVType.success) {
            getAGVType.data && getAGVType.data.forEach(item => {
                const { robotTypeName, firstClassification, secondClassification = '', sizeInformation } = item;
                const height = sizeInformation && sizeInformation.split('*')[0];
                const width = sizeInformation && sizeInformation.split('*')[1];
                map[item.robotTypeCode] = {
                    name: robotTypeName,
                    type: firstClassification,
                    secondClassification: secondClassification,
                    width, height
                }
            })
        }
        this.ctx.setCornerCache('robotTypeMap', map)
        setTimeout(async () => {
            const robotTypeMap = this.ctx.getCornerCache('robotTypeMap') || {}
            if (Object.keys(robotTypeMap).length !== Object.keys(map).length) {
                await this.getRobotType()
            }
        }, 1000)
    }

    /**
   * 急停状态和获取充电桩
   */
    mapTimer() {
        const { phoenixRcs } = this.config;
        const { warehouseId } = this.ctx;
        const timer = setInterval(async () => {
            // 获取急停状态
            const pausedStateRes = await this.ctx.httpPost(api( phoenixRcs ).mapApis.getPausedState, {}, true);
            let stopState = { stopFlag: "initial" }
            if (pausedStateRes.success) {
                const { isPaused, userName, pausedTime } = pausedStateRes.data
                stopState = { stopFlag: isPaused ? 'stopped' : "initial", userName, pausedTime }
            }
            this.ctx.socket.nsp.to(room).emit('one_key_stop_message', { code: "StopState", stopState })
            // 获取充电桩列表
            const res = await this.ctx.httpGet(api('', { warehouseId }).mapApis.getChargerList)
            if (res.success === false) {
                this.ctx.logger.error('getChargerList err', res)
                return
            }
            const chargerData = formatCharger(res);
            this.ctx.socket.nsp.to(room).emit('map_message', { code: mapPluginName, chargerData })
        }, 1000)
        return timer
    }

    /**
   * 获取机器人全路径信息
   */
    async getAgvTrafficInfo(warehouseId) {
        const socketMap = this.ctx.getCornerCache(socketId2AgvCodeMapKey) || {};
        const mapAagvCodes = this.ctx.getCornerCache(warehouse2AgvCodeMapKey) || {};
        // 上位机对应客户端
        const robot2socketidMap = {};
        const robotCodes = [];
        Object.keys(socketMap).forEach(async (socketId) => {
            const robotCode = socketMap[socketId];
            if (!robotCode) {
                // 成功推送机器人路径规划
                await this.sendAgvLockSocket(socketId, { amrRegion: {} }, 'amrAreaRenderer')
                return false;
            }
            if (!mapAagvCodes[warehouseId] || mapAagvCodes[warehouseId] === 'undefined' || mapAagvCodes[warehouseId].length < 1) {
                return false;
            }

            // 记录一台AGV被多少客户端请求
            if (robot2socketidMap[robotCode]) {
                robot2socketidMap[robotCode].push(socketId);
            } else {
                robot2socketidMap[robotCode] = [];
                robot2socketidMap[robotCode].push(socketId);
            }
            robotCodes.push(robotCode);

            const { phoenixRcs } = this.config;
            const res = await this.ctx.httpPost(`${api(phoenixRcs, { warehouseId }).robotApis.getMultiTrafficInfo}`, mapAagvCodes[warehouseId], true)
            if (res.success === false) {
                await this.sendAgvLockSocket(socketId, {})
                return;
            }
            const agvPath = {};
            let hasPath = false;
            let copyAmrRegion = {};
            const lineList = (res.data && res.data[0] && res.data[0].path && res.data[0].path.lineList) || [];
            const spaceLockLayers = (res.data && res.data[0] && res.data[0].spaceLock && res.data[0].spaceLock.layers) || [];
            if (lineList && lineList.length > 0 || spaceLockLayers.length > 0) {
                hasPath = true;
            }

            // slam 机器人区域显示
            await this.sendAgvLockSocket(socketId, { amrRegion: copyAmrRegion }, 'amrAreaRenderer')
            if (!hasPath) {
                // 成功推送机器人路径规划
                await this.sendAgvLockSocket(socketId, {})
            } else {
                await this.sendAgvLockSocket(socketId, {}, lockPluginName, spaceLockLayers, lineList,)
            }
        })

        // 有选择的机器人，进行上位机数据推送
        if (robotCodes.length > 0) {
            await this.getRobotUIData(robot2socketidMap, robotCodes, warehouseId)
        }
    }

    /**
   * 获取机器人上位机数据
   * @param {*} robot2socketidMap 
   * @param {*} robotCodes 
   */
    async getRobotUIData(robot2socketidMap = {}, robotCodes = [], warehouseId) {
        const { phoenixRcs } = this.config;
        const apis = api(phoenixRcs, { warehouseId });
        // 根据agvCode查询上位机数据
        const res = await this.ctx.httpPost(apis.robotApis.getRobotUiList, robotCodes)
        if (res && res.success === false) {
            this.ctx.logger.error(`getRobotUIData ${apis.getRobotUiList}|${robotCodes}|response: ${res}`)
            return
        }
        // 根据agvCode查询上位机异常数据
        const exception_res = {} || await this.ctx.httpPost(apis.getRobotErrors, robotCodes)
        if (exception_res && exception_res.success === false) {
            this.ctx.logger.error(`getRobotUIData ${apis.getRobotErrors}|${robotCodes}|response: ${exception_res}`)
            return
        }
        const resData = res.filter(a => a);
        // 查询上位机数据发送给客户端
        resData.forEach((rbt = {}) => {
            // 机器人上位机数据
            const robotSocketIds = robot2socketidMap[rbt.robotCode]
            // 机器人上位机异常数据
            const robot_exception = exception_res[rbt.robotCode]
            // 数据格式化
            const sendData = formatRbtData(this.ctx, rbt, robot_exception)
            this.sendRobotUIDataSocket(robotSocketIds, sendData)
        })
        if (resData.length === 0) {
            robotCodes.forEach(robotCode => {
                const robotSocketIds = robot2socketidMap[robotCode]
                const sendData = formatRbtData(this.ctx)
                this.sendRobotUIDataSocket(robotSocketIds, sendData)
            })
        }
    }

    // 推送上位机数据
    async sendRobotUIDataSocket(socketIds = [], sendData, pluginCode = 'robotUIDataType') {
        socketIds.forEach(socketId => this.ctx.socket.nsp.to(socketId).emit('robot_ui_message', {
            code: pluginCode,
            robotUIData: sendData
        }))
    }

    // 推送数据
    async sendAgvLockSocket(socketId, pathList = {}, code = lockPluginName, spaceLockLayers, lineList) {
        let hasPath = true;
        if (_L.isEmpty(pathList) && (_L.isEmpty(spaceLockLayers) || !spaceLockLayers)) {
            hasPath = false
        }
        this.ctx.socket.nsp.to(socketId).emit('map_message', {
            code,
            bindCode: 'agvPathLockType',
            customPoints: pathList,
            // cardprops: this.ctx.helper.i18nListFormat(lockcardprops, 'agvConsole.lockcard.', this.ctx),
            bindContainers: {},
            spaceLockLayers,
            lineList,
            hasPath
        })
    }

    /**
   * 发送机器人全路径
   */
    robotTrafficInfoTimer() {
        const timer = setInterval(async () => {
            const { warehouseId } = this.ctx;
            // 发送机器人全路径
            await this.getAgvTrafficInfo(warehouseId);
        }, 1000);
        return timer
    }

    async runtimer() {
        const { socket } = this.ctx;

        // 获取机器人类型列表
        await this.getRobotType();

        //  展示在地图上的小车数据
        const timer = this.robotTimer();
        // 左侧列表数据统计包含（机器人、任务、作业单、告警、图层、统计）
        const leftNavTimer = this.leftNavTimer();
        // 机器人路径
        const robotTrafficTimer = this.robotTrafficInfoTimer();
        // 充电桩信息以及急停状态
        const mapTimer = this.mapTimer();

        const timersObj = { timer, leftNavTimer, mapTimer }
        runtimerControl({ socket, timers, pluginName, leftNavTimer, timersObj })
    }

    async stoptimer() {
        const { socket } = this.ctx;
        stoptimerControl({ socket, timers, timerArr: ['timer', 'leftNavTimer'] })
    }
}
module.exports = TaskService;