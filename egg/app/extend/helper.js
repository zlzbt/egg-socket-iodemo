const moment = require('moment');
const formatDate = (data, keys, format = 'YYYY-MM-DD HH:mm:ss') => {
    return [].concat(keys).reduce((mol, key) => {
        if (typeof mol[key] === 'number') {
            mol[key] = moment(mol[key]).format(format);
        }
        return mol;
    }, data);
}

const dateFormat = (format) => {
    var o = {
      "M+": this.getMonth() + 1,                      //月份
      "d+": this.getDate(),                           //日
      "h+": this.getHours(),                          //小时
      "m+": this.getMinutes(),                        //分
      "s+": this.getSeconds(),                        //秒
      "q+": Math.floor((this.getMonth() + 3) / 3),    //季度
      "S": this.getMilliseconds()                     //毫秒
    };
  
    if (/(y+)/.test(format))
      format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  
    for (var k in o)
      if (new RegExp("(" + k + ")").test(format))
        format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  
    return format;
  }

const filtEmpty = data => {
    const query = {};
    if (data && typeof data === 'object') {
        Object.keys(data).forEach(k => {
            const c = data[k];
            if (typeof c !== 'undefined' && c !== '' && toString.call(c) !== '[object Null]') {
                if (Array.isArray(c) && c.length === 0) {
                    return;
                }
                query[k] = c;
            }
        });
    }
    return query;
}

module.exports = { formatDate, dateFormat, filtEmpty, }