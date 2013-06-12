
/* xScroll */
;(function($, window, document, undefined){
  "use strict"; 

  var defaults = {
        height:          'auto',   // visible scroll area in pixels, or 'auto' to use the parent element LIVE height
        allowPageScroll: false,    // enable window scrolling after top/bottom is reached
        wheelStep:       20,       // scroll amount per mouse wheel step
        touchScrollStep: 20,       // scroll amount per sweep
        minGripHeight:   30        // minimum height of the grip handle
      };

  // plugin constructor
  function plugin(node, opts){
    var self      = this,
        touchDiff = 0;

    this.opts    = $.extend({}, defaults, opts, node.dataset);
    this.node    = node;
    this.rail    = $('<div class="rail" />')[0];
    this.grip    = $('<div class="grip" />')[0];  
    this.wrapper = $(node).wrap('<div class="scroll" />').parent().width($(node).outerWidth(true));
    
    node.style.overflow = 'hidden';

    // append to parent div
    $(node.parentNode).append($(this.rail).append(this.grip));

    // fixed height?
    if(this.opts.height !== 'auto'){
      $(node).height(this.opts.height);

    // determine if element has 'auto' height
    }else{
      var clone     = $(node).clone().css('visibility', 'hidden'),
          cloneWrap = $('<div style="overflow:hidden;width:0px;height:0px;" />').appendTo('body').append(clone),
          inHeight  = clone.height();

      clone.empty(); 

      // nope, still fixed...
      if(inHeight === clone.height())
        this.opts.height = $(node).height();

      cloneWrap.remove();
    }

    // bar handle dragging
    $(this.grip).on('mousedown.xScroll', function(e){
      $(self.wrapper).addClass('scrolling');

      var lastY = e.clientY,
          minY  = e.clientY - this.offsetTop,  
          maxY  = minY + node.clientHeight - $(this).outerHeight();        
          
      $(document)
        .on('mousemove.xScrollDrag', function(e){
          var y   = Math.min(Math.max(e.clientY, minY), maxY),
              pos = self.grip.offsetTop + (y - lastY);

          lastY = y;

          pos = (pos * (node.scrollHeight - node.clientHeight)) / (node.clientHeight - $(self.grip).outerHeight());
          self.scrollTo(pos);
        })
        .on('mouseup.xScrollDrag', function(){
          $(document).off('.xScrollDrag');
          $(self.wrapper).removeClass('scrolling');     
        });

      return false;
    });

    // touch + mousewheel support
    $(node)
      .on('touchstart.xScroll', function(e,b){
        // record where touch started
        if(e.originalEvent.touches.length)
          touchDiff = e.originalEvent.touches[0].pageY;

        $(self.wrapper).addClass('scrolling');        
      })
      .on('touchmove.xScroll', function(e){
        // prevent scrolling the page
        e.preventDefault();
        if(e.originalEvent.touches.length)
           self.scrollBy(-((touchDiff - e.originalEvent.touches[0].pageY) / self.opts.touchScrollStep) * 10);
      })
      .on('touchend.xScroll', function(e){
        $(self.wrapper).removeClass('scrolling');
      })
      .on('mousewheel.xScroll', function(e, d, dx, dy){
        var pos = this.scrollTop + (-dy * self.opts.wheelStep);

        if(!self.opts.allowPageScroll || ((pos >= 0) && (pos <= this.scrollHeight)))
          e.preventDefault();

        self.scrollTo(pos);
      });
    
    // refresh on window resize
    $(window).on('resize.xScroll', this.refresh.bind(this));
    this.refresh();
  }

  plugin.prototype = {

    refresh: function(){

      // remember old scroll position
      var oldPos = this.node.scrollTop;

      // attempt to autodetect height (note that the closest parentNode is our wrapper DIV)
      if(this.opts.height === 'auto')
        $(this.node)
          .height('auto')
          .height(this.node.parentNode.parentNode.clientHeight - this.node.parentNode.offsetTop);

      var nodeHeight = this.node.clientHeight,
          gripHeight = Math.max((nodeHeight / this.node.scrollHeight) * nodeHeight, parseInt(this.opts.minGripHeight));

      this.rail.style.height = $(this.node).outerHeight() + 'px';
      this.grip.style.height = Math.round(gripHeight) + 'px';

      // hide scrollbar if content is not long enough
      (gripHeight == nodeHeight) ? $(this.wrapper).addClass('disabled') : $(this.wrapper).removeClass('disabled');

      this.scrollTo(oldPos);
    },

    // jump to an anchor, or to an absolute position
    scrollTo: function(where){
      var maxScrollTop = this.node.scrollHeight - this.node.clientHeight;      

      if(where === 'start')
        where = 0;

      else if(where === 'end')
        where = maxScrollTop;

      else if(isNaN(where))
        where = $(where, this.node).position().top;
      
      where = Math.min(Math.max(where, 0), maxScrollTop);
      this.grip.style.top = Math.round((where * (this.node.clientHeight - this.grip.clientHeight) ) / maxScrollTop) + 'px';      
      $(this.node).scrollTop(where).trigger('xScroll', where);
    },    

    // jump by value in pixels
    scrollBy: function(px){
      this.scrollTo(this.node.scrollTop + parseInt(px));
    },    

    destroy: function(){
      $([this.grip, this.node, window]).off('.xScroll');
      $([this.grip, this.rail]).remove();
      $(this.node).unwrap().removeData('_xScroll');
    }
  };

  $.fn.xScroll = function(opts){
    var args = arguments;
    return this.each(function(){
      var instance = $.data(this, '_xScroll');

      // first call, no refresh needed
      if(!instance)
        return $.data(this, '_xScroll', (instance = new plugin(this, opts))); 

      // already hooked? refresh...
      if(!opts || $.isPlainObject(opts))
        return instance.refresh();

      instance[opts].apply(instance, Array.prototype.slice.call(args, 1));
    });
  };

})(jQuery, window, document);