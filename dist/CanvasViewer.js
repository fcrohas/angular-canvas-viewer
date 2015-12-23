angular.module('CanvasViewer',[]).directive('canvasViewer', ['$window', '$http', function($window, $http){
	function pdfReader(data, options) {
		this.reader = new FileReader();
		// read image object
		var that = this;
		that.viewport = null;
		that.imgObj = options.imgObj;
		this.reader.onload = function() {
			var data = new Uint8Array(that.reader.result);
			PDFJS.getDocument({data : data}).then(function(_pdfDoc) {
				_pdfDoc.getPage(1).then(function(page) {
					that.viewport = page.getViewport( options.zoom.value, options.rotate.value);
					// save canvas size before rendering
					var canvasWidth = options.ctx.canvas.width;
					var canvasHeight = options.ctx.canvas.height;
					// set viewport
					options.ctx.canvas.width = that.viewport.width;
					options.ctx.canvas.height = that.viewport.height;
					// render to canvas
					page.render({canvasContext : options.ctx, viewport : that.viewport, intent : 'print'}).then( function() {
						that.imgObj.width = that.viewport.width;
						that.imgObj.height = that.viewport.height;
						that.imgObj.src = options.ctx.canvas.toDataURL();
						// restore canvas
						options.ctx.canvas.width = canvasWidth;
						options.ctx.canvas.height = canvasHeight;
					});
				});
			});
		};
		this.reader.readAsArrayBuffer(data);
		return this.reader;
	}

	function tiffReader(data, options) {
		this.reader = new FileReader();
		var that = this;
		that.imgObj = options.imgObj;
		this.reader.onload = function() {
			Tiff.initialize({TOTAL_MEMORY:16777216*10})
			that.tiff = new Tiff( {buffer : that.reader.result});
			that.imgObj.width = that.tiff.width();
			that.imgObj.height = that.tiff.height();
			that.imgObj.src = that.tiff.toDataURL();
		};
		this.reader.readAsArrayBuffer(data);
		return this.reader;
	}

	function imageReader(data, options) {
		this.reader = new FileReader();
		var that = this;
		that.imgObj = options.imgObj;
		this.reader.onload = function() {
			that.imgObj.src = that.reader.result;
		};
		this.reader.readAsDataURL(data);
	}

	function mpegReader(data, imgObj) {

	}

	function wavReader(data, imgObj) {

	}
	// Runs during compile
	var formatReader = {
		"image/tiff" : { create : tiffReader },
		"application/pdf" : { create : pdfReader },
		"image/png" : { create : imageReader},
		"image/jpeg" : { create : imageReader},
		"audio/wav" : { create : wavReader},
		"audio/mpeg" : { create : mpegReader}
	};

	return {
		// name: '',
		// priority: 1,
		// terminal: true,
		scope: {
			imageSource : '=src',
			overlays : '=overlays',
			title : '@title',
			options : '=options'
		}, // {} = isolate, true = child, false/undefined = no change
		// controller: function($scope, $element, $attrs, $transclude) {},
		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
		template: '<div class="viewer-container"><canvas class="viewer" '+ 
				'ng-mouseleave="canMove=false"'+ 
				'ng-mousedown="mousedown($event)"'+ 
				'ng-mouseup="mouseup($event)"'+ 
				'ng-init="canMove=false"'+
				'ng-mousemove="mousedrag($event,canMove)">'+
				'</canvas>'+
				'<div class="title" ng-if="title!=null">{{title}}</div>'+
				'<div class="command">'+
				'<div class="btn btn-info" ng-click="fittopage()"><i class="fa fa-file-o"></i></div>'+
				'<div class="btn btn-info" ng-click="rotateleft()"><i class="fa fa-rotate-left"></i></div>'+
				'<div class="btn btn-info" ng-click="rotateright()"><i class="fa fa-rotate-right"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomout()"><i class="fa fa-search-minus"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomin()"><i class="fa fa-search-plus"></i></div></div>'+
		'</div>',
		// templateUrl: '',
		// replace: true,
		// transclude: true,
		// compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
		link: function(scope, iElm, iAttrs, controller) {
			var	canvasEl = iElm.find('canvas')[0];
			var ctx = canvasEl.getContext('2d');
			// look for 
			var inNode = angular.element(iElm.find('div')[0])[0];
			directiveParentNode = inNode.parentNode.parentNode;
			// orce correct canvas size
			var canvasSize = canvasEl.parentNode;
			ctx.canvas.width  = canvasSize.clientWidth;
			ctx.canvas.height = canvasSize.clientHeight;
			ctx.canvas.style.width  = canvasSize.clientWidth;
			ctx.canvas.style.height = canvasSize.clientHeight;
			// initialize variable
			var img = null;
			angular.extend(scope.options, {
				imgObj : null, 
				ctx : ctx, 
				zoom : { value : 1.0,
						 step : 0.1,
						 min : 0.05,
						 max : 6,
						},  
				rotate : { value : 0,
						   step : 90
						}
			});
			var curPos = { x : 0, y : 0};
			var picPos = { x : 0, y : 0};
			var overlays = [];

			scope.$watch('imageSource', function(value) {
				if (value === undefined || value === null)
					return;
				scope.options.imgObj = new Image();
				// initialize values on load
				scope.options.zoom.value = 1.0;
				scope.options.rotate.value = 0;
				curPos = { x : 0, y : 0};
				picPos = { x : 0, y : 0};

				// start once image object is loaded
				scope.options.imgObj.onload = function() {
					applyTransform();
				};
				
				// test if object or string is input of directive
				if (typeof(value) === 'object') {
					// Object type file
					formatReader[value.type].create(value, scope.options);
				} else if(typeof(value) === 'string') {
					scope.options.imgObj.src = value;
				}
			});

			scope.$watch('overlays', function(newarr, oldarr) {
				// initialize new overlay
				if (newarr === null || oldarr === null)
					return;

				// new added
				overlays = [];				
				angular.forEach(newarr, function(item) {
					overlays.push(item);
				});

				applyTransform();
			}, true);

			scope.$watch('options.zoom.value', function() {
				applyTransform();
			});

			scope.$watch('options.rotate.value', function() {
				applyTransform();
			});

			// Bind mousewheel
			angular.element(canvasEl).bind("DOMMouseScroll mousewheel onmousewheel", function($event) {
                   
                // cross-browser wheel delta
                var event = window.event || $event; // old IE support
                var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

                if(delta > 0) {
					scope.zoomin();
                } else {
					scope.zoomout();
                }
                // for IE
                event.returnValue = false;
                // for Chrome and Firefox
                if(event.preventDefault) {
                    event.preventDefault();                        
                }

            });

			function applyTransform() {
				var options = scope.options;
				var canvas = ctx.canvas ;
				var centerX = options.imgObj.width/2;
				var centerY = options.imgObj.height/2;
				// Clean before draw
				ctx.clearRect(0,0,canvas.width, canvas.height);
				// Save context
				ctx.save();
				// move to mouse position
				ctx.translate((picPos.x + centerX), (picPos.y + centerY)  );
				// Rotate canvas
				ctx.rotate( options.rotate.value * Math.PI/180);			   
				// Change scale
				ctx.scale( options.zoom.value , options.zoom.value);
				// Draw image at correct position with correct scale
				ctx.drawImage(options.imgObj, -centerX , -centerY , options.imgObj.width , options.imgObj.height); 
				// Restore
			    ctx.restore();

				// Draw overlays
				if (overlays.length >0) {
					angular.forEach(overlays, function(item) {
					    ctx.save();
						// move to mouse position
						ctx.translate((picPos.x + centerX) , (picPos.y + centerY));
						// Rotate canvas
						ctx.rotate( options.rotate.value * Math.PI/180);			   
						// Change scale
						ctx.scale( options.zoom.value , options.zoom.value);
						// Start rect draw
						ctx.beginPath();
						ctx.rect((item.x - centerX), (item.y - centerY), item.w , item.h );
						ctx.fillStyle = 'rgba(255,0,0,0.4)';
						ctx.fill();
						ctx.lineWidth = 1;
						ctx.strokeStyle = 'rgb(255,0,128)';
						ctx.stroke();						
					    ctx.restore();
					});
				}
			}

			angular.element(canvasEl).bind('mousedown' , function($event) {
				scope.canMove = true;
				curPos.x = $event.offsetX;
				curPos.y = $event.offsetY;
			});

			angular.element(canvasEl).bind('mouseup', function($event) {
				scope.canMove = false;
			});

			angular.element(canvasEl).bind('mousemove', function($event) {
				if ((scope.options.imgObj !== null) && (scope.canMove)) {
						var coordX = $event.offsetX;
						var coordY = $event.offsetY;
						var translateX = coordX - curPos.x;
						var translateY = coordY - curPos.y; 
						picPos.x += translateX;
						picPos.y += translateY;
						applyTransform();
						curPos.x = coordX;
						curPos.y = coordY;
				}
			});

			scope.zoomin = function() {
				scope.options.zoom.value += scope.options.zoom.step;
				if (scope.options.zoom.value >= scope.options.zoom.max) {
					scope.options.zoom.value = scope.options.zoom.max;
				}
				applyTransform();
			};

			scope.zoomout = function() {
				scope.options.zoom.value -= scope.options.zoom.step;
				if (scope.options.zoom.value <= scope.options.zoom.min) {
					scope.options.zoom.value = scope.options.zoom.min;
				}
				applyTransform();
			};

			scope.rotateleft = function() {
				scope.options.rotate.value -= scope.options.rotate.step;
				if (scope.options.rotate.value <= -360) {
					scope.options.rotate.value = 0;
				}
				applyTransform();
			};

			scope.rotateright = function() {
				scope.options.rotate.value += scope.options.rotate.step;
				if (scope.options.rotate.value >= 360) {
					scope.options.rotate.value = 0;
				}
				applyTransform();
			};

			scope.fittopage = function() {
				var options = scope.options;
				if ((options.imgObj.height > options.imgObj.width) && (options.imgObj.height > ctx.canvas.height)) {
					scope.options.zoom.value = ctx.canvas.height / options.imgObj.height;	
				} else if (options.imgObj.width > ctx.canvas.width) {
					scope.options.zoom.value = ctx.canvas.width / options.imgObj.width;	
				}
				curPos = { x : 0, y : 0};
				picPos = { x : 0, y : 0};
				applyTransform();
			};
		}
	};
}]);	