angular.module('CanvasViewer',[]).directive('canvasViewer', ['$window', '$http', function($window, $http){
	function switchCommand(options, image, sound) {
		if (options.controls.toolbar) {
			options.controls.image = image;
			options.controls.sound = sound;
		}
	}

	function pdfReader(data, options) {
		switchCommand( options, true, false);
		this.reader = new FileReader();
		// read image object
		var that = this;
		that.viewport = null;
		that.imgObj = options.imgObj;
		this.refresh = function() {
				that._pdfDoc.getPage(options.controls.numPage).then(function(page) {
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
				that._pdfDoc.getMetadata().then(function(data) {
					options.info = data.info;
					options.info.metadata = data.metadata;
				});				

		};

		this.reader.onload = function() {
			var data = new Uint8Array(that.reader.result);
			PDFJS.getDocument({data : data}).then(function(_pdfDoc) {
				that._pdfDoc = _pdfDoc;
				options.controls.totalPage = _pdfDoc.numPages;
				options.controls.numPage = 1;
				that.refresh();
			});
		};

		this.reader.readAsArrayBuffer(data);
		return this;
	}

	function tiffReader(data, options) {
		switchCommand( options, true, false);
		this.reader = new FileReader();
		var that = this;
		that.imgObj = options.imgObj;
		this.refresh = function() {
			// Limit page number if upper
			if (options.controls.numPage > that.tiff.countDirectory()) {
				options.controls.numPage = that.tiff.countDirectory();
			}
			// Set to correct page
			that.tiff.setDirectory(options.controls.numPage);
			that.imgObj.width = that.tiff.width();
			that.imgObj.height = that.tiff.height();
			that.imgObj.src = that.tiff.toDataURL();
			options.info = {
				width : that.tiff.getField(Tiff.Tag.IMAGEWIDTH),
				height : that.tiff.getField(Tiff.Tag.IMAGELENGTH),
				compression : that.tiff.getField(Tiff.Tag.COMPRESSION),
				document : that.tiff.getField(Tiff.Tag.DOCUMENTNAME),
				description : that.tiff.getField(Tiff.Tag.IMAGEDESCRIPTION),
				orientation : that.tiff.getField(Tiff.Tag.ORIENTATION),
				resolution : that.tiff.getField(Tiff.Tag.XRESOLUTION)

			};
		};

		this.reader.onload = function() {
			Tiff.initialize({TOTAL_MEMORY:16777216*10});
			that.tiff = new Tiff( {buffer : that.reader.result});
			options.controls.totalPage = that.tiff.countDirectory();
			options.controls.numPage = 1;
			that.refresh();

		};
		this.reader.readAsArrayBuffer(data);
		return this;
	}

	function imageReader(data, options) {
		switchCommand( options, true, false);
		this.reader = new FileReader();
		var that = this;
		that.imgObj = options.imgObj;
		this.reader.onload = function() {
			that.imgObj.src = that.reader.result;
		};
		this.reader.readAsDataURL(data);
		// PNG or JPEG are one page only
		options.controls.totalPage = 1;
		options.controls.numPage = 1;
		this.refresh = function() {
			// do nothing			
		};
		return this;
	}

	function mpegReader(data, options) {

	}

	function wavReader(data, options) {
		switchCommand( options, false, true);
		this.reader = new FileReader();
		var that = this;
		var ctx = options.ctx;
		try {
			// Fix up for prefixing
			$window.AudioContext = $window.AudioContext || $window.webkitAudioContext;
			var adctx = new AudioContext();
			// update options context audio
			this.reader.onload = function() {
				// creates a sound source
				adctx.decodeAudioData( that.reader.result , function(buffer) {
					var gradient = ctx.createLinearGradient(0,0,0,300);
					gradient.addColorStop(1,'#000000');
					gradient.addColorStop(0.75,'#ff0000');
					gradient.addColorStop(0.25,'#ffff00');
					gradient.addColorStop(0,'#ffffff');
					// setup a javascript node
					var javascriptNode = adctx.createScriptProcessor(2048, 1, 1);
					var source = adctx.createBufferSource();
					options.adsrc = source;
					// tell the source which sound to play
					source.buffer = buffer;
					// setup a analyzer
					var analyser = adctx.createAnalyser();
					analyser.smoothingTimeConstant = 0.3;
					analyser.fftSize = 512;
					// connect the source to the analyser
					source.connect(analyser);
					// we use the javascript node to draw at a specific interval.
					analyser.connect(javascriptNode);
					javascriptNode.onaudioprocess = function() {
					    // get the average for the first channel
					    var array =  new Uint8Array(analyser.frequencyBinCount);
					    analyser.getByteFrequencyData(array);
					    // clear the current state
					    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

					    // set the fill style
					    ctx.fillStyle=gradient;
						for ( var i = 0; i < (array.length); i++ ){
					        var value = array[i];
					        ctx.fillRect(i*5,325-value,3,325);
					    }
					}
					// connect to destination, else it isn't called
					javascriptNode.connect(adctx.destination);
					// connect the source to the context's destination (the speakers)
					source.connect(adctx.destination);
					source.start(0);
				});
			};
			this.reader.readAsArrayBuffer(data);
		}
		catch(e) {
		}
	}
	// Runs during compile
	var formatReader = {
		"image/tiff" : { create : tiffReader },
		"application/pdf" : { create : pdfReader },
		"image/png" : { create : imageReader},
		"image/jpeg" : { create : imageReader},
		"audio/x-wav" : { create : wavReader},
		"audio/wav" : { create : wavReader},
		"audio/x-ogg" : { create : wavReader},
		"audio/ogg" : { create : wavReader},
		"audio/x-mpeg" : { create : mpegReader},
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
				'<div class="btn btn-info" ng-click="options.controls.numPage=options.controls.numPage-1" ng-hide="options.controls.numPage==options.controls.totalPage"><i class="fa fa-minus"></i></div>'+
				'<div class="btn btn-info" ng-hide="options.controls.numPage==options.controls.totalPage">{{options.controls.numPage}}/{{options.controls.totalPage}}</div>'+
				'<div class="btn btn-info" ng-click="options.controls.numPage=options.controls.numPage+1" ng-hide="options.controls.numPage==options.controls.totalPage"><i class="fa fa-plus"></i></div>'+				
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
				imgObj : null,
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
					resizeTo(scope.options.controls.fit);
				};

				// test if object or string is input of directive
				if (typeof(value) === 'object') {
					// Object type file
					if (formatReader[value.type] != undefined) {
						// get object
						var decoder = formatReader[value.type];
						// Create image
						reader = decoder.create(value, scope.options);
					} else {
						console.log(value.type,' not supported !');
					}
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
				var options = scope.options;
				var canvas = ctx.canvas ;
				var centerX = options.imgObj.width * options.zoom.value/2;
				var centerY = options.imgObj.height * options.zoom.value/2;
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
				ctx.scale( options.zoom.value , options.zoom.value);
				// Draw image at correct position with correct scale
				ctx.drawImage(options.imgObj, 0 , 0 , options.imgObj.width , options.imgObj.height);
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
				scope.$applyAsync(function() {
					scope.options.zoom.value += scope.options.zoom.step;
					if (scope.options.zoom.value >= scope.options.zoom.max) {
						scope.options.zoom.value = scope.options.zoom.max;
					}
					applyTransform();
				});
			};

			scope.zoomout = function() {
				scope.$applyAsync(function() {
					scope.options.zoom.value -= scope.options.zoom.step;
					if (scope.options.zoom.value <= scope.options.zoom.min) {
						scope.options.zoom.value = scope.options.zoom.min;
					}
					applyTransform();
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
					var ratioH = ctx.canvas.height / options.imgObj.height;
					var ratioW = ctx.canvas.width / options.imgObj.width;
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
					var ratioH = ctx.canvas.height / options.imgObj.height;
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
					var ratioW = ctx.canvas.width / options.imgObj.width;
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
					scope.options.adsrc.noteOn(0);
				}
			}

			scope.stop = function() {
				if (scope.options.adsrc!=null) {
					scope.options.adsrc.noteOff(0);
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
