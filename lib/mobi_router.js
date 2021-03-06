(function($) {
    MRouter = function(){

        // Centralized speaking funtion for Mobi-Router
        this.speak = function(message){
            if( this.settings && !this.settings.canISpeak ) return false;
            if(_.isObject(message))
                console.log('Mobi-Router', message);
            else
                console.log('Mobi-Router: '+message);
        };

        // Default settings for Mobi-Router
        var _settings = {
            canISpeak: false,
            desktopWidth: 840,
            desktopHeight: 480,
            headerHeight: 45,
            sidebarToggleBtn: 45,
            sidebar: true,
            sidebarAutoOpenDesktop: true,
            sidebarDefaultWidth: 200,
            sidebarTemplate: 'sidebar',
            defaultBackBtnText: 'Back',
            defaultBackBtnAction: function(){ MobiRouter.back(); },
            defaultNextBtnText: 'Next',
            defaultNextBtnAction: function(){ MobiRouter.next(); },
        };
        this.settings = {};

        // Storing sizes of page elements
        this.sizes = {
            router: {width: 0, height: 0},
            sidebar: {width: 0, height: 0},
            main: {width: 0, height: 0},
            header: {width: 0, height: 0},
            content: {width: 0, height: 0},
        };

        // Sidebar visibility
        this.sidebarShown = false;

        // Main content translate coords
        this.mainTranslateX = 0;

        // Is the site shown on full screen
        this.showFullScreen = false;

        // I scroll handler for sidebar
        var _sidebarIScroll;

        // This is the original storage of routes
        var _routeMap = {};

        // Storage of prev/actual/next paths
        var _routes = {};

        // Storage of page sequences, each sequence works like a separate slider.
        // It's an opportunity to create sign up sequences or sth. else that can be passed from left to right trough slides
        //var _sequences = {};

        var _sequence = [];
        var _position = 0;

        // The sequence currently in use
        //var _currentSequence = false;

        // It's a sequence full of moving values for the animateScroller() function
        //var _animationSequence = [];

        // The currently used route
        //var _currentRoute = false;

        this.dep = new Deps.Dependency;

        /*******************************************************************************************************************
         **************************************  PRIVATE functions  ********************************************************
         ******************************************************************************************************************/


        /**
         * Protected init function, runs after configure() ends
         *
         * @private
         */
        function _init(){
            var _this = this;
            if( document.readyState != 'complete' ){
                Meteor.setTimeout(function(){
                    return _init.call(_this);
                }, 25);
                return;
            }
            this.speak('initializing');

            Meteor.startup(function(){
                _startNewSequence.call(_this, false, _getSequenceFromUrl.call(_this));
                MobiRouter.animateScroller(false, 0);
            });
        };


        /**
         * Check if the route exists, return the route if it does and return false if not
         *
         * @param name
         * @returns {MobiRoute|false}
         * @private
         */
        function _getRoute(name){
            var route;
            if( !name )
                route = _sequence.length ? (_sequence[MobiRouter.currentPosition()] || false ) : false;
            name = name ? name : Session.get('actual_page');
            route = route || _routeMap[name];
            if( route )
                return route;

            var r = _findByUrl();
            route = _routeMap[r.name];
            return route || false;
        };


        /**
         * Returns the MobiRoute object of the given route name
         *
         * @param name
         * @returns {MobiRoute|false}
         * @private
         */
        function _getRouteObj(name){
            name = name ? name : Session.get('actual_page');
            var route = _routeMap[name];
            return route ? route : false;
        };


        /**
         * Find the current route from the url
         *
         * @returns {MobiRoute|false}
         * @private
         */
        function _findByUrl(){
            var routePoints = [];

            _.each(_routeMap, function(r){
                var obj = {name: r.name, point: r.checkUrlMatch()};
                routePoints.push(obj);
            });

            routePoints = _.reject(routePoints, function(rp){ return rp.point === false });
            return routePoints.length ? _.max(routePoints, function(rp){ return rp.point}) : false;
        };


        /**
         * Search for current/requested sequence
         *
         * @param name
         * @returns {MobiSequence|false}
         * @private
         */
        /*function _getSequence(name){
            name = name == undefined ? Session.get('actual_page') : name;
            var sequence = _sequences[name];
            _currentSequence = sequence ? sequence : false;
            if( _currentSequence )
                return _currentSequence;

            _currentSequence = _findSequenceByUrl();
            return _currentSequence;
        };*/


        /**
         * Find the current sequence from the url
         *
         * @returns {boolean}
         * @private
         */
        /*function _findSequenceByUrl(){
            var sequence = false;
            var location = window.location,
                locArr = location.pathname.split('/');

            _.each(_sequences, function(s){
                if( sequence ) return true;

                sequence = locArr[1] && locArr[1] == s.name ? s : false;
            });

            return sequence;
        };*/


        /**
         * Set the actually opened page's menu item to active
         *
         * @param name
         * @returns {*}
         * @private
         */
        function _setMenuItemActive(name){
            name = name || (_sequence.length ? _sequence[0].name : false);
            if( !name || name == undefined ) return name;

            _.each(document.getElementsByClassName('active_sidebar_item'), function(item){
                item.className = item.className.replace(' active_sidebar_item', '');
            });
            _.each(document.getElementsByClassName('menu_item_'+name), function(item){
                item.className += ' active_sidebar_item';
            });

            return name;
        };


        /**
         * Generate sequence from the current/given url
         *
         * @param url
         * @returns {Array}
         * @private
         */
        function _getSequenceFromUrl(url){
            var pathname = url || window.location.pathname,
                loc = pathname.split('/'),  // array used for loop through the whole pathname
                routes = [],                // storage of routes
                paramPos = 0,               // track position of routes' parameters
                absPos = 0,                 // track the position in the pathname
                isRoute = false,            // route found flag
                cutOff = '';                // part of the pathname to be cut off

            _.each(loc, function(param, pos){
                if( pathname == '' || absPos > pos ) return false;
                isRoute = false;
                cutOff = '';

                _.each(_routeMap, function(route, name){
                    var r = jQuery.extend(true, {}, route);
                    if( pathname == '' || isRoute == true || (r.cleanPath == '/' &&  pos > 0) ) return false;
                    if( pathname.indexOf(r.cleanPath) == 0 ){
                        r.position = routes.length;
                        routes.push(r);
                        isRoute = true;
                    }
                });

                if( isRoute == true ){
                    paramPos = 0;
                    absPos += _.compact((routes[routes.length-1].cleanPath).split('/')).length;
                    cutOff = routes[routes.length-1].cleanPath;
                }else if(routes.length){
                    var r = routes[routes.length-1],
                        paramName = r.urlParams[paramPos];
                    paramPos += 1;
                    absPos += 1;
                    cutOff = ('/'+loc[absPos]);
                    if( paramName ) routes[routes.length-1].params[paramName] = loc[absPos];
                }

                // Cut off the processed part of the url
                cutOff = cutOff.replace(/\/$/, '');
                pathname = pathname.slice(cutOff.length);
            });

            // Allow to start sequence with any route
            // (required if one of the routes has "/" as cleanPath)
            if( routes.length && routes[0].cleanPath == '/' && _.isEmpty(routes[0].params) )
                routes.shift();

            return routes;
        }


        /**
         * Returns sequence created from the url given as argument. If no url was given, the actual url is used.
         *
         * @param test
         * @returns {Array}
         */
        this.readUrl = function(url){
            return _getSequenceFromUrl.call(this, url);
        };


        /**
         * Centralized way to set position in the sequence
         *
         * @param pos
         * @private
         */
        function _setPosition(pos){
            _position = pos;
            this.dep.changed();
        };


        /**
         * Calculating the url from the actual sequence
         *
         * @returns {string}
         * @private
         */
        function _calculateUrl(){
            var url = '';
            _.each(_sequence, function(route, key){
                var path = route.getPath();
                url += path != '/' ? path : '';
            });

            return String(url);
        };


        /**
         * Get the url calculated by the current sequence
         *
         * @returns {string}
         */
        this.getUrl = function(){
            return _calculateUrl.call(this);
        };


        /**
         * Refreshing the address line of the browser
         *
         * @private
         */
        function _refreshUrl(){
            this.speak('refreshing url');
            var url = _calculateUrl.call(this);
            window.history.pushState({}, 'Mobi-Router Demo Site', url);
        };


        /**
         *  Refreshing the "mobi-router-data" session, fill it with the routes and their parameters
         */
        this.refreshSessionData = function(){
            this.dep.changed();
            /*var data = {
                changed: +(new Date),
                position: this.currentPosition(),
                routes: []
            };
            _.each(_sequence, function(route, key){
                data.routes[key] = {
                    name: route.name,
                    params: route.params
                }
            });
            Session.set('mobi-router-data', data);*/
        };


        /*******************************************************************************************************************
         **************************************  PUBLIC functions  *********************************************************
         ******************************************************************************************************************/


        /**
         * Extend default settings with developer-defined ones and stores it
         *
         * @param settings
         */
        this.configure = function(settings){
            _settings = _.extend(_settings, settings);
            this.settings = _settings;

            this.speak('configuration saved');

            _init.call(this);
        };


        /**
         * Storing the map given by developer
         *
         * @param map
         * @returns {boolean}
         */
        this.map = function(map){
            this.speak('saving router-map');
            _.each(map, function(route, name){
                _routeMap[name] = new MobiRoute(name, route);
            });
            return true;
        };


        /**
         * Adds new sequence to the storage if didn't yet
         *
         * @param name
         * @param routes
         * @returns {boolean}
         */
        /*this.addSequence = function(name, routes, settings){
            if( _sequences[name] != undefined ) return false;
            this.speak('adding route sequence');

            // Create new sequence
            _sequences[name] = new MobiSequence(name, {
                name: name,
                routes: _.compact(_.map(routes, function(r){
                    var route = _.clone(_getRouteObj(r.name));
                    if( r.data != undefined )
                        route.data = r.data;
                    // Check if it's an existing route or not
                    return route ? route : false;
                }))
            }, settings);

            if( !_sequences[name].routes.length ) delete _sequences[name];
        };*/


        /**
         *  Calculates the size of each part of the Mobi-Router layout to fit on the screen
         *
         * @param width
         * @param height
         */
        this.calculateSizes = function(width, height){
            var settings = this.settings;
            this.showFullScreen = isMobile || Boolean(settings.desktopWidth > width || settings.desktopHeight > height);

            this.sizes.router.width = isMobile || this.showFullScreen ? width : settings.desktopWidth;
            this.sizes.sidebar.width = settings.sidebarDefaultWidth > (width - this.settings.sidebarToggleBtn) ? (width - settings.sidebarToggleBtn) : settings.sidebarDefaultWidth;

            if( isMobile ) this.sizes.router.height = this.sizes.sidebar.height = this.sizes.main.height = height;
            else this.sizes.router.height = this.sizes.main.height = this.sizes.sidebar.height = this.showFullScreen ? height : settings.desktopHeight;

            this.sizes.main.width = this.sizes.router.width;

            this.sizes.header.height = settings.headerHeight;
            this.sizes.header.width = this.sizes.main.width;
            this.sizes.content.width = this.sizes.main.width;
            this.sizes.content.height = this.sizes.main.height - this.sizes.header.height;

            return this.sizes;
        };


        /**
         *  Refresh sidebar iScroll if exists and create it if not
         */
        this.refreshSidebarScroll = function(){
            if( _sidebarIScroll ) _sidebarIScroll.refresh();
            else Meteor.setTimeout(function(){
                _sidebarIScroll = new iScroll('mobi_sidebar', {hScroll: false, hScrollbar: false, vScroll: true, vScrollbar:false});
            }, 100);
        };


        /**
         *  Initializing and/or Refreshing iScrolls of the sidebar and the pages
         */
        this.initScrolls = function(){
            this.speak('initializing/refreshing iScrolls');

            this.refreshSidebarScroll();
            Meteor.setTimeout(refreshIscrolls, 300);
        };


        /**
         * It's the common function to display another page.
         *
         * @param routeName
         * @param params
         */
        this.go = function(routeName, data, pushToSequence){
            pushToSequence = pushToSequence || false;
            var r = _getRoute(routeName);
            if( !r ) return console.log('Error: This route does not exists.');

            var route = _.clone(r);
            // Fill the parameters of route
            if(_.isObject(data) )
                route.params = data;
            else if( data == 'url' )
                route.params = route.getUrlParameters();
            else
                route.params = {};

            // Start new sequence of push to the existing one
            if( pushToSequence == true )
                _addToSequence.call(this, route);
            else
                _startNewSequence.call(this, route);

            this.animateScroller();
        };


        function _startNewSequence(route, sequence){
            this.speak('start new sequence ');
            if( sequence ){
                _sequence = sequence;
            }else{
                route.position = 0;
                _sequence = [route];
            }

            // Set actual sidebar item to active (by it's class)
            _setMenuItemActive.call(this);

            _refreshUrl.call(this);
            _setPosition.call(this, _sequence.length-1);
        };


        function _addToSequence(route, data){
            this.speak('adding route DYNAMICALLY TO sequence');

            var slide = this.currentPosition();

            route.position = slide+1;
            _sequence[slide+1] = route;
            _sequence = _sequence.splice(0, slide+2);

            // Set actual sidebar item to active (by it's class)
            if( _sequence.length == 1) _setMenuItemActive.call(this);

            _refreshUrl.call(this);
            _setPosition.call(this, _sequence.length-1);
        };


        function _removeRouteAfter(pos){
            var route = _sequence[pos] || {};
            this.speak('remove route(s) after "'+(route.name || '<undefined route>')+'" from sequence');

            _sequence = _sequence.splice(0, pos+1);
        };



        /**
         * Animates the slider of the sequence to move the next position
         */
        this.animateScroller = function(pos, time){
            pos = _.isNumber(pos) ? pos : this.currentPosition();
           // var positionTrigger = Session.get('mobi-router-position');

            var move = -(pos * this.sizes.content.width),
                time = _.isNumber(time) ? time : (this.settings.sequenceSlidingTime ? this.settings.sequenceSlidingTime : 750);

            this.speak('animating pages slider: to '+move+'px in '+time+' msec');
            if(_.isNumber(move) && _.isNumber(time) ) $('#sequence_scroller').hardwareAnimate({translateX: move}, time, 'easeOutExpo');
            else console.log('Error: move ('+move+') or time ('+time+') is not a number.');
        };


        /**
         * Animates the slider of the sequence to move the next position
         */
        this.jumptToPosition = function(pos){
            pos = _.isNumber(pos) ? pos : this.currentPosition();

            var move = -(pos * this.sizes.content.width);

            this.speak('moving pages slider to x='+move+'px');
            if(_.isNumber(move) ) $('#sequence_scroller').hardwareCss({translateX: move, translateY: 0, translateZ: 0});
            else console.log('Error: move ('+move+') is not a number');
        };


        /**
         * Rendering actual content by session "actual_page"
         *
         * @returns {html}
         */
        this.content = function(route){
            this.dep.depend();
            var route = route || this.currentRoute();
            if( !route ) return this.settings.notFoundTemplate ? Template[this.settings.notFoundTemplate]() : Template.mobi_not_found.call();

            Deps.afterFlush(function(){
                mobiResizeable.resizeAllElements();
            });

            return route.content();
        };


        /**
         * Provide the current route
         *
         * @returns {MobiRoute|object}
         */
        this.currentRoute = function(){
            return _sequence[this.currentPosition()];
        }; //-> this should return the object i made above, e.g: "{id: 'home', path: etc}


        /**
         * Provide the current sequence
         *
         * @returns {boolean}
         */
        /*this.currentSequence = function(){
            return _currentSequence;
        };*/


        /**
         * Provide current slide's MobiRoute object or false on failure
         *
         * @returns {MobiRoute|false}
         */
        /*this.currentSlide = function(){
            return Session.get('mobi_sequence_position');
        };*/


        /**
         * Provide current route's position in the sequence
         *
         * @returns {number}
         */
        this.currentPosition = function(){
            this.dep.depend();
            return _position;
        };


        /**
         * Current route's name
         *
         * @returns {string}
         */
        this.currentRouteName = function(){
            return this.currentRoute() ? this.currentRoute().name : '';
        };


        /**
         * Current route's template name
         *
         * @returns {string}
         */
        this.currentTemplate = function(){
            return this.currentRoute() ? this.currentRoute().template : (function(){});
        };


        /**
         * Renders the provided sidebar template into the position
         *
         * @returns {*}
         */
        this.sidebar = function(){
            return Template[_settings.sidebarTemplate]();
        };


        /**
         * Opens the sidebar by moving the content right
         *
         * @returns {bool}
         */
        this.showSidebar = function(){
            if(this.sidebarShown) return false;
            this.speak('show sidebar');
            var _this = this;

            $('#mobi_main').hardwareAnimate({translateX: '+='+(this.sizes.sidebar.width - 5)}, 300, 'easeOutExpo', function(){}, function(){
                refreshIscrolls();
                _this.mainTranslateX += _this.sizes.sidebar.width;
            });
            this.sidebarShown = true;

            return true;
        };


        /**
         * Closes the sidebar by moving the content back to the left
         *
         * @returns {bool}
         */
        this.hideSidebar = function(){
            if(!this.sidebarShown) return false;
            this.speak('hide sidebar');
            var _this = this;

            $('#mobi_main').hardwareAnimate({translateX: '+='+(-this.sizes.sidebar.width + 5)}, 300, 'easeOutExpo', function(){}, function(){
                refreshIscrolls();
                _this.mainTranslateX += -_this.sizes.sidebar.width;
            });
            this.sidebarShown = false;

            return true;
        };


        /**
         *  Page title calculation from actual data
         *
         * @returns {string}
         */
        this.getPageTitle = function(route){
            this.dep.depend();
            route = route || this.currentRoute();
            var path =  route ? route.getPath() : '';
            var data = route ? route.getData(path) : {};

            if( !route ) return this.settings.notFoundTitle ? this.settings.notFoundTitle : 'Page not found';

            var title = data && data.title ? data.title : route.defaultTitle;
            title = title || '';

            _.each(title.match(/\{:(\w+)\}/g), function(param){
                var key = param.replace('{:', '').replace('}', '');
                title = title.replace('{:'+key+'}', String(data && data[key] ? data[key] : ''));
            });

            return String(title);
        };


        /**
         * Returns a boolean value of whether the "Back" button of the sequences should be shown
         *
         * @returns {boolean}
         */
        this.hasBackBtn = function(){
            this.dep.depend();
            var data = this.currentRoute() ? this.currentRoute().buttons : {};

            return data.showBackButton != undefined ? Boolean(data.showBackButton) : Boolean( this.currentPosition() > 0 );
        };


        /**
         * Returns a boolean value of whether the "Done" button of the sequences should be shown
         *
         * @returns {boolean}
         */
        this.hasNextBtn = function(){
            this.dep.depend();
            var data = this.currentRoute() ? this.currentRoute().buttons : {};

            return data.showNextButton != undefined ? Boolean(data.showNextButton) : Boolean( this.currentPosition() < _sequence.length-1 );
        };


        /**
         * Developer can change the text of "Back" button by setting the "backBtnText" parameter of the page
         *
         * @returns {string|"Back"}
         */
        this.backBtnText = function(){
            this.dep.depend();
            var data = this.currentRoute() ? this.currentRoute().buttons : {};

            return data.backBtnText ? String(data.backBtnText) : String(this.settings.defaultBackBtnText);
        };


        /**
         * Developer can change the text of "Done" button by setting the "doneBtnText" parameter of the page
         *
         * @returns {string|"Done"}
         */
        this.nextBtnText = function(){
            this.dep.depend();
            var data = this.currentRoute() ? this.currentRoute().buttons : {};

            return data.nextBtnText ? String(data.nextBtnText) : String(this.settings.defaultNextBtnText);
        };

        /**
         *
         *
         * @param e
         * @returns {*}
         */
        this.backBtnAction = function(e){
            this.dep.depend();
            var data = this.currentRoute() ? this.currentRoute().buttons : {};

            return _.isFunction(data.backBtnAction) ? data.backBtnAction(e) : this.settings.defaultBackBtnAction(e);
        };


        this.nextBtnAction = function(e){
            this.dep.depend();
            var data = this.currentRoute() ? this.currentRoute().buttons : {};

            return _.isFunction(data.nextBtnAction) ? data.nextBtnAction(e) : this.settings.defaultNextBtnAction(e);
        };


        /**
         * Public clue to move left on route sequence sliders
         *
         * @param posToMove
         * @param keepFollowings
         * @returns {boolean}
         */
        this.back = function(posToMove, keepFollowings){
            posToMove = Math.abs(posToMove) || 1;
            keepFollowings = keepFollowings || false;
            var _this = this,
                pos = this.currentPosition(),
                newPosition = pos > posToMove ? pos - posToMove : 0;

            if( keepFollowings == false ) _removeRouteAfter.call(this, newPosition);
            _refreshUrl.call(this);
            _setPosition.call(this, newPosition);
            this.animateScroller();
        };


        /**
         * Public clue to move right on route sequence sliders
         *
         * @param posToMove
         * @returns {boolean}
         */
        this.next = function(posToMove){
            posToMove = Math.abs(posToMove) || 1;
            var pos = this.currentPosition(),
            newPosition = (this.getSlideStackSize()) > (pos + posToMove) ? (pos + posToMove) : 0;

            _refreshUrl.call(this);
            _setPosition.call(this, newPosition);
            this.animateScroller();
        };


        /**
         * Get the actual stored data
         *
         * @returns {Object}
         */
        this.getData = function(){
            var route = this.currentRoute();
            return route ? route.getData() : {};
        }; //->u will notice i have a bunch of global functions like this: http://snapplr.com/xj4k which get a model based on a session-stored id. We need a consistent API for this.


        /**
         * An arra full of the current sequence's route objects
         *
         * @returns {array(MobiRoute)}
         */
        this.getSlideStack = function(){
            this.dep.depend();
            //var dataTrigger = Session.get('mobi-router-data');
            this.speak('getSlideStack()');
            return _sequence;
        };


        /**
         * Number of routes in the actual sequence
         *
         * @returns {number}
         */
        this.getSlideStackSize = function(){
            this.dep.depend();
            //var dataTrigger = Session.get('mobi-router-data');
            //this.speak('getSlideStackSize()');
            return _sequence.length;
        };


        // Testing functions
        this.getMap = function(){ return _routeMap; };
        this.getSequences = function(){ return _sequences; };

        return this;
    };

    MobiRouter = new MRouter;

    Function.prototype.duplicate = function() {
        var that = this;
        var temp = function temporary() { return that.apply(this, arguments); };
        for( key in this ) {
            temp[key] = this[key];
        }
        return temp;
    };

    $(document).ready(function(){
        Meteor.setTimeout(function(){
            mobiResizeable.resizeAllElements();
            MobiRouter.initScrolls();
            MobiRouter.animateScroller();
        }, 100);
    });

})(jQuery);