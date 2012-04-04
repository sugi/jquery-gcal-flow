global.window = null
global.jQuery = ->
global.jQuery.fn = {}
require './jquery.gcal_flow.js'
console.log global.jQuery.fn.gCalFlow('version')
