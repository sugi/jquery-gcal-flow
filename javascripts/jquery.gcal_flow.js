(function() {
  var $, base_obj, createInstance, log, methods, pad_zero;

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

  base_obj = {
    target: null,
    template: $("<div class=\"gCalFlow\">\n  <div class=\"gcf-header-block\">\n    <div class=\"gcf-title-block\">\n      <span class=\"gcf-title\"></span> Updates\n    </div>\n  </div>\n  <div class=\"gcf-item-container-block\">\n    <div class=\"gcf-item-block\">\n      <div class=\"gcf-item-header-block\">\n        <div class=\"gcf-item-date-block\">\n          [<span class=\"gcf-item-date\"></span>]\n        </div>\n        <div class=\"gcf-item-title-block\">\n          <strong class=\"gcf-item-title\"></strong>\n        </div>\n      </div>\n      <div class=\"gcf-item-body-block\">\n        <div class=\"gcf-item-description\">\n        </div>\n      </div>\n    </div>\n  </div>\n  <div class=\"gcf-last-update-block\">\n    LastUpdate: <span class=\"gcf-last-update\"></span>\n  </div>\n</div>"),
    opts: {
      maxitem: 15,
      calid: null,
      date_formatter: function(d, allday_p) {
        if (allday_p) {;        return "" + (d.getFullYear()) + "-" + (pad_zero(d.getMonth() + 1)) + "-" + (pad_zero(d.getDate()));
        } else {;
        return "" + (d.getFullYear()) + "-" + (pad_zero(d.getMonth() + 1)) + "-" + (pad_zero(d.getDate())) + " " + (pad_zero(d.getHours())) + ":" + (pad_zero(d.getMinutes()));
        return };
      }
    },
    update_opts: function(new_opts) {
      log.debug("update_opts was called");
      log.debug("old options:", this.opts);
      this.opts = $.extend({}, this.opts, new_opts);
      return log.debug("new options:", this.opts);
    },
    gcal_url: function() {
      if (!this.opts.calid) {
        log.error("option calid is missing. abort url generation");
        this.target.text("Error: You need to set 'calid' option.");
        throw "gCalFlow: calid missing";
      }
      return "https://www.google.com/calendar/feeds/" + this.opts.calid + "/public/full?alt=json-in-script&max-results=" + this.opts.maxitem;
    },
    fetch: function() {
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
    },
    parse_date: function(dstr) {
      var d, di, dinfo;
      di = Date.parse(dstr);
      if (!di) {
        d = dstr.split('T');
        dinfo = $.merge(d[0].split('-'), d[1] ? d[1].split(':').slice(0, 2) : []);
        return eval("new Date(" + (dinfo.join(',')) + ");");
      } else {
        return new Date(di);
      }
    },
    render_data: function(data) {
      var ci, ent, feed, ic, idate, it, items, st, t, titlelink, _i, _len, _ref, _ref2;
      log.debug("start rendering for data:", data);
      feed = data.feed;
      t = this.template.clone();
      titlelink = (_ref = this.opts.titlelink) != null ? _ref : "http://www.google.com/calendar/embed?src=" + this.opts.calid;
      t.find('.gcf-title').html($("<a />").attr({
        target: '_blank',
        href: titlelink
      }).text(feed.title.$t));
      t.find('.gcf-last-update').text(this.opts.date_formatter(this.parse_date(feed.updated.$t)));
      it = t.find('.gcf-item-block');
      it.detach();
      it = $(it[0]);
      log.debug("item block template:", it);
      items = $();
      log.debug("render entries:", feed.entry);
      _ref2 = feed.entry;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        ent = _ref2[_i];
        log.debug("formatting entry:", ent);
        ci = it.clone();
        if (ent.gd$when) {;
        st = ent.gd$when[0].startTime;
        idate = this.opts.date_formatter(this.parse_date(st), st.indexOf('T') < 0);
        ci.find('.gcf-item-date').text(idate);
        };
        ci.find('.gcf-item-title').html($('<a />').attr({
          target: '_blank',
          href: ent.link[0].href
        }).text(ent.title.$t));
        ci.find('.gcf-item-description').text(ent.content.$t);
        log.debug("formatted item entry:", ci[0]);
        items.push(ci[0]);
      }
      log.debug("formatted item entry array:", items);
      ic = t.find('.gcf-item-container-block');
      log.debug("item container element:", ic);
      ic.html(items);
      return this.target.html(t.html());
    }
  };

  createInstance = function(target, opts) {
    var F, obj;
    F = function() {};
    F.prototype = base_obj;
    obj = new F();
    obj.target = target;
    target.addClass('gCalFlow');
    if (target.children().size() > 0) {
      log.debug("Target node has children, use target element as template.");
      obj.template = target;
    }
    obj.update_opts(opts);
    return obj;
  };

  methods = {
    init: function(opts) {
      var data;
      if (opts == null) opts = {};
      data = this.data('gCalFlow');
      if (!data) {
        return this.data('gCalFlow', {
          target: this,
          obj: createInstance(this, opts)
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
      return "0.1.0";
    } else {
      return $.error("Method " + method + " dose not exist on jQuery.gCalFlow");
    }
  };

}).call(this);
