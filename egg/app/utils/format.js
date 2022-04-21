const _L = require('lodash');
const { cardprops, lockcardprops } = require('../utils/index');

const formaSpaceLockAreastData = (rendererData) => {
  if (!Array.isArray(rendererData)) return { hasLockArea: false }
  const lockAreaType = {};
  rendererData.forEach(ele => {
    const { ownerType, ownerId, boundingBox } = ele;
    boundingBox.ownerType = ownerType;
    if (!lockAreaType[`${ownerId}`]) {
      lockAreaType[`${ownerId}`] = boundingBox
    }
  });
  if (_L.isEmpty(lockAreaType)) {
    return { lockAreaType, hasLockArea: false }
  } else {
    return { lockAreaType }
  }
}

/**
 * 格式化渲染数据
 * @param {Data} rendererData 
 */
const formatData = (rendererData, ctx, chargeConfig, robotTypeMap) => {
  const zoneList = {}
  const bindContainers = {}
  rendererData.forEach(ele => {
    const { robotCode, direction, pointCode, power, x, y,
      basicInfo, job, onlineState, isStop, isAvoidingObstacle, workState, robotStateDisplay, trafficReason, isDspError, errors, loadingInfo } = ele;
    if (!basicInfo) return false;
    const { zoneCode, robotTypeCode = 'UNKNOWN' } = basicInfo;

    // 小车没有坐标或者没有所属库区 不在地图上展示
    if (x == null && y == null || !zoneCode) return false;

    const jobType = job ? job.jobType : null;
    const trafficErr = typeof trafficReason === 'string' && trafficReason.length > 0;

    //判断小车状态是错误还是警告是否是警告
    const errorLevel = errors[0] && errors[0].level;
    const isError = errorLevel >= 3 ? true : false;
    const isWarning = errorLevel < 3 ? true : false;

    // 是否是叉车
    let isForkLift = false;

    /**
     * ROBOT已经绑定点货架信息 
     * isVirtual 是否是虚拟货架
     * isLoading 是否绑定货架
     * loadCodes 绑定货架的code
     */
    const { isVirtual, isLoading, loadCodes } = loadingInfo || {};

    // 记录货架绑定机器人关系
    if (isVirtual) {
      bindContainers[loadCodes] = robotCode
    }

    const type = (robotTypeMap[robotTypeCode] || {}).type
    let newRobotType;
    switch (type) {
      case 'ROLLER':
        const secondClassification = (robotTypeMap[robotTypeCode] || {}).secondClassification
        if (secondClassification === 'MULT_ROLLER_AGV') {
          newRobotType = 'MULT_ROLLER';  //滚筒车
        } else {
          newRobotType = 'ROLLER';  //滚筒车
        }
        break;
      case 'FORKLIFT':
        isForkLift = true;
        newRobotType = type;
        break;
      default:
        newRobotType = type;
    }

    const viewType = `${newRobotType}_${onlineState === 'UNREGISTERED' ? onlineState : (isWarning && (power >= chargeConfig) ? (isAvoidingObstacle ? 'BARRIER' : 'WARNING') : (
      onlineState === 'REGISTERED' ? (`${onlineState}_${isError ? (isDspError ? 'DSP_ERROR' : 'ERROR') : (power < chargeConfig && workState !== 'CHARGING' ? 'LOWER_POWER' : workState)
        }`) : onlineState
    ))}${isLoading ? '_BIND' : ''}`;
    const { width, height } = robotTypeMap[robotTypeCode];
    const point = {
      code: robotCode,
      robotPointCode: pointCode,
      systemState: onlineState,
      onlineState: onlineState,
      type: robotTypeCode,
      isStop,
      state: robotStateDisplay,
      power: power + '%',
      jobType,
      containerCode: _L.trim(loadCodes),
      loadCodes: _L.trim(loadCodes),
      point: `(${x}, ${y})`,
      viewType,
      direction: direction ? direction.toFixed(2) : direction,
      trafficReason,
      rotation: -direction, // pixi.js 顺时针旋转  rcs是逆时针旋转
      x, y, width, height
    };

    if (!zoneList[zoneCode]) {
      zoneList[zoneCode] = []
    }
    zoneList[zoneCode].push(point)
    if (trafficErr) {
      point.trafficReason = trafficReason;
    }
  });

  return {
    zoneList,
    /* cardprops: ctx.helper.i18nListFormat(cardprops, 'agvConsole.card.', ctx),
    lockcardprops: ctx.helper.i18nListFormat(lockcardprops, 'agvConsole.lockcard.', ctx), */
    bindContainers
  };
}

/**
 * 格式化统计数据
 * @param {*} getRobotInfo 
 * @param {*} getTaskList 
 * @param {*} getTransportOrderList 
 * @param {*} getMessageList 
 * @param {*} getRobotCount 
 * @param {*} transportOrderCount 
 * @param {*} taskCount 
 * @param {*} getAlarmCount 
 * @param {*} globalStatisticsData 
 * @returns 
 */
