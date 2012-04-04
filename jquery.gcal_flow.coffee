$ = jQuery

if window and window._gCalFlow_debug and console
  log = console
else
  log = {}
  log.error = log.warn = log.log = log.info = log.debug = ->

base_obj =
  target: null
  template: $("""
<div class="gcf-header">Recent Updates of <span class="gcf-title"></span></div>
<div class="gcf-item-block">
  <div class="gcf-item"></div>
</div>
    """)
  opts: {
    maxitem: 15
    scroll: true
    scroll_interval: 5
    calid: null
  }

  update_opts: (new_opts) ->
    log.debug "update_opts was called"
    log.debug "old options:"
    log.debug this.opts
    this.opts = $.extend({}, this.opts, new_opts)
    log.debug "new options:"
    log.debug this.opts
    if this.target.find('.gCalFlow').length > 0
      this.template = $(this.target.html())

  gcal_url: ->
    if !this.opts.calid
      log.error "option calid is missing. abort url generation"
      this.target.text("Error: You need to set 'calid' option.")
      throw "gCalFlow: calid missing"
    "http://www.google.com/calendar/feeds/#{this.opts.calid}/public/full?alt=json-in-script&max-results=#{this.opts.maxitem}"

  fetch: ->
    log.debug "Starting ajax call for #{this.gcal_url()}"
    self = this
    success_handler = (data) ->
      log.debug "Ajax call success. Response data following:"
      log.debug data
      self.render_data(data, this)
    $.ajax {
      success:  success_handler
      dataType: "jsonp"
      url: this.gcal_url()
    }

  render_data: (data) ->
    log.debug "start rendering for data"
    this.target.text(data.feed.openSearch$totalResults.$t)

createInstance = (target, opts) ->
  F = ->
  F.prototype = base_obj
  obj = new F()
  obj.target = target
  target.addClass('gCalFlow')
  obj.update_opts(opts)
  obj

methods =
  init: (opts = {}) ->
    data = this.data('gCalFlow')
    if !data then this.data 'gCalFlow', { target: this, obj: createInstance(this, opts) }

  destroy: ->
    data = this.data('gCalFlow')
    data.obj.target = null
    $(window).unbind('.gCalFlow')
    data.gCalFlow.remove()
    this.removeData('gCalFlow')

  render: ->
    data = this.data('gCalFlow')
    self = data.obj
    self.fetch()

      
$.fn.gCalFlow = (method) ->
  orig_args = arguments
  if typeof method == 'object' || !method
    this.each ->
      methods.init.apply $(this), orig_args
      methods.render.apply $(this), orig_args
  else if methods[method]
    this.each ->
      methods[method].apply $(this), Array.prototype.slice.call(orig_args, 1)
  else if method == 'version'
    "0.1.0"
  else
    $.error "Method #{method} dose not exist on jQuery.gCalFlow"
