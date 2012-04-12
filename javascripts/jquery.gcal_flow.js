(function() {
  var $, gCalFlow, log, methods, pad_zero;

  $ = jQuery;

  if ((typeof window !== "undefined" && window !== null) && (window._gCalFlow_debug != null) && (typeof console !== "undefined" && console !== null)) {
    log = console;
    if (log.debug == null) log.debug = log.log;
  } else {
    log = {};
    log.error = log.warn = log.log = log.info = log.debug = function() {};
  }

  pad_zero = function(num, size) {
    var i, ret, _ref;
    if (size == null) size = 2;
    if (10 * (size - 1) < num) return num;
    ret = "";
    for (i = 1, _ref = size - ("" + num).length; 1 <= _ref ? i <= _ref : i >= _ref; 1 <= _ref ? i++ : i--) {
      ret += "0";
    }
    return ret + num;
  };

  gCalFlow = (function() {

    gCalFlow.prototype.target = null;

    gCalFlow.prototype.template = $("<div class=\"gCalFlow\">\n  <div class=\"gcf-header-block\">\n    <div class=\"gcf-title-block\">\n      <span class=\"gcf-title\"></span>\n    </div>\n  </div>\n  <div class=\"gcf-item-container-block\">\n    <div class=\"gcf-item-block\">\n      <div class=\"gcf-item-header-block\">\n        <div class=\"gcf-item-date-block\">\n          [<span class=\"gcf-item-date\"></span>]\n        </div>\n        <div class=\"gcf-item-title-block\">\n          <strong class=\"gcf-item-title\"></strong>\n        </div>\n      </div>\n      <div class=\"gcf-item-body-block\">\n        <div class=\"gcf-item-description\">\n        </div>\n      </div>\n    </div>\n  </div>\n  <div class=\"gcf-last-update-block\">\n    LastUpdate: <span class=\"gcf-last-update\"></span>\n  </div>\n</div>");

    gCalFlow.prototype.opts = {
      maxitem: 15,
      calid: null,
      mode: 'upcoming',
      feed_url: null,
      auto_scroll: true,
      scroll_interval: 10 * 1000,
      link_title: true,
      link_item_title: true,
      link_item_description: false,
      link_target: '_blank',
      callback: null,
      date_formatter: function(d, allday_p) {
        if (allday_p) {
          return "" + (d.getFullYear()) + "-" + (pad_zero(d.getMonth() + 1)) + "-" + (pad_zero(d.getDate()));
        } else {
          return "" + (d.getFullYear()) + "-" + (pad_zero(d.getMonth() + 1)) + "-" + (pad_zero(d.getDate())) + " " + (pad_zero(d.getHours())) + ":" + (pad_zero(d.getMinutes()));
        }
      }
    };

    function gCalFlow(target, opts) {
      this.target = target;
      target.addClass('gCalFlow');
      if (target.children().size() > 0) {
        log.debug("Target node has children, use target element as template.");
        this.template = target;
      }
      this.update_opts(opts);
    }

    gCalFlow.prototype.update_opts = function(new_opts) {
      log.debug("update_opts was called");
      log.debug("old options:", this.opts);
      this.opts = $.extend({}, this.opts, new_opts);
      return log.debug("new options:", this.opts);
    };

    gCalFlow.prototype.gcal_url = function() {
      if (!this.opts.calid && !this.opts.feed_url) {
        log.error("Option calid and feed_url are missing. Abort URL generation");
        this.target.text("Error: You need to set 'calid' or 'feed_url' option.");
        throw "gCalFlow: calid and feed_url missing";
      }
      if (this.opts.feed_url) {
        return this.opts.feed_url;
      } else if (this.opts.mode === 'updates') {
        return "https://www.google.com/calendar/feeds/" + this.opts.calid + "/public/full?alt=json-in-script&max-results=" + this.opts.maxitem + "&orderby=lastmodified&sortorder=descending";
      } else {
        return "https://www.google.com/calendar/feeds/" + this.opts.calid + "/public/full?alt=json-in-script&max-results=" + this.opts.maxitem + "&orderby=starttime&futureevents=true&sortorder=ascending&singleevents=true";
      }
    };

    gCalFlow.prototype.fetch = function() {
      var self, success_handler;
      log.debug("Starting ajax call for " + (this.gcal_url()));
      self = this;
      success_handler = function(data) {
        log.debug("Ajax call success. Response data:", data);
        return self.render_data(data, this);
      };
      return $.ajax({
        success: success_handler,
        dataType: "jsonp",
        url: this.gcal_url()
      });
    };

    gCalFlow.prototype.parse_date = function(dstr) {
      var d, di, dinfo;
      di = Date.parse(dstr);
      if (!di) {
        d = dstr.split('T');
        dinfo = $.merge(d[0].split('-'), d[1] ? d[1].split(':').slice(0, 2) : []);
        return eval("new Date(" + (dinfo.join(',')) + ");");
      } else {
        return new Date(di);
      }
    };

    gCalFlow.prototype.render_data = function(data) {
      var ci, ent, et, etf, feed, ic, it, items, link, st, stf, t, titlelink, _i, _len, _ref, _ref2;
      log.debug("start rendering for data:", data);
      feed = data.feed;
      t = this.template.clone();
      titlelink = (_ref = this.opts.titlelink) != null ? _ref : "http://www.google.com/calendar/embed?src=" + this.opts.calid;
      if (this.opts.link_title) {
        t.find('.gcf-title').html($("<a />").attr({
          target: this.opts.link_target,
          href: titlelink
        }).text(feed.title.$t));
      } else {
        t.find('.gcf-title').text(feed.title.$t);
      }
      t.find('.gcf-link').attr({
        target: this.opts.link_target,
        href: titlelink
      });
      t.find('.gcf-last-update').text(this.opts.date_formatter(this.parse_date(feed.updated.$t)));
      it = t.find('.gcf-item-block');
      it.detach();
      it = $(it[0]);
      log.debug("item block template:", it);
      items = $();
      log.debug("render entries:", feed.entry);
      _ref2 = feed.entry.slice(0, this.opts.maxitem + 1 || 9e9);
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        ent = _ref2[_i];
        log.debug("formatting entry:", ent);
        ci = it.clone();
        if (ent.gd$when) {
          st = ent.gd$when[0].startTime;
          stf = this.opts.date_formatter(this.parse_date(st), st.indexOf('T') < 0);
          ci.find('.gcf-item-date').text(stf);
          ci.find('.gcf-item-start-date').text(stf);
          et = ent.gd$when[0].endTime;
          etf = this.opts.date_formatter(this.parse_date(et), et.indexOf('T') < 0);
          ci.find('.gcf-item-end-date').text(etf);
        }
        ci.find('.gcf-item-update-date').text(this.opts.date_formatter(this.parse_date(ent.updated.$t), false));
        link = $('<a />').attr({
          target: this.opts.link_target,
          href: ent.link[0].href
        });
        if (this.opts.link_item_title) {
          ci.find('.gcf-item-title').html(link.clone().text(ent.title.$t));
        } else {
          ci.find('.gcf-item-title').text(ent.title.$t);
        }
        if (this.opts.link_item_description) {
          ci.find('.gcf-item-description').html(link.clone().text(ent.content.$t));
        } else {
          ci.find('.gcf-item-description').text(ent.content.$t);
        }
        ci.find('.gcf-item-link').attr({
          href: ent.link[0].href
        });
        log.debug("formatted item entry:", ci[0]);
        items.push(ci[0]);
      }
      log.debug("formatted item entry array:", items);
      ic = t.find('.gcf-item-container-block');
      log.debug("item container element:", ic);
      ic.html(items);
      this.target.html(t.html());
      this.bind_scroll();
      if (this.opts.callback) return this.opts.callback.apply(this.target);
    };

    gCalFlow.prototype.bind_scroll = function() {
      var scroll_children, scroll_container, scroll_timer, scroller, state;
      scroll_container = this.target.find('.gcf-item-container-block');
      scroll_children = scroll_container.find(".gcf-item-block");
      log.debug("scroll container:", scroll_container);
      if (!this.opts.auto_scroll || scroll_container.size() < 1 || scroll_children.size() < 2) {
        return;
      }
      state = {
        idx: 0
      };
      scroller = function() {
        var scroll_to;
        log.debug("current scroll position:", scroll_container.scrollTop());
        log.debug("scroll capacity:", scroll_container[0].scrollHeight - scroll_container[0].clientHeight);
        if (typeof scroll_children[state.idx] === 'undefined' || scroll_container.scrollTop() >= scroll_container[0].scrollHeight - scroll_container[0].clientHeight) {
          log.debug("scroll to top");
          state.idx = 0;
          return scroll_container.animate({
            scrollTop: scroll_children[0].offsetTop
          });
        } else {
          scroll_to = scroll_children[state.idx].offsetTop;
          log.debug("scroll to " + scroll_to + "px");
          scroll_container.animate({
            scrollTop: scroll_to
          });
          return state.idx += 1;
        }
      };
      return scroll_timer = setInterval(scroller, this.opts.scroll_interval);
    };

    return gCalFlow;

  })();

  methods = {
    init: function(opts) {
      var data;
      if (opts == null) opts = {};
      data = this.data('gCalFlow');
      if (!data) {
        return this.data('gCalFlow', {
          target: this,
          obj: new gCalFlow(this, opts)
        });
      }
    },
    destroy: function() {
      var data;
      data = this.data('gCalFlow');
      data.obj.target = null;
      $(window).unbind('.gCalFlow');
      data.gCalFlow.remove();
      return this.removeData('gCalFlow');
    },
    render: function() {
      var data, self;
      data = this.data('gCalFlow');
      self = data.obj;
      return self.fetch();
    }
  };

  $.fn.gCalFlow = function(method) {
    var orig_args;
    orig_args = arguments;
    if (typeof method === 'object' || !method) {
      return this.each(function() {
        methods.init.apply($(this), orig_args);
        return methods.render.apply($(this), orig_args);
      });
    } else if (methods[method]) {
      return this.each(function() {
        return methods[method].apply($(this), Array.prototype.slice.call(orig_args, 1));
      });
    } else if (method === 'version') {
      return "1.1.0";
    } else {
      return $.error("Method " + method + " dose not exist on jQuery.gCalFlow");
    }
  };

}).call(this);
