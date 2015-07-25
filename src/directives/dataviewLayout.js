"use strict";

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
    this.$get = function dataviewLayoutFactory($sce, $templateRequest, $compile) {
        var groups = {};

        // Build lazy-download-compile templates factory
        angular.forEach(provider.groups, function groupVisitor(config, group) {
            var groupMap = groups[group] = {};

            // Process all group keys
            angular.forEach(config, function (templateCfg, viewType) {
                var type = groupMap[viewType] = {};

                type.link = function linkStub(scope, cloneFn, options) {
                    if (templateCfg.template) {
                        // Compile directly
                        type.link = $compile(templateCfg.template);
                        type.link(scope, cloneFn, options);
                    } else if (templateCfg.$$templatePromise) {
                        // This is intermediate state
                        templateCfg.$$templatePromise.then(function (linkFn) {
                            linkFn(scope, cloneFn, options);
                        });
                    } else if (templateCfg.templateUrl) {
                        // Load template asynchronously
                        templateCfg.$$templatePromise = $templateRequest($sce.getTrustedResourceUrl(templateCfg.templateUrl)).then(function (template) {
                            return (type.link = $compile(template));
                        });

                        // Link
                        templateCfg.$$templatePromise.then(function (linkFn) {
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
        Object.defineProperty(groups, '$template', {
            enumerable: false,
            writable: false,
            value: function $template(group, viewType) {
                var templates = groups[group] || groups.default;
                return templates && (templates[viewType] || templates.default);
            }
        });

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
    };
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
module.directive('dataviewLayout', function dataviewLayoutDirective($compile, dataviewLayout) {
    return {
        restrict: 'EAC',
        transclude: true,
        link: function dataviewLayoutLink(scope, element, attrs, ctrl, $transclude) {
            var nestedScope;

            scope.$watch(dataviewLayout.$typeAttribute, function typeWatcher(value) {
                if (nestedScope) {
                    nestedScope.$destroy();
                }

                nestedScope = scope.$new();
                var template = dataviewLayout.$template(attrs.type, value);

                if (template) {
                    // Link, let transclude directive handle it
                    template.link(nestedScope, function templateLink(clone) {
                        element.empty();
                        element.append(clone);
                    }, {
                        parentBoundTranscludeFn: $transclude
                    });
                } else {
                    // No template to be used, include content directly
                    $transclude(nestedScope, function transcludeLink(clone) {
                        element.empty();
                        element.append(clone);
                    });
                }
            });
        }
    };
});
