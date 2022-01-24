// 框架会把 app/extend/application.js 中定义的对象与 Koa Application 的 prototype 对象进行合并，在应用启动时会基于扩展后的 prototype 生成 app 对象。

const cacheSymbol = Symbol('CornerStone#Cache');
module.exports = {
    [cacheSymbol]: new Map(),
    
    setCornerCache(key, value) {
        this[cacheSymbol].set(key, value);
    },
    getCornerCache(key) {
        const value = this[cacheSymbol].get(key) || '';
        return value;
    },
}