'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    const url = '/api/rms/warehouse/1/robot/status/console?zoneCodes=kckq'
    const result = await ctx.httpGet(url);
    ctx.body = result
  }
}

module.exports = HomeController;
