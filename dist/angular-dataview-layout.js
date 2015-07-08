/**
 * @license angular-dataview-layout v0.0.1
 * (c) 2015 Michal Dvorak https://github.com/mdvorak/angular-dataview-layout
 * License: MIT
 */
(function dataviewLayoutModule(angular) {
    "use strict";

    /**
     * @ngdoc overview
     * @name mdvorakDataviewLayout
     *
     * @description
     * Angular View Layout module.
     */
    var module = angular.module("mdvorakDataviewLayout", []);

    module.provider('dataviewLayout', function dataviewLayoutProvider() {
        var provider = this;

        provider.groups = {};

        provider.group = function groupFn(group, config) {
            if (arguments.length < 2) {
                config = group;
                group = 'default';
            }

            if (!angular.isObject(config)) {
                throw new Error("config must be object");
            }

            provider.groups[group] = config;
        };

        this.$get = ["$sce", "$templateRequest", "$compile", function dataviewLayoutFactory($sce, $templateRequest, $compile) {
            var groups = {};

            // Build lazy-download-compile templates factory
            angular.forEach(provider.groups, function groupVisitor(config, group) {
                var groupMap = groups[group] = {};

                // Process all group keys
                angular.forEach(config, function(templateCfg, viewType) {
                    var type = groupMap[viewType] = {};

                    type.link = function linkStub(scope, cloneFn, options) {
                        if (templateCfg.template) {
                            // Compile directly
                            type.link = groupMap[viewType] = $compile(templateCfg.template);
                            type.link(scope, cloneFn, options);
                        } else if (templateCfg.$$templatePromise) {
                            // This is intermediate state
                            templateCfg.$$templatePromise.then(function(linkFn) {
                                linkFn(scope, cloneFn, options);
                            });
                        } else if (templateCfg.templateUrl) {
                            // Load template asynchronously
                            templateCfg.$$templatePromise = $templateRequest($sce.getTrustedResourceUrl(templateCfg.templateUrl)).then(function(template) {
                                return (type.link = $compile(template));
                            });

                            // Link
                            templateCfg.$$templatePromise.then(function(linkFn) {
                                linkFn(scope, cloneFn, options);
                            });
                        } else {
                            throw new Error("Either template or templateUrl must be set for " + group + "/" + viewType);
                        }
                    }; // linkStub
                }); // forEach config
            }); // forEach groups

            // Accessor function
            groups.$$template = function $$template(group, viewType) {
                var templates = groups[group] || groups.default;
                return templates && (templates[viewType] || templates.default);
            };

            return groups;
        }];
    });

    module.directive('dataviewLayout', ["$compile", "dataviewLayout", function dataviewLayoutDirective($compile, dataviewLayout) {
        return {
            restrict: 'EAC',
            transclude: true,
            link: function dataviewLayoutLink(scope, element, attrs, ctrl, $transclude) {
                var newScope = scope.$new();
                var template = dataviewLayout.$$template(attrs.type, scope.$viewType);

                if (template) {
                    // Link, let transclude directive handle it
                    template.link(newScope, function templateLink(clone) {
                        element.empty();
                        element.append(clone);
                    }, {
                        parentBoundTranscludeFn: $transclude
                    });
                } else {
                    // No template to be used, include content directly
                    $transclude(newScope, function transcludeLink(clone) {
                        element.empty();
                        element.append(clone);
                    });
                }
            }
        };
    }]);

})(angular);