const formatTotalDataInfo = (getRobotInfo = [], getTaskList = [], getTransportOrderList = [], getMessageList = [], getLayerList = [], getRobotCount, transportOrderCount, taskCount, getAlarmCount, globalStatisticsData = [], ctx) => {
  getRobotInfo.forEach((item, index) => {
    const { workState, onlineState, robotCode, robotType } = item;
    getRobotInfo[index].inOnline = onlineState === 'REGISTERED' ? true : false
    getRobotInfo[index].workState = workState;
    getRobotInfo[index].key = robotCode
    robotType === 'ROBOT' ? getRobotInfo[index].robotType = 'CARRIER' : ''
    switch (workState) {
      case 'ERROR':
        getRobotInfo[index].rbtStateIcon = 'error';
        break;
      case 'LOCKED':
        getRobotInfo[index].rbtStateIcon = 'locked';
        break;
      case 'BUSY':
        getRobotInfo[index].rbtStateIcon = 'task';
        break;
      case 'EXCHANGE_BATTERY':
        getRobotInfo[index].rbtStateIcon = 'charging';
        break;
      case 'CHARGING':
        getRobotInfo[index].rbtStateIcon = 'charging';
        break;
      default:
        getRobotInfo[index].rbtStateIcon = 'free';
        break;
    }
  })

  getTaskList.forEach((item, index) => {
    const { createTime, jobSn, robotCode, jobRunningState, topFaces, targetPointCode, sourcePointCode, isLetDown } = item;
    getTaskList[index].key = jobSn;
    getTaskList[index].jobCreateTime = createTime ? createTime.slice(createTime.indexOf(' ')) : '';
    getTaskList[index].taskState = jobRunningState
    getTaskList[index].robotCode = robotCode
    getTaskList[index].operationFace = topFaces
    getTaskList[index].bucketPointCode = sourcePointCode
    getTaskList[index].destPointCode = targetPointCode
    getTaskList[index].letDown = isLetDown
  })

  getTransportOrderList.forEach((item, index) => {
    const { createdDate, orderId } = item;
    getTransportOrderList[index].key = orderId;
    getTransportOrderList[index].jobCreateTime = createdDate ? createdDate.slice(createdDate.indexOf(' ')) : '';
    getTransportOrderList[index].taskState = item.jobState;
  })

  return {
    code: 'leftNavMsg',
    listInfo: {
      robot: getRobotInfo,
      workOrder: getTransportOrderList,
      task: getTaskList,
      notice: getMessageList,
      layer: getLayerList,
      stats: globalStatisticsData
    },
    count: {
      robot: formatTotalCount(getRobotCount, ctx),
      workOrder: formatTotalCount(transportOrderCount, ctx, 'wcs.'),
      task: formatTotalCount(taskCount, ctx),
      notice: formatTotalCount(getAlarmCount, ctx)
    }
  }
}

/**
 * 格式化统计数据
 */
const formatTotalCount = (countData = {}, ctx, prefix = '', module = 'agvConsole.stateType.') => {
  const counts = []
  Object.keys(countData).forEach(key => {
    counts.push({
      label: key || ctx.__(`${module}${prefix}${key}`),
      number: countData[key],
      key: key
    })
  })
  return counts
}

/**
 * 格式化充电桩数据
 * @param {*} data 
 * @param {*} ctx 
 */
const formatCharger = (data = [], ctx) => {
  const ncd = []
  data.forEach(c => {
    const { id, chargerCode, mapCodeAndVersion, enabled = 0, chargerPortType, chargerType } = c
    // const viewType = enabled === 1 ? 'CHARGER_ENABLE' : 'CHARGER_DISABLE'
    const viewType = enabled ? 'CHARGER_ENABLE' : 'CHARGER_DISABLE'
    ncd.push({
      id,
      viewType,
      chargerCode,
      mapCodeAndVersion,
      chargerPortType,
      chargerType
    })
  })
  return ncd;
}

/**
 * 上位机数据格式化
 * @param {*} rbt 
 */
