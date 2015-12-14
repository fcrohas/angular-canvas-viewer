/**
*  Module
*
* Description
*/
angular.module('app.controller').controller('MainController', ['$scope', function($scope){
	$scope.image = "assets/img/billet_specimen_securite2.jpg";
	$scope.overlays = [{x : 50, y:155, w:106, h:29, color:'#00FF00'}];
}]);