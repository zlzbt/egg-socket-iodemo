const runtimerControl = ({socket, timers, pluginName, timersObj}) => {
    if (!timers[socket.nsp.name]) {
      console.log(`[${pluginName}] create ${socket.nsp.name} namespace`)
      timers[socket.nsp.name] = {
        socketids: [socket.id],
        ...timersObj
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
const stoptimerControl = ({socket, timers, timerArr}) => {
    const index = timers[socket.nsp.name].socketids.indexOf(socket.id)
    if (index > -1) {
      console.log(`remove ${socket.nsp.name} namespace connection ${socket.id}`)
      timers[socket.nsp.name].socketids.splice(index, 1)
      if (timers[socket.nsp.name].socketids.length === 0) {
        console.log(`${socket.nsp.name} namespace no connections remove timer`);
        timerArr.forEach(timer => {
          clearInterval(timers[socket.nsp.name][timer])
        })
        
        delete timers[socket.nsp.name]
      }
    } else {
      console.log(`Not found [${socket.id}] connect`)
    }
}
module.exports = {runtimerControl, stoptimerControl}