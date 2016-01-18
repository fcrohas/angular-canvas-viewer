angular.module('app.controller', []);

angular.module('ImageViewerSample', ['app.controller', 'jsonFormatter','CanvasViewer'])
.config(['JSONFormatterConfigProvider', function (JSONFormatterConfigProvider) {

  // Enable the hover preview feature
  JSONFormatterConfigProvider.hoverPreviewEnabled = true;
}]);