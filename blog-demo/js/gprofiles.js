if ( "undefined" == typeof console ) {
  console = {
    log: function ( t ) {},
    debug: function ( t ) {}
  }
}
var Gravatar = {
  profile_stack: {},
  profile_map: {},
  overTimeout: false,
  outTimeout: false,
  stopOver: false,
  active_grav: false,
  active_hash: false,
  active_id: false,
  active_grav_clone: false,
  profile_cb: null,
  stats_queue: [],
  throbber: null,
  has_bg: false,
  disabled: false,
  url_prefix: "http://en",
  supportsPassiveEvents: false,
  testSupportsPassiveEvents: function () {
    try {
      var t = Object.defineProperty( {}, "passive", {
        get: function () {
          Gravatar.supportsPassiveEvents = true
        }
      } );
      addEventListener( "testPassive", null, t );
      removeEventListener( "testPassive", null, t )
    } catch ( t ) {}
  },
  disable: function () {
    Gravatar.disabled = true;
    Gravatar.hide_card();
    var t = new Date( 2100, 1, 1, 1, 1, 1 );
    Gravatar.stat( "disable" );
    if ( -1 == window.location.host.search( /wordpress.com/i ) ) {
      document.cookie = "nohovercard=1; expires=" + t.toUTCString() + ";"
    } else {
      document.cookie = "nohovercard=1; expires=" + t.toUTCString() + "; domain=.wordpress.com; path=/"
    }
  },
  mouseOut: function ( t ) {
    t.stopImmediatePropagation();
    Gravatar.stopOver = true;
    Gravatar.outTimeout = setTimeout( function () {
      Gravatar.hide_card()
    }, 300 )
  },
  init: function ( t, e ) {
    Gravatar.testSupportsPassiveEvents();
    var a = document.cookie.split( ";" ),
      r, i;
    for ( r = 0; r < a.length; r++ ) {
      i = a[ r ];
      while ( " " == i.charAt( 0 ) ) {
        i = i.substring( 1, i.length )
      }
      if ( 0 == i.indexOf( "nohovercard=1" ) ) {
        return
      }
    }
    if ( "https:" == window.location.protocol ) this.url_prefix = "https://secure";
    this.attach_profiles( t, e );
    this.add_card_css();
    var o = function ( t ) {
      if ( Gravatar.disabled ) {
        return
      }
      var e = t && t.target;
      if ( !e || !Gravatar.closest( e, "img.grav-hashed" ) ) {
        return
      }
      t.preventDefault();
      t.stopPropagation();
      if ( "mouseleave" == t.type || "mouseout" == t.type ) {
        return Gravatar.mouseOut.call( this, t )
      }
      Gravatar.stopOver = false;
      Gravatar.active_id = e.getAttribute( "id" );
      Gravatar.active_hash = Gravatar.active_id.split( "-" )[ 1 ];
      Gravatar.untilt_gravatar();
      clearTimeout( Gravatar.overTimeout );
      if ( false === Gravatar.profile_map[ "g" + Gravatar.active_hash ] ) {
        return
      }
      Gravatar.stat( "hover" );
      clearTimeout( Gravatar.outTimeout );
      Gravatar.tilt_gravatar();
      Gravatar.fetch_profile_by_hash( Gravatar.active_hash, Gravatar.active_id );
      Gravatar.overTimeout = setTimeout( function () {
        Gravatar.show_card()
      }, 600 )
    };
    document.body.addEventListener( "mouseover", o );
    document.body.addEventListener( "mouseout", o );
    var s = function ( t ) {
      if ( Gravatar.disabled ) {
        return
      }
      var e = t && t.target;
      if ( !e ) {
        return
      }
      if ( !Gravatar.closest( e, "div.gcard, img.grav-clone" ) ) {
        return
      }
      t.preventDefault();
      t.stopPropagation();
      if ( t.type == "mouseenter" || t.type == "mouseover" ) {
        Gravatar.stopOver = false;
        clearTimeout( Gravatar.outTimeout )
      } else {
        Gravatar.mouseOut.call( this, t )
      }
    };
    document.body.addEventListener( "mouseover", s );
    document.body.addEventListener( "mouseout", s );
    addEventListener( "scroll", function () {
      if ( !Gravatar.active_hash.length ) {
        return
      }
      Gravatar.hide_card()
    }, Gravatar.supportsPassiveEvents ? {
      passive: true
    } : false )
  },
  attach_profiles: function ( t, e ) {
    setInterval( Gravatar.send_stats, 3e3 );
    t = "undefined" == typeof t ? "body" : t;
    if ( e && "string" == typeof e ) {
      var a = document.querySelectorAll( e );
      for ( var r = 0; r < a.length; r++ ) {
        a[ r ].classList.add( "no-grav" )
      }
    }
    var i = document.querySelectorAll( t + ' img[src*="gravatar.com/avatar"]' );
    for ( var r = 0; r < i.length; r++ ) {
      var o = i[ r ];
      var s = Gravatar.extract_hash( o );
      var n = 0;
      if ( document.querySelector( "#grav-" + s + "-" + n ) ) {
        while ( document.querySelector( "#grav-" + s + "-" + n ) ) {
          n++
        }
      }
      o.setAttribute( "id", "grav-" + s + "-" + n );
      o.setAttribute( "title", "" );
      o.removeAttribute && o.removeAttribute( "title" );
      if ( o.parentNode && o.parentNode.tagName === "A" ) {
        o.parentNode.setAttribute( "title", "" );
        o.parentNode.removeAttribute && o.parentNode.removeAttribute( "title" )
      }
      o.classList.add( "grav-hashed" );
      if ( Gravatar.closest( o, "#comments, .comments, #commentlist, .commentlist, .grav-hijack" ) || !Gravatar.closest( o, "a" ) ) {
        o.classList.add( "grav-hijack" )
      }
    }
  },
  show_card: function () {
    if ( Gravatar.stopOver ) {
      return
    }
    dom_id = this.profile_map[ "g" + Gravatar.active_hash ];
    var t = document.querySelectorAll( ".gcard" );
    for ( var e = 0; e < t.length; e++ ) {
      t[ e ].classList.add( "hidden" )
    }
    if ( "fetching" == this.profile_stack[ "g" + Gravatar.active_hash ] ) {
      Gravatar.show_throbber();
      this.listen( Gravatar.active_hash, "show_card" );
      Gravatar.stat( "wait" );
      return
    }
    if ( "undefined" == typeof this.profile_stack[ "g" + Gravatar.active_hash ] ) {
      Gravatar.show_throbber();
      this.listen( Gravatar.active_hash, "show_card" );
      this.fetch_profile_by_hash( Gravatar.active_hash, dom_id );
      return
    }
    Gravatar.stat( "show" );
    Gravatar.hide_throbber();
    if ( !document.querySelector( "#profile-" + this.active_hash ) ) {
      this.build_card( this.active_hash, this.profile_stack[ "g" + this.active_hash ] )
    }
    this.render_card( this.active_grav, "profile-" + this.active_hash )
  },
  hide_card: function () {
    clearTimeout( Gravatar.overTimeout );
    this.untilt_gravatar();
    var t = document.querySelector( "#profile-" + this.active_hash + ".gcard" );
    if ( t ) {
      Gravatar.fadeOut( t )
    }
  },
  render_card: function ( t, e ) {
    var a = document.querySelector( "#" + e );
    var r = Gravatar.getOffsets( t );
    var i = t && t.getBoundingClientRect();
    var o = window.pageXOffset || document.documentElement.scrollLeft || 0;
    if ( null != r ) {
      var s = i.width;
      var n = i.height;
      var l = 5 + s * .4;
      var c = a.getBoundingClientRect();
      var f = c.width;
      var d = c.height;
      if ( f === window.innerWidth ) {
        f = 400;
        d = 200
      }
      var v = r.left - 17;
      var h = r.top - 7;
      var u = "pos-right";
      if ( r.left + s + l + f > window.innerWidth + o ) {
        v = r.left - f + s + 17;
        u = "pos-left"
      }
      var g = n * .25;
      a.classList.remove( "pos-right", "pos-left", "hidden" );
      a.classList.add( u );
      a.style.top = h - g + "px";
      a.style.left = v + "px";
      var m = n / 2;
      m = Math.min( m, d / 2 - 6, 53 );
      if ( this.has_bg ) {
        m = m - 8
      }
      m = Math.max( m, 0 );
      var _ = document.querySelector( "#" + e + " .grav-cardarrow" );
      _.style.height = 2 * n + g + "px";
      _.style.backgroundPosition = "0px " + m + "px";
      if ( "pos-right" == u ) {
        _.style.right = "auto";
        _.style.left = "-7px"
      } else {
        _.style.right = "-10px";
        _.style.left = "auto"
      }
    }
    Gravatar.fadeIn( a )
  },
  build_card: function ( t, e ) {
    function a( t ) {
      var e = 0,
        a;
      for ( a in t ) {
        if ( t.hasOwnProperty( a ) ) {
          e++
        }
      }
      return e
    }
    GProfile.init( e );
    var r = GProfile.get( "urls" );
    var i = GProfile.get( "photos" );
    var o = GProfile.get( "accounts" );
    var s = 100;
    if ( a( r ) > 3 ) {
      s += 90
    } else {
      s += 10 + 20 * a( r )
    }
    if ( a( o ) > 0 ) {
      s += 30
    }
    var n = GProfile.get( "aboutMe" );
    n = n.replace( /<[^>]+>/gi, "" );
    n = n.toString().substr( 0, s );
    if ( s == n.length ) {
      n += '<a href="' + GProfile.get( "profileUrl" ) + '" target="_blank">&#8230;</a>'
    }
    var l = [ "grav-inner" ];
    if ( Gravatar.my_hash && t == Gravatar.my_hash ) {
      l.push( "grav-is-user" );
      if ( !n.length ) {
        n = "<p>Want a better profile? <a class='grav-edit-profile' href='http://gravatar.com/profiles/edit/?noclose' target='_blank'>Click here</a>.</p>"
      }
    }
    if ( n.length ) {
      l.push( "gcard-about" )
    }
    name = GProfile.get( "displayName" );
    if ( !name.length ) {
      name = GProfile.get( "preferredUsername" )
    }
    var c = '<div id="profile-' + t + '" class="gcard grofile"> \t\t\t\t\t\t<div class="grav-inner"> \t\t\t\t\t\t\t<div class="grav-grav"> \t\t\t\t\t\t\t\t<a href="' + GProfile.get( "profileUrl" ) + '" target="_blank"> \t\t\t\t\t\t\t\t\t<img src="' + GProfile.get( "thumbnailUrl" ) + '?s=100&r=pg&d=mm" width="100" height="100" /> \t\t\t\t\t\t\t\t</a> \t\t\t\t\t\t\t</div> \t\t\t\t\t\t\t<div class="grav-info"> \t\t\t\t\t\t\t\t<h4><a href="' + GProfile.get( "profileUrl" ) + '" target="_blank">' + name + '</a></h4> \t\t\t\t\t\t\t\t<p class="grav-loc">' + GProfile.get( "currentLocation" ) + '</p> \t\t\t\t\t\t\t\t<p class="grav-about">' + n + '</p> \t\t\t\t\t\t\t\t<div class="grav-view-complete-button"> \t\t\t\t\t\t\t\t\t<a href="' + GProfile.get( "profileUrl" ) + '" target="_blank" class="grav-view-complete">View Complete Profile</a> \t\t\t\t\t\t\t\t</div> \t\t\t\t\t\t\t\t<p class="grav-disable"><a href="#" onclick="Gravatar.disable(); return false">Turn off hovercards</a></p> \t\t\t\t\t\t\t</div> \t\t\t\t\t\t\t<div style="clear:both"></div> \t\t\t\t\t\t</div> \t\t\t\t\t\t<div class="grav-cardarrow"></div> \t\t\t\t\t\t<div class="grav-tag"><a href="http://gravatar.com/" title="Powered by Gravatar.com" target="_blank">&nbsp;</a></div> \t\t\t\t\t</div>';
    document.body.insertAdjacentHTML( "beforeend", c );
    var f = document.querySelector( "#profile-" + t + " .grav-inner" );
    for ( var d = 0; d < l.length; d++ ) {
      f.classList.add( l[ d ] )
    }
    this.has_bg = false;
    var v = GProfile.get( "profileBackground" );
    if ( a( v ) ) {
      this.has_bg = true;
      var e = document.querySelector( "#profile-" + t );
      e.style.padding = "8px 0";
      if ( v.color ) {
        e.style.backgroundColor = v.color
      }
      if ( v.url ) {
        e.style.backgroundImage = "url(" + v.url + ")"
      }
      if ( v.position ) {
        e.style.backgroundPosition = v.position
      }
      if ( v.repeat ) {
        e.style.backgroundRepeat = v.repeat
      }
      document.querySelector( "#profile-" + t + " .grav-tag" ).style.top = "8px"
    }
    if ( !document.querySelector( "#profile-" + t + " .gcard-links" ) && !document.querySelector( "#profile-" + t + " .gcard-services" ) ) {
      var h = document.querySelector( "#profile-" + t + " .grav-rightcol" );
      if ( h ) {
        h.style.width = "auto"
      }
    }
    if ( !document.querySelector( "#profile-" + t + " .gcard-about" ) ) {
      var u = document.querySelector( "#profile-" + t + " .grav-leftcol" );
      if ( u ) {
        u.style.width = "auto"
      }
    }
    if ( typeof Gravatar.profile_cb === "function" ) {
      Gravatar.loaded_js( t, "profile-" + t )
    }

    function g( t, e, a ) {
      var r = document.querySelectorAll( t );
      for ( var i = 0; i < r.length; i++ ) {
        r[ i ].addEventListener( e, a )
      }
    }
    g( "#profile-" + t + " a.grav-extra-comments", "click", function ( t ) {
      return Gravatar.stat( "click_comment", t )
    } );
    g( "#profile-" + t + " a.grav-extra-likes", "click", function ( t ) {
      return Gravatar.stat( "click_like", t )
    } );
    g( "#profile-" + t + " .grav-links a", "click", function ( t ) {
      return Gravatar.stat( "click_link", t )
    } );
    g( "#profile-" + t + " .grav-services a", "click", function ( t ) {
      return Gravatar.stat( "click_service", t )
    } );
    g( "#profile-" + t + " h4 a, #profile-" + t + " .grav-view-complete, #profile-" + t + " .grav-grav a", "click", function ( t ) {
      return Gravatar.stat( "to_profile", t )
    } );
    g( "#profile-" + t + " .grav-tag a", "click", function ( t ) {
      if ( 3 == t.which || 2 == t.button || t.altKey || t.metaKey || t.ctrlKey ) {
        t.preventDefault();
        t.stopImmediatePropagation();
        Gravatar.stat( "egg" );
        return Gravatar.whee()
      }
      return Gravatar.stat( "to_gravatar", t )
    } );
    g( "#profile-" + t + " .grav-tag a", "contextmenu", function ( t ) {
      t.preventDefault();
      t.stopImmediatePropagation();
      Gravatar.stat( "egg" );
      return Gravatar.whee()
    } );
    g( "#profile-" + t + " a.grav-edit-profile", "click", function ( t ) {
      return Gravatar.stat( "click_edit_profile", t )
    } )
  },
  tilt_gravatar: function () {
    this.active_grav = document.querySelector( "img#" + this.active_id );
    if ( document.querySelector( "img#grav-clone-" + this.active_hash ) ) {
      return
    }
    this.active_grav_clone = this.active_grav.cloneNode();
    this.active_grav_clone.setAttribute( "id", "grav-clone-" + this.active_hash );
    this.active_grav_clone.classList.add( "grav-clone" );
    var t = Gravatar.getOffsets( this.active_grav ) || {
      left: 0,
      top: 0
    };
    var e = getComputedStyle( this.active_grav );
    var a = t.top + parseInt( e.paddingTop, 10 );
    var r = t.left + parseInt( e.paddingLeft, 10 );
    var i = document.createElement( "div" );
    if ( this.active_grav.classList.contains( "grav-hijack" ) ) {
      i.innerHTML = '<a href="http://gravatar.com/' + this.active_hash + '" class="grav-clone-a" target="_blank"></a>'
    } else {
      var o = Gravatar.closest( this.active_grav, "a" );
      i.appendChild( o.cloneNode( false ) )
    }
    this.active_grav_clone.classList.add( "grav-tilt" );
    this.active_grav_clone.style.borderBottomWidth = this.active_grav.getBoundingClientRect().height / 5 + "px";
    var s = i.firstChild;
    s.appendChild( this.active_grav_clone );
    s.classList.add( "grav-tilt-parent" );
    s.style.top = a + "px";
    s.style.left = r + "px";
    document.body.appendChild( s );
    this.active_grav_clone.classList.remove( "grav-hashed" )
  },
  untilt_gravatar: function () {
    var t = document.querySelectorAll( "img.grav-clone, a.grav-clone-a" );
    for ( var e = 0; e < t.length; e++ ) {
      var a = t[ e ];
      if ( a.remove ) {
        a.remove()
      } else {
        a.parentNode && a.parentNode.removeChild( a )
      }
    }
    Gravatar.hide_throbber()
  },
  show_throbber: function () {
    if ( !Gravatar.throbber ) {
      var t = document.createElement( "div" );
      t.innerHTML = '<div id="grav-throbber" class="grav-throbber"><img src="' + this.url_prefix + '.gravatar.com/images/throbber.gif" alt="." width="15" height="15" /></div>';
      Gravatar.throbber = t.firstChild
    }
    document.body.appendChild( Gravatar.throbber );
    var e = Gravatar.getOffsets( document.querySelector( "#" + Gravatar.active_id ) ) || {
      left: 0,
      top: 0
    };
    Gravatar.throbber.style.top = e.top + 2 + "px";
    Gravatar.throbber.style.left = e.left + 1 + "px"
  },
  hide_throbber: function () {
    if ( !Gravatar.throbber ) {
      return
    }
    if ( Gravatar.throbber.remove ) {
      Gravatar.throbber.remove()
    } else {
      Gravatar.throbber.parentNode && Gravatar.throbber.parentNode.removeChild( Gravatar.throbber )
    }
  },
  closest: function ( t, e ) {
    if ( t.closest ) {
      return t.closest( e )
    }
    var a = Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    var r = t;
    do {
      var i = a.bind( r );
      if ( i( e ) ) {
        return r
      }
      r = r.parentElement || r.parentNode
    } while ( r !== null && r.nodeType === 1 );
    return null
  },
  getOffsets: function ( t ) {
    if ( !t ) {
      return null
    }
    var e = window.pageXOffset || document.documentElement.scrollLeft || 0;
    var a = window.pageYOffset || document.documentElement.scrollTop || 0;
    var r = t.getBoundingClientRect();
    return {
      left: r.left + e,
      top: r.top + a
    }
  },
  afterAnimation: function ( e, a, r ) {
    if ( e && r ) {
      var i = false;
      var o = function ( t ) {
        if ( t && t.type === "transitionend" && t.propertyName !== a ) {
          return
        }
        if ( !i ) {
          i = true;
          r()
        }
        if ( e ) {
          e.removeEventListener( "transitionend", o )
        }
      };
      e.addEventListener( "transitionend", o );
      setTimeout( o, 200 )
    }
  },
  fadeIn: function ( t, e ) {
    t.classList.remove( "hidden" );
    t.classList.add( "fadeout" );
    requestAnimationFrame( function () {
      requestAnimationFrame( function () {
        t.classList.remove( "fadeout" );
        t.classList.add( "fading", "fadein" );
        Gravatar.afterAnimation( t, "opacity", function () {
          t.classList.remove( "fading", "fadein" );
          if ( e ) {
            e()
          }
        } )
      } )
    } )
  },
  fadeOut: function ( t, e ) {
    t.classList.add( "fadein" );
    requestAnimationFrame( function () {
      requestAnimationFrame( function () {
        t.classList.remove( "fadein" );
        t.classList.add( "fading", "fadeout" );
        Gravatar.afterAnimation( t, "opacity", function () {
          t.classList.remove( "fading", "fadeout" );
          t.classList.add( "hidden" );
          if ( e ) {
            e()
          }
        } )
      } )
    } )
  },
  fetch_profile_by_email: function ( t ) {
    return this.fetch_profile_by_hash( this.md5( t.toString().toLowerCase() ) )
  },
  fetch_profile_by_hash: function ( t, e ) {
    this.profile_map[ "g" + t ] = e;
    if ( this.profile_stack[ "g" + t ] && "object" == typeof this.profile_stack[ "g" + t ] ) {
      return this.profile_stack[ "g" + t ]
    }
    this.profile_stack[ "g" + t ] = "fetching";
    Gravatar.stat( "fetch" );
    this.load_js( this.url_prefix + ".gravatar.com/" + t + ".json?callback=Gravatar.fetch_profile_callback", function () {
      Gravatar.fetch_profile_error( t, e )
    } )
  },
  fetch_profile_callback: function ( t ) {
    if ( !t || "object" != typeof t ) {
      return
    }
    this.profile_stack[ "g" + t.entry[ 0 ].hash ] = t;
    this.notify( t.entry[ 0 ].hash )
  },
  fetch_profile_error: function ( t, e ) {
    Gravatar.stat( "profile_404" );
    Gravatar.profile_map[ "g" + t ] = false;
    var a = document.querySelector( "#" + e );
    var r = a.parentNode;
    var i = r && r.parentNode;
    if ( i && i.querySelector( 'a[href="http://gravatar.com/' + t + '"]' ) === r ) {
      i.replaceChild( a, r )
    }
    if ( e == Gravatar.active_id ) {
      Gravatar.hide_card()
    }
  },
  listen: function ( t, e ) {
    if ( !this.notify_stack ) {
      this.notify_stack = {}
    }
    t = "g" + t;
    if ( !this.notify_stack[ t ] ) {
      this.notify_stack[ t ] = []
    }
    for ( a = 0; a < this.notify_stack[ t ].length; a++ ) {
      if ( e == this.notify_stack[ t ][ a ] ) {
        return
      }
    }
    this.notify_stack[ t ][ this.notify_stack[ t ].length ] = e
  },
  notify: function ( t ) {
    if ( !this.notify_stack ) {
      this.notify_stack = {}
    }
    t = "g" + t;
    if ( !this.notify_stack[ t ] ) {
      this.notify_stack[ t ] = []
    }
    for ( a = 0; a < this.notify_stack[ t ].length; a++ ) {
      if ( false == this.notify_stack[ t ][ a ] || "undefined" == typeof this.notify_stack[ t ][ a ] ) {
        continue
      }
      Gravatar[ this.notify_stack[ t ][ a ] ]( t.substr( 1 ) );
      this.notify_stack[ t ][ a ] = false
    }
  },
  extract_hash: function ( t ) {
    var e = t && t.getAttribute( "src" ) || "";
    hash = /gravatar.com\/avatar\/([0-9a-f]{32})/.exec( e );
    if ( null != hash && "object" == typeof hash && 2 == hash.length ) {
      hash = hash[ 1 ]
    } else {
      hash = /gravatar_id\=([0-9a-f]{32})/.exec( e );
      if ( null !== hash && "object" == typeof hash && 2 == hash.length ) {
        hash = hash[ 1 ]
      } else {
        return false
      }
    }
    return hash
  },
  load_js: function ( t, e ) {
    if ( !this.loaded_scripts ) {
      this.loaded_scripts = []
    }
    if ( this.loaded_scripts[ t ] ) {
      return
    }
    this.loaded_scripts[ t ] = true;
    var a = document.createElement( "script" );
    a.src = t;
    a.type = "text/javascript";
    if ( typeof e === "function" ) {
      a.onerror = e
    }
    document.head.appendChild( a )
  },
  loaded_js: function ( t, e ) {
    Gravatar.profile_cb( t, e )
  },
  add_card_css: function () {
    if ( document.querySelector( "#gravatar-card-css" ) ) {
      return
    }
    var t = document.querySelector( 'script[src*="/js/gprofiles."]' );
    var e = t && ( t.getAttribute( "src" ) || false );
    var a, r = false;
    if ( e ) {
      a = e.replace( /\/js\/gprofiles(?:\.dev)?\.js.*$/, "" );
      r = e.split( "?" )[ 1 ] || false
    } else {
      a = "//s.gravatar.com"
    }
    if ( !r ) {
      var i = new Date,
        o = new Date( i.getFullYear(), 0, 1 ),
        r = Math.ceil( ( ( i - o ) / 864e5 + o.getDay() + 1 ) / 7 ),
        r = "ver=" + i.getFullYear().toString() + r.toString()
    }
    a = a.replace( /^(https?\:)?\/\//, "" );
    a = window.location.protocol + "//" + a;
    new_css = "<link rel='stylesheet' type='text/css' id='gravatar-card-css' href='" + a + "/dist/css/hovercard.min.css?" + r + "' />";
    if ( !document.querySelector( "#gravatar-card-services-css" ) ) {
      new_css += "<link rel='stylesheet' type='text/css' id='gravatar-card-services-css' href='" + a + "/dist/css/services.min.css?" + r + "' />"
    }
    document.head.insertAdjacentHTML( "beforeend", new_css )
  },
  md5: function ( t ) {
    return hex_md5( t )
  },
  autofill: function ( t, e ) {
    if ( !t.length || -1 == t.indexOf( "@" ) ) {
      return
    }
    this.autofill_map = e;
    hash = this.md5( t.toString().toLowerCase() );
    if ( "undefined" == typeof this.profile_stack[ "g" + hash ] ) {
      this.listen( hash, "autofill_data" );
      this.fetch_profile_by_hash( hash )
    } else {
      this.autofill_data( hash )
    }
  },
  autofill_data: function ( t ) {
    GProfile.init( this.profile_stack[ "g" + t ] );
    for ( var e in this.autofill_map ) {
      var a = document.querySelector( "#" + this.autofill_map[ e ] );
      switch ( e ) {
        case "url":
          link = GProfile.get( "urls" );
          url = "undefined" != typeof link[ 0 ] ? link[ 0 ][ "value" ] : GProfile.get( "profileUrl" );
          if ( a ) {
            a.value = url
          }
          break;
        case "urls":
          links = GProfile.get( "urls" );
          links_str = "";
          for ( l = 0; l < links.length; l++ ) {
            links_str += links[ l ][ "value" ] + "\n"
          }
          if ( a ) {
            a.value = links_str
          }
          break;
        default:
          parts = e.split( /\./ );
          if ( parts[ 1 ] ) {
            val = GProfile.get( e );
            switch ( parts[ 0 ] ) {
              case "ims":
              case "phoneNumbers":
                val = val.value;
                break;
              case "emails":
                val = val[ 0 ].value;
              case "accounts":
                val = val.url;
                break
            }
            if ( a ) {
              a.value = val
            }
          } else {
            if ( a ) {
              a.value = GProfile.get( e )
            }
          }
      }
    }
  },
  whee: function () {
    if ( Gravatar.whee.didWhee ) {
      return
    }
    Gravatar.whee.didWhee = true;
    if ( document.styleSheets && document.styleSheets[ 0 ] ) {
      document.styleSheets[ 0 ].insertRule( ".grav-tag a { background-position: 22px 100% !important }", 0 )
    } else {
      var t = document.querySelectorAll( ".grav-tag a" );
      for ( var e = 0; e < t.length; e++ ) {
        t[ e ].style.backgroundPosition = "22px 100%"
      }
    }
    var a = document.querySelectorAll( 'img[src*="gravatar.com/"]' );
    for ( var e = 0; e < a.length; e++ ) {
      a[ e ].classList.add( "grav-whee" )
    }
    return false
  },
  stat: function ( t, e ) {
    Gravatar.stats_queue.push( t );
    if ( e ) {
      var a = e.metaKey || "_blank" === ( e.currentTarget && e.currentTarget.getAttribute( "target" ) );
      Gravatar.send_stats( function () {
        if ( a ) {
          return
        }
        document.location = e.currentTarget.href
      } );
      return a
    }
    if ( Gravatar.stats_queue.length > 10 ) {
      Gravatar.send_stats()
    }
  },
  send_stats: function ( t ) {
    if ( !document.images ) {
      return
    }
    var e = Gravatar.stats_queue;
    if ( !e.length ) {
      return
    }
    var a = new Date;
    Gravatar.stats_queue = [];
    var r = "https://pixel.wp.com/g.gif?v=wpcom2&x_grav-hover=" + e.join( "," ) + "&rand=" + Math.random().toString() + "-" + a.getTime();
    var i = new Image( 1, 1 );
    if ( typeof t === "function" ) {
      i.onload = t
    }
    i.src = r
  }
};
var GProfile = {
  data: {},
  init: function ( t ) {
    if ( "fetching" == t ) {
      return false
    }
    if ( "undefined" == typeof t.entry[ 0 ] ) {
      return false
    }
    GProfile.data = t.entry[ 0 ]
  },
  get: function ( t ) {
    if ( -1 != t.indexOf( "." ) ) {
      parts = t.split( /\./ );
      if ( GProfile.data[ parts[ 0 ] ] ) {
        if ( GProfile.data[ parts[ 0 ] ][ parts[ 1 ] ] ) {
          return GProfile.data[ parts[ 0 ] ][ parts[ 1 ] ]
        }
        for ( i = 0, s = GProfile.data[ parts[ 0 ] ].length; i < s; i++ ) {
          if ( GProfile.data[ parts[ 0 ] ][ i ].type && parts[ 1 ] == GProfile.data[ parts[ 0 ] ][ i ].type || GProfile.data[ parts[ 0 ] ][ i ].shortname && parts[ 1 ] == GProfile.data[ parts[ 0 ] ][ i ].shortname || GProfile.data[ parts[ 0 ] ][ i ].primary && parts[ 1 ] == "primary" ) {
            return GProfile.data[ parts[ 0 ] ][ i ]
          }
        }
      }
      return ""
    }
    if ( GProfile.data[ t ] ) {
      return GProfile.data[ t ]
    }
    if ( "url" == t ) {
      if ( GProfile.data.urls.length ) {
        return GProfile.data.urls[ 0 ].value
      }
    }
    return ""
  }
};
var hexcase = 0;
var b64pad = "";
var chrsz = 8;

function hex_md5( t ) {
  return binl2hex( core_md5( str2binl( t ), t.length * chrsz ) )
}

function b64_md5( t ) {
  return binl2b64( core_md5( str2binl( t ), t.length * chrsz ) )
}

function str_md5( t ) {
  return binl2str( core_md5( str2binl( t ), t.length * chrsz ) )
}

function hex_hmac_md5( t, e ) {
  return binl2hex( core_hmac_md5( t, e ) )
}

function b64_hmac_md5( t, e ) {
  return binl2b64( core_hmac_md5( t, e ) )
}

function str_hmac_md5( t, e ) {
  return binl2str( core_hmac_md5( t, e ) )
}

function md5_vm_test() {
  return hex_md5( "abc" ) == "900150983cd24fb0d6963f7d28e17f72"
}

function core_md5( t, e ) {
  t[ e >> 5 ] |= 128 << e % 32;
  t[ ( e + 64 >>> 9 << 4 ) + 14 ] = e;
  var a = 1732584193;
  var r = -271733879;
  var i = -1732584194;
  var o = 271733878;
  for ( var s = 0; s < t.length; s += 16 ) {
    var n = a;
    var l = r;
    var c = i;
    var f = o;
    a = md5_ff( a, r, i, o, t[ s + 0 ], 7, -680876936 );
    o = md5_ff( o, a, r, i, t[ s + 1 ], 12, -389564586 );
    i = md5_ff( i, o, a, r, t[ s + 2 ], 17, 606105819 );
    r = md5_ff( r, i, o, a, t[ s + 3 ], 22, -1044525330 );
    a = md5_ff( a, r, i, o, t[ s + 4 ], 7, -176418897 );
    o = md5_ff( o, a, r, i, t[ s + 5 ], 12, 1200080426 );
    i = md5_ff( i, o, a, r, t[ s + 6 ], 17, -1473231341 );
    r = md5_ff( r, i, o, a, t[ s + 7 ], 22, -45705983 );
    a = md5_ff( a, r, i, o, t[ s + 8 ], 7, 1770035416 );
    o = md5_ff( o, a, r, i, t[ s + 9 ], 12, -1958414417 );
    i = md5_ff( i, o, a, r, t[ s + 10 ], 17, -42063 );
    r = md5_ff( r, i, o, a, t[ s + 11 ], 22, -1990404162 );
    a = md5_ff( a, r, i, o, t[ s + 12 ], 7, 1804603682 );
    o = md5_ff( o, a, r, i, t[ s + 13 ], 12, -40341101 );
    i = md5_ff( i, o, a, r, t[ s + 14 ], 17, -1502002290 );
    r = md5_ff( r, i, o, a, t[ s + 15 ], 22, 1236535329 );
    a = md5_gg( a, r, i, o, t[ s + 1 ], 5, -165796510 );
    o = md5_gg( o, a, r, i, t[ s + 6 ], 9, -1069501632 );
    i = md5_gg( i, o, a, r, t[ s + 11 ], 14, 643717713 );
    r = md5_gg( r, i, o, a, t[ s + 0 ], 20, -373897302 );
    a = md5_gg( a, r, i, o, t[ s + 5 ], 5, -701558691 );
    o = md5_gg( o, a, r, i, t[ s + 10 ], 9, 38016083 );
    i = md5_gg( i, o, a, r, t[ s + 15 ], 14, -660478335 );
    r = md5_gg( r, i, o, a, t[ s + 4 ], 20, -405537848 );
    a = md5_gg( a, r, i, o, t[ s + 9 ], 5, 568446438 );
    o = md5_gg( o, a, r, i, t[ s + 14 ], 9, -1019803690 );
    i = md5_gg( i, o, a, r, t[ s + 3 ], 14, -187363961 );
    r = md5_gg( r, i, o, a, t[ s + 8 ], 20, 1163531501 );
    a = md5_gg( a, r, i, o, t[ s + 13 ], 5, -1444681467 );
    o = md5_gg( o, a, r, i, t[ s + 2 ], 9, -51403784 );
    i = md5_gg( i, o, a, r, t[ s + 7 ], 14, 1735328473 );
    r = md5_gg( r, i, o, a, t[ s + 12 ], 20, -1926607734 );
    a = md5_hh( a, r, i, o, t[ s + 5 ], 4, -378558 );
    o = md5_hh( o, a, r, i, t[ s + 8 ], 11, -2022574463 );
    i = md5_hh( i, o, a, r, t[ s + 11 ], 16, 1839030562 );
    r = md5_hh( r, i, o, a, t[ s + 14 ], 23, -35309556 );
    a = md5_hh( a, r, i, o, t[ s + 1 ], 4, -1530992060 );
    o = md5_hh( o, a, r, i, t[ s + 4 ], 11, 1272893353 );
    i = md5_hh( i, o, a, r, t[ s + 7 ], 16, -155497632 );
    r = md5_hh( r, i, o, a, t[ s + 10 ], 23, -1094730640 );
    a = md5_hh( a, r, i, o, t[ s + 13 ], 4, 681279174 );
    o = md5_hh( o, a, r, i, t[ s + 0 ], 11, -358537222 );
    i = md5_hh( i, o, a, r, t[ s + 3 ], 16, -722521979 );
    r = md5_hh( r, i, o, a, t[ s + 6 ], 23, 76029189 );
    a = md5_hh( a, r, i, o, t[ s + 9 ], 4, -640364487 );
    o = md5_hh( o, a, r, i, t[ s + 12 ], 11, -421815835 );
    i = md5_hh( i, o, a, r, t[ s + 15 ], 16, 530742520 );
    r = md5_hh( r, i, o, a, t[ s + 2 ], 23, -995338651 );
    a = md5_ii( a, r, i, o, t[ s + 0 ], 6, -198630844 );
    o = md5_ii( o, a, r, i, t[ s + 7 ], 10, 1126891415 );
    i = md5_ii( i, o, a, r, t[ s + 14 ], 15, -1416354905 );
    r = md5_ii( r, i, o, a, t[ s + 5 ], 21, -57434055 );
    a = md5_ii( a, r, i, o, t[ s + 12 ], 6, 1700485571 );
    o = md5_ii( o, a, r, i, t[ s + 3 ], 10, -1894986606 );
    i = md5_ii( i, o, a, r, t[ s + 10 ], 15, -1051523 );
    r = md5_ii( r, i, o, a, t[ s + 1 ], 21, -2054922799 );
    a = md5_ii( a, r, i, o, t[ s + 8 ], 6, 1873313359 );
    o = md5_ii( o, a, r, i, t[ s + 15 ], 10, -30611744 );
    i = md5_ii( i, o, a, r, t[ s + 6 ], 15, -1560198380 );
    r = md5_ii( r, i, o, a, t[ s + 13 ], 21, 1309151649 );
    a = md5_ii( a, r, i, o, t[ s + 4 ], 6, -145523070 );
    o = md5_ii( o, a, r, i, t[ s + 11 ], 10, -1120210379 );
    i = md5_ii( i, o, a, r, t[ s + 2 ], 15, 718787259 );
    r = md5_ii( r, i, o, a, t[ s + 9 ], 21, -343485551 );
    a = safe_add( a, n );
    r = safe_add( r, l );
    i = safe_add( i, c );
    o = safe_add( o, f )
  }
  return Array( a, r, i, o )
}

function md5_cmn( t, e, a, r, i, o ) {
  return safe_add( bit_rol( safe_add( safe_add( e, t ), safe_add( r, o ) ), i ), a )
}

function md5_ff( t, e, a, r, i, o, s ) {
  return md5_cmn( e & a | ~e & r, t, e, i, o, s )
}

function md5_gg( t, e, a, r, i, o, s ) {
  return md5_cmn( e & r | a & ~r, t, e, i, o, s )
}

function md5_hh( t, e, a, r, i, o, s ) {
  return md5_cmn( e ^ a ^ r, t, e, i, o, s )
}

function md5_ii( t, e, a, r, i, o, s ) {
  return md5_cmn( a ^ ( e | ~r ), t, e, i, o, s )
}

function core_hmac_md5( t, e ) {
  var a = str2binl( t );
  if ( a.length > 16 ) a = core_md5( a, t.length * chrsz );
  var r = Array( 16 ),
    i = Array( 16 );
  for ( var o = 0; o < 16; o++ ) {
    r[ o ] = a[ o ] ^ 909522486;
    i[ o ] = a[ o ] ^ 1549556828
  }
  var s = core_md5( r.concat( str2binl( e ) ), 512 + e.length * chrsz );
  return core_md5( i.concat( s ), 512 + 128 )
}

function safe_add( t, e ) {
  var a = ( t & 65535 ) + ( e & 65535 );
  var r = ( t >> 16 ) + ( e >> 16 ) + ( a >> 16 );
  return r << 16 | a & 65535
}

function bit_rol( t, e ) {
  return t << e | t >>> 32 - e
}

function str2binl( t ) {
  var e = Array();
  var a = ( 1 << chrsz ) - 1;
  for ( var r = 0; r < t.length * chrsz; r += chrsz ) e[ r >> 5 ] |= ( t.charCodeAt( r / chrsz ) & a ) << r % 32;
  return e
}

function binl2str( t ) {
  var e = "";
  var a = ( 1 << chrsz ) - 1;
  for ( var r = 0; r < t.length * 32; r += chrsz ) e += String.fromCharCode( t[ r >> 5 ] >>> r % 32 & a );
  return e
}

function binl2hex( t ) {
  var e = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var a = "";
  for ( var r = 0; r < t.length * 4; r++ ) {
    a += e.charAt( t[ r >> 2 ] >> r % 4 * 8 + 4 & 15 ) + e.charAt( t[ r >> 2 ] >> r % 4 * 8 & 15 )
  }
  return a
}

function binl2b64( t ) {
  var e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var a = "";
  for ( var r = 0; r < t.length * 4; r += 3 ) {
    var i = ( t[ r >> 2 ] >> 8 * ( r % 4 ) & 255 ) << 16 | ( t[ r + 1 >> 2 ] >> 8 * ( ( r + 1 ) % 4 ) & 255 ) << 8 | t[ r + 2 >> 2 ] >> 8 * ( ( r + 2 ) % 4 ) & 255;
    for ( var o = 0; o < 4; o++ ) {
      if ( r * 8 + o * 6 > t.length * 32 ) a += b64pad;
      else a += e.charAt( i >> 6 * ( 3 - o ) & 63 )
    }
  }
  return a
}
