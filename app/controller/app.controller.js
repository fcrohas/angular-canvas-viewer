/**
*  Module
*
* Description
*/
angular.module('app.controller').controller('MainController', ['$scope', function($scope){
	$scope.image = "assets/img/Lauge-carte-identite-1.jpg";
	$scope.overlays = [{x : 526, y:92, w:220, h:30, color:'#AA0000'},{x : 524, y: 242, w:500, h:30, color:'#008800'}];
}]);