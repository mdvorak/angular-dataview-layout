(function () {
    "use strict";

    angular.module('demo', ['mdvorakDataviewLayout'])
        .config(function demoConfig(dataviewLayoutProvider) {
            // Default
            dataviewLayoutProvider.group({
                default: {
                    template: '<div><h2>Default</h2><ng-transclude></ng-transclude></div>'
                },
                footer: {
                    template: '<div><h2>Default</h2><ng-transclude></ng-transclude><div>With footer</div></div>'
                },
                inside: {
                    template: '<div><h3>Default</h3><ng-transclude></ng-transclude></div>'
                }
            });

            // Custom
            dataviewLayoutProvider.group('custom', {
                inside: {
                    template: '<div><h3>Custom</h3><ng-transclude></ng-transclude></div>'
                }
            });
        })
        .controller('demoCtrl', function demoCtrl($scope, dataviewLayout) {
            var ctrl = this;

            ctrl.templateName = 'default';
            ctrl.templates = Object.keys(dataviewLayout.default);

            Object.defineProperty($scope, '$viewType', {
                get: function () {
                    return ctrl.templateName;
                }
            });
        });
})();
