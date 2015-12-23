$ = jQuery

log = {}
log.error = log.warn = log.log = log.info = log.debug = ->

if window? and console? and console.log?
  unless window._gCalFlow_quiet
    for prio in ['error', 'warn', 'info']
      log[prio] = ->
        if console[prio]
          console[prio].apply console, arguments
        else
          console.log.apply console, arguments
  if window._gCalFlow_debug
    log.debug = ->
      if console.debug?
        console.debug.apply console, arguments
      else
        console.log.apply console, arguments

pad_zero = (num, size = 2) ->
  if 10 * (size-1) <= num then return num
  ret = ""
  for i in [1..(size-"#{num}".length)]
    ret = ret.concat "0"
  ret.concat num

class gCalFlow
  @demo_apikey: 'AIzaSyD0vtTUjLXzH4oKCzNRDymL6E3jKBympf0'
  target: null
  template: $("""<div class="gCalFlow">
      <div class="gcf-header-block">
        <div class="gcf-title-block">
          <span class="gcf-title"></span>
        </div>
      </div>
      <div class="gcf-item-container-block">
        <div class="gcf-item-block">
          <div class="gcf-item-header-block">
            <div class="gcf-item-date-block">
              [<span class="gcf-item-daterange"></span>]
            </div>
            <div class="gcf-item-title-block">
              <strong class="gcf-item-title"></strong>
            </div>
          </div>
          <div class="gcf-item-body-block">
            <div class="gcf-item-description">
            </div>
            <div class="gcf-item-location">
            </div>
          </div>
        </div>
      </div>
      <div class="gcf-last-update-block">
        LastUpdate: <span class="gcf-last-update"></span>
      </div>
    </div>""")
  opts: {
    maxitem: 15
    calid: null
    apikey: @demo_apikey
    mode: 'upcoming'
    data_url: null
    auto_scroll: true
    scroll_interval: 10 * 1000
    link_title: true
    link_item_title: true
    link_item_description: false
    link_item_location: false
    link_target: '_blank'
    item_description_as_html: false
    callback: null
    no_items_html: ''
    globalize_culture: navigator? and (navigator.browserLanguage or navigator.language or navigator.userLanguage)
    globalize_fmt_datetime: 'f'
    globalize_fmt_date: 'D'
    globalize_fmt_time: 't'
    globalize_fmt_monthday: 'M'
    date_formatter: (d, allday_p) ->
      if Globalize? and Globalize.format?
        if allday_p
          fmtstr = @globalize_fmt_date
        else
          fmtstr = @globalize_fmt_datetime
        return Globalize.format d, fmtstr
      else
        if allday_p
          return "#{d.getFullYear()}-#{pad_zero d.getMonth()+1}-#{pad_zero d.getDate()}"
        else
          return "#{d.getFullYear()}-#{pad_zero d.getMonth()+1}-#{pad_zero d.getDate()} #{pad_zero d.getHours()}:#{pad_zero d.getMinutes()}"
    daterange_formatter: (sd, ed, allday_p) ->
      ret = @date_formatter sd, allday_p
      ed = new Date(ed.getTime() - 86400 * 1000) if allday_p
      endstr = ''
      if sd.getDate() != ed.getDate() or sd.getMonth() != ed.getMonth()
        if Globalize? and Globalize.format?
          endstr += Globalize.format ed, @globalize_fmt_monthday
        else
          endstr += "#{pad_zero ed.getMonth()+1}-#{pad_zero ed.getDate()}"
      if not allday_p and (sd.getHours() != ed.getHours() or sd.getMinutes() != ed.getMinutes())
        if Globalize? and Globalize.format?
          endstr += Globalize.format ed, @globalize_fmt_time
        else
          endstr += " #{pad_zero ed.getHours()}:#{pad_zero ed.getMinutes()}"
      ret += " - #{endstr}" if endstr
      return ret
  }

  constructor: (target, opts) ->
    @target = target
    target.addClass 'gCalFlow'
    if target.children().size() > 0
      log.debug "Target node has children, use target element as template."
      @template = target
    @update_opts opts

  update_opts: (new_opts) ->
    log.debug "update_opts was called"
    log.debug "old options:", @opts
    @opts = $.extend {}, @opts, new_opts
    log.debug "new options:", @opts

  gcal_url: ->
    if !@opts.calid && !@opts.data_url
      log.error "Option calid and data_url are missing. Abort URL generation"
      @target.text "Error: You need to set 'calid' or 'data_url' option."
      throw "gCalFlow: calid and data_url missing"
    if @opts.data_url
      @opts.data_url
    else if @opts.mode == 'updates'
      now = new Date().toJSON()
      "https://www.googleapis.com/calendar/v3/calendars/#{@opts.calid}/events?key=#{@opts.apikey}&maxResults=#{@opts.maxitem}&orderBy=updated&timeMin=#{now}&singleEvents=true"
    else
      now = new Date().toJSON()
      "https://www.googleapis.com/calendar/v3/calendars/#{@opts.calid}/events?key=#{@opts.apikey}&maxResults=#{@opts.maxitem}&orderBy=startTime&timeMin=#{now}&singleEvents=true"

  fetch: ->
    log.debug "Starting ajax call for #{@gcal_url()}"
    if @opts.apikey == @constructor.demo_apikey
      log.warn "You are using built-in demo API key! This key is provided for tiny use or demo only. Your access may be limited."
      log.warn "Please check document and consider to use your own key."
    success_handler = (data) =>
      log.debug "Ajax call success. Response data:", data
      @render_data data, @
    $.ajax
      type:  'GET'
      success:  success_handler
      dataType: "jsonp"
      url: @gcal_url()

  parse_date: (dstr) ->
    # I do not use built-in Date() parser to avoid timezone issue on all day event.
    if m = dstr.match /^(\d{4})-(\d{2})-(\d{2})$/
      return new Date parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0

    offset = (new Date()).getTimezoneOffset() * 60 * 1000
    year = mon = day = null
    hour = min = sec = 0
    if m = dstr.match /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)(Z|([+-])(\d{2}):(\d{2}))$/
      year = parseInt m[1], 10
      mon = parseInt m[2], 10
      day = parseInt m[3], 10
      hour = parseInt m[4], 10
      min = parseInt m[5], 10
      sec = parseInt m[6], 10
      offset = (new Date(year,mon - 1, day, hour, min, sec)).getTimezoneOffset() * 60 * 1000
      if m[7] != "Z"
        offset += (if m[8] is "+" then 1 else -1) * (parseInt(m[9], 10) * 60 + parseInt(m[10], 10)) * 1000 * 60
    else
      log.warn "Time parse error! Unknown time pattern: #{dstr}"
      return new Date 1970, 1, 1, 0, 0, 0

    log.debug "time parse (gap to local): #{offset}"
    ret = new Date(new Date(year, mon - 1, day, hour, min, sec).getTime() - offset)
    log.debug "time parse: #{dstr} -> ", ret
    return ret

  render_data: (data) ->
    log.debug "start rendering for data:", data
    t = @template.clone()

    titlelink = @opts.titlelink ? "http://www.google.com/calendar/embed?src=#{@opts.calid}"
    if @opts.link_title
      t.find('.gcf-title').html $("<a />").attr({target: @opts.link_target, href: titlelink}).text data.summary
    else
      t.find('.gcf-title').text data.summary
    t.find('.gcf-link').attr {target: @opts.link_target, href: titlelink}
    t.find('.gcf-last-update').html @opts.date_formatter @parse_date data.updated

    it = t.find('.gcf-item-block')
    it.detach()
    it = $(it[0])
    log.debug "item block template:", it
    items = $()
    log.debug "render entries:", data.items
    if @opts.item_description_as_html
      desc_body_method = 'html'
    else
      desc_body_method = 'text'
    if data.items? and data.items.length > 0
      for ent in data.items[0..@opts.maxitem]
        log.debug "formatting entry:", ent
        ci = it.clone()
        if ent.start
  	      if (ent.start.dateTime) 
            st = ent.start.dateTime
          else
            st = ent.start.date
          sd = @parse_date(st)
          stf = @opts.date_formatter sd, st.indexOf(':') < 0
          ci.find('.gcf-item-date').html stf
          ci.find('.gcf-item-start-date').html stf
        if ent.end
  	      if (ent.end.dateTime) 
            et = ent.end.dateTime
          else
            et = ent.end.date
          ed = @parse_date(et)
          etf = @opts.date_formatter ed, et.indexOf(':') < 0
          ci.find('.gcf-item-end-date').html etf
          ci.find('.gcf-item-daterange').html @opts.daterange_formatter sd, ed, st.indexOf(':') < 0
        ci.find('.gcf-item-update-date').html @opts.date_formatter @parse_date(ent.updated), false
        link = $('<a />').attr {target: @opts.link_target, href: ent.htmlLink}
        if @opts.link_item_title
          ci.find('.gcf-item-title').html link.clone().text ent.summary
        else
          ci.find('.gcf-item-title').text ent.summary
        if @opts.link_item_description
          ci.find('.gcf-item-description').html link.clone()[desc_body_method] ent.description
        else
          ci.find('.gcf-item-description')[desc_body_method] ent.description
        if @opts.link_item_location && ent.location
          gmapslink = "<a href='https://maps.google.de/maps?q=" + encodeURI(ent.location.toString().replace(" ","+")) + "' target='new'>" + ent.location + "</a>"
          ci.find('.gcf-item-location').html(gmapslink)
        else
          ci.find('.gcf-item-location').text(ent.location)
        ci.find('.gcf-item-link').attr {href: ent.htmlLink}
        log.debug "formatted item entry:", ci[0]
        items.push ci[0]
    else
      items = $('<div class="gcf-no-items"></div>').html @opts.no_items_html

    log.debug "formatted item entry array:", items
    ic = t.find('.gcf-item-container-block')
    log.debug "item container element:", ic
    ic.html items

    @target.html t.html()
    @bind_scroll()
    @opts.callback.apply(@target) if @opts.callback

  bind_scroll: ->
    scroll_container = @target.find('.gcf-item-container-block')
    scroll_children = scroll_container.find(".gcf-item-block")
    log.debug "scroll container:", scroll_container
    if not @opts.auto_scroll or scroll_container.size() < 1 or scroll_children.size() < 2
      return
    state = {idx: 0}
    scroller = ->
      log.debug "current scroll position:", scroll_container.scrollTop()
      log.debug "scroll capacity:", scroll_container[0].scrollHeight - scroll_container[0].clientHeight
      if typeof scroll_children[state.idx] is 'undefined' or scroll_container.scrollTop() >= scroll_container[0].scrollHeight - scroll_container[0].clientHeight
        log.debug "scroll to top"
        state.idx = 0
        scroll_container.animate {scrollTop: scroll_children[0].offsetTop}
      else
        scroll_to = scroll_children[state.idx].offsetTop
        log.debug "scroll to #{scroll_to}px"
        scroll_container.animate {scrollTop: scroll_to}
        state.idx += 1
    scroll_timer = setInterval scroller, @opts.scroll_interval

methods =
  init: (opts = {}) ->
    data = @data 'gCalFlow'
    if !data then @data 'gCalFlow', { target: @, obj: new gCalFlow(@, opts) }

  destroy: ->
    data = @data 'gCalFlow'
    data.obj.target = null
    $(window).unbind '.gCalFlow'
    data.gCalFlow.remove()
    @removeData 'gCalFlow'

  render: ->
    if Globalize? and Globalize.culture?
      Globalize.culture @data('gCalFlow').obj.opts.globalize_culture
    @data('gCalFlow').obj.fetch()
      
$.fn.gCalFlow = (method) ->
  orig_args = arguments
  if typeof method == 'object' || !method
    @each ->
      methods.init.apply $(@), orig_args
      methods.render.apply $(@), orig_args
  else if methods[method]
    @each ->
      methods[method].apply $(@), Array.prototype.slice.call(orig_args, 1)
  else if method == 'version'
    "3.0.2"
  else
    $.error "Method #{method} does not exist on jQuery.gCalFlow"

# vim: set sts=2 sw=2 expandtab:
