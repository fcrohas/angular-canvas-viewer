## Description

This is a picture and sound viewer directive for AngularJS

## Demo

A sample demo is available [here](http://fcrohas.github.io/angular-canvas-viewer).

## Prerequisites

* FontAweSome ( for nice icons library)
* BootStrap ( for button look&feel )

## Features

- [x]	Support many format of pictures and sound (PNG, JPG, PDF, TIFF, WAV, OGG, MPEG)
- [x]	Module delivery or whole package
- [x]	Image rotation and Zoom parametric ( Rotation angle by default is set to 90°)
- [x]	External control
- [x]	Metadata information extraction
- [x]	Support multipage ( TIFF and PDF)

## How to build

You need  `npm` package manager :

    # npm install
    # gulp dist

## How to use it

 The directive usage is as follow ( CanvasViewer.min.worker.js must be in same folder that CanvasViewer.min.js but not in `script` tag ), `src` can be either a `string` or a `File` or `Blob` object :

```html
<html>
	<head>
		<link rel="stylesheet" href="dist/CanvasViewer.all.min.css">
		<script src="dist/CanvasViewer.all.min.js" type="text/javascript" charset="utf-8"></script>	
	</head>
	<body>
		<canvas-viewer src="test.jpg" title="TITLE" overlays="overlays" options="options"></canvas-viewer>
	</body>
</html>
```
> `title` and `overlays` are optional.

Usage with $http or input type file :

```javascript
$http.get("assets/img/billet_specimen_securite2.jpg", { responseType : 'blob'}).then(function(resp) {
   $scope.fileInput = resp.data;
});
```

```html
<canvas-viewer src="fileInput" title="TITLE" overlays="overlays" options="options"></canvas-viewer>
```

`overlays` is an `Array Of Object`  like :

```javascript
$scope.overlays = [{x : 50, y:155, w:106, h:29, color:'#00FF00'}];
```

`options` is an `Object` as follow :

Name | Properties | Definition
---- | ---------- | ----------
zoom | value | Read or write the zoom factor (By default : 1.0)
zoom | step | Set the zoom factor increment
zoom | min | Minimum zoom factor allowed
zoom | max | Maximum zoom factor allowed
rotate | value | Read or write the rotation angle of picture (By default : 0)
rotate | step | Set the rotation angle increment
controls | toolbar | Boolean to show/hide toolbar controls button
controls | image | Boolean to show/hide pictures controls button
controls | sound | Boolean to show/hide sound controls button
controls | fit | Possible values are `page` , `height` or `width`
controls | disableZoom | Disable zoom functionnality
controls | disableRotate | Disable rotate functionnality
controls | disableMove | Disable move functionnality
controls | numPage | Current page to display ( only for TIFF and PDF)
controls | totalPage | Total number of pages ( only for TIFF and PDF)
controls | filmstrip | Display multipage as film
adsrc | | The Current `AudioContext` object ( Only for sound)
ctx | | The Current `CanvasContext` object ( Only for sound)
info | | The Metadata properties of viewed object ( Only for pictures)

Sample `options` object with initial value or simple empty object `{}`:

```javascript
var options = {
		zoom : {
			value : 0.5,
			step : 0.01
		},
		rotate : {
			value : 90
		}
	};
```
