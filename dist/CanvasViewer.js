angular.module('CanvasViewer',[]).directive('canvasViewer', ['$window', '$http', function($window, $http){
	// Runs during compile
	return {
		// name: '',
		// priority: 1,
		// terminal: true,
		scope: {
			imageSource : '=src',
			overlays : '=overlays',
			title : '@title',
			isTiff : '=isTiff'
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
				'<div class="btn btn-info" ng-click="rotateleft()"><i class="fa fa-rotate-left"></i></div>'+
				'<div class="btn btn-info" ng-click="rotateright()"><i class="fa fa-rotate-right"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomout()"><i class="fa fa-search-minus"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomin()"><i class="fa fa-search-plus"></i></div></div>'+
		'</div>',
		// templateUrl: '',
		// replace: true,
		// transclude: true,
		// compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
		link: function($scope, iElm, iAttrs, controller) {
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
			var imgObj = null;
			var zoom = 1.0;
			var rotate = 0;
			var curPos = { x : 0, y : 0};
			var picPos = { x : 0, y : 0};
			var overlays = [];

			function IsTiff(mimeType) {
				return ((mimeType == "image/tiff") || (mimeType == "image/tif"));
			}

			$scope.$watch('imageSource', function(value) {
				if (value === undefined || value === null)
					return;
				imgObj = new Image();

				// start once image object is loaded
				imgObj.onload = function() {
					applyTransform();
				};
				
				// test if object or string is input of directive
				if (typeof(value) === 'object') {
					// Object type file
					var reader = new FileReader();
					// read image object
					reader.onload = function() {
						if (IsTiff(value.type)) {
							Tiff.initialize({TOTAL_MEMORY:16777216*10})
							var tiff = new Tiff( {buffer : reader.result});
							imgObj.width = tiff.width();
							imgObj.height = tiff.height();
							imgObj.src = tiff.toDataURL();
						} else {
							imgObj.src = reader.result;
						}
					};
					// start loading image object
					if (IsTiff(value.type)) 
						reader.readAsArrayBuffer(value);
					else
						reader.readAsDataURL(value);
				} else if(typeof(value) === 'string') {
					imgObj.src = value;
				}
			});

			$scope.$watch('overlays', function(newarr, oldarr) {
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

			// Bind mousewheel
			angular.element(canvasEl).bind("DOMMouseScroll mousewheel onmousewheel", function($event) {
                   
                // cross-browser wheel delta
                var event = window.event || $event; // old IE support
                var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

                if(delta > 0) {
					$scope.zoomin();
                } else {
					$scope.zoomout();
                }
                // for IE
                event.returnValue = false;
                // for Chrome and Firefox
                if(event.preventDefault) {
                    event.preventDefault();                        
                }

            });

			function applyTransform() {
				var canvas = ctx.canvas ;
				var centerX = imgObj.width/2;
				var centerY = imgObj.height/2;
				// Clean before draw
				ctx.clearRect(0,0,canvas.width, canvas.height);
				// Save context
				ctx.save();
				// move to mouse position
				ctx.translate((picPos.x + centerX), (picPos.y + centerY)  );
				// Rotate canvas
				ctx.rotate(rotate * Math.PI/180);			   
				// Change scale
				ctx.scale(zoom,zoom);
				// Draw image at correct position with correct scale
				ctx.drawImage(imgObj, -centerX , -centerY , imgObj.width , imgObj.height); 
				// Restore
			    ctx.restore();

				// Draw overlays
				if (overlays.length >0) {
					angular.forEach(overlays, function(item) {
					    ctx.save();
						// move to mouse position
						ctx.translate((picPos.x + centerX) , (picPos.y + centerY));
						// Rotate canvas
						ctx.rotate(rotate * Math.PI/180);			   
						// Change scale
						ctx.scale(zoom,zoom);
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
				$scope.canMove = true;
				curPos.x = $event.offsetX;
				curPos.y = $event.offsetY;
			});

			angular.element(canvasEl).bind('mouseup', function($event) {
				$scope.canMove = false;
			});

			angular.element(canvasEl).bind('mousemove', function($event) {
				if ((imgObj !== null) && ($scope.canMove)) {
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

			$scope.zoomin = function() {
				zoom += 0.1;
				if (zoom >= 6) {
					zoom = 6;
				}
				applyTransform();
			};

			$scope.zoomout = function() {
				zoom -= 0.1;
				if (zoom <= 0.05) {
					zoom = 0.05;
				}
				applyTransform();
			};

			$scope.rotateleft = function() {
				rotate -= 90;
				if (rotate <= -360) {
					rotate = 0;
				}
				applyTransform();
			};

			$scope.rotateright = function() {
				rotate += 90;
				if (rotate >= 360) {
					rotate = 0;
				}
				applyTransform();
			};
		}
	};
}]);	