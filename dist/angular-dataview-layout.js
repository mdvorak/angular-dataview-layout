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

    /**
     * @ngdoc directive
     * @name mdvorakDataviewLayout.dataviewIfType
     * @restrict A
     * @priority 590
     *
     * @param {template=} dataviewIfType Required type of the view. If it starts with !, it is negated,
     *                                   however no other expressions are supported.
     *
     * @description
     * TODO
     */
    module.directive('dataviewIfType', ["$animate", "dataviewLayout", function dataviewIfTypeDirective($animate, dataviewLayout) {
        // Note: This is almost exact copy of ngIf directive

        return {
            multiElement: true,
            transclude: 'element',
            priority: 590,
            terminal: true,
            restrict: 'A',
            $$tlb: true,
            link: function($scope, $element, $attr, ctrl, $transclude) {
                var block, childScope, previousElements;

                $scope.$watch(dataviewLayout.$typeAttribute, function ngIfWatchAction(value) {
                    // Check $viewType (or defined) value against directive value
                    var visible;
                    if ($attr.dataviewIfType[0] === '!') {
                        visible = (value != $attr.dataviewIfType.substr(1));
                    } else {
                        visible = (value == $attr.dataviewIfType);
                    }

                    if (visible) {
                        if (!childScope) {
                            $transclude(function(clone, newScope) {
                                childScope = newScope;
                                clone[clone.length++] = document.createComment(' end dataviewIfType: ' + dataviewLayout.$typeAttribute + ' ');
                                // Note: We only need the first/last node of the cloned nodes.
                                // However, we need to keep the reference to the jqlite wrapper as it might be changed later
                                // by a directive with templateUrl when its template arrives.
                                block = {
                                    clone: clone
                                };
                                $animate.enter(clone, $element.parent(), $element);
                            });
                        }
                    } else {
                        if (previousElements) {
                            previousElements.remove();
                            previousElements = null;
                        }
                        if (childScope) {
                            childScope.$destroy();
                            childScope = null;
                        }
                        if (block) {
                            previousElements = getBlockNodes(block.clone);
                            $animate.leave(previousElements).then(function() {
                                previousElements = null;
                            });
                            block = null;
                        }
                    }
                });
            }
        };

        // Copied from angular.js
        function getBlockNodes(nodes) {
            var node = nodes[0];
            var endNode = nodes[nodes.length - 1];
            var blockNodes = [node];

            do {
                node = node.nextSibling;
                if (!node) break;
                blockNodes.push(node);
            } while (node !== endNode);

            return angular.element(blockNodes);
        }
    }]);
    /**
     * @ngdoc service
     * @name mdvorakDataviewLayout.dataviewLayoutProvider
     *
     * @description
     * Handles registration of view layouts during config phase.
     */
    module.provider('dataviewLayout', function dataviewLayoutProvider() {
        var provider = this;

        /**
         * @ngdoc property
         * @propertyOf mdvorakDataviewLayout.dataviewLayoutProvider
         * @name typeAttribute
         * @type {string}
         *
         * @description
         * Name of the scope variable, that holds the view type. Default is `$viewType`.
         */
        provider.typeAttribute = '$viewType';

        // TODO rename group to 'layout'
        provider.groups = {};

        /**
         * @ngdoc method
         * @methodOf mdvorakDataviewLayout.dataviewLayoutProvider
         * @name group
         *
         * @param {string=} group Name of the registered group. If omitted, `default` group is used.
         * @param {Object} config Configuration object. Must have set either `template` or `templateUrl` property.
         *
         * @description
         * Registers configuration for the given group. If the group already exists, it is overwritten.
         */
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

        /**
         * @ngdoc service
         * @name mdvorakDataviewLayout.dataviewLayout
         *
         * @description
         * Provides access to registered view layouts by their group.
         * To access them, use
         * {@link mdvorakDataviewLayout.dataviewLayout#methods_$template dataviewLayout.$template(group, viewType)}
         * method.
         *
         * All templates are compiled on demand and linking function is cached.
         */
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

            /**
             * @ngdoc method
             * @methodOf mdvorakDataviewLayout.dataviewLayoutProvider
             * @name $template
             *
             * @param {string} group Name of the registered group. If empty or group does not exist, `default` is used.
             * @param {string} viewType Type of the view the template is for.
             * @return {Object} Object representing given view. It has defined `link(scope, cloneFn, options)` function,
             *                  same as returned by `$compile` factory.
             *
             * @description
             * Returns an object representing the given view. If group is not found and default view is not defined,
             * `undefined` is returned.
             */
            groups.$template = function $template(group, viewType) {
                var templates = groups[group] || groups.default;
                return templates && (templates[viewType] || templates.default);
            };

            /**
             * @ngdoc property
             * @propertyOf mdvorakDataviewLayout.dataviewLayout
             * @name $typeAttribute
             * @type {string}
             *
             * @description
             * Name of the scope variable, that holds the view type. Default is `$viewType`.
             * This is read-only property.
             */
            Object.defineProperty(groups, '$typeAttribute', {
                enumerable: false,
                writable: false,
                value: provider.typeAttribute
            });

            return groups;
        }];
    });

    /**
     * @ngdoc directive
     * @name mdvorakDataviewLayout.dataviewLayout
     * @restrict EAC
     * @priority 0
     *
     * @param {template=} type Optional. Name of the group for the view. If not set, `default` will be used.
     *
     * @description
     * TODO
     */
    module.directive('dataviewLayout', ["$compile", "dataviewLayout", function dataviewLayoutDirective($compile, dataviewLayout) {
        return {
            restrict: 'EAC',
            transclude: true,
            link: function dataviewLayoutLink(scope, element, attrs, ctrl, $transclude) {
                var newScope = scope.$new();
                var template = dataviewLayout.$template(attrs.type, scope[dataviewLayout.$typeAttribute]);

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
