const api = (serverUrl, data = {}) => {
    const { warehouseId } = data;
    return {
        // 机器人
        robotApis:{
            getRobotListConsole: `${serverUrl}/api/rms/warehouse/${warehouseId}/robot/status/console`, // GET 获取所有的机器人列表
            getRobotType:  `${serverUrl}/api/basic/warehouse/${warehouseId}/robotType/getByCondition`,  //获取机器人类型
            getMultiTrafficInfo: `${serverUrl}/api/rts/warehouse/${warehouseId}/robot/getMultiTrafficInfo`, // post 查看机器人全路径信息
        },
        // 货架
        bucketApis:{
            getBucketList: `${serverUrl}/api/basic/warehouse/${warehouseId}/rack/query`,  // POST 获取货架列表
        },
        // 左侧列表 机器人 、任务 、作业单
        leftListApis: {
            getTransportOrderList: `${serverUrl}/api/rms/standardized/getTransportOrderList?warehouseId=${warehouseId}`,// POST 获取搬运作业单信息列表
            getTransportOrderCount: `${serverUrl}/api/rms/standardized/getTransportOrderCount?warehouseId=${warehouseId}`,// 获取搬运作业单分类数量
            getTaskLists: `${serverUrl}/api/rms/warehouse/${warehouseId}/job/list`,//获取任务信息列表
            getMessageList: `${serverUrl}/api/basic/warehouse/${warehouseId}/notification/getMessageList`,//告警 根据时间拉取数据
            getAlarmCount: `${serverUrl}/api/basic/warehouse/${warehouseId}/notification/getAlarmCount`, //告警数量统计
        },
        // 左侧图层
        layerApis:{
            areaQuery: `${serverUrl}/api/basic/warehouse/${warehouseId}/area/query`,  //不传参数则查询所有的区域以及子区域
        },
        summaryApis: {
            getRobotInfoSummary:`${serverUrl}/api/rms/warehouse/${warehouseId}/robot/state/statistics`,  //获取机器人汇总信息
            getTransportOrderStatistics:`${serverUrl}/api/rms/standardized/getTransportOrderStatistics?warehouseId=${warehouseId}`,  //作业单任务汇总信息
            getRobotBatteryInfoSummary: `${serverUrl}/api/rms/warehouse/${warehouseId}/robot/avg-power`,  //获取机器人平均电量
            getChargeStationSummary:`${serverUrl}/api/rms/warehouse/${warehouseId}/charger/bind/getStationChargerSummary`,  //充电桩汇总
            getBucketInfoSummary:`${serverUrl}/api/basic/warehouse/${warehouseId}/rack/getBucketInfoSummary`,  //货架汇总
        },
        others:{
            getChargerList: `${serverUrl}/api/basic/warehouse/${warehouseId}/charger/all`, // GET 获取地图充电桩列表
            getPausedState: `${serverUrl}/api/rcs/agv/ctrl/getPausedState`, // 获取急停状态
            getChargeThreshold: `${serverUrl}/api/basic/warehouse/${warehouseId}/config/getChargeThreshold`, //获取低电量配置，
        },
        lockApi: {
            // 根据类型查询所有的锁闭信息 故障锁闭、人工锁闭、货架锁闭
            queryLockInfoByTypes: `${serverUrl}/api/rts/warehouse/${warehouseId}/space-lock/query-by-types`,
        }

        
    }
}
module.exports = api;