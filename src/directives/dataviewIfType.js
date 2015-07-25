"use strict";

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
module.directive('dataviewIfType', function dataviewIfTypeDirective($animate, dataviewLayout) {
    // Note: This is almost exact copy of ngIf directive

    return {
        multiElement: true,
        transclude: 'element',
        priority: 590,
        terminal: true,
        restrict: 'A',
        $$tlb: true,
        link: function ($scope, $element, $attr, ctrl, $transclude) {
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
                        $transclude(function (clone, newScope) {
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
                        $animate.leave(previousElements).then(function () {
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
});