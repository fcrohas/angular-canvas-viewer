/**
*  Module
*
* Description
*/
angular.module('app.controller').controller('MainController', ['$scope', function($scope){
	$scope.fileInput = "assets/img/billet_specimen_securite2.jpg";
	$scope.overlays = [{x : 50, y:155, w:106, h:29, color:'#00FF00'}];
	$scope.options = {};
}]).directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);