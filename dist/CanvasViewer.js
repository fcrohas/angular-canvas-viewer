angular.module('CanvasViewer',[]).directive('canvasViewer', ['$window', '$http', function($window, $http){
	function switchCommand(options, image, sound) {
		if (options.controls.toolbar) {
			options.controls.image = image;
			options.controls.sound = sound;
		}
	}

	function pdfReader(data, options, callback) {
		switchCommand( options, true, false);
		this.reader = new FileReader();
		// read image object
		var that = this;
		var canvas = document.createElement('canvas');
		var context = canvas.getContext('2d');
		// save canvas size before rendering
		var canvasWidth = canvas.width;
		var canvasHeight = canvas.height;

		that._pdfDoc = null;
		that.viewport = null;
		that.img = new Image();
		that.rendered = false;
		that.width = -1;
		that.height = -1;
		that.data = null;
		that.page = null;
		that.options = options;
		that.currentPage = -1;

		function renderPage(parent) {
			if (parent.page != null) {
				parent.viewport = parent.page.getViewport( parent.options.zoom.value, 0);
				// set viewport
				canvas.width = parent.viewport.width;
				canvas.height = parent.viewport.height;
				// render to canvas
				parent.page.render({canvasContext : context, viewport : parent.viewport, intent : 'display'}).then( function() {
					// restore canvas
					parent.img.onload = function() {
						parent.width = parent.img.width;
						parent.height = parent.img.height;
						callback();
						parent.rendered = true;
					};
					parent.img.src = canvas.toDataURL();
				});
			}
		}

		this.refresh = function() {
				if (that._pdfDoc == null) {
					return;
				}

				if (that.currentPage != that.options.controls.numPage) {
					that._pdfDoc.getPage(that.options.controls.numPage).then(function(page) {
						that.page = page;
						renderPage(that);
						that.currentPage = that.options.controls.numPage;
					});	
				} else {
					renderPage(that);
				}
		};

		this.reader.onload = function() {
			var data = new Uint8Array(that.reader.result);
			PDFJS.getDocument({data : data}).then(function(_pdfDoc) {
				that._pdfDoc = _pdfDoc;
				options.controls.totalPage = _pdfDoc.numPages;
				options.controls.numPage = 1;
				that._pdfDoc.getMetadata().then(function(data) {
					options.info = data.info;
					options.info.metadata = data.metadata;
				});				
				that.refresh();
			});
		};

		this.reader.readAsArrayBuffer(data);
		return this;
	}

	function tiffReader(data, options, callback) {
		switchCommand( options, true, false);
		this.reader = new FileReader();
		var that = this;
		that.rendered = false;
		that.tiff = null;
		that.img = new Image();
		that.img.onload = function() {
			callback();
			that.rendered = true;
		}
		that.data = null;
		that.width = -1;
		that.height = -1;
		that.options = options;	
		that.currentPage = -1;	
		this.refresh = function() {
			if (that.tiff == null) {
				that.tiff = new Tiff( {buffer : that.reader.result});
				that.options.controls.totalPage = that.tiff.countDirectory();
				that.options.controls.numPage = 1;
				that.options.info = {
					width : that.tiff.width(),
					height : that.tiff.height(),
					compression : that.tiff.getField(Tiff.Tag.COMPRESSION),
					document : that.tiff.getField(Tiff.Tag.DOCUMENTNAME),
					description : that.tiff.getField(Tiff.Tag.IMAGEDESCRIPTION),
					orientation : that.tiff.getField(Tiff.Tag.ORIENTATION),
					xresolution : that.tiff.getField(Tiff.Tag.XRESOLUTION),
					yresolution : that.tiff.getField(Tiff.Tag.YRESOLUTION)

				};
			}

			// Limit page number if upper
			if (that.options.controls.numPage > that.options.controls.totalPage) {
				that.options.controls.numPage = that.options.controls.totalPage;
			}
			// Set to correct page
			if (that.currentPage != that.options.controls.numPage) {
				that.tiff.setDirectory(that.options.controls.numPage);
				that.width = that.tiff.width();
				that.height = that.tiff.height();
				//that.data = new Uint8Array(that.tiff.readRGBAImage());			
				that.img.src = that.tiff.toDataURL();
				that.currentPage = that.options.controls.numPage;
			}
		};

		this.reader.onload = function() {
			if (that.tiff != null) {
				that.tiff.close();
				that.tiff = null; 
			}
			Tiff.initialize({TOTAL_MEMORY:16777216*10});
			that.refresh();
			callback();			
			that.rendered = true;			
		};
		this.reader.readAsArrayBuffer(data);
		return this;
	}

	function imageReader(data, options, callback) {
		switchCommand( options, true, false);
		this.reader = new FileReader();
		var that = this;
		that.img = new Image();
		that.img.onload = function() {
			that.width = that.img.width;
			that.height = that.img.height;
			callback();	
			that.rendered = true;
		}	
		that.data = null;
		that.width = -1;
		that.height = -1;
		options.info = {};
		this.reader.onload = function() {
			that.img.src = that.reader.result;
		};
		if (typeof(data) === 'string') {
			that.img.src = data;
		} else {
			this.reader.readAsDataURL(data);
		}
		// PNG or JPEG are one page only
		options.controls.totalPage = 1;
		options.controls.numPage = 1;
		this.refresh = function() {
			// do nothing			
		};
		return this;
	}

	function mpegReader(data, options, callback) {

	}

	function wavReader(data, options, callback) {
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
					if (formatReader[value.type] != undefined) {
						// get object
						var decoder = formatReader[value.type];
						// Create image
						reader = decoder.create(value, scope.options, onload);
					} else {
						console.log(value.type,' not supported !');
					}
				} else if(typeof(value) === 'string') {
					reader = formatReader["image/jpeg"].create(value, scope.options, onload);
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
				ctx.scale( options.zoom.value , options.zoom.value);
				// Draw image at correct position with correct scale
				if (reader.data != null) {
					var imageData = ctx.createImageData(reader.width, reader.height);
    				imageData.data.set(reader.data);
    				ctx.putImageData(imageData, 0, 0);					
				} 
				if (reader.img != null) {
					ctx.drawImage(reader.img, 0 , 0 , reader.width , reader.height);
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
					applyTransform();
				});
			};

			scope.zoomout = function() {
				scope.$applyAsync(function() {
					scope.options.zoom.value -= scope.options.zoom.step;
					if (scope.options.zoom.value <= scope.options.zoom.min) {
						scope.options.zoom.value = scope.options.zoom.min;
					}
					reader.refresh();
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
