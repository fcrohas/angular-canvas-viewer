angular.module('RaphaelViewer',[]).directive('imageViewer', ['$window', function($window){
	// Runs during compile
	return {
		// name: '',
		// priority: 1,
		// terminal: true,
		scope: {
			imageSource : '=src',
			overlays : '=overlays',
			title : '@title'
		}, // {} = isolate, true = child, false/undefined = no change
		// controller: function($scope, $element, $attrs, $transclude) {},
		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
		template: '<div class="viewer-container"><div class="viewer" '+ 
				'width="100%" height="100%"'+  
				'ng-mouseleave="canMove=false"'+ 
				'ng-mousedown="mousedown($event)"'+ 
				'ng-mouseup="mouseup($event)"'+ 
				'ng-init="canMove=false"'+
				'ng-mousemove="mousedrag($event,canMove)">'+
				'<div class="title" ng-if="title!=null">{{title}}</div>'+
				'<div class="command">'+
				'<div class="btn btn-info" ng-click="rotateleft()"><i class="fa fa-rotate-left"></i></div>'+
				'<div class="btn btn-info" ng-click="rotateright()"><i class="fa fa-rotate-right"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomout()"><i class="fa fa-search-minus"></i></div>'+
				'<div class="btn btn-info" ng-click="zoomin()"><i class="fa fa-search-plus"></i></div>'+
				'</div></div>'+
		'</div>',
		// templateUrl: '',
		// replace: true,
		// transclude: true,
		// compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
		link: function($scope, iElm, iAttrs, controller) {
			var	raphaelEl = iElm.find('div')[1];
			// look for 
			var inNode = angular.element(iElm.find('div')[0])[0];
			directiveParentNode = inNode.parentNode.parentNode;
			var paper = Raphael(raphaelEl, directiveParentNode.clientWidth-40, directiveParentNode.clientHeight-10);
			var img = null;
			var zoom = 1.0;
			var rotate = 0;
			var curPos = { x : 0, y : 0};
			var picPos = { x : 0, y : 0};
			var overlays = [];
			var elImage = paper.set();

			$scope.$watch('imageSource', function(value) {
				if (value === undefined || value === null)
					return;
				var imgObj = new Image();

				// Remove element if it exist already
				if (img !== null) {
					img.remove();
					if (elImage.length > 0) {
						for (var i = 1; i< elImage.length; i++) {
							elImage[i].remove();
						}
					}

				}

				if (typeof(value) === 'object') {
					// Object type file
					var reader = new FileReader();
					imgObj.onload = function() {
						img = paper.image(reader.result,0, 0, imgObj.width, imgObj.height);
						img.toBack();
						elImage.push(img);
					};
					reader.onload = function() {
						imgObj.src = reader.result;
					};
					reader.readAsDataURL(value);
				} else if(typeof(value) === 'string') {
					// String url
					imgObj.onload = function() {
						img = paper.image(value,0, 0, imgObj.width, imgObj.height);
						img.toBack();
						elImage.push(img);
					};
					imgObj.src = value;
				}
			});

			$scope.$watch('overlays', function(newarr, oldarr) {
				// initialize new overlay
				if (newarr === null || oldarr === null)
					return;
				// If overlays are thre
				if (overlays.length > 0) {
					// Clean object 
				
					angular.forEach(overlays, function(overlay) {
						overlay.remove();
					});
				}
				// new added
				angular.forEach(newarr, function(item) {
					overlays = [];
					var rect = paper.rect(item.x, item.y, item.w, item.h, 1);
					rect.attr({ 'fill' : item.color, 'fill-opacity': 0.4, 'stroke-width': 0.2});
					rect.toFront();
					elImage.push(rect);
					overlays.push(rect);
				});

				applyTransform();
			}, true);

			// Bind mousewheel
			iElm.bind("DOMMouseScroll mousewheel onmousewheel", function($event) {
                   
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
				elImage.transform(Raphael.format("s{3},{4},0,0t{1},{2}r{0},0,0", rotate, picPos.x, picPos.y, zoom, zoom));				
			}

			$scope.mousedown = function($event) {
				$scope.canMove = true;
				curPos.x = $event.offsetX;
				curPos.y = $event.offsetY;
			};

			$scope.mouseup= function($event) {
				$scope.canMove = false;
			};

			$scope.mousedrag = function($event,canMove) {
				if (img !== null) {
					if ($scope.canMove) {
						var coordX = $event.offsetX;
						var coordY = $event.offsetY;
						var translateX = coordX - curPos.x;
						var translateY = coordY - curPos.y; 
						picPos.x += translateX * 1/zoom;
						picPos.y += translateY * 1/zoom;
						applyTransform();
						curPos.x = coordX;
						curPos.y = coordY;
					}
				}
			};

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