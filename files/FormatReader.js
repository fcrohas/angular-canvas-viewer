function FormatReader() {
	this.mimetype = [
		"image/png",
		"image/jpeg"
	];
	// Test supported mime types
	// Is PDF module present
	if (typeof(PDFJS) !== "undefined") {
		// Remove it from list
		this.mimetype.push("application/pdf");
		PDFJS.disableWorker = false;
	}
	// Is Tiff module present
	if (typeof(Tiff) !== "undefined") {
		// Remove it from list
		this.mimetype.push("image/tif");
		this.mimetype.push("image/tiff");
	}
	// Test for audio support
	try {
		var audioTest = $window.AudioContext || $window.webkitAudioContext || $window.mozAudioContext || $window.msAudioContext;
		if (typeof(audioTest) !== "undefined") {
			this.mimetype.push("audio/x-wav");
			this.mimetype.push("audio/wav");
			this.mimetype.push("audio/x-ogg");
			this.mimetype.push("audio/ogg");
			this.mimetype.push("audio/x-mpeg");
			this.mimetype.push("audio/mpeg");
		}
	} catch(ex) {

	}
}

FormatReader.prototype = {
	pdfReader : function(data, options, callback, $q, $timeout, ctx) {
		if (options.controls.toolbar) {
			options.controls.image = true;
			options.controls.sound = false;
		}
		this.reader = new FileReader();
		// read image object
		var that = this;
		that.context = ctx;
		that.$q = $q;
		that._pdfDoc = null;
		that.viewport = null;
		that.img = new Image();
		that.rendered = false;
		that.width = -1;
		that.height = -1;
		that.oldwidth = -1;
		that.oldheight = -1;
		that.data = null;
		that.page = null;
		that.options = options;
		that.currentPage = -1;
		that.rendering = false;
		that.isZoom = false;
		that.data = [];
		that.triggerRefresh = false;
		function renderPage(parent, pageNum, pageObj) {
			if (pageNum == undefined) {
				pageNum = that.currentPage;
			}

			if (pageObj == undefined) {
				pageObj = parent.page; 
			}
			var canvas = document.createElement('canvas');
			var context = canvas.getContext('2d');
			if ((pageObj != null)/* && !parent.rendering*/){
				parent.rendering = true;
				parent.oldwidth = parent.width;
				parent.oldheight = parent.height;
				// set viewport only on 1st page with filmstrip
				if (Math.abs(parent.options.zoom.value) == 0) parent.options.zoom.value = 1.0;
				var viewport = pageObj.getViewport( parent.options.zoom.value, 0);
				context.canvas.width = viewport.width;
				context.canvas.height = viewport.height;
				// render to canvas
				return pageObj.render({canvasContext : context, viewport : viewport, intent : 'display'}).then( function() {
					// restore canvas
					// var img = new Image();
					// img.onload = function() {
					// 	parent.width = img.width;
					// 	parent.height = img.height;
					// 	if (options.controls.filmStrip) {
					// 		// Add rendered image
					// 		img.pageNum = pageNum;
					// 		parent.images.push(img);
					// 		that.img = img;
					// 		if (parent.images.length == options.controls.totalPage) {
					// 			// Do sorting of all pictures
					// 			parent.images.sort( function(objA, objB) {
					// 				return objA.pageNum - objB.pageNum;
					// 			});
					// 			// Do drawing on rendering ended
					// 			parent.rendered = true;
					// 			callback();	
					// 			//
					// 		}
					// 	} else {
					// 		// Single image rendering
					// 		that.img = img;
					// 		that.rendered = true;							
					// 		// Do drawing on rendering ended
					// 		callback();	
					// 	}
					// 	parent.rendering = false;

					// };
					// img.src = canvas.toDataURL();
					parent.width = viewport.width;
					parent.height = viewport.height;

					if (options.controls.filmStrip) {
						var item = context.getImageData( 0, 0, viewport.width, viewport.height);
						item.pageNum = pageNum;
						parent.data.push(item);
						if (parent.data.length == options.controls.totalPage) {
							// Do sorting of all pictures
							parent.data.sort( function(objA, objB) {
								return objA.pageNum - objB.pageNum;
							});
							// Do drawing on rendering ended
							parent.rendered = true;
							callback();	
							parent.rendering = false;					
						}
					} else {
						that.data = context.getImageData(0,0,viewport.width,viewport.height);
						that.rendered = true;					
						callback();
						parent.rendering = false;					
					}
				});
			}
		}

		this.refresh = function() {
				if (that._pdfDoc == null) {
					return;
				}
				if (parent.rendering) {
					return;
				}
				that.rendered = false;
				if (options.controls.filmStrip) {
					var p = 1;
					var promises = [];
					that.data = [];
					for (var p = 1; p <= options.controls.totalPage; p++) {
						promises.push( that._pdfDoc.getPage(p) );
					}
					that.$q.all(promises).then(function(pages) {
						for (var p =0; p<pages.length; p++) {
							renderPage(that, pages[p].pageIndex, pages[p]);
						}
					});

				} else {
					if (that.currentPage != that.options.controls.numPage) {
						that._pdfDoc.getPage(that.options.controls.numPage).then(function(page) {
							renderPage(that, that.options.controls.numPage, page);
						});	
					} else {
						renderPage(that, that.options.controls.numPage, page);
					}
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
	},

	tiffReader : function(data, options, callback) {
		if (options.controls.toolbar) {
			options.controls.image = true;
			options.controls.sound = false;
		}
		this.reader = new FileReader();
		var that = this;
		that.rendered = false;
		that.tiff = null;
		that.img = null;
		that.data = null;
		that.width = -1;
		that.height = -1;
		that.options = options;	
		that.images = [];
		that.currentPage = -1;	
		that.isZoom = true;
		this.refresh = function() {
			if (that.reader.result==undefined)
				return;
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
			if (that.options.controls.filmStrip) {
				that.images = [];
				for(var p=0; p < that.tiff.countDirectory(); p++) {
					that.tiff.setDirectory(p);
					// Set only first page @TODO
					if (p==0) {
						that.width = that.tiff.width();
						that.height = that.tiff.height();
					}
					that.images[p] = new Image();
					that.images[p].onload = function() {
						if (that.images.length == 1) {
							that.img = that.images[0];
						}
						callback();
						that.rendered = true;						
					}
					that.images[p].src = that.tiff.toDataURL();
					that.images[p].pageNum = p;
					//that.currentPage = that.options.controls.numPage;
				}

			} else {
				if (that.currentPage != that.options.controls.numPage) {
					that.tiff.setDirectory(that.options.controls.numPage-1);
					that.width = that.tiff.width();
					that.height = that.tiff.height();
					that.img = new Image();
					that.img.onload = function() {
						callback();
						that.rendered = true;						
					}					
					that.img.src = that.tiff.toDataURL();
					that.currentPage = that.options.controls.numPage;
				}
			}
		};

		this.reader.onload = function() {
			if (that.tiff != null) {
				that.tiff.close();
				that.tiff = null; 
			}
			Tiff.initialize({TOTAL_MEMORY:16777216*5});
			that.refresh();
		};
		this.reader.readAsArrayBuffer(data);
		return this;
	},

	imageReader : function(data, options, callback) {
		if (options.controls.toolbar) {
			options.controls.image = true;
			options.controls.sound = false;
		}
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
		that.isZoom = true;
		that.rendered = false;
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
	},

	mpegReader : function(data, options, callback) {

	},

	wavReader : function(data, options, callback) {
		if (options.controls.toolbar) {
			options.controls.image = false;
			options.controls.sound = true;
		}

		this.reader = new FileReader();
		var that = this;
		var ctx = options.ctx;
		this.width = ctx.canvas.width;
		this.height = ctx.canvas.height;
		try {
			// Fix up for prefixing
			$window.AudioContext = $window.AudioContext || $window.webkitAudioContext || $window.mozAudioContext || $window.msAudioContext;
			$window.requestAnimationFrame = $window.requestAnimationFrame || $window.webkitRequestAnimationFrame || $window.mozRequestAnimationFrame || $window.msRequestAnimationFrame;
			$window.cancelAnimationFrame = $window.cancelAnimationFrame || $window.webkitCancelAnimationFrame || $window.mozCancelAnimationFrame || $window.msCancelAnimationFrame;
			var adctx = new AudioContext();
			// update options context audio
			this.reader.onload = function() {
				// creates a sound source
				adctx.decodeAudioData( that.reader.result , function(buffer) {
					var gradient = ctx.createLinearGradient(0,0,0,that.height);
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
					        ctx.fillRect(i*5,that.height-value,3,that.height);
					    }
					}
					// connect to destination, else it isn't called
					javascriptNode.connect(adctx.destination);
					// connect the source to the context's destination (the speakers)
					source.connect(adctx.destination);
				});
			};
			this.reader.readAsArrayBuffer(data);
		}
		catch(e) {
		}
	},
	// Runs during compile
	CreateReader : function(mimeType, obj) {
		var reader = null;

		if (mimeType == "") {
			mimeType = this.GuessMimeType(obj);
		}

		switch(mimeType.toLowerCase()) {
			case "image/tif" :
			case "image/tiff" :reader = { create : this.tiffReader }; break;
			case "application/pdf" : reader = { create : this.pdfReader }; break;
			case "image/png" : 
			case "image/jpeg" : reader = { create : this.imageReader}; break;
			case "audio/x-wav" : 
			case "audio/wav" : 
			case "audio/x-ogg" : 
			case "audio/ogg" : reader = { create : this.wavReader}; break;
			case "audio/x-mpeg" : 
			case "audio/mpeg" : reader = { create : this.mpegReader}; break;
		};
		return reader;
	},
	IsSupported : function(mimeType) {
		return (this.mimetype.indexOf(mimeType) != -1);
	},
	GuessMimeType : function(obj) {
		// try to guess mime type if not available
		var mimeType = "";
		if (obj.type == "") {
			var fileName = obj.name;
			mimeType = "image/"+fileName.substring(fileName.indexOf('.')+1);
		}
		return mimeType.toLowerCase();
	}
}