const formatRbtData = (ctx, rbt = {}, robot_exception = []) => {
  const { robotCode, executingCmd, robotCmdState, robotOrderId, robotDirection, coordinate, speed, power, gyroConfirmed, touchLimitConfirmed, motorEnabled, isSleep = true, isOnCode,
    isLocated, isLoad, isObstacle = true, podHeight, podDirection, gyroTemp, batteryTemp, leftMotorTemp, rightMotorTemp, liftMotorTemp, servoMotorTemp,
    extensionDeviceFlag = false, extensionLoad = "N/A", extensionState = "IDLE" } = rbt
  const { lowerErrors = [], upperErrors = [], otherDiviceErrors = [] } = formatRbtError(robot_exception)
  const robotUIDataList = [{
    type: "current",
    title: ctx.__("agvConsole.rbtCard.currentCommand"),
    list: [
      {
        type: "normal",
        label: ctx.__("agvConsole.rbtCard.commandSerialNumber"),
        value: robotOrderId
      },
      {
        type: "normal",
        label: ctx.__("agvConsole.rbtCard.commandContent"),
        value: executingCmd
      }
    ]
  },
  {
    type: "timming",
    title: ctx.__("agvConsole.rbtCard.commandInfo"),
    list: [
      {
        type: robotCmdState == 0 ? "primary" : robotCmdState == 1 ? "normal" : "error",
        text: robotCmdState == 0 ? ctx.__("agvConsole.rbtCard.currentCommandComplete") :
          robotCmdState == 1 ? ctx.__("agvConsole.rbtCard.currentCommandInExecution") : ctx.__("agvConsole.rbtCard.currentCommandException")
      },
      {
        type: isOnCode ? "primary" : "error",
        text: isOnCode ? ctx.__("agvConsole.rbtCard.onCode") : ctx.__("agvConsole.rbtCard.notOnCode")
      },
      {
        type: isLocated ? "primary" : 'error',
        text: isLocated ? ctx.__("agvConsole.rbtCard.located") : ctx.__("agvConsole.rbtCard.notLocated")
      },
      {
        type: isObstacle ? 'error' : "primary",
        text: isObstacle ? ctx.__("agvConsole.rbtCard.obstaclesAhead") : ctx.__("agvConsole.rbtCard.noObstaclesAhead")
      },
      {
        type: gyroConfirmed ? "primary" : 'error',
        text: gyroConfirmed ? ctx.__("agvConsole.rbtCard.gyroCorrectionComplete") : ctx.__("agvConsole.rbtCard.gyroCorrectionIncomplete")
      },
      {
        type: touchLimitConfirmed ? "primary" : 'error',
        text: touchLimitConfirmed ? ctx.__("agvConsole.rbtCard.touchLimitConfirmed") : ctx.__("agvConsole.rbtCard.touchLimitNotConfirmed")
      },
      {
        type: isLoad ? "primary" : 'normal',
        text: isLoad ? ctx.__("agvConsole.rbtCard.carryRack") : ctx.__("agvConsole.rbtCard.noCarryRack")
      },
      {
        type: motorEnabled ? "primary" : 'normal',
        text: motorEnabled ? ctx.__("agvConsole.rbtCard.motorEnabled") : ctx.__("agvConsole.rbtCard.motorDisable")
      },
      {
        type: isSleep ? "normal" : 'primary',
        text: isSleep ? ctx.__("agvConsole.rbtCard.dormant") : ctx.__("agvConsole.rbtCard.notDormant"),
      },
    ]
  }, {
    type: "lowerError",
    title: ctx.__("agvConsole.rbtCard.lowerError"),
    list: lowerErrors
  },
  {
    type: "upperError",
    title: ctx.__("agvConsole.rbtCard.upperError"),
    list: upperErrors
  }
  ]
  // 增加外部设备信息
  if (extensionDeviceFlag) {
    // 避免带载状态字符串为空
    const extensionLoadStr = isNullUndefined(extensionLoad) ? "N/A" : extensionLoad
    // 添加外部设备信息
    robotUIDataList.push({
      type: "otherDivice",
      title: ctx.__("agvConsole.rbtCard.otherDivice"),
      list: [
        {
          type: extensionState === 'BUSY' ? "primary" : extensionState === 'IDLE' ? "normal" : "error",
          text: extensionState === 'IDLE' ? ctx.__("agvConsole.rbtCard.commandComplete") :
            extensionState === 'BUSY' ? ctx.__("agvConsole.rbtCard.commandInExecution") : ctx.__("agvConsole.rbtCard.commandException")
        },
        {
          type: "primary",
          text: extensionLoadStr
        }]
    })
    // 添加外部设备异常信息
    robotUIDataList.push({
      type: "otherDiviceError",
      title: ctx.__("agvConsole.rbtCard.otherDiviceError"),
      list: otherDiviceErrors
    })
  }
  return { robotUIDataList, rbt }
}

/**
 * 格式化上下位机异常
 * @param {*} data 
 */
const formatRbtError = (data = []) => {
  const lowerErrors = [], upperErrors = [], otherDiviceErrors = []
  data.forEach(exp => {
    const { errorType, errorLevel, errorCode, errorMsg } = exp
    const type = errorLevel === 0 ? 'error' : 'warn'
    const error_data = { label: errorCode, value: errorMsg, type }
    if (errorType === 0) {
      lowerErrors.push(error_data)
    }
    if (errorType === 1) {
      upperErrors.push(error_data)
    }
    if (errorType === 2) {
      otherDiviceErrors.push(error_data)
    }
  })
  return { lowerErrors, upperErrors, otherDiviceErrors }
}

module.exports = { formaSpaceLockAreastData, formatData, formatTotalDataInfo, formatCharger, formatRbtData }