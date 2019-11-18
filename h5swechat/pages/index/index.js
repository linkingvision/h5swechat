//index.js
//获取应用实例
const app = getApp()

Page({
  data: {
  },
  search: function (e) {
    wx.request({
      url: 'http://linkingvision.cn:9081//api/v1/GetSrc',
      data: {},
      method: 'POST',
      success: function (res) {
        console.log("+++++++++++", res)
      }
    })
  }
})
