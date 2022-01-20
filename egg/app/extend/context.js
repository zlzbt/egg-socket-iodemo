/**
 * 1：框架会把 app/extend/context.js 中定义的对象与 Koa Context 的 prototype 对象进行合并，在处理请求时会基于扩展后的 prototype 生成 ctx 对象。
 *:2：一般来说属性的计算在同一次请求中只需要进行一次，那么一定要实现缓存，否则在同一次请求中多次访问属性时会计算多次，这样会降低应用性能。使用Symbol
 */

const FormStream = require('formstream');
const path = require('path');

const curl = Symbol('Context#curl');
const curlCookie = Symbol('Context#Evo#curlCookie');

const handleOpts = (data, opts) => (typeof opts === 'boolean' ? { data, getBody: opts } : Object.assign({ data }, opts));
module.exports = {
    async [curl](api, method, opts){
        const { app, host, request, Authorization } = this;
        const { getBody, formFiles, formData, noCatch, noWarehouse, noUser, ...options } = opts;
        const config = app.config;
        const baseUrl = config.serverBaseUrl || host;
        const autoType = options.dataType === true;
        /* contentType: (设置你发送给服务器的格式)告诉服务器，我要发什么类型的数据 
           dataType：(设置你收到服务器数据的格式。)告诉服务器，我要想什么类型的数据，如果没有指定，那么会自动推断是返回 XML，还是JSON，还是script，还是String。
        */
        if (autoType) {
            options.dataType = '';
        }
        const url = !/^[^/]*\/\//.test(api) && baseUrl ? `${baseUrl}/${api.replace(/^\//, '')}` : api;
        const headers = {
            'content-type': 'application/json',
            locale: this.get('Accept-Language').split(',')[0].toLowerCase(),
            // auth权限
            Authorization,
        };
        if (request && request.headers && request.headers.cookie) {
            headers.cookie = request.headers.cookie;
        }
        const option = Object.assign({ dataType: 'json' }, options, {
            headers: Object.assign(headers, options.headers),
            method,
        });

        if (formFiles) {
            const form = new FormStream();
            if (typeof formFiles === 'string') {
                form.file('file', path.join(app.filesPath, formFiles));
            } else {
                Object.keys(formFiles).forEach(key => {
                    form.file(key, path.join(app.filesPath, formFiles[key]));
                });
                if (formData) {
                    Object.keys(formData).forEach(key => {
                        form.field(key, formData[key]);
                    });
                }
            }
            option.stream = form;
            option.headers = Object.assign(option.headers, form.headers());
        }

        try{
            const resultObj = await this.curl(url, option);
            /* if(resultObj.status !== 200){
                return Object.assign({ success: false, status: resultObj.status }, resultObj.data);
            } */
            if(autoType){
                const type = resultObj.headers['content-type'].replace(/;.*$/, '');
                console.log(type);
                switch(type){
                    case 'application/json':
                        // 返回json
                        try {
                            return {
                                type: 'json',
                                value: JSON.parse(resultObj.data),
                            };
                        } catch (e) {
                            return {
                                type: 'unknown',
                                value: resultObj,
                            };
                        }
                    case 'application/vnd.ms-excel':
                        return {
                            type: 'excel',
                            value: resultObj,
                        };
                    default:
                        return {
                            type,
                            value: resultObj,
                        };
                }
            }
            const body = resultObj.data;
            if (body instanceof Buffer) {
                return resultObj;
            }
            if (getBody) {
                return body;
            }
            if (body.success) {
                return body.data;
            }
            return body;
        }catch(err){
            if (noCatch) {
                throw err;
            }
            return {
                success: false,
                message: '请求失败',
            };
        }
    },
    httpGet(api, data, opts) {
        return this[curl](api, 'GET', handleOpts(data, opts));
    },
    httpPost(api, data, opts) {
        return this[curl](api, 'POST', handleOpts(data, opts));
    },
    httpPut(api, data, opts) {
        return this[curl](api, 'PUT', handleOpts(data, opts));
    },
    httpDelete(api, data, opts) {
        return this[curl](api, 'DELETE', handleOpts(data, opts));
    },
    warehouseId : 1,

    /**
     * @param {serviceName} 文件夹名称 
     * @returns 
     */
    getViewService(serviceName){
        return this.service[serviceName];
    }
};