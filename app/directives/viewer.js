angular.module('app.directives').directive('imageViewer', ['$window', function($window){
	// Runs during compile
	return {
		// name: '',
		// priority: 1,
		// terminal: true,
		scope: {
			imageSource : '=src',
			overlays : '=overlays'
		}, // {} = isolate, true = child, false/undefined = no change
		// controller: function($scope, $element, $attrs, $transclude) {},
		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
		template: '<div class="viewer"'+ 
				'width="100%" height="100%"'+  
				'ng-mouseleave="canMove=false"'+ 
				'ng-mousedown="mousedown($event)"'+ 
				'ng-mouseup="mouseup($event)"'+ 
				'ng-init="canMove=false"'+
				'ng-mousemove="mousedrag($event,canMove)">'+
				'<div class="command">'+
				'<div class="btn btn-primary" ng-click="rotateleft()"><i class="fa fa-rotate-left"></i></div>'+
				'<div class="btn btn-primary" ng-click="rotateright()"><i class="fa fa-rotate-right"></i></div>'+
				'<div class="btn btn-primary" ng-click="zoomout()"><i class="fa fa-search-minus"></i></div>'+
				'<div class="btn btn-primary" ng-click="zoomin()"><i class="fa fa-search-plus"></i></div>'+
				'</div>'+
		'</div>',
		// templateUrl: '',
		// replace: true,
		// transclude: true,
		// compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
		link: function($scope, iElm, iAttrs, controller) {
			var	raphaelEl = iElm.find('div')[0];
			var paper = Raphael(raphaelEl, $window.width, $window.height);
			var img = null;
			var zoom = 1.0;
			var rotate = 0;
			var curPos = { x : 0, y : 0};
			var picPos = { x : 0, y : 0};
			var overlays = [];
			var elImage = paper.set();
			$scope.$watch('imageSource', function(value) {
				var imgObj = new Image();
				imgObj.onload = function() {
					img = paper.image(value,0, 0, imgObj.width, imgObj.height);
					img.toBack();
					elImage.push(img);
				}
				imgObj.src = value;
			});

			$scope.$watch('overlays', function(newarr, oldarr) {
				// initialize new overlay
				if (oldarr.length == newarr.length) {
					angular.forEach(newarr, function(item) {
						var rect = paper.rect(item.x, item.y, item.w, item.h, 1);
						rect.attr({ 'fill' : item.color, 'fill-opacity': 0.7, 'stroke-width': 0.2});
						rect.toFront();
						elImage.push(rect);
						overlays.push(rect);
					});
				}
				// new added
				if (newarr.length > oldarr.length) {

				}

				applyTransform();
			}, true);

			function applyTransform() {
				elImage.transform(Raphael.format("s{3},{4},0,0t{1},{2}r{0},0,0", rotate, picPos.x, picPos.y, zoom, zoom));
			}

			$scope.mousedown = function($event) {
				$scope.canMove = true;
				curPos.x = $event.layerX;
				curPos.y = $event.layerY;
			};

			$scope.mouseup= function($event) {
				$scope.canMove = false;
			};

			$scope.mousedrag = function($event,canMove) {
				if (img != null) {
					if ($scope.canMove) {
						var translateX = $event.layerX - curPos.x;
						var translateY = $event.layerY - curPos.y; 
						picPos.x += translateX;
						picPos.y += translateY;
						applyTransform();
						curPos.x = $event.layerX;
						curPos.y = $event.layerY;
					}
				}
			};

			$scope.zoomin = function() {
				zoom += 0.2;
				applyTransform();
			};

			$scope.zoomout = function() {
				zoom -= 0.2;
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