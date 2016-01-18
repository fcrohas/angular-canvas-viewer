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
	pdfReader : function(data, options, callback) {
		if (options.controls.toolbar) {
			options.controls.image = true;
			options.controls.sound = false;
		}
		this.reader = new FileReader();
		// read image object
		var that = this;
		var canvas = document.createElement('canvas');
		var context = canvas.getContext('2d');
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
		that.images = [];
		function renderPage(parent) {
			if ((parent.page != null) && !parent.rendering){
				parent.rendering = true;
				parent.oldwidth = parent.width;
				parent.oldheight = parent.height;
				// set viewport only on 1st page with filmstrip
				if ((options.controls.filmStrip) && (that.currentPage == 1)) {
					parent.viewport = parent.page.getViewport( parent.options.zoom.value, 0);
					canvas.width = parent.viewport.width;
					canvas.height = parent.viewport.height;
				} else if (!options.controls.filmStrip) {
					// Always rebuild viewport
					parent.viewport = parent.page.getViewport( parent.options.zoom.value, 0);
					canvas.width = parent.viewport.width;
					canvas.height = parent.viewport.height;
				}
				// render to canvas
				parent.page.render({canvasContext : context, viewport : parent.viewport, intent : 'display'}).then( function() {
					// restore canvas
					parent.img.onload = function() {
						parent.width = parent.img.width;
						parent.height = parent.img.height;
						if (options.controls.filmStrip) {
							// Add rendered image
							parent.images.push(parent.img);
						} else {
							callback();							
						}
						parent.rendered = true;
						parent.rendering = false;

					};
					parent.img.src = canvas.toDataURL();
				});
			}
		}

		this.refresh = function() {
				if (that._pdfDoc == null) {
					return;
				}
				parent.rendered = false;
				if (options.controls.filmStrip) {
					for (var p = 1; p<= options.controls.totalPage; p++) {
						that._pdfDoc.getPage(p).then(function(page) {
							that.page = page;
							renderPage(that);
							that.currentPage = p;
						});
					}
				} else {
					if (that.currentPage != that.options.controls.numPage) {
						that._pdfDoc.getPage(that.options.controls.numPage).then(function(page) {
							that.page = page;
							renderPage(that);
							that.currentPage = that.options.controls.numPage;
						});	
					} else {
						renderPage(that);
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
		that.isZoom = true;
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