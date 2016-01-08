angular.module('CanvasViewer',[]).directive('canvasViewer', ['$window', '$http', function($window, $http){
	var formatReader = new FormatReader();

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
		// controller: ['$scope', '$element', '$attrs', '$transclude' ,function(scope, $element, $attrs, $transclude) {
		// 	console.log('la',scope.options);
		// 	console.log(scope.options);

		// }],
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
				'<div class="command" ng-if="options.controls.image">'+
				'<div class="btn btn-info" ng-click="options.controls.numPage=options.controls.numPage-1" ng-hide="options.controls.totalPage==1"><i class="fa fa-minus"></i></div>'+
				'<div class="btn btn-info" ng-hide="options.controls.totalPage==1">{{options.controls.numPage}}/{{options.controls.totalPage}}</div>'+
				'<div class="btn btn-info" ng-click="options.controls.numPage=options.controls.numPage+1" ng-hide="options.controls.totalPage==1"><i class="fa fa-plus"></i></div>'+				
				'<div class="btn btn-info" ng-click="fittopage()"><i class="fa fa-file-o"></i></div>'+
				'<div class="btn btn-info" ng-click="rotateleft()" ng-hide="options.controls.disableRotate"><i class="fa fa-rotate-left"></i></div>'+
				'<div class="btn btn-info" ng-click="rotateright()" ng-hide="options.controls.disableRotate"><i class="fa fa-rotate-right"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomout()" ng-hide="options.controls.disableZoom"><i class="fa fa-search-minus"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomin()" ng-hide="options.controls.disableZoom"><i class="fa fa-search-plus"></i></div></div>'+
				'<div class="command" ng-if="options.controls.sound">'+
				'<div class="btn btn-info" ng-click="stop()"><i class="fa fa-stop"></i></div>'+
				'<div class="btn btn-info" ng-click="play()"><i class="fa fa-play"></i></div></div>'+
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
			var curPos = { x : 0, y : 0};
			var picPos = { x : 0, y : 0};
			var overlays = [];
			var reader = null;
			// Merge scope with default values
			scope.options = angular.merge({}, {
				ctx : null,
				adsrc : null,
				zoom : {
					value : 1.0,
					step : 0.1,
					min : 0.05,
					max : 6
				},
				rotate : {
					value : 0,
					step : 90
				},
				controls : {
					toolbar : true,
					image : true,
					sound : false,
					fit : 'page',
					disableZoom : false,
					disableMove : false,
					disableRotate : false,
					numPage : 1,
					totalPage : 1
				},
				info : {}
			}, scope.options );

			scope.options.ctx = ctx;

			function onload() {
				if (reader == null) {
					return;
				}
				applyTransform();
				if (!reader.rendered) {
					resizeTo(scope.options.controls.fit);
				}
			}

			scope.$watch('imageSource', function(value) {
				if (value === undefined || value === null)
					return;
				// initialize values on load
				scope.options.zoom.value = 1.0;
				scope.options.rotate.value = 0;
				curPos = { x : 0, y : 0};
				picPos = { x : 0, y : 0};

				// test if object or string is input of directive
				if (typeof(value) === 'object') {
					// Object type file
					if (formatReader.IsSupported(value.type) != undefined) {
						// get object
						var decoder = formatReader.CreateReader(value.type);
						// Create image
						reader = decoder.create(value, scope.options, onload);
					} else {
						console.log(value.type,' not supported !');
					}
				} else if(typeof(value) === 'string') {
					reader = formatReader.CreateReader("image/jpeg").create(value, scope.options, onload);
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
				if (!scope.options.controls.disableZoom) {
					applyTransform();
				}
			});

			scope.$watch('options.rotate.value', function() {
				if (!scope.options.controls.disableRotate) {
					applyTransform();
				}
			});

			scope.$watch('options.controls.fit', function(value) {
				resizeTo(value);
			});

			scope.$watch('options.controls.numPage', function(value) {
				if (reader != null) {
					reader.refresh();
				}
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

			function resizeTo(value) {
				switch(value) {
					case 'width' : scope.fittowidth(); break;
					case 'height' : scope.fittoheight(); break;
					case 'page' :
					default : scope.fittopage(); 
				}
			}

			function applyTransform() {
				if (reader == null) {
					return;
				}

				var options = scope.options;
				var canvas = ctx.canvas ;
				var centerX = reader.width * options.zoom.value/2;
				var centerY = reader.height * options.zoom.value/2;
				// Clean before draw
				ctx.clearRect(0,0,canvas.width, canvas.height);
				// Save context
				ctx.save();
				// move to mouse position
				ctx.translate((picPos.x + centerX), (picPos.y + centerY) );
				// Rotate canvas
				ctx.rotate( options.rotate.value * Math.PI/180);
				// Go back
				ctx.translate(- centerX, - centerY);
				// Change scale
				if (reader.isZoom)
					ctx.scale( options.zoom.value , options.zoom.value);
				// Draw image at correct position with correct scale
				if (reader.data != null) {
					var imageData = ctx.createImageData(reader.width, reader.height);
    				imageData.data.set(reader.data);
    				ctx.putImageData(imageData, 0, 0);					
				} 
				if (reader.img != null) {
					ctx.drawImage(reader.img, 0 , 0 , reader.width , reader.height);
					ctx.beginPath();
					ctx.rect(0, 0, reader.width , reader.height );
					ctx.lineWidth = 0.2;
					ctx.strokeStyle = "#000000";
					ctx.stroke();
				}
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
						// Go back
						ctx.translate(- centerX, - centerY);
						// Change scale
						ctx.scale( options.zoom.value , options.zoom.value);
						// Start rect draw
						ctx.beginPath();
						ctx.rect((item.x ), (item.y ), item.w , item.h );
						ctx.fillStyle = item.color;
						ctx.globalAlpha = 0.4;
						ctx.fill();
						ctx.lineWidth = 1;
						ctx.strokeStyle = item.color;
						ctx.stroke();
					    ctx.restore();
					});
				}
			}

			angular.element(canvasEl).bind('mousedown' , function($event) {
				if (scope.options.controls.disableMove) {
					return;
				}

				scope.canMove = true;
				curPos.x = $event.offsetX;
				curPos.y = $event.offsetY;
			});

			angular.element(canvasEl).bind('mouseup', function($event) {
				if (scope.options.controls.disableMove) {
					return;
				}

				scope.canMove = false;
			});

			angular.element(canvasEl).bind('mousemove', function($event) {
				if (scope.options.controls.disableMove) {
					return;
				}

				if ((reader !== null) && (scope.canMove)) {
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
				scope.$applyAsync(function() {
					scope.options.zoom.value += scope.options.zoom.step;
					if (scope.options.zoom.value >= scope.options.zoom.max) {
						scope.options.zoom.value = scope.options.zoom.max;
					}
					reader.refresh();
				});
			};

			scope.zoomout = function() {
				scope.$applyAsync(function() {
					scope.options.zoom.value -= scope.options.zoom.step;
					if (scope.options.zoom.value <= scope.options.zoom.min) {
						scope.options.zoom.value = scope.options.zoom.min;
					}
					reader.refresh();
				});
			};

			scope.rotateleft = function() {
				scope.$applyAsync(function() {
					scope.options.rotate.value -= scope.options.rotate.step;
					if (scope.options.rotate.value <= -360) {
						scope.options.rotate.value = 0;
					}
					applyTransform();
				});
			};

			scope.rotateright = function() {
				scope.$applyAsync(function() {
					scope.options.rotate.value += scope.options.rotate.step;
					if (scope.options.rotate.value >= 360) {
						scope.options.rotate.value = 0;
					}
					applyTransform();
				});
			};

			scope.fittopage = function() {
				scope.$applyAsync(function() {
					var options = scope.options;
					var ratioH = ctx.canvas.height / reader.height;
					var ratioW = ctx.canvas.width / reader.width;
					scope.options.zoom.value = Math.min(ratioH,ratioW);
					curPos = { x : 0, y : 0};
					picPos = { x : 0, y : 0};
					// Update options state
					scope.options.controls.fit = 'page';
					applyTransform();
				});
			};

			scope.fittoheight = function() {
				scope.$applyAsync(function() {
					var options = scope.options;
					var ratioH = ctx.canvas.height / reader.height;
					scope.options.zoom.value = ratioH;
					curPos = { x : 0, y : 0};
					picPos = { x : 0, y : 0};
					// Update options state
					scope.options.controls.fit = 'height';
					applyTransform();
				});
			};

			scope.fittowidth = function() {
				scope.$applyAsync(function() {
					var options = scope.options;
					var ratioW = ctx.canvas.width / reader.width;
					scope.options.zoom.value = ratioW;
					curPos = { x : 0, y : 0};
					picPos = { x : 0, y : 0};
					// Update options state
					scope.options.controls.fit = 'width';
					applyTransform();
				});
			};

			scope.play = function() {
				if (scope.options.adsrc!=null) {
					scope.options.adsrc.start(0);
				}
			}

			scope.stop = function() {
				if (scope.options.adsrc!=null) {
					scope.options.adsrc.stop(0);
				}
			}

            // resize canvas on window resize to keep aspect ratio
			angular.element($window).bind('resize', function() {
				scope.$applyAsync(function() {
					var canvasSize = canvasEl.parentNode;
					ctx.canvas.width  = canvasSize.clientWidth;
					ctx.canvas.height = canvasSize.clientHeight;
					ctx.canvas.style.width  = canvasSize.clientWidth;
					ctx.canvas.style.height = canvasSize.clientHeight;
					applyTransform();
				});
			});
      	}
	};
}]);
