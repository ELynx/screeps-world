'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var _a$3, _b$1;
(_a$3 = Memory.missions) !== null && _a$3 !== void 0 ? _a$3 : (Memory.missions = {});
(_b$1 = Memory.missionReports) !== null && _b$1 !== void 0 ? _b$1 : (Memory.missionReports = []);

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var Reflect;
(function (Reflect) {
    // Metadata Proposal
    // https://rbuckton.github.io/reflect-metadata/
    (function (factory) {
        var root = typeof commonjsGlobal === "object" ? commonjsGlobal :
            typeof self === "object" ? self :
                typeof this === "object" ? this :
                    Function("return this;")();
        var exporter = makeExporter(Reflect);
        if (typeof root.Reflect === "undefined") {
            root.Reflect = Reflect;
        }
        else {
            exporter = makeExporter(root.Reflect, exporter);
        }
        factory(exporter);
        function makeExporter(target, previous) {
            return function (key, value) {
                if (typeof target[key] !== "function") {
                    Object.defineProperty(target, key, { configurable: true, writable: true, value: value });
                }
                if (previous)
                    previous(key, value);
            };
        }
    })(function (exporter) {
        var hasOwn = Object.prototype.hasOwnProperty;
        // feature test for Symbol support
        var supportsSymbol = typeof Symbol === "function";
        var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
        var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
        var supportsCreate = typeof Object.create === "function"; // feature test for Object.create support
        var supportsProto = { __proto__: [] } instanceof Array; // feature test for __proto__ support
        var downLevel = !supportsCreate && !supportsProto;
        var HashMap = {
            // create an object in dictionary mode (a.k.a. "slow" mode in v8)
            create: supportsCreate
                ? function () { return MakeDictionary(Object.create(null)); }
                : supportsProto
                    ? function () { return MakeDictionary({ __proto__: null }); }
                    : function () { return MakeDictionary({}); },
            has: downLevel
                ? function (map, key) { return hasOwn.call(map, key); }
                : function (map, key) { return key in map; },
            get: downLevel
                ? function (map, key) { return hasOwn.call(map, key) ? map[key] : undefined; }
                : function (map, key) { return map[key]; },
        };
        // Load global or shim versions of Map, Set, and WeakMap
        var functionPrototype = Object.getPrototypeOf(Function);
        var usePolyfill = typeof process === "object" && process.env && process.env["REFLECT_METADATA_USE_MAP_POLYFILL"] === "true";
        var _Map = !usePolyfill && typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
        var _Set = !usePolyfill && typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
        var _WeakMap = !usePolyfill && typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
        // [[Metadata]] internal slot
        // https://rbuckton.github.io/reflect-metadata/#ordinary-object-internal-methods-and-internal-slots
        var Metadata = new _WeakMap();
        /**
         * Applies a set of decorators to a property of a target object.
         * @param decorators An array of decorators.
         * @param target The target object.
         * @param propertyKey (Optional) The property key to decorate.
         * @param attributes (Optional) The property descriptor for the target key.
         * @remarks Decorators are applied in reverse order.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Example = Reflect.decorate(decoratorsArray, Example);
         *
         *     // property (on constructor)
         *     Reflect.decorate(decoratorsArray, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.decorate(decoratorsArray, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Object.defineProperty(Example, "staticMethod",
         *         Reflect.decorate(decoratorsArray, Example, "staticMethod",
         *             Object.getOwnPropertyDescriptor(Example, "staticMethod")));
         *
         *     // method (on prototype)
         *     Object.defineProperty(Example.prototype, "method",
         *         Reflect.decorate(decoratorsArray, Example.prototype, "method",
         *             Object.getOwnPropertyDescriptor(Example.prototype, "method")));
         *
         */
        function decorate(decorators, target, propertyKey, attributes) {
            if (!IsUndefined(propertyKey)) {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
                    throw new TypeError();
                if (IsNull(attributes))
                    attributes = undefined;
                propertyKey = ToPropertyKey(propertyKey);
                return DecorateProperty(decorators, target, propertyKey, attributes);
            }
            else {
                if (!IsArray(decorators))
                    throw new TypeError();
                if (!IsConstructor(target))
                    throw new TypeError();
                return DecorateConstructor(decorators, target);
            }
        }
        exporter("decorate", decorate);
        // 4.1.2 Reflect.metadata(metadataKey, metadataValue)
        // https://rbuckton.github.io/reflect-metadata/#reflect.metadata
        /**
         * A default metadata decorator factory that can be used on a class, class member, or parameter.
         * @param metadataKey The key for the metadata entry.
         * @param metadataValue The value for the metadata entry.
         * @returns A decorator function.
         * @remarks
         * If `metadataKey` is already defined for the target and target key, the
         * metadataValue for that key will be overwritten.
         * @example
         *
         *     // constructor
         *     @Reflect.metadata(key, value)
         *     class Example {
         *     }
         *
         *     // property (on constructor, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticProperty;
         *     }
         *
         *     // property (on prototype, TypeScript only)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         property;
         *     }
         *
         *     // method (on constructor)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         static staticMethod() { }
         *     }
         *
         *     // method (on prototype)
         *     class Example {
         *         @Reflect.metadata(key, value)
         *         method() { }
         *     }
         *
         */
        function metadata(metadataKey, metadataValue) {
            function decorator(target, propertyKey) {
                if (!IsObject(target))
                    throw new TypeError();
                if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
                    throw new TypeError();
                OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
            }
            return decorator;
        }
        exporter("metadata", metadata);
        /**
         * Define a unique metadata entry on the target.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param metadataValue A value that contains attached metadata.
         * @param target The target object on which to define metadata.
         * @param propertyKey (Optional) The property key for the target.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     Reflect.defineMetadata("custom:annotation", options, Example);
         *
         *     // property (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticProperty");
         *
         *     // property (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "property");
         *
         *     // method (on constructor)
         *     Reflect.defineMetadata("custom:annotation", options, Example, "staticMethod");
         *
         *     // method (on prototype)
         *     Reflect.defineMetadata("custom:annotation", options, Example.prototype, "method");
         *
         *     // decorator factory as metadata-producing annotation.
         *     function MyAnnotation(options): Decorator {
         *         return (target, key?) => Reflect.defineMetadata("custom:annotation", options, target, key);
         *     }
         *
         */
        function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        exporter("defineMetadata", defineMetadata);
        /**
         * Gets a value indicating whether the target object or its prototype chain has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object or its prototype chain; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasMetadata", hasMetadata);
        /**
         * Gets a value indicating whether the target object has the provided metadata key defined.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata key was defined on the target object; otherwise, `false`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.hasOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function hasOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("hasOwnMetadata", hasOwnMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object or its prototype chain.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetMetadata(metadataKey, target, propertyKey);
        }
        exporter("getMetadata", getMetadata);
        /**
         * Gets the metadata value for the provided metadata key on the target object.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns The metadata value for the metadata key if found; otherwise, `undefined`.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function getOwnMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
        }
        exporter("getOwnMetadata", getOwnMetadata);
        /**
         * Gets the metadata keys defined on the target object or its prototype chain.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getMetadataKeys(Example.prototype, "method");
         *
         */
        function getMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryMetadataKeys(target, propertyKey);
        }
        exporter("getMetadataKeys", getMetadataKeys);
        /**
         * Gets the unique metadata keys defined on the target object.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns An array of unique metadata keys.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.getOwnMetadataKeys(Example);
         *
         *     // property (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.getOwnMetadataKeys(Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.getOwnMetadataKeys(Example.prototype, "method");
         *
         */
        function getOwnMetadataKeys(target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            return OrdinaryOwnMetadataKeys(target, propertyKey);
        }
        exporter("getOwnMetadataKeys", getOwnMetadataKeys);
        /**
         * Deletes the metadata entry from the target object with the provided key.
         * @param metadataKey A key used to store and retrieve metadata.
         * @param target The target object on which the metadata is defined.
         * @param propertyKey (Optional) The property key for the target.
         * @returns `true` if the metadata entry was found and deleted; otherwise, false.
         * @example
         *
         *     class Example {
         *         // property declarations are not part of ES6, though they are valid in TypeScript:
         *         // static staticProperty;
         *         // property;
         *
         *         constructor(p) { }
         *         static staticMethod(p) { }
         *         method(p) { }
         *     }
         *
         *     // constructor
         *     result = Reflect.deleteMetadata("custom:annotation", Example);
         *
         *     // property (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticProperty");
         *
         *     // property (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "property");
         *
         *     // method (on constructor)
         *     result = Reflect.deleteMetadata("custom:annotation", Example, "staticMethod");
         *
         *     // method (on prototype)
         *     result = Reflect.deleteMetadata("custom:annotation", Example.prototype, "method");
         *
         */
        function deleteMetadata(metadataKey, target, propertyKey) {
            if (!IsObject(target))
                throw new TypeError();
            if (!IsUndefined(propertyKey))
                propertyKey = ToPropertyKey(propertyKey);
            var metadataMap = GetOrCreateMetadataMap(target, propertyKey, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return false;
            if (!metadataMap.delete(metadataKey))
                return false;
            if (metadataMap.size > 0)
                return true;
            var targetMetadata = Metadata.get(target);
            targetMetadata.delete(propertyKey);
            if (targetMetadata.size > 0)
                return true;
            Metadata.delete(target);
            return true;
        }
        exporter("deleteMetadata", deleteMetadata);
        function DecorateConstructor(decorators, target) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsConstructor(decorated))
                        throw new TypeError();
                    target = decorated;
                }
            }
            return target;
        }
        function DecorateProperty(decorators, target, propertyKey, descriptor) {
            for (var i = decorators.length - 1; i >= 0; --i) {
                var decorator = decorators[i];
                var decorated = decorator(target, propertyKey, descriptor);
                if (!IsUndefined(decorated) && !IsNull(decorated)) {
                    if (!IsObject(decorated))
                        throw new TypeError();
                    descriptor = decorated;
                }
            }
            return descriptor;
        }
        function GetOrCreateMetadataMap(O, P, Create) {
            var targetMetadata = Metadata.get(O);
            if (IsUndefined(targetMetadata)) {
                if (!Create)
                    return undefined;
                targetMetadata = new _Map();
                Metadata.set(O, targetMetadata);
            }
            var metadataMap = targetMetadata.get(P);
            if (IsUndefined(metadataMap)) {
                if (!Create)
                    return undefined;
                metadataMap = new _Map();
                targetMetadata.set(P, metadataMap);
            }
            return metadataMap;
        }
        // 3.1.1.1 OrdinaryHasMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasmetadata
        function OrdinaryHasMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return true;
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryHasMetadata(MetadataKey, parent, P);
            return false;
        }
        // 3.1.2.1 OrdinaryHasOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryhasownmetadata
        function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return false;
            return ToBoolean(metadataMap.has(MetadataKey));
        }
        // 3.1.3.1 OrdinaryGetMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetmetadata
        function OrdinaryGetMetadata(MetadataKey, O, P) {
            var hasOwn = OrdinaryHasOwnMetadata(MetadataKey, O, P);
            if (hasOwn)
                return OrdinaryGetOwnMetadata(MetadataKey, O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (!IsNull(parent))
                return OrdinaryGetMetadata(MetadataKey, parent, P);
            return undefined;
        }
        // 3.1.4.1 OrdinaryGetOwnMetadata(MetadataKey, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarygetownmetadata
        function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return undefined;
            return metadataMap.get(MetadataKey);
        }
        // 3.1.5.1 OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarydefineownmetadata
        function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ true);
            metadataMap.set(MetadataKey, MetadataValue);
        }
        // 3.1.6.1 OrdinaryMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinarymetadatakeys
        function OrdinaryMetadataKeys(O, P) {
            var ownKeys = OrdinaryOwnMetadataKeys(O, P);
            var parent = OrdinaryGetPrototypeOf(O);
            if (parent === null)
                return ownKeys;
            var parentKeys = OrdinaryMetadataKeys(parent, P);
            if (parentKeys.length <= 0)
                return ownKeys;
            if (ownKeys.length <= 0)
                return parentKeys;
            var set = new _Set();
            var keys = [];
            for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
                var key = ownKeys_1[_i];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            for (var _a = 0, parentKeys_1 = parentKeys; _a < parentKeys_1.length; _a++) {
                var key = parentKeys_1[_a];
                var hasKey = set.has(key);
                if (!hasKey) {
                    set.add(key);
                    keys.push(key);
                }
            }
            return keys;
        }
        // 3.1.7.1 OrdinaryOwnMetadataKeys(O, P)
        // https://rbuckton.github.io/reflect-metadata/#ordinaryownmetadatakeys
        function OrdinaryOwnMetadataKeys(O, P) {
            var keys = [];
            var metadataMap = GetOrCreateMetadataMap(O, P, /*Create*/ false);
            if (IsUndefined(metadataMap))
                return keys;
            var keysObj = metadataMap.keys();
            var iterator = GetIterator(keysObj);
            var k = 0;
            while (true) {
                var next = IteratorStep(iterator);
                if (!next) {
                    keys.length = k;
                    return keys;
                }
                var nextValue = IteratorValue(next);
                try {
                    keys[k] = nextValue;
                }
                catch (e) {
                    try {
                        IteratorClose(iterator);
                    }
                    finally {
                        throw e;
                    }
                }
                k++;
            }
        }
        // 6 ECMAScript Data Typ0es and Values
        // https://tc39.github.io/ecma262/#sec-ecmascript-data-types-and-values
        function Type(x) {
            if (x === null)
                return 1 /* Null */;
            switch (typeof x) {
                case "undefined": return 0 /* Undefined */;
                case "boolean": return 2 /* Boolean */;
                case "string": return 3 /* String */;
                case "symbol": return 4 /* Symbol */;
                case "number": return 5 /* Number */;
                case "object": return x === null ? 1 /* Null */ : 6 /* Object */;
                default: return 6 /* Object */;
            }
        }
        // 6.1.1 The Undefined Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-undefined-type
        function IsUndefined(x) {
            return x === undefined;
        }
        // 6.1.2 The Null Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-null-type
        function IsNull(x) {
            return x === null;
        }
        // 6.1.5 The Symbol Type
        // https://tc39.github.io/ecma262/#sec-ecmascript-language-types-symbol-type
        function IsSymbol(x) {
            return typeof x === "symbol";
        }
        // 6.1.7 The Object Type
        // https://tc39.github.io/ecma262/#sec-object-type
        function IsObject(x) {
            return typeof x === "object" ? x !== null : typeof x === "function";
        }
        // 7.1 Type Conversion
        // https://tc39.github.io/ecma262/#sec-type-conversion
        // 7.1.1 ToPrimitive(input [, PreferredType])
        // https://tc39.github.io/ecma262/#sec-toprimitive
        function ToPrimitive(input, PreferredType) {
            switch (Type(input)) {
                case 0 /* Undefined */: return input;
                case 1 /* Null */: return input;
                case 2 /* Boolean */: return input;
                case 3 /* String */: return input;
                case 4 /* Symbol */: return input;
                case 5 /* Number */: return input;
            }
            var hint = PreferredType === 3 /* String */ ? "string" : PreferredType === 5 /* Number */ ? "number" : "default";
            var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
            if (exoticToPrim !== undefined) {
                var result = exoticToPrim.call(input, hint);
                if (IsObject(result))
                    throw new TypeError();
                return result;
            }
            return OrdinaryToPrimitive(input, hint === "default" ? "number" : hint);
        }
        // 7.1.1.1 OrdinaryToPrimitive(O, hint)
        // https://tc39.github.io/ecma262/#sec-ordinarytoprimitive
        function OrdinaryToPrimitive(O, hint) {
            if (hint === "string") {
                var toString_1 = O.toString;
                if (IsCallable(toString_1)) {
                    var result = toString_1.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            else {
                var valueOf = O.valueOf;
                if (IsCallable(valueOf)) {
                    var result = valueOf.call(O);
                    if (!IsObject(result))
                        return result;
                }
                var toString_2 = O.toString;
                if (IsCallable(toString_2)) {
                    var result = toString_2.call(O);
                    if (!IsObject(result))
                        return result;
                }
            }
            throw new TypeError();
        }
        // 7.1.2 ToBoolean(argument)
        // https://tc39.github.io/ecma262/2016/#sec-toboolean
        function ToBoolean(argument) {
            return !!argument;
        }
        // 7.1.12 ToString(argument)
        // https://tc39.github.io/ecma262/#sec-tostring
        function ToString(argument) {
            return "" + argument;
        }
        // 7.1.14 ToPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-topropertykey
        function ToPropertyKey(argument) {
            var key = ToPrimitive(argument, 3 /* String */);
            if (IsSymbol(key))
                return key;
            return ToString(key);
        }
        // 7.2 Testing and Comparison Operations
        // https://tc39.github.io/ecma262/#sec-testing-and-comparison-operations
        // 7.2.2 IsArray(argument)
        // https://tc39.github.io/ecma262/#sec-isarray
        function IsArray(argument) {
            return Array.isArray
                ? Array.isArray(argument)
                : argument instanceof Object
                    ? argument instanceof Array
                    : Object.prototype.toString.call(argument) === "[object Array]";
        }
        // 7.2.3 IsCallable(argument)
        // https://tc39.github.io/ecma262/#sec-iscallable
        function IsCallable(argument) {
            // NOTE: This is an approximation as we cannot check for [[Call]] internal method.
            return typeof argument === "function";
        }
        // 7.2.4 IsConstructor(argument)
        // https://tc39.github.io/ecma262/#sec-isconstructor
        function IsConstructor(argument) {
            // NOTE: This is an approximation as we cannot check for [[Construct]] internal method.
            return typeof argument === "function";
        }
        // 7.2.7 IsPropertyKey(argument)
        // https://tc39.github.io/ecma262/#sec-ispropertykey
        function IsPropertyKey(argument) {
            switch (Type(argument)) {
                case 3 /* String */: return true;
                case 4 /* Symbol */: return true;
                default: return false;
            }
        }
        // 7.3 Operations on Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-objects
        // 7.3.9 GetMethod(V, P)
        // https://tc39.github.io/ecma262/#sec-getmethod
        function GetMethod(V, P) {
            var func = V[P];
            if (func === undefined || func === null)
                return undefined;
            if (!IsCallable(func))
                throw new TypeError();
            return func;
        }
        // 7.4 Operations on Iterator Objects
        // https://tc39.github.io/ecma262/#sec-operations-on-iterator-objects
        function GetIterator(obj) {
            var method = GetMethod(obj, iteratorSymbol);
            if (!IsCallable(method))
                throw new TypeError(); // from Call
            var iterator = method.call(obj);
            if (!IsObject(iterator))
                throw new TypeError();
            return iterator;
        }
        // 7.4.4 IteratorValue(iterResult)
        // https://tc39.github.io/ecma262/2016/#sec-iteratorvalue
        function IteratorValue(iterResult) {
            return iterResult.value;
        }
        // 7.4.5 IteratorStep(iterator)
        // https://tc39.github.io/ecma262/#sec-iteratorstep
        function IteratorStep(iterator) {
            var result = iterator.next();
            return result.done ? false : result;
        }
        // 7.4.6 IteratorClose(iterator, completion)
        // https://tc39.github.io/ecma262/#sec-iteratorclose
        function IteratorClose(iterator) {
            var f = iterator["return"];
            if (f)
                f.call(iterator);
        }
        // 9.1 Ordinary Object Internal Methods and Internal Slots
        // https://tc39.github.io/ecma262/#sec-ordinary-object-internal-methods-and-internal-slots
        // 9.1.1.1 OrdinaryGetPrototypeOf(O)
        // https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
        function OrdinaryGetPrototypeOf(O) {
            var proto = Object.getPrototypeOf(O);
            if (typeof O !== "function" || O === functionPrototype)
                return proto;
            // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
            // Try to determine the superclass constructor. Compatible implementations
            // must either set __proto__ on a subclass constructor to the superclass constructor,
            // or ensure each class has a valid `constructor` property on its prototype that
            // points back to the constructor.
            // If this is not the same as Function.[[Prototype]], then this is definately inherited.
            // This is the case when in ES6 or when using __proto__ in a compatible browser.
            if (proto !== functionPrototype)
                return proto;
            // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
            var prototype = O.prototype;
            var prototypeProto = prototype && Object.getPrototypeOf(prototype);
            if (prototypeProto == null || prototypeProto === Object.prototype)
                return proto;
            // If the constructor was not a function, then we cannot determine the heritage.
            var constructor = prototypeProto.constructor;
            if (typeof constructor !== "function")
                return proto;
            // If we have some kind of self-reference, then we cannot determine the heritage.
            if (constructor === O)
                return proto;
            // we have a pretty good guess at the heritage.
            return constructor;
        }
        // naive Map shim
        function CreateMapPolyfill() {
            var cacheSentinel = {};
            var arraySentinel = [];
            var MapIterator = /** @class */ (function () {
                function MapIterator(keys, values, selector) {
                    this._index = 0;
                    this._keys = keys;
                    this._values = values;
                    this._selector = selector;
                }
                MapIterator.prototype["@@iterator"] = function () { return this; };
                MapIterator.prototype[iteratorSymbol] = function () { return this; };
                MapIterator.prototype.next = function () {
                    var index = this._index;
                    if (index >= 0 && index < this._keys.length) {
                        var result = this._selector(this._keys[index], this._values[index]);
                        if (index + 1 >= this._keys.length) {
                            this._index = -1;
                            this._keys = arraySentinel;
                            this._values = arraySentinel;
                        }
                        else {
                            this._index++;
                        }
                        return { value: result, done: false };
                    }
                    return { value: undefined, done: true };
                };
                MapIterator.prototype.throw = function (error) {
                    if (this._index >= 0) {
                        this._index = -1;
                        this._keys = arraySentinel;
                        this._values = arraySentinel;
                    }
                    throw error;
                };
                MapIterator.prototype.return = function (value) {
                    if (this._index >= 0) {
                        this._index = -1;
                        this._keys = arraySentinel;
                        this._values = arraySentinel;
                    }
                    return { value: value, done: true };
                };
                return MapIterator;
            }());
            return /** @class */ (function () {
                function Map() {
                    this._keys = [];
                    this._values = [];
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                }
                Object.defineProperty(Map.prototype, "size", {
                    get: function () { return this._keys.length; },
                    enumerable: true,
                    configurable: true
                });
                Map.prototype.has = function (key) { return this._find(key, /*insert*/ false) >= 0; };
                Map.prototype.get = function (key) {
                    var index = this._find(key, /*insert*/ false);
                    return index >= 0 ? this._values[index] : undefined;
                };
                Map.prototype.set = function (key, value) {
                    var index = this._find(key, /*insert*/ true);
                    this._values[index] = value;
                    return this;
                };
                Map.prototype.delete = function (key) {
                    var index = this._find(key, /*insert*/ false);
                    if (index >= 0) {
                        var size = this._keys.length;
                        for (var i = index + 1; i < size; i++) {
                            this._keys[i - 1] = this._keys[i];
                            this._values[i - 1] = this._values[i];
                        }
                        this._keys.length--;
                        this._values.length--;
                        if (key === this._cacheKey) {
                            this._cacheKey = cacheSentinel;
                            this._cacheIndex = -2;
                        }
                        return true;
                    }
                    return false;
                };
                Map.prototype.clear = function () {
                    this._keys.length = 0;
                    this._values.length = 0;
                    this._cacheKey = cacheSentinel;
                    this._cacheIndex = -2;
                };
                Map.prototype.keys = function () { return new MapIterator(this._keys, this._values, getKey); };
                Map.prototype.values = function () { return new MapIterator(this._keys, this._values, getValue); };
                Map.prototype.entries = function () { return new MapIterator(this._keys, this._values, getEntry); };
                Map.prototype["@@iterator"] = function () { return this.entries(); };
                Map.prototype[iteratorSymbol] = function () { return this.entries(); };
                Map.prototype._find = function (key, insert) {
                    if (this._cacheKey !== key) {
                        this._cacheIndex = this._keys.indexOf(this._cacheKey = key);
                    }
                    if (this._cacheIndex < 0 && insert) {
                        this._cacheIndex = this._keys.length;
                        this._keys.push(key);
                        this._values.push(undefined);
                    }
                    return this._cacheIndex;
                };
                return Map;
            }());
            function getKey(key, _) {
                return key;
            }
            function getValue(_, value) {
                return value;
            }
            function getEntry(key, value) {
                return [key, value];
            }
        }
        // naive Set shim
        function CreateSetPolyfill() {
            return /** @class */ (function () {
                function Set() {
                    this._map = new _Map();
                }
                Object.defineProperty(Set.prototype, "size", {
                    get: function () { return this._map.size; },
                    enumerable: true,
                    configurable: true
                });
                Set.prototype.has = function (value) { return this._map.has(value); };
                Set.prototype.add = function (value) { return this._map.set(value, value), this; };
                Set.prototype.delete = function (value) { return this._map.delete(value); };
                Set.prototype.clear = function () { this._map.clear(); };
                Set.prototype.keys = function () { return this._map.keys(); };
                Set.prototype.values = function () { return this._map.values(); };
                Set.prototype.entries = function () { return this._map.entries(); };
                Set.prototype["@@iterator"] = function () { return this.keys(); };
                Set.prototype[iteratorSymbol] = function () { return this.keys(); };
                return Set;
            }());
        }
        // naive WeakMap shim
        function CreateWeakMapPolyfill() {
            var UUID_SIZE = 16;
            var keys = HashMap.create();
            var rootKey = CreateUniqueKey();
            return /** @class */ (function () {
                function WeakMap() {
                    this._key = CreateUniqueKey();
                }
                WeakMap.prototype.has = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? HashMap.has(table, this._key) : false;
                };
                WeakMap.prototype.get = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? HashMap.get(table, this._key) : undefined;
                };
                WeakMap.prototype.set = function (target, value) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ true);
                    table[this._key] = value;
                    return this;
                };
                WeakMap.prototype.delete = function (target) {
                    var table = GetOrCreateWeakMapTable(target, /*create*/ false);
                    return table !== undefined ? delete table[this._key] : false;
                };
                WeakMap.prototype.clear = function () {
                    // NOTE: not a real clear, just makes the previous data unreachable
                    this._key = CreateUniqueKey();
                };
                return WeakMap;
            }());
            function CreateUniqueKey() {
                var key;
                do
                    key = "@@WeakMap@@" + CreateUUID();
                while (HashMap.has(keys, key));
                keys[key] = true;
                return key;
            }
            function GetOrCreateWeakMapTable(target, create) {
                if (!hasOwn.call(target, rootKey)) {
                    if (!create)
                        return undefined;
                    Object.defineProperty(target, rootKey, { value: HashMap.create() });
                }
                return target[rootKey];
            }
            function FillRandomBytes(buffer, size) {
                for (var i = 0; i < size; ++i)
                    buffer[i] = Math.random() * 0xff | 0;
                return buffer;
            }
            function GenRandomBytes(size) {
                if (typeof Uint8Array === "function") {
                    if (typeof crypto !== "undefined")
                        return crypto.getRandomValues(new Uint8Array(size));
                    if (typeof msCrypto !== "undefined")
                        return msCrypto.getRandomValues(new Uint8Array(size));
                    return FillRandomBytes(new Uint8Array(size), size);
                }
                return FillRandomBytes(new Array(size), size);
            }
            function CreateUUID() {
                var data = GenRandomBytes(UUID_SIZE);
                // mark as random - RFC 4122 § 4.4
                data[6] = data[6] & 0x4f | 0x40;
                data[8] = data[8] & 0xbf | 0x80;
                var result = "";
                for (var offset = 0; offset < UUID_SIZE; ++offset) {
                    var byte = data[offset];
                    if (offset === 4 || offset === 6 || offset === 8)
                        result += "-";
                    if (byte < 16)
                        result += "0";
                    result += byte.toString(16).toLowerCase();
                }
                return result;
            }
        }
        // uses a heuristic used by v8 and chakra to force an object into dictionary mode.
        function MakeDictionary(obj) {
            obj.__ = undefined;
            delete obj.__;
            return obj;
        }
    });
})(Reflect || (Reflect = {}));

var check = function (it) {
  return it && it.Math == Math && it;
};

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global_1 =
  // eslint-disable-next-line es-x/no-global-this -- safe
  check(typeof globalThis == 'object' && globalThis) ||
  check(typeof window == 'object' && window) ||
  // eslint-disable-next-line no-restricted-globals -- safe
  check(typeof self == 'object' && self) ||
  check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
  // eslint-disable-next-line no-new-func -- fallback
  (function () { return this; })() || Function('return this')();

var fails = function (exec) {
  try {
    return !!exec();
  } catch (error) {
    return true;
  }
};

// Detect IE8's incomplete defineProperty implementation
var descriptors = !fails(function () {
  // eslint-disable-next-line es-x/no-object-defineproperty -- required for testing
  return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] != 7;
});

var functionBindNative = !fails(function () {
  // eslint-disable-next-line es-x/no-function-prototype-bind -- safe
  var test = (function () { /* empty */ }).bind();
  // eslint-disable-next-line no-prototype-builtins -- safe
  return typeof test != 'function' || test.hasOwnProperty('prototype');
});

var call$1 = Function.prototype.call;

var functionCall = functionBindNative ? call$1.bind(call$1) : function () {
  return call$1.apply(call$1, arguments);
};

var $propertyIsEnumerable = {}.propertyIsEnumerable;
// eslint-disable-next-line es-x/no-object-getownpropertydescriptor -- safe
var getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

// Nashorn ~ JDK8 bug
var NASHORN_BUG = getOwnPropertyDescriptor$1 && !$propertyIsEnumerable.call({ 1: 2 }, 1);

// `Object.prototype.propertyIsEnumerable` method implementation
// https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
var f$5 = NASHORN_BUG ? function propertyIsEnumerable(V) {
  var descriptor = getOwnPropertyDescriptor$1(this, V);
  return !!descriptor && descriptor.enumerable;
} : $propertyIsEnumerable;

var objectPropertyIsEnumerable = {
	f: f$5
};

var createPropertyDescriptor = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var FunctionPrototype$1 = Function.prototype;
var bind$1 = FunctionPrototype$1.bind;
var call = FunctionPrototype$1.call;
var uncurryThis = functionBindNative && bind$1.bind(call, call);

var functionUncurryThis = functionBindNative ? function (fn) {
  return fn && uncurryThis(fn);
} : function (fn) {
  return fn && function () {
    return call.apply(fn, arguments);
  };
};

var toString$1 = functionUncurryThis({}.toString);
var stringSlice = functionUncurryThis(''.slice);

var classofRaw = function (it) {
  return stringSlice(toString$1(it), 8, -1);
};

var Object$4 = global_1.Object;
var split = functionUncurryThis(''.split);

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var indexedObject = fails(function () {
  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
  // eslint-disable-next-line no-prototype-builtins -- safe
  return !Object$4('z').propertyIsEnumerable(0);
}) ? function (it) {
  return classofRaw(it) == 'String' ? split(it, '') : Object$4(it);
} : Object$4;

var TypeError$8 = global_1.TypeError;

// `RequireObjectCoercible` abstract operation
// https://tc39.es/ecma262/#sec-requireobjectcoercible
var requireObjectCoercible = function (it) {
  if (it == undefined) throw TypeError$8("Can't call method on " + it);
  return it;
};

// toObject with fallback for non-array-like ES3 strings



var toIndexedObject = function (it) {
  return indexedObject(requireObjectCoercible(it));
};

// `IsCallable` abstract operation
// https://tc39.es/ecma262/#sec-iscallable
var isCallable = function (argument) {
  return typeof argument == 'function';
};

var isObject = function (it) {
  return typeof it == 'object' ? it !== null : isCallable(it);
};

var aFunction = function (argument) {
  return isCallable(argument) ? argument : undefined;
};

var getBuiltIn = function (namespace, method) {
  return arguments.length < 2 ? aFunction(global_1[namespace]) : global_1[namespace] && global_1[namespace][method];
};

var objectIsPrototypeOf = functionUncurryThis({}.isPrototypeOf);

var engineUserAgent = getBuiltIn('navigator', 'userAgent') || '';

var process$1 = global_1.process;
var Deno = global_1.Deno;
var versions = process$1 && process$1.versions || Deno && Deno.version;
var v8 = versions && versions.v8;
var match, version;

if (v8) {
  match = v8.split('.');
  // in old Chrome, versions of V8 isn't V8 = Chrome / 10
  // but their correct versions are not interesting for us
  version = match[0] > 0 && match[0] < 4 ? 1 : +(match[0] + match[1]);
}

// BrowserFS NodeJS `process` polyfill incorrectly set `.v8` to `0.0`
// so check `userAgent` even if `.v8` exists, but 0
if (!version && engineUserAgent) {
  match = engineUserAgent.match(/Edge\/(\d+)/);
  if (!match || match[1] >= 74) {
    match = engineUserAgent.match(/Chrome\/(\d+)/);
    if (match) version = +match[1];
  }
}

var engineV8Version = version;

/* eslint-disable es-x/no-symbol -- required for testing */



// eslint-disable-next-line es-x/no-object-getownpropertysymbols -- required for testing
var nativeSymbol = !!Object.getOwnPropertySymbols && !fails(function () {
  var symbol = Symbol();
  // Chrome 38 Symbol has incorrect toString conversion
  // `get-own-property-symbols` polyfill symbols converted to object are not Symbol instances
  return !String(symbol) || !(Object(symbol) instanceof Symbol) ||
    // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
    !Symbol.sham && engineV8Version && engineV8Version < 41;
});

/* eslint-disable es-x/no-symbol -- required for testing */


var useSymbolAsUid = nativeSymbol
  && !Symbol.sham
  && typeof Symbol.iterator == 'symbol';

var Object$3 = global_1.Object;

var isSymbol = useSymbolAsUid ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  var $Symbol = getBuiltIn('Symbol');
  return isCallable($Symbol) && objectIsPrototypeOf($Symbol.prototype, Object$3(it));
};

var String$2 = global_1.String;

var tryToString = function (argument) {
  try {
    return String$2(argument);
  } catch (error) {
    return 'Object';
  }
};

var TypeError$7 = global_1.TypeError;

// `Assert: IsCallable(argument) is true`
var aCallable = function (argument) {
  if (isCallable(argument)) return argument;
  throw TypeError$7(tryToString(argument) + ' is not a function');
};

// `GetMethod` abstract operation
// https://tc39.es/ecma262/#sec-getmethod
var getMethod = function (V, P) {
  var func = V[P];
  return func == null ? undefined : aCallable(func);
};

var TypeError$6 = global_1.TypeError;

// `OrdinaryToPrimitive` abstract operation
// https://tc39.es/ecma262/#sec-ordinarytoprimitive
var ordinaryToPrimitive = function (input, pref) {
  var fn, val;
  if (pref === 'string' && isCallable(fn = input.toString) && !isObject(val = functionCall(fn, input))) return val;
  if (isCallable(fn = input.valueOf) && !isObject(val = functionCall(fn, input))) return val;
  if (pref !== 'string' && isCallable(fn = input.toString) && !isObject(val = functionCall(fn, input))) return val;
  throw TypeError$6("Can't convert object to primitive value");
};

// eslint-disable-next-line es-x/no-object-defineproperty -- safe
var defineProperty = Object.defineProperty;

var setGlobal = function (key, value) {
  try {
    defineProperty(global_1, key, { value: value, configurable: true, writable: true });
  } catch (error) {
    global_1[key] = value;
  } return value;
};

var SHARED = '__core-js_shared__';
var store$1 = global_1[SHARED] || setGlobal(SHARED, {});

var sharedStore = store$1;

var shared = createCommonjsModule(function (module) {
(module.exports = function (key, value) {
  return sharedStore[key] || (sharedStore[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: '3.22.5',
  mode: 'global',
  copyright: '© 2014-2022 Denis Pushkarev (zloirock.ru)',
  license: 'https://github.com/zloirock/core-js/blob/v3.22.5/LICENSE',
  source: 'https://github.com/zloirock/core-js'
});
});

var Object$2 = global_1.Object;

// `ToObject` abstract operation
// https://tc39.es/ecma262/#sec-toobject
var toObject = function (argument) {
  return Object$2(requireObjectCoercible(argument));
};

var hasOwnProperty = functionUncurryThis({}.hasOwnProperty);

// `HasOwnProperty` abstract operation
// https://tc39.es/ecma262/#sec-hasownproperty
// eslint-disable-next-line es-x/no-object-hasown -- safe
var hasOwnProperty_1 = Object.hasOwn || function hasOwn(it, key) {
  return hasOwnProperty(toObject(it), key);
};

var id = 0;
var postfix = Math.random();
var toString = functionUncurryThis(1.0.toString);

var uid = function (key) {
  return 'Symbol(' + (key === undefined ? '' : key) + ')_' + toString(++id + postfix, 36);
};

var WellKnownSymbolsStore = shared('wks');
var Symbol$1 = global_1.Symbol;
var symbolFor = Symbol$1 && Symbol$1['for'];
var createWellKnownSymbol = useSymbolAsUid ? Symbol$1 : Symbol$1 && Symbol$1.withoutSetter || uid;

var wellKnownSymbol = function (name) {
  if (!hasOwnProperty_1(WellKnownSymbolsStore, name) || !(nativeSymbol || typeof WellKnownSymbolsStore[name] == 'string')) {
    var description = 'Symbol.' + name;
    if (nativeSymbol && hasOwnProperty_1(Symbol$1, name)) {
      WellKnownSymbolsStore[name] = Symbol$1[name];
    } else if (useSymbolAsUid && symbolFor) {
      WellKnownSymbolsStore[name] = symbolFor(description);
    } else {
      WellKnownSymbolsStore[name] = createWellKnownSymbol(description);
    }
  } return WellKnownSymbolsStore[name];
};

var TypeError$5 = global_1.TypeError;
var TO_PRIMITIVE = wellKnownSymbol('toPrimitive');

// `ToPrimitive` abstract operation
// https://tc39.es/ecma262/#sec-toprimitive
var toPrimitive = function (input, pref) {
  if (!isObject(input) || isSymbol(input)) return input;
  var exoticToPrim = getMethod(input, TO_PRIMITIVE);
  var result;
  if (exoticToPrim) {
    if (pref === undefined) pref = 'default';
    result = functionCall(exoticToPrim, input, pref);
    if (!isObject(result) || isSymbol(result)) return result;
    throw TypeError$5("Can't convert object to primitive value");
  }
  if (pref === undefined) pref = 'number';
  return ordinaryToPrimitive(input, pref);
};

// `ToPropertyKey` abstract operation
// https://tc39.es/ecma262/#sec-topropertykey
var toPropertyKey = function (argument) {
  var key = toPrimitive(argument, 'string');
  return isSymbol(key) ? key : key + '';
};

var document$1 = global_1.document;
// typeof document.createElement is 'object' in old IE
var EXISTS$1 = isObject(document$1) && isObject(document$1.createElement);

var documentCreateElement = function (it) {
  return EXISTS$1 ? document$1.createElement(it) : {};
};

// Thanks to IE8 for its funny defineProperty
var ie8DomDefine = !descriptors && !fails(function () {
  // eslint-disable-next-line es-x/no-object-defineproperty -- required for testing
  return Object.defineProperty(documentCreateElement('div'), 'a', {
    get: function () { return 7; }
  }).a != 7;
});

// eslint-disable-next-line es-x/no-object-getownpropertydescriptor -- safe
var $getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

// `Object.getOwnPropertyDescriptor` method
// https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
var f$4 = descriptors ? $getOwnPropertyDescriptor$1 : function getOwnPropertyDescriptor(O, P) {
  O = toIndexedObject(O);
  P = toPropertyKey(P);
  if (ie8DomDefine) try {
    return $getOwnPropertyDescriptor$1(O, P);
  } catch (error) { /* empty */ }
  if (hasOwnProperty_1(O, P)) return createPropertyDescriptor(!functionCall(objectPropertyIsEnumerable.f, O, P), O[P]);
};

var objectGetOwnPropertyDescriptor = {
	f: f$4
};

// V8 ~ Chrome 36-
// https://bugs.chromium.org/p/v8/issues/detail?id=3334
var v8PrototypeDefineBug = descriptors && fails(function () {
  // eslint-disable-next-line es-x/no-object-defineproperty -- required for testing
  return Object.defineProperty(function () { /* empty */ }, 'prototype', {
    value: 42,
    writable: false
  }).prototype != 42;
});

var String$1 = global_1.String;
var TypeError$4 = global_1.TypeError;

// `Assert: Type(argument) is Object`
var anObject = function (argument) {
  if (isObject(argument)) return argument;
  throw TypeError$4(String$1(argument) + ' is not an object');
};

var TypeError$3 = global_1.TypeError;
// eslint-disable-next-line es-x/no-object-defineproperty -- safe
var $defineProperty = Object.defineProperty;
// eslint-disable-next-line es-x/no-object-getownpropertydescriptor -- safe
var $getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var ENUMERABLE = 'enumerable';
var CONFIGURABLE$1 = 'configurable';
var WRITABLE = 'writable';

// `Object.defineProperty` method
// https://tc39.es/ecma262/#sec-object.defineproperty
var f$3 = descriptors ? v8PrototypeDefineBug ? function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPropertyKey(P);
  anObject(Attributes);
  if (typeof O === 'function' && P === 'prototype' && 'value' in Attributes && WRITABLE in Attributes && !Attributes[WRITABLE]) {
    var current = $getOwnPropertyDescriptor(O, P);
    if (current && current[WRITABLE]) {
      O[P] = Attributes.value;
      Attributes = {
        configurable: CONFIGURABLE$1 in Attributes ? Attributes[CONFIGURABLE$1] : current[CONFIGURABLE$1],
        enumerable: ENUMERABLE in Attributes ? Attributes[ENUMERABLE] : current[ENUMERABLE],
        writable: false
      };
    }
  } return $defineProperty(O, P, Attributes);
} : $defineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPropertyKey(P);
  anObject(Attributes);
  if (ie8DomDefine) try {
    return $defineProperty(O, P, Attributes);
  } catch (error) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError$3('Accessors not supported');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

var objectDefineProperty = {
	f: f$3
};

var createNonEnumerableProperty = descriptors ? function (object, key, value) {
  return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var FunctionPrototype = Function.prototype;
// eslint-disable-next-line es-x/no-object-getownpropertydescriptor -- safe
var getDescriptor = descriptors && Object.getOwnPropertyDescriptor;

var EXISTS = hasOwnProperty_1(FunctionPrototype, 'name');
// additional protection from minified / mangled / dropped function names
var PROPER = EXISTS && (function something() { /* empty */ }).name === 'something';
var CONFIGURABLE = EXISTS && (!descriptors || (descriptors && getDescriptor(FunctionPrototype, 'name').configurable));

var functionName = {
  EXISTS: EXISTS,
  PROPER: PROPER,
  CONFIGURABLE: CONFIGURABLE
};

var functionToString = functionUncurryThis(Function.toString);

// this helper broken in `core-js@3.4.1-3.4.4`, so we can't use `shared` helper
if (!isCallable(sharedStore.inspectSource)) {
  sharedStore.inspectSource = function (it) {
    return functionToString(it);
  };
}

var inspectSource = sharedStore.inspectSource;

var WeakMap$2 = global_1.WeakMap;

var nativeWeakMap = isCallable(WeakMap$2) && /native code/.test(inspectSource(WeakMap$2));

var keys = shared('keys');

var sharedKey = function (key) {
  return keys[key] || (keys[key] = uid(key));
};

var hiddenKeys$1 = {};

var OBJECT_ALREADY_INITIALIZED = 'Object already initialized';
var TypeError$2 = global_1.TypeError;
var WeakMap$1 = global_1.WeakMap;
var set, get, has;

var enforce = function (it) {
  return has(it) ? get(it) : set(it, {});
};

var getterFor = function (TYPE) {
  return function (it) {
    var state;
    if (!isObject(it) || (state = get(it)).type !== TYPE) {
      throw TypeError$2('Incompatible receiver, ' + TYPE + ' required');
    } return state;
  };
};

if (nativeWeakMap || sharedStore.state) {
  var store = sharedStore.state || (sharedStore.state = new WeakMap$1());
  var wmget = functionUncurryThis(store.get);
  var wmhas = functionUncurryThis(store.has);
  var wmset = functionUncurryThis(store.set);
  set = function (it, metadata) {
    if (wmhas(store, it)) throw new TypeError$2(OBJECT_ALREADY_INITIALIZED);
    metadata.facade = it;
    wmset(store, it, metadata);
    return metadata;
  };
  get = function (it) {
    return wmget(store, it) || {};
  };
  has = function (it) {
    return wmhas(store, it);
  };
} else {
  var STATE = sharedKey('state');
  hiddenKeys$1[STATE] = true;
  set = function (it, metadata) {
    if (hasOwnProperty_1(it, STATE)) throw new TypeError$2(OBJECT_ALREADY_INITIALIZED);
    metadata.facade = it;
    createNonEnumerableProperty(it, STATE, metadata);
    return metadata;
  };
  get = function (it) {
    return hasOwnProperty_1(it, STATE) ? it[STATE] : {};
  };
  has = function (it) {
    return hasOwnProperty_1(it, STATE);
  };
}

var internalState = {
  set: set,
  get: get,
  has: has,
  enforce: enforce,
  getterFor: getterFor
};

var makeBuiltIn_1 = createCommonjsModule(function (module) {
var CONFIGURABLE_FUNCTION_NAME = functionName.CONFIGURABLE;



var enforceInternalState = internalState.enforce;
var getInternalState = internalState.get;
// eslint-disable-next-line es-x/no-object-defineproperty -- safe
var defineProperty = Object.defineProperty;

var CONFIGURABLE_LENGTH = descriptors && !fails(function () {
  return defineProperty(function () { /* empty */ }, 'length', { value: 8 }).length !== 8;
});

var TEMPLATE = String(String).split('String');

var makeBuiltIn = module.exports = function (value, name, options) {
  if (String(name).slice(0, 7) === 'Symbol(') {
    name = '[' + String(name).replace(/^Symbol\(([^)]*)\)/, '$1') + ']';
  }
  if (options && options.getter) name = 'get ' + name;
  if (options && options.setter) name = 'set ' + name;
  if (!hasOwnProperty_1(value, 'name') || (CONFIGURABLE_FUNCTION_NAME && value.name !== name)) {
    defineProperty(value, 'name', { value: name, configurable: true });
  }
  if (CONFIGURABLE_LENGTH && options && hasOwnProperty_1(options, 'arity') && value.length !== options.arity) {
    defineProperty(value, 'length', { value: options.arity });
  }
  if (options && hasOwnProperty_1(options, 'constructor') && options.constructor) {
    if (descriptors) try {
      defineProperty(value, 'prototype', { writable: false });
    } catch (error) { /* empty */ }
  } else value.prototype = undefined;
  var state = enforceInternalState(value);
  if (!hasOwnProperty_1(state, 'source')) {
    state.source = TEMPLATE.join(typeof name == 'string' ? name : '');
  } return value;
};

// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
// eslint-disable-next-line no-extend-native -- required
Function.prototype.toString = makeBuiltIn(function toString() {
  return isCallable(this) && getInternalState(this).source || inspectSource(this);
}, 'toString');
});

var defineBuiltIn = function (O, key, value, options) {
  var unsafe = options ? !!options.unsafe : false;
  var simple = options ? !!options.enumerable : false;
  var noTargetGet = options ? !!options.noTargetGet : false;
  var name = options && options.name !== undefined ? options.name : key;
  if (isCallable(value)) makeBuiltIn_1(value, name, options);
  if (O === global_1) {
    if (simple) O[key] = value;
    else setGlobal(key, value);
    return O;
  } else if (!unsafe) {
    delete O[key];
  } else if (!noTargetGet && O[key]) {
    simple = true;
  }
  if (simple) O[key] = value;
  else createNonEnumerableProperty(O, key, value);
  return O;
};

var ceil = Math.ceil;
var floor = Math.floor;

// `ToIntegerOrInfinity` abstract operation
// https://tc39.es/ecma262/#sec-tointegerorinfinity
var toIntegerOrInfinity = function (argument) {
  var number = +argument;
  // eslint-disable-next-line no-self-compare -- safe
  return number !== number || number === 0 ? 0 : (number > 0 ? floor : ceil)(number);
};

var max = Math.max;
var min$2 = Math.min;

// Helper for a popular repeating case of the spec:
// Let integer be ? ToInteger(index).
// If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
var toAbsoluteIndex = function (index, length) {
  var integer = toIntegerOrInfinity(index);
  return integer < 0 ? max(integer + length, 0) : min$2(integer, length);
};

var min$1 = Math.min;

// `ToLength` abstract operation
// https://tc39.es/ecma262/#sec-tolength
var toLength = function (argument) {
  return argument > 0 ? min$1(toIntegerOrInfinity(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
};

// `LengthOfArrayLike` abstract operation
// https://tc39.es/ecma262/#sec-lengthofarraylike
var lengthOfArrayLike = function (obj) {
  return toLength(obj.length);
};

// `Array.prototype.{ indexOf, includes }` methods implementation
var createMethod = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIndexedObject($this);
    var length = lengthOfArrayLike(O);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare -- NaN check
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare -- NaN check
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) {
      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

var arrayIncludes = {
  // `Array.prototype.includes` method
  // https://tc39.es/ecma262/#sec-array.prototype.includes
  includes: createMethod(true),
  // `Array.prototype.indexOf` method
  // https://tc39.es/ecma262/#sec-array.prototype.indexof
  indexOf: createMethod(false)
};

var indexOf = arrayIncludes.indexOf;


var push = functionUncurryThis([].push);

var objectKeysInternal = function (object, names) {
  var O = toIndexedObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) !hasOwnProperty_1(hiddenKeys$1, key) && hasOwnProperty_1(O, key) && push(result, key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (hasOwnProperty_1(O, key = names[i++])) {
    ~indexOf(result, key) || push(result, key);
  }
  return result;
};

// IE8- don't enum bug keys
var enumBugKeys = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];

var hiddenKeys = enumBugKeys.concat('length', 'prototype');

// `Object.getOwnPropertyNames` method
// https://tc39.es/ecma262/#sec-object.getownpropertynames
// eslint-disable-next-line es-x/no-object-getownpropertynames -- safe
var f$2 = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return objectKeysInternal(O, hiddenKeys);
};

var objectGetOwnPropertyNames = {
	f: f$2
};

// eslint-disable-next-line es-x/no-object-getownpropertysymbols -- safe
var f$1 = Object.getOwnPropertySymbols;

var objectGetOwnPropertySymbols = {
	f: f$1
};

var concat = functionUncurryThis([].concat);

// all object keys, includes non-enumerable and symbols
var ownKeys = getBuiltIn('Reflect', 'ownKeys') || function ownKeys(it) {
  var keys = objectGetOwnPropertyNames.f(anObject(it));
  var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
  return getOwnPropertySymbols ? concat(keys, getOwnPropertySymbols(it)) : keys;
};

var copyConstructorProperties = function (target, source, exceptions) {
  var keys = ownKeys(source);
  var defineProperty = objectDefineProperty.f;
  var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!hasOwnProperty_1(target, key) && !(exceptions && hasOwnProperty_1(exceptions, key))) {
      defineProperty(target, key, getOwnPropertyDescriptor(source, key));
    }
  }
};

var replacement = /#|\.prototype\./;

var isForced = function (feature, detection) {
  var value = data[normalize(feature)];
  return value == POLYFILL ? true
    : value == NATIVE ? false
    : isCallable(detection) ? fails(detection)
    : !!detection;
};

var normalize = isForced.normalize = function (string) {
  return String(string).replace(replacement, '.').toLowerCase();
};

var data = isForced.data = {};
var NATIVE = isForced.NATIVE = 'N';
var POLYFILL = isForced.POLYFILL = 'P';

var isForced_1 = isForced;

var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;






/*
  options.target      - name of the target object
  options.global      - target is the global object
  options.stat        - export as static methods of target
  options.proto       - export as prototype methods of target
  options.real        - real prototype method for the `pure` version
  options.forced      - export even if the native feature is available
  options.bind        - bind methods to the target, required for the `pure` version
  options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
  options.unsafe      - use the simple assignment of property instead of delete + defineProperty
  options.sham        - add a flag to not completely full polyfills
  options.enumerable  - export as enumerable property
  options.noTargetGet - prevent calling a getter on target
  options.name        - the .name of the function if it does not match the key
*/
var _export = function (options, source) {
  var TARGET = options.target;
  var GLOBAL = options.global;
  var STATIC = options.stat;
  var FORCED, target, key, targetProperty, sourceProperty, descriptor;
  if (GLOBAL) {
    target = global_1;
  } else if (STATIC) {
    target = global_1[TARGET] || setGlobal(TARGET, {});
  } else {
    target = (global_1[TARGET] || {}).prototype;
  }
  if (target) for (key in source) {
    sourceProperty = source[key];
    if (options.noTargetGet) {
      descriptor = getOwnPropertyDescriptor(target, key);
      targetProperty = descriptor && descriptor.value;
    } else targetProperty = target[key];
    FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
    // contained in target
    if (!FORCED && targetProperty !== undefined) {
      if (typeof sourceProperty == typeof targetProperty) continue;
      copyConstructorProperties(sourceProperty, targetProperty);
    }
    // add a flag to not completely full polyfills
    if (options.sham || (targetProperty && targetProperty.sham)) {
      createNonEnumerableProperty(sourceProperty, 'sham', true);
    }
    defineBuiltIn(target, key, sourceProperty, options);
  }
};

// `IsArray` abstract operation
// https://tc39.es/ecma262/#sec-isarray
// eslint-disable-next-line es-x/no-array-isarray -- safe
var isArray = Array.isArray || function isArray(argument) {
  return classofRaw(argument) == 'Array';
};

var bind = functionUncurryThis(functionUncurryThis.bind);

// optional / simple context binding
var functionBindContext = function (fn, that) {
  aCallable(fn);
  return that === undefined ? fn : functionBindNative ? bind(fn, that) : function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

var TypeError$1 = global_1.TypeError;

// `FlattenIntoArray` abstract operation
// https://tc39.github.io/proposal-flatMap/#sec-FlattenIntoArray
var flattenIntoArray = function (target, original, source, sourceLen, start, depth, mapper, thisArg) {
  var targetIndex = start;
  var sourceIndex = 0;
  var mapFn = mapper ? functionBindContext(mapper, thisArg) : false;
  var element, elementLen;

  while (sourceIndex < sourceLen) {
    if (sourceIndex in source) {
      element = mapFn ? mapFn(source[sourceIndex], sourceIndex, original) : source[sourceIndex];

      if (depth > 0 && isArray(element)) {
        elementLen = lengthOfArrayLike(element);
        targetIndex = flattenIntoArray(target, original, element, elementLen, targetIndex, depth - 1) - 1;
      } else {
        if (targetIndex >= 0x1FFFFFFFFFFFFF) throw TypeError$1('Exceed the acceptable array length');
        target[targetIndex] = element;
      }

      targetIndex++;
    }
    sourceIndex++;
  }
  return targetIndex;
};

var flattenIntoArray_1 = flattenIntoArray;

var TO_STRING_TAG$1 = wellKnownSymbol('toStringTag');
var test = {};

test[TO_STRING_TAG$1] = 'z';

var toStringTagSupport = String(test) === '[object z]';

var TO_STRING_TAG = wellKnownSymbol('toStringTag');
var Object$1 = global_1.Object;

// ES3 wrong here
var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (error) { /* empty */ }
};

// getting tag from ES6+ `Object.prototype.toString`
var classof = toStringTagSupport ? classofRaw : function (it) {
  var O, tag, result;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (tag = tryGet(O = Object$1(it), TO_STRING_TAG)) == 'string' ? tag
    // builtinTag case
    : CORRECT_ARGUMENTS ? classofRaw(O)
    // ES3 arguments fallback
    : (result = classofRaw(O)) == 'Object' && isCallable(O.callee) ? 'Arguments' : result;
};

var noop = function () { /* empty */ };
var empty = [];
var construct = getBuiltIn('Reflect', 'construct');
var constructorRegExp = /^\s*(?:class|function)\b/;
var exec = functionUncurryThis(constructorRegExp.exec);
var INCORRECT_TO_STRING = !constructorRegExp.exec(noop);

var isConstructorModern = function isConstructor(argument) {
  if (!isCallable(argument)) return false;
  try {
    construct(noop, empty, argument);
    return true;
  } catch (error) {
    return false;
  }
};

var isConstructorLegacy = function isConstructor(argument) {
  if (!isCallable(argument)) return false;
  switch (classof(argument)) {
    case 'AsyncFunction':
    case 'GeneratorFunction':
    case 'AsyncGeneratorFunction': return false;
  }
  try {
    // we can't check .prototype since constructors produced by .bind haven't it
    // `Function#toString` throws on some built-it function in some legacy engines
    // (for example, `DOMQuad` and similar in FF41-)
    return INCORRECT_TO_STRING || !!exec(constructorRegExp, inspectSource(argument));
  } catch (error) {
    return true;
  }
};

isConstructorLegacy.sham = true;

// `IsConstructor` abstract operation
// https://tc39.es/ecma262/#sec-isconstructor
var isConstructor = !construct || fails(function () {
  var called;
  return isConstructorModern(isConstructorModern.call)
    || !isConstructorModern(Object)
    || !isConstructorModern(function () { called = true; })
    || called;
}) ? isConstructorLegacy : isConstructorModern;

var SPECIES = wellKnownSymbol('species');
var Array$1 = global_1.Array;

// a part of `ArraySpeciesCreate` abstract operation
// https://tc39.es/ecma262/#sec-arrayspeciescreate
var arraySpeciesConstructor = function (originalArray) {
  var C;
  if (isArray(originalArray)) {
    C = originalArray.constructor;
    // cross-realm fallback
    if (isConstructor(C) && (C === Array$1 || isArray(C.prototype))) C = undefined;
    else if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  } return C === undefined ? Array$1 : C;
};

// `ArraySpeciesCreate` abstract operation
// https://tc39.es/ecma262/#sec-arrayspeciescreate
var arraySpeciesCreate = function (originalArray, length) {
  return new (arraySpeciesConstructor(originalArray))(length === 0 ? 0 : length);
};

// `Array.prototype.flatMap` method
// https://tc39.es/ecma262/#sec-array.prototype.flatmap
_export({ target: 'Array', proto: true }, {
  flatMap: function flatMap(callbackfn /* , thisArg */) {
    var O = toObject(this);
    var sourceLen = lengthOfArrayLike(O);
    var A;
    aCallable(callbackfn);
    A = arraySpeciesCreate(O, 0);
    A.length = flattenIntoArray_1(A, O, O, sourceLen, 0, 1, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    return A;
  }
});

// `Object.keys` method
// https://tc39.es/ecma262/#sec-object.keys
// eslint-disable-next-line es-x/no-object-keys -- safe
var objectKeys = Object.keys || function keys(O) {
  return objectKeysInternal(O, enumBugKeys);
};

// `Object.defineProperties` method
// https://tc39.es/ecma262/#sec-object.defineproperties
// eslint-disable-next-line es-x/no-object-defineproperties -- safe
var f = descriptors && !v8PrototypeDefineBug ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var props = toIndexedObject(Properties);
  var keys = objectKeys(Properties);
  var length = keys.length;
  var index = 0;
  var key;
  while (length > index) objectDefineProperty.f(O, key = keys[index++], props[key]);
  return O;
};

var objectDefineProperties = {
	f: f
};

var html = getBuiltIn('document', 'documentElement');

/* global ActiveXObject -- old IE, WSH */








var GT = '>';
var LT = '<';
var PROTOTYPE = 'prototype';
var SCRIPT = 'script';
var IE_PROTO = sharedKey('IE_PROTO');

var EmptyConstructor = function () { /* empty */ };

var scriptTag = function (content) {
  return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
};

// Create object with fake `null` prototype: use ActiveX Object with cleared prototype
var NullProtoObjectViaActiveX = function (activeXDocument) {
  activeXDocument.write(scriptTag(''));
  activeXDocument.close();
  var temp = activeXDocument.parentWindow.Object;
  activeXDocument = null; // avoid memory leak
  return temp;
};

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var NullProtoObjectViaIFrame = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = documentCreateElement('iframe');
  var JS = 'java' + SCRIPT + ':';
  var iframeDocument;
  iframe.style.display = 'none';
  html.appendChild(iframe);
  // https://github.com/zloirock/core-js/issues/475
  iframe.src = String(JS);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(scriptTag('document.F=Object'));
  iframeDocument.close();
  return iframeDocument.F;
};

// Check for document.domain and active x support
// No need to use active x approach when document.domain is not set
// see https://github.com/es-shims/es5-shim/issues/150
// variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
// avoid IE GC bug
var activeXDocument;
var NullProtoObject = function () {
  try {
    activeXDocument = new ActiveXObject('htmlfile');
  } catch (error) { /* ignore */ }
  NullProtoObject = typeof document != 'undefined'
    ? document.domain && activeXDocument
      ? NullProtoObjectViaActiveX(activeXDocument) // old IE
      : NullProtoObjectViaIFrame()
    : NullProtoObjectViaActiveX(activeXDocument); // WSH
  var length = enumBugKeys.length;
  while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];
  return NullProtoObject();
};

hiddenKeys$1[IE_PROTO] = true;

// `Object.create` method
// https://tc39.es/ecma262/#sec-object.create
// eslint-disable-next-line es-x/no-object-create -- safe
var objectCreate = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    EmptyConstructor[PROTOTYPE] = anObject(O);
    result = new EmptyConstructor();
    EmptyConstructor[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = NullProtoObject();
  return Properties === undefined ? result : objectDefineProperties.f(result, Properties);
};

var UNSCOPABLES = wellKnownSymbol('unscopables');
var ArrayPrototype = Array.prototype;

// Array.prototype[@@unscopables]
// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
if (ArrayPrototype[UNSCOPABLES] == undefined) {
  objectDefineProperty.f(ArrayPrototype, UNSCOPABLES, {
    configurable: true,
    value: objectCreate(null)
  });
}

// add a key to Array.prototype[@@unscopables]
var addToUnscopables = function (key) {
  ArrayPrototype[UNSCOPABLES][key] = true;
};

// this method was added to unscopables after implementation
// in popular engines, so it's moved to a separate module


// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
addToUnscopables('flatMap');

var entryUnbind = function (CONSTRUCTOR, METHOD) {
  return functionUncurryThis(global_1[CONSTRUCTOR].prototype[METHOD]);
};

entryUnbind('Array', 'flatMap');

// `Array.prototype.flat` method
// https://tc39.es/ecma262/#sec-array.prototype.flat
_export({ target: 'Array', proto: true }, {
  flat: function flat(/* depthArg = 1 */) {
    var depthArg = arguments.length ? arguments[0] : undefined;
    var O = toObject(this);
    var sourceLen = lengthOfArrayLike(O);
    var A = arraySpeciesCreate(O, 0);
    A.length = flattenIntoArray_1(A, O, O, sourceLen, 0, depthArg === undefined ? 1 : toIntegerOrInfinity(depthArg));
    return A;
  }
});

// this method was added to unscopables after implementation
// in popular engines, so it's moved to a separate module


// https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
addToUnscopables('flat');

entryUnbind('Array', 'flat');

var es2019Array = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
});

unwrapExports(es2019Array);

// Usage:
// At top of main: import MemHack from './MemHack'
// At top of loop(): MemHack.pretick()
// Thats it!
const MemHack = {
    memory: undefined,
    parseTime: -1,
    register() {
        const start = Game.cpu.getUsed();
        this.memory = Memory;
        const end = Game.cpu.getUsed();
        this.parseTime = end - start;
        this.memory = RawMemory._parsed;
    },
    pretick() {
        if (this.memory) {
            delete global.Memory;
            global.Memory = this.memory;
            RawMemory._parsed = this.memory;
        }
    },
};
MemHack.register();

/* eslint-disable */
let Mem = {
    enabledTick: -1,
    disableTick: -1,
    type: "",
    totalTime: -1,
    totalIntents: -1,
    map: {},
};
const intentCost = 0.2;
let enabled$1 = false;
let depth = 0;
let intents = 0;
function AlreadyWrappedError() {
    this.name = "AlreadyWrappedError";
    this.message = "Error attempted to double wrap a function.";
    this.stack = new Error().stack;
}
function setupProfiler() {
    // reset depth and intents, this needs to be done each tick.
    depth = 0;
    intents = 0;
    Game.profiler = {
        stream(duration, filter) {
            setupMemory("stream", duration || 10, filter);
        },
        email(duration, filter) {
            setupMemory("email", duration || 100, filter);
        },
        profile(duration, filter) {
            setupMemory("profile", duration || 100, filter);
        },
        background(filter) {
            setupMemory("background", -1, filter);
        },
        restart() {
            if (Profiler.isProfiling()) {
                const filter = Mem.filter;
                let duration = -1;
                if (Mem.disableTick > 0) {
                    // Calculate the original duration, profile is enabled on the tick after the first call,
                    // so add 1.
                    duration = Mem.disableTick - Mem.enabledTick + 1;
                }
                const type = Mem.type;
                setupMemory(type, duration, filter);
            }
        },
        reset: resetMemory,
        output: Profiler.output,
    };
}
function setupMemory(profileType, duration, filter) {
    console.log(`Profiling for ${duration} ticks (${filter || "no"} filter)`);
    resetMemory();
    const disableTick = duration > 0 ? Game.time + duration : -1;
    Mem = {
        map: {},
        totalTime: 0,
        totalIntents: 0,
        enabledTick: Game.time + 1,
        disableTick,
        type: profileType,
        filter,
    };
}
function resetMemory() {
    Mem = {
        enabledTick: -1,
        disableTick: -1,
        type: "",
        totalTime: -1,
        totalIntents: -1,
        map: {},
    };
}
function getFilter() {
    return Mem.filter;
}
const functionBlackList = [
    "getUsed",
    "isEqualTo",
    "structure",
    "constructor", // es6 class constructors need to be called with `new`
];
const commonProperties = ["length", "name", "arguments", "caller", "prototype"];
function wrapFunction(name, originalFunction) {
    if (originalFunction.profilerWrapped) {
        console.log(`Can't wrap ${name}`);
        throw new AlreadyWrappedError();
    }
    function wrappedFunction() {
        if (!Profiler.isProfiling()) {
            if (this && this.constructor === wrappedFunction) {
                return new originalFunction(...arguments);
            }
            return originalFunction.apply(this, arguments);
        }
        const nameMatchesFilter = name === getFilter();
        const start = Game.cpu.getUsed();
        const startIntents = intents;
        if (nameMatchesFilter) {
            depth++;
        }
        let result;
        if (this && this.constructor === wrappedFunction) {
            result = new originalFunction(...arguments);
        }
        else {
            result = originalFunction.apply(this, arguments);
        }
        if (depth > 0 || !getFilter()) {
            const end = Game.cpu.getUsed();
            if (result === OK && Profiler.intents.has(name))
                intents++;
            Profiler.record(name, end - start, intents - startIntents);
        }
        if (nameMatchesFilter) {
            depth--;
        }
        return result;
    }
    wrappedFunction.profilerWrapped = true;
    wrappedFunction.toString = () => `// screeps-profiler wrapped function:\n${originalFunction.toString()}`;
    Object.getOwnPropertyNames(originalFunction).forEach(property => {
        if (!commonProperties.includes(property)) {
            wrappedFunction[property] = originalFunction[property];
        }
    });
    return wrappedFunction;
}
function hookUpPrototypes() {
    Profiler.prototypes.forEach(proto => {
        profileObjectFunctions(proto.val, proto.name);
    });
}
function profileObjectFunctions(object, label) {
    if (object.prototype) {
        profileObjectFunctions(object.prototype, label);
    }
    const objectToWrap = object;
    Object.getOwnPropertyNames(objectToWrap).forEach(functionName => {
        const extendedLabel = `${label}.${functionName}`;
        const isBlackListed = functionBlackList.indexOf(functionName) !== -1;
        if (isBlackListed) {
            return;
        }
        const descriptor = Object.getOwnPropertyDescriptor(objectToWrap, functionName);
        if (!descriptor) {
            return;
        }
        const hasAccessor = descriptor.get || descriptor.set;
        if (hasAccessor) {
            const configurable = descriptor.configurable;
            if (!configurable) {
                return;
            }
            const profileDescriptor = {};
            if (descriptor.get) {
                const extendedLabelGet = `${extendedLabel}:get`;
                profileDescriptor.get = profileFunction(descriptor.get, extendedLabelGet);
            }
            if (descriptor.set) {
                const extendedLabelSet = `${extendedLabel}:set`;
                profileDescriptor.set = profileFunction(descriptor.set, extendedLabelSet);
            }
            Object.defineProperty(objectToWrap, functionName, profileDescriptor);
            return;
        }
        const isFunction = typeof descriptor.value === "function";
        if (!isFunction || !descriptor.writable) {
            return;
        }
        const originalFunction = objectToWrap[functionName];
        objectToWrap[functionName] = profileFunction(originalFunction, extendedLabel);
    });
    return objectToWrap;
}
function profileFunction(fn, functionName) {
    const fnName = functionName || fn.name;
    if (!fnName) {
        console.log("Couldn't find a function name for - ", fn);
        console.log("Will not profile this function.");
        return fn;
    }
    return wrapFunction(fnName, fn);
}
const Profiler = {
    printProfile() {
        console.log(Profiler.output());
    },
    emailProfile() {
        Game.notify(Profiler.output(1000));
    },
    output(passedOutputLengthLimit) {
        const outputLengthLimit = passedOutputLengthLimit || 2000;
        if (!Mem || !Mem.enabledTick) {
            return "Profiler not active.";
        }
        const endTick = Math.min(Mem.disableTick < 0 ? Game.time : Mem.disableTick, Game.time);
        const startTick = Mem.enabledTick;
        const elapsedTicks = endTick - startTick + 1;
        const intentsTime = Mem.totalIntents * intentCost;
        const processingTime = Mem.totalTime - intentsTime;
        const header = [
            "p-time/call",
            "i-time/call",
            "time/call",
            "intents/call",
            "calls/tick",
            "intents/tick",
            "p-time/tick",
            "i-time/tick",
            "time/tick",
            "intent ratio",
            "function",
        ].join("\t");
        const footer = [
            `Avg p-CPU per tick: ${(processingTime / elapsedTicks).toFixed(2)}`,
            `Avg i-CPU per tick: ${(intentsTime / elapsedTicks).toFixed(2)}`,
            `Avg CPU per tick: ${(Mem.totalTime / elapsedTicks).toFixed(2)}`,
            `Avg intents per tick: ${(Mem.totalIntents / elapsedTicks).toFixed(2)} (${((intentsTime / Mem.totalTime) * 100).toFixed(2)}%)`,
            `Ticks profiled: ${elapsedTicks}`,
        ].join("\t\t");
        const lines = [header];
        let currentLength = header.length + 1 + footer.length;
        const sums = { accountedTotalTime: 0 };
        const allLines = Profiler.lines(sums);
        let done = false;
        while (!done && allLines.length) {
            const line = allLines.shift();
            // each line added adds the line length plus a new line character.
            if (line && currentLength + line.length + 1 < outputLengthLimit) {
                lines.push(line);
                currentLength += line.length + 1;
            }
            else {
                done = true;
            }
        }
        lines.push("");
        lines.push(footer);
        return lines.join("\n");
    },
    lines(sums) {
        const endTick = Math.min(Mem.disableTick < 0 ? Game.time : Mem.disableTick, Game.time);
        const startTick = Mem.enabledTick;
        const elapsedTicks = endTick - startTick + 1;
        const stats = Object.keys(Mem.map)
            .map(functionName => {
            const functionCalls = Mem.map[functionName];
            const intentsTime = functionCalls.intents * intentCost;
            const processingTime = functionCalls.time - intentsTime;
            sums.accountedTotalTime += functionCalls.time;
            return {
                processingTimePerCall: processingTime / functionCalls.calls,
                intentsTimePerCall: intentsTime / functionCalls.calls,
                timePerCall: functionCalls.time / functionCalls.calls,
                intentsPerCall: functionCalls.intents / functionCalls.calls,
                avgCalls: functionCalls.calls / elapsedTicks,
                avgIntents: functionCalls.intents / elapsedTicks,
                avgProcessingTime: processingTime / elapsedTicks,
                avgIntentsTime: intentsTime / elapsedTicks,
                avgTime: functionCalls.time / elapsedTicks,
                intentRatio: (intentsTime / functionCalls.time) * 100,
                name: functionName,
            };
        })
            .sort((val1, val2) => val2.avgTime - val1.avgTime);
        const lines = stats.map(data => {
            return [
                data.processingTimePerCall.toFixed(3),
                data.intentsTimePerCall.toFixed(3),
                data.timePerCall.toFixed(3),
                data.intentsPerCall.toFixed(1),
                data.avgCalls.toFixed(1),
                data.avgIntents.toFixed(1),
                data.avgProcessingTime.toFixed(3),
                data.avgIntentsTime.toFixed(3),
                data.avgTime.toFixed(3),
                data.intentRatio.toFixed(2) + "%",
                data.name,
            ].join("\t\t");
        });
        return lines;
    },
    prototypes: [
        { name: "Game", val: Game },
        { name: "Game.map", val: Game.map },
        { name: "Game.market", val: Game.market },
        { name: "PathFinder", val: PathFinder },
        { name: "PathFinder.CostMatrix", val: PathFinder.CostMatrix },
        { name: "RawMemory", val: RawMemory },
        { name: "ConstructionSite", val: ConstructionSite },
        { name: "Creep", val: Creep },
        { name: "Flag", val: Flag },
        { name: "PowerCreep", val: PowerCreep },
        { name: "Room", val: Room },
        { name: "RoomPosition", val: RoomPosition },
        { name: "RoomVisual", val: RoomVisual },
        { name: "Structure", val: Structure },
        { name: "StructureController", val: StructureController },
        { name: "StructureFactory", val: StructureFactory },
        { name: "StructureLab", val: StructureLab },
        { name: "StructureLink", val: StructureLink },
        { name: "StructureNuker", val: StructureNuker },
        { name: "StructureObserver", val: StructureObserver },
        { name: "StructurePowerSpawn", val: StructurePowerSpawn },
        { name: "StructureRampart", val: StructureRampart },
        { name: "StructureSpawn", val: StructureSpawn },
        { name: "StructureSpawn.Spawning", val: StructureSpawn.Spawning },
        { name: "StructureTerminal", val: StructureTerminal },
        { name: "StructureTower", val: StructureTower },
    ],
    intents: new Set([
        "Game.notify",
        "Game.market.cancelOrder",
        "Game.market.changeOrderPrice",
        "Game.market.createOrder",
        "Game.market.deal",
        "Game.market.extendOrder",
        "ConstructionSite.remove",
        "Creep.attack",
        "Creep.attackController",
        "Creep.build",
        "Creep.claimController",
        "Creep.dismantle",
        "Creep.drop",
        "Creep.generateSafeMode",
        "Creep.harvest",
        "Creep.heal",
        "Creep.move",
        // "Creep.moveByPath", // apidocs says this has an intent cost, but in reality the cost is in Creep.move, not in this one
        "Creep.notifyWhenAttacked",
        "Creep.pickup",
        "Creep.rangedAttack",
        "Creep.rangedHeal",
        "Creep.rangedMassAttack",
        "Creep.repair",
        "Creep.reserveController",
        "Creep.signController",
        "Creep.suicide",
        "Creep.transfer",
        "Creep.upgradeController",
        "Creep.withdraw",
        "Flag.remove",
        "Flag.setColor",
        "Flag.setPosition",
        "PowerCreep.create",
        "PowerCreep.delete",
        "PowerCreep.drop",
        "PowerCreep.enableRoom",
        "PowerCreep.move",
        // "PowerCreep.moveByPath", // see comment on Creep.moveByPath
        "PowerCreep.notifyWhenAttacked",
        "PowerCreep.pickup",
        "PowerCreep.renew",
        "PowerCreep.spawn",
        "PowerCreep.suicide",
        "PowerCreep.transfer",
        "PowerCreep.upgrade",
        "PowerCreep.usePower",
        "PowerCreep.withdraw",
        "Room.createConstructionSite",
        "Room.createFlag",
        "RoomPosition.createConstructionSite",
        "RoomPosition.createFlag",
        "Structure.destroy",
        "Structure.notifyWhenAttacked",
        "StructureController.activateSafeMode",
        "StructureController.unclaim",
        "StructureFactory.produce",
        "StructureLab.boostCreep",
        "StructureLab.reverseReaction",
        "StructureLab.runReaction",
        "StructureLab.unboostCreep",
        "StructureLink.transferEnergy",
        "StructureNuker.launchNuke",
        "StructureObserver.observeRoom",
        "StructurePowerSpawn.processPower",
        "StructureRampart.setPublic",
        "StructureSpawn.spawnCreep",
        "StructureSpawn.recycleCreep",
        "StructureSpawn.renewCreep",
        "StructureSpawn.Spawning.cancel",
        "StructureSpawn.Spawning.setDirections",
        "StructureTerminal.send",
        "StructureTower.attack",
        "StructureTower.heal",
        "StructureTower.repair",
    ]),
    record(functionName, time, intents) {
        if (!Mem.map[functionName]) {
            Mem.map[functionName] = {
                time: 0,
                calls: 0,
                intents: 0,
            };
        }
        Mem.map[functionName].calls++;
        Mem.map[functionName].time += time;
        Mem.map[functionName].intents += intents;
    },
    endTick() {
        if (Game.time >= Mem.enabledTick) {
            const cpuUsed = Game.cpu.getUsed();
            Mem.totalTime += cpuUsed;
            Mem.totalIntents += intents;
            Profiler.report();
        }
    },
    report() {
        if (Profiler.shouldPrint()) {
            Profiler.printProfile();
        }
        else if (Profiler.shouldEmail()) {
            Profiler.emailProfile();
        }
    },
    isProfiling() {
        if (!enabled$1 || !Mem) {
            return false;
        }
        return Mem.disableTick < 0 || Game.time <= Mem.disableTick;
    },
    type() {
        return Mem.type;
    },
    shouldPrint() {
        const streaming = Profiler.type() === "stream";
        const profiling = Profiler.type() === "profile";
        const onEndingTick = Mem.disableTick === Game.time;
        return streaming || (profiling && onEndingTick);
    },
    shouldEmail() {
        return Profiler.type() === "email" && Mem.disableTick === Game.time;
    },
};
var profiler = {
    wrap(callback) {
        if (enabled$1) {
            setupProfiler();
        }
        if (Profiler.isProfiling()) {
            const returnVal = callback();
            Profiler.endTick();
            return returnVal;
        }
        return callback();
    },
    enable() {
        enabled$1 = true;
        if (!Mem)
            resetMemory();
        hookUpPrototypes();
    },
    output: Profiler.output,
    registerObject: profileObjectFunctions,
    registerFN: profileFunction,
    registerClass: profileObjectFunctions,
};

/**
 * global.hasRespawned()
 *
 * @author:  SemperRabbit
 * @version: 1.1
 * @date:    180331
 * @return:  boolean whether this is the first tick after a respawn or not
 *
 * The checks are set as early returns in case of failure, and are ordered
 * from the least CPU intensive checks to the most. The checks are as follows:
 *
 *      If it has returned true previously during this tick, return true again
 *      Check Game.time === 0 (returns true for sim room "respawns")
 *      There are no creeps
 *      There is only 1 room in Game.rooms
 *      The 1 room has a controller
 *      The controller is RCL 1 with no progress
 *      The controller is in safemode with the initial value
 *      There is only 1 StructureSpawn
 *
 * The only time that all of these cases are true, is the first tick of a respawn.
 * If all of these are true, you have respawned.
 *
 * v1.1 (by qnz): - fixed a condition where room.controller.safeMode can be SAFE_MODE_DURATION too
 *                - improved performance of creep number check (https://jsperf.com/isempty-vs-isemptyobject/23)
 */
const onRespawn = (callback) => {
    if (!respawned && hasRespawned()) {
        respawned = true;
        console.log('Respawn detected');
        callback();
    }
};
let respawned = false;
function hasRespawned() {
    // check for multiple calls on same tick
    if (Memory.respawnTick && Memory.respawnTick === Game.time) {
        return true;
    }
    if (Game.spawns['auto']) {
        return true;
    }
    if (!Memory.offices || !Memory.stats) {
        return true;
    }
    // server reset or sim
    if (Game.time === 0) {
        Memory.respawnTick = Game.time;
        return true;
    }
    // check for 0 creeps
    if (Object.keys(Game.creeps).length > 0) {
        return false;
    }
    // check for only 1 room
    const rNames = Object.keys(Game.rooms);
    if (rNames.length !== 1) {
        return false;
    }
    // check for controller, progress and safe mode
    const room = Game.rooms[rNames[0]];
    if (!room.controller || !room.controller.my || room.controller.level !== 1 || room.controller.progress ||
        !room.controller.safeMode || room.controller.safeMode <= SAFE_MODE_DURATION - 10) {
        return false;
    }
    // check for 1 spawn
    if (Object.keys(Game.spawns).length !== 1) {
        return false;
    }
    // if all cases point to a respawn, you've respawned
    Memory.respawnTick = Game.time;
    return true;
}

const colors$1 = {
  gray: '#555555',
  light: '#AAAAAA',
  road: '#666', // >:D
  energy: '#FFE87B',
  power: '#F53547',
  dark: '#181818',
  outline: '#8FBB93',
  speechText: '#000000',
  speechBackground: '#2ccf3b'
};

const speechSize = 0.5;
const speechFont = 'Times New Roman';
function calculateFactoryLevelGapsPoly() {
  let x = -0.08;
  let y = -0.52;
  let result = [];

  let gapAngle = 16 * (Math.PI / 180);
  let c1 = Math.cos(gapAngle);
  let s1 = Math.sin(gapAngle);

  let angle = 72 * (Math.PI / 180);
  let c2 = Math.cos(angle);
  let s2 = Math.sin(angle);

  for (let i = 0; i < 5; ++i) {
    result.push([0.0, 0.0]);
    result.push([x, y]);
    result.push([x * c1 - y * s1, x * s1 + y * c1]);
    let tmpX = x * c2 - y * s2;
    y = x * s2 + y * c2;
    x = tmpX;
  }
  return result;
}
const factoryLevelGaps = calculateFactoryLevelGapsPoly();

RoomVisual.prototype.structure = function(x,y,type,opts={}){
  opts = Object.assign({
    opacity: 1
  },opts);
  switch(type){
    case STRUCTURE_FACTORY: {
      const outline = [
        [-0.68, -0.11],
        [-0.84, -0.18],
        [-0.84, -0.32],
        [-0.44, -0.44],
        [-0.32, -0.84],
        [-0.18, -0.84],
        [-0.11, -0.68],

        [0.11, -0.68],
        [0.18, -0.84],
        [0.32, -0.84],
        [0.44, -0.44],
        [0.84, -0.32],
        [0.84, -0.18],
        [0.68, -0.11],

        [0.68, 0.11],
        [0.84, 0.18],
        [0.84, 0.32],
        [0.44, 0.44],
        [0.32, 0.84],
        [0.18, 0.84],
        [0.11, 0.68],

        [-0.11, 0.68],
        [-0.18, 0.84],
        [-0.32, 0.84],
        [-0.44, 0.44],
        [-0.84, 0.32],
        [-0.84, 0.18],
        [-0.68, 0.11]
      ];
      this.poly(outline.map(p => [ p[0] + x, p[1] + y ]), {
        fill: null,
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      // outer circle
      this.circle(x, y, {
        radius: 0.65,
        fill: '#232323',
        strokeWidth: 0.035,
        stroke: '#140a0a',
        opacity: opts.opacity
      });
      const spikes = [
        [-0.4, -0.1],
        [-0.8, -0.2],
        [-0.8, -0.3],
        [-0.4, -0.4],
        [-0.3, -0.8],
        [-0.2, -0.8],
        [-0.1, -0.4],

        [0.1, -0.4],
        [0.2, -0.8],
        [0.3, -0.8],
        [0.4, -0.4],
        [0.8, -0.3],
        [0.8, -0.2],
        [0.4, -0.1],

        [0.4, 0.1],
        [0.8, 0.2],
        [0.8, 0.3],
        [0.4, 0.4],
        [0.3, 0.8],
        [0.2, 0.8],
        [0.1, 0.4],

        [-0.1, 0.4],
        [-0.2, 0.8],
        [-0.3, 0.8],
        [-0.4, 0.4],
        [-0.8, 0.3],
        [-0.8, 0.2],
        [-0.4, 0.1]
      ];
      this.poly(spikes.map(p => [ p[0] + x, p[1] + y ]), {
        fill: colors$1.gray,
        stroke: '#140a0a',
        strokeWidth: 0.04,
        opacity: opts.opacity
      });
      // factory level circle
      this.circle(x, y, {
        radius: 0.54,
        fill: '#302a2a',
        strokeWidth: 0.04,
        stroke: '#140a0a',
        opacity: opts.opacity
      });
      this.poly(factoryLevelGaps.map(p => [ p[0] + x, p[1] + y ]), {
        fill: '#140a0a',
        stroke: null,
        opacity: opts.opacity
      });
      // inner black circle
      this.circle(x, y, {
        radius: 0.42,
        fill: '#140a0a',
        opacity: opts.opacity
      });
      this.rect(x - 0.24, y - 0.24, 0.48, 0.48, {
        fill: '#3f3f3f',
        opacity: opts.opacity
      });
      break;
    }
    case STRUCTURE_EXTENSION:
      this.circle(x,y,{
        radius: 0.5,
        fill: colors$1.dark,
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      this.circle(x,y,{
        radius: 0.35,
        fill: colors$1.gray,
        opacity: opts.opacity
      });
      break
    case STRUCTURE_SPAWN:
      this.circle(x,y,{
        radius: 0.65,
        fill: colors$1.dark,
        stroke: '#CCCCCC',
        strokeWidth: 0.10,
        opacity: opts.opacity
      });
      this.circle(x,y,{
        radius: 0.40,
        fill: colors$1.energy,
        opacity: opts.opacity
      });

      break;
    case STRUCTURE_POWER_SPAWN:
      this.circle(x,y,{
        radius: 0.65,
        fill: colors$1.dark,
        stroke: colors$1.power,
        strokeWidth: 0.10,
        opacity: opts.opacity
      });
      this.circle(x,y,{
        radius: 0.40,
        fill: colors$1.energy,
        opacity: opts.opacity
      });
      break;
    case STRUCTURE_LINK:
    {
      let outer = [
        [0.0,-0.5],
        [0.4,0.0],
        [0.0,0.5],
        [-0.4,0.0]
      ];
      let inner = [
        [0.0,-0.3],
        [0.25,0.0],
        [0.0,0.3],
        [-0.25,0.0]
      ];
      outer = relPoly(x,y,outer);
      inner = relPoly(x,y,inner);
      outer.push(outer[0]);
      inner.push(inner[0]);
      this.poly(outer,{
        fill: colors$1.dark,
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      this.poly(inner,{
        fill: colors$1.gray,
        stroke: false,
        opacity: opts.opacity
      });
      break;
    }
    case STRUCTURE_TERMINAL:
    {
      let outer = [
        [0.0,-0.8],
        [0.55,-0.55],
        [0.8,0.0],
        [0.55,0.55],
        [0.0,0.8],
        [-0.55,0.55],
        [-0.8,0.0],
        [-0.55,-0.55],
      ];
      let inner = [
        [0.0,-0.65],
        [0.45,-0.45],
        [0.65,0.0],
        [0.45,0.45],
        [0.0,0.65],
        [-0.45,0.45],
        [-0.65,0.0],
        [-0.45,-0.45],
      ];
      outer = relPoly(x,y,outer);
      inner = relPoly(x,y,inner);
      outer.push(outer[0]);
      inner.push(inner[0]);
      this.poly(outer,{
        fill: colors$1.dark,
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      this.poly(inner,{
        fill: colors$1.light,
        stroke: false,
        opacity: opts.opacity
      });
      this.rect(x-0.45,y-0.45,0.9,0.9,{
        fill: colors$1.gray,
        stroke: colors$1.dark,
        strokeWidth: 0.1,
        opacity: opts.opacity
      });
      break;
    }
    case STRUCTURE_LAB:
      this.circle(x,y-0.025,{
        radius: 0.55,
        fill: colors$1.dark,
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      this.circle(x,y-0.025,{
        radius: 0.40,
        fill: colors$1.gray,
        opacity: opts.opacity
      });
      this.rect(x-0.45,y+0.3,0.9,0.25,{
        fill: colors$1.dark,
        stroke: false,
        opacity: opts.opacity
      });
      {
        let box = [
          [-0.45,0.3],
          [-0.45,0.55],
          [0.45,0.55],
          [0.45,0.3],
        ];
        box = relPoly(x,y,box);
        this.poly(box,{
          stroke: colors$1.outline,
          strokeWidth: 0.05,
          opacity: opts.opacity
        });
      }
      break
    case STRUCTURE_TOWER:
      this.circle(x,y,{
        radius: 0.6,
        fill: colors$1.dark,
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      this.rect(x-0.4,y-0.3,0.8,0.6,{
        fill: colors$1.gray,
        opacity: opts.opacity
      });
      this.rect(x-0.2,y-0.9,0.4,0.5,{
        fill: colors$1.light,
        stroke: colors$1.dark,
        strokeWidth: 0.07,
        opacity: opts.opacity
      });
      break;
    case STRUCTURE_ROAD:
      this.circle(x,y,{
        radius: 0.175,
        fill: colors$1.road,
        stroke: false,
        opacity: opts.opacity
      });
      if(!this.roads) this.roads = [];
      this.roads.push([x,y]);
      break;
    case STRUCTURE_RAMPART:
      this.circle(x,y,{
        radius: 0.65,
        fill: '#434C43',
        stroke: '#5D735F',
        strokeWidth: 0.10,
        opacity: opts.opacity
      });
      break;
    case STRUCTURE_WALL:
      this.circle(x,y,{
        radius: 0.40,
        fill: colors$1.dark,
        stroke: colors$1.light,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      break;
    case STRUCTURE_STORAGE:
      let outline1 = relPoly(x, y, [
        [-0.45, -0.55],
        [0, -0.65],
        [0.45, -0.55],
        [0.55, 0],
        [0.45, 0.55],
        [0, 0.65],
        [-0.45, 0.55],
        [-0.55, 0],
        [-0.45, -0.55],
      ]);
      this.poly(outline1, {
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        fill: colors$1.dark,
        opacity: opts.opacity
      });
      this.rect(x - 0.35, y - 0.45, 0.7, 0.9, {
        fill: colors$1.energy,
        opacity: opts.opacity,
      });
      break;
    case STRUCTURE_OBSERVER:
      this.circle(x, y, {
        fill: colors$1.dark,
        radius: 0.45,
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        opacity: opts.opacity
      });
      this.circle(x + 0.225, y, {
        fill: colors$1.outline,
        radius: 0.20,
        opacity: opts.opacity
      });
      break;
    case STRUCTURE_NUKER:
      let outline = [
        [0,-1],
        [-0.47,0.2],
        [-0.5,0.5],
        [0.5,0.5],
        [0.47,0.2],
        [0,-1],
      ];
      outline = relPoly(x,y,outline);
      this.poly(outline,{
        stroke: colors$1.outline,
        strokeWidth: 0.05,
        fill: colors$1.dark,
        opacity: opts.opacity
      });
      let inline = [
        [0,-.80],
        [-0.40,0.2],
        [0.40,0.2],
        [0,-.80],
      ];
      inline = relPoly(x,y,inline);
      this.poly(inline,{
        stroke: colors$1.outline,
        strokeWidth: 0.01,
        fill: colors$1.gray,
        opacity: opts.opacity
      });
      break;
    case STRUCTURE_CONTAINER:
      this.rect(x - 0.225, y - 0.3, 0.45, 0.6,{
        fill: colors$1.gray,
        opacity: opts.opacity,
        stroke: colors$1.dark,
        strokeWidth: 0.09,
      });
      this.rect(x - 0.17, y + 0.07, 0.34, 0.2, {
        fill: colors$1.energy,
        opacity: opts.opacity,
      });
      break;
    default:
      this.circle(x, y, {
        fill: colors$1.light,
        radius: 0.35,
        stroke: colors$1.dark,
        strokeWidth: 0.20,
        opacity: opts.opacity
      });
      break;
  }

  return this;
};

const dirs = [
  [],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1]
];

RoomVisual.prototype.connectRoads = function(opts={}){
  let color = opts.color || colors$1.road || 'white';
  if(!this.roads) return
  this.roads.forEach(r=>{
    for(let i=1;i<=4;i++){
      let d = dirs[i];
      let c = [r[0]+d[0],r[1]+d[1]];
      let rd = _.some(this.roads,r=>r[0] == c[0] && r[1] == c[1]);
      if(rd){
        this.line(r[0],r[1],c[0],c[1],{
          color: color,
          width: 0.35,
          opacity: opts.opacity || 1
        });
      }
    }
  });

  return this;
};


RoomVisual.prototype.speech = function(text, x, y, opts={}) {
  var background = !!opts.background ? opts.background : colors$1.speechBackground;
  var textcolor = !!opts.textcolor ? opts.textcolor : colors$1.speechText;
  var textstyle = !!opts.textstyle ? opts.textstyle : false;
  var textsize = !!opts.textsize ? opts.textsize : speechSize;
  var textfont = !!opts.textfont ? opts.textfont : speechFont;
  var opacity = !!opts.opacity ? opts.opacity : 1;

  var fontstring = '';
  if(textstyle) {
    fontstring = textstyle + ' ';
  }
  fontstring += textsize + ' ' + textfont;

  let pointer = [
    [-0.2, -0.8],
    [ 0.2, -0.8],
    [ 0,   -0.3]
  ];
  pointer = relPoly(x,y,pointer);
  pointer.push(pointer[0]);

  this.poly(pointer,{
    fill: background,
    stroke: background,
    opacity: opacity,
    strokeWidth: 0.0
  });

  this.text(text, x, y-1, {
    color: textcolor,
    backgroundColor: background,
    backgroundPadding: 0.1,
    opacity: opacity,
    font: fontstring
  });

  return this;
};


RoomVisual.prototype.animatedPosition = function (x, y, opts={}) {

  let color = !!opts.color ? opts.color : 'blue';
  let opacity = !!opts.opacity ? opts.opacity : 0.5;
  let radius = !!opts.radius ? opts.radius : 0.75;
  let frames = !!opts.frames ? opts.frames : 6;


  let angle = (Game.time % frames * 90 / frames) * (Math.PI / 180);
  let s = Math.sin(angle);
  let c = Math.cos(angle);

  let sizeMod = Math.abs(Game.time % frames - frames / 2) / 10;
  radius += radius * sizeMod;

  let points = [
    rotate(0, -radius, s, c, x, y),
    rotate(radius, 0, s, c, x, y),
    rotate(0, radius, s, c, x, y),
    rotate(-radius, 0, s, c, x, y),
    rotate(0, -radius, s, c, x, y),
  ];

  this.poly(points, {stroke: color, opacity: opacity});

  return this;
};

function rotate(x, y, s, c, px, py) {
  let xDelta = x * c - y * s;
  let yDelta = x * s + y * c;
  return { x: px + xDelta, y: py + yDelta };
}


function relPoly(x,y,poly){
  return poly.map(p=>{
    p[0] += x;
    p[1] += y;
    return p
  })
}

RoomVisual.prototype.test = function test(){
  let demopos = [19,24];
  this.clear();
  this.structure(demopos[0]+0,demopos[1]+0,STRUCTURE_LAB);
  this.structure(demopos[0]+1,demopos[1]+1,STRUCTURE_TOWER);
  this.structure(demopos[0]+2,demopos[1]+0,STRUCTURE_LINK);
  this.structure(demopos[0]+3,demopos[1]+1,STRUCTURE_TERMINAL);
  this.structure(demopos[0]+4,demopos[1]+0,STRUCTURE_EXTENSION);
  this.structure(demopos[0]+5,demopos[1]+1,STRUCTURE_SPAWN);

  return this;
};


/// #region RESOURCE BADGES
const ColorSets = {
  white:  ["#ffffff", "#4c4c4c"],
  grey:   ["#b4b4b4", "#4c4c4c"],
  red:    ["#ff7b7b", "#592121"],
  yellow: ["#fdd388", "#5d4c2e"],
  green:  ["#00f4a2", "#236144"],
  blue:   ["#50d7f9", "#006181"],
  purple: ["#a071ff", "#371383"],
};
const ResourceColors = {
  [RESOURCE_ENERGY]:    ColorSets.yellow,
  [RESOURCE_POWER]:     ColorSets.red,

  [RESOURCE_HYDROGEN]:  ColorSets.grey,
  [RESOURCE_OXYGEN]:    ColorSets.grey,
  [RESOURCE_UTRIUM]:    ColorSets.blue,
  [RESOURCE_LEMERGIUM]: ColorSets.green,
  [RESOURCE_KEANIUM]:   ColorSets.purple,
  [RESOURCE_ZYNTHIUM]:  ColorSets.yellow,
  [RESOURCE_CATALYST]:  ColorSets.red,
  [RESOURCE_GHODIUM]:   ColorSets.white,

  [RESOURCE_HYDROXIDE]:         ColorSets.grey,
  [RESOURCE_ZYNTHIUM_KEANITE]:  ColorSets.grey,
  [RESOURCE_UTRIUM_LEMERGITE]:  ColorSets.grey,

  [RESOURCE_UTRIUM_HYDRIDE]:    ColorSets.blue,
  [RESOURCE_UTRIUM_OXIDE]:      ColorSets.blue,
  [RESOURCE_KEANIUM_HYDRIDE]:   ColorSets.purple,
  [RESOURCE_KEANIUM_OXIDE]:     ColorSets.purple,
  [RESOURCE_LEMERGIUM_HYDRIDE]: ColorSets.green,
  [RESOURCE_LEMERGIUM_OXIDE]:   ColorSets.green,
  [RESOURCE_ZYNTHIUM_HYDRIDE]:  ColorSets.yellow,
  [RESOURCE_ZYNTHIUM_OXIDE]:    ColorSets.yellow,
  [RESOURCE_GHODIUM_HYDRIDE]:   ColorSets.white,
  [RESOURCE_GHODIUM_OXIDE]:     ColorSets.white,

  [RESOURCE_UTRIUM_ACID]:       ColorSets.blue,
  [RESOURCE_UTRIUM_ALKALIDE]:   ColorSets.blue,
  [RESOURCE_KEANIUM_ACID]:      ColorSets.purple,
  [RESOURCE_KEANIUM_ALKALIDE]:  ColorSets.purple,
  [RESOURCE_LEMERGIUM_ACID]:    ColorSets.green,
  [RESOURCE_LEMERGIUM_ALKALIDE]:ColorSets.green,
  [RESOURCE_ZYNTHIUM_ACID]:     ColorSets.yellow,
  [RESOURCE_ZYNTHIUM_ALKALIDE]: ColorSets.yellow,
  [RESOURCE_GHODIUM_ACID]:      ColorSets.white,
  [RESOURCE_GHODIUM_ALKALIDE]:  ColorSets.white,

  [RESOURCE_CATALYZED_UTRIUM_ACID]:         ColorSets.blue,
  [RESOURCE_CATALYZED_UTRIUM_ALKALIDE]:     ColorSets.blue,
  [RESOURCE_CATALYZED_KEANIUM_ACID]:        ColorSets.purple,
  [RESOURCE_CATALYZED_KEANIUM_ALKALIDE]:    ColorSets.purple,
  [RESOURCE_CATALYZED_LEMERGIUM_ACID]:      ColorSets.green,
  [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]:  ColorSets.green,
  [RESOURCE_CATALYZED_ZYNTHIUM_ACID]:       ColorSets.yellow,
  [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE]:   ColorSets.yellow,
  [RESOURCE_CATALYZED_GHODIUM_ACID]:        ColorSets.white,
  [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]:    ColorSets.white,
};

const MINERALS$1 = [
  RESOURCE_CATALYST,
  RESOURCE_HYDROGEN,
  RESOURCE_OXYGEN,
  RESOURCE_LEMERGIUM,
  RESOURCE_UTRIUM,
  RESOURCE_ZYNTHIUM,
  RESOURCE_KEANIUM
];

RoomVisual.prototype.resource = function(type, x, y, size = 0.25){
  if (type == RESOURCE_ENERGY || type == RESOURCE_POWER)
    this._fluid(type, x, y, size);
  else if (MINERALS$1.includes(type))
    this._mineral(type, x, y, size);
  else if (ResourceColors[type] != undefined)
    this._compound(type, x, y, size);
  else
    return ERR_INVALID_ARGS
  return OK;
};
RoomVisual.prototype._fluid = function (type, x, y, size = 0.25) {
  this.circle(x, y, {
    radius: size,
    fill: ResourceColors[type][0],
    opacity: 1,
  });
  this.text(type[0], x, y-(size*0.1), {
    font: (size*1.5),
    color: ResourceColors[type][1],
    backgroundColor: ResourceColors[type][0],
    backgroundPadding: 0,
  });
};
RoomVisual.prototype._mineral = function (type, x, y, size = 0.25) {
  this.circle(x, y, {
    radius: size,
    fill: ResourceColors[type][0],
    opacity: 1,
  });
  this.circle(x, y, {
    radius: size * 0.8,
    fill: ResourceColors[type][1],
    opacity: 1,
  });
  this.text(type, x, y+(size*0.03), {
    font: "bold "+(size*1.25)+" arial",
    color: ResourceColors[type][0],
    backgroundColor: ResourceColors[type][1],
    backgroundPadding: 0,
  });
};
RoomVisual.prototype._compound = function (type, x, y, size = 0.25) {
  let label = type.replace("2", '₂');

  this.text(label, x, y, {
    font: "bold "+(size*1)+" arial",
    color: ResourceColors[type][1],
    backgroundColor: ResourceColors[type][0],
    backgroundPadding: 0.3*size,
  });
};
/// #endregion

var main$1 = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, '__esModule', { value: true });

Object.defineProperty(exports, "__esModule", { value: true });



var config = {
    DEFAULT_MOVE_OPTS: {
        avoidCreeps: false,
        avoidObstacleStructures: true,
        avoidSourceKeepers: true,
        keepTargetInRoom: true,
        repathIfStuck: 3,
        roadCost: 1,
        plainCost: 2,
        swampCost: 10,
        priority: 1,
        defaultRoomCost: 2,
        highwayRoomCost: 1,
        sourceKeeperRoomCost: 2,
        maxRooms: 64,
        maxOps: 100000,
        maxOpsPerRoom: 2000
    },
    DEFAULT_VISUALIZE_OPTS: {
        fill: 'transparent',
        stroke: '#fff',
        lineStyle: 'dashed',
        strokeWidth: 0.15,
        opacity: 0.1
    },
    MEMORY_CACHE_PATH: '_cg',
    MEMORY_CACHE_EXPIRATION_PATH: '_cge'
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

var cache = new Map();
var expirationCache = new Map();
var HeapCache = {
    set: function (key, value, expiration) {
        cache.set(key, value);
        if (expiration !== undefined) {
            expirationCache.set(key, expiration);
        }
    },
    get: function (key) {
        return cache.get(key);
    },
    expires: function (key) {
        return expirationCache.get(key);
    },
    delete: function (key) {
        cache.delete(key);
    },
    with: function () {
        return HeapCache; // HeapCache never uses serializers
    },
    clean: function () {
        var e_1, _a;
        try {
            for (var expirationCache_1 = __values(expirationCache), expirationCache_1_1 = expirationCache_1.next(); !expirationCache_1_1.done; expirationCache_1_1 = expirationCache_1.next()) {
                var _b = __read(expirationCache_1_1.value, 2), key = _b[0], expires = _b[1];
                if (Game.time >= expires) {
                    HeapCache.delete(key);
                    expirationCache.delete(key);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (expirationCache_1_1 && !expirationCache_1_1.done && (_a = expirationCache_1.return)) _a.call(expirationCache_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
};

const MAX_DEPTH  = 53;       // Number.MAX_SAFE_INTEGER === (2^53 - 1)

const // #define
    SAFE_BITS           = 15,       // 15 of 16 UTF-16 bits
    UNPRINTABLE_OFFSET  = 48,       // ASCII '0'
    UPPER_BOUND         = 0xFFFF,   // Max 16 bit value
    POWERS_OF_2 = [1,
        2,                      4,                      8,                      16,
        32,                     64,                     128,                    256,
        512,                    1024,                   2048,                   4096,
        8192,                   16384,                  32768,                  65536,
        131072,                 262144,                 524288,                 1048576,
        2097152,                4194304,                8388608,                16777216,
        33554432,               67108864,               134217728,              268435456,
        536870912,              1073741824,             2147483648,             4294967296,
        8589934592,             17179869184,            34359738368,            68719476736,
        137438953472,           274877906944,           549755813888,           1099511627776,
        2199023255552,          4398046511104,          8796093022208,          17592186044416,
        35184372088832,         70368744177664,         140737488355328,        281474976710656,
        562949953421312,        1125899906842624,       2251799813685248,       4503599627370496,
        9007199254740992        // 2^53 max
    ];

/// Maximum representable by SAFE_BITS number + 1 
const UPPER_LIMIT = POWERS_OF_2[SAFE_BITS];

/// Set of lib errors
class RangeCodecError extends RangeError { constructor(msg) { super("[utf15][RangeError]: " + msg); } }
class TypeCodecError  extends TypeError  { constructor(msg) { super("[utf15][TypeError]: "  + msg); } }


/// Throws runtime exception in case of failed condition
const assert = (condition, Err, ...str) => {
    if(!condition) throw new Err(str.reduce((o,s) => (o+s+' '), '')); };

/// @returns normalized UTF CodePoint
const num_to_code_point = (x) => {
    x = +x;
    assert(x >= 0 && x < UPPER_LIMIT, RangeCodecError, 'x out of bounds:', x);
    x += UNPRINTABLE_OFFSET;
    return x;
};

/// @returns extracted unsigned value from CodePoint
const code_point_to_num = (x) => {
    x = +x;
    assert(x >= 0 && x <= UPPER_BOUND, RangeCodecError, 'x out of bounds:', x);
    x -= UNPRINTABLE_OFFSET;
    return x;
};

const check_cfg = (cfg) => {
    let fail = false;
    fail = fail || isNaN(cfg.meta)  || (cfg.meta  !== 0 && cfg.meta  !== 1);
    fail = fail || isNaN(cfg.array) || (cfg.array !== 0 && cfg.array !== 1);
    if(!fail) (()=>{
        const depth_is_array = Array.isArray(cfg.depth);
        fail = fail || (depth_is_array && !cfg.array);
        if(fail) return;
        
        const fail_depth = (x) => (isNaN(x) || x <= 0 || x > MAX_DEPTH);
        if(depth_is_array) {
            cfg.depth.forEach((d, idx) => {
                cfg.depth[idx] = +cfg.depth[idx];
                fail = fail || fail_depth(d);
            });
        } else {
            cfg.depth = +cfg.depth;
            fail = fail || fail_depth(cfg.depth);
        }
    })();
    
    if(fail) {
        let str = '[JSON.stringify() ERROR]';
        try { str = JSON.stringify(cfg); } finally {}
        assert(0, TypeCodecError, 'Codec config is invalid:', str);
    }
};

const serialize_meta = (str, meta) => {
    const depth = Array.isArray(meta.depth) ? 0 : meta.depth;
    return str + String.fromCodePoint(
        num_to_code_point(meta.array),
        num_to_code_point(depth));
};

const deserialize_meta = (str, meta, offset) => {
    offset = offset || 0;
    meta.array = code_point_to_num(str.codePointAt(offset    ));
    meta.depth = code_point_to_num(str.codePointAt(offset + 1));
    return [str.slice(offset + 2), 2];
};

function encode_array(res, values) {
    const depth_is_array = Array.isArray(this.depth);
    
    const fixed_depth = depth_is_array ? 0 : this.depth;
    const depths = depth_is_array ? this.depth : [];

    assert(fixed_depth || depths.length === values.length, TypeCodecError,
        'Wrong depths array length:', depths, values);

    if(!depth_is_array) // Save array length as meta
        res += String.fromCodePoint(num_to_code_point(values.length));

    let symbol_done = 0, symbol_acc = 0;

    // Cycle over values
    for(let i = 0, len = values.length; i < len; ++i) {

        // Current value and its bit depth
        const value = values[i], depth = fixed_depth || depths[i];

        // Cycle over value bits
        for(let value_done = 0; value_done < depth;) {

            const symbol_left   = SAFE_BITS - symbol_done;
            const value_left    = depth - value_done;
            const bits_to_write = Math.min(symbol_left, value_left);

            let mask = Math.floor(value / POWERS_OF_2[value_done]);
            mask %= POWERS_OF_2[bits_to_write];
            mask *= POWERS_OF_2[symbol_done];

            symbol_acc  += mask;
            value_done  += bits_to_write;
            symbol_done += bits_to_write;

            // Output symbol ready, push it
            if(symbol_done === SAFE_BITS) {
                res += String.fromCodePoint(num_to_code_point(symbol_acc));
                symbol_done = symbol_acc = 0;
            }
        }
    }

    if(symbol_done !== 0) // Last symbol left
        res += String.fromCodePoint(num_to_code_point(symbol_acc));
    
    return res;
}

function decode_array(str, meta) {
    assert(!this.meta || meta.depth > 0 || (meta.depth === 0 && Array.isArray(this.depth)),
        TypeCodecError, 'Array decoding error (check inputs and codec config)');

    meta.depth = meta.depth || this.depth;
    const depth_is_array = Array.isArray(meta.depth);

    let it = 0, i = 0;
    const length = depth_is_array ? meta.depth.length : code_point_to_num(str.codePointAt(it++));
    const fixed_depth = depth_is_array ? 0 : meta.depth;
    const depths = depth_is_array ? meta.depth : [];
    const values = new Array(length);
    
    let symbol_done = 0;
    let chunk = code_point_to_num(str.codePointAt(it++));

    // Cycle over values
    while(i < length) {

        const depth = fixed_depth || depths[i];
        let value_acc = 0, value_done = 0;

        // Cycle over value bits
        while(value_done < depth) {
            const symbol_left   = SAFE_BITS - symbol_done;
            const value_left    = depth - value_done;
            const bits_to_read  = Math.min(symbol_left, value_left);

            let data = Math.floor(chunk / POWERS_OF_2[symbol_done]);
            data %= POWERS_OF_2[bits_to_read];
            data *= POWERS_OF_2[value_done];

            value_acc   += data;
            value_done  += bits_to_read;
            symbol_done += bits_to_read;

            // The whole symbol has been processed, move to next
            if(symbol_done === SAFE_BITS) {
                // It was the last code unit, break without iterators changing
                if((i + 1) === length && value_done === depth) break;
                chunk = code_point_to_num(str.codePointAt(it++));
                symbol_done = 0;
            }
        }

        if(value_done > 0)
            values[i++] = value_acc;
    }

    return [values, it];
}

class Codec {
    
    /// Constructs codec by config or another serialized codec (this <=> cfg)
    constructor(cfg) {
        cfg = cfg || {};
        this.meta   = +(!!cfg.meta);
        this.array  = +(!!cfg.array);
        this.depth  = cfg.depth || MAX_DEPTH;
        check_cfg(this);
    }
    
    /// @param arg -- single value or array of values to be encoded
    /// @returns encoded string
    encode(arg) {
        assert((+Array.isArray(arg) | +(!!(arg).BYTES_PER_ELEMENT)) ^ !this.array, TypeCodecError,
            'Incompatible codec (array <=> single value), arg =', arg);
        
        let res = '';

        if(this.meta) // Save meta info
            res = serialize_meta(res, this);
        
        if(this.array) {
            // Effectively packs array of numbers
            res = encode_array.call(this, res, arg);
        } else {
            // Packs single value, inline
            let x = +arg % POWERS_OF_2[this.depth];
            const len = Math.ceil(this.depth / SAFE_BITS);
            for(let i = 0; i < len; ++i) {
                const cp = num_to_code_point(x % UPPER_LIMIT);
                res += String.fromCodePoint(cp);
                x = Math.floor(x / UPPER_LIMIT);
            }
        }
        
        return res;
    }

    /// @param str -- string to be decoded
    /// @param length_out -- output, read length will be saved as "length_out.length" (optional)
    /// @returns decoded single value or array of values
    decode(str, length_out) {
        let meta = null;    // codec config
        let length = 0;     // number of read code units
        
        if(this.meta) {
            // Meta has been saved to str, restore
            [str, length] = deserialize_meta(str, (meta = {}));
        } else {
            // Otherwise, use this config
            meta = this;
        }

        assert(meta.array ^ !this.array, TypeCodecError,
            'Incompatible codec (array <=> single value), str =', str);
        
        if(this.array) { // output is array of integers
            const res = decode_array.call(this, str, meta);
            !!length_out && (length_out.length = length + res[1]);
            return res[0];
        }

        let acc = 0, pow = 0;
        const len = Math.ceil(meta.depth / SAFE_BITS);
        for(let i = 0; i < len; ++i) {
            const x = code_point_to_num(str.codePointAt(i));
            acc += x * POWERS_OF_2[pow];
            pow += SAFE_BITS;
        }

        !!length_out && (length_out.length = length + len);
        return acc;
    }
}

var numberCodec = new Codec({ array: false });
var NumberSerializer = {
    key: 'ns',
    serialize: function (target) {
        if (target === undefined)
            return undefined;
        return numberCodec.encode(target);
    },
    deserialize: function (target) {
        if (target === undefined)
            return undefined;
        return numberCodec.decode(target);
    }
};

var cacheKey = function (serializer, key) { return "cg_".concat(serializer.key, "_").concat(key); };
/**
 * Wraps the caching method with a serializer to read/write objects from the cache.
 * Assumes serializers are idempotent - same input will produce the same deserialized
 * output. Caches the deserialized output so it can be looked up quickly instead of
 * running the (more expensive) deserialization each tick. These caches are cleaned
 * up after CREEP_LIFE_TIME ticks or when the target item is deleted.
 */
var withSerializer = function (strategy, serializer) { return (__assign(__assign({}, strategy), { 
    // override certain methods for serialization
    get: function (key) {
        var _a;
        var serializedValue = strategy.get(key);
        if (!serializedValue)
            return undefined;
        var value = (_a = HeapCache.get(cacheKey(serializer, serializedValue))) !== null && _a !== void 0 ? _a : serializer.deserialize(serializedValue);
        if (value !== undefined)
            HeapCache.set(cacheKey(serializer, serializedValue), value, Game.time + CREEP_LIFE_TIME);
        return value;
    }, set: function (key, value, expiration) {
        // free previously cached deserialized value
        var previous = strategy.get(key);
        if (previous)
            HeapCache.delete(cacheKey(serializer, previous));
        var v = serializer.serialize(value);
        if (v) {
            strategy.set(key, v, expiration);
            HeapCache.set(cacheKey(serializer, v), value, Game.time + CREEP_LIFE_TIME);
        }
        else {
            strategy.delete(key);
        }
    }, delete: function (key) {
        var previous = strategy.get(key);
        if (previous)
            HeapCache.delete(cacheKey(serializer, previous));
        strategy.delete(key);
    }, with: function (serializer) {
        return withSerializer(strategy, serializer);
    } })); };

function memoryCache() {
    var _a;
    var _b;
    (_a = Memory[_b = config.MEMORY_CACHE_PATH]) !== null && _a !== void 0 ? _a : (Memory[_b] = {});
    return Memory[config.MEMORY_CACHE_PATH];
}
function memoryExpirationCache() {
    var _a;
    var _b;
    (_a = Memory[_b = config.MEMORY_CACHE_EXPIRATION_PATH]) !== null && _a !== void 0 ? _a : (Memory[_b] = {});
    return Memory[config.MEMORY_CACHE_EXPIRATION_PATH];
}
var MemoryCache = {
    set: function (key, value, expiration) {
        memoryCache()[key] = value;
        if (expiration !== undefined) {
            var expires = NumberSerializer.serialize(expiration);
            if (expires)
                memoryExpirationCache()[key] = expires;
        }
    },
    get: function (key) {
        return memoryCache()[key];
    },
    expires: function (key) {
        return NumberSerializer.deserialize(memoryExpirationCache()[key]);
    },
    delete: function (key) {
        delete memoryCache()[key];
    },
    with: function (serializer) {
        return withSerializer(MemoryCache, serializer);
    },
    clean: function () {
        var expirationCache = memoryExpirationCache();
        for (var key in expirationCache) {
            var expires = NumberSerializer.deserialize(expirationCache[key]);
            if (expires !== undefined && Game.time >= expires) {
                MemoryCache.delete(key);
                delete expirationCache[key];
            }
        }
    }
};

/**
 * screeps-packrat
 * ---------------
 * Lightning-fast and memory-efficient serialization of Screeps IDs, Coords, and RoomPositions
 * Code written by Muon as part of Overmind Screeps AI. Feel free to adapt as desired.
 * Package repository: https://github.com/bencbartlett/screeps-packrat
 *
 * Plain JS version is available in the #share-thy-code channel on the Screeps Slack.
 *
 * To use: import desired functions from module, or import entire module on main and use functions from global.
 * To benchmark: import tests file, PackratTests.run()
 *
 * Exported functions (available on global):
 *
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 * |         function         |                  description                   | execution time* | memory reduction** |
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 * | packId                   | packs a game object id into 6 chars            | 500ns           | -75%               |
 * | unpackId                 | unpacks 6 chars into original format           | 1.3us           |                    |
 * | packIdList               | packs a list of ids into a single string       | 500ns/id        | -81%               |
 * | unpackIdList             | unpacks a string into a list of ids            | 1.2us/id        |                    |
 * | packPos                  | packs a room position into 2 chars             | 150ns           | -90%               |
 * | unpackPos                | unpacks 2 chars into a room position           | 600ns           |                    |
 * | packPosList              | packs a list of room positions into a string   | 150ns/pos       | -95%               |
 * | unpackPosList            | unpacks a string into a list of room positions | 1.5us/pos       |                    |
 * | packCoord                | packs a coord (e.g. {x:25,y:25}) as a string   | 150ns           | -80%               |
 * | unpackCoord              | unpacks a string into a coord                  | 60-150ns        |                    |
 * | packCoordList            | packs a list of coords as a string             | 120ns/coord     | -94%               |
 * | unpackCoordList          | unpacks a string into a list of coords         | 100ns/coord     |                    |
 * | unpackCoordAsPos         | unpacks string + room name into a pos          | 500ns           |                    |
 * | unpackCoordListAsPosList | unpacks string + room name into a list of pos  | 500ns/coord     |                    |
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 *
 *  * Execution time measured on shard2 public servers and may vary on different machines or shards.
 * ** Memory reduction for list functions is the asymptotic limit of lists containing many entries. Lower reductions
 *    can be expected for smaller lists.
 *
 */
commonjsGlobal.PERMACACHE = {}; // Create a permanent cache for immutable items such as room names
/**
 * Convert a standard 24-character hex id in screeps to a compressed UTF-16 encoded string of length 6.
 *
 * Benchmarking: average of 500ns to execute on shard2 public server, reduce stringified size by 75%
 */
function packId(id) {
    return (String.fromCharCode(parseInt(id.substr(0, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(4, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(8, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(12, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(16, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(20, 4), 16)));
}
/**
 * Convert a compressed six-character UTF-encoded id back into the original 24-character format.
 *
 * Benchmarking: average of 1.3us to execute on shard2 public server
 */
function unpackId(packedId) {
    var id = '';
    var current;
    for (var i = 0; i < 6; ++i) {
        current = packedId.charCodeAt(i);
        id += (current >>> 8).toString(16).padStart(2, '0'); // String.padStart() requires es2017+ target
        id += (current & 0xff).toString(16).padStart(2, '0');
    }
    return id;
}
/**
 * Packs a list of ids as a utf-16 string. This is better than having a list of packed coords, as it avoids
 * extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 500ns per id to execute on shard2 public server, reduce stringified size by 81%
 */
function packIdList(ids) {
    var str = '';
    for (var i = 0; i < ids.length; ++i) {
        str += packId(ids[i]);
    }
    return str;
}
/**
 * Unpacks a list of ids stored as a utf-16 string.
 *
 * Benchmarking: average of 1.2us per id to execute on shard2 public server.
 */
function unpackIdList(packedIds) {
    var ids = [];
    for (var i = 0; i < packedIds.length; i += 6) {
        ids.push(unpackId(packedIds.substr(i, 6)));
    }
    return ids;
}
/**
 * Packs a coord as a single utf-16 character. The seemingly strange choice of encoding value ((x << 6) | y) + 65 was
 * chosen to be fast to compute (x << 6 | y is significantly faster than 50 * x + y) and to avoid control characters,
 * as "A" starts at character code 65.
 *
 * Benchmarking: average of 150ns to execute on shard2 public server, reduce stringified size by 80%
 */
function packCoord(coord) {
    return String.fromCharCode(((coord.x << 6) | coord.y) + 65);
}
/**
 * Unpacks a coord stored as a single utf-16 character
 *
 * Benchmarking: average of 60ns-100ns to execute on shard2 public server
 */
function unpackCoord(char) {
    var xShiftedSixOrY = char.charCodeAt(0) - 65;
    return {
        x: (xShiftedSixOrY & 4032) >>> 6,
        y: xShiftedSixOrY & 63
    };
}
/**
 * Unpacks a coordinate and creates a RoomPosition object from a specified roomName
 *
 * Benchmarking: average of 500ns to execute on shard2 public server
 */
function unpackCoordAsPos(packedCoord, roomName) {
    var coord = unpackCoord(packedCoord);
    return new RoomPosition(coord.x, coord.y, roomName);
}
/**
 * Packs a list of coords as a utf-16 string. This is better than having a list of packed coords, as it avoids
 * extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 120ns per coord to execute on shard2 public server, reduce stringified size by 94%
 */
function packCoordList(coords) {
    var str = '';
    for (var i = 0; i < coords.length; ++i) {
        str += String.fromCharCode(((coords[i].x << 6) | coords[i].y) + 65);
    }
    return str;
}
/**
 * Unpacks a list of coords stored as a utf-16 string
 *
 * Benchmarking: average of 100ns per coord to execute on shard2 public server
 */
function unpackCoordList(chars) {
    var coords = [];
    var xShiftedSixOrY;
    for (var i = 0; i < chars.length; ++i) {
        xShiftedSixOrY = chars.charCodeAt(i) - 65;
        coords.push({
            x: (xShiftedSixOrY & 4032) >>> 6,
            y: xShiftedSixOrY & 63
        });
    }
    return coords;
}
/**
 * Unpacks a list of coordinates and creates a list of RoomPositions from a specified roomName
 *
 * Benchmarking: average of 500ns per coord to execute on shard2 public server
 */
function unpackCoordListAsPosList(packedCoords, roomName) {
    var positions = [];
    var coord;
    for (var i = 0; i < packedCoords.length; ++i) {
        // Each coord is saved as a single character; unpack each and insert the room name to get the positions list
        coord = unpackCoord(packedCoords[i]);
        positions.push(new RoomPosition(coord.x, coord.y, roomName));
    }
    return positions;
}
PERMACACHE._packedRoomNames = PERMACACHE._packedRoomNames || {};
PERMACACHE._unpackedRoomNames = PERMACACHE._unpackedRoomNames || {};
/**
 * Packs a roomName as a single utf-16 character. Character values are stored on permacache.
 */
function packRoomName(roomName) {
    if (PERMACACHE._packedRoomNames[roomName] === undefined) {
        var coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
        var match = coordinateRegex.exec(roomName);
        var xDir = match[1];
        var x = Number(match[2]);
        var yDir = match[3];
        var y = Number(match[4]);
        var quadrant = void 0;
        if (xDir == 'W') {
            if (yDir == 'N') {
                quadrant = 0;
            }
            else {
                quadrant = 1;
            }
        }
        else {
            if (yDir == 'N') {
                quadrant = 2;
            }
            else {
                quadrant = 3;
            }
        }
        // y is 6 bits, x is 6 bits, quadrant is 2 bits
        var num = ((quadrant << 12) | (x << 6) | y) + 65;
        var char = String.fromCharCode(num);
        PERMACACHE._packedRoomNames[roomName] = char;
        PERMACACHE._unpackedRoomNames[char] = roomName;
    }
    return PERMACACHE._packedRoomNames[roomName];
}
/**
 * Packs a roomName as a single utf-16 character. Character values are stored on permacache.
 */
function unpackRoomName(char) {
    if (PERMACACHE._unpackedRoomNames[char] === undefined) {
        var num = char.charCodeAt(0) - 65;
        var _a = {
            q: (num & 12351) >>> 12,
            x: (num & 4032) >>> 6,
            y: num & 63
        }, q = _a.q, x = _a.x, y = _a.y;
        var roomName = void 0;
        switch (q) {
            case 0:
                roomName = 'W' + x + 'N' + y;
                break;
            case 1:
                roomName = 'W' + x + 'S' + y;
                break;
            case 2:
                roomName = 'E' + x + 'N' + y;
                break;
            case 3:
                roomName = 'E' + x + 'S' + y;
                break;
            default:
                roomName = 'ERROR';
        }
        PERMACACHE._packedRoomNames[roomName] = char;
        PERMACACHE._unpackedRoomNames[char] = roomName;
    }
    return PERMACACHE._unpackedRoomNames[char];
}
/**
 * Packs a RoomPosition as a pair utf-16 characters. The seemingly strange choice of encoding value ((x << 6) | y) + 65
 * was chosen to be fast to compute (x << 6 | y is significantly faster than 50 * x + y) and to avoid control
 * characters, as "A" starts at character code 65.
 *
 * Benchmarking: average of 150ns to execute on shard2 public server, reduce stringified size by 90%
 */
function packPos(pos) {
    return packCoord(pos) + packRoomName(pos.roomName);
}
/**
 * Unpacks a RoomPosition stored as a pair of utf-16 characters.
 *
 * Benchmarking: average of 600ns to execute on shard2 public server.
 */
function unpackPos(chars) {
    var _a = unpackCoord(chars[0]), x = _a.x, y = _a.y;
    return new RoomPosition(x, y, unpackRoomName(chars[1]));
}
/**
 * Packs a list of RoomPositions as a utf-16 string. This is better than having a list of packed RoomPositions, as it
 * avoids extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 150ns per position to execute on shard2 public server, reduce stringified size by 95%
 */
function packPosList(posList) {
    var str = '';
    for (var i = 0; i < posList.length; ++i) {
        str += packPos(posList[i]);
    }
    return str;
}
/**
 * Unpacks a list of RoomPositions stored as a utf-16 string.
 *
 * Benchmarking: average of 1.5us per position to execute on shard2 public server.
 */
function unpackPosList(chars) {
    var posList = [];
    for (var i = 0; i < chars.length; i += 2) {
        posList.push(unpackPos(chars.substr(i, 2)));
    }
    return posList;
}
// Useful to register these functions on global to use with console
commonjsGlobal.packId = packId;
commonjsGlobal.unpackId = unpackId;
commonjsGlobal.packIdList = packIdList;
commonjsGlobal.unpackIdList = unpackIdList;
commonjsGlobal.packCoord = packCoord;
commonjsGlobal.unpackCoord = unpackCoord;
commonjsGlobal.unpackCoordAsPos = unpackCoordAsPos;
commonjsGlobal.packCoordList = packCoordList;
commonjsGlobal.unpackCoordList = unpackCoordList;
commonjsGlobal.unpackCoordListAsPosList = unpackCoordListAsPosList;
commonjsGlobal.packPos = packPos;
commonjsGlobal.unpackPos = unpackPos;
commonjsGlobal.packPosList = packPosList;
commonjsGlobal.unpackPosList = unpackPosList;

/**
 * Note: this binds range at 32768, which should be plenty for MoveTarget purposes
 */
var rangeCodec = new Codec({ array: false, depth: 15 });
var MoveTargetSerializer = {
    key: 'mts',
    serialize: function (target) {
        if (target === undefined)
            return undefined;
        return "".concat(packPos(target.pos)).concat(rangeCodec.encode(target.range));
    },
    deserialize: function (target) {
        if (target === undefined)
            return undefined;
        return {
            pos: unpackPos(target.slice(0, 2)),
            range: rangeCodec.decode(target.slice(2))
        };
    }
};
/**
 * Move target serializes into three characters: two for position and one for range
 */
var MoveTargetListSerializer = {
    key: 'mtls',
    serialize: function (target) {
        if (target === undefined)
            return undefined;
        return target.map(function (t) { return MoveTargetSerializer.serialize(t); }).join('');
    },
    deserialize: function (target) {
        if (target === undefined)
            return undefined;
        var targets = [];
        for (var i = 0; i < target.length; i += 3) {
            var t = MoveTargetSerializer.deserialize(target.slice(i, 3));
            if (t)
                targets.push(t);
        }
        return targets;
    }
};

var PositionSerializer = {
    key: 'ps',
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packPos(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackPos(pos);
    }
};
var PositionListSerializer = {
    key: 'pls',
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packPosList(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackPosList(pos);
    }
};
var CoordSerializer = {
    key: 'cs',
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packCoord(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackCoord(pos);
    }
};
var CoordListSerializer = {
    key: 'cls',
    serialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return packCoordList(pos);
    },
    deserialize: function (pos) {
        if (pos === undefined)
            return undefined;
        return unpackCoordList(pos);
    }
};

function cleanAllCaches() {
    MemoryCache.clean();
    HeapCache.clean();
}
var CachingStrategies = {
    HeapCache: HeapCache,
    MemoryCache: MemoryCache
};

/**
 * Position is an edge tile
 */
var isExit = function (pos) { return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49; };
/**
 * Takes a target or list of targets in a few different possible formats and
 * normalizes to a list of MoveTarget[]
 */
var normalizeTargets = function (targets, keepTargetInRoom) {
    if (keepTargetInRoom === void 0) { keepTargetInRoom = true; }
    var normalizedTargets = [];
    if (Array.isArray(targets)) {
        if ('pos' in targets[0]) {
            normalizedTargets.push.apply(normalizedTargets, __spreadArray([], __read(targets), false));
        }
        else {
            normalizedTargets.push.apply(normalizedTargets, __spreadArray([], __read(targets.map(function (pos) { return ({ pos: pos, range: 0 }); })), false));
        }
    }
    else if ('pos' in targets) {
        if ('range' in targets) {
            normalizedTargets.push(targets);
        }
        else {
            normalizedTargets.push({ pos: targets.pos, range: 1 });
        }
    }
    else {
        normalizedTargets.push({ pos: targets, range: 1 });
    }
    if (keepTargetInRoom)
        normalizedTargets = normalizedTargets.flatMap(fixEdgePosition);
    return normalizedTargets;
};
/**
 * If a MoveTarget's position and range overlaps a room edge, this will split
 * the MoveTarget into two or four MoveTargets to cover an equivalent area without
 * overlapping the edge. Useful for pathing in range of a target, but making sure it's
 * at least in the same room.
 */
function fixEdgePosition(_a) {
    var pos = _a.pos, range = _a.range;
    if (pos.x > range && 49 - pos.x > range && pos.y > range && 49 - pos.y > range) {
        return [{ pos: pos, range: range }]; // no action needed
    }
    // generate quadrants
    var rect = {
        x1: Math.max(1, pos.x - range),
        x2: Math.min(48, pos.x + range),
        y1: Math.max(1, pos.y - range),
        y2: Math.min(48, pos.y + range)
    };
    var quadrantRange = Math.ceil((Math.min(rect.x2 - rect.x1, rect.y2 - rect.y1) - 1) / 2);
    var quadrants = [
        { x: rect.x1 + quadrantRange, y: rect.y1 + quadrantRange },
        { x: rect.x1 + quadrantRange, y: rect.y2 - quadrantRange },
        { x: rect.x2 - quadrantRange, y: rect.y2 - quadrantRange },
        { x: rect.x2 - quadrantRange, y: rect.y1 + quadrantRange }
    ]
        .reduce(function (set, coord) {
        if (!set.some(function (c) { return c.x === coord.x && c.y === coord.y; }))
            set.push(coord);
        return set;
    }, [])
        .map(function (coord) { return ({ pos: new RoomPosition(coord.x, coord.y, pos.roomName), range: quadrantRange }); });
    return quadrants;
}
/**
 * Helper for calculating adjacent tiles
 */
var calculateAdjacencyMatrix = function (proximity) {
    if (proximity === void 0) { proximity = 1; }
    var adjacencies = new Array(proximity * 2 + 1).fill(0).map(function (v, i) { return i - proximity; });
    return adjacencies
        .flatMap(function (x) { return adjacencies.map(function (y) { return ({ x: x, y: y }); }); })
        .filter(function (a) { return !(a.x === 0 && a.y === 0); });
};
/**
 * Positions in range 1 of `pos` (not includeing `pos`)
 */
var calculateAdjacentPositions = function (pos) {
    return calculateNearbyPositions(pos, 1);
};
/**
 * Positions within `proximity` of `pos`, optionally including `pos`
 */
var calculateNearbyPositions = function (pos, proximity, includeCenter) {
    if (includeCenter === void 0) { includeCenter = false; }
    var adjacent = [];
    adjacent = calculateAdjacencyMatrix(proximity)
        .map(function (offset) {
        try {
            return new RoomPosition(pos.x + offset.x, pos.y + offset.y, pos.roomName);
        }
        catch (_a) {
            return null;
        }
    })
        .filter(function (roomPos) { return roomPos !== null; });
    if (includeCenter)
        adjacent.push(pos);
    return adjacent;
};
/**
 * Adjacent positions that are pathable (optionally ignoring creeps)
 */
var adjacentWalkablePositions = function (pos, ignoreCreeps) {
    if (ignoreCreeps === void 0) { ignoreCreeps = false; }
    return calculateAdjacentPositions(pos).filter(function (p) { return isPositionWalkable(p, ignoreCreeps); });
};
/**
 * Check if a position is walkable, accounting for terrain, creeps, and structures
 */
var isPositionWalkable = function (pos, ignoreCreeps, ignoreStructures) {
    if (ignoreCreeps === void 0) { ignoreCreeps = false; }
    if (ignoreStructures === void 0) { ignoreStructures = false; }
    var terrain;
    try {
        terrain = Game.map.getRoomTerrain(pos.roomName);
    }
    catch (_a) {
        // Invalid room
        return false;
    }
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
        return false;
    }
    if (Game.rooms[pos.roomName] &&
        pos.look().some(function (obj) {
            if (!ignoreCreeps && obj.type === LOOK_CREEPS)
                return true;
            if (!ignoreStructures &&
                obj.constructionSite &&
                obj.constructionSite.my &&
                OBSTACLE_OBJECT_TYPES.includes(obj.constructionSite.structureType))
                return true;
            if (!ignoreStructures &&
                obj.structure &&
                (OBSTACLE_OBJECT_TYPES.includes(obj.structure.structureType) ||
                    (obj.structure instanceof StructureRampart && !obj.structure.my)))
                return true;
            return false;
        })) {
        return false;
    }
    return true;
};

var isHighway = function (roomName) {
    var parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (!parsed)
        throw new Error('Invalid room name');
    return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
};
var isSourceKeeperRoom = function (roomName) {
    var parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (!parsed)
        throw new Error('Invalid room name');
    var fmod = Number(parsed[1]) % 10;
    var smod = Number(parsed[2]) % 10;
    // return !(fmod === 5 && smod === 5) && (fmod >= 4 && fmod <= 6) && (smod >= 4 && smod <= 6);
    return fmod >= 4 && fmod <= 6 && smod >= 4 && smod <= 6;
};

var keys$4 = {
    SOURCE_KEEPER_POS_LIST: '_ck'
};
var skKey = function (room) { return keys$4.SOURCE_KEEPER_POS_LIST + room; };
function updateIntel() {
    for (var room in Game.rooms) {
        if (isSourceKeeperRoom(room) && !MemoryCache.get(skKey(room))) {
            MemoryCache.with(PositionListSerializer).set(skKey(room), __spreadArray(__spreadArray([], __read(Game.rooms[room].find(FIND_SOURCES)), false), __read(Game.rooms[room].find(FIND_MINERALS)), false).map(function (s) { return s.pos; }));
        }
    }
}
function avoidSourceKeepers(room, cm) {
    var e_1, _a;
    var _b;
    var skPositions = (_b = MemoryCache.with(PositionListSerializer).get(skKey(room))) !== null && _b !== void 0 ? _b : [];
    try {
        for (var skPositions_1 = __values(skPositions), skPositions_1_1 = skPositions_1.next(); !skPositions_1_1.done; skPositions_1_1 = skPositions_1.next()) {
            var pos = skPositions_1_1.value;
            calculateNearbyPositions(pos, 5, true).forEach(function (p) { return cm.set(p.x, p.y, 0xff); });
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (skPositions_1_1 && !skPositions_1_1.done && (_a = skPositions_1.return)) _a.call(skPositions_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return cm;
}

/**
 * 15 bits will be enough for three hex characters
 */
var codec = new Codec({ array: false, depth: 15 });
/**
 * Derives a cache key namespaced to a particular object. `id` should be a hex string
 */
var objectIdKey = function (id, key) {
    var _a;
    if (!id || !id.length)
        throw new Error('Empty id');
    var paddedId = id;
    // pad id if needed
    if (paddedId.length % 3 !== 0) {
        paddedId = paddedId.padStart(Math.ceil(paddedId.length / 3) * 3, '0');
    }
    // split and compress id
    var compressed = '';
    for (var i = 0; i < paddedId.length; i += 3) {
        compressed += codec.encode(parseInt(paddedId.slice(i, i + 3), 16));
    }
    return (_a = compressed + key) !== null && _a !== void 0 ? _a : '';
};

/**
 * Derives a cache key namespaced to a particular creep
 */
var creepKey = function (creep, key) { return objectIdKey(creep.id, key); };

/**
 * Mutates a cost matrix based on a set of options, and returns the mutated cost matrix.
 */
var mutateCostMatrix = function (cm, room, opts) {
    var _a, _b, _c;
    if (opts.avoidCreeps) {
        (_a = Game.rooms[room]) === null || _a === void 0 ? void 0 : _a.find(FIND_CREEPS).forEach(function (c) { return cm.set(c.pos.x, c.pos.y, 255); });
    }
    if (opts.avoidSourceKeepers) {
        avoidSourceKeepers(room, cm);
    }
    if (opts.avoidObstacleStructures || opts.roadCost) {
        if (opts.avoidObstacleStructures) {
            (_b = Game.rooms[room]) === null || _b === void 0 ? void 0 : _b.find(FIND_MY_CONSTRUCTION_SITES).forEach(function (s) {
                if (OBSTACLE_OBJECT_TYPES.includes(s.structureType)) {
                    cm.set(s.pos.x, s.pos.y, 255);
                }
            });
        }
        (_c = Game.rooms[room]) === null || _c === void 0 ? void 0 : _c.find(FIND_STRUCTURES).forEach(function (s) {
            if (opts.avoidObstacleStructures) {
                if (OBSTACLE_OBJECT_TYPES.includes(s.structureType) ||
                    (s.structureType === STRUCTURE_RAMPART && !s.my && !s.isPublic)) {
                    cm.set(s.pos.x, s.pos.y, 255);
                }
            }
            if (opts.roadCost) {
                if (s instanceof StructureRoad && cm.get(s.pos.x, s.pos.y) === 0) {
                    cm.set(s.pos.x, s.pos.y, opts.roadCost);
                }
            }
        });
    }
    return cm;
};

var memoize = function (indexer, fn, resetAfterTicks) {
    if (resetAfterTicks === void 0) { resetAfterTicks = Infinity; }
    var resultsMap = new Map();
    var lastTick = Game.time;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (Game.time >= lastTick + resetAfterTicks) {
            lastTick = Game.time;
            resultsMap = new Map();
        }
        var key = indexer.apply(void 0, __spreadArray([], __read(args), false));
        if (!resultsMap.has(key)) {
            resultsMap.set(key, fn.apply(void 0, __spreadArray([], __read(args), false)));
        }
        return resultsMap.get(key);
    };
};

/**
 * Uses findRoute to create a base route, then enhances
 * it by adding rooms (up to maxRooms) to improve pathfinding
 */
function findRoute(room1, room2, opts) {
    var e_1, _a;
    var _b, _c, _d, _e;
    var actualOpts = __assign(__assign({}, config.DEFAULT_MOVE_OPTS), opts);
    var memoizedRouteCallback = memoize(function (roomName, fromRoomName) { return roomName + fromRoomName; }, function (roomName, fromRoomName) {
        var _a;
        var result = (_a = actualOpts.routeCallback) === null || _a === void 0 ? void 0 : _a.call(actualOpts, roomName, fromRoomName);
        if (result !== undefined)
            return result;
        if (isHighway(roomName))
            return actualOpts.highwayRoomCost;
        if (isSourceKeeperRoom(roomName))
            return actualOpts.sourceKeeperRoomCost;
        return actualOpts.defaultRoomCost;
    });
    // Generate base route
    var generatedRoute = Game.map.findRoute(room1, room2, {
        routeCallback: memoizedRouteCallback
    });
    if (generatedRoute === ERR_NO_PATH)
        return undefined;
    // map from "take this exit to this room" to "in this room, take this exit"
    var route = [];
    for (var i = 0; i < generatedRoute.length + 1; i++) {
        route.push({
            room: (_c = (_b = generatedRoute[i - 1]) === null || _b === void 0 ? void 0 : _b.room) !== null && _c !== void 0 ? _c : room1,
            exit: (_d = generatedRoute[i]) === null || _d === void 0 ? void 0 : _d.exit
        });
    }
    // Enhance route
    var rooms = new Set(route.map(function (_a) {
        var room = _a.room;
        return room;
    }));
    var maxRooms = actualOpts.maxRooms;
    for (var i = 0; i < route.length - 1; i++) {
        // check if we've met our limit
        if (rooms.size >= maxRooms)
            break;
        if (!route[i].exit)
            break;
        // check for areas PathFinder might be able to optimize
        // Route turns a corner: add the room inside the corner
        if (route[i].exit !== route[i + 1].exit) {
            var detour = Game.map.describeExits(route[i].room)[route[i + 1].exit];
            if (detour &&
                Game.map.findExit(detour, route[i + 1].room) > 0 &&
                memoizedRouteCallback(detour, route[i].room) !== Infinity) {
                // detour room is connected
                rooms.add(detour);
            }
        }
        // Route is straight, but exit tiles are all to one side of the border
        // Might be faster to detour through neighboring rooms
        if ((route[i].exit === route[i + 1].exit || !route[i + 1].exit) &&
            (!((_e = route[i + 2]) === null || _e === void 0 ? void 0 : _e.exit) || route[i].exit === route[i + 2].exit)) {
            if (rooms.size >= actualOpts.maxRooms - 1)
                continue; // detour will take two rooms, ignore
            // Straight line for the next three rooms (or until route ends)
            // Check if there are exit tiles on both halves of the border
            var regions = exitTileRegions(route[i].room, route[i].exit);
            if (regions.every(function (r) { return r; })) {
                continue;
            }
            // one half does not have an exit tile.
            var detour = undefined;
            if (!regions[0] && (route[i].exit === FIND_EXIT_TOP || route[i].exit === FIND_EXIT_BOTTOM)) {
                detour = FIND_EXIT_LEFT;
            }
            else if (!regions[1] && (route[i].exit === FIND_EXIT_TOP || route[i].exit === FIND_EXIT_BOTTOM)) {
                detour = FIND_EXIT_RIGHT;
            }
            else if (!regions[0] && (route[i].exit === FIND_EXIT_LEFT || route[i].exit === FIND_EXIT_RIGHT)) {
                detour = FIND_EXIT_TOP;
            }
            else if (!regions[1] && (route[i].exit === FIND_EXIT_LEFT || route[i].exit === FIND_EXIT_RIGHT)) {
                detour = FIND_EXIT_BOTTOM;
            }
            if (!detour)
                throw new Error('Invalid exit tile state: ' + route[i].exit + JSON.stringify(regions));
            // check detour rooms for continuity
            var detour1 = Game.map.describeExits(route[i].room)[detour];
            var detour2 = Game.map.describeExits(route[i + 1].room)[detour];
            if (detour1 &&
                detour2 &&
                Game.map.findExit(detour1, detour2) > 0 &&
                memoizedRouteCallback(detour1, route[i].room) !== Infinity &&
                memoizedRouteCallback(detour2, route[i + 1].room) !== Infinity) {
                // detour rooms are connected
                rooms.add(detour1);
                rooms.add(detour2);
            }
        }
    }
    // now floodfill adjoining rooms, up to maxRooms
    var frontier = __spreadArray([], __read(rooms), false);
    while (rooms.size < maxRooms) {
        var room = frontier.shift();
        if (!room)
            break;
        var exits = Game.map.describeExits(room);
        if (!exits)
            continue;
        try {
            for (var _f = (e_1 = void 0, __values(Object.values(exits))), _g = _f.next(); !_g.done; _g = _f.next()) {
                var adjacentRoom = _g.value;
                if (rooms.has(adjacentRoom))
                    continue;
                if (memoizedRouteCallback(adjacentRoom, room) !== Infinity) {
                    rooms.add(adjacentRoom);
                    frontier.push(adjacentRoom);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return __spreadArray([], __read(rooms), false);
}
function exitTileRegions(room, exit) {
    var terrain = Game.map.getRoomTerrain(room);
    var region1 = false;
    for (var i = 0; i < 25; i++) {
        var _a = exitTileByIndex(exit, i), x = _a.x, y = _a.y;
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
            region1 = true;
            break;
        }
    }
    var region2 = false;
    for (var i = 25; i < 49; i++) {
        var _b = exitTileByIndex(exit, i), x = _b.x, y = _b.y;
        if (terrain.get(x, y) !== TERRAIN_MASK_WALL) {
            region2 = true;
            break;
        }
    }
    return [region1, region2];
}
function exitTileByIndex(exit, index) {
    if (exit === FIND_EXIT_TOP)
        return { x: index, y: 0 };
    if (exit === FIND_EXIT_BOTTOM)
        return { x: index, y: 49 };
    if (exit === FIND_EXIT_LEFT)
        return { x: 0, y: index };
    return { x: 49, y: index }; // FIND_EXIT_RIGHT
}

/**
 * Generates a path with PathFinder.
 */
function generatePath(origin, targets, opts) {
    var e_1, _a;
    var _b, _c, _d;
    // Generate full opts object
    var actualOpts = __assign(__assign({}, config.DEFAULT_MOVE_OPTS), opts);
    // check if we need a route to limit search space
    Object.values(Game.map.describeExits(origin.roomName));
    var rooms = undefined;
    if (!targets.some(function (_a) {
        var pos = _a.pos;
        return pos.roomName === origin.roomName;
    })) {
        // if there are multiple rooms in `targets`, pick the cheapest route
        var targetRooms = targets.reduce(function (rooms, _a) {
            var pos = _a.pos;
            return (rooms.includes(pos.roomName) ? rooms : __spreadArray([pos.roomName], __read(rooms), false));
        }, []);
        try {
            for (var targetRooms_1 = __values(targetRooms), targetRooms_1_1 = targetRooms_1.next(); !targetRooms_1_1.done; targetRooms_1_1 = targetRooms_1.next()) {
                var room = targetRooms_1_1.value;
                var route = findRoute(origin.roomName, room, actualOpts);
                if (route && (!rooms || route.length < rooms.length)) {
                    rooms = route;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (targetRooms_1_1 && !targetRooms_1_1.done && (_a = targetRooms_1.return)) _a.call(targetRooms_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // console.log('generated path from', origin.roomName, 'to', targetRooms, ':', rooms);
    }
    // generate path
    var result = PathFinder.search(origin, targets, __assign(__assign({}, actualOpts), { maxOps: Math.min((_b = actualOpts.maxOps) !== null && _b !== void 0 ? _b : 100000, ((_c = actualOpts.maxOpsPerRoom) !== null && _c !== void 0 ? _c : 2000) * ((_d = rooms === null || rooms === void 0 ? void 0 : rooms.length) !== null && _d !== void 0 ? _d : 1)), roomCallback: function (room) {
            var _a;
            if (rooms && !rooms.includes(room))
                return false; // outside route search space
            var cm = (_a = actualOpts.roomCallback) === null || _a === void 0 ? void 0 : _a.call(actualOpts, room);
            if (cm === false)
                return cm;
            var cloned = cm instanceof PathFinder.CostMatrix ? cm.clone() : new PathFinder.CostMatrix();
            return mutateCostMatrix(cloned, room, actualOpts);
        } }));
    if (!result.path.length || result.incomplete)
        return undefined;
    return result.path;
}

var generateIndexes = function () { return ({
    creep: new Map(),
    priority: new Map(),
    targets: new Map(),
    pullers: new Set(),
    pullees: new Set(),
    prefersToStay: new Set(),
    blockedSquares: new Set()
}); };
var _indexes = new Map();
var tick = 0;
/**
 * Gets the current tick's move intents, recreating the indexes
 * if the data is stale from the previous tick
 *
 * Returns:
 *  - creep: Index of intents by creep
 *  - priority: Index of intents by priority, then by number of viable target squares, then by creep
 *  - targets: Index of intents by position, then by creep
 *  - pullers: Index of puller creeps
 */
function getMoveIntents(room) {
    var _a;
    if (Game.time !== tick) {
        tick = Game.time;
        _indexes = new Map();
    }
    _indexes.set(room, (_a = _indexes.get(room)) !== null && _a !== void 0 ? _a : generateIndexes());
    return _indexes.get(room);
}
/**
 * Lists the rooms with move intents to handle
 */
function getMoveIntentRooms() {
    return __spreadArray([], __read(_indexes.keys()), false);
}
/**
 * Register a pull intent (used to avoid breaking trains of
 * pulled creeps)
 */
function registerPull(puller, pullee) {
    var intents = getMoveIntents(puller.pos.roomName);
    intents.pullers.add(puller);
    intents.pullees.add(pullee);
}
/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
function registerMove(intent, pulled) {
    var e_1, _a;
    var _b, _c, _d, _e;
    if (pulled === void 0) { pulled = false; }
    if ('fatigue' in intent.creep && intent.creep.fatigue && !pulled) {
        intent.targets = [intent.creep.pos];
    }
    (_b = intent.targetCount) !== null && _b !== void 0 ? _b : (intent.targetCount = intent.targets.length);
    var indexes = getMoveIntents(intent.creep.pos.roomName);
    // cancel old intent, if needed
    cancelMove(indexes.creep.get(intent.creep));
    // register new one
    indexes.creep.set(intent.creep, intent);
    var byPriority = (_c = indexes.priority.get(intent.priority)) !== null && _c !== void 0 ? _c : new Map();
    indexes.priority.set(intent.priority, byPriority);
    var byTargetCount = (_d = byPriority.get(intent.targets.length)) !== null && _d !== void 0 ? _d : new Map();
    byPriority.set(intent.targets.length, byTargetCount);
    byTargetCount.set(intent.creep, intent);
    try {
        for (var _f = __values(intent.targets), _g = _f.next(); !_g.done; _g = _f.next()) {
            var target = _g.value;
            var key = packPos(target);
            var targets = (_e = indexes.targets.get(key)) !== null && _e !== void 0 ? _e : new Map();
            indexes.targets.set(key, targets);
            targets.set(intent.creep, intent);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (intent.targets.length && intent.targets[0].isEqualTo(intent.creep.pos)) {
        indexes.prefersToStay.add(packPos(intent.creep.pos));
    }
}
/**
 * Register a move intent (adds to a couple indexes for quick lookups)
 */
function cancelMove(intent) {
    var e_2, _a;
    var _b, _c, _d, _e;
    if (!intent)
        return;
    (_b = intent.targetCount) !== null && _b !== void 0 ? _b : (intent.targetCount = intent.targets.length);
    var indexes = getMoveIntents(intent.creep.pos.roomName);
    indexes.creep.delete(intent.creep);
    (_d = (_c = indexes.priority.get(intent.priority)) === null || _c === void 0 ? void 0 : _c.get(intent.targets.length)) === null || _d === void 0 ? void 0 : _d.delete(intent.creep);
    try {
        for (var _f = __values(intent.targets), _g = _f.next(); !_g.done; _g = _f.next()) {
            var target = _g.value;
            var key = packPos(target);
            (_e = indexes.targets.get(key)) === null || _e === void 0 ? void 0 : _e.delete(intent.creep);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
/**
 * Updates an intent's indexes when its target count changes
 */
function updateIntentTargetCount(intent, oldCount, newCount) {
    var _a, _b, _c;
    var indexes = getMoveIntents(intent.creep.pos.roomName);
    var byPriority = (_a = indexes.priority.get(intent.priority)) !== null && _a !== void 0 ? _a : new Map();
    (_b = byPriority.get(oldCount)) === null || _b === void 0 ? void 0 : _b.delete(intent.creep);
    indexes.priority.set(intent.priority, byPriority);
    var byTargetCount = (_c = byPriority.get(newCount)) !== null && _c !== void 0 ? _c : new Map();
    byPriority.set(newCount, byTargetCount);
    byTargetCount.set(intent.creep, intent);
}
/**
 * Blocks a specific square, to vacate a space for e.g. creating a construction site or spawning
 */
function blockSquare(pos) {
    getMoveIntents(pos.roomName).blockedSquares.add(packPos(pos));
}

var measure = function (callback) {
    var start = Game.cpu.getUsed();
    callback();
    return Math.max(0, Game.cpu.getUsed() - start);
};

var keys$3 = {
    RECONCILE_TRAFFIC_RAN: '_crr'
};
/**
 * Checks if the reconcile function has run recently. If not, creeps will
 * fall back to unmanaged movement to preserve some functionality.
 */
function reconciledRecently() {
    var lastReconciled = MemoryCache.with(NumberSerializer).get(keys$3.RECONCILE_TRAFFIC_RAN);
    return Boolean(lastReconciled && Game.time - 2 <= lastReconciled);
}
var efficiency = [];
/**
 * Include this function in your main loop after all creep movement to enable traffic
 * management.
 *
 * Warning: if your bucket overflows and this doesn't run, your creeps will not move.
 * Creeps will fall back to unmanaged movement if the reconcileTraffic is not executed
 * after two ticks.
 */
function reconcileTraffic(opts) {
    var e_1, _a;
    try {
        for (var _b = __values(getMoveIntentRooms()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var room = _c.value;
            if (!Game.rooms[room])
                continue;
            reconcileTrafficByRoom(room, opts);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // log that traffic management is active
    MemoryCache.with(NumberSerializer).set(keys$3.RECONCILE_TRAFFIC_RAN, Game.time);
}
function reconcileTrafficByRoom(room, opts) {
    var e_2, _a, e_3, _b, e_4, _c, e_5, _d, e_6, _e;
    var _f, _g, _h, _j, _k, _l, _m, _o;
    var start = Game.cpu.getUsed();
    var moveTime = 0;
    var moveIntents = getMoveIntents(room);
    var used = moveIntents.blockedSquares;
    // visualize
    if (opts === null || opts === void 0 ? void 0 : opts.visualize) {
        var _loop_1 = function (creep, targets, priority) {
            targets.forEach(function (t) {
                if (t.isEqualTo(creep.pos)) {
                    Game.rooms[creep.pos.roomName].visual.circle(creep.pos, {
                        radius: 0.5,
                        stroke: 'orange',
                        fill: 'transparent'
                    });
                }
                else {
                    Game.rooms[creep.pos.roomName].visual.line(creep.pos, t, { color: 'orange' });
                }
            });
        };
        try {
            for (var _p = __values(moveIntents.creep.values()), _q = _p.next(); !_q.done; _q = _p.next()) {
                var _r = _q.value, creep = _r.creep, targets = _r.targets, priority = _r.priority;
                _loop_1(creep, targets, priority);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_q && !_q.done && (_a = _p.return)) _a.call(_p);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    try {
        // Set move intents for shove targets
        for (var _s = __values(Game.rooms[room].find(FIND_MY_CREEPS)), _t = _s.next(); !_t.done; _t = _s.next()) {
            var creep = _t.value;
            if (moveIntents.creep.has(creep) || moveIntents.pullees.has(creep) || moveIntents.pullers.has(creep))
                continue;
            registerMove({
                creep: creep,
                priority: 0,
                targets: __spreadArray([creep.pos], __read(adjacentWalkablePositions(creep.pos, true)), false)
            });
            if (opts === null || opts === void 0 ? void 0 : opts.visualize)
                Game.rooms[creep.pos.roomName].visual.circle(creep.pos, { radius: 1, stroke: 'red', fill: 'transparent ' });
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_t && !_t.done && (_b = _s.return)) _b.call(_s);
        }
        finally { if (e_3) throw e_3.error; }
    }
    try {
        // remove pullers as move targets
        for (var _u = __values(moveIntents.pullers), _v = _u.next(); !_v.done; _v = _u.next()) {
            var puller = _v.value;
            var posKey = packPos(puller.pos);
            used.add(posKey);
            try {
                for (var _w = (e_5 = void 0, __values((_g = (_f = moveIntents.targets.get(posKey)) === null || _f === void 0 ? void 0 : _f.values()) !== null && _g !== void 0 ? _g : [])), _x = _w.next(); !_x.done; _x = _w.next()) {
                    var intent = _x.value;
                    if (intent.creep === puller)
                        continue;
                    (_h = intent.targetCount) !== null && _h !== void 0 ? _h : (intent.targetCount = intent.targets.length);
                    var oldCount = intent.targetCount;
                    intent.targetCount -= 1;
                    // update priority/count index
                    updateIntentTargetCount(intent, oldCount, intent.targetCount);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_x && !_x.done && (_d = _w.return)) _d.call(_w);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_v && !_v.done && (_c = _u.return)) _c.call(_u);
        }
        finally { if (e_4) throw e_4.error; }
    }
    // logCpuStart();
    var priorities = __spreadArray([], __read(moveIntents.priority.entries()), false).sort(function (a, b) { return b[0] - a[0]; });
    try {
        // logCpu('sorting priorities');
        for (var priorities_1 = __values(priorities), priorities_1_1 = priorities_1.next(); !priorities_1_1.done; priorities_1_1 = priorities_1.next()) {
            var _y = __read(priorities_1_1.value, 2), _ = _y[0], priority = _y[1];
            while (priority.size) {
                var minPositionCount = Math.min.apply(Math, __spreadArray([], __read(priority.keys()), false));
                var intents = priority.get(minPositionCount);
                if (!intents)
                    break;
                if (!intents.size)
                    priority.delete(minPositionCount);
                // logCpu('getting prioritized intents');
                var intentStack = __spreadArray([], __read(intents.values()), false);
                var _loop_2 = function () {
                    var e_7, _z, e_8, _0;
                    var intent = intentStack.shift();
                    if (!intent)
                        return "break";
                    if (intent.resolved) {
                        // a swapping creep will sometimes end up on the stack twice.
                        // if its move has already been resolved, ignore it
                        intents.delete(intent.creep);
                        return "continue";
                    }
                    // for (const intent of [...intents.values()]) {
                    if (opts === null || opts === void 0 ? void 0 : opts.visualize) {
                        intent.targets.forEach(function (t) {
                            if (t.isEqualTo(intent.creep.pos)) {
                                Game.rooms[intent.creep.pos.roomName].visual.circle(intent.creep.pos, {
                                    radius: 0.5,
                                    stroke: 'yellow',
                                    strokeWidth: 0.2,
                                    fill: 'transparent',
                                    opacity: 0.2
                                });
                            }
                            else {
                                Game.rooms[intent.creep.pos.roomName].visual.line(intent.creep.pos, t, { color: 'yellow', width: 0.2 });
                            }
                        });
                    }
                    // get the first position with no conflicts, or else the position with
                    // fewest conflicts
                    var targetPos = undefined;
                    try {
                        for (var _1 = (e_7 = void 0, __values(intent.targets)), _2 = _1.next(); !_2.done; _2 = _1.next()) {
                            var target = _2.value;
                            var p = packPos(target);
                            if (used.has(p) && !(intent.creep.pos.isEqualTo(target) && moveIntents.pullers.has(intent.creep)))
                                continue; // a creep is already moving here
                            if (intent.creep.pos.isEqualTo(target) || !moveIntents.prefersToStay.has(p)) {
                                // best case - no other creep prefers to stay here
                                targetPos = target;
                                break;
                            }
                            targetPos !== null && targetPos !== void 0 ? targetPos : (targetPos = target);
                        }
                    }
                    catch (e_7_1) { e_7 = { error: e_7_1 }; }
                    finally {
                        try {
                            if (_2 && !_2.done && (_z = _1.return)) _z.call(_1);
                        }
                        finally { if (e_7) throw e_7.error; }
                    }
                    // handling intent, remove from queue
                    intents.delete(intent.creep);
                    // logCpu('handling intent');
                    if (!targetPos) {
                        // no movement options
                        if (opts === null || opts === void 0 ? void 0 : opts.visualize) {
                            Game.rooms[intent.creep.pos.roomName].visual
                                .line(intent.creep.pos.x - 0.5, intent.creep.pos.y - 0.5, intent.creep.pos.x + 0.5, intent.creep.pos.y + 0.5, { color: 'red' })
                                .line(intent.creep.pos.x - 0.5, intent.creep.pos.y + 0.5, intent.creep.pos.x + 0.5, intent.creep.pos.y - 0.5, { color: 'red' });
                        }
                        return "continue";
                    }
                    // resolve intent
                    moveTime += measure(function () { return intent.creep.move(intent.creep.pos.getDirectionTo(targetPos)); });
                    intent.resolved = true;
                    // logCpu('resolving intent');
                    if (opts === null || opts === void 0 ? void 0 : opts.visualize)
                        Game.rooms[intent.creep.pos.roomName].visual.line(intent.creep.pos, targetPos, {
                            color: 'green',
                            width: 0.5
                        });
                    // remove pos from other intents targeting the same position
                    var posKey = packPos(targetPos);
                    used.add(posKey);
                    try {
                        for (var _3 = (e_8 = void 0, __values((_k = (_j = moveIntents.targets.get(posKey)) === null || _j === void 0 ? void 0 : _j.values()) !== null && _k !== void 0 ? _k : [])), _4 = _3.next(); !_4.done; _4 = _3.next()) {
                            var sameTargetIntent = _4.value;
                            if (sameTargetIntent.resolved)
                                continue;
                            (_l = sameTargetIntent.targetCount) !== null && _l !== void 0 ? _l : (sameTargetIntent.targetCount = sameTargetIntent.targets.length);
                            var oldCount = sameTargetIntent.targetCount;
                            sameTargetIntent.targetCount -= 1;
                            // update priority/count index
                            updateIntentTargetCount(sameTargetIntent, oldCount, sameTargetIntent.targetCount);
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (_4 && !_4.done && (_0 = _3.return)) _0.call(_3);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                    // logCpu('removing move position from other intents');
                    // if a creep in the destination position is moving to this position, override
                    // any other intents moving to this position
                    if (!targetPos.isEqualTo(intent.creep.pos) && !moveIntents.pullers.has(intent.creep)) {
                        var swapPos = packPos(intent.creep.pos);
                        var movingHereIntents = __spreadArray([], __read(((_o = (_m = moveIntents.targets.get(swapPos)) === null || _m === void 0 ? void 0 : _m.values()) !== null && _o !== void 0 ? _o : [])), false).filter(function (i) { return i !== intent && i.targets.length < 2; });
                        var swapCreep = movingHereIntents.find(function (i) { return !i.resolved && (targetPos === null || targetPos === void 0 ? void 0 : targetPos.isEqualTo(i.creep.pos)) && !moveIntents.pullers.has(i.creep); });
                        if (swapCreep) {
                            if (opts === null || opts === void 0 ? void 0 : opts.visualize)
                                Game.rooms[swapCreep.creep.pos.roomName].visual.circle(swapCreep.creep.pos, {
                                    radius: 0.2,
                                    fill: 'green'
                                });
                            // override previously resolved intents
                            movingHereIntents
                                .filter(function (i) { return i.resolved; })
                                .forEach(function (i) {
                                if (opts === null || opts === void 0 ? void 0 : opts.visualize)
                                    Game.rooms[i.creep.pos.roomName].visual.circle(i.creep.pos, { radius: 0.2, fill: 'red' });
                            });
                            used.delete(swapPos);
                            // handle swapCreep next
                            intentStack.unshift(swapCreep);
                        }
                    }
                };
                while (intentStack.length) {
                    var state_1 = _loop_2();
                    if (state_1 === "break")
                        break;
                }
            }
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (priorities_1_1 && !priorities_1_1.done && (_e = priorities_1.return)) _e.call(priorities_1);
        }
        finally { if (e_6) throw e_6.error; }
    }
    var totalTime = Math.max(0, Game.cpu.getUsed() - start);
    efficiency.push(moveTime / totalTime);
    if (efficiency.length > 1500)
        efficiency = efficiency.slice(-1500);
    // console.log(
    //   `reconcileTraffic: total(${totalTime.toFixed(3)} cpu), efficiency(${(
    //     (100 * efficiency.reduce((a, b) => a + b)) /
    //     efficiency.length
    //   ).toFixed(2)}%)`
    // );
}

/**
 * Registers a move intent with the Traffic Manager, if reconcileTraffic has
 * run recently, or else falls back to a regular move
 */
function move(creep, targets, priority) {
    if (priority === void 0) { priority = 1; }
    if (!creep.pos)
        return ERR_INVALID_ARGS;
    if (reconciledRecently()) {
        // Traffic manager is running
        registerMove({
            creep: creep,
            targets: targets,
            priority: priority
        });
        return OK;
    }
    else {
        // fall back to regular movement
        if (targets[0].isEqualTo(creep.pos))
            return OK;
        return creep.move(creep.pos.getDirectionTo(targets[0]));
    }
}

var cachedPathKey = function (key) { return "_poi_".concat(key); };
var keys$2 = {
    MOVE_BY_PATH_INDEX: '_cpi'
};
/**
 * Generate a path from `origin` to `destination`, based on the passed `opts`. Caches
 * the path in the configured cache (or MemoryCache by default) with the provided key.
 * Returns the generated path (or the cached version, if it exists).
 */
function cachePath(key, origin, targets, opts) {
    var e_1, _a;
    var _b;
    var actualOpts = __assign(__assign({}, config.DEFAULT_MOVE_OPTS), opts);
    var cache = (_b = actualOpts.cache) !== null && _b !== void 0 ? _b : MemoryCache;
    var normalizedTargets = normalizeTargets(targets, opts === null || opts === void 0 ? void 0 : opts.keepTargetInRoom);
    if (opts === null || opts === void 0 ? void 0 : opts.visualizePathStyle) {
        var style = __assign(__assign({}, config.DEFAULT_VISUALIZE_OPTS), opts.visualizePathStyle);
        try {
            for (var normalizedTargets_1 = __values(normalizedTargets), normalizedTargets_1_1 = normalizedTargets_1.next(); !normalizedTargets_1_1.done; normalizedTargets_1_1 = normalizedTargets_1.next()) {
                var t = normalizedTargets_1_1.value;
                new RoomVisual(t.pos.roomName).rect(t.pos.x - t.range - 0.5, t.pos.y - t.range - 0.5, t.range * 2 + 1, t.range * 2 + 1, style);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (normalizedTargets_1_1 && !normalizedTargets_1_1.done && (_a = normalizedTargets_1.return)) _a.call(normalizedTargets_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    // check if cached POI already exists
    var cached = cache.with(PositionListSerializer).get(cachedPathKey(key));
    if (cached) {
        return cached;
    }
    // create paths
    var path = generatePath(origin, normalizedTargets, __assign({}, actualOpts));
    if (path) {
        var expiration = actualOpts.reusePath ? Game.time + actualOpts.reusePath + 1 : undefined;
        cache.with(PositionListSerializer).set(cachedPathKey(key), path, expiration);
    }
    return path;
}
/**
 * Gets a cached path for a given key
 */
function getCachedPath(key, opts) {
    var _a;
    var cache = (_a = opts === null || opts === void 0 ? void 0 : opts.cache) !== null && _a !== void 0 ? _a : MemoryCache;
    return cache.with(PositionListSerializer).get(cachedPathKey(key));
}
/**
 * Clears a cached path for a given key
 */
function resetCachedPath(key, opts) {
    var _a;
    var cache = (_a = opts === null || opts === void 0 ? void 0 : opts.cache) !== null && _a !== void 0 ? _a : MemoryCache;
    cache.delete(cachedPathKey(key));
}
/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * Returns ERR_NO_PATH if the cached path doesn't exist, and ERR_NOT_FOUND if
 * the creep is not on the path. In most cases, you'll want to use `moveByPath`
 * instead; this is used internally by `moveTo`.
 */
function followPath(creep, key, opts) {
    var _a, _b, _c, _d;
    var cache = (_a = opts === null || opts === void 0 ? void 0 : opts.cache) !== null && _a !== void 0 ? _a : MemoryCache;
    var path = cache.with(PositionListSerializer).get(cachedPathKey(key));
    // unspawned power creeps have undefined pos
    if (!creep.pos)
        return ERR_INVALID_ARGS;
    if (!path)
        return ERR_NO_PATH;
    // check if move is done
    if (((opts === null || opts === void 0 ? void 0 : opts.reverse) && creep.pos.isEqualTo(path[0])) ||
        (!(opts === null || opts === void 0 ? void 0 : opts.reverse) && creep.pos.isEqualTo(path[path.length - 1]))) {
        return OK;
    }
    // check if creep's position is up to date
    var currentIndex = HeapCache.get(creepKey(creep, keys$2.MOVE_BY_PATH_INDEX));
    if (currentIndex !== undefined) {
        var nextIndex_1 = Math.max(0, Math.min(path.length - 1, (opts === null || opts === void 0 ? void 0 : opts.reverse) ? currentIndex - 1 : currentIndex + 1));
        if ((_b = path[nextIndex_1]) === null || _b === void 0 ? void 0 : _b.isEqualTo(creep.pos)) {
            currentIndex = nextIndex_1;
        }
        else if (!((_c = path[currentIndex]) === null || _c === void 0 ? void 0 : _c.isEqualTo(creep.pos))) {
            currentIndex = undefined; // not at the next position, not at the cached position - reorient
        }
    }
    if (currentIndex === undefined) {
        // don't know where creep is; check if it's on the path
        var index = path.findIndex(function (p) { return p.isEqualTo(creep.pos); });
        if (index !== -1) {
            currentIndex = index;
            HeapCache.set(creepKey(creep, keys$2.MOVE_BY_PATH_INDEX), currentIndex);
        }
    }
    // otherwise, check if it's adjacent to one end of the path
    if (currentIndex === undefined && !(opts === null || opts === void 0 ? void 0 : opts.reverse) && path[0].inRangeTo(creep, 1)) {
        currentIndex = -1;
    }
    if (currentIndex === undefined && (opts === null || opts === void 0 ? void 0 : opts.reverse) && path[path.length - 1].inRangeTo(creep, 1)) {
        currentIndex = path.length;
    }
    if (currentIndex === undefined) {
        // Unable to find our location relative to the path
        return ERR_NOT_FOUND;
    }
    // creep is on the path and index is valid
    var nextIndex = Math.max(0, Math.min(path.length - 1, (opts === null || opts === void 0 ? void 0 : opts.reverse) ? currentIndex - 1 : currentIndex + 1));
    // visualize path
    if (opts === null || opts === void 0 ? void 0 : opts.visualizePathStyle) {
        var style = __assign(__assign({}, config.DEFAULT_VISUALIZE_OPTS), opts.visualizePathStyle);
        var pathSegment = (opts === null || opts === void 0 ? void 0 : opts.reverse) ? path.slice(0, currentIndex) : path.slice(nextIndex);
        // TODO - Should power creep's room prop be optional?
        (_d = creep.room) === null || _d === void 0 ? void 0 : _d.visual.poly(pathSegment.filter(function (pos) { var _a; return pos.roomName === ((_a = creep.room) === null || _a === void 0 ? void 0 : _a.name); }), style);
    }
    var result = move(creep, [path[nextIndex]], opts === null || opts === void 0 ? void 0 : opts.priority);
    return result;
}

var JsonSerializer = {
    key: 'js',
    serialize: function (target) {
        if (target === undefined)
            return undefined;
        return JSON.stringify(target);
    },
    deserialize: function (target) {
        if (target === undefined)
            return undefined;
        return JSON.parse(target);
    }
};

var keys$1 = {
    LAST_POSITION: '_csp',
    LAST_POSITION_TIME: '_cst'
};
/**
 * Tracks a creep's position and returns true if it has no fatigue
 * but has not moved in `stuckLimit` ticks
 */
var creepIsStuck = function (creep, stuckLimit) {
    // unspawned power creeps have undefined pos
    if (!creep.pos)
        return false;
    if ('fatigue' in creep && creep.fatigue > 0)
        return false;
    // get last position
    var lastPos = HeapCache.get(creepKey(creep, keys$1.LAST_POSITION));
    var lastTime = HeapCache.get(creepKey(creep, keys$1.LAST_POSITION_TIME));
    // go ahead and update pos in the cache
    HeapCache.set(creepKey(creep, keys$1.LAST_POSITION), creep.pos);
    if (!lastPos || !lastTime || !creep.pos.isEqualTo(lastPos)) {
        // start counting
        HeapCache.set(creepKey(creep, keys$1.LAST_POSITION_TIME), Game.time);
        return false;
    }
    // true if creep has been here (with no fatigue) for longer than stuckLimit
    return lastTime + stuckLimit < Game.time;
};

var keys = {
    CACHED_PATH: '_cp',
    CACHED_PATH_EXPIRES: '_ce',
    CACHED_PATH_TARGETS: '_ct',
    CACHED_PATH_OPTS: '_co'
};
var optCacheFields = [
    'avoidCreeps',
    'avoidObstacleStructures',
    'flee',
    'plainCost',
    'swampCost',
    'roadCost'
];
/**
 * Clears all data for a cached path (useful to force a repath)
 */
function clearCachedPath(creep, cache) {
    if (cache === void 0) { cache = CachingStrategies.HeapCache; }
    resetCachedPath(creepKey(creep, keys.CACHED_PATH), { cache: cache });
    cache.delete(creepKey(creep, keys.CACHED_PATH_TARGETS));
    cache.delete(creepKey(creep, keys.CACHED_PATH_OPTS));
}
/**
 * Replacement for the builtin moveTo, but passes through options to PathFinder. Supports
 * multiple targets, flee, etc. See `MoveOpts`.
 *
 * If fallbackOpts is specified, the options will override `opts` *only* if `repathIfStuck`
 * triggers a repath. This lets you ignore creeps until a creep gets stuck, then repath around
 * them, for example.
 */
var moveTo = function (creep, targets, opts, fallbackOpts) {
    var e_1, _a;
    var _b, _c;
    if (fallbackOpts === void 0) { fallbackOpts = { avoidCreeps: true }; }
    // unspawned power creeps have undefined pos
    if (!creep.pos)
        return ERR_INVALID_ARGS;
    // map defaults onto opts
    var actualOpts = __assign(__assign({}, config.DEFAULT_MOVE_OPTS), opts);
    // select cache for path
    var cache = (_b = opts === null || opts === void 0 ? void 0 : opts.cache) !== null && _b !== void 0 ? _b : CachingStrategies.HeapCache;
    // convert target from whatever format to MoveTarget[]
    var normalizedTargets = normalizeTargets(targets, actualOpts.keepTargetInRoom);
    // if relevant opts have changed, clear cached path
    var cachedOpts = cache.with(JsonSerializer).get(creepKey(creep, keys.CACHED_PATH_OPTS));
    if (!cachedOpts || optCacheFields.some(function (f) { return actualOpts[f] !== cachedOpts[f]; })) {
        clearCachedPath(creep, cache);
    }
    var needToFlee = false;
    var cachedTargets = cache.with(MoveTargetListSerializer).get(creepKey(creep, keys.CACHED_PATH_TARGETS));
    var _loop_1 = function (pos, range) {
        // check if movement is complete
        if (!needToFlee && pos.inRangeTo(creep.pos, range) && creep.pos.roomName === pos.roomName) {
            if (!(opts === null || opts === void 0 ? void 0 : opts.flee)) {
                // no need to move, path complete
                clearCachedPath(creep, cache);
                // register move intent to stay here or in an adjacent viable position
                move(creep, __spreadArray([
                    creep.pos
                ], __read(adjacentWalkablePositions(creep.pos, true).filter(function (p) {
                    return normalizedTargets.some(function (t) { return t.pos.inRangeTo(p, t.range); });
                })), false), actualOpts.priority);
                return { value: OK };
            }
            else {
                needToFlee = true; // need to move, still in range of flee targets
            }
        }
        // check if cached targets are the same
        if (cachedTargets && !cachedTargets.some(function (t) { return t && pos.isEqualTo(t.pos) && range === t.range; })) {
            // cached path had different targets
            clearCachedPath(creep, cache);
            cachedTargets = undefined;
        }
    };
    try {
        for (var normalizedTargets_1 = __values(normalizedTargets), normalizedTargets_1_1 = normalizedTargets_1.next(); !normalizedTargets_1_1.done; normalizedTargets_1_1 = normalizedTargets_1.next()) {
            var _d = normalizedTargets_1_1.value, pos = _d.pos, range = _d.range;
            var state_1 = _loop_1(pos, range);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (normalizedTargets_1_1 && !normalizedTargets_1_1.done && (_a = normalizedTargets_1.return)) _a.call(normalizedTargets_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    // cache opts
    var expiration = actualOpts.reusePath ? Game.time + actualOpts.reusePath + 1 : undefined;
    cache.with(MoveTargetListSerializer).set(creepKey(creep, keys.CACHED_PATH_TARGETS), normalizedTargets, expiration);
    cache.with(JsonSerializer).set(creepKey(creep, keys.CACHED_PATH_OPTS), optCacheFields.reduce(function (sum, f) {
        sum[f] = actualOpts[f];
        return sum;
    }, {}), expiration);
    if (actualOpts.repathIfStuck &&
        getCachedPath(creepKey(creep, keys.CACHED_PATH), { cache: cache }) &&
        creepIsStuck(creep, actualOpts.repathIfStuck)) {
        resetCachedPath(creepKey(creep, keys.CACHED_PATH), { cache: cache });
        actualOpts = __assign(__assign({}, actualOpts), fallbackOpts);
        if (creep.name.startsWith('TestStuck'))
            ;
    }
    // generate cached path, if needed
    var path = cachePath(creepKey(creep, keys.CACHED_PATH), creep.pos, normalizedTargets, __assign(__assign({}, actualOpts), { cache: cache }));
    if (!path)
        return ERR_NO_PATH;
    // move to any viable target square, if path is nearly done
    if (path && ((_c = path[path.length - 2]) === null || _c === void 0 ? void 0 : _c.isEqualTo(creep.pos))) {
        // Nearly at end of path
        move(creep, adjacentWalkablePositions(creep.pos, true).filter(function (p) { return normalizedTargets.some(function (t) { return t.pos.inRangeTo(p, t.range); }); }), actualOpts.priority);
        return OK;
    }
    // move by path
    var result = followPath(creep, creepKey(creep, keys.CACHED_PATH), __assign(__assign({}, actualOpts), { reverse: false, cache: cache }));
    if (result === ERR_NOT_FOUND) {
        // creep has fallen off path: repath and try again
        clearCachedPath(creep, cache);
        cachePath(creepKey(creep, keys.CACHED_PATH), creep.pos, normalizedTargets, __assign(__assign({}, actualOpts), { cache: cache }));
        result = followPath(creep, creepKey(creep, keys.CACHED_PATH), __assign(__assign({}, actualOpts), { reverse: false, cache: cache }));
    }
    return result;
};

/**
 * Moves a creep along a cached path. If `opts.reverse`, moves it backwards.
 * If the creep isn't already on the path, it moves to the path first. Returns
 * ERR_NO_PATH if the cached path doesn't exist.
 */
function moveByPath(creep, key, opts) {
    var result = followPath(creep, key, opts);
    if (result === ERR_NOT_FOUND) {
        // need to move to the path
        var path = getCachedPath(key, opts);
        if (!path)
            return ERR_NO_PATH;
        return moveTo(creep, path, opts);
    }
    return result;
}

/**
 * Cause `puller` to pull `pulled`, registering the pull so traffic management
 * can avoid breaking the chain
 */
function follow(pullee, puller) {
    pullee.move(puller);
    puller.pull(pullee);
    registerPull(puller, pullee);
}

function preTick() {
    cleanAllCaches();
    updateIntel();
}

exports.CachingStrategies = CachingStrategies;
exports.CoordListSerializer = CoordListSerializer;
exports.CoordSerializer = CoordSerializer;
exports.MoveTargetListSerializer = MoveTargetListSerializer;
exports.MoveTargetSerializer = MoveTargetSerializer;
exports.NumberSerializer = NumberSerializer;
exports.PositionListSerializer = PositionListSerializer;
exports.PositionSerializer = PositionSerializer;
exports.adjacentWalkablePositions = adjacentWalkablePositions;
exports.blockSquare = blockSquare;
exports.cachePath = cachePath;
exports.calculateAdjacencyMatrix = calculateAdjacencyMatrix;
exports.calculateAdjacentPositions = calculateAdjacentPositions;
exports.calculateNearbyPositions = calculateNearbyPositions;
exports.cleanAllCaches = cleanAllCaches;
exports.clearCachedPath = clearCachedPath;
exports.config = config;
exports.follow = follow;
exports.followPath = followPath;
exports.generatePath = generatePath;
exports.getCachedPath = getCachedPath;
exports.isExit = isExit;
exports.isPositionWalkable = isPositionWalkable;
exports.move = move;
exports.moveByPath = moveByPath;
exports.moveTo = moveTo;
exports.normalizeTargets = normalizeTargets;
exports.preTick = preTick;
exports.reconcileTraffic = reconcileTraffic;
exports.reconciledRecently = reconciledRecently;
exports.resetCachedPath = resetCachedPath;

});

unwrapExports(main$1);
main$1.CachingStrategies;
main$1.CoordListSerializer;
main$1.CoordSerializer;
main$1.MoveTargetListSerializer;
main$1.MoveTargetSerializer;
main$1.NumberSerializer;
main$1.PositionListSerializer;
main$1.PositionSerializer;
var main_9$1 = main$1.adjacentWalkablePositions;
var main_10$1 = main$1.blockSquare;
var main_11 = main$1.cachePath;
main$1.calculateAdjacencyMatrix;
main$1.calculateAdjacentPositions;
main$1.calculateNearbyPositions;
main$1.cleanAllCaches;
main$1.clearCachedPath;
var main_17 = main$1.config;
var main_18 = main$1.follow;
main$1.followPath;
main$1.generatePath;
var main_21 = main$1.getCachedPath;
var main_22 = main$1.isExit;
main$1.isPositionWalkable;
var main_24 = main$1.move;
var main_25 = main$1.moveByPath;
var main_26 = main$1.moveTo;
main$1.normalizeTargets;
var main_28 = main$1.preTick;
var main_29 = main$1.reconcileTraffic;
main$1.reconciledRecently;
main$1.resetCachedPath;

const FEATURES = {
    MINING: true,
    LABS: true,
    WHITELIST: true,
    POWER: true
};
/**
 * Rooms around an Office to control as remote territories
 */
const TERRITORY_RADIUS = Game.shard.name === 'shard2' ? 0 : 3;
/**
 * Number of offices to control
 */
const OFFICE_LIMIT = Game.shard.name === 'shard2' ? 1 : Infinity;
/**
 * Support new rooms until they reach this RCL
 */
const ACQUIRE_MAX_RCL = 4;
/**
 * Barrier level targets by RCL
 */
const BARRIER_LEVEL = {
    1: 3000,
    2: 3000,
    3: 3000,
    4: 100000,
    5: 100000,
    6: 300000,
    7: 1000000,
    8: 3000000
};
const BARRIER_TYPES = [STRUCTURE_WALL, STRUCTURE_RAMPART];
/**
 * Build priorities
 */
({
    [STRUCTURE_CONTAINER]: 5,
    [STRUCTURE_EXTENSION]: 7,
    [STRUCTURE_EXTRACTOR]: 5,
    [STRUCTURE_FACTORY]: 5,
    [STRUCTURE_LAB]: 5,
    [STRUCTURE_LINK]: 5,
    [STRUCTURE_NUKER]: 2,
    [STRUCTURE_OBSERVER]: 5,
    [STRUCTURE_POWER_SPAWN]: 5,
    [STRUCTURE_RAMPART]: 3,
    [STRUCTURE_ROAD]: 4,
    [STRUCTURE_SPAWN]: 7,
    [STRUCTURE_STORAGE]: 6,
    [STRUCTURE_TERMINAL]: 3,
    [STRUCTURE_TOWER]: 5,
    [STRUCTURE_WALL]: 5
});
/**
 * Health amount before dispatching repairers
 */
CARRY_CAPACITY * 10;
const FRANCHISE_RETRY_INTERVAL = 100000;
const FRANCHISE_EVALUATE_PERIOD = 10;
const WHITELIST = ['CrAzYDubC', 'thmsn', 'Joboe'] ;
[STRUCTURE_CONTAINER];
[
    RESOURCE_CATALYST,
    RESOURCE_UTRIUM,
    RESOURCE_KEANIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_HYDROGEN,
    RESOURCE_OXYGEN
];
const MISSION_HISTORY_LIMIT = 1500;
const THREAT_TOLERANCE = {
    remote: {
        0: 0,
        1: 10,
        2: 10,
        3: 20,
        4: 30,
        5: 40,
        6: 60,
        7: 80,
        8: 120
    }
};

function byId(id) {
    var _a;
    return id ? (_a = Game.getObjectById(id)) !== null && _a !== void 0 ? _a : undefined : undefined;
}

/**
 * Generic memoizer. Given a function and a way to derive a key from its parameters, cache the
 * results of the function for each combination of parameters for a given number of ticks.
 *
 * Example:
 * ```
 * export const getRoomPathDistance = memoize(
 *   (room1: string, room2: string) => [room1, room2].sort().join(''),
 *   (room1: string, room2: string) => {
 *     const newRoute = Game.map.findRoute(room1, room2, {
 *       routeCallback: room => (getTerritoryIntent(room) === TerritoryIntent.AVOID ? Infinity : 0)
 *     });
 *     if (newRoute === -2) return undefined;
 *     return newRoute.length;
 *   }
 * );
 * ```
 *
 * Note that the returned value, if not a primitive, is a reference - so if you mutate the
 * returned value elsewhere in your code, that change will be reflected next time you call
 * this function.
 *
 * Example:
 * ```
 * // resets the set automatically every 10 ticks
 * export const creepsThatNeedEnergy = memoize(
 *   (room: string) => room,
 *   (room: string) => new Set<string>(),
 *   10
 * )
 *
 * creepsThatNeedEnergy().add(creep.name);
 *
 * for (const creepName of creepsThatNeedEnergy()) {
 *   // get energy to creep
 * }
 * ```
 *
 * @param indexer Return a unique string as a key for the given combination of `fn`'s parameters
 * @param fn Generates some value to cache
 * @param resetAfterTicks Resets all cached values every `n` ticks
 * @returns The cached return value from `fn`
 */
const memoize = (indexer, fn, resetAfterTicks = Infinity) => {
    let resultsMap = new Map();
    let lastTick = Game.time;
    return (...args) => {
        if (Game.time >= lastTick + resetAfterTicks) {
            lastTick = Game.time;
            resultsMap = new Map();
        }
        const key = indexer(...args);
        if (!resultsMap.has(key)) {
            resultsMap.set(key, fn(...args));
        }
        return resultsMap.get(key);
    };
};
/**
 * A shorthand invocation of `memoize` where the results should reset every tick
 *
 * Example:
 * ```
 * export const buyMarketPrice = memoizeByTick(
 *   (resourceType: MarketResourceConstant) => resourceType,
 *   (resourceType: MarketResourceConstant) =>
 *     Math.min(...Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).map(o => o.price), Infinity)
 * );
 * ```
 */
const memoizeByTick = (indexer, fn) => memoize(indexer, fn, 1);
/**
 * A shorthand invocation of `memoize` where the function has no parameters to generate a key.
 * Results are generated once and cached for `resetAfterTicks` ticks
 *
 * Example:
 * ```
 * export const roomData = memoizeOnce(
 *   () => {
 *     return Object.keys(Game.rooms)
 *       .reduce(
 *         (acc, roomName) => acc[roomName] = {},
 *         {} as Record<string, any>
 *       )
 *   },
 *   100
 * )
 * ```
 */
const memoizeOnce = (fn, resetAfterTicks = Infinity) => memoize(() => '', fn, resetAfterTicks);
/**
 * A shorthand invocation of `memoize` where the function has no parameters to generate a key
 * and should reset each tick. Results are generated once every tick.
 *
 * Example:
 * ```
 * export const ordersByResourceType = memoizeOncePerTick(() => {
 *   return Game.market.getAllOrders().reduce(
 *     (acc, order) => {
 *       acc[order.resourceType] ??= [];
 *       acc[order.resourceType].push(order);
 *     },
 *     {} as Record<MarketResourceConstant, Order[]>
 *   )
 * })
 * ```
 */
const memoizeOncePerTick = (fn) => memoize(() => '', fn, 1);

/**
 * Returns base multipliers, e.g. `stats.heal * HEAL_POWER` to calculate actual healing potential
 */
const combatStats = memoize(creep => creep.name, (creep) => {
    const stats = {
        hits: creep.hits,
        hitsMax: creep.hitsMax,
        carry: 0,
        attack: 0,
        rangedAttack: 0,
        heal: 0,
        rangedHeal: 0,
        mitigation: 1,
        dismantle: 0,
        harvest: 0,
        build: 0,
        repair: 0,
        speed: 0,
        score: 0
    };
    if (creep.body[0].type === TOUGH) {
        // damage mitigation
        const boost = creep.body[0].boost;
        if (boost) {
            stats.mitigation *= BOOSTS[TOUGH][boost].damage;
        }
    }
    let fatigueGeneration = 0;
    let fatigueMitigation = 0;
    for (const p of creep.body) {
        if (p.hits) {
            if (p.type === HEAL) {
                let heal = 1;
                let rangedHeal = 1;
                if (p.boost) {
                    heal *= BOOSTS[HEAL][p.boost].heal;
                    rangedHeal *= BOOSTS[HEAL][p.boost].rangedHeal;
                }
                stats.heal += heal;
                stats.rangedHeal += rangedHeal;
            }
            else if (p.type === ATTACK) {
                let attack = 1;
                if (p.boost) {
                    attack *= BOOSTS[ATTACK][p.boost].attack;
                }
                stats.attack += attack;
            }
            else if (p.type === RANGED_ATTACK) {
                let rangedAttack = 1;
                if (p.boost) {
                    rangedAttack *= BOOSTS[RANGED_ATTACK][p.boost].rangedAttack;
                }
                stats.rangedAttack += rangedAttack;
            }
            else if (p.type === CARRY) {
                let carry = 1;
                if (p.boost) {
                    carry *= BOOSTS[CARRY][p.boost].capacity;
                }
                stats.carry += carry;
            }
            else if (p.type === WORK) {
                let dismantle = 1;
                let build = 1;
                let repair = 1;
                let harvest = 1;
                if (p.boost) {
                    const boostEffects = BOOSTS[WORK][p.boost];
                    if ('harvest' in boostEffects)
                        harvest *= boostEffects.harvest;
                    if ('build' in boostEffects)
                        build *= boostEffects.build;
                    if ('repair' in boostEffects)
                        repair *= boostEffects.repair;
                    if ('dismantle' in boostEffects)
                        dismantle *= boostEffects.dismantle;
                }
                stats.harvest += harvest;
                stats.build += build;
                stats.repair += repair;
                stats.dismantle += dismantle;
            }
            else if (p.type === MOVE) {
                let move = 1;
                if (p.boost) {
                    move *= BOOSTS[MOVE][p.boost].fatigue;
                }
                fatigueMitigation += move;
            }
            if (p.type !== MOVE && p.type !== CARRY) {
                fatigueGeneration += 1;
            }
        }
    }
    stats.speed = fatigueMitigation ? Math.min(1, fatigueGeneration / fatigueMitigation) : 0;
    // Overall danger heuristic, stolen from Overmind
    stats.score = stats.rangedAttack + stats.attack * 3 + stats.heal / stats.mitigation;
    return stats;
});
const combatPower = (creep) => {
    const stats = combatStats(creep);
    return Object.assign(Object.assign({}, stats), { attack: stats.attack * ATTACK_POWER, rangedAttack: stats.rangedAttack * RANGED_ATTACK_POWER, heal: stats.heal * HEAL_POWER, rangedHeal: stats.rangedHeal * RANGED_HEAL_POWER, build: stats.build * BUILD_POWER, repair: stats.repair * REPAIR_POWER, carry: stats.carry * CARRY_CAPACITY, dismantle: stats.dismantle * DISMANTLE_POWER, harvest: stats.harvest * HARVEST_POWER });
};
const totalCreepStats = (creeps) => {
    const sum = creeps.reduce((sum, creep) => {
        sum.count += 1;
        const stats = combatStats(creep);
        sum.hits += stats.hits;
        sum.carry += stats.carry;
        sum.attack += stats.attack;
        sum.rangedAttack += stats.rangedAttack;
        sum.heal += stats.heal;
        sum.rangedHeal += stats.rangedHeal;
        sum.mitigation += stats.mitigation;
        sum.build += stats.build;
        sum.repair += stats.repair;
        sum.dismantle += stats.dismantle;
        sum.harvest += stats.harvest;
        sum.score += stats.score;
        return sum;
    }, {
        count: 0,
        hits: 0,
        carry: 0,
        attack: 0,
        rangedAttack: 0,
        heal: 0,
        rangedHeal: 0,
        mitigation: 0,
        build: 0,
        repair: 0,
        dismantle: 0,
        harvest: 0,
        score: 0
    });
    sum.mitigation /= sum.count;
    return sum;
};
const totalCreepPower = (creeps) => {
    const stats = totalCreepStats(creeps);
    return Object.assign(Object.assign({}, stats), { attack: stats.attack * ATTACK_POWER, rangedAttack: stats.rangedAttack * RANGED_ATTACK_POWER, heal: stats.heal * HEAL_POWER, rangedHeal: stats.rangedHeal * RANGED_HEAL_POWER, build: stats.build * BUILD_POWER, repair: stats.repair * REPAIR_POWER, carry: stats.carry * CARRY_CAPACITY, dismantle: stats.dismantle * DISMANTLE_POWER, harvest: stats.harvest * HARVEST_POWER });
};

const findHostileCreeps = (room) => {
    if (!Game.rooms[room])
        return [];
    // Return hostile creeps, if they aren't whitelisted
    return Game.rooms[room].find(FIND_HOSTILE_CREEPS, { filter: creep => !WHITELIST.includes(creep.owner.username) });
};
const findInvaderStructures = (room) => {
    if (!Game.rooms[room])
        return [];
    // Return hostile creeps, if they aren't whitelisted
    return Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, { filter: structure => structure.structureType === STRUCTURE_INVADER_CORE });
};
const findHostileCreepsInRange = (pos, range) => {
    if (!Game.rooms[pos.roomName])
        return [];
    // Return hostile creeps, if they aren't whitelisted
    return pos.findInRange(FIND_HOSTILE_CREEPS, range, { filter: creep => !WHITELIST.includes(creep.owner.username) });
};
const findClosestHostileCreepByRange = (pos) => {
    if (!Game.rooms[pos.roomName])
        return;
    return pos.findClosestByRange(FIND_HOSTILE_CREEPS, { filter: creep => !WHITELIST.includes(creep.owner.username) });
};

const franchiseDefenseRooms = memoize((office, franchise) => { var _a; return `${(_a = main_21(office + franchise)) === null || _a === void 0 ? void 0 : _a.length}`; }, (office, franchise) => {
    var _a, _b;
    return ((_b = (_a = main_21(office + franchise)) === null || _a === void 0 ? void 0 : _a.reduce((rooms, road) => {
        if (!rooms.includes(road.roomName))
            rooms.push(road.roomName);
        return rooms;
    }, [])) !== null && _b !== void 0 ? _b : []);
});

/**
 * screeps-packrat
 * ---------------
 * Lightning-fast and memory-efficient serialization of Screeps IDs, Coords, and RoomPositions
 * Code written by Muon as part of Overmind Screeps AI. Feel free to adapt as desired.
 * Package repository: https://github.com/bencbartlett/screeps-packrat
 *
 * Plain JS version is available in the #share-thy-code channel on the Screeps Slack.
 *
 * To use: import desired functions from module, or import entire module on main and use functions from global.
 * To benchmark: import tests file, PackratTests.run()
 *
 * Exported functions (available on global):
 *
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 * |         function         |                  description                   | execution time* | memory reduction** |
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 * | packId                   | packs a game object id into 6 chars            | 500ns           | -75%               |
 * | unpackId                 | unpacks 6 chars into original format           | 1.3us           |                    |
 * | packIdList               | packs a list of ids into a single string       | 500ns/id        | -81%               |
 * | unpackIdList             | unpacks a string into a list of ids            | 1.2us/id        |                    |
 * | packPos                  | packs a room position into 2 chars             | 150ns           | -90%               |
 * | unpackPos                | unpacks 2 chars into a room position           | 600ns           |                    |
 * | packPosList              | packs a list of room positions into a string   | 150ns/pos       | -95%               |
 * | unpackPosList            | unpacks a string into a list of room positions | 1.5us/pos       |                    |
 * | packCoord                | packs a coord (e.g. {x:25,y:25}) as a string   | 150ns           | -80%               |
 * | unpackCoord              | unpacks a string into a coord                  | 60-150ns        |                    |
 * | packCoordList            | packs a list of coords as a string             | 120ns/coord     | -94%               |
 * | unpackCoordList          | unpacks a string into a list of coords         | 100ns/coord     |                    |
 * | unpackCoordAsPos         | unpacks string + room name into a pos          | 500ns           |                    |
 * | unpackCoordListAsPosList | unpacks string + room name into a list of pos  | 500ns/coord     |                    |
 * +--------------------------+------------------------------------------------+-----------------+--------------------+
 *
 *  * Execution time measured on shard2 public servers and may vary on different machines or shards.
 * ** Memory reduction for list functions is the asymptotic limit of lists containing many entries. Lower reductions
 *    can be expected for smaller lists.
 *
 */
global.PERMACACHE = {}; // Create a permanent cache for immutable items such as room names
/**
 * Convert a standard 24-character hex id in screeps to a compressed UTF-16 encoded string of length 6.
 *
 * Benchmarking: average of 500ns to execute on shard2 public server, reduce stringified size by 75%
 */
function packId(id) {
    return String.fromCharCode(parseInt(id.substr(0, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(4, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(8, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(12, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(16, 4), 16)) +
        String.fromCharCode(parseInt(id.substr(20, 4), 16));
}
/**
 * Convert a compressed six-character UTF-encoded id back into the original 24-character format.
 *
 * Benchmarking: average of 1.3us to execute on shard2 public server
 */
function unpackId(packedId) {
    let id = '';
    let current;
    for (let i = 0; i < 6; ++i) {
        current = packedId.charCodeAt(i);
        id += (current >>> 8).toString(16).padStart(2, '0'); // String.padStart() requires es2017+ target
        id += (current & 0xFF).toString(16).padStart(2, '0');
    }
    return id;
}
/**
 * Packs a list of ids as a utf-16 string. This is better than having a list of packed coords, as it avoids
 * extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 500ns per id to execute on shard2 public server, reduce stringified size by 81%
 */
function packIdList(ids) {
    let str = '';
    for (let i = 0; i < ids.length; ++i) {
        str += packId(ids[i]);
    }
    return str;
}
/**
 * Unpacks a list of ids stored as a utf-16 string.
 *
 * Benchmarking: average of 1.2us per id to execute on shard2 public server.
 */
function unpackIdList(packedIds) {
    const ids = [];
    for (let i = 0; i < packedIds.length; i += 6) {
        ids.push(unpackId(packedIds.substr(i, 6)));
    }
    return ids;
}
/**
 * Packs a coord as a single utf-16 character. The seemingly strange choice of encoding value ((x << 6) | y) + 65 was
 * chosen to be fast to compute (x << 6 | y is significantly faster than 50 * x + y) and to avoid control characters,
 * as "A" starts at character code 65.
 *
 * Benchmarking: average of 150ns to execute on shard2 public server, reduce stringified size by 80%
 */
function packCoord(coord) {
    return String.fromCharCode(((coord.x << 6) | coord.y) + 65);
}
/**
 * Unpacks a coord stored as a single utf-16 character
 *
 * Benchmarking: average of 60ns-100ns to execute on shard2 public server
 */
function unpackCoord(char) {
    const xShiftedSixOrY = char.charCodeAt(0) - 65;
    return {
        x: (xShiftedSixOrY & 0b111111000000) >>> 6,
        y: (xShiftedSixOrY & 0b000000111111),
    };
}
/**
 * Unpacks a coordinate and creates a RoomPosition object from a specified roomName
 *
 * Benchmarking: average of 500ns to execute on shard2 public server
 */
function unpackCoordAsPos(packedCoord, roomName) {
    const coord = unpackCoord(packedCoord);
    return new RoomPosition(coord.x, coord.y, roomName);
}
/**
 * Packs a list of coords as a utf-16 string. This is better than having a list of packed coords, as it avoids
 * extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 120ns per coord to execute on shard2 public server, reduce stringified size by 94%
 */
function packCoordList(coords) {
    let str = '';
    for (let i = 0; i < coords.length; ++i) {
        str += String.fromCharCode(((coords[i].x << 6) | coords[i].y) + 65);
    }
    return str;
}
/**
 * Unpacks a list of coords stored as a utf-16 string
 *
 * Benchmarking: average of 100ns per coord to execute on shard2 public server
 */
function unpackCoordList(chars) {
    const coords = [];
    let xShiftedSixOrY;
    for (let i = 0; i < chars.length; ++i) {
        xShiftedSixOrY = chars.charCodeAt(i) - 65;
        coords.push({
            x: (xShiftedSixOrY & 0b111111000000) >>> 6,
            y: (xShiftedSixOrY & 0b000000111111),
        });
    }
    return coords;
}
/**
 * Unpacks a list of coordinates and creates a list of RoomPositions from a specified roomName
 *
 * Benchmarking: average of 500ns per coord to execute on shard2 public server
 */
function unpackCoordListAsPosList(packedCoords, roomName) {
    const positions = [];
    let coord;
    for (let i = 0; i < packedCoords.length; ++i) {
        // Each coord is saved as a single character; unpack each and insert the room name to get the positions list
        coord = unpackCoord(packedCoords[i]);
        positions.push(new RoomPosition(coord.x, coord.y, roomName));
    }
    return positions;
}
PERMACACHE._packedRoomNames = PERMACACHE._packedRoomNames || {};
PERMACACHE._unpackedRoomNames = PERMACACHE._unpackedRoomNames || {};
/**
 * Packs a roomName as a single utf-16 character. Character values are stored on permacache.
 */
function packRoomName(roomName) {
    if (PERMACACHE._packedRoomNames[roomName] === undefined) {
        const coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
        const match = coordinateRegex.exec(roomName);
        const xDir = match[1];
        const x = Number(match[2]);
        const yDir = match[3];
        const y = Number(match[4]);
        let quadrant;
        if (xDir == 'W') {
            if (yDir == 'N') {
                quadrant = 0;
            }
            else {
                quadrant = 1;
            }
        }
        else {
            if (yDir == 'N') {
                quadrant = 2;
            }
            else {
                quadrant = 3;
            }
        }
        // y is 6 bits, x is 6 bits, quadrant is 2 bits
        const num = (quadrant << 12 | (x << 6) | y) + 65;
        const char = String.fromCharCode(num);
        PERMACACHE._packedRoomNames[roomName] = char;
        PERMACACHE._unpackedRoomNames[char] = roomName;
    }
    return PERMACACHE._packedRoomNames[roomName];
}
/**
 * Packs a roomName as a single utf-16 character. Character values are stored on permacache.
 */
function unpackRoomName(char) {
    if (PERMACACHE._unpackedRoomNames[char] === undefined) {
        const num = char.charCodeAt(0) - 65;
        const { q, x, y } = {
            q: (num & 0b11000000111111) >>> 12,
            x: (num & 0b00111111000000) >>> 6,
            y: (num & 0b00000000111111),
        };
        let roomName;
        switch (q) {
            case 0:
                roomName = 'W' + x + 'N' + y;
                break;
            case 1:
                roomName = 'W' + x + 'S' + y;
                break;
            case 2:
                roomName = 'E' + x + 'N' + y;
                break;
            case 3:
                roomName = 'E' + x + 'S' + y;
                break;
            default:
                roomName = 'ERROR';
        }
        PERMACACHE._packedRoomNames[roomName] = char;
        PERMACACHE._unpackedRoomNames[char] = roomName;
    }
    return PERMACACHE._unpackedRoomNames[char];
}
/**
 * Packs a RoomPosition as a pair utf-16 characters. The seemingly strange choice of encoding value ((x << 6) | y) + 65
 * was chosen to be fast to compute (x << 6 | y is significantly faster than 50 * x + y) and to avoid control
 * characters, as "A" starts at character code 65.
 *
 * Benchmarking: average of 150ns to execute on shard2 public server, reduce stringified size by 90%
 */
function packPos(pos) {
    return packCoord(pos) + packRoomName(pos.roomName);
}
/**
 * Unpacks a RoomPosition stored as a pair of utf-16 characters.
 *
 * Benchmarking: average of 600ns to execute on shard2 public server.
 */
function unpackPos(chars) {
    const { x, y } = unpackCoord(chars[0]);
    return new RoomPosition(x, y, unpackRoomName(chars[1]));
}
/**
 * Packs a list of RoomPositions as a utf-16 string. This is better than having a list of packed RoomPositions, as it
 * avoids extra commas and "" when memroy gets stringified.
 *
 * Benchmarking: average of 150ns per position to execute on shard2 public server, reduce stringified size by 95%
 */
function packPosList(posList) {
    let str = '';
    for (let i = 0; i < posList.length; ++i) {
        str += packPos(posList[i]);
    }
    return str;
}
/**
 * Unpacks a list of RoomPositions stored as a utf-16 string.
 *
 * Benchmarking: average of 1.5us per position to execute on shard2 public server.
 */
function unpackPosList(chars) {
    const posList = [];
    for (let i = 0; i < chars.length; i += 2) {
        posList.push(unpackPos(chars.substr(i, 2)));
    }
    return posList;
}
// Useful to register these functions on global to use with console
global.packId = packId;
global.unpackId = unpackId;
global.packIdList = packIdList;
global.unpackIdList = unpackIdList;
global.packCoord = packCoord;
global.unpackCoord = unpackCoord;
global.unpackCoordAsPos = unpackCoordAsPos;
global.packCoordList = packCoordList;
global.unpackCoordList = unpackCoordList;
global.unpackCoordListAsPosList = unpackCoordListAsPosList;
global.packPos = packPos;
global.unpackPos = unpackPos;
global.packPosList = packPosList;
global.unpackPosList = unpackPosList;

const posById = (id) => {
    if (!id)
        return undefined;
    const pos = Memory.positions[id];
    if (!pos)
        return undefined;
    return unpackPos(pos);
};

const rcl = (room) => {
    var _a, _b, _c;
    return (_c = (_b = (_a = Game.rooms[room]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.level) !== null && _c !== void 0 ? _c : 0;
};

const visualizeRoomCluster = (rooms, opts) => {
    // construct border
    bordersFromRooms(rooms).forEach(([pos1, pos2]) => Game.map.visual.line(pos1, pos2, opts));
};
const bordersFromRooms = memoize((rooms) => rooms.join(), (rooms) => {
    const borders = [];
    const boundaries = rooms.slice();
    while (boundaries.length) {
        const room = boundaries.shift();
        const exits = Game.map.describeExits(room);
        if (!rooms.includes(exits[LEFT])) {
            borders.push([new RoomPosition(0, 0, room), new RoomPosition(0, 49, room)]);
        }
        if (!rooms.includes(exits[RIGHT])) {
            borders.push([new RoomPosition(49, 0, room), new RoomPosition(49, 49, room)]);
        }
        if (!rooms.includes(exits[TOP])) {
            borders.push([new RoomPosition(0, 0, room), new RoomPosition(49, 0, room)]);
        }
        if (!rooms.includes(exits[BOTTOM])) {
            borders.push([new RoomPosition(0, 49, room), new RoomPosition(49, 49, room)]);
        }
    }
    return borders;
});

var _a$2;
(_a$2 = Memory.zones) !== null && _a$2 !== void 0 ? _a$2 : (Memory.zones = {});
const totalThreatScore = memoizeByTick(attacker => attacker, attacker => ({ threat: 0 }));
const recordThreat = (attacker, score, territory) => {
    var _a, _b, _c;
    if (score <= 0)
        return;
    if (['Source Keeper', 'Invader'].includes(attacker))
        return;
    if ((_b = (_a = Game.rooms[territory]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.my)
        return; // ignore threats in office rooms
    const zone = (_c = Memory.zones[attacker]) !== null && _c !== void 0 ? _c : {
        score: 0,
        rhythm: 3000,
        attacker,
        territories: [],
        lastActive: Game.time,
        confirmed: false
    };
    Memory.zones[attacker] = zone;
    // track the attacker's total visible threat for a given tick
    const threatScore = totalThreatScore(attacker);
    threatScore.threat += score;
    zone.score = Math.max(zone.score, threatScore.threat);
    if (!zone.territories.includes(territory))
        zone.territories.push(territory);
    zone.lastActive = Game.time;
};
const confirmThreat = (attacker) => {
    const zone = Memory.zones[attacker];
    if (zone)
        zone.confirmed = true;
};
const cleanThreats = () => {
    for (const attacker in Memory.zones) {
        const zone = Memory.zones[attacker];
        if (Game.time - zone.lastActive > zone.rhythm) {
            delete Memory.zones[attacker];
        }
    }
};
const scanRoomForThreats = ({ room }) => {
    const hostiles = findHostileCreeps(room);
    hostiles.forEach(h => recordThreat(h.owner.username, combatStats(h).score, room));
    if (hostiles.length) {
        Game.rooms[room].getEventLog().forEach(e => {
            if (e.event === EVENT_ATTACK) {
                const attacker = byId(e.objectId);
                const defender = byId(e.data.targetId);
                if (attacker && (defender === null || defender === void 0 ? void 0 : defender.my) && !(attacker === null || attacker === void 0 ? void 0 : attacker.my)) {
                    confirmThreat(attacker.owner.username);
                }
            }
        });
    }
};
const franchiseIsThreatened = (office, franchise) => {
    var _a;
    if (((_a = posById(franchise)) === null || _a === void 0 ? void 0 : _a.roomName) === office)
        return false;
    const rooms = franchiseDefenseRooms(office, franchise);
    let threat = 0;
    for (const attacker in Memory.zones) {
        const zone = Memory.zones[attacker];
        if (zone.confirmed && rooms.some(r => zone.territories.includes(r))) {
            threat += zone.score;
        }
    }
    if (threat > THREAT_TOLERANCE.remote[rcl(office)]) {
        return true;
    }
    return false;
};
const roomThreatLevel = (room) => {
    let threat = 0;
    for (const attacker in Memory.zones) {
        const zone = Memory.zones[attacker];
        if (zone.confirmed && zone.territories.includes(room)) {
            threat += zone.score;
        }
    }
    return threat;
};
const visualizeHarassmentZones = () => {
    for (const attacker in Memory.zones) {
        const zone = Memory.zones[attacker];
        visualizeRoomCluster(zone.territories, { color: zone.confirmed ? '#ff0000' : '#ffff00', width: 1 });
        zone.territories.forEach(room => {
            Game.map.visual.text(zone.attacker, new RoomPosition(5, 5, room), { align: 'left', fontSize: 4 });
            Game.map.visual.text(zone.score.toFixed(0), new RoomPosition(5, 10, room), { align: 'left', fontSize: 4 });
        });
    }
};
global.recordThreat = recordThreat;

const viz = memoizeByTick((room) => room !== null && room !== void 0 ? room : '', (room) => new RoomVisual(room));

const PackedStructureTypes = {
    [STRUCTURE_CONTAINER]: 'a',
    [STRUCTURE_EXTENSION]: 'b',
    [STRUCTURE_EXTRACTOR]: 'c',
    [STRUCTURE_FACTORY]: 'd',
    [STRUCTURE_LAB]: 'e',
    [STRUCTURE_LINK]: 'f',
    [STRUCTURE_NUKER]: 'g',
    [STRUCTURE_OBSERVER]: 'h',
    [STRUCTURE_POWER_SPAWN]: 'i',
    [STRUCTURE_RAMPART]: 'j',
    [STRUCTURE_ROAD]: 'k',
    [STRUCTURE_SPAWN]: 'l',
    [STRUCTURE_STORAGE]: 'm',
    [STRUCTURE_TERMINAL]: 'n',
    [STRUCTURE_TOWER]: 'o',
    [STRUCTURE_WALL]: 'p'
};
// Lookup table is the same, but inverted, generated once
const PackedStructureTypesLookup = Object.entries(PackedStructureTypes).reduce((net, [k, v]) => {
    net[v] = k;
    return net;
}, {});
let plannedStructures = {};
class PlannedStructure {
    constructor(pos, structureType, structureId) {
        this.pos = pos;
        this.structureType = structureType;
        this.structureId = structureId;
        this.energyToBuild = 0;
        this.energyToRepair = 0;
        this.lastSurveyed = 0;
        const key = PackedStructureTypes[structureType] + packPos(pos);
        if (plannedStructures[key]) {
            return plannedStructures[key];
        }
        else {
            plannedStructures[key] = this;
        }
    }
    get structure() {
        this.survey();
        return byId(this.structureId);
    }
    get constructionSite() {
        this.survey();
        return byId(this.constructionSiteId);
    }
    serialize() {
        return PackedStructureTypes[this.structureType] + packPos(this.pos);
    }
    static deserialize(serialized) {
        try {
            const existing = plannedStructures[serialized.slice(0, 3)];
            if (existing)
                return existing;
            let structureType = PackedStructureTypesLookup[serialized.slice(0, 1)];
            let pos = unpackPos(serialized.slice(1, 3));
            const result = new PlannedStructure(pos, structureType);
            plannedStructures[serialized.slice(0, 3)] = result;
            return result;
        }
        catch (e) {
            console.log('Deserializing error', serialized);
            throw e;
        }
    }
    survey() {
        var _a, _b, _c, _d;
        if (Game.time === this.lastSurveyed)
            return !!this.structureId; // Only survey once per tick
        this.lastSurveyed = Game.time;
        if (Game.rooms[this.pos.roomName]) {
            if (!byId(this.structureId)) {
                this.structureId = undefined;
            }
            (_a = this.structureId) !== null && _a !== void 0 ? _a : (this.structureId = (_b = Game.rooms[this.pos.roomName]
                .lookForAt(LOOK_STRUCTURES, this.pos)
                .find(s => s.structureType === this.structureType && (!('my' in s) || s.my))) === null || _b === void 0 ? void 0 : _b.id);
            const structure = byId(this.structureId);
            if (structure) {
                this.energyToBuild = 0;
                const hitsMax = BARRIER_TYPES.includes(structure.structureType)
                    ? BARRIER_LEVEL[rcl(structure.pos.roomName)]
                    : structure.hitsMax;
                this.energyToRepair = (hitsMax - structure.hits) * REPAIR_COST;
                return true; // Actual structure is visible
            }
            else {
                if (!byId(this.constructionSiteId)) {
                    this.constructionSiteId = undefined;
                }
                (_c = this.constructionSiteId) !== null && _c !== void 0 ? _c : (this.constructionSiteId = Game.rooms[this.pos.roomName]
                    ? (_d = this.pos
                        .lookFor(LOOK_CONSTRUCTION_SITES)
                        .find((c) => c.my && c.structureType === this.structureType)) === null || _d === void 0 ? void 0 : _d.id
                    : undefined);
                const constructionSite = byId(this.constructionSiteId);
                if (constructionSite) {
                    this.energyToBuild = constructionSite.progressTotal - constructionSite.progress;
                    this.energyToRepair = 0;
                }
                else {
                    this.energyToBuild = CONSTRUCTION_COST[this.structureType];
                    this.energyToRepair = 0;
                }
            }
        }
        else if (this.structureId) {
            return true; // Cached structure exists
        }
        return false; // Structure does not exist
    }
    canBuild() {
        return (Boolean(this.constructionSiteId) ||
            ([undefined, 'LordGreywether'].includes(Memory.rooms[this.pos.roomName].reserver) &&
                [undefined, 'LordGreywether'].includes(Memory.rooms[this.pos.roomName].owner)));
    }
    visualize() {
        if (!this.structure) {
            viz(this.pos.roomName).structure(this.pos.x, this.pos.y, this.structureType);
        }
    }
}
profiler.registerClass(PlannedStructure, 'PlannedStructure');

function isReservedByEnemy(room) {
    return Memory.rooms[room].reserver && Memory.rooms[room].reserver !== 'LordGreywether';
}
function isOwnedByEnemy(room) {
    return Memory.rooms[room].owner && Memory.rooms[room].owner !== 'LordGreywether';
}

const serializePlannedStructures = (structures) => {
    let serializedStructures = '';
    for (let s of structures) {
        serializedStructures += s.serialize();
    }
    return serializedStructures;
};
const deserializePlannedStructures = (serializedStructures) => {
    let structures = [];
    if (serializedStructures.length < 3)
        return structures;
    for (let i = 0; i < serializedStructures.length; i += 3) {
        structures.push(PlannedStructure.deserialize(serializedStructures.slice(i, i + 3)));
    }
    return structures;
};

const isCreep = (item) => item instanceof Creep;
const isPlannedStructure = (type) => (structure) => !!structure && (!type || structure.structureType === type);

function validateBackfillPlan(plan) {
    var _a;
    if (!((_a = plan.towers) === null || _a === void 0 ? void 0 : _a.length) || !plan.observer) {
        throw new Error(`Incomplete BackfillPlan`);
    }
    else {
        return plan;
    }
}

function deserializeBackfillPlan(serialized) {
    var _a, _b, _c;
    const plan = {
        extensions: [],
        towers: [],
        ramparts: [],
        observer: undefined
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_EXTENSION)(s))
            (_a = plan.extensions) === null || _a === void 0 ? void 0 : _a.push(s);
        if (isPlannedStructure(STRUCTURE_TOWER)(s))
            (_b = plan.towers) === null || _b === void 0 ? void 0 : _b.push(s);
        if (isPlannedStructure(STRUCTURE_RAMPART)(s))
            (_c = plan.ramparts) === null || _c === void 0 ? void 0 : _c.push(s);
        if (isPlannedStructure(STRUCTURE_OBSERVER)(s))
            plan.observer = s;
    }
    return validateBackfillPlan(plan);
}

function validateExtensionsPlan(plan) {
    var _a, _b;
    if (!((_a = plan.extensions) === null || _a === void 0 ? void 0 : _a.length) || !((_b = plan.roads) === null || _b === void 0 ? void 0 : _b.length)) {
        throw new Error(`Incomplete ExtensionsPlan`);
    }
    else {
        return plan;
    }
}

function deserializeExtensionsPlan(serialized) {
    var _a, _b, _c;
    const plan = {
        extensions: [],
        roads: [],
        ramparts: []
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_EXTENSION)(s))
            (_a = plan.extensions) === null || _a === void 0 ? void 0 : _a.push(s);
        if (isPlannedStructure(STRUCTURE_ROAD)(s))
            (_b = plan.roads) === null || _b === void 0 ? void 0 : _b.push(s);
        if (isPlannedStructure(STRUCTURE_RAMPART)(s))
            (_c = plan.ramparts) === null || _c === void 0 ? void 0 : _c.push(s);
    }
    return validateExtensionsPlan(plan);
}

function validateFranchisePlan(plan) {
    if (!plan.sourceId ||
        !plan.link ||
        !plan.container // || !plan.ramparts?.length
    ) {
        throw new Error(`Incomplete FranchisePlan`);
    }
    else {
        return plan;
    }
}

function deserializeFranchisePlan(serialized) {
    var _a, _b;
    const plan = {
        sourceId: serialized.slice(0, 24).trim(),
        link: undefined,
        container: undefined,
        extensions: [],
        ramparts: []
    };
    for (const s of deserializePlannedStructures(serialized.slice(24))) {
        if (isPlannedStructure(STRUCTURE_LINK)(s))
            plan.link = s;
        if (isPlannedStructure(STRUCTURE_CONTAINER)(s))
            plan.container = s;
        if (isPlannedStructure(STRUCTURE_RAMPART)(s))
            (_a = plan.ramparts) === null || _a === void 0 ? void 0 : _a.push(s);
        if (isPlannedStructure(STRUCTURE_EXTENSION)(s))
            (_b = plan.extensions) === null || _b === void 0 ? void 0 : _b.push(s);
    }
    return validateFranchisePlan(plan);
}

function validateLibraryPlan(plan) {
    if (!plan.container || !plan.link) {
        throw new Error(`Incomplete LibraryPlan`);
    }
    else {
        return plan;
    }
}

function deserializeLibraryPlan(serialized) {
    const plan = {
        container: undefined,
        link: undefined
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_CONTAINER)(s))
            plan.container = s;
        if (isPlannedStructure(STRUCTURE_LINK)(s))
            plan.link = s;
    }
    return validateLibraryPlan(plan);
}

function validateMinePlan(plan) {
    if (!plan.extractor || !plan.container) {
        throw new Error(`Incomplete MinePlan`);
    }
    else {
        return plan;
    }
}

function deserializeMinePlan(serialized) {
    const plan = {
        extractor: undefined,
        container: undefined,
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_EXTRACTOR)
            plan.extractor = s;
        if (s.structureType === STRUCTURE_CONTAINER)
            plan.container = s;
    }
    return validateMinePlan(plan);
}

function validatePerimeterPlan(plan) {
    var _a;
    if (!((_a = plan.ramparts) === null || _a === void 0 ? void 0 : _a.length)) {
        throw new Error(`Incomplete PerimeterPlan`);
    }
    else {
        return plan;
    }
}

function deserializePerimeterPlan(serialized) {
    const plan = {
        ramparts: []
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_RAMPART)
            plan.ramparts.push(s);
    }
    return validatePerimeterPlan(plan);
}

function validateRoadsPlan(plan) {
    var _a;
    if (!((_a = plan.roads) === null || _a === void 0 ? void 0 : _a.length)) {
        throw new Error(`Incomplete RoadsPlan`);
    }
    else {
        return plan;
    }
}

function deserializeRoadsPlan(serialized) {
    var _a;
    const plan = {
        roads: [],
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_ROAD)(s))
            (_a = plan.roads) === null || _a === void 0 ? void 0 : _a.push(s);
    }
    return validateRoadsPlan(plan);
}

function validateFastfillerPlan(plan) {
    var _a, _b, _c, _d;
    if (((_a = plan.extensions) === null || _a === void 0 ? void 0 : _a.length) !== 15 ||
        ((_b = plan.spawns) === null || _b === void 0 ? void 0 : _b.length) !== 3 ||
        ((_c = plan.containers) === null || _c === void 0 ? void 0 : _c.length) !== 2 ||
        !((_d = plan.roads) === null || _d === void 0 ? void 0 : _d.length) ||
        !plan.link) {
        throw new Error(`Incomplete FastfillerPlan`);
    }
    else {
        return plan;
    }
}

function deserializeFastfillerPlan(serialized) {
    var _a, _b, _c, _d;
    const plan = {
        extensions: [],
        spawns: [],
        containers: [],
        roads: [],
        link: undefined
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_EXTENSION)(s)) {
            (_a = plan.extensions) === null || _a === void 0 ? void 0 : _a.push(s);
        }
        else if (isPlannedStructure(STRUCTURE_ROAD)(s)) {
            (_b = plan.roads) === null || _b === void 0 ? void 0 : _b.push(s);
        }
        else if (isPlannedStructure(STRUCTURE_SPAWN)(s)) {
            (_c = plan.spawns) === null || _c === void 0 ? void 0 : _c.push(s);
        }
        else if (isPlannedStructure(STRUCTURE_CONTAINER)(s)) {
            (_d = plan.containers) === null || _d === void 0 ? void 0 : _d.push(s);
        }
        else if (isPlannedStructure(STRUCTURE_LINK)(s)) {
            plan.link = s;
        }
    }
    return validateFastfillerPlan(plan);
}

function validateHeadquartersPlan(plan) {
    var _a;
    if (!plan.link ||
        !plan.factory ||
        !plan.storage ||
        !plan.terminal ||
        !plan.powerSpawn ||
        !plan.extension ||
        !plan.nuker ||
        !((_a = plan.roads) === null || _a === void 0 ? void 0 : _a.length)) {
        // console.log(JSON.stringify(plan, null, 2))
        throw new Error(`Incomplete HeadquartersPlan`);
    }
    else {
        return plan;
    }
}

function deserializeHeadquartersPlan(serialized) {
    var _a;
    const plan = {
        link: undefined,
        factory: undefined,
        storage: undefined,
        terminal: undefined,
        nuker: undefined,
        roads: [],
        extension: undefined
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_NUKER)(s))
            plan.nuker = s;
        if (isPlannedStructure(STRUCTURE_POWER_SPAWN)(s))
            plan.powerSpawn = s;
        if (isPlannedStructure(STRUCTURE_LINK)(s))
            plan.link = s;
        if (isPlannedStructure(STRUCTURE_FACTORY)(s))
            plan.factory = s;
        if (isPlannedStructure(STRUCTURE_STORAGE)(s))
            plan.storage = s;
        if (isPlannedStructure(STRUCTURE_TERMINAL)(s))
            plan.terminal = s;
        if (isPlannedStructure(STRUCTURE_EXTENSION)(s))
            plan.extension = s;
        if (isPlannedStructure(STRUCTURE_ROAD)(s))
            (_a = plan.roads) === null || _a === void 0 ? void 0 : _a.push(s);
    }
    return validateHeadquartersPlan(plan);
}

function validateLabsPlan(plan) {
    var _a, _b;
    if (((_a = plan.labs) === null || _a === void 0 ? void 0 : _a.length) !== 10 || !((_b = plan.roads) === null || _b === void 0 ? void 0 : _b.length)) {
        throw new Error(`Incomplete LabsPlan`);
    }
    else {
        return plan;
    }
}

function deserializeLabsPlan(serialized) {
    const plan = {
        labs: [],
        roads: []
    };
    for (const s of deserializePlannedStructures(serialized)) {
        if (isPlannedStructure(STRUCTURE_LAB)(s)) {
            plan.labs.push(s);
        }
        else if (isPlannedStructure(STRUCTURE_ROAD)(s)) {
            plan.roads.push(s);
        }
    }
    return validateLabsPlan(plan);
}

const plans = new Map();
const updateRoomPlan = (roomName, plan, deserializer) => {
    var _a;
    let memoryPlan = Memory.roomPlans[roomName][plan];
    let cachedPlan = (_a = plans.get(roomName)) !== null && _a !== void 0 ? _a : {};
    plans.set(roomName, cachedPlan);
    if (typeof memoryPlan === 'string' && !cachedPlan[plan]) {
        try {
            cachedPlan[plan] = deserializer(memoryPlan);
        }
        catch (_b) {
            console.log(`Error deserializing ${plan} plan for ${roomName}, resetting it`);
            delete Memory.roomPlans[roomName][plan];
        }
    }
};
global.resetRoomPlan = (room) => {
    if (room) {
        delete Memory.roomPlans[room];
        plans.delete(room);
    }
    else {
        Memory.roomPlans = {};
        for (const [p] of plans) {
            plans.delete(p);
        }
    }
};
const roomPlans = profiler.registerFN((roomName) => {
    var _a, _b;
    (_a = Memory.roomPlans) !== null && _a !== void 0 ? _a : (Memory.roomPlans = {});
    let plan = Memory.roomPlans[roomName];
    if (!plan) {
        plans.delete(roomName);
        return;
    }
    let cachedPlan = (_b = plans.get(roomName)) !== null && _b !== void 0 ? _b : {};
    plans.set(roomName, cachedPlan);
    // Check if room plan needs to be updated
    updateRoomPlan(roomName, 'franchise1', deserializeFranchisePlan);
    updateRoomPlan(roomName, 'franchise2', deserializeFranchisePlan);
    updateRoomPlan(roomName, 'mine', deserializeMinePlan);
    updateRoomPlan(roomName, 'library', deserializeLibraryPlan);
    updateRoomPlan(roomName, 'headquarters', deserializeHeadquartersPlan);
    updateRoomPlan(roomName, 'labs', deserializeLabsPlan);
    updateRoomPlan(roomName, 'fastfiller', deserializeFastfillerPlan);
    updateRoomPlan(roomName, 'extensions', deserializeExtensionsPlan);
    updateRoomPlan(roomName, 'backfill', deserializeBackfillPlan);
    updateRoomPlan(roomName, 'perimeter', deserializePerimeterPlan);
    updateRoomPlan(roomName, 'roads', deserializeRoadsPlan);
    return cachedPlan;
}, 'roomPlans');
const getSpawns = memoizeByTick(roomName => roomName, (roomName) => {
    var _a, _b, _c;
    const plan = roomPlans(roomName);
    const fastfillers = (_a = plan === null || plan === void 0 ? void 0 : plan.fastfiller) === null || _a === void 0 ? void 0 : _a.spawns.map(s => s.structure).filter(s => s && s.isActive());
    if (fastfillers === null || fastfillers === void 0 ? void 0 : fastfillers.length)
        return fastfillers;
    return ((_c = (_b = Game.rooms[roomName]) === null || _b === void 0 ? void 0 : _b.find(FIND_MY_SPAWNS)) !== null && _c !== void 0 ? _c : []);
});
const getFranchisePlanBySourceId = memoizeByTick(id => id, (id) => {
    var _a, _b, _c, _d;
    const pos = posById(id);
    if (!pos)
        return;
    const plan = roomPlans(pos.roomName);
    (_a = plan === null || plan === void 0 ? void 0 : plan.franchise1) === null || _a === void 0 ? void 0 : _a.container.survey();
    (_b = plan === null || plan === void 0 ? void 0 : plan.franchise2) === null || _b === void 0 ? void 0 : _b.container.survey();
    if (((_c = plan === null || plan === void 0 ? void 0 : plan.franchise1) === null || _c === void 0 ? void 0 : _c.sourceId) === id)
        return plan.franchise1;
    if (((_d = plan === null || plan === void 0 ? void 0 : plan.franchise2) === null || _d === void 0 ? void 0 : _d.sourceId) === id)
        return plan.franchise2;
    return;
});

const calculateAdjacencyMatrix = memoize((proximity) => '' + proximity, (proximity = 1) => {
    let adjacencies = new Array(proximity * 2 + 1).fill(0).map((v, i) => i - proximity);
    return adjacencies
        .flatMap(x => adjacencies.map(y => ({ x, y })))
        .filter((a) => !(a.x === 0 && a.y === 0));
});
const calculateAdjacentPositions = memoize((pos) => pos.toString(), (pos) => {
    return calculateNearbyPositions(pos, 1);
});
const adjacentWalkablePositions = (pos, ignoreCreeps = false) => calculateAdjacentPositions(pos).filter(p => isPositionWalkable(p, ignoreCreeps));
const calculateNearbyPositions = memoize((pos, proximity, includeCenter = false) => `${pos}x${proximity} ${includeCenter}`, (pos, proximity, includeCenter = false) => {
    let adjacent = [];
    adjacent = calculateAdjacencyMatrix(proximity)
        .map(offset => {
        try {
            return new RoomPosition(pos.x + offset.x, pos.y + offset.y, pos.roomName);
        }
        catch (_a) {
            return null;
        }
    })
        .filter(roomPos => roomPos !== null);
    if (includeCenter)
        adjacent.push(pos);
    return adjacent;
});
const calculateNearbyRooms = memoize((roomName, proximity, includeCenter = false) => `${roomName} ${proximity} ${includeCenter}`, (roomName, proximity, includeCenter = false) => {
    let { wx, wy } = roomNameToCoords(roomName);
    let roomStatus = Game.map.getRoomStatus(roomName);
    let adjacent = calculateAdjacencyMatrix(proximity)
        .map(offset => {
        try {
            return roomNameFromCoords(wx + offset.x, wy + offset.y);
        }
        catch (_a) {
            return null;
        }
    })
        .filter(n => {
        if (n === null)
            return false;
        try {
            let status = Game.map.getRoomStatus(n);
            if (roomStatus.status === status.status || status.status === 'normal') {
                return true;
            }
            return false;
        }
        catch (_a) {
            return false;
        }
    });
    if (includeCenter)
        adjacent.push(roomName);
    return adjacent;
});
const isPositionWalkable = memoizeByTick((pos, ignoreCreeps = false, ignoreStructures = false) => pos.toString() + ignoreCreeps + ignoreStructures, (pos, ignoreCreeps = false, ignoreStructures = false) => {
    let terrain;
    try {
        terrain = Game.map.getRoomTerrain(pos.roomName);
    }
    catch (_a) {
        // Invalid room
        return false;
    }
    if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) {
        return false;
    }
    if (Game.rooms[pos.roomName] &&
        pos.look().some(obj => {
            if (!ignoreCreeps && obj.type === LOOK_CREEPS)
                return true;
            if (!ignoreStructures &&
                obj.constructionSite &&
                OBSTACLE_OBJECT_TYPES.includes(obj.constructionSite.structureType))
                return true;
            if (!ignoreStructures &&
                obj.structure &&
                OBSTACLE_OBJECT_TYPES.includes(obj.structure.structureType))
                return true;
            return false;
        })) {
        return false;
    }
    return true;
});
const getRangeTo = memoize((from, to) => `${from} ${to}`, (from, to) => {
    if (from.roomName === to.roomName)
        return from.getRangeTo(to);
    // Calculate global positions
    let fromGlobal = globalPosition(from);
    let toGlobal = globalPosition(to);
    return Math.max(Math.abs(fromGlobal.x - toGlobal.x), Math.abs(fromGlobal.y - toGlobal.y));
});
const getClosestByRange = (from, targets) => {
    let closest;
    let closestRange = Infinity;
    for (const target of targets) {
        const range = getRangeTo(from, target.pos);
        if (range < closestRange) {
            closest = target;
            closestRange = range;
        }
    }
    return closest;
};
const globalPosition = (pos) => {
    let { x, y, roomName } = pos;
    if (!_.inRange(x, 0, 50))
        throw new RangeError('x value ' + x + ' not in range');
    if (!_.inRange(y, 0, 50))
        throw new RangeError('y value ' + y + ' not in range');
    if (roomName == 'sim')
        throw new RangeError('Sim room does not have world position');
    let { wx, wy } = roomNameToCoords(roomName);
    return {
        x: 50 * Number(wx) + x,
        y: 50 * Number(wy) + y
    };
};
const isHighway = (roomName) => {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (!parsed)
        throw new Error('Invalid room name');
    return Number(parsed[1]) % 10 === 0 || Number(parsed[2]) % 10 === 0;
};
const isSourceKeeperRoom = (roomName) => {
    let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
    if (!parsed)
        throw new Error('Invalid room name');
    let fmod = Number(parsed[1]) % 10;
    let smod = Number(parsed[2]) % 10;
    // return !(fmod === 5 && smod === 5) && (fmod >= 4 && fmod <= 6) && (smod >= 4 && smod <= 6);
    return fmod >= 4 && fmod <= 6 && smod >= 4 && smod <= 6;
};
const roomNameToCoords = (roomName) => {
    let match = roomName.match(/^([WE])([0-9]+)([NS])([0-9]+)$/);
    if (!match)
        throw new Error('Invalid room name');
    let [, h, wx, v, wy] = match;
    return {
        wx: h == 'W' ? ~Number(wx) : Number(wx),
        wy: v == 'N' ? ~Number(wy) : Number(wy)
    };
};
const roomNameFromCoords = (x, y) => {
    let h = x < 0 ? 'W' : 'E';
    let v = y < 0 ? 'N' : 'S';
    x = x < 0 ? ~x : x;
    y = y < 0 ? ~y : y;
    return `${h}${x}${v}${y}`;
};
const countTerrainTypes = (roomName) => {
    let terrain = Game.map.getRoomTerrain(roomName);
    const terrainStats = { swamp: 0, plains: 0, wall: 0, lava: 0 };
    for (let x = 0; x < 50; x += 1) {
        for (let y = 0; y < 50; y += 1) {
            const t = terrain.get(x, y);
            if (t & TERRAIN_MASK_SWAMP) {
                terrainStats.swamp += 1;
            }
            else if (t & TERRAIN_MASK_WALL) {
                terrainStats.wall += 1;
            }
            else if (t & TERRAIN_MASK_LAVA) {
                terrainStats.lava += 1;
            }
            else {
                terrainStats.plains += 1;
            }
        }
    }
    return terrainStats;
};
const sortByDistanceTo = (pos) => {
    let distance = new Map();
    return (a, b) => {
        let aPos = a instanceof RoomPosition ? a : a.pos;
        let bPos = b instanceof RoomPosition ? b : b.pos;
        if (!distance.has(aPos)) {
            distance.set(aPos, getRangeTo(pos, aPos));
        }
        if (!distance.has(bPos))
            distance.set(bPos, getRangeTo(pos, bPos));
        return distance.get(aPos) - distance.get(bPos);
    };
};
function lookNear(pos, range = 1) {
    return Game.rooms[pos.roomName].lookAtArea(Math.max(1, Math.min(49, pos.y - range)), Math.max(1, Math.min(49, pos.x - range)), Math.max(1, Math.min(49, pos.y + range)), Math.max(1, Math.min(49, pos.x + range)), true);
}
const getClosestOffice = memoize((roomName, minRcl = 1) => roomName + minRcl + Object.keys(Memory.offices).join(''), (roomName, minRcl = 1) => {
    var _a;
    let closest = undefined;
    let route = undefined;
    for (let office of Object.keys(Memory.offices)) {
        if (rcl(office) < minRcl)
            continue;
        const newRoute = Game.map.findRoute(office, roomName);
        if (newRoute === -2)
            continue;
        if (!closest || newRoute.length < ((_a = route === null || route === void 0 ? void 0 : route.length) !== null && _a !== void 0 ? _a : Infinity)) {
            closest = office;
            route = newRoute;
        }
    }
    return closest;
});
const getClosestOfficeFromMemory = (roomName) => {
    var _a, _b, _c;
    let closest = undefined;
    let length = Infinity;
    for (let office in Memory.offices) {
        const path = main_11(office + roomName, (_c = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos) !== null && _c !== void 0 ? _c : new RoomPosition(25, 25, office), { pos: new RoomPosition(25, 25, roomName), range: 20 });
        if (!path)
            continue;
        if (path.length < length) {
            length = path.length;
            closest = office;
        }
    }
    return closest;
};
const terrainCostAt = (pos) => {
    const terrain = Game.map.getRoomTerrain(pos.roomName).get(pos.x, pos.y);
    if (terrain === TERRAIN_MASK_SWAMP)
        return 5;
    if (terrain === TERRAIN_MASK_WALL)
        return 255;
    return 1;
};
function forEverySquareInRoom(callback) {
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            callback(x, y);
        }
    }
}
function posAtDirection(origin, direction) {
    const offset = [
        { x: 0, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: -1, y: 1 },
        { x: -1, y: 0 },
        { x: -1, y: -1 }
    ][direction - 1];
    return new RoomPosition(origin.x + offset.x, origin.y + offset.y, origin.roomName);
}

/**
 * If structure is missing more than this many hitpoints,
 * repair it
 */
const repairThreshold = (structure) => {
    var _a, _b;
    const barrierThresholdTypes = [STRUCTURE_RAMPART, STRUCTURE_CONTAINER, STRUCTURE_WALL];
    if (structure.structureType === STRUCTURE_ROAD) {
        return ((_b = (_a = structure.structure) === null || _a === void 0 ? void 0 : _a.hitsMax) !== null && _b !== void 0 ? _b : ROAD_HITS) * 0.5;
    }
    else if (barrierThresholdTypes.includes(structure.structureType)) {
        return CARRY_CAPACITY * 10;
    }
    else {
        return 0;
    }
};

const costForPlannedStructure = (structure, office) => {
    var _a, _b, _c, _d, _e, _f;
    const cost = {
        efficiency: 0,
        cost: 0
    };
    const distance = getRangeTo((_c = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos) !== null && _c !== void 0 ? _c : new RoomPosition(25, 25, office), structure.pos);
    // Calculation assumes Engineers have equal WORK and CARRY and can move 1 sq/tick (generally true with roads)
    if (structure.structure) {
        const workTime = CARRY_CAPACITY / (REPAIR_COST * REPAIR_POWER);
        cost.efficiency = workTime / (workTime + distance * 2);
        const rcl = (_f = (_e = (_d = Game.rooms[structure.pos.roomName]) === null || _d === void 0 ? void 0 : _d.controller) === null || _e === void 0 ? void 0 : _e.level) !== null && _f !== void 0 ? _f : 0;
        const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
        if (structure.structure.hits >= maxHits * repairThreshold(structure)) {
            return cost;
        }
        const repairNeeded = maxHits - structure.structure.hits;
        cost.cost = repairNeeded * REPAIR_COST;
    }
    else if (structure.constructionSite) {
        // Structure needs to be finished
        const workTime = CARRY_CAPACITY / BUILD_POWER;
        cost.efficiency = workTime / (workTime + distance * 2);
        cost.cost = structure.constructionSite.progressTotal - structure.constructionSite.progress;
    }
    else {
        if (!((Memory.rooms[structure.pos.roomName].owner &&
            Memory.rooms[structure.pos.roomName].owner !== 'LordGreywether') ||
            (Memory.rooms[structure.pos.roomName].reserver &&
                Memory.rooms[structure.pos.roomName].reserver !== 'LordGreywether'))) {
            // Structure needs to be built
            const workTime = CARRY_CAPACITY / BUILD_POWER;
            cost.efficiency = workTime / (workTime + distance * 2);
            cost.cost = CONSTRUCTION_COST[structure.structureType];
        }
        else {
            // Hostile territory, cannot build
            return cost;
        }
    }
    return cost;
};
const adjustedEnergyForPlannedStructure = (structure, distance) => {
    var _a, _b, _c;
    const threshold = repairThreshold(structure);
    // Calculation assumes Engineers have equal WORK and CARRY and can move 1 sq/tick (generally true with roads)
    if (structure.structure) {
        const workTime = CARRY_CAPACITY / (REPAIR_COST * REPAIR_POWER);
        const efficiency = workTime / (workTime + distance * 2);
        const rcl = (_c = (_b = (_a = Game.rooms[structure.pos.roomName]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.level) !== null && _c !== void 0 ? _c : 0;
        const maxHits = BARRIER_TYPES.includes(structure.structureType) ? BARRIER_LEVEL[rcl] : structure.structure.hitsMax;
        if (structure.structure.hits >= maxHits * threshold) {
            return 0;
        }
        const repairNeeded = maxHits - structure.structure.hits;
        return (repairNeeded * REPAIR_COST) / efficiency;
    }
    else if (structure.constructionSite) {
        // Structure needs to be finished
        const workTime = CARRY_CAPACITY / BUILD_POWER;
        const efficiency = workTime / (workTime + distance * 2);
        return (structure.constructionSite.progressTotal - structure.constructionSite.progress) / efficiency;
    }
    else if (!structure.survey()) {
        if (!((Memory.rooms[structure.pos.roomName].owner &&
            Memory.rooms[structure.pos.roomName].owner !== 'LordGreywether') ||
            (Memory.rooms[structure.pos.roomName].reserver &&
                Memory.rooms[structure.pos.roomName].reserver !== 'LordGreywether'))) {
            // Structure needs to be built
            const workTime = CARRY_CAPACITY / BUILD_POWER;
            const efficiency = workTime / (workTime + distance * 2);
            return CONSTRUCTION_COST[structure.structureType] / efficiency;
        }
    }
    // cannot confirm any work to be done
    return 0;
};

const cachedPlans = new Map();
function franchiseRoadsToBuild(office, source) {
    return plannedFranchiseRoads(office, source).filter(r => !r.survey() && r.lastSurveyed && !isReservedByEnemy(r.pos.roomName) && !isOwnedByEnemy(r.pos.roomName));
}
function plannedFranchiseRoads(office, source) {
    var _a, _b;
    const key = office + source;
    const path = franchisePath(office, source);
    const containerPos = (_a = getFranchisePlanBySourceId(source)) === null || _a === void 0 ? void 0 : _a.container.pos;
    const structures = (_b = cachedPlans.get(key)) !== null && _b !== void 0 ? _b : path
        .filter(p => p.x !== 0 && p.x !== 49 && p.y !== 0 && p.y !== 49)
        .map(p => new PlannedStructure(p, STRUCTURE_ROAD));
    if (!structures.length)
        return [];
    cachedPlans.set(key, structures);
    if (containerPos)
        return [...structures, new PlannedStructure(containerPos, STRUCTURE_CONTAINER)];
    return structures;
}
function franchisePath(office, source) {
    var _a;
    return (_a = main_21(office + source)) !== null && _a !== void 0 ? _a : [];
}
memoizeByTick((office, source) => office + source, (office, source) => {
    return plannedFranchiseRoads(office, source)
        .map(s => costForPlannedStructure(s, office))
        .reduce((sum, a) => sum + a.cost, 0);
});
memoizeByTick((office, source) => office + source, (office, source) => {
    return plannedFranchiseRoads(office, source)
        .map((s, i) => adjustedEnergyForPlannedStructure(s, i)) // it's a path, so index also represents distance
        .reduce((sum, a) => sum + a, 0);
});

const sourceIds = (roomName) => { var _a, _b, _c; return (_c = (_b = (_a = Memory.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.sourceIds) === null || _b === void 0 ? void 0 : _b.filter(s => s)) !== null && _c !== void 0 ? _c : []; };
const sourcePositions = (roomName) => sourceIds(roomName)
    .map(id => posById(id))
    .filter(s => s);
const mineralId = (roomName) => { var _a; return (_a = Memory.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.mineralId; };
const mineralPosition = (roomName) => posById(mineralId(roomName));
const controllerId = (roomName) => { var _a; return (_a = Memory.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.controllerId; };
const controllerPosition = (roomName) => posById(controllerId(roomName));
const roomExits = memoize(roomName => roomName, (roomName) => {
    const exits = [];
    for (let x = 0; x < 50; x += 1) {
        exits.push(new RoomPosition(x, 0, roomName));
        exits.push(new RoomPosition(x, 49, roomName));
    }
    for (let y = 1; y < 49; y += 1) {
        exits.push(new RoomPosition(0, y, roomName));
        exits.push(new RoomPosition(49, y, roomName));
    }
    const terrain = Game.map.getRoomTerrain(roomName);
    return exits.filter(pos => terrain.get(pos.x, pos.y) !== TERRAIN_MASK_WALL); // any border squares that aren't walls must be exits
});

function plannedActiveFranchiseRoads(office) {
    var _a, _b;
    return [
        ...new Set(((_b = (_a = Memory.offices[office]) === null || _a === void 0 ? void 0 : _a.territories) !== null && _b !== void 0 ? _b : [])
            .flatMap(t => sourceIds(t))
            .filter(source => {
            var _a, _b;
            return ((_b = (_a = Memory.offices[office].franchises[source]) === null || _a === void 0 ? void 0 : _a.lastActive) !== null && _b !== void 0 ? _b : 0) + 2000 > Game.time &&
                !franchiseIsThreatened(office, source);
        })
            .sort((a, b) => { var _a, _b, _c, _d; return ((_b = (_a = main_21(office + a)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = main_21(office + b)) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0); })
            .flatMap(source => {
            return plannedFranchiseRoads(office, source);
        }))
    ];
}

const creepStats = (creeps) => {
    return creeps.reduce((sum, creep) => {
        sum.count += 1;
        creep.body.forEach(p => {
            sum.hits += p.hits;
            if (p.hits) {
                if (p.type === HEAL) {
                    let heal = HEAL_POWER;
                    if (p.boost) {
                        heal *= BOOSTS[HEAL][p.boost].heal;
                    }
                    sum.heal += heal;
                }
                else if (p.type === ATTACK) {
                    let attack = ATTACK_POWER;
                    if (p.boost) {
                        attack *= BOOSTS[ATTACK][p.boost].attack;
                    }
                    sum.attack += attack;
                }
                else if (p.type === RANGED_ATTACK) {
                    let rangedAttack = ATTACK_POWER;
                    if (p.boost) {
                        rangedAttack *= BOOSTS[RANGED_ATTACK][p.boost].rangedAttack;
                    }
                    sum.rangedAttack += rangedAttack;
                }
            }
        });
        return sum;
    }, { count: 0, hits: 0, heal: 0, attack: 0, rangedAttack: 0 });
};

var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["NONE"] = "NONE";
    ThreatLevel["UNKNOWN"] = "UNKNOWN";
    ThreatLevel["UNOWNED"] = "UNOWNED";
    ThreatLevel["REMOTE"] = "REMOTE";
    ThreatLevel["OWNED"] = "OWNED";
    ThreatLevel["FRIENDLY"] = "FRIENDLY";
    ThreatLevel["MIDNIGHT"] = "MIDNIGHT"; // The Man with the Golden Face
})(ThreatLevel || (ThreatLevel = {}));
// TODO: Update with threat from towers
const calculateThreatLevel = (room) => {
    const controller = Game.rooms[room].controller;
    const hostiles = totalCreepStats(findHostileCreeps(room));
    // No controller, no hostile creeps
    if (!controller) {
        if (hostiles.count === 0)
            return [ThreatLevel.NONE, 0];
        return [ThreatLevel.UNOWNED, hostiles.score];
    }
    // Source keeper room - actively harvested or not?
    if (isSourceKeeperRoom(room)) {
        if (hostiles.harvest) {
            return [ThreatLevel.REMOTE, hostiles.score];
        }
        else {
            return [ThreatLevel.UNOWNED, hostiles.score];
        }
    }
    // Unowned room - actively harvested or not?
    if (!controller.owner) {
        if (controller.reservation &&
            (WHITELIST.includes(controller.reservation.username) || controller.reservation.username === 'LordGreywether')) {
            return [ThreatLevel.FRIENDLY, hostiles.score]; // Friendly remote
        }
        else if (hostiles.harvest || controller.reservation) {
            return [ThreatLevel.REMOTE, hostiles.score];
        }
        else {
            return [ThreatLevel.UNOWNED, hostiles.score];
        }
    }
    // Owned room - friendly?
    if (controller.my || (WHITELIST.includes(controller.owner.username))) {
        return [ThreatLevel.FRIENDLY, hostiles.score];
    }
    // Then it's hostile
    return [ThreatLevel.OWNED, hostiles.score];
};
const calculateDefensiveThreatLevel = memoizeByTick(office => office, (office) => {
    return creepStats(findHostileCreeps(office)).attack;
});

const getExtensions = (room, includeFastfiller = true) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const plan = roomPlans(room);
    if (!plan)
        return [];
    return []
        .concat(includeFastfiller ? (_b = (_a = plan.fastfiller) === null || _a === void 0 ? void 0 : _a.extensions) !== null && _b !== void 0 ? _b : [] : [], (_d = (_c = plan.franchise1) === null || _c === void 0 ? void 0 : _c.extensions) !== null && _d !== void 0 ? _d : [], (_f = (_e = plan.franchise2) === null || _e === void 0 ? void 0 : _e.extensions) !== null && _f !== void 0 ? _f : [], (_g = plan.headquarters) === null || _g === void 0 ? void 0 : _g.extension, (_j = (_h = plan.extensions) === null || _h === void 0 ? void 0 : _h.extensions) !== null && _j !== void 0 ? _j : [], (_l = (_k = plan.backfill) === null || _k === void 0 ? void 0 : _k.extensions) !== null && _l !== void 0 ? _l : [])
        .filter((s) => !!s);
};
const getEnergyStructures = memoizeByTick(room => room, (room) => {
    var _a;
    const plan = roomPlans(room);
    if (!plan)
        return [];
    const structures = getExtensions(room)
        .map(s => s === null || s === void 0 ? void 0 : s.structure)
        .concat(getSpawns(room))
        .filter(s => s);
    if ((_a = Memory.rooms[room].rclMilestones) === null || _a === void 0 ? void 0 : _a[rcl(room) + 1]) {
        // Room is downleveled
        return structures.filter(e => e.isActive());
    }
    return structures;
});

const plannedStructuresByRcl = (roomName, targetRcl) => {
    if (Memory.offices[roomName]) {
        return plannedOfficeStructuresByRcl(roomName, targetRcl);
    }
    else {
        return plannedTerritoryStructures(roomName);
    }
};
const plannedTerritoryStructures = (territoryName) => {
    var _a, _b;
    const plans = roomPlans(territoryName);
    return [(_a = plans === null || plans === void 0 ? void 0 : plans.franchise1) === null || _a === void 0 ? void 0 : _a.container, (_b = plans === null || plans === void 0 ? void 0 : plans.franchise2) === null || _b === void 0 ? void 0 : _b.container].filter(s => s);
};
// memoize(
//   (officeName: string, targetRcl?: number) =>
//     `${officeName}_${targetRcl}_${Object.values(Memory.roomPlans[officeName] ?? {}).filter(v => !!v).length}`,
const plannedOfficeStructuresByRcl = (officeName, targetRcl) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24;
    const plans = roomPlans(officeName);
    const rcl = targetRcl !== null && targetRcl !== void 0 ? targetRcl : (_b = (_a = Game.rooms[officeName]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.level;
    if (!rcl || !plans)
        return [];
    let energyStructures = [];
    let defensiveStructures = [];
    let plannedStructures = [];
    let plannedExtensions = getExtensions(officeName);
    // Sort already constructed structures to the top
    plannedExtensions = plannedExtensions.filter(e => e.structure).concat(plannedExtensions.filter(e => !e.structure));
    let plannedTowers = [].concat((_d = (_c = plans.backfill) === null || _c === void 0 ? void 0 : _c.towers.filter(t => t.structure)) !== null && _d !== void 0 ? _d : [], (_f = (_e = plans.backfill) === null || _e === void 0 ? void 0 : _e.towers.filter(t => !t.structure)) !== null && _f !== void 0 ? _f : []);
    // first, build the further of the library link or the fastfiller link
    plans.library &&
        plans.fastfiller &&
        plans.headquarters &&
        plans.library.link.pos.getRangeTo(plans.headquarters.link.pos) >
            plans.fastfiller.link.pos.getRangeTo(plans.headquarters.link.pos);
    if (rcl >= 0) {
        plannedStructures = [];
        energyStructures = [];
        defensiveStructures = [];
    }
    if (rcl >= 1) {
        energyStructures = energyStructures.concat((_g = plans.fastfiller) === null || _g === void 0 ? void 0 : _g.spawns[0]);
    }
    if (rcl >= 2) {
        energyStructures = energyStructures.concat((_j = (_h = plans.fastfiller) === null || _h === void 0 ? void 0 : _h.containers) !== null && _j !== void 0 ? _j : [], plannedExtensions.slice(0, 5));
    }
    if (rcl >= 2 && rcl < 6) {
        plannedStructures = plannedStructures.concat((_k = plans.library) === null || _k === void 0 ? void 0 : _k.container);
    }
    if (rcl >= 3) {
        energyStructures = energyStructures.concat(plannedExtensions.slice(5, 10), (_l = plans.franchise1) === null || _l === void 0 ? void 0 : _l.container, (_m = plans.franchise2) === null || _m === void 0 ? void 0 : _m.container);
        defensiveStructures = defensiveStructures.concat(plannedTowers.slice(0, 1));
    }
    if (rcl >= 4) {
        energyStructures = energyStructures.concat(plannedExtensions.slice(10, 20), (_o = plans.headquarters) === null || _o === void 0 ? void 0 : _o.storage);
        const ramparts = [
            (_q = (_p = plans.franchise1) === null || _p === void 0 ? void 0 : _p.ramparts) !== null && _q !== void 0 ? _q : [],
            (_s = (_r = plans.perimeter) === null || _r === void 0 ? void 0 : _r.ramparts) !== null && _s !== void 0 ? _s : [],
            (_u = (_t = plans.extensions) === null || _t === void 0 ? void 0 : _t.ramparts) !== null && _u !== void 0 ? _u : [],
            (_w = (_v = plans.franchise2) === null || _v === void 0 ? void 0 : _v.ramparts) !== null && _w !== void 0 ? _w : []
        ]
            .flat()
            .sort((a, b) => { var _a, _b; return (!((_a = a.structure) === null || _a === void 0 ? void 0 : _a.hits) ? -1 : !((_b = b.structure) === null || _b === void 0 ? void 0 : _b.hits) ? 1 : a.structure.hits - b.structure.hits); });
        defensiveStructures = defensiveStructures.concat(ramparts);
    }
    if (rcl >= 5) {
        energyStructures = energyStructures.concat(plannedExtensions.slice(20, 30));
        defensiveStructures = defensiveStructures.concat(plannedTowers.slice(1, 2));
        plannedStructures = plannedStructures.concat([(_x = plans.library) === null || _x === void 0 ? void 0 : _x.link], [(_y = plans.headquarters) === null || _y === void 0 ? void 0 : _y.link]);
    }
    if (rcl >= 6) {
        energyStructures = energyStructures.concat(plannedExtensions.slice(30, 40), [(_z = plans.fastfiller) === null || _z === void 0 ? void 0 : _z.link]);
        plannedStructures = plannedStructures.concat([(_0 = plans.headquarters) === null || _0 === void 0 ? void 0 : _0.terminal], [(_1 = plans.mine) === null || _1 === void 0 ? void 0 : _1.extractor], [(_2 = plans.mine) === null || _2 === void 0 ? void 0 : _2.container]);
    }
    if (rcl >= 7) {
        energyStructures = energyStructures.concat(plannedExtensions.slice(40, 50), (_3 = plans.fastfiller) === null || _3 === void 0 ? void 0 : _3.spawns[1], (_4 = plans.franchise2) === null || _4 === void 0 ? void 0 : _4.link);
        defensiveStructures = defensiveStructures.concat(plannedTowers.slice(2, 3));
        plannedStructures = plannedStructures.concat((_6 = (_5 = plans.labs) === null || _5 === void 0 ? void 0 : _5.labs.slice(0, 6)) !== null && _6 !== void 0 ? _6 : [], (_7 = plans.headquarters) === null || _7 === void 0 ? void 0 : _7.factory);
    }
    if (rcl === 8) {
        energyStructures = energyStructures.concat(plannedExtensions.slice(50, 60), (_8 = plans.fastfiller) === null || _8 === void 0 ? void 0 : _8.spawns[2], (_9 = plans.franchise1) === null || _9 === void 0 ? void 0 : _9.link);
        defensiveStructures = defensiveStructures.concat(plannedTowers.slice(3, 6));
        plannedStructures = plannedStructures.concat((_11 = (_10 = plans.labs) === null || _10 === void 0 ? void 0 : _10.labs.slice(6, 10)) !== null && _11 !== void 0 ? _11 : [], (_12 = plans.headquarters) === null || _12 === void 0 ? void 0 : _12.nuker, (_13 = plans.headquarters) === null || _13 === void 0 ? void 0 : _13.powerSpawn, (_14 = plans.backfill) === null || _14 === void 0 ? void 0 : _14.observer);
    }
    // Roads are at the end of the energy structures priority queue
    if (rcl >= 3) {
        energyStructures = energyStructures.concat((_16 = (_15 = plans.fastfiller) === null || _15 === void 0 ? void 0 : _15.roads) !== null && _16 !== void 0 ? _16 : [], (_18 = (_17 = plans.headquarters) === null || _17 === void 0 ? void 0 : _17.roads) !== null && _18 !== void 0 ? _18 : [], (_20 = (_19 = plans.extensions) === null || _19 === void 0 ? void 0 : _19.roads) !== null && _20 !== void 0 ? _20 : [], (_22 = (_21 = plans.roads) === null || _21 === void 0 ? void 0 : _21.roads) !== null && _22 !== void 0 ? _22 : [], plannedActiveFranchiseRoads(officeName));
    }
    if (rcl >= 7) {
        plannedStructures = plannedStructures.concat((_24 = (_23 = plans.labs) === null || _23 === void 0 ? void 0 : _23.roads) !== null && _24 !== void 0 ? _24 : []);
    }
    if (calculateDefensiveThreatLevel(officeName) > 0) {
        // defensive structures have priority
        plannedStructures = [...defensiveStructures, ...energyStructures, ...plannedStructures];
    }
    else {
        // energy structures have priority
        plannedStructures = [...energyStructures, ...defensiveStructures, ...plannedStructures];
    }
    // if (rcl >= 4) {
    //     // No ramparts on roads, walls, ramparts, extractors, or extensions
    //     // Perimeter extensions have ramparts already
    //     const nonRampartedStructures: StructureConstant[] = [STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_EXTRACTOR, STRUCTURE_EXTENSION]
    //     for (let s of plannedStructures) {
    //         if (!nonRampartedStructures.includes(s.structureType)) {
    //             plannedStructures.push(new PlannedStructure(s.pos, STRUCTURE_RAMPART))
    //         }
    //     }
    // }
    return [...new Set(plannedStructures.filter(isPlannedStructure()))];
};

let scanned = {};
const scanRoomPlanStructures = ({ room, office }) => {
    var _a, _b, _c, _d;
    if (!office)
        return;
    const structures = (_a = Game.rooms[room]) === null || _a === void 0 ? void 0 : _a.find(FIND_STRUCTURES).length;
    (_d = (_c = (_b = Game.rooms[room]) === null || _b === void 0 ? void 0 : _b.controller) === null || _c === void 0 ? void 0 : _c.level) !== null && _d !== void 0 ? _d : 0;
    if (Game.rooms[room] && (scanned[room] !== structures || Game.time % 50 === 0)) {
        scanned[room] = structures;
        for (let s of plannedStructuresByRcl(room, 8)) {
            s.survey();
        }
        for (let s of plannedActiveFranchiseRoads(room)) {
            s.survey();
        }
    }
};

var TerritoryIntent;
(function (TerritoryIntent) {
    TerritoryIntent["AVOID"] = "AVOID";
    TerritoryIntent["ACQUIRE"] = "ACQUIRE";
    TerritoryIntent["DEFEND"] = "DEFEND";
    TerritoryIntent["EXPLOIT"] = "EXPLOIT";
    TerritoryIntent["IGNORE"] = "IGNORE";
    TerritoryIntent["PLUNDER"] = "PLUNDER";
})(TerritoryIntent || (TerritoryIntent = {}));
const getTerritoryIntent = (roomName) => {
    var _a, _b, _c, _d, _e, _f, _g;
    let controller = controllerId(roomName);
    let sources = sourceIds(roomName);
    const hostiles = Game.time - ((_b = (_a = Memory.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.lastHostileSeen) !== null && _b !== void 0 ? _b : 0) <= 10;
    if (!controller) {
        return TerritoryIntent.IGNORE;
    }
    if ((_d = (_c = Memory.rooms[roomName]) === null || _c === void 0 ? void 0 : _c.plunder) === null || _d === void 0 ? void 0 : _d.resources.length) {
        return TerritoryIntent.PLUNDER;
    }
    if (((_e = Memory.rooms[roomName]) === null || _e === void 0 ? void 0 : _e.owner) &&
        !((_g = (_f = Game.rooms[roomName]) === null || _f === void 0 ? void 0 : _f.controller) === null || _g === void 0 ? void 0 : _g.my)
    // (Memory.rooms[roomName]?.reserver && Memory.rooms[roomName]?.reserver !== 'LordGreywether' && Memory.rooms[roomName]?.reserver !== 'Invader')
    ) {
        return TerritoryIntent.AVOID;
    }
    else if (hostiles && Memory.offices[roomName]) {
        // Owned Office has hostiles present, recently
        return TerritoryIntent.DEFEND;
    }
    else if (sources.length > 0) {
        return TerritoryIntent.EXPLOIT;
    }
    else {
        return TerritoryIntent.IGNORE;
    }
};

const getRoomPathDistance = memoize((room1, room2) => [room1, room2].sort().join(''), (room1, room2) => {
    const newRoute = Game.map.findRoute(room1, room2, {
        routeCallback: room => (getTerritoryIntent(room) === TerritoryIntent.AVOID ? Infinity : 0)
    });
    if (newRoute === -2)
        return undefined;
    return newRoute.length;
});

const getTerritoriesByOffice = (office) => {
    var _a, _b;
    recalculateTerritories();
    return (_b = (_a = Memory.offices[office]) === null || _a === void 0 ? void 0 : _a.territories) !== null && _b !== void 0 ? _b : [];
};
let lastCalculatedTick = 0;
function recalculateTerritories() {
    var _a;
    var _b;
    // if (Game.cpu.bucket < 500) return; // don't recalculate with low bucket
    if (Game.time - lastCalculatedTick < 50)
        return; // run once every 50 ticks
    lastCalculatedTick = Game.time;
    for (const office in Memory.offices) {
        const targets = calculateNearbyRooms(office, TERRITORY_RADIUS, false).filter(t => {
            var _a, _b, _c, _d;
            return Memory.rooms[t] &&
                !isSourceKeeperRoom(t) &&
                !Memory.offices[t] &&
                ((_a = getRoomPathDistance(office, t)) !== null && _a !== void 0 ? _a : Infinity) < TERRITORY_RADIUS + 1 &&
                getClosestOfficeFromMemory(t) === office &&
                ((_b = Memory.rooms[t].threatLevel) === null || _b === void 0 ? void 0 : _b[0]) !== ThreatLevel.OWNED &&
                !Memory.rooms[t].owner &&
                ((_d = (_c = Memory.rooms[t].threatLevel) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : 0) <= THREAT_TOLERANCE.remote[rcl(office)];
        });
        Memory.offices[office].territories = [];
        (_a = (_b = Memory.offices[office]).franchises) !== null && _a !== void 0 ? _a : (_b.franchises = {});
        targets.forEach(t => {
            var _a;
            Memory.rooms[t].office = office;
            (_a = Memory.offices[office].territories) === null || _a === void 0 ? void 0 : _a.push(t);
        });
    }
}

const remoteFranchises = (office) => {
    const territories = getTerritoriesByOffice(office);
    return territories.flatMap(room => sourceIds(room).map(source => ({ source, room })));
};

const franchisesByOffice = (officeName) => {
    return sourceIds(officeName)
        .map(source => ({
        source,
        room: officeName,
        remote: false
    }))
        .concat(remoteFranchises(officeName).map(f => (Object.assign(Object.assign({}, f), { remote: true }))));
};

const RANGED_HEAL_RANGE = 3;
const HEAL_RANGE = 1;
const UPGRADE_CONTROLLER_COST = 1;
({
    0: 0,
    1: CONSTRUCTION_COST[STRUCTURE_SPAWN],
    2: CONSTRUCTION_COST[STRUCTURE_EXTENSION] * 5 + CONSTRUCTION_COST[STRUCTURE_CONTAINER] * 2,
    3: CONSTRUCTION_COST[STRUCTURE_EXTENSION] * 5 + CONSTRUCTION_COST[STRUCTURE_TOWER],
    4: CONSTRUCTION_COST[STRUCTURE_EXTENSION] * 10 +
        CONSTRUCTION_COST[STRUCTURE_STORAGE] +
        BARRIER_LEVEL[4] * 20 * REPAIR_COST,
    5: CONSTRUCTION_COST[STRUCTURE_EXTENSION] * 10 +
        CONSTRUCTION_COST[STRUCTURE_TOWER] +
        CONSTRUCTION_COST[STRUCTURE_LINK] * 2 +
        (BARRIER_LEVEL[5] - BARRIER_LEVEL[4]) * 20 * REPAIR_COST,
    6: CONSTRUCTION_COST[STRUCTURE_EXTENSION] * 10 +
        CONSTRUCTION_COST[STRUCTURE_LINK] +
        CONSTRUCTION_COST[STRUCTURE_TERMINAL] +
        CONSTRUCTION_COST[STRUCTURE_EXTRACTOR] +
        CONSTRUCTION_COST[STRUCTURE_CONTAINER] +
        CONSTRUCTION_COST[STRUCTURE_LAB] * 3 +
        (BARRIER_LEVEL[6] - BARRIER_LEVEL[5]) * 20 * REPAIR_COST,
    7: CONSTRUCTION_COST[STRUCTURE_EXTENSION] * 10 +
        CONSTRUCTION_COST[STRUCTURE_SPAWN] +
        CONSTRUCTION_COST[STRUCTURE_TOWER] +
        CONSTRUCTION_COST[STRUCTURE_LAB] * 3 +
        100000 + // CONSTRUCTION_COST[STRUCTURE_FACTORY] + // Constant doesn't work in private server?
        (BARRIER_LEVEL[7] - BARRIER_LEVEL[6]) * 20 * REPAIR_COST,
    8: CONSTRUCTION_COST[STRUCTURE_EXTENSION] * 10 +
        CONSTRUCTION_COST[STRUCTURE_SPAWN] +
        CONSTRUCTION_COST[STRUCTURE_TOWER] * 3 +
        CONSTRUCTION_COST[STRUCTURE_LAB] * 4 +
        CONSTRUCTION_COST[STRUCTURE_POWER_SPAWN] +
        (BARRIER_LEVEL[8] - BARRIER_LEVEL[7]) * 20 * REPAIR_COST
});
/**
 * From https://github.com/screepers/screeps-snippets/blob/master/src/globals/JavaScript/resourceColors.js
 */
const RES_COLORS = {
    H: '#989898',
    O: '#989898',
    U: '#48C5E5',
    L: '#24D490',
    K: '#9269EC',
    Z: '#D9B478',
    X: '#F26D6F',
    energy: '#FEE476',
    battery: '#FEE476',
    power: '#F1243A',
    ops: '#F1243A',
    reductant: '#989898',
    oxidant: '#989898',
    utrium_bar: '#48C5E5',
    lemergium_bar: '#24D490',
    keanium_bar: '#9269EC',
    zynthium_bar: '#D9B478',
    purifier: '#F26D6F',
    OH: '#B4B4B4',
    ZK: '#B4B4B4',
    UL: '#B4B4B4',
    G: '#FFFFFF',
    ghodium_melt: '#FFFFFF',
    composite: '#FFFFFF',
    crystal: '#FFFFFF',
    liquid: '#FFFFFF',
    UH: '#50D7F9',
    UO: '#50D7F9',
    KH: '#A071FF',
    KO: '#A071FF',
    LH: '#00F4A2',
    LO: '#00F4A2',
    ZH: '#FDD388',
    ZO: '#FDD388',
    GH: '#FFFFFF',
    GO: '#FFFFFF',
    UH2O: '#50D7F9',
    UHO2: '#50D7F9',
    KH2O: '#A071FF',
    KHO2: '#A071FF',
    LH2O: '#00F4A2',
    LHO2: '#00F4A2',
    ZH2O: '#FDD388',
    ZHO2: '#FDD388',
    GH2O: '#FFFFFF',
    GHO2: '#FFFFFF',
    XUH2O: '#50D7F9',
    XUHO2: '#50D7F9',
    XKH2O: '#A071FF',
    XKHO2: '#A071FF',
    XLH2O: '#00F4A2',
    XLHO2: '#00F4A2',
    XZH2O: '#FDD388',
    XZHO2: '#FDD388',
    XGH2O: '#FFFFFF',
    XGHO2: '#FFFFFF',
    metal: '#956F5C',
    alloy: '#956F5C',
    tube: '#956F5C',
    fixtures: '#956F5C',
    frame: '#956F5C',
    hydraulics: '#956F5C',
    machine: '#956F5C',
    biomass: '#84B012',
    cell: '#84B012',
    phlegm: '#84B012',
    tissue: '#84B012',
    muscle: '#84B012',
    organoid: '#84B012',
    organism: '#84B012',
    silicon: '#4DA7E5',
    wire: '#4DA7E5',
    switch: '#4DA7E5',
    transistor: '#4DA7E5',
    microchip: '#4DA7E5',
    circuit: '#4DA7E5',
    device: '#4DA7E5',
    mist: '#DA6BF5',
    condensate: '#DA6BF5',
    concentrate: '#DA6BF5',
    extract: '#DA6BF5',
    spirit: '#DA6BF5',
    emanation: '#DA6BF5',
    essence: '#DA6BF5'
};
const RESOURCE_INGREDIENTS = {
    [RESOURCE_HYDROXIDE]: [RESOURCE_HYDROGEN, RESOURCE_OXYGEN],
    [RESOURCE_ZYNTHIUM_KEANITE]: [RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM],
    [RESOURCE_UTRIUM_LEMERGITE]: [RESOURCE_UTRIUM, RESOURCE_LEMERGIUM],
    [RESOURCE_GHODIUM]: [RESOURCE_ZYNTHIUM_KEANITE, RESOURCE_UTRIUM_LEMERGITE],
    [RESOURCE_UTRIUM_HYDRIDE]: [RESOURCE_UTRIUM, RESOURCE_HYDROGEN],
    [RESOURCE_UTRIUM_OXIDE]: [RESOURCE_UTRIUM, RESOURCE_OXYGEN],
    [RESOURCE_KEANIUM_HYDRIDE]: [RESOURCE_KEANIUM, RESOURCE_HYDROGEN],
    [RESOURCE_KEANIUM_OXIDE]: [RESOURCE_KEANIUM, RESOURCE_OXYGEN],
    [RESOURCE_LEMERGIUM_HYDRIDE]: [RESOURCE_LEMERGIUM, RESOURCE_HYDROGEN],
    [RESOURCE_LEMERGIUM_OXIDE]: [RESOURCE_LEMERGIUM, RESOURCE_OXYGEN],
    [RESOURCE_ZYNTHIUM_HYDRIDE]: [RESOURCE_ZYNTHIUM, RESOURCE_HYDROGEN],
    [RESOURCE_ZYNTHIUM_OXIDE]: [RESOURCE_ZYNTHIUM, RESOURCE_OXYGEN],
    [RESOURCE_GHODIUM_HYDRIDE]: [RESOURCE_GHODIUM, RESOURCE_HYDROGEN],
    [RESOURCE_GHODIUM_OXIDE]: [RESOURCE_GHODIUM, RESOURCE_OXYGEN],
    [RESOURCE_UTRIUM_ACID]: [RESOURCE_UTRIUM_HYDRIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_UTRIUM_ALKALIDE]: [RESOURCE_UTRIUM_OXIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_KEANIUM_ACID]: [RESOURCE_KEANIUM_HYDRIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_KEANIUM_ALKALIDE]: [RESOURCE_KEANIUM_OXIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_LEMERGIUM_ACID]: [RESOURCE_LEMERGIUM_HYDRIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_LEMERGIUM_ALKALIDE]: [RESOURCE_LEMERGIUM_OXIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_ZYNTHIUM_ACID]: [RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_ZYNTHIUM_ALKALIDE]: [RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_GHODIUM_ACID]: [RESOURCE_GHODIUM_HYDRIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_GHODIUM_ALKALIDE]: [RESOURCE_GHODIUM_OXIDE, RESOURCE_HYDROXIDE],
    [RESOURCE_CATALYZED_UTRIUM_ACID]: [RESOURCE_UTRIUM_ACID, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_UTRIUM_ALKALIDE]: [RESOURCE_UTRIUM_ALKALIDE, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_KEANIUM_ACID]: [RESOURCE_KEANIUM_ACID, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_KEANIUM_ALKALIDE]: [RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_LEMERGIUM_ACID]: [RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]: [RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_ZYNTHIUM_ACID]: [RESOURCE_ZYNTHIUM_ACID, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE]: [RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_GHODIUM_ACID]: [RESOURCE_GHODIUM_ACID, RESOURCE_CATALYST],
    [RESOURCE_CATALYZED_GHODIUM_ALKALIDE]: [RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYST]
};
const MINERALS = [
    RESOURCE_HYDROGEN,
    RESOURCE_OXYGEN,
    RESOURCE_UTRIUM,
    RESOURCE_LEMERGIUM,
    RESOURCE_KEANIUM,
    RESOURCE_ZYNTHIUM,
    RESOURCE_CATALYST
];
const BOOSTS_BY_INTENT = {
    ATTACK: [RESOURCE_UTRIUM_HYDRIDE, RESOURCE_UTRIUM_ACID, RESOURCE_CATALYZED_UTRIUM_ACID],
    HARVEST: [RESOURCE_UTRIUM_OXIDE, RESOURCE_UTRIUM_ALKALIDE, RESOURCE_CATALYZED_UTRIUM_ALKALIDE],
    CARRY: [RESOURCE_KEANIUM_HYDRIDE, RESOURCE_KEANIUM_ACID, RESOURCE_CATALYZED_KEANIUM_ACID],
    RANGED_ATTACK: [RESOURCE_KEANIUM_OXIDE, RESOURCE_KEANIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ALKALIDE],
    BUILD: [RESOURCE_LEMERGIUM_HYDRIDE, RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ACID],
    REPAIR: [RESOURCE_LEMERGIUM_HYDRIDE, RESOURCE_LEMERGIUM_ACID, RESOURCE_CATALYZED_LEMERGIUM_ACID],
    HEAL: [RESOURCE_LEMERGIUM_OXIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE],
    RANGED_HEAL: [RESOURCE_LEMERGIUM_OXIDE, RESOURCE_LEMERGIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE],
    DISMANTLE: [RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_ZYNTHIUM_ACID, RESOURCE_CATALYZED_ZYNTHIUM_ACID],
    MOVE: [RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE],
    UPGRADE: [RESOURCE_GHODIUM_HYDRIDE, RESOURCE_GHODIUM_ACID, RESOURCE_CATALYZED_GHODIUM_ACID],
    TOUGH: [RESOURCE_GHODIUM_OXIDE, RESOURCE_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_GHODIUM_ALKALIDE]
};

const buyMarketPrice = memoizeByTick((resourceType) => resourceType, (resourceType) => Math.min(...Game.market.getAllOrders({ type: ORDER_SELL, resourceType }).map(o => o.price), Infinity));
const buyMarketEnergyPrice = memoizeByTick((resourceType) => resourceType, (resourceType) => {
    const energyPrice = buyMarketPrice(RESOURCE_ENERGY);
    const resourcePrice = buyMarketPrice(resourceType);
    if (energyPrice === Infinity || energyPrice === 0)
        return resourcePrice;
    return resourcePrice / energyPrice;
});
const sellMarketPrice = memoizeByTick((resourceType) => resourceType, (resourceType) => Math.max(...Game.market.getAllOrders({ type: ORDER_BUY, resourceType }).map(o => o.price), 0));
let currentOrder;
let currentRoom;
global.appraise = (type, resourceType, room) => {
    let bestOrder;
    let bestCost;
    for (const order of Game.market.getAllOrders({ type, resourceType })) {
        if (!order.roomName)
            continue;
        const energyCost = Game.market.calcTransactionCost(order.amount, order.roomName, room);
        const totalCost = (energyCost * buyMarketPrice(RESOURCE_ENERGY)) / order.amount + order.price;
        if (!bestCost || totalCost < bestCost) {
            bestCost = totalCost;
            bestOrder = order;
        }
    }
    currentOrder = bestOrder;
    currentRoom = room;
    console.log('Best price:', JSON.stringify(bestOrder));
    console.log('Net cost:', bestCost);
    console.log('Use completeOrder() to seal the deal');
};
global.completeOrder = (amount) => {
    if (!currentOrder || !currentRoom) {
        console.log('No order pending');
        return;
    }
    console.log('Ordering:', JSON.stringify(currentOrder), 'for room', currentRoom);
    const result = Game.market.deal(currentOrder.id, amount !== null && amount !== void 0 ? amount : currentOrder.amount, currentRoom);
    console.log('Order result:', result);
};
global.buyOrder = (resourceType, totalAmount, roomName, maxPrice) => {
    const sellPrice = sellMarketPrice(resourceType) + 0.1;
    if (maxPrice !== undefined && sellPrice > maxPrice) {
        console.log('maxPrice', maxPrice, 'is greater than ideal buy price', sellPrice);
        return;
    }
    const price = Math.min(maxPrice !== null && maxPrice !== void 0 ? maxPrice : Infinity, sellPrice + 0.1);
    const result = Game.market.createOrder({ type: ORDER_BUY, resourceType, price, totalAmount, roomName });
    console.log(`Placed order for ${totalAmount} ${resourceType} at ${price} credits to ${roomName}: ${result}`);
};
global.myOrders = () => {
    for (const key in Game.market.orders) {
        console.log(JSON.stringify(Game.market.orders[key]));
    }
};

const boostCost = (boost) => {
    let buyPrice = buyMarketEnergyPrice(boost);
    // get cost of ingredients
    if (!RESOURCE_INGREDIENTS[boost]) {
        return buyPrice; // no ingredients to make it ourselves
    }
    const [ingredient1, ingredient2] = RESOURCE_INGREDIENTS[boost];
    return Math.min(buyPrice, boostCost(ingredient1) + boostCost(ingredient2));
};

const minionCost = (body) => {
    return body.reduce((sum, p) => sum + BODYPART_COST[p], 0);
};
const buildCost = (body, boosts) => {
    return minionCost(body) + boosts.reduce((sum, { type, count }) => sum + count * boostCost(type), 0); // TODO: Add boost costs
};
const maxBuildCost = (builds) => {
    return Math.max(...builds.map(b => buildCost(b.body, b.boosts)), 0);
};
const minionCostPerTick = (body) => {
    const lifetime = body.includes(CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
    return minionCost(body) / lifetime;
};
const creepCost = (creep) => {
    return minionCost(creep.body.map(p => p.type));
};
const creepCostPerTick = (creep) => {
    return minionCostPerTick(creep.body.map(p => p.type));
};

function buildFromSegment(energy, segment, opts = {}) {
    if (segment.length === 0 || energy === 0)
        return [];
    const actualOpts = Object.assign({ maxSegments: Infinity, sorted: false, suffix: [] }, opts);
    energy -= minionCost(actualOpts.suffix);
    const segmentCost = minionCost(segment);
    if (energy < segmentCost) {
        console.log('Minion builder error:', energy, 'not enough for segment', JSON.stringify(segment));
        return [];
    }
    const segmentCount = Math.min(Math.floor(energy / segmentCost), Math.floor((50 - actualOpts.suffix.length) / segment.length), actualOpts.maxSegments);
    const body = new Array(segmentCount).fill(segment).flat();
    if (actualOpts.sorted)
        body.sort().reverse();
    body.push(...actualOpts.suffix);
    return body;
}
const unboosted = (body) => [
    {
        body,
        boosts: [],
        tier: 0,
        cost: buildCost(body, [])
    }
];
const atLeastTier = (tier) => (build) => build.tier >= tier;
const isTier = (tier) => (build) => build.tier === tier;

const buildAccountant = memoize(
// Memoizes at 50-energy increments
(energy, maxSegments = 25, roads = false, repair = false) => `${Math.round((energy * 2) / 100)} ${maxSegments} ${roads}`, (energy, maxSegments = 25, roads = false, repair = false) => {
    const suffix = energy < 350 ? [] : repair ? (roads ? [WORK, CARRY, MOVE] : [WORK, MOVE]) : [];
    if (energy < 100 || maxSegments === 0) {
        return [];
    }
    else if (energy < 5600) {
        // Before we have two spawns, create smaller haulers
        if (!roads) {
            return unboosted(buildFromSegment(energy, [CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13), suffix }));
        }
        else {
            return unboosted(buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13), suffix }));
        }
    }
    else {
        if (!roads) {
            return unboosted(buildFromSegment(energy, [CARRY, MOVE], { maxSegments, suffix }));
        }
        else {
            return unboosted(buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments, suffix }));
        }
    }
});

var States;
(function (States) {
    States["GET_ENERGY"] = "GET_ENERGY";
    States["GET_ENERGY_FRANCHISE"] = "GET_ENERGY_FRANCHISE";
    States["GET_ENERGY_STORAGE"] = "GET_ENERGY_STORAGE";
    States["GET_ENERGY_LINK"] = "GET_ENERGY_LINK";
    States["GET_ENERGY_SOURCE"] = "GET_ENERGY_SOURCE";
    States["GET_ENERGY_RUINS"] = "GET_ENERGY_RUINS";
    States["WORKING"] = "WORKING";
    States["FIND_WITHDRAW"] = "FIND_WITHDRAW";
    States["WITHDRAW"] = "WITHDRAW";
    States["FIND_DEPOSIT"] = "FIND_DEPOSIT";
    States["DEPOSIT"] = "DEPOSIT";
    States["DONE"] = "DONE";
    States["FILL_TOWERS"] = "FILL_TOWERS";
    States["FILL_LEGAL"] = "FILL_LEGAL";
    States["FILL_LABS"] = "FILL_LABS";
    States["EMPTY_LABS"] = "EMPTY_LABS";
    States["RENEW"] = "RENEW";
    States["GET_BOOSTED"] = "GET_BOOSTED";
    States["RECYCLE"] = "RECYCLE";
    States["FIND_WORK"] = "FIND_WORK";
    States["BUILDING"] = "BUILDING";
    States["UPGRADING"] = "UPGRADING";
    States["DEFEND"] = "DEFEND";
})(States || (States = {}));

const getBoosted = (nextState) => ({ office }, creep) => {
    var _a, _b;
    // Check if boosts are completed
    const boosts = creep.body.reduce((map, part) => {
        var _a;
        if (part.boost)
            map.set(part.boost, ((_a = map.get(part.boost)) !== null && _a !== void 0 ? _a : 0) + LAB_BOOST_MINERAL);
        return map;
    }, new Map());
    const outstanding = (_b = (_a = Memory.offices[office].lab.boosts
        .find(o => o.name === creep.name)) === null || _a === void 0 ? void 0 : _a.boosts.filter(b => { var _a; return ((_a = boosts.get(b.type)) !== null && _a !== void 0 ? _a : 0) < b.count; })) !== null && _b !== void 0 ? _b : [];
    // We don't need to check count, only completeness
    if (outstanding.length === 0) {
        // All boosts accounted for, we're done
        Memory.offices[office].lab.boosts = Memory.offices[office].lab.boosts.filter(o => o.name !== creep.name);
        // console.log(office, 'Boosted creep', creep.name, 'with', creep.ticksToLive, 'ticks remaining');
        return nextState;
    }
    // We still have some boosts outstanding
    const targetLab = Memory.offices[office].lab.boostingLabs.find(l => {
        const targetBoost = outstanding.find(b => b.type === l.resource);
        if (!targetBoost)
            return false;
        const lab = byId(l.id);
        if ((lab === null || lab === void 0 ? void 0 : lab.mineralType) !== targetBoost.type || lab.store.getUsedCapacity(lab.mineralType) < targetBoost.count)
            return false;
        return true;
    });
    const lab = byId(targetLab === null || targetLab === void 0 ? void 0 : targetLab.id);
    if (lab) {
        main_26(creep, { pos: lab.pos, range: 1 });
        if (creep.pos.inRangeTo(lab, 1)) {
            lab.boostCreep(creep);
            // console.log(creep.name, lab.mineralType, 'result', result);
        }
    }
    return States.GET_BOOSTED;
};

const recycle = (data, creep) => {
    var _a, _b, _c, _d;
    const recycleTarget = (_b = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.fastfiller) === null || _b === void 0 ? void 0 : _b.containers[0].pos;
    const recycleSpawn = (_d = (_c = roomPlans(data.office)) === null || _c === void 0 ? void 0 : _c.fastfiller) === null || _d === void 0 ? void 0 : _d.spawns[0].structure;
    if (!recycleTarget || !recycleSpawn) {
        // oh well, we tried
        creep.suicide();
        return States.RECYCLE;
    }
    viz(creep.pos.roomName).line(creep.pos, recycleTarget, { color: 'red' });
    main_26(creep, { pos: recycleTarget, range: 0 });
    if (creep.pos.isEqualTo(recycleTarget))
        recycleSpawn.recycleCreep(creep);
    return States.RECYCLE;
};

const getLabs = (office) => {
    var _a, _b, _c;
    const labs = (_c = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.labs) === null || _b === void 0 ? void 0 : _b.labs) !== null && _c !== void 0 ? _c : [];
    const boostLabs = labs.filter(l => Memory.offices[office].lab.boostingLabs.some(b => b.id === l.structureId));
    const reactionLabs = labs.filter(l => !boostLabs.includes(l));
    return {
        inputs: reactionLabs.slice(0, 2),
        outputs: reactionLabs.slice(2),
        boosts: boostLabs,
    };
};

function boostLabsToEmpty(office) {
    return getLabs(office)
        .boosts.map(lab => lab.structure)
        .filter((lab) => {
        var _a;
        if (!lab)
            return false;
        const target = (_a = Memory.offices[office].lab.boostingLabs.find(o => o.id === lab.id)) === null || _a === void 0 ? void 0 : _a.resource;
        const actual = lab.mineralType;
        return Boolean(actual && actual !== target);
    });
}
function reactionLabsToEmpty(office) {
    var _a, _b;
    const order = Memory.offices[office].lab.orders.find(o => o.amount > 0);
    const { inputs, outputs } = getLabs(office);
    const outputLabs = outputs.map(s => s.structure).filter((s) => !!(s === null || s === void 0 ? void 0 : s.mineralType));
    const [lab1, lab2] = inputs.map(s => s.structure);
    const labs = outputLabs;
    if ((lab1 === null || lab1 === void 0 ? void 0 : lab1.mineralType) &&
        (lab1.mineralType !== (order === null || order === void 0 ? void 0 : order.ingredient1) || ((_a = lab1 === null || lab1 === void 0 ? void 0 : lab1.store.getUsedCapacity(lab1.mineralType)) !== null && _a !== void 0 ? _a : 0) < 5))
        labs.push(lab1);
    if ((lab2 === null || lab2 === void 0 ? void 0 : lab2.mineralType) &&
        ((lab2 === null || lab2 === void 0 ? void 0 : lab2.mineralType) !== (order === null || order === void 0 ? void 0 : order.ingredient2) || ((_b = lab2 === null || lab2 === void 0 ? void 0 : lab2.store.getUsedCapacity(lab2.mineralType)) !== null && _b !== void 0 ? _b : 0) < 5))
        labs.push(lab2);
    return labs;
}

const cache = new Map();
const registerScientists = (office, creeps) => {
    cache.set(office, creeps.map(c => c.name));
};
const getScientists = (office) => {
    var _a;
    const creeps = ((_a = cache.get(office)) !== null && _a !== void 0 ? _a : []).map(name => Game.creeps[name]).filter(c => !!c);
    registerScientists(office, creeps);
    return creeps;
};

function boostLabsToFill(office) {
    return getLabs(office)
        .boosts.map(lab => lab.structure)
        .filter((lab) => {
        if (!lab)
            return false;
        const boost = lab.mineralType;
        const [boostNeeded, quantity] = boostsNeededForLab(office, lab.id);
        return !boost || (boost == boostNeeded && lab.store.getUsedCapacity(boostNeeded) < (quantity !== null && quantity !== void 0 ? quantity : 0));
    });
}
function boostsNeededForLab(office, labId) {
    var _a, _b, _c;
    const resource = (_a = Memory.offices[office].lab.boostingLabs.find(l => l.id === labId)) === null || _a === void 0 ? void 0 : _a.resource;
    if (!resource || !labId)
        return [];
    const boostOrders = Memory.offices[office].lab.boosts;
    let boostCount = 0;
    for (const order of boostOrders) {
        // Subtract any already-boosted parts from the orders
        const c = Game.creeps[order.name];
        let orderResources = (_c = (_b = order.boosts.find(boost => boost.type === resource)) === null || _b === void 0 ? void 0 : _b.count) !== null && _c !== void 0 ? _c : 0;
        if (!c)
            continue;
        c.body.forEach(part => {
            if (part.boost === resource)
                orderResources -= LAB_BOOST_MINERAL;
        });
        boostCount += Math.max(0, orderResources);
    }
    // Cap at amount actually available in local economy
    boostCount = Math.min(boostCount, boostsAvailable(office, resource, false, true), LAB_MINERAL_CAPACITY);
    return [resource, boostCount];
}
function shouldHandleBoosts(office) {
    return boostLabsToEmpty(office).length > 0 || boostLabsToFill(office).length > 0;
}
/**
 * Sum of boosts in labs, Scientist inventories, and Terminal
 */
function boostsAvailable(office, boost, subtractReserved = true, countLabs = true) {
    var _a, _b, _c, _d;
    let total = (_d = (_c = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure) === null || _c === void 0 ? void 0 : _c.store.getUsedCapacity(boost)) !== null && _d !== void 0 ? _d : 0;
    total += getScientists(office).reduce((sum, creep) => sum + creep.store.getUsedCapacity(boost), 0);
    if (countLabs) {
        total += getLabs(office).boosts.reduce((sum, lab) => { var _a, _b; return ((_b = (_a = lab.structure) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity(boost)) !== null && _b !== void 0 ? _b : 0) + sum; }, 0);
    }
    if (subtractReserved) {
        total -= Memory.offices[office].lab.boosts.reduce((sum, o) => { var _a, _b; return sum + ((_b = (_a = o.boosts.find(b => b.type === boost)) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0); }, 0);
    }
    return total;
}

/**
 * Given a list of minions, each of which is a list of CreepBuilds, pick the
 * tier of boosts that is available for all minions and has the cheapest cost.
 */
function bestBuildTier(office, minions) {
    // lists every tier that is available for all minions
    const tiers = minions[0].map(m => m.tier).filter(t => minions.every(m => m.some(b => b.tier === t)));
    if (tiers.length === 0) {
        return undefined;
    }
    if (minions.length > 1)
        console.log('evaluating multiple minions for office', office);
    // collect minions by tier
    const minionsByTier = tiers.reduce((byTier, t) => {
        byTier[t] = minions.map(m => m.find(b => b.tier === t));
        return byTier;
    }, {});
    // check if boosts are available for each tier
    const availableTiers = tiers.filter(t => {
        const boostsNeeded = minionsByTier[t]
            .flatMap(m => m.boosts)
            .reduce((needed, b) => {
            var _a;
            var _b;
            (_a = needed[_b = b.type]) !== null && _a !== void 0 ? _a : (needed[_b] = 0);
            needed[b.type] += b.count;
            return needed;
        }, {});
        return Object.entries(boostsNeeded).every(([type, count]) => boostsAvailable(office, type, true) >= count * LAB_BOOST_MINERAL);
    });
    // find the cheapest tier
    return availableTiers.reduce((best, t) => {
        const cost = minions.reduce((sum, m) => sum + m.find(b => b.tier === t).cost, 0);
        if (minions.length > 1)
            console.log('tier', t, 'cost', cost, 'best', best.cost);
        return cost < best.cost ? { tier: t, cost } : best;
    }, { tier: 0, cost: Infinity }).tier;
}
/**
 * Returns the build with the highest tier that has available boosts
 */
function bestTierAvailable(office, builds) {
    const bestBuild = builds.reduce((best, build) => {
        if (!best) {
            return build;
        }
        if (build.tier < best.tier) {
            return best;
        }
        const boostsNeeded = build.boosts.reduce((needed, b) => {
            var _a;
            var _b;
            (_a = needed[_b = b.type]) !== null && _a !== void 0 ? _a : (needed[_b] = 0);
            needed[b.type] += b.count;
            return needed;
        }, {});
        const available = Object.entries(boostsNeeded).every(([type, count]) => boostsAvailable(office, type, true) >= count);
        return available ? build : best;
    }, undefined);
    if (bestBuild)
        return [bestBuild];
    console.log('No builds available:');
    for (const build of builds) {
        console.log(JSON.stringify(build));
    }
    return [];
}

const buildPowerbankAttacker = () => {
    const builds = [];
    const tiers = [
        { tough: 2, attack: 38, move: 10, tier: 3 },
        { tough: 3, attack: 34, move: 13, tier: 2 },
        { tough: 3, attack: 30, move: 17, tier: 1 },
        { tough: 0, attack: 22, move: 28, tier: 0 }
    ];
    for (const { tough, attack, move, tier } of tiers) {
        const body = [].concat(Array(tough).fill(TOUGH), Array(move).fill(MOVE), Array(attack).fill(ATTACK));
        const boosts = tier
            ? [
                { type: BOOSTS_BY_INTENT.TOUGH[tier - 1], count: tough },
                { type: BOOSTS_BY_INTENT.ATTACK[tier - 1], count: attack },
                { type: BOOSTS_BY_INTENT.MOVE[tier - 1], count: move }
            ]
            : [];
        //
        builds.push({
            body,
            boosts,
            tier,
            cost: buildCost(body, boosts)
        });
    }
    return builds;
};
const buildPowerbankHealer = () => {
    const builds = [];
    const tiers = [
        { heal: 38, move: 10, tier: 3 },
        { heal: 35, move: 11, tier: 2 },
        { heal: 33, move: 16, tier: 1 },
        { heal: 28, move: 22, tier: 0 }
    ];
    for (const { heal, move, tier } of tiers) {
        const body = [].concat(Array(move).fill(MOVE), Array(heal).fill(HEAL));
        const boosts = tier
            ? [
                { type: BOOSTS_BY_INTENT.HEAL[tier - 1], count: heal },
                { type: BOOSTS_BY_INTENT.MOVE[tier - 1], count: move }
            ]
            : [];
        builds.push({
            body,
            boosts,
            tier,
            cost: buildCost(body, boosts)
        });
    }
    return builds;
};

var MinionTypes;
(function (MinionTypes) {
    MinionTypes["ACCOUNTANT"] = "ACCOUNTANT";
    MinionTypes["CLERK"] = "CLERK";
    MinionTypes["ENGINEER"] = "ENGINEER";
    MinionTypes["PAVER"] = "PAVER";
    MinionTypes["FOREMAN"] = "FOREMAN";
    MinionTypes["GUARD"] = "GUARD";
    MinionTypes["AUDITOR"] = "AUDITOR";
    MinionTypes["LAWYER"] = "LAWYER";
    MinionTypes["RESEARCH"] = "PARALEGAL";
    MinionTypes["SALESMAN"] = "SALESMAN";
    MinionTypes["MARKETER"] = "MARKETER";
    MinionTypes["BLINKY"] = "BLINKY";
    MinionTypes["MEDIC"] = "MEDIC";
    MinionTypes["POWER_BANK_ATTACKER"] = "PBA";
    MinionTypes["POWER_BANK_HEALER"] = "PBH";
})(MinionTypes || (MinionTypes = {}));

var _a$1;
const overhead = new Array(500).fill((_a$1 = Memory.overhead) !== null && _a$1 !== void 0 ? _a$1 : 0);
let missionCpu = 0;
function recordMissionCpu(cpu) {
    missionCpu = cpu;
}
function recordOverhead() {
    const cpuUsed = Game.cpu.getUsed();
    overhead.push(Math.max(0, cpuUsed - missionCpu));
    overhead.shift();
    Memory.overhead = cpuOverhead();
}
function cpuOverhead() {
    return overhead.reduce((a, b) => a + b, 0) / overhead.length;
}

const cpuEstimatePeriod = () => 10000 / Game.cpu.limit;
const missionCpuAvailable = (office) => {
    const baseCpu = Math.max(0, (Game.cpu.bucket - 500 + (Game.cpu.limit - cpuOverhead()) * cpuEstimatePeriod()) * 0.5);
    const offices = Object.keys(Memory.offices).length;
    return baseCpu / offices;
};

/**
 * Returns true if creep doesn't need to be replaced
 * Can filter a list of creeps to those that don't need to be replaced
 */
const prespawnByArrived = (creep) => creep.ticksToLive === undefined || creep.memory.arrived === undefined || creep.ticksToLive > creep.memory.arrived;
/**
 * Set arrived timestamp, if not already set
 */
const setArrived = (creep) => {
    const lifetime = creep.body.some(p => p.type === CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
    if (!creep.memory.arrived && creep.ticksToLive) {
        creep.memory.arrived = lifetime - creep.ticksToLive; // creep life time
    }
};

function getWithdrawLimit(office, budget) {
    return getBudgetAdjustment(office, budget);
}
var Budget;
(function (Budget) {
    Budget["ESSENTIAL"] = "ESSENTIAL";
    Budget["ECONOMY"] = "ECONOMY";
    Budget["EFFICIENCY"] = "EFFICIENCY";
    Budget["SURPLUS"] = "SURPLUS";
})(Budget || (Budget = {}));
/**
 * Sets capacity threshold for different mission types, to make sure certain
 * missions can spawn only when storage levels are high enough - storage must
 * have `capacity` + `missionCost` to spawn mission
 */
function getBudgetAdjustment(office, budget) {
    var _a, _b;
    if (!((_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.structure)) {
        // No storage yet - minimal capacities enforced, except for income missions
        if ([Budget.ESSENTIAL, Budget.ECONOMY].includes(budget)) {
            return -Infinity;
        }
        else if ([Budget.SURPLUS].includes(budget)) {
            return Game.rooms[office].energyCapacityAvailable;
        }
        else {
            return 0;
        }
    }
    else if (rcl(office) < 8) {
        // Storage allows more fine-grained capacity management
        if ([Budget.ESSENTIAL, Budget.ECONOMY].includes(budget)) {
            return -Infinity;
        }
        else if ([Budget.EFFICIENCY].includes(budget)) {
            return Game.rooms[office].energyCapacityAvailable * (rcl(office) / 2);
        }
        else if ([Budget.SURPLUS].includes(budget)) {
            return 100000;
        }
        else {
            return 60000;
        }
    }
    else {
        // At RCL8 we bump up the storage reservoir
        if ([Budget.ESSENTIAL, Budget.ECONOMY].includes(budget)) {
            return -Infinity;
        }
        else if ([Budget.EFFICIENCY].includes(budget)) {
            return 60000;
        }
        else if ([Budget.SURPLUS].includes(budget)) {
            return 200000;
        }
        else {
            return 100000;
        }
    }
}

const heapMetrics = {};

var main = createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, '__esModule', { value: true });

// Borrowed from https://github.com/voodoocreation/ts-deepmerge
// istanbul ignore next
var isObject = function (obj) {
    if (typeof obj === "object" && obj !== null) {
        if (typeof Object.getPrototypeOf === "function") {
            var prototype = Object.getPrototypeOf(obj);
            return prototype === Object.prototype || prototype === null;
        }
        return Object.prototype.toString.call(obj) === "[object Object]";
    }
    return false;
};
var deepMerge = function () {
    var objects = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objects[_i] = arguments[_i];
    }
    return objects.reduce(function (result, current) {
        Object.keys(current).forEach(function (key) {
            if (Array.isArray(result[key]) && Array.isArray(current[key])) {
                result[key] = Array.from(new Set(result[key].concat(current[key])));
            }
            else if (isObject(result[key]) && isObject(current[key])) {
                result[key] = deepMerge(result[key], current[key]);
            }
            else {
                result[key] = current[key];
            }
        });
        return result;
    }, {});
};

var roomVisual = new RoomVisual();
var setRoom = function (room) {
    roomVisual = new RoomVisual(room);
};
var viz = function () { return roomVisual; };

var defaultConfig = {};
function Dashboard(params) {
    var widgets = params.widgets, config = params.config;
    var mergedConfig = config ? deepMerge(defaultConfig, config) : defaultConfig;
    setRoom(mergedConfig.room);
    widgets.forEach(function (widget) {
        widget.widget({
            pos: widget.pos,
            width: widget.width,
            height: widget.height
        });
    });
}

function ConfiguredWidget(defaultConfig, handler) {
    return function (generator) {
        return function (props) {
            var _a = (typeof generator === 'object') ? generator : generator(), data = _a.data, config = _a.config;
            var mergedConfig = config ? deepMerge(defaultConfig, config) : defaultConfig;
            handler({
                data: data,
                config: mergedConfig,
                renderConfig: props
            });
        };
    };
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || from);
}

var Bar = ConfiguredWidget({
    label: '',
    style: {
        fill: 'white',
        stroke: 'white',
        lineStyle: 'solid'
    }
}, function (_a) {
    var _b;
    var data = _a.data, config = _a.config, renderConfig = _a.renderConfig;
    var height = renderConfig.height, width = renderConfig.width, pos = renderConfig.pos;
    var value = data.value, maxValue = data.maxValue;
    var effectiveMax = Math.max(value, maxValue !== null && maxValue !== void 0 ? maxValue : 0);
    var valueHeight = Math.max(effectiveMax !== 0 ? (value / effectiveMax) * (height - 1) : 0, 0.1);
    var maxValueHeight = Math.max(effectiveMax !== 0 ? ((maxValue !== null && maxValue !== void 0 ? maxValue : value) / effectiveMax) * (height - 1) : 0, 0.1);
    // Draw labels
    var center = pos.x + width / 2;
    viz().text(config.label, center, pos.y + height);
    viz().text((_b = maxValue === null || maxValue === void 0 ? void 0 : maxValue.toFixed(0)) !== null && _b !== void 0 ? _b : '', center, pos.y + 1);
    viz().text(value.toFixed(0), center, pos.y + height - 1.5);
    // Draw bar, scaled
    viz().rect(pos.x, pos.y + (height - maxValueHeight - 1), width, maxValueHeight, __assign(__assign({}, config.style), { fill: 'transparent' }));
    viz().rect(pos.x, pos.y + (height - valueHeight - 1), width, valueHeight, __assign(__assign({}, config.style), { stroke: 'transparent' }));
});

/**
 * A simple grid that splits space evenly between widgets. If more widgets are provided than
 * will fit, the remaining widgets are silently ignored.
 */
var Grid = ConfiguredWidget({
    padding: 1,
    rows: 2,
    columns: 2,
}, function (_a) {
    var widgets = _a.data, config = _a.config, renderConfig = _a.renderConfig;
    var padding = config.padding, rows = config.rows, columns = config.columns;
    var height = renderConfig.height, width = renderConfig.width, pos = renderConfig.pos;
    var widgetHeight = (height - (padding * (rows - 1))) / rows;
    var widgetWidth = (width - (padding * (columns - 1))) / columns;
    for (var q = 0; q < columns; q++) {
        for (var r = 0; r < rows; r++) {
            if (!widgets[q + (r * columns)])
                break;
            widgets[q + (r * columns)]({
                pos: {
                    x: pos.x + (widgetWidth + padding) * q,
                    y: pos.y + (widgetHeight + padding) * r,
                },
                width: widgetWidth,
                height: widgetHeight,
            });
        }
    }
});

var Rectangle = ConfiguredWidget({
    padding: 1,
    style: {
        fill: 'black',
        stroke: 'white',
        opacity: 0.3,
        lineStyle: 'solid'
    }
}, function (_a) {
    var data = _a.data, config = _a.config, renderConfig = _a.renderConfig;
    var padding = config.padding, style = config.style;
    var pos = renderConfig.pos, width = renderConfig.width, height = renderConfig.height;
    viz().rect(pos.x, pos.y, width, height, style);
    data({
        pos: {
            x: pos.x + padding,
            y: pos.y + padding,
        },
        width: width - (2 * padding),
        height: height - (2 * padding)
    });
});

var Table = ConfiguredWidget({
    headers: [],
}, function (_a) {
    var data = _a.data, config = _a.config, renderConfig = _a.renderConfig;
    var label = config.label, headers = config.headers;
    var pos = renderConfig.pos, height = renderConfig.height, width = renderConfig.width;
    var labelHeight = (label ? 1 : 0);
    var rows = data.slice(0, height - labelHeight);
    var columnWidths = headers.map(function (header, index) {
        var width = Math.max(header.length, rows.reduce(function (maxWidth, row) { return Math.max(maxWidth, row[index].toString().length); }, 0), 1);
        return width;
    });
    var columnWidthSum = columnWidths.reduce(function (a, b) { return (a + b); }, 0);
    var columnOffsets = [0];
    columnWidths.forEach(function (colWidth, index) {
        columnOffsets.push((width * (colWidth / columnWidthSum)) + columnOffsets[index]);
    });
    // Draw label
    if (label) {
        viz().text(label, (pos.x + width / 2), pos.y);
    }
    // Draw headers
    headers.forEach(function (header, index) {
        viz().text(header, pos.x + columnOffsets[index], pos.y + labelHeight, { align: 'left' });
    });
    // Draw body
    rows.forEach(function (row, rowIndex) {
        row.forEach(function (cell, columnIndex) {
            viz().text(cell, pos.x + columnOffsets[columnIndex], pos.y + 1 + labelHeight + rowIndex, { align: 'left' });
        });
    });
});

var Label = ConfiguredWidget({
    style: {
        color: 'white',
        align: 'center'
    }
}, function (_a) {
    var _b;
    var data = _a.data, config = _a.config, renderConfig = _a.renderConfig;
    // Draw labels
    var pos = renderConfig.pos, height = renderConfig.height, width = renderConfig.width;
    var fontSize = ((_b = config.style.font) !== null && _b !== void 0 ? _b : 0.7);
    var baseline = typeof fontSize === 'number' ? fontSize / 3 : 0.25;
    var x;
    var y;
    if (config.style.align === 'left') {
        x = pos.x;
        y = pos.y + height / 2 + baseline;
    }
    else if (config.style.align === 'right') {
        x = pos.x + width;
        y = pos.y + height / 2 + baseline;
    }
    else {
        x = pos.x + width / 2;
        y = pos.y + height / 2 + baseline;
    }
    viz().text(data, x, y, config.style);
});

/**
 * Given a Record of series data, calculates the appropriate scale to contain all data
 */
var calculateScaleFromSeries = function (chartSeriesData) {
    var initialScale = {
        x: { min: Infinity, max: -Infinity },
        y: { min: Infinity, max: -Infinity },
    };
    return Object.values(chartSeriesData).reduce(function (results, series) {
        var data = Array.isArray(series) ? series : series.values;
        var seriesBounds = data.reduce(function (seriesResults, row) {
            return {
                x: {
                    min: Math.min(seriesResults.x.min, row[0]),
                    max: Math.max(seriesResults.x.max, row[0])
                },
                y: {
                    min: Math.min(seriesResults.y.min, row[1]),
                    max: Math.max(seriesResults.y.max, row[1])
                }
            };
        }, initialScale);
        return {
            x: {
                min: Math.min(seriesBounds.x.min, results.x.min),
                max: Math.max(seriesBounds.x.max, results.x.max),
            },
            y: {
                min: Math.min(seriesBounds.y.min, results.y.min),
                max: Math.max(seriesBounds.y.max, results.y.max),
            }
        };
    }, initialScale);
};
var scaleToChartSpace = function (scale, coords) {
    return {
        x: Math.min(1, Math.max(0, (coords[0] - scale.x.min) / (scale.x.max - scale.x.min))),
        y: Math.min(1, Math.max(0, (coords[1] - scale.y.min) / (scale.y.max - scale.y.min))),
    };
};
/**
 * (0,0) corresponds to the bottom left of chart space, but top left of room space
 */
var chartSpaceToRoomPosition = function (x, y, width, height, chartSpaceCoords) {
    return [
        x + width * chartSpaceCoords.x,
        y + height - (height * chartSpaceCoords.y)
    ];
};

var randomWebColor = function () { return (['red', 'yellow', 'lime', 'green', 'aqua', 'teal', 'blue', 'fuchsia', 'purple'][Math.round(Math.random() * 9)]); };
/**
 * A simple line chart that can plot multiple series.
 */
var LineChart = ConfiguredWidget({
    label: '',
    style: {
        fill: 'black',
        stroke: 'white',
        lineStyle: 'solid',
        opacity: 0.7
    },
    series: {}
}, function (_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    var chartSeriesData = _a.data, config = _a.config, renderConfig = _a.renderConfig;
    var width = renderConfig.width, height = renderConfig.height, pos = renderConfig.pos;
    var series = Object.keys(chartSeriesData).sort();
    // Draw labels
    var center = pos.x + width / 2;
    viz().text(config.label, center, pos.y + height);
    // Draw Chart, scaled
    viz().rect(pos.x + 1, pos.y, width - 1, height - 1, config.style);
    // Calculate bounds of chart
    var calculatedScale = calculateScaleFromSeries(chartSeriesData);
    var mergedScale = {
        x: {
            min: (_d = (_c = (_b = config === null || config === void 0 ? void 0 : config.scale) === null || _b === void 0 ? void 0 : _b.x) === null || _c === void 0 ? void 0 : _c.min) !== null && _d !== void 0 ? _d : calculatedScale.x.min,
            max: (_g = (_f = (_e = config === null || config === void 0 ? void 0 : config.scale) === null || _e === void 0 ? void 0 : _e.x) === null || _f === void 0 ? void 0 : _f.max) !== null && _g !== void 0 ? _g : calculatedScale.x.max,
        },
        y: {
            min: (_k = (_j = (_h = config === null || config === void 0 ? void 0 : config.scale) === null || _h === void 0 ? void 0 : _h.y) === null || _j === void 0 ? void 0 : _j.min) !== null && _k !== void 0 ? _k : calculatedScale.y.min,
            max: (_o = (_m = (_l = config === null || config === void 0 ? void 0 : config.scale) === null || _l === void 0 ? void 0 : _l.y) === null || _m === void 0 ? void 0 : _m.max) !== null && _o !== void 0 ? _o : calculatedScale.y.max,
        }
    };
    // Display axes and labels, if configured
    var labelCount = series.length;
    series.forEach(function (s, index) {
        var _a, _b;
        var _c, _d;
        // Generate series config, if needed
        (_a = (_c = config.series)[s]) !== null && _a !== void 0 ? _a : (_c[s] = {
            label: s,
        });
        (_b = (_d = config.series[s]).color) !== null && _b !== void 0 ? _b : (_d.color = randomWebColor());
        // Draw label
        var labelWidth = ((width - 6) / labelCount);
        var offset = 3 + labelWidth * (index + 0.5);
        viz().text(config.series[s].label, pos.x + offset, pos.y + height, {
            color: config.series[s].color,
        });
    });
    viz().text(mergedScale.x.min.toFixed(0), pos.x + 1.5, pos.y + height);
    viz().text(mergedScale.x.max.toFixed(0), pos.x + width - 0.5, pos.y + height);
    viz().text(mergedScale.y.min.toFixed(0), pos.x, pos.y + height - 1);
    viz().text(mergedScale.y.max.toFixed(0), pos.x, pos.y + 0.5);
    // Display lines
    series.forEach(function (seriesName) {
        var s = chartSeriesData[seriesName];
        var data = Array.isArray(s) ? s : s.values;
        viz().poly(data.map(function (coords) {
            return chartSpaceToRoomPosition(pos.x + 1, pos.y, width - 1, height - 1, scaleToChartSpace(mergedScale, coords));
        }), {
            strokeWidth: 0.1,
            stroke: config.series[seriesName].color,
            opacity: 1
        });
    });
});

var Dial = ConfiguredWidget({
    label: '',
    textStyle: { font: '0.85', },
    foregroundStyle: {
        stroke: 'white',
        strokeWidth: 1,
    },
    backgroundStyle: {
        stroke: '#333333',
        strokeWidth: 1,
    },
}, function (_a) {
    var data = _a.data, config = _a.config, renderConfig = _a.renderConfig;
    var height = renderConfig.height, width = renderConfig.width, pos = renderConfig.pos;
    var value = data.value;
    value = Math.max(0, Math.min(1, value)); // Constrain between 0 and 1
    // Display constants labels
    var RESOLUTION = 16;
    var RANGE = 1.2 * Math.PI;
    var START_ANGLE = (3 * Math.PI - RANGE) / 2;
    var background_increment = RANGE / (RESOLUTION - 1);
    var increment = (RANGE * value) / (RESOLUTION - 1);
    var radius = Math.min(width * (1 / 3), height * (1 / 2));
    var offsetX = pos.x + (width * (1 / 2));
    var offsetY = pos.y + (height + radius / 2) * (1 / 2);
    var background = [];
    for (var i = 0; i < RESOLUTION; i++) {
        background.push([
            (Math.cos(i * background_increment + START_ANGLE) * radius) + offsetX,
            (Math.sin(i * background_increment + START_ANGLE) * radius) + offsetY,
        ]);
    }
    var points = [];
    for (var i = 0; i < RESOLUTION; i++) {
        points.push([
            (Math.cos(i * increment + START_ANGLE) * radius) + offsetX,
            (Math.sin(i * increment + START_ANGLE) * radius) + offsetY,
        ]);
    }
    viz().poly(background, __assign(__assign({}, config.backgroundStyle), { strokeWidth: radius / 2 }));
    viz().poly(points, __assign(__assign({}, config.foregroundStyle), { strokeWidth: radius / 2 }));
    viz().text(config.label, offsetX, offsetY, __assign(__assign({}, config.textStyle), { align: 'center' }));
});

var newTimeseries = function () { return ({ values: [] }); };
var min = function (series, dimension) {
    if (dimension === void 0) { dimension = 1; }
    return series.values.reduce(function (min, item) {
        return (!min || item[dimension] < min[dimension]) ? item : min;
    });
};
var max = function (series, dimension) {
    if (dimension === void 0) { dimension = 1; }
    return series.values.reduce(function (max, item) {
        return (!max || item[dimension] > max[dimension]) ? item : max;
    });
};
var sum = function (series) {
    return series.values.reduce(function (sum, item) {
        return item[1] + sum;
    }, 0);
};
var head = function (series, count) {
    return __assign(__assign({}, series), { values: series.values.slice(0, count) });
};
var tail = function (series, count) {
    return __assign(__assign({}, series), { values: series.values.slice(-count) });
};
var granularity = function (series, ticks) {
    var buckets = new Map();
    series.values.forEach(function (_a) {
        var _b;
        var _c = __read(_a, 2), time = _c[0], value = _c[1];
        var index = Math.floor(time / ticks) * ticks;
        var bucket = (_b = buckets.get(index)) !== null && _b !== void 0 ? _b : [];
        bucket.push(value);
        buckets.set(index, bucket);
    });
    return __assign(__assign({}, series), { values: __spreadArray([], __read(buckets.entries())).map(function (_a) {
            var _b = __read(_a, 2), time = _b[0], values = _b[1];
            return [
                time,
                values.reduce(function (a, b) { return a + b; }, 0) / values.length
            ];
        }) });
};
var avg = function (series) {
    return sum(series) / series.values.length;
};
var last = function (series) {
    return series.values[series.values.length - 1];
};
var timestampValue = function (value) {
    if (Array.isArray(value)) {
        return value;
    }
    return [Game.time, value];
};
var update = function (series, value, limit) {
    series.values.push(timestampValue(value));
    while (limit !== undefined && series.values.length > limit) {
        series.values.shift();
    }
    return series;
};
var updateDelta = function (series, value, limit) {
    var v = timestampValue(value);
    if (series.last === undefined || isNaN(series.last)) {
        series.last = v[1];
    }
    update(series, [v[0], v[1] - series.last], limit);
    series.last = v[1];
    return series;
};
var updateNonNegativeDelta = function (series, value, limit) {
    var v = timestampValue(value);
    if (series.last === undefined || isNaN(series.last)) {
        series.last = v[1];
    }
    update(series, [v[0], Math.max(0, v[1] - series.last)], limit);
    series.last = v[1];
    return series;
};

var Timeseries = /*#__PURE__*/Object.freeze({
    __proto__: null,
    newTimeseries: newTimeseries,
    min: min,
    max: max,
    sum: sum,
    head: head,
    tail: tail,
    granularity: granularity,
    avg: avg,
    last: last,
    update: update,
    updateDelta: updateDelta,
    updateNonNegativeDelta: updateNonNegativeDelta
});

exports.Bar = Bar;
exports.ConfiguredWidget = ConfiguredWidget;
exports.Dashboard = Dashboard;
exports.Dial = Dial;
exports.Grid = Grid;
exports.Label = Label;
exports.LineChart = LineChart;
exports.Metrics = Timeseries;
exports.Rectangle = Rectangle;
exports.Table = Table;

});

unwrapExports(main);
var main_1 = main.Bar;
main.ConfiguredWidget;
var main_3 = main.Dashboard;
var main_4 = main.Dial;
var main_5 = main.Grid;
var main_6 = main.Label;
main.LineChart;
var main_8 = main.Metrics;
var main_9 = main.Rectangle;
var main_10 = main.Table;

const spawnEnergyAvailable = memoizeByTick((room) => room, (room) => {
    var _a, _b, _c;
    return Math.max(300, ((_a = heapMetrics[room]) === null || _a === void 0 ? void 0 : _a.roomEnergy.values.length) ? main_8.max(heapMetrics[room].roomEnergy)[1] : ((_c = (_b = Game.rooms[room]) === null || _b === void 0 ? void 0 : _b.energyCapacityAvailable) !== null && _c !== void 0 ? _c : 0));
});

class BaseCreepSpawner {
    constructor(id, office, props, eventHandlers) {
        this.id = id;
        this.office = office;
        this.props = props;
        this.eventHandlers = eventHandlers;
        this.defaultCpuPerTick = 0.4;
        this.disabled = false;
    }
    spawn(missionId, priority) {
        var _a, _b, _c;
        if (this.disabled)
            return [];
        const builds = this.props.builds(spawnEnergyAvailable(this.office));
        const defaultEstimate = (build) => {
            var _a;
            const lifetime = build.body.includes(CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
            return {
                cpu: ((_a = this.props.estimatedCpuPerTick) !== null && _a !== void 0 ? _a : this.defaultCpuPerTick) * Math.min(cpuEstimatePeriod(), lifetime),
                energy: 0
            };
        };
        const padding = Number(Math.floor(Math.random() * 0xffff))
            .toString(16)
            .padStart(4, '0');
        return [
            Object.assign(Object.assign({}, this.props.spawnData), { priority, office: this.office, budget: (_a = this.props.budget) !== null && _a !== void 0 ? _a : Budget.ESSENTIAL, name: `${missionId}|${padding}`, builds, estimate: (_b = this.props.estimate) !== null && _b !== void 0 ? _b : defaultEstimate, onFailure: reason => {
                    var _a, _b;
                    if (reason === 'NO_BOOSTS') {
                        (_b = (_a = this.eventHandlers) === null || _a === void 0 ? void 0 : _a.onNoBoosts) === null || _b === void 0 ? void 0 : _b.call(_a);
                    }
                }, memory: Object.assign(Object.assign({}, (_c = this.props.spawnData) === null || _c === void 0 ? void 0 : _c.memory), { role: this.props.role, missionId }) })
        ];
    }
    setMemory(memory) {
        this.memory = memory;
    }
    setDisabled(disabled = true) {
        this.disabled = disabled;
    }
    checkOnSpawn(creep, onNew) {
        var _a, _b;
        if (creep.memory.spawned)
            return;
        (_b = (_a = this.eventHandlers) === null || _a === void 0 ? void 0 : _a.onSpawn) === null || _b === void 0 ? void 0 : _b.call(_a, creep);
        onNew === null || onNew === void 0 ? void 0 : onNew();
        creep.memory.spawned = true;
    }
}

class CreepSpawner extends BaseCreepSpawner {
    constructor(id, office, props, eventHandlers) {
        super(id, office, props, eventHandlers);
        this.props = props;
        this.eventHandlers = eventHandlers;
    }
    spawn(missionId, priority) {
        var _a, _b, _c;
        const prespawn = this.props.prespawn && this.resolved && prespawnByArrived(this.resolved);
        if (((_a = this.memory) === null || _a === void 0 ? void 0 : _a.spawned) && !((_c = (_b = this.props).respawn) === null || _c === void 0 ? void 0 : _c.call(_b)))
            return [];
        if (this.resolved && !prespawn)
            return [];
        return super.spawn(missionId, priority);
    }
    get resolved() {
        return this._creep ? Game.creeps[this._creep] : undefined;
    }
    get spawned() {
        var _a;
        return Boolean((_a = this.memory) === null || _a === void 0 ? void 0 : _a.spawned);
    }
    register(creep, onNew) {
        if (this.memory) {
            this.memory.spawned = true;
            this.checkOnSpawn(creep, onNew);
        }
        this._creep = creep.name;
    }
    get died() {
        var _a;
        return ((_a = this.memory) === null || _a === void 0 ? void 0 : _a.spawned) && (!this._creep || !Game.creeps[this._creep]);
    }
    cpuRemaining() {
        var _a, _b, _c;
        return (Math.min(cpuEstimatePeriod(), (_b = (_a = this.resolved) === null || _a === void 0 ? void 0 : _a.ticksToLive) !== null && _b !== void 0 ? _b : Infinity) *
            ((_c = this.props.estimatedCpuPerTick) !== null && _c !== void 0 ? _c : this.defaultCpuPerTick));
    }
}

var MissionStatus;
(function (MissionStatus) {
    MissionStatus["PENDING"] = "PENDING";
    MissionStatus["RUNNING"] = "RUNNING";
    MissionStatus["DONE"] = "DONE";
})(MissionStatus || (MissionStatus = {}));

const MissionEnergyAvailable = {};

const sum = (a, b) => a + b;
const min = (value) => (a, b) => {
    if (!a && b)
        return b;
    if (!b && a)
        return a;
    if (!a || !b)
        return undefined;
    if (value(b) < value(a))
        return b;
    return a;
};

class MultiCreepSpawner extends BaseCreepSpawner {
    constructor(id, office, props, eventHandlers) {
        super(id, office, props, eventHandlers);
        this.props = props;
        this.eventHandlers = eventHandlers;
        this._creeps = [];
    }
    spawn(missionId, priority) {
        const spawnOrders = [];
        for (let i = 0; i < this.props.count(this.resolved); i += 1) {
            spawnOrders.push(...super.spawn(missionId, priority));
        }
        return spawnOrders;
    }
    get resolved() {
        const creeps = this._creeps.map(n => Game.creeps[n]).filter(isCreep);
        this._creeps = creeps.map(c => c.name);
        return creeps;
    }
    register(creep, onNew) {
        if (!this._creeps.includes(creep.name)) {
            this._creeps.push(creep.name);
        }
        this.checkOnSpawn(creep, onNew);
    }
    cpuRemaining() {
        var _a;
        return (this.resolved.reduce((sum, c) => { var _a; return sum + Math.min(cpuEstimatePeriod(), (_a = c.ticksToLive) !== null && _a !== void 0 ? _a : Infinity); }, 0) *
            ((_a = this.props.estimatedCpuPerTick) !== null && _a !== void 0 ? _a : this.defaultCpuPerTick));
    }
}

const singletons = new Map();
function allMissions() {
    return singletons.values();
}
function missionById(id) {
    return singletons.get(id);
}
function cleanMissions() {
    for (const missionId in Memory.missions) {
        if (Memory.missions[missionId].status === MissionStatus.DONE) {
            endAndReportMission(missionId);
        }
    }
}
function purgeOrphanedMissions() {
    for (const missionId in Memory.missions) {
        if (singletons.has(missionId))
            continue;
        endAndReportMission(missionId);
    }
}
function endAndReportMission(missionId) {
    const mission = Memory.missions[missionId];
    if (!mission)
        return;
    // file mission report
    Memory.missionReports.push({
        type: mission.constructor.name,
        duration: Game.time - Memory.missions[missionId].started,
        cpuUsed: Memory.missions[missionId].cpuUsed,
        energyUsed: Memory.missions[missionId].energyUsed,
        finished: Game.time,
        office: mission.data.office
    });
    delete Memory.missions[missionId];
    singletons.delete(missionId);
}
class MissionImplementation {
    constructor(missionData, id) {
        var _a;
        var _b, _c;
        this.missionData = missionData;
        this.creeps = {};
        this.missions = {};
        this.priority = 5;
        this.budget = Budget.ESSENTIAL;
        this.initialized = false;
        this.cpuPerCreep = [];
        const prefix = this.constructor.name
            .split('')
            .filter(c => c === c.toUpperCase())
            .join(''); // Takes uppercase letters as prefix
        const randomString = Number(Math.floor(Math.random() * 0xffff))
            .toString(16)
            .padStart(4, '0');
        this.id = id !== null && id !== void 0 ? id : `${prefix}_${randomString}`;
        const cached = singletons.get(this.id);
        if (cached && Memory.missions[this.id])
            return cached;
        singletons.set(this.id, this);
        (_a = (_b = Memory.missions)[_c = this.id]) !== null && _a !== void 0 ? _a : (_b[_c] = {
            data: missionData,
            started: Game.time,
            status: MissionStatus.PENDING,
            cpuUsed: 0,
            energyUsed: 0,
            energyRemaining: 0,
            missions: {},
            creeps: {}
        });
    }
    get status() {
        var _a;
        return (_a = Memory.missions[this.id]) === null || _a === void 0 ? void 0 : _a.status;
    }
    set status(value) {
        Memory.missions[this.id].status = value;
    }
    get estimatedEnergyRemaining() {
        var _a, _b;
        return (_b = (_a = Memory.missions[this.id]) === null || _a === void 0 ? void 0 : _a.energyRemaining) !== null && _b !== void 0 ? _b : 0;
    }
    set estimatedEnergyRemaining(value) {
        Memory.missions[this.id].energyRemaining = value;
    }
    init() {
        var _a;
        var _b;
        if (this.initialized)
            return;
        // Initialize missions with memory space
        for (const mission in this.missions) {
            const spawner = this.missions[mission];
            (_a = (_b = Memory.missions[this.id].missions)[mission]) !== null && _a !== void 0 ? _a : (_b[mission] = []);
            spawner.register(Memory.missions[this.id].missions[mission]);
        }
        this.initialized = true;
    }
    static fromId(id) {
        if (singletons.has(id))
            return singletons.get(id);
        if (Memory.missions[id])
            return new this(Memory.missions[id].data, id);
        return undefined;
    }
    spawn() {
        if (this.status !== MissionStatus.RUNNING)
            return [];
        const orders = [];
        for (let key in this.creeps) {
            const prop = this.creeps[key];
            orders.push(...prop.spawn(`${this.id}|${prop.id}`, this.priority));
        }
        return orders;
    }
    execute() {
        var _a, _b, _c;
        var _d;
        // Mission Energy Budgeting
        // By default, missions have an ESSENTIAL budget and ignore
        // budget constraints. Giving them another type of budget and
        // setting `estimatedEnergyRemaining` in the constructor will
        // leave the mission as PENDING until there is enough energy
        // in storage.
        if (this.status === MissionStatus.PENDING &&
            ((_a = MissionEnergyAvailable[this.missionData.office]) !== null && _a !== void 0 ? _a : 0) -
                getBudgetAdjustment(this.missionData.office, this.budget) <
                this.estimatedEnergyRemaining) {
            return; // not enough energy to start yet
        }
        // Register (and generate) sub-missions
        this.init();
        const start = Game.cpu.getUsed();
        // clean up mission
        if (this.status === MissionStatus.PENDING) {
            this.onStart();
            // Set status to RUNNING
            this.status = MissionStatus.RUNNING;
        }
        if (this.status === MissionStatus.DONE) {
            this.onEnd();
            return;
        }
        // register ids
        for (const mission in this.missions) {
            this.missions[mission].register((_b = Memory.missions[this.id].missions[mission]) !== null && _b !== void 0 ? _b : []);
        }
        // register spawner memory
        for (const spawner in this.creeps) {
            (_c = (_d = Memory.missions[this.id].creeps)[spawner]) !== null && _c !== void 0 ? _c : (_d[spawner] = {});
            this.creeps[spawner].setMemory(Memory.missions[this.id].creeps[spawner]);
        }
        // spawn and resolve missions
        const resolvedMissions = {};
        try {
            for (const k in this.missions) {
                this.missions[k].spawn();
                resolvedMissions[k] = this.missions[k].resolved;
            }
            // cache ids
            for (const mission in resolvedMissions) {
                const resolved = resolvedMissions[mission];
                if (Array.isArray(resolved)) {
                    Memory.missions[this.id].missions[mission] = resolved.map(m => m.id);
                }
                else if (resolved) {
                    Memory.missions[this.id].missions[mission] = [resolved.id];
                }
                else {
                    Memory.missions[this.id].missions[mission] = [];
                }
            }
        }
        catch (e) {
            console.log('Error spawning missions', this.id, e);
        }
        // resolve creeps
        const resolvedCreeps = {};
        try {
            Object.keys(this.creeps)
                .map(k => ({ key: k, value: this.creeps[k].resolved }))
                .forEach(({ key, value }) => {
                resolvedCreeps[key] = value;
            });
        }
        catch (e) {
            console.log('Error resolving creeps', this.id, e);
        }
        // run logic
        this.run(resolvedCreeps, resolvedMissions, this.missionData);
        // log CPU usage
        const cpuUsed = Math.max(0, Game.cpu.getUsed() - start);
        Memory.missions[this.id].cpuUsed += cpuUsed;
        const cpuPerCreep = cpuUsed / this.creepCount();
        this.cpuPerCreep.push(cpuPerCreep === Infinity ? cpuUsed : cpuPerCreep);
    }
    register(creep) {
        for (let key in this.creeps) {
            const spawner = this.creeps[key];
            if (creep.memory.missionId === `${this.id}|${spawner.id}`) {
                spawner.register(creep, () => this.recordEnergy(minionCost(creep.body.map(p => p.type))));
            }
        }
    }
    run(creeps, missions, data) {
        throw new Error('Not implemented yet');
    }
    onStart() { }
    onEnd() {
        for (const mission in this.missions) {
            const resolved = this.missions[mission].resolved;
            if (resolved) {
                if (Array.isArray(resolved)) {
                    resolved.forEach(m => m.onParentEnd());
                }
                else {
                    resolved.onParentEnd();
                }
            }
        }
    }
    onParentEnd() { }
    cpuRemaining() {
        if (this.status !== MissionStatus.RUNNING)
            return 0;
        return Object.keys(this.creeps).reduce((sum, spawner) => this.creeps[spawner].cpuRemaining() + sum, 0);
    }
    cpuUsed() {
        return Memory.missions[this.id].cpuUsed;
    }
    actualCpuPerCreep() {
        return this.cpuPerCreep.length ? this.cpuPerCreep.reduce(sum, 0) / this.cpuPerCreep.length : 0;
    }
    estimatedCpuPerCreep() {
        var _a;
        if (this.status !== MissionStatus.RUNNING)
            return 0;
        let totalCreeps = 0;
        let totalCpu = 0;
        for (const k in this.creeps) {
            let spawnerInstance = this.creeps[k];
            const creepCount = spawnerInstance instanceof MultiCreepSpawner
                ? spawnerInstance.resolved.length
                : spawnerInstance.resolved
                    ? 1
                    : 0;
            totalCpu += ((_a = spawnerInstance.props.estimatedCpuPerTick) !== null && _a !== void 0 ? _a : spawnerInstance.defaultCpuPerTick) * creepCount;
            totalCreeps += creepCount;
        }
        return totalCreeps ? totalCpu / totalCreeps : totalCpu;
    }
    energyRemaining() {
        if (this.status !== MissionStatus.RUNNING)
            return 0;
        return this.estimatedEnergyRemaining;
    }
    energyUsed() {
        return Memory.missions[this.id].energyUsed;
    }
    recordEnergy(energy) {
        Memory.missions[this.id].energyUsed += energy;
    }
    recordCreepEnergy(creep, adjustEstimated = true) {
        const energy = minionCost(creep.body.map(p => p.type));
        if (adjustEstimated)
            this.estimatedEnergyRemaining = Math.max(0, this.estimatedEnergyRemaining - energy);
    }
    recordMissionEnergy(mission) {
        this.estimatedEnergyRemaining = Math.max(0, this.estimatedEnergyRemaining - mission.estimatedEnergyRemaining);
        // doesn't record energy, as this mission isn't actually the one spending it
    }
    creepCount() {
        return Object.keys(this.creeps)
            .map(k => {
            const spawner = this.creeps[k];
            return spawner instanceof MultiCreepSpawner ? spawner.resolved.length : spawner.resolved ? 1 : 0;
        })
            .reduce(sum, 0);
    }
    toString() {
        return `[${this.constructor.name}:${this.id}]`;
    }
}

const franchiseActive = (office, source, sinceTicks = 1500) => {
    var _a, _b, _c, _d;
    (_b = (_a = posById(source)) === null || _a === void 0 ? void 0 : _a.roomName) !== null && _b !== void 0 ? _b : '';
    const lastHarvested = (_d = (_c = Memory.offices[office]) === null || _c === void 0 ? void 0 : _c.franchises[source]) === null || _d === void 0 ? void 0 : _d.lastActive;
    return lastHarvested && lastHarvested + sinceTicks >= Game.time;
};
const activeFranchises = (office, sinceTicks = 1500) => franchisesByOffice(office).filter(source => franchiseActive(office, source.source, sinceTicks));

const getFranchiseDistance = memoize((office, sourceId) => office + posById(sourceId) + plannedFranchiseRoads(office, sourceId).length, (office, sourceId) => {
    const roads = plannedFranchiseRoads(office, sourceId);
    if (!roads.length)
        return undefined;
    let cost = 0;
    for (const road of roads) {
        cost += road.structureId ? 1 : terrainCostAt(road.pos);
    }
    return cost;
}, 200);

memoizeByTick(office => office, (office) => {
    return (Math.max(10, ...activeFranchises(office).map(franchise => { var _a; return (_a = getFranchiseDistance(office, franchise.source)) !== null && _a !== void 0 ? _a : 0; })) *
        2);
});
const averageActiveFranchiseRoundTripDistance = memoizeByTick(office => office, (office) => {
    const total = activeFranchises(office)
        .map(franchise => { var _a; return (_a = getFranchiseDistance(office, franchise.source)) !== null && _a !== void 0 ? _a : 0; })
        .reduce(sum, 0);
    const average = (Math.max(10, total) * 2) / activeFranchises(office).length;
    return average;
});

function isMission(missionType) {
    return (mission) => mission instanceof missionType;
}
function and(...conditions) {
    return (t) => conditions.every(c => c(t));
}
function or(...conditions) {
    return (t) => conditions.some(c => c(t));
}
function isStatus(status) {
    return (mission) => mission.status === status;
}
function estimateMissionInterval(office) {
    var _a, _b;
    if ((_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.structure) {
        return CREEP_LIFE_TIME;
    }
    else {
        return Math.max(50, averageActiveFranchiseRoundTripDistance(office) * 1.2); // This worked best in my tests to balance income with expenses
    }
}
const missionsByOffice = memoizeByTick(() => '', () => {
    var _a;
    var _b;
    const missions = {};
    for (const mission of allMissions()) {
        (_a = missions[_b = mission.missionData.office]) !== null && _a !== void 0 ? _a : (missions[_b] = []);
        missions[mission.missionData.office].push(mission);
    }
    return missions;
});
const activeMissions = (office) => { var _a; return (_a = missionsByOffice()[office]) !== null && _a !== void 0 ? _a : []; };

class PowerBankDuoMission extends MissionImplementation {
    constructor(missionData, id) {
        var _a;
        super(missionData, id);
        this.missionData = missionData;
        this.budget = Budget.ESSENTIAL;
        this.creeps = {
            attacker: new CreepSpawner('a', this.missionData.office, {
                role: MinionTypes.POWER_BANK_ATTACKER,
                builds: energy => buildPowerbankAttacker().filter(isTier(this.missionData.boostTier))
            }, {
                onSpawn: creep => this.recordCreepEnergy(creep),
                onNoBoosts: () => (this.status = MissionStatus.DONE) // cancel this mission and try a new one
            }),
            healer: new CreepSpawner('b', this.missionData.office, {
                role: MinionTypes.POWER_BANK_HEALER,
                builds: energy => buildPowerbankHealer().filter(isTier(this.missionData.boostTier))
            }, {
                onSpawn: creep => this.recordCreepEnergy(creep),
                onNoBoosts: () => (this.status = MissionStatus.DONE) // cancel this mission and try a new one
            })
        };
        this.priority = 8;
        (_a = this.estimatedEnergyRemaining) !== null && _a !== void 0 ? _a : (this.estimatedEnergyRemaining = maxBuildCost(buildPowerbankAttacker()) + maxBuildCost(buildPowerbankHealer()));
    }
    static fromId(id) {
        return super.fromId(id);
    }
    static costAnalysis(office, report) {
        var _a;
        if (!report.distance)
            return {};
        // Do we have time to crack with multiple unboosted duos?
        const timeRemaining = report.expires - Game.time;
        const unboostedTimeToCrack = CREEP_LIFE_TIME - report.distance;
        const timeToSpawn = 100 * CREEP_SPAWN_TIME;
        const unboostedAttackerBuild = buildPowerbankAttacker().filter(isTier(0));
        const unboostedAttackerDamagePerTick = unboostedAttackerBuild[0].body.reduce((sum, p) => sum + (p === ATTACK ? ATTACK_POWER : 0), 0);
        // underestimates, because spawn time assumes a single spawn instead of three at RCL8
        const maxUnboostedDuos = (timeRemaining - unboostedTimeToCrack) / timeToSpawn;
        const maxDamage = maxUnboostedDuos * unboostedAttackerDamagePerTick * unboostedTimeToCrack;
        const canUseUnboostedDuos = maxDamage >= report.hits;
        // collect viable builds
        const timeToBoost = 200;
        const timeToCrack = CREEP_LIFE_TIME - timeToBoost - report.distance;
        const minTier = [3031, 1112, 654, 439].findIndex(t => t < timeToCrack);
        if (minTier === -1)
            return {}; // if a boosted duo can't crack it, don't bother
        const attackerBuilds = buildPowerbankAttacker().filter(or(atLeastTier(minTier), and(() => canUseUnboostedDuos, isTier(0))));
        const healerBuilds = buildPowerbankHealer().filter(or(atLeastTier(minTier), and(() => canUseUnboostedDuos, isTier(0))));
        // update cost to reflect multiple tier-0 duos
        const duoCountRemaining = Math.ceil(((_a = report.duoCount) !== null && _a !== void 0 ? _a : 1) * (report.hits / POWER_BANK_HITS));
        [...attackerBuilds, ...healerBuilds].forEach(b => {
            if (b.tier === 0)
                b.cost *= duoCountRemaining;
        });
        // get best tier
        const bestTier = bestBuildTier(office, [attackerBuilds, healerBuilds]);
        if (bestTier === undefined)
            return {};
        // get cost to crack
        const costToCrack = maxBuildCost(attackerBuilds.filter(isTier(bestTier))) + maxBuildCost(healerBuilds.filter(atLeastTier(bestTier)));
        return { attackerBuilds, healerBuilds, bestTier, costToCrack };
    }
    report() {
        return Memory.offices[this.missionData.office].powerbanks.find(p => p.id === this.missionData.powerBank);
    }
    assembled() {
        const attacker = this.creeps.attacker.resolved;
        const healer = this.creeps.healer.resolved;
        if (!attacker || !healer)
            return false;
        return getRangeTo(attacker.pos, healer.pos) === 1;
    }
    arrived() {
        const report = this.report();
        const attacker = this.creeps.attacker.resolved;
        if (!attacker || !report)
            return false;
        return getRangeTo(attacker.pos, unpackPos(report.pos)) === 1;
    }
    actualDamageRemaining(ticks = CREEP_LIFE_TIME) {
        if (!this.arrived())
            return 0;
        return this.damageRemaining(ticks);
    }
    damageRemaining(ticks = CREEP_LIFE_TIME) {
        var _a, _b;
        return this.damagePerTick() * Math.min(Math.max(0, ticks), (_b = (_a = this.creeps.attacker.resolved) === null || _a === void 0 ? void 0 : _a.ticksToLive) !== null && _b !== void 0 ? _b : 0);
    }
    damagePerTick() {
        if (!this.creeps.attacker.resolved)
            return 0;
        return combatPower(this.creeps.attacker.resolved).attack;
    }
    onStart() {
        super.onStart();
        console.log('[PowerBankDuoMission] started targeting', unpackPos(this.missionData.powerBankPos));
    }
    onParentEnd() {
        super.onParentEnd();
        this.status = MissionStatus.DONE;
    }
    run(creeps, missions, data) {
        // logCpuStart();
        const { attacker, healer } = creeps;
        const { powerBank: powerBankId } = data;
        if (this.creeps.attacker.died && this.creeps.healer.died) {
            this.status = MissionStatus.DONE;
            return;
        }
        else if (this.creeps.attacker.died || this.creeps.healer.died) {
            attacker === null || attacker === void 0 ? void 0 : attacker.say('broken');
            healer === null || healer === void 0 ? void 0 : healer.say('broken');
            // duo has been broken
            attacker && recycle(this.missionData, attacker);
            healer && recycle(this.missionData, healer);
            return;
        }
        else if ((attacker === null || attacker === void 0 ? void 0 : attacker.memory.runState) === States.GET_BOOSTED || (healer === null || healer === void 0 ? void 0 : healer.memory.runState) === States.GET_BOOSTED) {
            if ((attacker === null || attacker === void 0 ? void 0 : attacker.memory.runState) === States.GET_BOOSTED) {
                attacker.memory.runState = getBoosted(States.WORKING)(data, attacker);
            }
            if ((healer === null || healer === void 0 ? void 0 : healer.memory.runState) === States.GET_BOOSTED) {
                healer.memory.runState = getBoosted(States.WORKING)(data, healer);
            }
            return;
        }
        if (!attacker || !healer)
            return; // wait for both creeps
        // logCpu('setup');
        const powerBank = byId(powerBankId);
        const powerBankPos = unpackPos(this.missionData.powerBankPos);
        const healTarget = healer.hits < healer.hitsMax ? healer : attacker;
        // logCpu('data');
        // movement
        if (getRangeTo(attacker.pos, healer.pos) !== 1) {
            if (!main_22(attacker.pos)) {
                // come together
                main_26(healer, attacker);
            }
            else {
                main_26(attacker, powerBankPos);
                main_26(healer, attacker);
            }
            // logCpu('moving together');
        }
        else {
            // duo is assembled
            if (this.report()) {
                attacker.say('Power!');
                // attacker movement
                main_26(attacker, { pos: powerBankPos, range: 1 });
                // healer movement
                main_18(healer, attacker);
            }
            else {
                attacker.say('Recycling');
                recycle(this.missionData, attacker);
                recycle(this.missionData, healer);
            }
            // logCpu('moving');
            // creep actions
            if (healer && healTarget) {
                if (getRangeTo(healer.pos, healTarget.pos) > 1) {
                    healer.rangedHeal(healTarget);
                }
                else {
                    healer.heal(healTarget);
                }
            }
            if (attacker) {
                // attack target
                if (powerBank)
                    attacker.attack(powerBank);
            }
            // logCpu('attacking');
        }
    }
}

function fastfillerPositions(room, effectiveRcl = rcl(room)) {
    var _a, _b;
    const spawns = (_b = (_a = roomPlans(room)) === null || _a === void 0 ? void 0 : _a.fastfiller) === null || _b === void 0 ? void 0 : _b.spawns;
    if (!spawns)
        return [];
    const [spawn1, spawn2, spawn3] = spawns.map(s => s.pos);
    return [
        new RoomPosition(spawn1.x + 1, spawn1.y, spawn1.roomName),
        new RoomPosition(spawn3.x - 1, spawn3.y - 1, spawn3.roomName),
        new RoomPosition(spawn2.x - 1, spawn2.y, spawn2.roomName),
        new RoomPosition(spawn3.x + 1, spawn3.y - 1, spawn3.roomName)
    ].slice(0, effectiveRcl < 3 ? 2 : undefined); // only fill the first two fastiller positions until RCL3
}
function refillSquares(room) {
    const [topLeft, bottomLeft, topRight, bottomRight] = fastfillerPositions(room, 8).map(p => packPos(p));
    return {
        topLeft,
        bottomLeft,
        topRight,
        bottomRight
    };
}

const logisticsLocationCache = new Map();
const getHeadquarterLogisticsLocation = (office) => {
    var _a, _b;
    if (logisticsLocationCache.has(office))
        return logisticsLocationCache.get(office);
    const plan = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos;
    if (!plan)
        return;
    const pos = new RoomPosition(plan.x + 1, plan.y + 1, plan.roomName);
    if (!pos)
        return;
    logisticsLocationCache.set(office, pos);
    return pos;
};

/**
 * Returns a list of all RoomPositions inside the rampart perimeter
 */
const insidePerimeter = memoize(office => { var _a; return `${office}${!!((_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.perimeter)}`; }, (office) => {
    var _a, _b;
    const ramparts = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts;
    const startingPos = controllerPosition(office);
    if (!Game.rooms[office] || !ramparts || !startingPos)
        return [];
    // Flood fill from startingPos
    const terrain = Game.map.getRoomTerrain(office);
    let inside = [];
    let unvisited = calculateNearbyPositions(startingPos, 1, false);
    let visited = {};
    while (unvisited.length) {
        const next = unvisited.shift();
        if (!next)
            break;
        if (visited[`${next}`])
            continue;
        visited[`${next}`] = true;
        if (terrain.get(next.x, next.y) === TERRAIN_MASK_WALL) {
            continue; // walls are not inside, but visited
        }
        // rampart or inside square
        inside.push(next);
        if (next.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_RAMPART)) {
            continue; // rampart; don't look for neighbors
        }
        unvisited.push(...calculateNearbyPositions(next, 1, false).filter(p => !(`${p}` in visited)));
    }
    return inside;
});
/**
 * Any positions not inside the perimeter, and not walls, are outside
 */
const outsidePerimeter = memoize(office => { var _a; return `${office}${!!((_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.perimeter)}`; }, (office) => {
    const inside = insidePerimeter(office).reduce((index, pos) => {
        index[`${pos}`] = true;
        return index;
    }, {});
    const outside = [];
    const terrain = Game.map.getRoomTerrain(office);
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            if (terrain.get(x, y) === TERRAIN_MASK_WALL)
                continue;
            const pos = new RoomPosition(x, y, office);
            if (`${pos}` in inside)
                continue;
            outside.push(pos);
        }
    }
    return outside;
});
const rampartSections = memoize(office => { var _a, _b, _c; return office + ((_c = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts) === null || _c === void 0 ? void 0 : _c.length); }, (office) => {
    var _a, _b;
    const ramparts = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts;
    if (!(ramparts === null || ramparts === void 0 ? void 0 : ramparts.length))
        return [];
    let groups = [];
    ramparts.forEach(rampart => {
        const existingGroups = groups.filter(g => g.some(c => rampart.pos.getRangeTo(c) <= 1));
        if (existingGroups.length > 1) {
            // Creep merges multiple existing groups
            groups = groups.filter(g => !existingGroups.includes(g));
            groups.push(existingGroups.flat().concat(rampart.pos));
        }
        else {
            if (existingGroups[0]) {
                existingGroups[0].push(rampart.pos);
            }
            else {
                groups.push([rampart.pos]);
            }
        }
    });
    return groups;
});
const closestRampartSection = (pos) => {
    const sections = rampartSections(pos.roomName);
    let closest = undefined;
    let closestDistance = Infinity;
    for (const section of sections) {
        for (const sectionPos of section) {
            const distance = getRangeTo(pos, sectionPos);
            if (distance < closestDistance) {
                closestDistance = distance;
                closest = section;
            }
        }
    }
    return closest;
};

const defaultRouteCallback = (opts) => (room) => {
    var _a, _b;
    if (((_b = (_a = Memory.rooms[room]) === null || _a === void 0 ? void 0 : _a.threatLevel) === null || _b === void 0 ? void 0 : _b[0]) === ThreatLevel.OWNED)
        return Infinity; // avoid owned rooms
    return;
};
const defaultRoomCallback = (opts) => (room) => {
    return getCostMatrix(room, false, opts);
};
main_17.DEFAULT_MOVE_OPTS.routeCallback = defaultRouteCallback();
main_17.DEFAULT_MOVE_OPTS.sourceKeeperRoomCost = Infinity;
main_17.DEFAULT_MOVE_OPTS.roomCallback = defaultRoomCallback();
main_17.DEFAULT_MOVE_OPTS.maxOpsPerRoom = 3000;
const getCostMatrix = memoizeByTick((roomName, avoidCreeps = false, opts = {}) => {
    var _a;
    return `${roomName} ${avoidCreeps ? 'Y' : 'N'} ${JSON.stringify(opts)} ${opts.roomPlan ? Object.keys((_a = Memory.roomPlans[roomName]) !== null && _a !== void 0 ? _a : {}).length : ''}`;
}, (roomName, avoidCreeps = false, opts) => {
    var _a, _b, _c, _d;
    let room = Game.rooms[roomName];
    let costs = new PathFinder.CostMatrix();
    if (opts === null || opts === void 0 ? void 0 : opts.terrain) {
        const terrain = Game.map.getRoomTerrain(roomName);
        for (let x = 0; x < 50; x++) {
            for (let y = 0; y < 50; y++) {
                if (terrain.get(x, y) === TERRAIN_MASK_WALL)
                    costs.set(x, y, 255);
            }
        }
    }
    if (opts === null || opts === void 0 ? void 0 : opts.roomPlan) {
        for (const s of plannedOfficeStructuresByRcl(roomName, 8)) {
            if (OBSTACLE_OBJECT_TYPES.includes(s.structureType)) {
                costs.set(s.pos.x, s.pos.y, 255);
            }
        }
    }
    if (opts === null || opts === void 0 ? void 0 : opts.territoryPlannedRoadsCost) {
        const office = (_a = Memory.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.office;
        if (office) {
            for (const s of activeFranchises(office).flatMap(({ source }) => { var _a; return (_a = main_21(office + source)) !== null && _a !== void 0 ? _a : []; })) {
                if (s.roomName === roomName) {
                    costs.set(s.x, s.y, opts.territoryPlannedRoadsCost);
                }
            }
        }
    }
    if (opts === null || opts === void 0 ? void 0 : opts.roomPlanAllStructures) {
        for (const s of plannedOfficeStructuresByRcl(roomName, 8)) {
            costs.set(s.pos.x, s.pos.y, 255);
        }
    }
    if (!(opts === null || opts === void 0 ? void 0 : opts.ignoreSourceKeepers) && isSourceKeeperRoom(roomName)) {
        // Block out radius of 5 around protected sources
        for (let source of sourcePositions(roomName)) {
            for (let pos of calculateNearbyPositions(source, 5, true)) {
                costs.set(pos.x, pos.y, 255);
            }
        }
        const mineral = mineralPosition(roomName);
        if (mineral) {
            for (let pos of calculateNearbyPositions(mineral, 5, true)) {
                costs.set(pos.x, pos.y, 255);
            }
        }
    }
    if (!room)
        return costs;
    if (!(opts === null || opts === void 0 ? void 0 : opts.ignoreStructures)) {
        for (const s of plannedOfficeStructuresByRcl(roomName, rcl(roomName)).filter(s => s.pos.roomName === roomName)) {
            if (OBSTACLE_OBJECT_TYPES.includes(s.structureType)) {
                costs.set(s.pos.x, s.pos.y, 255);
                if (s.structure instanceof StructureSpawn && s.structure.spawning && s.structure.spawning.remainingTime < 3) {
                    // also block spawning squares
                    ((_d = (_c = (_b = s.structure.spawning) === null || _b === void 0 ? void 0 : _b.directions) === null || _c === void 0 ? void 0 : _c.map(d => posAtDirection(s.pos, d))) !== null && _d !== void 0 ? _d : adjacentWalkablePositions(s.pos)).forEach(p => costs.set(p.x, p.y, 0xff));
                }
            }
            else if (s.structureType === STRUCTURE_ROAD && s.structureId && !(costs.get(s.pos.x, s.pos.y) === 0xff)) {
                // Favor roads over plain tiles
                costs.set(s.pos.x, s.pos.y, 1);
            }
        }
    }
    // include dedicated filler sites
    if (!(opts === null || opts === void 0 ? void 0 : opts.ignoreFastfiller) && Memory.offices[roomName]) {
        for (const pos of fastfillerPositions(roomName)) {
            costs.set(pos.x, pos.y, 0xff);
        }
    }
    if (!(opts === null || opts === void 0 ? void 0 : opts.ignoreHQLogistics) && Memory.offices[roomName]) {
        const pos = getHeadquarterLogisticsLocation(roomName);
        if (pos)
            costs.set(pos.x, pos.y, 0xff);
    }
    if (!(opts === null || opts === void 0 ? void 0 : opts.ignoreFranchises)) {
        sourceIds(roomName)
            .filter(id => Object.keys(Memory.offices).some(o => franchiseActive(o, id)))
            .map(id => posById(id))
            .forEach(pos => {
            if (pos)
                adjacentWalkablePositions(pos, true).forEach(p => costs.set(p.x, p.y, 0xfe));
        });
    }
    // Avoid creeps in the room
    if (avoidCreeps) {
        room.find(FIND_CREEPS).forEach(function (creep) {
            costs.set(creep.pos.x, creep.pos.y, 0xff);
        });
    }
    if (opts === null || opts === void 0 ? void 0 : opts.stayInsidePerimeter) {
        for (const pos of outsidePerimeter(roomName)) {
            costs.set(pos.x, pos.y, 0xff);
        }
    }
    return costs;
});
let costMatrixWithPaths;
memoizeByTick(() => 'pathsCostMatrix', () => {
    costMatrixWithPaths = new PathFinder.CostMatrix();
    return costMatrixWithPaths;
});

const getOfficeDistanceByRange = (office1, office2) => {
    return Game.map.getRoomLinearDistance(office1, office2);
};
const roomPathCache = new Map();
const getOfficeDistanceByRoomPath = (office1, office2) => {
    const key = [office1, office2].sort().join('');
    if (!roomPathCache.has(key)) {
        const distance = getRoomPathDistance(office1, office2);
        if (distance)
            roomPathCache.set(key, distance);
    }
    return roomPathCache.get(key);
};

/**
 * Run once per tick
 */
const cleanPowerBankReports = memoizeOncePerTick(() => {
    var _a;
    var _b;
    for (const office in Memory.offices) {
        (_a = (_b = Memory.offices[office]).powerbanks) !== null && _a !== void 0 ? _a : (_b.powerbanks = []);
        Memory.offices[office].powerbanks = Memory.offices[office].powerbanks.filter(r => {
            if (r.expires < Game.time)
                return false;
            const pos = unpackPos(r.pos);
            const powerBank = byId(r.id);
            if (Game.rooms[pos.roomName] && !powerBank)
                return false; // power bank is gone
            if (powerBank)
                r.hits = powerBank.hits;
            return true;
        });
    }
});
const scanPowerBanks = ({ room }) => {
    var _a, _b;
    if (!isHighway(room))
        return;
    const office = getClosestOffice(room, 8);
    if (!office)
        return;
    const storage = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos;
    if (!storage)
        return;
    if (getOfficeDistanceByRange(room, office) < 10) {
        for (const powerBank of Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, {
            filter: { structureType: STRUCTURE_POWER_BANK }
        })) {
            if (Memory.offices[office].powerbanks.some(r => r.id === powerBank.id))
                continue; // already tracked
            Memory.offices[office].powerbanks.push(evaluatePowerBank(office, storage, powerBank));
        }
    }
};
const evaluatePowerBank = (office, origin, powerBank) => {
    var _a;
    const path = main_11(office + powerBank.id, origin, powerBank.pos, {
        reusePath: powerBank.ticksToDecay + CREEP_LIFE_TIME // path expires after power bank decays
    });
    const distance = path && path.length ? path.reduce((sum, pos) => sum + terrainCostAt(pos), 0) : undefined;
    const report = {
        id: powerBank.id,
        pos: packPos(powerBank.pos),
        adjacentSquares: adjacentWalkablePositions(powerBank.pos, true).length,
        distance,
        amount: powerBank.power,
        hits: powerBank.hits,
        expires: powerBank.ticksToDecay + Game.time
    };
    if (!distance)
        return report;
    // close power banks can be harvested efficiently with two duos that move at half speed
    // all other power banks will need three duos, which may as well move at full speed
    const duoSpeed = distance < 100 ? 2 : 1;
    report.duoSpeed = duoSpeed;
    const duoCount = distance > 330 ? 4 : distance > 100 ? 3 : 2;
    report.duoCount = duoCount;
    const haulerCount = Math.ceil(report.amount / (CARRY_CAPACITY * 25));
    const energy = Game.rooms[office].energyCapacityAvailable;
    const costAnalysis = PowerBankDuoMission.costAnalysis(office, report);
    console.log(office, powerBank.pos, JSON.stringify(costAnalysis));
    const duoCost = (_a = costAnalysis.costToCrack) !== null && _a !== void 0 ? _a : Infinity;
    const cost = duoCost + maxBuildCost(buildAccountant(energy, 25, false, false)) * haulerCount;
    const powerCost = cost / report.amount;
    report.powerCost = powerCost;
    return report;
};

function planFranchisePath(office, source) {
    var _a, _b, _c, _d;
    const storage = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos;
    const harvestPos = (_c = getFranchisePlanBySourceId(source)) === null || _c === void 0 ? void 0 : _c.container.pos;
    if (!storage || !harvestPos)
        return [];
    return ((_d = main_11(office + source, storage, { pos: harvestPos, range: 1 }, {
        roomCallback: (room) => {
            if (getTerritoryIntent(room) === TerritoryIntent.AVOID)
                return false;
            return getCostMatrix(room, false, { territoryPlannedRoadsCost: 1, roomPlan: Boolean(Memory.offices[room]) });
        },
        plainCost: 2,
        swampCost: 2,
        roadCost: 1,
        maxOps: 100000,
        reusePath: 100000
    })) !== null && _d !== void 0 ? _d : []);
}

const updateFranchisePaths = ({ office, source }) => {
    planFranchisePath(office, source);
};

var _a, _b;
(_a = Memory.ledger) !== null && _a !== void 0 ? _a : (Memory.ledger = {});
(_b = Memory.dledger) !== null && _b !== void 0 ? _b : (Memory.dledger = {});
class DetailLedger {
    constructor(baseline = CREEP_LIFE_TIME, interval = CREEP_LIFE_TIME * 5) {
        this.baseline = baseline;
        this.interval = interval;
    }
    reset(id) {
        Memory.dledger[id] = { value: {}, created: Game.time };
        return this.format(id);
    }
    isValid(id) {
        return Game.time - Memory.dledger[id].created > this.baseline;
    }
    isExpired(id) {
        return Game.time - Memory.dledger[id].created > this.interval;
    }
    get(id) {
        if (!Memory.dledger[id] || this.isExpired(id)) {
            return this.reset(id);
        }
        return this.format(id);
    }
    record(id, label, value) {
        var _a;
        const item = Memory.dledger[id];
        if (!Memory.dledger[id] || Game.time - item.created > this.interval) {
            this.reset(id);
        }
        Memory.dledger[id].value[label] = ((_a = Memory.dledger[id].value[label]) !== null && _a !== void 0 ? _a : 0) + value;
        return this.format(id);
    }
    format(id) {
        const age = Game.time - Memory.dledger[id].created;
        const perTick = Object.keys(Memory.dledger[id].value).reduce((sum, v) => sum + Memory.dledger[id].value[v], 0) / age;
        return Object.assign({ id, isValid: this.isValid(id), age,
            perTick }, Memory.dledger[id]);
    }
}

class HarvestLedger {
    static id(office, source) {
        return `r_${office}${source}`;
    }
    static reset(office, sourceId) {
        return this.Ledger.reset(this.id(office, sourceId));
    }
    static get(office, sourceId) {
        return this.Ledger.get(this.id(office, sourceId));
    }
    static record(office, sourceId, label, value) {
        return this.Ledger.record(this.id(office, sourceId), label, value);
    }
}
HarvestLedger.Ledger = new DetailLedger();

const updateLedger = ({ office, source, remote }) => {
    var _a;
    var _b;
    if (!remote)
        return;
    const ledger = HarvestLedger.get(office, source);
    if (ledger.age < 1500 || !Memory.offices[office].franchises[source])
        return;
    (_a = (_b = Memory.offices[office].franchises[source]).scores) !== null && _a !== void 0 ? _a : (_b.scores = []);
    const { scores, lastActive: lastHarvested } = Memory.offices[office].franchises[source];
    if (franchiseActive(office, source)) {
        // record score for previous 1500 ticks
        scores.push(ledger.perTick);
        if (scores.length > FRANCHISE_EVALUATE_PERIOD)
            scores.shift();
        // console.log(office, room, source, JSON.stringify(ledger.value), scores);
    }
    else {
        // unprofitable franchise was abandoned - evaluate if scores should be reset
        if (scores.length === FRANCHISE_EVALUATE_PERIOD &&
            scores.reduce((a, b) => a + b, 0) / scores.length <= 1 &&
            lastHarvested &&
            lastHarvested < Game.time - FRANCHISE_RETRY_INTERVAL) {
            // franchise was producing less than 1 e/t, but it's time to re-evaluate
            scores.splice(0, FRANCHISE_EVALUATE_PERIOD);
        }
    }
    HarvestLedger.reset(office, source);
};

const destroyUnplannedStructures = (room) => {
    var _a, _b, _c, _d;
    if (!((_b = (_a = Game.rooms[room]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.my) || !((_d = (_c = Memory.roomPlans) === null || _c === void 0 ? void 0 : _c[room]) === null || _d === void 0 ? void 0 : _d.office))
        return;
    // Destroy all controller-limited structures
    Game.rooms[room].find(FIND_STRUCTURES).forEach(s => {
        if (s.structureType !== STRUCTURE_ROAD && s.structureType !== STRUCTURE_CONTROLLER) {
            s.destroy();
        }
    });
    Game.rooms[room].find(FIND_CONSTRUCTION_SITES).forEach(s => s.remove());
};

const cityNames = [
    "Tokyo",
    "Delhi",
    "Shanghai",
    "São Paulo",
    "Mexico City",
    "Cairo",
    "Mumbai",
    "Dhaka",
    "Osaka",
    "New York City",
    "Karachi",
    "Buenos Aires",
    "Istanbul",
    "Kolkata",
    "Manila",
    "Lagos",
    "Rio de Janeiro",
    "Kinshasa",
    "Los Angeles",
    "Moscow",
    "Lahore",
    "Bangalore",
    "Paris",
    "Bogotá",
    "Jakarta",
    "Chennai",
    "Lima",
    "Bangkok",
    "Seoul",
    "Nagoya",
    "Hyderabad",
    "London",
    "Tehran",
    "Chicago",
    "Ho Chi Minh City",
    "Luanda",
    "Ahmedabad",
    "Kuala Lumpur",
    "Riyadh",
    "Baghdad",
    "Santiago",
    "Surat",
    "Madrid",
    "Pune",
    "Houston",
    "Dallas",
    "Toronto",
    "Dar es Salaam",
    "Miami",
    "Belo Horizonte",
    "Singapore",
    "Philadelphia",
    "Atlanta",
    "Fukuoka",
    "Khartoum",
    "Barcelona",
    "Johannesburg",
    "Saint Petersburg",
    "Washington, D.C.",
    "Yangon",
    "Alexandria",
    "Guadalajara"
];

const initializeOfficeMemory = ({ room, office }) => {
    var _a, _b;
    var _c, _d;
    if (!office || Memory.offices[room])
        return;
    // Initialize new office
    Memory.offices[room] = {
        city: (_a = cityNames.find(name => !Object.values(Memory.offices).some(r => r.city === name))) !== null && _a !== void 0 ? _a : room,
        resourceQuotas: {
            [RESOURCE_ENERGY]: 10000
        },
        lab: {
            orders: [],
            boosts: [],
            boostingLabs: []
        },
        powerbanks: [],
        franchises: {}
    };
    Memory.rooms[room].rclMilestones = {};
    (_b = (_c = Memory.rooms[room].rclMilestones)[_d = Game.rooms[room].controller.level]) !== null && _b !== void 0 ? _b : (_c[_d] = Game.time);
    destroyUnplannedStructures(room);
};

/**
 * Requires vision
 */
const roomIsEligibleForOffice = (roomName) => {
    var _a, _b;
    // Room must have a controller and two sources
    // To avoid edge cases, controller and sources must not be within range 5 of each other or an exit square
    let controller = (_a = Game.rooms[roomName].controller) === null || _a === void 0 ? void 0 : _a.pos;
    if (!controller) {
        console.log(`Room planning for ${roomName} failed - No controller`);
        return false;
    }
    let sources = Game.rooms[roomName].find(FIND_SOURCES).map(s => s.pos);
    if (!sources || sources.length < 2) {
        console.log(`Room planning for ${roomName} failed - Invalid number of sources`);
        return false;
    }
    let [source1, source2] = sources;
    if ((_b = controller.findClosestByRange(FIND_EXIT)) === null || _b === void 0 ? void 0 : _b.inRangeTo(controller, 2)) {
        console.log(`Room planning for ${roomName} failed - Controller too close to exit`);
        return false;
    }
    if (sources.some(s => { var _a; return (_a = s.findClosestByRange(FIND_EXIT)) === null || _a === void 0 ? void 0 : _a.inRangeTo(s, 2); })) {
        console.log(`Room planning for ${roomName} failed - Source too close to exit`);
        return false;
    }
    if (source1.getRangeTo(source2) < 3) {
        console.log(`Room planning for ${roomName} failed - Sources too close together`);
        return false;
    }
    const terrainTypeCount = countTerrainTypes(roomName);
    if ((terrainTypeCount.swamp * 1.5) > terrainTypeCount.plains) {
        console.log(`Room planning for ${roomName} failed - Too much swamp`);
        return false;
    }
    return true;
};

const initializeRoomMemory = ({ room }) => {
    var _a, _b, _c, _d, _e;
    if (((_a = Memory.rooms[room]) === null || _a === void 0 ? void 0 : _a.eligibleForOffice) !== undefined)
        return;
    const controllerId = (_b = Game.rooms[room].controller) === null || _b === void 0 ? void 0 : _b.id;
    if (Game.rooms[room].controller) {
        Memory.positions[Game.rooms[room].controller.id] = packPos(Game.rooms[room].controller.pos);
    }
    const sourceIds = Game.rooms[room].find(FIND_SOURCES).map(s => {
        Memory.positions[s.id] = packPos(s.pos);
        return s.id;
    });
    const { mineralId, mineralType } = (_c = Game.rooms[room].find(FIND_MINERALS).map(m => {
        Memory.positions[m.id] = packPos(m.pos);
        return { mineralId: m.id, mineralType: m.mineralType };
    })[0]) !== null && _c !== void 0 ? _c : {};
    const eligibleForOffice = roomIsEligibleForOffice(room);
    Memory.rooms[room] = {
        controllerId,
        sourceIds,
        mineralId,
        mineralType,
        eligibleForOffice,
        officesInRange: '',
        threatLevel: calculateThreatLevel(room),
        safeModeCooldown: (_e = (_d = Game.rooms[room].controller) === null || _d === void 0 ? void 0 : _d.safeModeCooldown) !== null && _e !== void 0 ? _e : undefined
    };
};

const ownedMinerals = () => {
    var _a;
    const minerals = new Set();
    for (let office in Memory.offices) {
        const mineral = (_a = byId(mineralId(office))) === null || _a === void 0 ? void 0 : _a.mineralType;
        if (mineral)
            minerals.add(mineral);
    }
    return minerals;
};

const mineralQuotas = ({ room, office }) => {
    if (!office)
        return;
    // Temporary quotas for minerals
    for (let m of ownedMinerals()) {
        Memory.offices[room].resourceQuotas[m] = 3000;
    }
    for (let o of Memory.offices[room].lab.orders) {
        if (MINERALS.includes(o.ingredient1)) {
            Memory.offices[room].resourceQuotas[o.ingredient1] = 3000;
        }
        if (MINERALS.includes(o.ingredient2)) {
            Memory.offices[room].resourceQuotas[o.ingredient2] = 3000;
        }
    }
};

const purgeDeadOffices = () => {
    var _a, _b;
    for (let office in Memory.offices) {
        // if (rcl(office) > 1 && !Game.rooms[office]?.find(FIND_MY_SPAWNS).length && Object.keys(Memory.offices).length > 1) {
        //   // Office was destroyed
        //   Game.rooms[office]?.controller?.unclaim();
        // }
        if (!((_b = (_a = Game.rooms[office]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.my)) {
            delete Memory.offices[office];
            delete Memory.stats.offices[office];
        }
    }
};

const resourcesToPlunder = (distance, lootResources) => {
    let trips = CREEP_LIFE_TIME / distance;
    // cost of a single M/C segment, divided by the amount of resources it can move from this room
    const moveCost = (BODYPART_COST[CARRY] + BODYPART_COST[MOVE]) / Math.floor(CARRY_CAPACITY * trips);
    return lootResources.filter(resource => moveCost > buyMarketPrice(resource));
};

const refreshRoomMemory = ({ room }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    var _p, _q, _r;
    Memory.rooms[room].rcl = (_a = Game.rooms[room].controller) === null || _a === void 0 ? void 0 : _a.level;
    Memory.rooms[room].owner = (_c = (_b = Game.rooms[room].controller) === null || _b === void 0 ? void 0 : _b.owner) === null || _c === void 0 ? void 0 : _c.username;
    Memory.rooms[room].reserver = (_e = (_d = Game.rooms[room].controller) === null || _d === void 0 ? void 0 : _d.reservation) === null || _e === void 0 ? void 0 : _e.username;
    Memory.rooms[room].reservation = (_g = (_f = Game.rooms[room].controller) === null || _f === void 0 ? void 0 : _f.reservation) === null || _g === void 0 ? void 0 : _g.ticksToEnd;
    const cooldown = (_h = Game.rooms[room].controller) === null || _h === void 0 ? void 0 : _h.safeModeCooldown;
    Memory.rooms[room].safeModeCooldown = cooldown ? Game.time + cooldown : undefined;
    Memory.rooms[room].scanned = Game.time;
    const threatLevel = calculateThreatLevel(room);
    Memory.rooms[room].threatLevel = threatLevel;
    if (threatLevel[1])
        Memory.rooms[room].lastHostileSeen = Game.time;
    if (Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, { filter: s => s.structureType === STRUCTURE_INVADER_CORE }).length >
        0) {
        Memory.rooms[room].invaderCore = Game.time;
    }
    else {
        delete Memory.rooms[room].invaderCore;
    }
    if ((_j = Game.rooms[room].controller) === null || _j === void 0 ? void 0 : _j.my) {
        (_k = (_p = Memory.rooms[room]).rclMilestones) !== null && _k !== void 0 ? _k : (_p.rclMilestones = {});
        (_l = (_q = Memory.rooms[room].rclMilestones)[_r = Game.rooms[room].controller.level]) !== null && _l !== void 0 ? _l : (_q[_r] = Game.time);
    }
    if (((_o = (_m = Memory.rooms[room].plunder) === null || _m === void 0 ? void 0 : _m.scanned) !== null && _o !== void 0 ? _o : 0) + 500 < Game.time && !isSourceKeeperRoom(room) && !isHighway(room)) {
        // If room is unowned and has resources, let's loot it!
        if (![ThreatLevel.OWNED, ThreatLevel.FRIENDLY].includes(threatLevel[0])) {
            // select plundering office
            const office = getClosestOffice(room, 6);
            const pathDistance = office ? getRoomPathDistance(office, room) : undefined;
            if (office && pathDistance) {
                // check loot structures for resources
                const lootStructures = Game.rooms[room].find(FIND_HOSTILE_STRUCTURES, {
                    filter: s => 'store' in s && Object.keys(s.store).length
                });
                const resources = new Map();
                lootStructures.forEach(s => {
                    var _a, _b;
                    for (const resource in s.store) {
                        const amount = (_a = s.store.getUsedCapacity(resource)) !== null && _a !== void 0 ? _a : 0;
                        resources.set(resource, ((_b = resources.get(resource)) !== null && _b !== void 0 ? _b : 0) + amount);
                    }
                });
                // ignore small amounts of any resources
                let capacity = 0;
                for (const [resource, amount] of resources) {
                    if (amount < CARRY_CAPACITY) {
                        resources.delete(resource);
                    }
                    else {
                        capacity += amount;
                    }
                }
                const distance = pathDistance * 50;
                // cache results
                Memory.rooms[room].plunder = {
                    office,
                    distance,
                    capacity,
                    resources: resourcesToPlunder(distance, [...resources.keys()]),
                    scanned: Game.time
                };
            }
        }
    }
};

const runIntel = () => {
    var _a;
    purgeDeadOffices();
    cleanThreats();
    cleanPowerBankReports();
    const territories = Object.keys(Memory.offices).filter(office => Memory.offices[office].territories);
    for (const room in Game.rooms) {
        const scannedRoom = {
            room,
            office: !!((_a = Game.rooms[room].controller) === null || _a === void 0 ? void 0 : _a.my),
            territory: territories.includes(room)
        };
        initializeRoomMemory(scannedRoom);
        initializeOfficeMemory(scannedRoom);
        refreshRoomMemory(scannedRoom);
        mineralQuotas(scannedRoom);
        scanRoomForThreats(scannedRoom);
        scanRoomPlanStructures(scannedRoom);
        scanPowerBanks(scannedRoom);
        if (scannedRoom.office) {
            for (const { source, remote } of franchisesByOffice(room)) {
                const scannedFranchise = {
                    office: room,
                    source,
                    remote
                };
                updateFranchisePaths(scannedFranchise);
                updateLedger(scannedFranchise);
            }
        }
    }
};

var BehaviorResult;
(function (BehaviorResult) {
    BehaviorResult["SUCCESS"] = "SUCCESS";
    BehaviorResult["FAILURE"] = "FAILURE";
    BehaviorResult["INPROGRESS"] = "INPROGRESS";
})(BehaviorResult || (BehaviorResult = {}));

const followPathHomeFromSource = (creep, office, sourceId) => {
    var _a, _b, _c;
    if (creep.pos.roomName === office)
        return BehaviorResult.SUCCESS;
    if (franchiseRoadsToBuild(office, sourceId).length) {
        main_26(creep, (_c = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos) !== null && _c !== void 0 ? _c : { pos: new RoomPosition(25, 25, office), range: 20 });
    }
    else {
        main_25(creep, office + sourceId, { reverse: true, visualizePathStyle: { stroke: 'cyan' } });
    }
    return BehaviorResult.INPROGRESS;
};

class LogisticsLedger {
    static id(office) {
        return `l_${office}`;
    }
    static reset(office) {
        return this.Ledger.reset(this.id(office));
    }
    static get(office) {
        return this.Ledger.get(this.id(office));
    }
    static record(office, label, value) {
        return this.Ledger.record(this.id(office), label, value);
    }
}
LogisticsLedger.Ledger = new DetailLedger();

const getPrimarySpawn = (roomName) => {
    return getSpawns(roomName)[0];
};

const storageEnergyAvailable = (roomName) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const plan = roomPlans(roomName);
    if (!(plan === null || plan === void 0 ? void 0 : plan.headquarters) && !(plan === null || plan === void 0 ? void 0 : plan.fastfiller))
        return 0;
    if (!((_a = plan.fastfiller) === null || _a === void 0 ? void 0 : _a.containers.some(c => c.structure)) && !((_b = plan.headquarters) === null || _b === void 0 ? void 0 : _b.storage.structure))
        return (_d = (_c = getPrimarySpawn(roomName)) === null || _c === void 0 ? void 0 : _c.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _d !== void 0 ? _d : 0;
    return (((_g = (_f = (_e = plan.headquarters) === null || _e === void 0 ? void 0 : _e.storage.structure) === null || _f === void 0 ? void 0 : _f.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _g !== void 0 ? _g : 0) +
        ((_j = (_h = plan.fastfiller) === null || _h === void 0 ? void 0 : _h.containers.reduce((sum, c) => { var _a, _b; return sum + ((_b = (_a = c.structure) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _b !== void 0 ? _b : 0); }, 0)) !== null && _j !== void 0 ? _j : 0));
};
const fastfillerIsFull = (roomName) => {
    var _a;
    const plan = (_a = roomPlans(roomName)) === null || _a === void 0 ? void 0 : _a.fastfiller;
    if (!plan)
        return true;
    return (plan.containers.every(c => !c.structure || c.structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0) &&
        plan.extensions.every(c => !c.structure || c.structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0) &&
        plan.spawns.every(c => !c.structure || c.structure.store.getFreeCapacity(RESOURCE_ENERGY) === 0));
};
const roomEnergyAvailable = memoizeByTick(office => office, (office) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const plan = roomPlans(office);
    return (((_c = (_b = (_a = plan === null || plan === void 0 ? void 0 : plan.headquarters) === null || _a === void 0 ? void 0 : _a.storage.structure) === null || _b === void 0 ? void 0 : _b.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _c !== void 0 ? _c : 0) +
        ((_f = (_e = (_d = plan === null || plan === void 0 ? void 0 : plan.library) === null || _d === void 0 ? void 0 : _d.container.structure) === null || _e === void 0 ? void 0 : _e.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _f !== void 0 ? _f : 0) +
        ((_h = (_g = plan === null || plan === void 0 ? void 0 : plan.fastfiller) === null || _g === void 0 ? void 0 : _g.containers.reduce((sum, c) => { var _a, _b; return sum + ((_b = (_a = c.structure) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _b !== void 0 ? _b : 0); }, 0)) !== null && _h !== void 0 ? _h : 0));
});

const deposit$1 = (fromStorage) => (data, creep) => {
    var _a, _b, _c;
    if (creep.store[RESOURCE_ENERGY] <= 0) {
        delete data.withdrawTarget;
        delete data.depositTarget;
        return States.WITHDRAW;
    }
    let target = byId(data.depositTarget);
    if (!target || target.store[RESOURCE_ENERGY] >= target.store.getCapacity(RESOURCE_ENERGY)) {
        delete data.depositTarget;
        return States.DEPOSIT;
    }
    if (data.withdrawTarget && !fromStorage) {
        // Record deposit cost
        HarvestLedger.record(data.office, data.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
    }
    // travel home from a source
    if (data.withdrawTarget && !fromStorage && creep.pos.roomName !== data.office) {
        followPathHomeFromSource(creep, data.office, data.withdrawTarget);
    }
    else {
        viz(creep.pos.roomName).line(creep.pos, target.pos, { color: 'green' });
        main_26(creep, { pos: target.pos, range: 1 }, { priority: 3 });
        const result = creep.transfer(target, RESOURCE_ENERGY);
        if (result === OK) {
            const amount = Math.min(target.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getUsedCapacity(RESOURCE_ENERGY));
            target.store[RESOURCE_ENERGY] += amount;
            if (data.withdrawTarget && !fromStorage) {
                // Record deposit amount
                HarvestLedger.record(data.office, data.withdrawTarget, 'deposit', amount);
                LogisticsLedger.record(data.office, 'deposit', -amount);
            }
            delete data.depositTarget;
        }
        else if (result === ERR_FULL) {
            delete data.depositTarget;
        }
        // If target is spawn, is not spawning, and is at capacity, renew this creep
        if (target instanceof StructureSpawn &&
            !target.spawning &&
            target.store.getUsedCapacity(RESOURCE_ENERGY) + creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
            target.renewCreep(creep);
        }
    }
    if (Game.cpu.bucket < 1000)
        return States.DEPOSIT;
    // if we have CPU, repair and look for opportunity targets
    if (creep.getActiveBodyparts(WORK)) {
        const road = data.withdrawTarget
            ? plannedFranchiseRoads(data.office, data.withdrawTarget).find(s => s.energyToRepair > 0 && s.pos.inRangeTo(creep.pos, 3))
            : undefined;
        if (road === null || road === void 0 ? void 0 : road.structure) {
            if (creep.repair(road.structure) === OK) {
                const cost = REPAIR_COST * REPAIR_POWER * 1; // Haulers will only ever have one work part // creep.body.filter(p => p.type === WORK).length;
                if (data.withdrawTarget && !(byId(data.withdrawTarget) instanceof Structure)) {
                    // Record deposit cost
                    HarvestLedger.record(data.office, data.withdrawTarget, 'repair', -cost);
                    LogisticsLedger.record(data.office, 'deposit', -cost);
                }
            }
        }
    }
    // only check for nearby targets if we have surplus CPU
    const nearby = lookNear(creep.pos);
    if (!target || creep.pos.getRangeTo(target) > 1) {
        // Check for nearby targets of opportunity
        let energyRemaining = creep.store[RESOURCE_ENERGY];
        for (const opp of nearby) {
            if ((_a = opp.creep) === null || _a === void 0 ? void 0 : _a.my) {
                if (opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                    (([MinionTypes.ENGINEER, MinionTypes.RESEARCH].includes(opp.creep.memory.role) &&
                        fastfillerIsFull(data.office)) ||
                        opp.creep.name.startsWith('MRM_'))) {
                    if (creep.transfer(opp.creep, RESOURCE_ENERGY) === OK) {
                        const amount = Math.min(opp.creep.store.getFreeCapacity(), energyRemaining);
                        energyRemaining -= amount;
                        if (data.withdrawTarget && !(byId(data.withdrawTarget) instanceof Structure)) {
                            // Record deposit amount
                            HarvestLedger.record(data.office, data.withdrawTarget, 'deposit', amount);
                            LogisticsLedger.record(data.office, 'deposit', -amount);
                        }
                        break;
                    }
                }
            }
            else if ((((_b = opp.structure) === null || _b === void 0 ? void 0 : _b.structureType) === STRUCTURE_EXTENSION || ((_c = opp.structure) === null || _c === void 0 ? void 0 : _c.structureType) === STRUCTURE_SPAWN) &&
                opp.structure.store[RESOURCE_ENERGY] <
                    opp.structure.store.getCapacity(RESOURCE_ENERGY)) {
                if (creep.transfer(opp.structure, RESOURCE_ENERGY) === OK) {
                    const amount = Math.min(opp.structure.store.getFreeCapacity(RESOURCE_ENERGY), energyRemaining);
                    energyRemaining -= amount;
                    if (data.withdrawTarget && !(byId(data.withdrawTarget) instanceof StructureStorage)) {
                        // Record deposit amount
                        HarvestLedger.record(data.office, data.withdrawTarget, 'deposit', amount);
                        LogisticsLedger.record(data.office, 'deposit', -amount);
                    }
                    break;
                }
            }
        }
        if (energyRemaining === 0) {
            delete data.withdrawTarget;
            return States.WITHDRAW;
        }
    }
    return States.DEPOSIT;
};

const resourcesNearPos = (pos, radius = 1, resource) => {
    var _a, _b;
    const results = (_a = Game.rooms[pos.roomName]) === null || _a === void 0 ? void 0 : _a.lookForAtArea(LOOK_RESOURCES, pos.y - radius, pos.x - radius, pos.y + radius, pos.x + radius, true);
    return (_b = results === null || results === void 0 ? void 0 : results.map(r => r.resource).filter(r => !resource || r.resourceType === resource).sort((a, b) => b.amount - a.amount)) !== null && _b !== void 0 ? _b : [];
};

const franchiseEnergyCache = new Map();
const franchiseEnergyAvailable = memoizeByTick(source => source, (source) => {
    var _a, _b, _c;
    const pos = posById(source);
    if (!pos)
        return 0;
    if (!Game.rooms[pos.roomName])
        return (_a = franchiseEnergyCache.get(source)) !== null && _a !== void 0 ? _a : 0;
    const container = (_b = getFranchisePlanBySourceId(source)) === null || _b === void 0 ? void 0 : _b.container.structure;
    let amount = resourcesNearPos(pos, 1, RESOURCE_ENERGY).reduce((sum, r) => sum + r.amount, 0) +
        ((_c = container === null || container === void 0 ? void 0 : container.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _c !== void 0 ? _c : 0);
    franchiseEnergyCache.set(source, amount);
    return amount;
});

const getEnergyFromFranchise = profiler.registerFN((creep, office, franchise) => {
    var _a;
    const pos = posById(franchise);
    if (!pos)
        return BehaviorResult.FAILURE;
    if (pos.roomName !== creep.pos.roomName) {
        main_26(creep, { pos, range: 2 });
        return BehaviorResult.INPROGRESS;
    }
    if (franchiseEnergyAvailable(franchise) < 50 || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        return BehaviorResult.SUCCESS;
    }
    else {
        if (creep.name.startsWith('ENGINEER'))
            Game.map.visual.line(creep.pos, pos, { color: '#ffff00' });
        // First, pick up from container
        const container = (_a = getFranchisePlanBySourceId(franchise)) === null || _a === void 0 ? void 0 : _a.container.structure;
        const resources = resourcesNearPos(pos, 1, RESOURCE_ENERGY);
        if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            main_26(creep, { pos: container.pos, range: 1 });
            if (creep.pos.inRangeTo(container, 1)) {
                creep.withdraw(container, RESOURCE_ENERGY);
                // if (result === OK)
                //   LogisticsLedger.record(
                //     office,
                //     'collect',
                //     Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), container.store.getUsedCapacity(RESOURCE_ENERGY))
                //   );
            }
        }
        else if (resources.length > 0) {
            // Otherwise, pick up loose resources
            const res = resources.shift();
            if (res) {
                main_26(creep, { pos: res.pos, range: 1 });
                if (creep.pos.inRangeTo(res, 1)) {
                    creep.pickup(res);
                    // if (result === OK)
                    //   LogisticsLedger.record(
                    //     office,
                    //     'collect',
                    //     Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), res.amount)
                    //   );
                }
            }
        }
    }
    return BehaviorResult.INPROGRESS;
}, 'getEnergyFromFranchise');

const withdraw = (fromStorage) => (data, creep) => {
    var _a, _b, _c, _d, _e, _f;
    if (creep.ticksToLive && creep.ticksToLive < 100) {
        // no work within range and creep is dying
        return States.RECYCLE;
    }
    let energyCapacity = creep.store.getCapacity(RESOURCE_ENERGY) - creep.store[RESOURCE_ENERGY];
    if (energyCapacity === 0)
        return States.DEPOSIT;
    const storage = (_b = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.structure;
    if (fromStorage && (storage === null || storage === void 0 ? void 0 : storage.store.getUsedCapacity(RESOURCE_ENERGY))) {
        main_26(creep, { pos: storage.pos, range: 1 });
        creep.withdraw(storage, RESOURCE_ENERGY);
    }
    else {
        // Otherwise, continue to main withdraw target (set by src\Strategy\Logistics\LogisticsTargets.ts)
        const target = byId(data.withdrawTarget);
        const pos = (_c = posById(data.withdrawTarget)) !== null && _c !== void 0 ? _c : target === null || target === void 0 ? void 0 : target.pos;
        if (!data.withdrawTarget || !pos) {
            return States.WITHDRAW;
        }
        // Target identified
        getEnergyFromFranchise(creep, data.office, data.withdrawTarget);
        // Record cost
        HarvestLedger.record(data.office, data.withdrawTarget, 'spawn_logistics', -creepCostPerTick(creep));
    }
    if (Game.cpu.bucket < 1000)
        return States.WITHDRAW;
    // only check for nearby targets if we have surplus CPU
    const nearby = lookNear(creep.pos);
    // Look for opportunity targets
    if (energyCapacity > 0) {
        // Dropped resources
        const resource = nearby.find(r => { var _a; return ((_a = r.resource) === null || _a === void 0 ? void 0 : _a.resourceType) === RESOURCE_ENERGY; });
        if (resource === null || resource === void 0 ? void 0 : resource.resource) {
            creep.pickup(resource.resource);
            energyCapacity = Math.max(0, energyCapacity - resource.resource.amount);
            LogisticsLedger.record(data.office, 'recover', Math.min(energyCapacity, resource.resource.amount));
        }
        // Tombstones
        const tombstone = nearby.find(r => { var _a; return (_a = r.tombstone) === null || _a === void 0 ? void 0 : _a.store[RESOURCE_ENERGY]; });
        if (tombstone === null || tombstone === void 0 ? void 0 : tombstone.tombstone) {
            creep.withdraw(tombstone.tombstone, RESOURCE_ENERGY);
            tombstone.tombstone.store[RESOURCE_ENERGY] = Math.max(0, ((_d = tombstone.tombstone) === null || _d === void 0 ? void 0 : _d.store[RESOURCE_ENERGY]) - energyCapacity);
            LogisticsLedger.record(data.office, 'recover', Math.min(energyCapacity, (_e = tombstone.tombstone) === null || _e === void 0 ? void 0 : _e.store[RESOURCE_ENERGY]));
            energyCapacity = Math.max(0, energyCapacity - ((_f = tombstone.tombstone) === null || _f === void 0 ? void 0 : _f.store[RESOURCE_ENERGY]));
        }
    }
    return States.WITHDRAW;
};

function runStates(states, data, creep, debug = false) {
    var _a;
    const statesRun = [];
    let state = ((_a = creep.memory.runState) !== null && _a !== void 0 ? _a : Object.keys(states)[0]); // First state is default
    creep.memory.runState = state;
    if (debug)
        console.log(creep.name, 'starting at', state);
    while (!statesRun.includes(state)) {
        statesRun.push(state);
        if (!(state in states)) {
            delete creep.memory.runState;
            throw new Error(`Mission has no state: ${state}`);
        }
        state = states[state](data, creep);
        if (debug)
            console.log(creep.name, 'switching to', state);
        creep.memory.runState = state;
    }
}

const fixedCount = (target) => (creeps) => target() - creeps.length;

const CreepsThatNeedEnergy = new Map();
/**
 *
 * @param office
 * @returns Tuple of (priority, target)
 */
const storageStructureThatNeedsEnergy = memoizeByTick(office => office, (office) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const hq = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters;
    const fastfiller = (_b = roomPlans(office)) === null || _b === void 0 ? void 0 : _b.fastfiller;
    const backfill = (_c = roomPlans(office)) === null || _c === void 0 ? void 0 : _c.backfill;
    const library = (_d = roomPlans(office)) === null || _d === void 0 ? void 0 : _d.library;
    const labs = (_e = roomPlans(office)) === null || _e === void 0 ? void 0 : _e.labs;
    const creeps = [...((_f = CreepsThatNeedEnergy.get(office)) !== null && _f !== void 0 ? _f : [])]
        .map(c => Game.creeps[c])
        .filter(isCreep)
        .filter(c => c.store.getFreeCapacity(RESOURCE_ENERGY) > 10);
    const structures = []
        .concat((_g = backfill === null || backfill === void 0 ? void 0 : backfill.towers.map(s => [10, s.structure])) !== null && _g !== void 0 ? _g : [], (_h = labs === null || labs === void 0 ? void 0 : labs.labs.map(s => [9, s.structure])) !== null && _h !== void 0 ? _h : [], (_j = fastfiller === null || fastfiller === void 0 ? void 0 : fastfiller.containers.map(s => [8, s.structure])) !== null && _j !== void 0 ? _j : [], (_k = getSpawns(office).map(s => [7, s])) !== null && _k !== void 0 ? _k : [], getExtensions(office, false).map(s => [6, s.structure]), [[4, library === null || library === void 0 ? void 0 : library.container.structure]], creeps.map(e => [4, e]), [[3, hq === null || hq === void 0 ? void 0 : hq.storage.structure]])
        .filter(([_, structure]) => structure &&
        structure.store[RESOURCE_ENERGY] < structure.store.getCapacity(RESOURCE_ENERGY) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY));
    return structures;
});

const harvestEnergyFromFranchise = profiler.registerFN((creep, franchiseTarget) => {
    var _a;
    const source = byId(franchiseTarget);
    const sourcePos = (_a = source === null || source === void 0 ? void 0 : source.pos) !== null && _a !== void 0 ? _a : posById(franchiseTarget);
    const plan = getFranchisePlanBySourceId(franchiseTarget);
    if (!sourcePos || (Game.rooms[sourcePos.roomName] && !source)) {
        return BehaviorResult.FAILURE;
    }
    // Prefer to work from container position, fall back to adjacent position
    Game.cpu.getUsed();
    if (plan &&
        (creep.pos.isEqualTo(plan === null || plan === void 0 ? void 0 : plan.container.pos) ||
            !Game.rooms[plan.container.pos.roomName] ||
            plan.container.pos.lookFor(LOOK_CREEPS).filter(c => c.id !== creep.id).length === 0)) {
        // stay here
        main_26(creep, { pos: plan.container.pos, range: 0 }, { roomCallback: defaultRoomCallback({ ignoreFranchises: true }), priority: 3 });
    }
    else if ((plan && creep.pos.inRangeTo(plan.container.pos, 1)) ||
        main_9$1(sourcePos, false).length) {
        // available squares to target
        main_26(creep, sourcePos, {
            roomCallback: defaultRoomCallback({ ignoreFranchises: true }),
            priority: 3
        });
    }
    else {
        // stand by in area
        main_26(creep, { pos: sourcePos, range: 2 });
    }
    if (creep.getActiveBodyparts(WORK) >= 10 && Game.time % 2 === 0) {
        return true; // harvest every other tick
    }
    return creep.harvest(source) === OK;
}, 'harvestEnergyFromFranchise');

const buildSalesman = (energy, link = false, remote = false) => {
    if (energy < 200) {
        return [];
    }
    else if (energy < 550) {
        return unboosted([WORK, WORK, MOVE]);
    }
    else if (energy === 550) {
        return link || remote
            ? unboosted([WORK, WORK, WORK, CARRY, MOVE])
            : unboosted([WORK, WORK, WORK, WORK, WORK, MOVE]);
    }
    if (remote) {
        return unboosted(buildFromSegment(energy, [WORK, WORK, WORK, MOVE], { maxSegments: 2, suffix: [CARRY] }));
    }
    else {
        return unboosted(buildFromSegment(energy, [WORK, WORK, WORK, WORK, WORK, MOVE], {
            maxSegments: 2,
            suffix: link ? [CARRY] : []
        }));
    }
};

class HarvestMission extends MissionImplementation {
    constructor(missionData, id) {
        var _a, _b, _c, _d, _e, _f;
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            harvesters: new MultiCreepSpawner('h', this.missionData.office, {
                role: MinionTypes.SALESMAN,
                budget: Budget.ESSENTIAL,
                builds: energy => buildSalesman(energy, this.calculated().link, this.calculated().remote),
                count: current => {
                    if (this.disabled()) {
                        return 0; // disabled
                    }
                    const harvestRate = current
                        .filter(prespawnByArrived)
                        .map(c => c.getActiveBodyparts(WORK) * HARVEST_POWER)
                        .reduce(sum, 0);
                    if (harvestRate < 10 && current.length < this.calculated().maxHarvesters) {
                        return 1;
                    }
                    return 0;
                },
                estimatedCpuPerTick: 0.8
            }, {
                onSpawn: creep => HarvestLedger.record(this.missionData.office, this.missionData.source, 'spawn_harvest', -creepCost(creep))
            })
        };
        this.priority = 10;
        this.calculated = memoizeByTick(() => '', () => {
            var _a, _b, _c;
            return {
                link: !!((_a = getFranchisePlanBySourceId(this.missionData.source)) === null || _a === void 0 ? void 0 : _a.link.structure) ||
                    ((_b = getFranchisePlanBySourceId(this.missionData.source)) === null || _b === void 0 ? void 0 : _b.extensions.some(s => s.structure)),
                remote: ((_c = posById(this.missionData.source)) === null || _c === void 0 ? void 0 : _c.roomName) !== this.missionData.office,
                maxHarvesters: main_9$1(posById(this.missionData.source), true).length,
                source: byId(this.missionData.source)
            };
        });
        // Make sure that if room plans aren't finished we still prioritize the closest source
        const franchise1 = (_c = (_b = (_a = roomPlans(this.missionData.office)) === null || _a === void 0 ? void 0 : _a.franchise1) === null || _b === void 0 ? void 0 : _b.sourceId) !== null && _c !== void 0 ? _c : (_e = (_d = getSpawns(this.missionData.office)[0]) === null || _d === void 0 ? void 0 : _d.pos.findClosestByRange(FIND_SOURCES)) === null || _e === void 0 ? void 0 : _e.id;
        // set priority differently for remote sources
        const remote = this.missionData.office !== ((_f = posById(this.missionData.source)) === null || _f === void 0 ? void 0 : _f.roomName);
        this.evaluateDistance();
        if (remote) {
            this.priority = 1;
            if (this.missionData.distance) {
                // Increase priority for closer franchises, up to 1 point for closer than 50 squares
                // Round priority to two places
                this.priority += Math.round(100 * (Math.min(50, this.missionData.distance) / this.missionData.distance)) / 100;
            }
        }
        else {
            if (franchise1 === this.missionData.source)
                this.priority += 0.1;
        }
    }
    static fromId(id) {
        return super.fromId(id);
    }
    active() {
        return this.creeps.harvesters.resolved.length > 0;
    }
    disabled() {
        var _a, _b, _c, _d;
        const pos = posById(this.missionData.source);
        if (!pos)
            return true;
        if (![undefined, 'LordGreywether'].includes((_b = Memory.rooms[(_a = pos === null || pos === void 0 ? void 0 : pos.roomName) !== null && _a !== void 0 ? _a : '']) === null || _b === void 0 ? void 0 : _b.reserver) ||
            ![undefined, 'LordGreywether'].includes((_d = Memory.rooms[(_c = pos === null || pos === void 0 ? void 0 : pos.roomName) !== null && _c !== void 0 ? _c : '']) === null || _d === void 0 ? void 0 : _d.owner)) {
            return true; // owned or reserved by another player
        }
        if (franchiseIsThreatened(this.missionData.office, this.missionData.source))
            return true; // tracking an active threat
        return this.missionData.distance && this.missionData.distance > 250;
    }
    evaluateDistance() {
        if (this.missionData.distance)
            return;
        const distance = getFranchiseDistance(this.missionData.office, this.missionData.source);
        this.missionData.distance = distance;
        if (this.calculated().remote) {
            this.priority = 1;
            if (distance) {
                // Increase priority for closer franchises, up to 1 point for closer than 50 squares
                // Round priority to two places
                this.priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
            }
        }
    }
    haulingCapacityNeeded() {
        var _a, _b;
        const { link, container } = (_a = getFranchisePlanBySourceId(this.missionData.source)) !== null && _a !== void 0 ? _a : {};
        if ((link === null || link === void 0 ? void 0 : link.structure) && !franchiseEnergyAvailable(this.missionData.source))
            return 0;
        const time = ((_b = this.missionData.distance) !== null && _b !== void 0 ? _b : 50) * 2;
        return time * this.harvestRate();
    }
    harvestRate() {
        var _a, _b;
        if (this.disabled()) {
            return 0; // reserved or owned by someone else
        }
        const creepHarvestRate = this.creeps.harvesters.resolved
            .map(c => c.getActiveBodyparts(WORK) * HARVEST_POWER)
            .reduce(sum, 0);
        const maxHarvestRate = ((_b = (_a = byId(this.missionData.source)) === null || _a === void 0 ? void 0 : _a.energyCapacity) !== null && _b !== void 0 ? _b : SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;
        return Math.min(creepHarvestRate, maxHarvestRate);
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e;
        const { harvesters } = creeps;
        const { source, office } = this.missionData;
        if (!franchisesByOffice(office).some(f => f.source === source)) {
            // No longer a valid franchise
            this.status = MissionStatus.DONE;
            return;
        }
        this.evaluateDistance();
        const container = (_a = getFranchisePlanBySourceId(source)) === null || _a === void 0 ? void 0 : _a.container.structureId;
        LogisticsLedger.record(office, 'decay', -Math.ceil(Math.max(0, franchiseEnergyAvailable(source) - (container ? 2000 : 0)) / 1000));
        const franchisePos = posById(source);
        for (const creep of harvesters) {
            const franchise = (_b = Memory.offices[office].franchises[data.source]) !== null && _b !== void 0 ? _b : { scores: [] };
            Memory.offices[office].franchises[data.source] = franchise;
            if (franchise)
                franchise.lastActive = Game.time;
            if (((_c = franchisePos === null || franchisePos === void 0 ? void 0 : franchisePos.getRangeTo(creep.pos)) !== null && _c !== void 0 ? _c : Infinity) <= 1) {
                setArrived(creep);
            }
            if (creep.store.getCapacity(RESOURCE_ENERGY) &&
                creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.5) {
                if (office === (franchisePos === null || franchisePos === void 0 ? void 0 : franchisePos.roomName)) {
                    // Local franchise
                    const plan = getFranchisePlanBySourceId(source);
                    if (!plan)
                        return;
                    // Try to deposit at spawn
                    let result = ERR_FULL;
                    for (const { structure } of plan.extensions) {
                        if (!structure)
                            continue;
                        result = creep.transfer(structure, RESOURCE_ENERGY);
                        if (result === OK) {
                            const amount = Math.min(creep.store[RESOURCE_ENERGY], structure.store.getFreeCapacity(RESOURCE_ENERGY));
                            HarvestLedger.record(office, source, 'deposit', amount);
                            LogisticsLedger.record(office, 'deposit', -amount);
                            break;
                        }
                    }
                    // Try to deposit at link
                    if (result === ERR_FULL && plan.link.structure) {
                        main_26(creep, plan.link.pos);
                        result = creep.transfer(plan.link.structure, RESOURCE_ENERGY);
                        if (result === OK) {
                            const amount = Math.min(creep.store[RESOURCE_ENERGY], plan.link.structure.store.getFreeCapacity(RESOURCE_ENERGY));
                            HarvestLedger.record(office, source, 'deposit', amount);
                            LogisticsLedger.record(office, 'deposit', -amount);
                            // If we've dropped any resources, and there's space in the link, try to pick them up
                            const resource = creep.pos.lookFor(LOOK_RESOURCES).find(r => r.resourceType === RESOURCE_ENERGY);
                            if (resource)
                                creep.pickup(resource);
                        }
                    }
                    if (result === ERR_FULL && plan.container.structure) {
                        result = creep.transfer(plan.container.structure, RESOURCE_ENERGY);
                    }
                }
                else {
                    // Remote franchise
                    const plan = getFranchisePlanBySourceId(source);
                    if (plan && Game.rooms[plan.container.pos.roomName] && rcl(office) >= 3) {
                        // Try to build or repair container
                        if (plan.container.structure && plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
                            if (creep.repair(plan.container.structure) === OK) {
                                const amount = -(REPAIR_COST * REPAIR_POWER) * creep.body.filter(p => p.type === WORK).length;
                                HarvestLedger.record(office, source, 'repair', amount);
                                LogisticsLedger.record(office, 'deposit', amount);
                                return;
                            }
                        }
                    }
                    if ((plan === null || plan === void 0 ? void 0 : plan.container.structure) &&
                        creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.75) {
                        creep.transfer(plan.container.structure, RESOURCE_ENERGY);
                    }
                }
            }
            const harvested = harvestEnergyFromFranchise(creep, source);
            if (harvested) {
                const amount = Math.min((_e = (_d = byId(source)) === null || _d === void 0 ? void 0 : _d.energy) !== null && _e !== void 0 ? _e : 0, creep.body.filter(p => p.type === WORK).length * HARVEST_POWER, 10);
                LogisticsLedger.record(office, 'harvest', amount);
            }
        }
    }
}

class LogisticsMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            refillers: new MultiCreepSpawner('r', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                spawnData: {
                    memory: { fromStorage: true }
                },
                budget: Budget.ESSENTIAL,
                estimatedCpuPerTick: 0.8,
                builds: energy => buildAccountant(Math.max(100, energy / 2), 25, this.calculated().roads, this.calculated().repair),
                count: fixedCount(() => {
                    var _a, _b, _c;
                    return ((_c = (_b = (_a = roomPlans(this.missionData.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.structure) === null || _c === void 0 ? void 0 : _c.store.getUsedCapacity(RESOURCE_ENERGY))
                        ? 1
                        : 0;
                })
            }),
            haulers: new MultiCreepSpawner('h', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                spawnData: {
                    memory: { fromStorage: false }
                },
                budget: Budget.ESSENTIAL,
                estimatedCpuPerTick: 0.8,
                builds: energy => buildAccountant(Math.max(100, energy / 2), 25, this.calculated().roads, this.calculated().repair),
                count: current => {
                    const neededCapacity = activeMissions(this.missionData.office)
                        .filter(isMission(HarvestMission))
                        .map(m => m.haulingCapacityNeeded())
                        .reduce(sum, 0);
                    const currentCapacity = current.map(c => c.store.getCapacity()).reduce(sum, 0);
                    if (currentCapacity < neededCapacity)
                        return 1;
                    return 0;
                }
            })
        };
        this.priority = 11;
        this.capacity = memoizeByTick(() => '', () => {
            return this.creeps.haulers.resolved.map(c => c.store.getCapacity()).reduce(sum, 0);
        });
        this.usedCapacity = memoizeByTick(() => '', () => {
            return this.creeps.haulers.resolved.map(c => c.store.getUsedCapacity(RESOURCE_ENERGY)).reduce(sum, 0);
        });
        this.assignedLogisticsCapacity = memoizeOnce(() => {
            var _a, _b, _c, _d, _e;
            const withdrawAssignments = new Map();
            const depositAssignments = new Map();
            const priorities = storageStructureThatNeedsEnergy(this.missionData.office).sort((a, b) => b[0] - a[0]);
            for (const { source } of franchisesByOffice(this.missionData.office)) {
                if (franchiseIsThreatened(this.missionData.office, source)) {
                    continue;
                }
                withdrawAssignments.set(source, 0);
            }
            for (const assigned in this.missionData.assignments) {
                const assignment = this.missionData.assignments[assigned];
                const creep = Game.creeps[assigned];
                if (!creep)
                    continue;
                if (creep.memory.runState === States.WITHDRAW && assignment.withdrawTarget) {
                    withdrawAssignments.set(assignment.withdrawTarget, ((_a = withdrawAssignments.get(assignment.withdrawTarget)) !== null && _a !== void 0 ? _a : 0) + creep.store.getFreeCapacity());
                }
                if (creep.memory.runState === States.DEPOSIT && assignment.depositTarget) {
                    let target = byId(assignment.depositTarget);
                    if (!target)
                        continue;
                    if (priorities.length) {
                        const [bestPriority, bestTarget] = priorities[0];
                        if (bestTarget instanceof StructureStorage && creep.memory.fromStorage)
                            continue; // don't assign refillers to storage
                        const actualPriority = (_c = (_b = priorities.find(([priority, structure]) => structure.id === target.id)) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : 0;
                        if (actualPriority < bestPriority) {
                            const assignedToBestTarget = (_d = depositAssignments.get(bestTarget.id)) !== null && _d !== void 0 ? _d : 0;
                            assignment.depositTarget = bestTarget.id;
                            target = bestTarget;
                            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) + assignedToBestTarget >=
                                bestTarget.store.getFreeCapacity(RESOURCE_ENERGY)) {
                                priorities.shift(); // fully assigned
                            }
                        }
                    }
                    depositAssignments.set(assignment.depositTarget, Math.min(target.store.getFreeCapacity(RESOURCE_ENERGY), ((_e = depositAssignments.get(assignment.depositTarget)) !== null && _e !== void 0 ? _e : 0) + creep.store[RESOURCE_ENERGY]));
                }
            }
            return { withdrawAssignments, depositAssignments };
        }, 10);
        this.calculated = memoizeByTick(() => '', () => {
            if (rcl(this.missionData.office) <= 3) {
                return {
                    roads: false,
                    repair: false
                };
            }
            let roads = true;
            let repair = false;
            for (const r of plannedActiveFranchiseRoads(this.missionData.office)) {
                roads && (roads = r.energyToBuild === 0); // all roads should be built
                repair || (repair = r.energyToRepair >= (ROAD_HITS / 2) * REPAIR_COST); // any roads may need repairs
                if (!roads && repair)
                    break; // no need to scan further, results won't change
            }
            return {
                roads,
                repair
            };
        });
        this.updatePriorities = memoizeOnce(() => {
            var _a, _b, _c;
            // Update priorities
            const inRoomCapacity = activeMissions(this.missionData.office)
                .filter(isMission(HarvestMission))
                .filter(m => !m.calculated().remote)
                .map(m => m.haulingCapacityNeeded())
                .reduce(sum, 0);
            const refillersNeeded = this.creeps.refillers.resolved.length === 0 &&
                ((_c = (_b = (_a = roomPlans(this.missionData.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.structure) === null || _c === void 0 ? void 0 : _c.store.getUsedCapacity(RESOURCE_ENERGY));
            if (!refillersNeeded &&
                inRoomCapacity < this.creeps.haulers.resolved.map(h => h.store.getCapacity(RESOURCE_ENERGY)).reduce(sum, 0)) {
                this.priority = 3;
            }
            else {
                this.priority = 11;
            }
        }, 100);
    }
    static fromId(id) {
        return super.fromId(id);
    }
    findBestDepositTarget(creep, ignoreStorage = false, assign = true) {
        var _a, _b, _c;
        const { depositAssignments } = this.assignedLogisticsCapacity();
        let bestTarget = undefined;
        let bestAmount = -Infinity;
        let bestPriority = 0;
        let bestDistance = Infinity;
        for (const [priority, target] of storageStructureThatNeedsEnergy(this.missionData.office)) {
            const capacity = (_a = depositAssignments.get(target.id)) !== null && _a !== void 0 ? _a : 0;
            if (!target || (target instanceof StructureStorage && ignoreStorage))
                continue;
            const amount = ((_b = target.store.getFreeCapacity(RESOURCE_ENERGY)) !== null && _b !== void 0 ? _b : 0) - capacity;
            const distance = getRangeTo(creep.pos, target.pos);
            if (priority > bestPriority ||
                (priority === bestPriority &&
                    distance < bestDistance &&
                    amount >= Math.min(bestAmount, creep.store.getFreeCapacity(RESOURCE_ENERGY))) ||
                (priority === bestPriority && amount > bestAmount && bestAmount < creep.store.getFreeCapacity(RESOURCE_ENERGY))) {
                bestTarget = target.id;
                bestAmount = amount;
                bestDistance = distance;
                bestPriority = priority;
            }
        }
        if (assign && bestTarget) {
            const capacity = (_c = depositAssignments.get(bestTarget)) !== null && _c !== void 0 ? _c : 0;
            depositAssignments.set(bestTarget, capacity + creep.store[RESOURCE_ENERGY]);
        }
        return bestTarget;
    }
    findBestWithdrawTarget(creep, assign = true) {
        var _a, _b, _c;
        const { withdrawAssignments } = this.assignedLogisticsCapacity();
        const maxDistance = ((_a = creep.ticksToLive) !== null && _a !== void 0 ? _a : CREEP_LIFE_TIME) * 0.8;
        let bestTarget = undefined;
        let bestCreepAmount = 0;
        let bestDistance = Infinity;
        for (const [source, capacity] of withdrawAssignments) {
            // total stockpile at the source
            const totalAmount = franchiseEnergyAvailable(source);
            // total this creep can get (after reservations)
            const creepAmount = Math.min(totalAmount - capacity, creep.store.getFreeCapacity(RESOURCE_ENERGY));
            if (creepAmount === 0)
                continue;
            const distance = (_b = getFranchiseDistance(this.missionData.office, source)) !== null && _b !== void 0 ? _b : Infinity;
            if (distance * 2 > maxDistance)
                continue; // too far for this creep to survive
            if (creepAmount > bestCreepAmount || (creepAmount === bestCreepAmount && distance < bestDistance)) {
                bestTarget = source;
                bestCreepAmount = creepAmount;
                bestDistance = distance;
            }
        }
        if (assign && bestTarget) {
            withdrawAssignments.set(bestTarget, ((_c = withdrawAssignments.get(bestTarget)) !== null && _c !== void 0 ? _c : 0) + creep.getActiveBodyparts(CARRY) * CARRY_CAPACITY);
        }
        return bestTarget;
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e;
        var _f, _g;
        const { haulers, refillers } = creeps;
        const allHaulers = [...haulers, ...refillers];
        (_a = data.assignments) !== null && _a !== void 0 ? _a : (data.assignments = {});
        this.updatePriorities();
        // clean up invalid assignments
        const { depositAssignments, withdrawAssignments } = this.assignedLogisticsCapacity();
        for (const assigned in this.missionData.assignments) {
            const assignment = this.missionData.assignments[assigned];
            const creep = Game.creeps[assigned];
            if (!creep) {
                delete this.missionData.assignments[assigned];
                continue;
            }
            if ((creep === null || creep === void 0 ? void 0 : creep.memory.runState) === States.DEPOSIT &&
                assignment.depositTarget &&
                !((_b = byId(assignment.depositTarget)) === null || _b === void 0 ? void 0 : _b.store.getFreeCapacity())) {
                if (depositAssignments.has(assignment.depositTarget)) {
                    depositAssignments.set(assignment.depositTarget, Math.max(0, ((_c = depositAssignments.get(assignment.depositTarget)) !== null && _c !== void 0 ? _c : 0) - creep.store.getUsedCapacity(RESOURCE_ENERGY)));
                }
                delete assignment.depositTarget;
            }
            else if ((creep === null || creep === void 0 ? void 0 : creep.memory.runState) === States.WITHDRAW && assignment.withdrawTarget) {
                const target = byId(assignment.withdrawTarget);
                if (((target instanceof StructureStorage || target instanceof StructureContainer) &&
                    target.store[RESOURCE_ENERGY] <= 0) ||
                    franchiseEnergyAvailable(assignment.withdrawTarget) <= 50) {
                    // withdraw target is empty
                    if (withdrawAssignments.has(assignment.withdrawTarget)) {
                        withdrawAssignments.set(assignment.withdrawTarget, Math.max(0, ((_d = withdrawAssignments.get(assignment.withdrawTarget)) !== null && _d !== void 0 ? _d : 0) - creep.store.getFreeCapacity()));
                    }
                    delete assignment.withdrawTarget;
                }
            }
        }
        // add targets, if needed
        for (const creep of allHaulers) {
            (_e = (_f = data.assignments)[_g = creep.name]) !== null && _e !== void 0 ? _e : (_f[_g] = {});
            const assignment = data.assignments[creep.name];
            if ((creep === null || creep === void 0 ? void 0 : creep.memory.runState) === States.DEPOSIT && !assignment.depositTarget) {
                assignment.depositTarget = this.findBestDepositTarget(creep, creep.memory.fromStorage, true);
            }
            else if ((creep === null || creep === void 0 ? void 0 : creep.memory.runState) === States.WITHDRAW &&
                !assignment.withdrawTarget &&
                !creep.memory.fromStorage) {
                assignment.withdrawTarget = this.findBestWithdrawTarget(creep, true);
            }
        }
        // check for bucket brigade transfers
        const hasBrigaded = new Set();
        for (const creep1 of haulers) {
            if (hasBrigaded.has(creep1))
                continue; // already done
            for (const creep2 of creep1.pos.findInRange(FIND_MY_CREEPS, 1)) {
                if (hasBrigaded.has(creep2) || !haulers.includes(creep2))
                    continue;
                // adjacent logistics minion
                let withdraw, deposit;
                if (creep1.memory.runState === States.DEPOSIT && creep2.memory.runState === States.WITHDRAW) {
                    withdraw = creep2;
                    deposit = creep1;
                }
                else if (creep2.memory.runState === States.DEPOSIT && creep1.memory.runState === States.WITHDRAW) {
                    withdraw = creep1;
                    deposit = creep2;
                }
                else {
                    continue;
                }
                if (withdraw.store.getFreeCapacity() < deposit.store[RESOURCE_ENERGY])
                    continue;
                const withdrawAssignment = data.assignments[withdraw.name];
                const depositAssignment = data.assignments[deposit.name];
                const target = byId(depositAssignment.depositTarget);
                if (!target || target instanceof Creep)
                    continue;
                const targetPos = target.pos;
                if (getRangeTo(withdraw.pos, targetPos) >= getRangeTo(deposit.pos, targetPos))
                    continue;
                // clear to swap
                if (deposit.transfer(withdraw, RESOURCE_ENERGY) === OK) {
                    withdraw.memory.runState = States.DEPOSIT;
                    deposit.memory.runState = States.WITHDRAW;
                    data.assignments[withdraw.name] = depositAssignment;
                    data.assignments[deposit.name] = withdrawAssignment;
                    withdraw.store[RESOURCE_ENERGY] += deposit.store[RESOURCE_ENERGY];
                    deposit.store[RESOURCE_ENERGY] = 0;
                    hasBrigaded.add(withdraw);
                    hasBrigaded.add(deposit);
                }
            }
        }
        for (const creep of allHaulers) {
            const assignment = Object.assign(Object.assign({}, data.assignments[creep.name]), { office: data.office });
            runStates({
                [States.DEPOSIT]: deposit$1(creep.memory.fromStorage),
                [States.WITHDRAW]: withdraw(creep.memory.fromStorage),
                [States.RECYCLE]: recycle
            }, assignment, creep);
        }
    }
}

const franchiseIncome = (office) => {
    return activeMissions(office)
        .filter(isMission(HarvestMission))
        .map(m => m.harvestRate())
        .reduce(sum, 0);
};

const getActualEnergyAvailable = memoizeByTick(office => office, (office) => {
    var _a, _b, _c;
    if ((_a = Memory.rooms[office].rclMilestones) === null || _a === void 0 ? void 0 : _a[rcl(office) + 1]) {
        // Room is down-leveled, get capacity from active spawns/extensions
        return getEnergyStructures(office).reduce((sum, s) => sum + s.store.getUsedCapacity(RESOURCE_ENERGY), 0);
    }
    return (_c = (_b = Game.rooms[office]) === null || _b === void 0 ? void 0 : _b.energyAvailable) !== null && _c !== void 0 ? _c : 0;
});

const recordMetrics = profiler.registerFN(() => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    var _x, _y, _z;
    let heapStats = (_b = (_a = Game.cpu).getHeapStatistics) === null || _b === void 0 ? void 0 : _b.call(_a);
    let stats = {
        time: Game.time,
        gcl: {
            progress: Game.gcl.progress,
            progressTotal: Game.gcl.progressTotal,
            level: Game.gcl.level
        },
        cpu: {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Game.cpu.getUsed(),
            heap: heapStats
                ? (heapStats.total_heap_size + heapStats.externally_allocated_size) / heapStats.heap_size_limit
                : 0
        },
        creepCount: Object.keys(Game.creeps).length,
        officeCount: Object.keys(Memory.offices).length
    };
    // Initialize, if necessary
    (_c = Memory.stats) !== null && _c !== void 0 ? _c : (Memory.stats = Object.assign(Object.assign({}, stats), { profiling: {}, gclMilestones: {}, offices: {} }));
    Memory.stats = Object.assign(Object.assign({}, Memory.stats), stats);
    (_d = (_x = Memory.stats).gclMilestones) !== null && _d !== void 0 ? _d : (_x.gclMilestones = {});
    (_e = (_y = Memory.stats.gclMilestones)[_z = Game.gcl.level]) !== null && _e !== void 0 ? _e : (_y[_z] = Game.time);
    for (let office in Memory.offices) {
        (_f = heapMetrics[office]) !== null && _f !== void 0 ? _f : (heapMetrics[office] = {
            roomEnergy: main_8.newTimeseries(),
            buildEfficiency: main_8.newTimeseries(),
            storageLevel: main_8.newTimeseries(),
            spawnEfficiency: main_8.newTimeseries()
        });
        main_8.update(heapMetrics[office].roomEnergy, getActualEnergyAvailable(office), 300);
        main_8.update(heapMetrics[office].storageLevel, storageEnergyAvailable(office), 100);
        const spawns = getSpawns(office);
        const spawnEfficiency = spawns.length ? spawns.filter(s => s.spawning).length / spawns.length : 0;
        main_8.update(heapMetrics[office].spawnEfficiency, spawnEfficiency, 100);
        Memory.stats.offices[office] = Object.assign(Object.assign({}, Memory.stats.offices[office]), { controllerProgress: (_h = (_g = Game.rooms[office].controller) === null || _g === void 0 ? void 0 : _g.progress) !== null && _h !== void 0 ? _h : 0, controllerProgressTotal: (_k = (_j = Game.rooms[office].controller) === null || _j === void 0 ? void 0 : _j.progressTotal) !== null && _k !== void 0 ? _k : 0, controllerLevel: (_m = (_l = Game.rooms[office].controller) === null || _l === void 0 ? void 0 : _l.level) !== null && _m !== void 0 ? _m : 0, libraryEnergyAvailable: (_u = (_t = (((_q = (_p = (_o = roomPlans(office)) === null || _o === void 0 ? void 0 : _o.library) === null || _p === void 0 ? void 0 : _p.link.structure) !== null && _q !== void 0 ? _q : (_s = (_r = roomPlans(office)) === null || _r === void 0 ? void 0 : _r.library) === null || _s === void 0 ? void 0 : _s.container.structure))) === null || _t === void 0 ? void 0 : _t.store[RESOURCE_ENERGY]) !== null && _u !== void 0 ? _u : 0, energyAvailable: Game.rooms[office].energyAvailable, energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable, spawnUptime: getSpawns(office).filter(s => s.spawning).length, storageLevel: storageEnergyAvailable(office), franchiseIncome: franchiseIncome(office), logisticsCapacity: activeMissions(office)
                .filter(isMission(LogisticsMission))
                .map(m => m.capacity())
                .reduce(sum, 0), logisticsUsedCapacity: activeMissions(office)
                .filter(isMission(LogisticsMission))
                .map(m => m.usedCapacity())
                .reduce(sum, 0), franchiseEnergy: franchisesByOffice(office)
                .map(({ source }) => franchiseEnergyAvailable(source))
                .reduce(sum, 0), terminalLevel: (_w = (_v = Game.rooms[office].terminal) === null || _v === void 0 ? void 0 : _v.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _w !== void 0 ? _w : 0, missions: activeMissions(office).reduce((sum, mission) => {
                var _a;
                var _b;
                (_a = sum[_b = mission.constructor.name]) !== null && _a !== void 0 ? _a : (sum[_b] = { cpu: 0, energy: 0 });
                sum[mission.constructor.name].cpu = mission.actualCpuPerCreep() - mission.estimatedCpuPerCreep();
                sum[mission.constructor.name].energy += mission.energyUsed();
                return sum;
            }, {}) });
    }
}, 'recordMetrics');

function registerCreeps() {
    for (const office in Memory.offices) {
        for (const spawn of getSpawns(office)) {
            if (spawn.spawning) {
                // register spawning creeps
                const creep = spawn.spawning.name;
                const mission = missionById(Memory.creeps[creep].missionId.split('|')[0]);
                mission === null || mission === void 0 ? void 0 : mission.register(Game.creeps[creep]);
            }
        }
    }
}
function vacateSpawns() {
    var _a, _b;
    for (const office in Memory.offices) {
        for (const spawn of getSpawns(office)) {
            if (spawn.spawning) {
                if (spawn.spawning.remainingTime < 2) {
                    const spawningCreep = Game.creeps[spawn.spawning.name];
                    const spawningSquares = (_b = (_a = spawn.spawning.directions) === null || _a === void 0 ? void 0 : _a.map(d => posAtDirection(spawn.pos, d))) !== null && _b !== void 0 ? _b : [
                        posAtDirection(spawn.pos, BOTTOM)
                    ];
                    main_24(spawningCreep, spawningSquares, 100);
                    for (const pos of spawningSquares) {
                        main_10$1(pos);
                    }
                }
            }
        }
    }
}
function spawnOrder(office, order, remaining) {
    let availableSpawns = getSpawns(office).filter(s => !s.spawning || s.spawning.remainingTime === 1);
    // console.log('availableSpawns', availableSpawns, JSON.stringify(order));
    if (availableSpawns.length === 0)
        return undefined; // No more available spawns
    // Get next scheduled order per spawn
    const spawn = availableSpawns.find(s => {
        if (byId(order.spawn)) {
            // Spawn-specific order
            return s.id === order.spawn;
        }
        return true;
    });
    if (!spawn) {
        // No more available spawns
        return undefined;
    }
    const tier = bestBuildTier(office, [order.builds]);
    const build = order.builds.find(b => b.tier === tier);
    if (!build) {
        // No valid builds
        return undefined;
    }
    const { body, boosts } = build;
    const adjustedBudget = getBudgetAdjustment(order.office, order.budget);
    const estimate = order.estimate(build);
    if (estimate.energy > remaining.energy - adjustedBudget || estimate.cpu > remaining.cpu) {
        // No valid builds
        return undefined;
    }
    // check if boosts are available
    let boostOrder;
    try {
        boostOrder = orderBoosts(office, order.name, boosts);
    }
    catch (e) {
        console.log(e);
        // No valid builds
        order.onFailure('NO_BOOSTS');
        return undefined;
    }
    // Spawn is available
    // console.log(order.data.body, order.data.name);
    const result = spawn.spawnCreep(body, order.name, {
        directions: order.directions,
        memory: order.memory,
        energyStructures: getEnergyStructures(office)
    });
    // console.log(order.name, 'spawn result', result);
    if (result === OK) {
        availableSpawns = availableSpawns.filter(s => s !== spawn);
        if (boostOrder) {
            Memory.offices[office].lab.boosts.push(boostOrder);
            Memory.creeps[order.name].runState = States.GET_BOOSTED;
        }
    }
    else if (result !== ERR_NOT_ENOUGH_ENERGY && result !== ERR_BUSY) {
        // Spawn failed un-recoverably, abandon order
        console.log('Unrecoverable spawn error', result);
        console.log(order.name, body.length);
        order.onFailure('OTHER');
    }
    return {
        build,
        estimate,
        spawned: result === OK
    };
}
const orderBoosts = (office, name, boosts) => {
    var _a, _b;
    if (!boosts.length || !((_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.labs) === null || _b === void 0 ? void 0 : _b.labs.some(l => l.structure)))
        return undefined;
    const order = {
        name,
        boosts: []
    };
    for (const boost of boosts) {
        let available = boostsAvailable(office, boost.type, true);
        if (available && available >= boost.count * LAB_BOOST_MINERAL) {
            // We have enough minerals, enter a boost order
            order.boosts.push({
                type: boost.type,
                count: boost.count * LAB_BOOST_MINERAL
            });
        }
        else {
            throw new Error(`Not enough resources to boost order "${name}": ${JSON.stringify(boosts)}`);
        }
    }
    return order;
};

const energyInProduction = memoizeByTick(office => office, (office) => {
    let harvestCapacity = 0;
    let haulCapacity = 0;
    for (const mission of activeMissions(office)) {
        if (isMission(LogisticsMission)(mission)) {
            haulCapacity += mission.capacity();
        }
        if (isMission(HarvestMission)(mission)) {
            harvestCapacity += mission.haulingCapacityNeeded();
        }
    }
    return Math.min(harvestCapacity, haulCapacity);
});

const updateMissionEnergyAvailable = () => {
    for (const office in Memory.offices) {
        let energy = Math.max(roomEnergyAvailable(office), energyInProduction(office)) -
            (Game.rooms[office].energyCapacityAvailable - Game.rooms[office].energyAvailable);
        for (const mission of activeMissions(office)) {
            energy -= mission.energyRemaining();
        }
        MissionEnergyAvailable[office] = energy;
    }
};

let start = 0;
let current = 0;
let saveInMemory = false;
const resetDebugCPU = (inMemory = false) => {
    saveInMemory = inMemory;
    start = Game.cpu.getUsed();
    current = start;
    if (!inMemory) {
        console.log(` -=< Starting CPU debug >=-         [ 0.000 | 0.000 ]`);
    }
    else {
        Memory.stats.profiling = {};
    }
};
const debugCPU = (context) => {
    var _a, _b;
    var _c;
    let previous = current;
    current = Game.cpu.getUsed();
    if (!saveInMemory) {
        console.log(`${context.padEnd(35)} [ ${(current - previous).toFixed(3)} | ${(current - start).toFixed(3)} ]`);
    }
    else {
        if (!Memory.stats)
            return;
        (_a = (_c = Memory.stats).profiling) !== null && _a !== void 0 ? _a : (_c.profiling = {});
        Memory.stats.profiling[context] = ((_b = Memory.stats.profiling[context]) !== null && _b !== void 0 ? _b : 0) + current - previous;
    }
};

class BaseMissionSpawner {
    register(ids) { }
    get resolved() {
        return;
    }
    /**
     * Generate missions
     */
    spawn() { }
}

class ConditionalMissionSpawner extends BaseMissionSpawner {
    constructor(missionClass, missionData, spawnWhen, onSpawn) {
        super();
        this.missionClass = missionClass;
        this.missionData = missionData;
        this.spawnWhen = spawnWhen;
        this.onSpawn = onSpawn;
        this.ids = [];
    }
    register(ids) {
        var _a;
        this.ids = ids;
        (_a = this.resolved) === null || _a === void 0 ? void 0 : _a.init();
    }
    spawn() {
        var _a;
        let mission = this.missionClass.fromId(this.ids[0]);
        if (!mission || mission.status === MissionStatus.DONE) {
            this.ids.shift();
            if (this.spawnWhen()) {
                mission = new this.missionClass(this.missionData());
                (_a = this.onSpawn) === null || _a === void 0 ? void 0 : _a.call(this, mission);
                this.ids.push(mission.id);
            }
        }
    }
    get resolved() {
        return this.missionClass.fromId(this.ids[0]);
    }
}

class MissionSpawner extends ConditionalMissionSpawner {
    constructor(missionClass, missionData, onSpawn) {
        super(missionClass, missionData, () => true, onSpawn);
        this.missionClass = missionClass;
        this.missionData = missionData;
        this.onSpawn = onSpawn;
    }
}

class MultiMissionSpawner extends BaseMissionSpawner {
    constructor(missionClass, generate, onSpawn) {
        super();
        this.missionClass = missionClass;
        this.generate = generate;
        this.onSpawn = onSpawn;
        this.ids = [];
    }
    register(ids) {
        this.ids = ids;
        this.resolved.forEach(m => m.init());
    }
    spawn() {
        var _a;
        for (const data of this.generate(this.resolved)) {
            const mission = new this.missionClass(data);
            (_a = this.onSpawn) === null || _a === void 0 ? void 0 : _a.call(this, mission);
            this.ids.push(mission.id);
        }
    }
    get resolved() {
        // clean up ids
        this.ids.forEach((id, i) => {
            if (!Memory.missions[id])
                this.ids.splice(this.ids.indexOf(id));
        });
        return this.ids
            .map(id => this.missionClass.fromId(id))
            .filter(mission => (mission === null || mission === void 0 ? void 0 : mission.status) !== MissionStatus.DONE);
    }
}

const hasEnergyIncome = memoizeByTick(office => office, (office) => {
    const harvestMissions = activeMissions(office)
        .filter(isMission(HarvestMission))
        .some(m => m.harvestRate() > 0);
    const logisticsMissions = activeMissions(office)
        .filter(isMission(LogisticsMission))
        .some(m => m.capacity() > 0);
    return ((harvestMissions && logisticsMissions) ||
        storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable);
});

const ACQUIRE = {
    SCORE_WEIGHT: {
        RAMPART_COUNT: 1,
        FRANCHISES_INSIDE_PERIMETER: 1,
        SWAMP_COUNT: 1,
        MINERAL_TYPE: 2,
        REMOTE_COUNT: 1
    },
    MINERAL_PRIORITIES: [
        RESOURCE_CATALYST,
        RESOURCE_UTRIUM,
        RESOURCE_KEANIUM,
        RESOURCE_LEMERGIUM,
        RESOURCE_ZYNTHIUM,
        RESOURCE_HYDROGEN,
        RESOURCE_OXYGEN
    ]
};

/**
 * Higher score is better
 */
function scoreAcquireTarget(room) {
    var _a, _b, _c, _d;
    let score = 0;
    // check minerals we own
    const mineral = Memory.rooms[room].mineralType;
    if (mineral) {
        let mineralScore = ACQUIRE.MINERAL_PRIORITIES.indexOf(mineral) +
            (ownedMinerals().has(mineral) ? ACQUIRE.MINERAL_PRIORITIES.length : 0);
        let mineralScorePercent = 1 - mineralScore / (ACQUIRE.MINERAL_PRIORITIES.length * 2 - 1);
        score += mineralScorePercent * ACQUIRE.SCORE_WEIGHT.MINERAL_TYPE;
    }
    // Check number of ramparts
    const ramparts = (_c = (_b = (_a = roomPlans(room)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts.length) !== null && _c !== void 0 ? _c : 100; // if undefined, bad score anyways
    // score of 1 for 0 ramparts down to 0 for 50 ramparts
    const rampartScorePercent = Math.max(0, Math.min(1, (50 - ramparts) / 50));
    score += rampartScorePercent * ACQUIRE.SCORE_WEIGHT.RAMPART_COUNT;
    // TODO: check number of franchises inside perimeter
    // Check number of swamps
    const { swamp } = countTerrainTypes(room);
    // score of 1 for 0 swamps down to 0 for 1000 swamps
    const swampScorePercent = Math.max(0, Math.min(1, (1000 - swamp) / 1000));
    score += swampScorePercent * ACQUIRE.SCORE_WEIGHT.SWAMP_COUNT;
    // TODO: check number of available immediately adjacent remotes
    const remotes = Object.values((_d = Game.map.describeExits(room)) !== null && _d !== void 0 ? _d : {})
        .map(r => (isSourceKeeperRoom(r) ? 0 : sourceIds(r).length))
        .reduce((a, b) => a + b, 0);
    const remoteScorePercent = remotes / (4 * 2); // 4 remotes * 2 sources is theoretical best
    score += remoteScorePercent * ACQUIRE.SCORE_WEIGHT.REMOTE_COUNT;
    // TODO: check proximity to hostile rooms/remotes
    return score;
}

/**
 * If GCL <= Memory.offices.length, return
 * If an Acquire target is already saved (and still valid), use that
 * Otherwise, for each office, find the closest room plan that isn't
 * already an office. The closest is the winner.
 */
const findAcquireTarget = () => {
    const offices = Object.keys(Memory.offices);
    if (offices.length >= OFFICE_LIMIT || Game.cpu.limit / offices.length <= 5)
        return undefined; // Don't spread ourselves out too thin
    if (Memory.acquireTarget &&
        acquireTargetIsValid(Memory.acquireTarget) &&
        !shouldPostponeAcquire(Memory.acquireTarget)) {
        return Memory.acquireTarget;
    }
    else {
        Memory.acquireTarget = undefined;
    }
    // Evaluate a new target every 50 ticks
    if ((Game.time + 25) % 50 !== 0)
        return undefined;
    // No cached target, scan for an acceptable one
    let bestTarget;
    let bestScore = Infinity;
    // Look for acquire/support target in Offices if GCL = offices count
    let targetRooms = Game.gcl.level <= offices.length ? Object.keys(Memory.offices) : Object.keys(Memory.rooms);
    for (const room of targetRooms) {
        if (!acquireTargetIsValid(room) || shouldPostponeAcquire(room)) {
            continue;
        }
        const distance = Math.min(...offices
            .filter(r => Game.rooms[r].energyCapacityAvailable >= 850)
            .map(r => { var _a; return (_a = getOfficeDistanceByRoomPath(r, room)) !== null && _a !== void 0 ? _a : Infinity; }), Infinity);
        if (distance * 50 > CREEP_CLAIM_LIFE_TIME) {
            continue;
        }
        const score = scoreAcquireTarget(room);
        // If no target, pick the first eligible one
        // If the target has a better mineral, pick that one
        // If the target's mineral ranking is the same but it's closer, pick that one
        if (!bestTarget || score < bestScore) {
            bestTarget = room;
            bestScore = score;
        }
    }
    if (bestTarget) {
        delete Memory.rooms[bestTarget].lastAcquireAttempt;
        Memory.acquireTarget = bestTarget;
    }
    return Memory.acquireTarget;
};
/**
 * If acquire attempt fails, reschedule attempt on a progressive scale
 * 20k ticks after first failure, 40k ticks after second, etc.
 */
const shouldPostponeAcquire = (roomName) => {
    var _a, _b, _c, _d;
    if ((_b = (_a = Game.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.my)
        return false; // already claimed
    // If it's less than five ticks since Lawyer checked in,
    // or Lawyer hasn't checked in yet, ignore
    const timeSinceLastAttempt = Game.time - ((_c = Memory.rooms[roomName].lastAcquireAttempt) !== null && _c !== void 0 ? _c : Game.time);
    const attempts = (_d = Memory.rooms[roomName].acquireAttempts) !== null && _d !== void 0 ? _d : 0;
    if (timeSinceLastAttempt < 5) {
        return false;
    }
    if (timeSinceLastAttempt > attempts * 20000) {
        return false;
    }
    return true;
};
const acquireTargetIsValid = (roomName) => {
    var _a, _b, _c, _d, _e;
    return (Memory.rooms[roomName].eligibleForOffice &&
        (!Memory.rooms[roomName].owner ||
            (Memory.rooms[roomName].owner === 'LordGreywether' && ((_c = (_b = (_a = Game.rooms[roomName]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.level) !== null && _c !== void 0 ? _c : 0) < 4)) &&
        (!Memory.rooms[roomName].reserver || Memory.rooms[roomName].reserver === 'LordGreywether') &&
        ((_d = Memory.roomPlans[roomName]) === null || _d === void 0 ? void 0 : _d.office) &&
        (Memory.rooms[roomName].owner === 'LordGreywether' || ((_e = Memory.rooms[roomName].safeModeCooldown) !== null && _e !== void 0 ? _e : 0) < Game.time));
};
const officeShouldAcquireTarget = (officeName) => {
    const room = findAcquireTarget();
    if (!room)
        return false;
    if (officeName === room || rcl(officeName) < 5)
        return false;
    const distance = getOfficeDistanceByRoomPath(officeName, room);
    return distance && distance < CREEP_CLAIM_LIFE_TIME;
};
const officeShouldClaimAcquireTarget = (officeName) => {
    // Sets acquireTarget and acquiringOffice. If we sohuld not
    // support, we should not claim either.
    if (!officeShouldAcquireTarget(officeName))
        return false;
    // Evaluate further if claiming is actually necessary
    if (!Memory.acquireTarget)
        return false;
    return !Memory.offices[Memory.acquireTarget];
};
const officeShouldSupportAcquireTarget = (officeName) => {
    var _a;
    // Sets acquireTarget and acquiringOffice. If we sohuld not
    // support, we should not claim either.
    if (!officeShouldAcquireTarget(officeName))
        return false;
    // Evaluate further if claiming or support are necessary
    if (!Memory.acquireTarget)
        return false;
    // if (roomPlans(Memory.acquireTarget)?.fastfiller?.spawns[0].structure) return false; // don't bother supporting once we have a spawn
    const controller = (_a = Game.rooms[Memory.acquireTarget]) === null || _a === void 0 ? void 0 : _a.controller;
    if (!controller)
        return false;
    return controller.my && controller.level < 4;
};

const buildEngineer = (energy, roads = false, near = false) => {
    if (near) {
        if (roads) {
            return unboosted(buildFromSegment(energy, [WORK, MOVE, CARRY, CARRY]));
        }
        else {
            return unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY]));
        }
    }
    else {
        if (roads) {
            if (energy <= 500)
                return unboosted(buildFromSegment(energy, [WORK, MOVE, CARRY, CARRY]));
            return unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]));
        }
        else {
            if (energy <= 550)
                return unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY]));
            if (energy <= 1800)
                return unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]));
            // prettier-ignore
            return unboosted([
                WORK, WORK, WORK,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
                CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
                CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY
            ]);
        }
    }
};

/**
 * Return the ramparts that are close to an enemy
 */
memoizeByTick(room => room, (room) => {
    var _a, _b, _c;
    if (!findHostileCreeps(room).length)
        return [];
    const ramparts = (_c = (_b = (_a = roomPlans(room)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts) !== null && _c !== void 0 ? _c : [];
    if (ramparts.length === 0)
        return [];
    return ramparts.filter(r => r.structure && findHostileCreepsInRange(r.pos, 5).length);
});
/**
 * True if ramparts have lost containment
 */
const rampartsAreBroken = memoizeByTick(room => room, (room) => {
    var _a, _b;
    return Boolean((_b = (_a = roomPlans(room)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts.some(r => !r.structure));
});
/**
 * Returns ramparts in need of repair, in priority order
 */
memoizeByTick(room => room, (room) => {
    var _a, _b, _c;
    const ramparts = (_c = (_b = (_a = roomPlans(room)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts) !== null && _c !== void 0 ? _c : [];
    return ramparts
        .filter(r => !r.structure || BARRIER_LEVEL[rcl(room)] * repairThreshold(r) > r.structure.hits)
        .sort((a, b) => { var _a, _b, _c, _d; return ((_b = (_a = a.structure) === null || _a === void 0 ? void 0 : _a.hits) !== null && _b !== void 0 ? _b : 0) - ((_d = (_c = b.structure) === null || _c === void 0 ? void 0 : _c.hits) !== null && _d !== void 0 ? _d : 0); });
});

const queue = new Map();
const schedule = (fn, ticks) => {
    var _a;
    const list = (_a = queue.get(Game.time + ticks)) !== null && _a !== void 0 ? _a : [];
    list.push(fn);
    queue.set(Game.time + ticks, list);
};
const runScheduled = () => {
    for (const [k, entries] of queue) {
        if (k <= Game.time) {
            entries.forEach(fn => fn());
            queue.delete(k);
        }
    }
};

const queues = new Map();
class EngineerQueue {
    constructor(office) {
        this.office = office;
        this.build = new Set();
        this.maintain_barriers = new Set();
        this.maintain_economy = new Set();
        this.maintain_roads = new Set();
        this.maintain_other = new Set();
        this.survey = memoize(() => { var _a; return `${rcl(this.office)}${(_a = Game.rooms[this.office]) === null || _a === void 0 ? void 0 : _a.find(FIND_STRUCTURES).length}`; }, () => {
            this.build = new Set();
            this.maintain_barriers = new Set();
            this.maintain_economy = new Set();
            this.maintain_roads = new Set();
            this.maintain_other = new Set();
            for (const structure of plannedStructuresByRcl(this.office)) {
                this.surveyStructure(structure);
            }
        }, 100);
        this.allWorkQueue = memoizeOncePerTick(() => [
            ...[...this.build].filter(s => s.canBuild()),
            ...this.maintain_economy,
            ...this.maintain_barriers,
            ...this.maintain_roads,
            ...this.maintain_other
        ]);
        this.workQueue = memoizeOncePerTick(() => {
            var _a, _b;
            const build = [...this.build].filter(
            // if room is owned or reserved by someone else, we can't place a construction site
            s => s.canBuild());
            if (build.length)
                return build;
            const threatLevel = (_b = (_a = Memory.rooms[this.office].threatLevel) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : 0;
            if (threatLevel || (rcl(this.office) > 4 && rampartsAreBroken(this.office))) {
                // wartime priority
                if (this.maintain_barriers.size)
                    return [...this.maintain_barriers];
                if (this.maintain_economy.size)
                    return [...this.maintain_economy];
                if (this.maintain_roads.size)
                    return [...this.maintain_roads];
            }
            else {
                // peacetime priority
                if (this.maintain_economy.size)
                    return [...this.maintain_economy];
                if (this.maintain_roads.size)
                    return [...this.maintain_roads];
                if (this.maintain_barriers.size)
                    return [...this.maintain_barriers];
            }
            return [...this.maintain_other];
        });
        this.analysis = memoizeOncePerTick(() => {
            var _a, _b, _c;
            const data = {
                energyRemaining: 0,
                workTicksRemaining: 0,
                averageRange: 0,
                minRange: Infinity,
                count: 0
            };
            let storagePos = (_c = (_b = (_a = roomPlans(this.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos) !== null && _c !== void 0 ? _c : new RoomPosition(25, 25, this.office);
            let range = 0;
            this.allWorkQueue().forEach(s => {
                data.count += 1;
                data.energyRemaining += s.energyToBuild + s.energyToRepair;
                data.workTicksRemaining += s.energyToBuild / BUILD_POWER + s.energyToRepair / (REPAIR_COST * REPAIR_POWER);
                data.minRange = Math.min(data.minRange, getRangeTo(storagePos, s.pos));
                range += getRangeTo(storagePos, s.pos);
            });
            if (data.count)
                data.averageRange = range / data.count;
            return data;
        });
        const instance = queues.get(office);
        if (instance)
            return instance;
        queues.set(this.office, this);
    }
    surveyStructure(structure) {
        structure.survey();
        if (!Game.rooms[structure.pos.roomName] ||
            (structure.energyToBuild === 0 && structure.energyToRepair <= repairThreshold(structure)))
            return; // only register if we can confirm work to be done
        if (!structure.structureId) {
            this.build.add(structure);
        }
        else {
            switch (structure.structureType) {
                case STRUCTURE_WALL:
                case STRUCTURE_RAMPART:
                    this.maintain_barriers.add(structure);
                    break;
                case STRUCTURE_ROAD:
                    this.maintain_roads.add(structure);
                    break;
                case STRUCTURE_CONTAINER:
                case STRUCTURE_LINK:
                case STRUCTURE_SPAWN:
                case STRUCTURE_EXTENSION:
                    this.maintain_economy.add(structure);
                    break;
                default:
                    this.maintain_other.add(structure);
            }
        }
    }
    getNextStructure(creep) {
        var _a;
        const queue = this.workQueue();
        if (((_a = queue[0]) === null || _a === void 0 ? void 0 : _a.structureType) === STRUCTURE_ROAD) {
            return getClosestByRange(creep.pos, queue); // build roads based on whatever's closest
        }
        else {
            return queue[0]; // otherwise, build in queue order (ramparts are sorted by hits automatically)
        }
    }
    complete(structure) {
        if (this.workQueue().includes(structure)) {
            this.workQueue().splice(this.workQueue().indexOf(structure), 1);
        }
        this.build.delete(structure);
        this.maintain_barriers.delete(structure);
        this.maintain_economy.delete(structure);
        this.maintain_roads.delete(structure);
        this.maintain_other.delete(structure);
        schedule(() => this.surveyStructure(structure), 1);
    }
}

const isSpawned = (creep) => creep && !creep.spawning;

let log = new Map();
let loggedTicks = 0;
let last = 0;
let reportedTick = 0;
const logCpuStart = () => (last = Game.cpu.getUsed());
const logCpu = (context) => {
    var _a;
    if (reportedTick !== Game.time) {
        for (let [c, data] of log) {
            const invocationsPerTick = data[0] / loggedTicks;
            const averagePerInvocation = data[1] / data[0];
            console.log(`${c}: ${invocationsPerTick.toFixed(3)} x ${averagePerInvocation.toFixed(3)} = ${(invocationsPerTick * averagePerInvocation).toFixed(3)}`);
        }
        loggedTicks += 1;
        reportedTick = Game.time;
    }
    const [invocations, time] = (_a = log.get(context)) !== null && _a !== void 0 ? _a : [0, 0];
    const cpu = Game.cpu.getUsed();
    log.set(context, [invocations + 1, time + Math.max(0, cpu - last)]);
    last = cpu;
};

const franchiseIsFull = memoizeByTick((office, id) => office + id, (office, id) => {
    const pos = posById(id);
    const harvestRate = activeMissions(office)
        .filter(isMission(HarvestMission))
        .filter(m => m.missionData.source === id)
        .map(m => m.harvestRate())
        .reduce(sum, 0);
    if (id && harvestRate >= 10)
        return true;
    if (!pos || !Game.rooms[pos.roomName])
        return false; // Can't find the source, don't know if it's full
    return adjacentWalkablePositions(pos, false).length === 0;
});

const energySourcesByOffice = memoizeByTick((office, withdrawLimit, remote) => office + withdrawLimit + remote, (office, withdrawLimit, remote = false) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const sources = [];
    // ruins
    (_a = Game.rooms[office]) === null || _a === void 0 ? void 0 : _a.find(FIND_RUINS, { filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) !== 0 }).forEach(ruin => sources.push(ruin));
    // dropped resources
    (_b = Game.rooms[office]) === null || _b === void 0 ? void 0 : _b.find(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount > CARRY_CAPACITY * 2
    }).forEach(resource => sources.push(resource));
    // sources
    const shouldHarvest = !hasEnergyIncome(office);
    const shouldGetFromFranchise = storageEnergyAvailable(office) > Game.rooms[office].energyCapacityAvailable;
    franchisesByOffice(office)
        .map(({ source }) => {
        var _a, _b;
        return ({
            id: source,
            energy: (_b = (_a = byId(source)) === null || _a === void 0 ? void 0 : _a.energy) !== null && _b !== void 0 ? _b : SOURCE_ENERGY_NEUTRAL_CAPACITY,
            pos: posById(source)
        });
    })
        .filter(source => (shouldHarvest || source.pos.roomName !== office) &&
        ((shouldGetFromFranchise && franchiseEnergyAvailable(source.id) >= 50) ||
            (shouldHarvest && !franchiseIsFull(office, source.id) && source.energy > 0)))
        .forEach(source => sources.push(source));
    // storage
    const storage = [];
    if ((_d = (_c = roomPlans(office)) === null || _c === void 0 ? void 0 : _c.headquarters) === null || _d === void 0 ? void 0 : _d.storage.structure)
        storage.push(roomPlans(office).headquarters.storage.structure);
    if ((_g = (_f = (_e = roomPlans(office)) === null || _e === void 0 ? void 0 : _e.library) === null || _f === void 0 ? void 0 : _f.container.structure) === null || _g === void 0 ? void 0 : _g.store[RESOURCE_ENERGY])
        storage.push(roomPlans(office).library.container.structure);
    if ((_k = (_j = (_h = roomPlans(office)) === null || _h === void 0 ? void 0 : _h.library) === null || _j === void 0 ? void 0 : _j.link.structure) === null || _k === void 0 ? void 0 : _k.store[RESOURCE_ENERGY])
        storage.push(roomPlans(office).library.link.structure);
    if (!((_m = (_l = roomPlans(office)) === null || _l === void 0 ? void 0 : _l.headquarters) === null || _m === void 0 ? void 0 : _m.storage.structure) &&
        ((_q = (_p = (_o = roomPlans(office)) === null || _o === void 0 ? void 0 : _o.fastfiller) === null || _p === void 0 ? void 0 : _p.containers.map(c => { var _a, _b; return (_b = (_a = c.structure) === null || _a === void 0 ? void 0 : _a.store[RESOURCE_ENERGY]) !== null && _b !== void 0 ? _b : 0; }).reduce(sum, 0)) !== null && _q !== void 0 ? _q : 0) > withdrawLimit)
        (_s = (_r = roomPlans(office)) === null || _r === void 0 ? void 0 : _r.fastfiller) === null || _s === void 0 ? void 0 : _s.containers.filter(c => c.structure && c.structure.store[RESOURCE_ENERGY]).forEach(c => storage.push(c.structure));
    if (!storage.length)
        getSpawns(office)
            .filter(c => c.store[RESOURCE_ENERGY] > withdrawLimit)
            .forEach(c => storage.push(c));
    if (storage.length) {
        // && !remote
        sources.push(...storage);
    }
    return sources;
});

const fromDroppedResource = (creep, resourceId) => {
    const resource = byId(resourceId);
    if (!resource)
        return BehaviorResult.FAILURE;
    main_26(creep, resource);
    if (creep.pickup(resource) === OK) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
};

/**
 * Returns SUCCESS if expected to complete this tick, FAILURE if it
 * cannot complete (or source is depleted), INPROGRESS otherwise
 */
const fromFranchise = (creep, sourceId) => {
    var _a;
    const sourcePos = posById(sourceId);
    if (!sourcePos)
        return BehaviorResult.FAILURE;
    if (!Game.rooms[sourcePos.roomName]) {
        main_26(creep, { pos: sourcePos, range: 2 });
        return BehaviorResult.INPROGRESS;
    }
    if (franchiseEnergyAvailable(sourceId) < 50) {
        return BehaviorResult.SUCCESS;
    }
    const container = (_a = getFranchisePlanBySourceId(sourceId)) === null || _a === void 0 ? void 0 : _a.container.structure;
    const resources = resourcesNearPos(sourcePos, 1, RESOURCE_ENERGY);
    let pickedUp = 0;
    if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        // Get from container, if possible
        main_26(creep, { pos: container.pos, range: 1 });
        if (creep.withdraw(container, RESOURCE_ENERGY) === OK) {
            pickedUp += container.store.getUsedCapacity(RESOURCE_ENERGY);
        }
    }
    else if (resources.length > 0) {
        // Otherwise, pick up loose resources
        const res = resources.shift();
        if (res) {
            main_26(creep, { pos: res.pos, range: 1 });
            if (creep.pickup(res) === OK) {
                pickedUp += res.amount;
            }
        }
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) <= pickedUp) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
};

/**
 * Returns SUCCESS if expected to complete this tick, FAILURE if it
 * cannot complete (or source is depleted), INPROGRESS otherwise
 */
const fromSource = (creep, sourceId) => {
    const sourcePos = posById(sourceId);
    if (!sourcePos)
        return BehaviorResult.FAILURE;
    main_26(creep, { pos: sourcePos, range: 1 });
    // failure cases
    const source = byId(sourceId);
    if (!source) {
        if (Game.rooms[sourcePos.roomName]) {
            return BehaviorResult.FAILURE;
        }
        else {
            return BehaviorResult.INPROGRESS;
        }
    }
    if (source.energy === 0)
        return BehaviorResult.FAILURE;
    // everything is in order: attempt to harvest
    if (creep.harvest(source) === OK &&
        creep.store.getFreeCapacity(RESOURCE_ENERGY) <= creep.getActiveBodyparts(WORK) * HARVEST_POWER) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
};

const fromStorageStructure = (creep, structureId) => {
    const structure = byId(structureId);
    if (!(structure === null || structure === void 0 ? void 0 : structure.store.getUsedCapacity(RESOURCE_ENERGY)))
        return BehaviorResult.FAILURE;
    main_26(creep, { pos: structure.pos, range: 1 });
    if (creep.withdraw(structure, RESOURCE_ENERGY) === OK) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
};

const engineerGetEnergy = (creep, office, withdrawLimit = Game.rooms[office].energyCapacityAvailable, remote = false) => {
    if (!creep.memory.getEnergySource) {
        const source = getClosestByRange(creep.pos, energySourcesByOffice(office, withdrawLimit, remote));
        if (!source) {
            return BehaviorResult.FAILURE;
        }
        else {
            creep.memory.getEnergySource = source.id;
        }
    }
    if (!creep.memory.getEnergySource) {
        return BehaviorResult.FAILURE;
    }
    const source = byId(creep.memory.getEnergySource);
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        return BehaviorResult.SUCCESS;
    }
    let result = BehaviorResult.INPROGRESS;
    if (!source || source instanceof Source) {
        // is a source or remote franchise with no visibility, or is gone
        if (!source && !posById(creep.memory.getEnergySource)) {
            // source is gone
            result = BehaviorResult.FAILURE;
        }
        if (activeMissions(office)
            .filter(isMission(HarvestMission))
            .some(m => m.missionData.source === creep.memory.getEnergySource && m.harvestRate() > 0)) {
            // source is being harvested by another creep
            result = fromFranchise(creep, creep.memory.getEnergySource);
        }
        else {
            result = fromSource(creep, creep.memory.getEnergySource);
        }
    }
    else if (source instanceof Resource) {
        result = fromDroppedResource(creep, source.id);
    }
    else {
        if (source.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            result = BehaviorResult.FAILURE;
        }
        result = fromStorageStructure(creep, source.id);
    }
    if (result !== BehaviorResult.INPROGRESS) {
        delete creep.memory.getEnergySource;
    }
    return result;
};

class EngineerMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.budget = Budget.EFFICIENCY;
        this.creeps = {
            engineers: new MultiCreepSpawner('e', this.missionData.office, {
                role: MinionTypes.ENGINEER,
                budget: this.budget,
                builds: energy => buildEngineer(energy, this.calculated().roads),
                count: current => {
                    var _a, _b;
                    let pendingCost = this.queue.analysis().energyRemaining;
                    // If rcl < 2, engineers will also upgrade
                    if (rcl(this.missionData.office) < 2) {
                        const controller = Game.rooms[this.missionData.office].controller;
                        pendingCost += ((_a = controller === null || controller === void 0 ? void 0 : controller.progressTotal) !== null && _a !== void 0 ? _a : 0) - ((_b = controller === null || controller === void 0 ? void 0 : controller.progress) !== null && _b !== void 0 ? _b : 0);
                    }
                    else {
                        // above RCL2, let repair work accumulate before spawning
                        if (this.queue.build.size === 0 && pendingCost < 1500) {
                            pendingCost = 0;
                        }
                    }
                    if (this.estimatedEnergyRemaining < pendingCost)
                        return 1;
                    return 0;
                }
            })
        };
        this.priority = 8;
        this.calculated = memoizeOncePerTick(() => {
            return {
                roads: rcl(this.missionData.office) > 3
            };
        });
        this.engineerStats = memoize((creepName) => creepName, (creepName) => {
            const creep = Game.creeps[creepName];
            const stats = combatPower(creep);
            return {
                buildTicks: stats.carry / stats.build,
                repairTicks: stats.carry / (stats.repair * REPAIR_COST),
                speed: stats.speed
            };
        });
        this.updateEstimatedEnergy = memoizeOnce(() => {
            var _a, _b;
            if (this.creeps.engineers.resolved.length === 0) {
                this.estimatedEnergyRemaining = 0;
                return;
            }
            const analysis = this.queue.analysis();
            let energy = analysis.energyRemaining / analysis.workTicksRemaining;
            if (isNaN(energy))
                energy = 1;
            const RANGE_OFFSET = 1.5; // approximate the difference between path and range distance
            const workTicksRemaining = this.creeps.engineers.resolved
                .map(c => {
                var _a;
                const { buildTicks, repairTicks, speed } = this.engineerStats(c.name);
                const workTicks = energy < 3 ? repairTicks : buildTicks;
                const period = Math.min(estimateMissionInterval(this.missionData.office), (_a = c.ticksToLive) !== null && _a !== void 0 ? _a : CREEP_LIFE_TIME);
                const iterationTime = workTicks + analysis.minRange * speed * 2 * RANGE_OFFSET;
                const iterations = period / iterationTime;
                const remaining = workTicks * iterations;
                if (isNaN(remaining))
                    return 0;
                return remaining;
            })
                .reduce(sum, 0);
            // add controller upgrading to total energy remaining
            let energyRemaining = analysis.energyRemaining;
            if (rcl(this.missionData.office) < 8) {
                const controller = Game.rooms[this.missionData.office].controller;
                energyRemaining += ((_a = controller === null || controller === void 0 ? void 0 : controller.progressTotal) !== null && _a !== void 0 ? _a : 0) - ((_b = controller === null || controller === void 0 ? void 0 : controller.progress) !== null && _b !== void 0 ? _b : 0);
            }
            this.estimatedEnergyRemaining = Math.min(energyRemaining, workTicksRemaining * energy);
        }, 100);
        this.queue = new EngineerQueue(missionData.office);
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e, _f, _g;
        var _h, _j, _k;
        this.queue.survey();
        const { engineers } = creeps;
        (_a = (_h = this.missionData).assignments) !== null && _a !== void 0 ? _a : (_h.assignments = {});
        const plannedFranchiseRoads = plannedActiveFranchiseRoads(this.missionData.office);
        // If we have less than 80% of planned roads complete, request energy from haulers
        const shouldRequestEnergy = ((_c = (_b = roomPlans(this.missionData.office)) === null || _b === void 0 ? void 0 : _b.fastfiller) === null || _c === void 0 ? void 0 : _c.containers.every(c => !c.survey())) ||
            (rcl(this.missionData.office) < 4 &&
                plannedFranchiseRoads.filter(r => !r.survey()).length / plannedFranchiseRoads.length < 0.8);
        this.updateEstimatedEnergy();
        for (const creep of engineers.filter(isSpawned)) {
            (_d = (_j = this.missionData.assignments)[_k = creep.name]) !== null && _d !== void 0 ? _d : (_j[_k] = {});
            const assignment = this.missionData.assignments[creep.name];
            if (shouldRequestEnergy) {
                CreepsThatNeedEnergy.set(this.missionData.office, (_e = CreepsThatNeedEnergy.get(this.missionData.office)) !== null && _e !== void 0 ? _e : new Set());
                (_f = CreepsThatNeedEnergy.get(this.missionData.office)) === null || _f === void 0 ? void 0 : _f.add(creep.name);
            }
            else {
                (_g = CreepsThatNeedEnergy.get(this.missionData.office)) === null || _g === void 0 ? void 0 : _g.delete(creep.name);
            }
            runStates({
                [States.FIND_WORK]: (mission, creep) => {
                    if (rcl(data.office) < 2)
                        return States.UPGRADING; // get to RCL2 first, enables safe mode
                    delete mission.facilitiesTarget;
                    const nextStructure = this.queue.getNextStructure(creep);
                    if (nextStructure) {
                        mission.facilitiesTarget = nextStructure.serialize();
                        return States.BUILDING;
                    }
                    delete mission.facilitiesTarget;
                    if (rcl(data.office) < 3)
                        return States.UPGRADING; // At RCL3+, just recycle if no work to do
                    return States.RECYCLE;
                },
                [States.GET_ENERGY]: (mission, creep) => {
                    const target = mission.facilitiesTarget
                        ? PlannedStructure.deserialize(mission.facilitiesTarget)
                        : undefined;
                    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 ||
                        engineerGetEnergy(creep, data.office, Math.max(Game.rooms[data.office].energyCapacityAvailable, getWithdrawLimit(data.office, this.budget)), (target === null || target === void 0 ? void 0 : target.pos.roomName) !== this.missionData.office // currently building for a franchise
                        ) === BehaviorResult.SUCCESS) {
                        return States.FIND_WORK;
                    }
                    return States.GET_ENERGY;
                },
                [States.BUILDING]: (mission, creep) => {
                    var _a, _b, _c, _d;
                    if (!creep.store.getUsedCapacity(RESOURCE_ENERGY))
                        return States.GET_ENERGY;
                    if (!mission.facilitiesTarget)
                        return States.FIND_WORK;
                    const plan = PlannedStructure.deserialize(mission.facilitiesTarget);
                    plan.survey();
                    if (!plan.energyToBuild && !plan.energyToRepair) {
                        this.queue.complete(plan);
                        return States.FIND_WORK;
                    }
                    if (!((_b = (_a = Game.rooms[plan.pos.roomName]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.my) && Game.rooms[plan.pos.roomName]) {
                        const obstacle = plan.pos
                            .lookFor(LOOK_STRUCTURES)
                            .find(s => s.structureType !== STRUCTURE_CONTAINER && s.structureType !== STRUCTURE_ROAD);
                        if (obstacle) {
                            main_26(creep, { pos: plan.pos, range: 1 });
                            if (creep.pos.inRangeTo(plan.pos, 1)) {
                                creep.dismantle(obstacle);
                            }
                            return States.BUILDING;
                        }
                    }
                    main_26(creep, { pos: plan.pos, range: 3 });
                    if (creep.pos.inRangeTo(plan.pos, 3)) {
                        if (plan.structure && plan.structure.hits < plan.structure.hitsMax) {
                            if (creep.repair(plan.structure) === OK) {
                                const cost = REPAIR_COST * REPAIR_POWER * creep.body.filter(p => p.type === WORK).length;
                                this.recordEnergy(cost);
                                this.estimatedEnergyRemaining -= cost;
                                if (cost >= plan.energyToRepair) {
                                    this.queue.complete(plan);
                                    return States.FIND_WORK;
                                }
                            }
                        }
                        else {
                            // Create construction site if needed
                            if (!plan.constructionSite) {
                                const result = plan.pos.createConstructionSite(plan.structureType);
                                if (result === ERR_NOT_OWNER) {
                                    // room reserved or claimed by a hostile actor
                                    delete mission.facilitiesTarget;
                                    return States.FIND_WORK;
                                }
                                else if (result !== OK) {
                                    console.log('Error creating construction site', plan.pos, plan.structureType, result);
                                    // Check if we need to destroy something
                                    for (const existing of (_d = (_c = Game.rooms[plan.pos.roomName]) === null || _c === void 0 ? void 0 : _c.find(FIND_STRUCTURES).filter(s => s.structureType === plan.structureType)) !== null && _d !== void 0 ? _d : []) {
                                        if (plannedStructuresByRcl(plan.pos.roomName, rcl(this.missionData.office)).every(s => !s.pos.isEqualTo(existing.pos))) {
                                            existing.destroy(); // not a planned structure
                                            break;
                                        }
                                    }
                                }
                            }
                            // Shove creeps out of the way if needed
                            if (OBSTACLE_OBJECT_TYPES.includes(plan.structureType)) {
                                const fleeCreep = plan.pos.lookFor(LOOK_CREEPS)[0];
                                if (fleeCreep)
                                    main_26(fleeCreep, { pos: plan.pos, range: 2 }, { flee: true });
                            }
                            if (plan.constructionSite) {
                                const result = creep.build(plan.constructionSite);
                                if (result === OK) {
                                    const cost = BUILD_POWER * creep.body.filter(p => p.type === WORK).length;
                                    this.recordEnergy(cost);
                                    this.estimatedEnergyRemaining -= cost;
                                    if (cost >= plan.energyToBuild && !BARRIER_TYPES.includes(plan.structureType)) {
                                        this.queue.complete(plan);
                                        return States.FIND_WORK;
                                    }
                                }
                                else if (result === ERR_NOT_ENOUGH_ENERGY) {
                                    return States.GET_ENERGY;
                                }
                            }
                        }
                        plan.survey();
                    }
                    return States.BUILDING;
                },
                [States.UPGRADING]: (mission, creep) => {
                    var _a;
                    if (rcl(data.office) >= 4 &&
                        storageEnergyAvailable(data.office) <= getWithdrawLimit(data.office, this.budget))
                        return States.FIND_WORK;
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                        return States.GET_ENERGY;
                    }
                    // No construction - upgrade instead
                    const controller = (_a = Game.rooms[data.office]) === null || _a === void 0 ? void 0 : _a.controller;
                    if (!controller)
                        return States.FIND_WORK;
                    main_26(creep, { pos: controller.pos, range: 3 });
                    const result = creep.upgradeController(controller);
                    if (result == ERR_NOT_ENOUGH_ENERGY) {
                        return States.GET_ENERGY;
                    }
                    else if (result === OK) {
                        this.recordEnergy(UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length);
                    }
                    if (Game.time % 10 === 0)
                        return States.FIND_WORK;
                    return States.UPGRADING;
                },
                [States.RECYCLE]: (mission, creep) => {
                    recycle(this.missionData, creep);
                    return States.FIND_WORK;
                }
            }, assignment, creep);
        }
        this.estimatedEnergyRemaining = Math.max(0, this.estimatedEnergyRemaining);
    }
}

class AcquireEngineerMission extends EngineerMission {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.budget = Budget.ESSENTIAL;
        this.creeps = {
            haulers: new MultiCreepSpawner('h', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                builds: energy => buildAccountant(energy, 25, false, false),
                count: current => {
                    var _a;
                    if (rcl(this.missionData.targetOffice) >= ACQUIRE_MAX_RCL)
                        return 0;
                    const controller = (_a = Game.rooms[this.missionData.targetOffice]) === null || _a === void 0 ? void 0 : _a.controller;
                    if (!controller)
                        return 0;
                    if (current.length < this.creeps.engineers.resolved.length)
                        return 1;
                    return 0;
                },
                estimatedCpuPerTick: 1
            }),
            engineers: new MultiCreepSpawner('e', this.missionData.office, {
                role: MinionTypes.ENGINEER,
                builds: energy => buildEngineer(energy, false),
                count: current => {
                    var _a;
                    if (rcl(this.missionData.targetOffice) >= ACQUIRE_MAX_RCL)
                        return 0;
                    const controller = (_a = Game.rooms[this.missionData.targetOffice]) === null || _a === void 0 ? void 0 : _a.controller;
                    if (!controller)
                        return 0;
                    let pendingCost = this.queue.analysis().energyRemaining;
                    // If rcl < 2, engineers will also upgrade
                    if (rcl(this.missionData.targetOffice) < 2) {
                        pendingCost += controller.progressTotal - controller.progress;
                    }
                    else {
                        // above RCL2, let repair work accumulate before spawning
                        if (this.queue.build.size === 0 && pendingCost < 1500) {
                            pendingCost = 0;
                        }
                    }
                    if (this.estimatedEnergyRemaining < pendingCost)
                        return 1;
                    return 0;
                },
                estimatedCpuPerTick: 1
            })
        };
        this.priority = 7.5;
        this.queue = new EngineerQueue(missionData.targetOffice);
    }
    static fromId(id) {
        return super.fromId(id);
    }
    onParentEnd() {
        this.status = MissionStatus.DONE;
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e, _f;
        const { engineers, haulers } = creeps;
        logCpuStart();
        if (!officeShouldSupportAcquireTarget(data.office)) {
            this.status = MissionStatus.DONE;
        }
        logCpu('should support acquire target');
        // cache inter-room route
        const from = (_b = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos;
        const to = (_d = (_c = roomPlans(data.targetOffice)) === null || _c === void 0 ? void 0 : _c.headquarters) === null || _d === void 0 ? void 0 : _d.storage.pos;
        if (!from || !to)
            return;
        console.log('Caching path', this.id);
        const path = main_11(this.id, from, { pos: to, range: 1 }, { reusePath: 1500 });
        if (!path)
            console.log('Engineer cached path failed');
        logCpu('Engineer cached path');
        if (rcl(this.missionData.targetOffice) >= ACQUIRE_MAX_RCL && engineers.length === 0) {
            this.status = MissionStatus.DONE;
        }
        // run engineers
        (_e = data.initialized) !== null && _e !== void 0 ? _e : (data.initialized = []);
        for (const engineer of engineers) {
            // move engineer to target room by following preset path
            if (data.initialized.includes(engineer.name))
                continue;
            if (engineer.pos.roomName === data.targetOffice) {
                data.initialized.push(engineer.name);
                continue;
            }
            main_25(engineer, this.id);
        }
        super.run({ engineers: engineers.filter(e => { var _a; return (_a = data.initialized) === null || _a === void 0 ? void 0 : _a.includes(e.name); }) }, missions, {
            office: data.targetOffice
        });
        logCpu('running engineers');
        // run haulers
        const spawn = getSpawns(data.targetOffice).find(s => s.store.getFreeCapacity(RESOURCE_ENERGY));
        const storage = (_f = Game.rooms[data.targetOffice]) === null || _f === void 0 ? void 0 : _f.storage;
        // target engineer with the most free capacity
        const inRoomEngineers = engineers.filter(e => e.pos.roomName === data.targetOffice);
        const engineer = inRoomEngineers.length
            ? inRoomEngineers.reduce((e1, e2) => (e2.store.getFreeCapacity() > e1.store.getFreeCapacity() ? e2 : e1))
            : undefined;
        for (const hauler of haulers.filter(isSpawned)) {
            // Load up with energy from sponsor office
            runStates({
                [States.DEPOSIT]: (data, creep) => {
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0)
                        return States.WITHDRAW;
                    if (creep.pos.roomName !== data.targetOffice) {
                        main_25(creep, this.id);
                        return States.DEPOSIT;
                    }
                    if (spawn) {
                        main_26(creep, spawn);
                        creep.transfer(spawn, RESOURCE_ENERGY);
                    }
                    else if (storage === null || storage === void 0 ? void 0 : storage.store.getFreeCapacity()) {
                        main_26(creep, storage);
                        creep.transfer(storage, RESOURCE_ENERGY);
                    }
                    else if (engineer) {
                        main_26(creep, engineer);
                        creep.transfer(engineer, RESOURCE_ENERGY);
                    }
                    else {
                        main_26(creep, { pos: new RoomPosition(25, 25, data.targetOffice), range: 20 });
                    }
                    return States.DEPOSIT;
                },
                [States.WITHDRAW]: (data, creep) => {
                    if (creep.pos.roomName !== data.office) {
                        main_25(creep, this.id, { reverse: true });
                        return States.WITHDRAW;
                    }
                    return withdraw(true)({ office: data.office }, creep);
                },
                [States.RECYCLE]: recycle
            }, data, hauler);
        }
        logCpu('running haulers');
    }
}

function signRoom(creep, room) {
    const controllerPos = controllerPosition(room);
    if (!controllerPos)
        return BehaviorResult.FAILURE;
    main_26(creep, { pos: controllerPos, range: 1 });
    if (!Game.rooms[room])
        return BehaviorResult.INPROGRESS;
    const controller = Game.rooms[room].controller;
    if (!controller)
        return BehaviorResult.FAILURE;
    creep.signController(controller, 'This sector property of the Grey Company');
    return BehaviorResult.SUCCESS;
}

const buildLawyer = (energy) => {
    if (energy < 850) {
        return [];
    }
    else {
        return unboosted([CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE]);
    }
};

class AcquireLawyerMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.budget = Budget.EFFICIENCY;
        this.creeps = {
            lawyer: new CreepSpawner('e', this.missionData.office, {
                role: MinionTypes.LAWYER,
                budget: this.budget,
                builds: energy => buildLawyer(energy)
            })
        };
        this.priority = 7.6;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    onParentEnd() {
        this.status = MissionStatus.DONE;
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e, _f, _g;
        const { lawyer } = creeps;
        if (!officeShouldClaimAcquireTarget(data.office)) {
            this.status = MissionStatus.DONE;
        }
        if (this.creeps.lawyer.died && !((_b = (_a = Game.rooms[data.targetOffice]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.my)) {
            this.status = MissionStatus.DONE;
        }
        if (!lawyer)
            return;
        if (data.targetOffice && Memory.rooms[data.targetOffice]) {
            Memory.rooms[data.targetOffice].lastAcquireAttempt = Game.time;
        }
        (_c = data.targetController) !== null && _c !== void 0 ? _c : (data.targetController = (_d = Memory.rooms[data.targetOffice].controllerId) !== null && _d !== void 0 ? _d : (_f = (_e = Game.rooms[data.targetOffice]) === null || _e === void 0 ? void 0 : _e.controller) === null || _f === void 0 ? void 0 : _f.id);
        if ((_g = byId(data.targetController)) === null || _g === void 0 ? void 0 : _g.my) {
            this.status = MissionStatus.DONE; // Already claimed this controller
            return;
        }
        const pos = posById(data.targetController);
        if (!pos) {
            // Not sure where controller is, move to room instead
            main_26(lawyer, { pos: new RoomPosition(25, 25, data.targetOffice), range: 20 });
            return;
        }
        main_26(lawyer, { pos, range: 1 });
        if (lawyer.pos.inRangeTo(pos, 1)) {
            const controller = byId(data.targetController);
            if (!controller)
                return;
            signRoom(lawyer, pos.roomName);
            lawyer.claimController(controller);
        }
    }
}

const buildGuard = (energy, heal = false) => {
    if (energy < 200) {
        return [];
    }
    else if (heal && energy >= 420) {
        // Add a heal part
        return unboosted(buildFromSegment(energy, [ATTACK, MOVE], { sorted: true, suffix: [HEAL, MOVE] }));
    }
    else {
        return unboosted(buildFromSegment(energy, [ATTACK, MOVE], { sorted: true }));
    }
};

const buildMedic = (energy) => {
    if (energy < 200) {
        return [];
    }
    else {
        return unboosted(buildFromSegment(energy, [HEAL, MOVE], { sorted: true }));
    }
};

class BaseDuoMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            attacker: new CreepSpawner('a', this.missionData.office, {
                role: MinionTypes.GUARD,
                budget: Budget.ESSENTIAL,
                builds: energy => buildGuard(energy, false)
            }),
            healer: new CreepSpawner('b', this.missionData.office, {
                role: MinionTypes.MEDIC,
                budget: Budget.ESSENTIAL,
                builds: energy => buildMedic(energy)
            })
        };
        this.priority = 5;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    score() {
        return totalCreepStats([this.creeps.attacker.resolved, this.creeps.healer.resolved].filter(isCreep)).score;
    }
    assembled() {
        return this.creeps.attacker.spawned && this.creeps.healer.spawned;
    }
    run(creeps, missions, data) {
        const { attacker, healer } = creeps;
        if (!attacker && !healer && this.assembled()) {
            this.status = MissionStatus.DONE;
            return;
        }
        if (!attacker || !healer)
            return; // wait for both creeps
        const rampartsIntact = !rampartsAreBroken(data.office);
        const killTarget = byId(data.killTarget);
        const healTargets = [attacker, healer];
        const healTarget = healTargets.find(c => c && c.hits < c.hitsMax && (healer === null || healer === void 0 ? void 0 : healer.pos.inRangeTo(c, 3)));
        // movement
        if (getRangeTo(attacker.pos, healer.pos) !== 1) {
            // come together
            main_26(attacker, healer);
            main_26(healer, attacker);
        }
        else {
            // duo is assembled, or has been broken
            // attacker movement
            if (killTarget) {
                if (data.stayInRamparts && rampartsIntact) {
                    let moveTarget = closestRampartSection(killTarget.pos);
                    if (moveTarget) {
                        const adjacentMoveTargets = moveTarget.filter(pos => pos.isNearTo(killTarget.pos));
                        if (adjacentMoveTargets.length) {
                            moveTarget = adjacentMoveTargets;
                        }
                        main_26(attacker, moveTarget.map(pos => ({ pos, range: 0 })), {
                            avoidObstacleStructures: false,
                            maxRooms: 1,
                            roomCallback(room) {
                                return getCostMatrix(room, false, {
                                    stayInsidePerimeter: true
                                });
                            },
                            visualizePathStyle: {}
                        });
                    }
                }
                else {
                    main_26(attacker, { pos: killTarget.pos, range: 1 });
                }
            }
            else if (data.rallyPoint) {
                const rallyPoint = {
                    pos: unpackPos(data.rallyPoint.pos),
                    range: data.rallyPoint.range
                };
                main_26(attacker, rallyPoint);
            }
            else if (data.stayInRamparts && rampartsIntact) {
                const moveTarget = closestRampartSection(attacker.pos);
                if (moveTarget)
                    main_26(attacker, moveTarget.map(pos => ({ pos, range: 0 })), {
                        avoidObstacleStructures: false,
                        maxRooms: 1,
                        roomCallback(room) {
                            return getCostMatrix(room, false, {
                                stayInsidePerimeter: true
                            });
                        },
                        visualizePathStyle: {}
                    });
            }
            // healer movement
            main_18(healer, attacker);
            // creep actions
            if (healer && healTarget) {
                if (getRangeTo(healer.pos, healTarget.pos) > 1) {
                    healer.rangedHeal(healTarget);
                }
                else {
                    healer.heal(healTarget);
                }
            }
            if (attacker) {
                // evaluate for secondary kill target
                let target = killTarget;
                if (!(target === null || target === void 0 ? void 0 : target.pos.inRangeTo(attacker, 1))) {
                    const secondaryTargets = findHostileCreepsInRange(attacker.pos, 1);
                    if (secondaryTargets.length) {
                        target = secondaryTargets.reduce((min, c) => (c.hits < min.hits ? c : min));
                    }
                }
                // attack target
                if (target)
                    attacker.attack(target);
            }
        }
    }
}

let _enemyHealingCostMatrix = new Map();
let _myDamageCostMatrix = new Map();
const myDamageNet = (pos) => {
    var _a, _b, _c, _d;
    return ((_b = (_a = _myDamageCostMatrix.get(pos.roomName)) === null || _a === void 0 ? void 0 : _a.get(pos.x, pos.y)) !== null && _b !== void 0 ? _b : 0) -
        ((_d = (_c = _enemyHealingCostMatrix.get(pos.roomName)) === null || _c === void 0 ? void 0 : _c.get(pos.x, pos.y)) !== null && _d !== void 0 ? _d : 0);
};

const priorityKillTarget = (room) => {
    if (!Game.rooms[room])
        return;
    const hostiles = findHostileCreeps(room);
    if (!hostiles.length)
        return;
    return hostiles.reduce((a, b) => (myDamageNet(a.pos) > myDamageNet(b.pos) ? a : b));
};

class DefendAcquireMission extends BaseDuoMission {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.priority = 7.7;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e;
        data.killTarget = (_a = priorityKillTarget(data.targetOffice)) === null || _a === void 0 ? void 0 : _a.id;
        (_b = data.rallyPoint) !== null && _b !== void 0 ? _b : (data.rallyPoint = {
            pos: packPos(new RoomPosition(25, 25, data.targetOffice)),
            range: 20
        });
        if (((_c = creeps.attacker) === null || _c === void 0 ? void 0 : _c.pos.roomName) === data.targetOffice) {
            (_d = data.arrived) !== null && _d !== void 0 ? _d : (data.arrived = CREEP_LIFE_TIME - ((_e = creeps.attacker.ticksToLive) !== null && _e !== void 0 ? _e : 100));
        }
        super.run(creeps, missions, data);
    }
}

class AcquireMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.budget = Budget.SURPLUS;
        this.creeps = {};
        this.missions = {
            claim: new ConditionalMissionSpawner(AcquireLawyerMission, () => this.missionData, () => officeShouldClaimAcquireTarget(this.missionData.office)),
            engineers: new ConditionalMissionSpawner(AcquireEngineerMission, () => this.missionData, () => officeShouldSupportAcquireTarget(this.missionData.office)),
            defenders: new MultiMissionSpawner(DefendAcquireMission, current => {
                if (current.some(m => !m.assembled()))
                    return []; // re-evaluate after finishing this duo
                const hostileScore = roomThreatLevel(this.missionData.targetOffice);
                const allyScore = current
                    .filter(m => {
                    var _a;
                    // ignore attackers that are about to die
                    const ttl = (_a = m.creeps.attacker.resolved) === null || _a === void 0 ? void 0 : _a.ticksToLive;
                    return !m.missionData.arrived || !ttl || ttl > m.missionData.arrived;
                })
                    .map(m => m.score())
                    .reduce(sum, 0);
                if (hostileScore > allyScore) {
                    return [this.missionData];
                }
                return [];
            })
        };
        this.priority = 7;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    onStart() {
        super.onStart();
        console.log('[AcquireMission] started targeting', unpackPos(this.missionData.targetOffice));
    }
    onEnd() {
        super.onEnd();
        console.log('[AcquireMission] finished in', unpackPos(this.missionData.targetOffice));
    }
    run() {
        if (rcl(this.missionData.targetOffice) >= ACQUIRE_MAX_RCL ||
            (!officeShouldSupportAcquireTarget(this.missionData.office) &&
                !officeShouldClaimAcquireTarget(this.missionData.office))) {
            this.status = MissionStatus.DONE;
        }
    }
}

class ConditionalCreepSpawner extends BaseCreepSpawner {
    constructor(id, office, props) {
        super(id, office, props);
        this.props = props;
    }
    spawn(missionId, priority) {
        var _a, _b;
        if (this.resolved || !((_b = (_a = this.props).shouldSpawn) === null || _b === void 0 ? void 0 : _b.call(_a)))
            return [];
        return super.spawn(missionId, priority);
    }
    get resolved() {
        return this._creep ? Game.creeps[this._creep] : undefined;
    }
    get spawned() {
        var _a;
        return Boolean((_a = this.memory) === null || _a === void 0 ? void 0 : _a.spawned);
    }
    register(creep, onNew) {
        if (this.memory) {
            this.memory.spawned = true;
            this.checkOnSpawn(creep, onNew);
        }
        this._creep = creep.name;
    }
    get died() {
        var _a;
        return ((_a = this.memory) === null || _a === void 0 ? void 0 : _a.spawned) && (!this._creep || !Game.creeps[this._creep]);
    }
    cpuRemaining() {
        var _a, _b, _c;
        return (Math.min(cpuEstimatePeriod(), (_b = (_a = this.resolved) === null || _a === void 0 ? void 0 : _a.ticksToLive) !== null && _b !== void 0 ? _b : Infinity) *
            ((_c = this.props.estimatedCpuPerTick) !== null && _c !== void 0 ? _c : this.defaultCpuPerTick));
    }
}

class CleanupMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            janitor: new ConditionalCreepSpawner('j', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                budget: Budget.ESSENTIAL,
                builds: energy => buildAccountant(energy, 5),
                shouldSpawn: () => hasEnergyIncome(this.missionData.office) && this.misplacedResources().length > 0
            })
        };
        this.priority = 15;
        this.misplacedResources = memoizeOncePerTick(() => {
            var _a, _b, _c, _d, _e, _f, _g;
            const misplaced = [];
            const plan = roomPlans(this.missionData.office);
            const checkForNonEnergyResource = ({ structure }) => {
                if (structure && Object.keys(structure.store).some(k => k !== RESOURCE_ENERGY)) {
                    misplaced.push(structure);
                }
            };
            (_a = plan === null || plan === void 0 ? void 0 : plan.fastfiller) === null || _a === void 0 ? void 0 : _a.containers.forEach(checkForNonEnergyResource);
            checkForNonEnergyResource((_c = (_b = plan === null || plan === void 0 ? void 0 : plan.franchise1) === null || _b === void 0 ? void 0 : _b.container) !== null && _c !== void 0 ? _c : {});
            checkForNonEnergyResource((_e = (_d = plan === null || plan === void 0 ? void 0 : plan.franchise2) === null || _d === void 0 ? void 0 : _d.container) !== null && _e !== void 0 ? _e : {});
            checkForNonEnergyResource((_g = (_f = plan === null || plan === void 0 ? void 0 : plan.headquarters) === null || _f === void 0 ? void 0 : _f.storage) !== null && _g !== void 0 ? _g : {});
            // non-energy resources
            return misplaced;
        });
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a, _b;
        const { janitor } = creeps;
        if (!janitor)
            return;
        if (!data.target || !byId(data.target)) {
            (_a = data.target) !== null && _a !== void 0 ? _a : (data.target = (_b = getClosestByRange(janitor.pos, this.misplacedResources())) === null || _b === void 0 ? void 0 : _b.id);
        }
        runStates({
            [States.WITHDRAW]: (data, creep) => {
                const target = byId(data.target);
                if (!creep.store.getFreeCapacity())
                    return States.DEPOSIT;
                if (!target) {
                    if (creep.store.getUsedCapacity())
                        return States.DEPOSIT;
                    return States.RECYCLE;
                }
                main_26(creep, target);
                if (creep.pos.inRangeTo(target, 1)) {
                    let withdrew = false;
                    for (const resource in target.store) {
                        if (resource === RESOURCE_ENERGY)
                            continue;
                        if (withdrew)
                            return States.WITHDRAW; // more to withdraw next tick
                        if (creep.withdraw(target, resource) === OK) {
                            creep.store[resource] = 1; // so DEPOSIT check passes
                            withdrew = true;
                        }
                    }
                    delete data.target;
                    return States.DEPOSIT;
                }
                return States.WITHDRAW;
            },
            [States.DEPOSIT]: (data, creep) => {
                var _a, _b;
                if (Object.keys(creep.store).length === 0)
                    return States.WITHDRAW;
                const terminal = (_b = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal;
                if (!terminal) {
                    creep.drop(Object.keys(creep.store)[0]);
                    return States.DEPOSIT;
                }
                main_26(creep, terminal.pos);
                if (!creep.pos.inRangeTo(terminal.pos, 1))
                    return States.DEPOSIT;
                if (terminal.structure) {
                    creep.transfer(terminal.structure, Object.keys(creep.store)[0]);
                }
                else {
                    creep.drop(Object.keys(creep.store)[0]);
                }
                return States.DEPOSIT;
            },
            [States.RECYCLE]: recycle
        }, data, janitor);
    }
}

class DefendOfficeMission extends BaseDuoMission {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.priority = 15;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d;
        const storagePos = (_c = (_b = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos) !== null && _c !== void 0 ? _c : new RoomPosition(25, 25, data.office);
        data.rallyPoint = rampartsAreBroken(data.office) ? { pos: packPos(storagePos), range: 10 } : undefined;
        data.stayInRamparts = true;
        data.killTarget = (_d = priorityKillTarget(data.office)) === null || _d === void 0 ? void 0 : _d.id;
        super.run(creeps, missions, data);
    }
}

const blinkyKill = (creep, target) => {
    const kite = target instanceof Creep && target.body.some(p => p.type === ATTACK);
    if (target) {
        if (kite && getRangeTo(creep.pos, target.pos) < 3) {
            main_26(creep, { pos: target.pos, range: 3 }, { flee: true });
        }
        else {
            main_26(creep, { pos: target.pos, range: 1 });
        }
        if (getRangeTo(creep.pos, target.pos) === 1 && !(target instanceof StructureWall)) {
            return creep.rangedMassAttack() === OK;
        }
        else {
            return creep.rangedAttack(target) === OK;
        }
    }
    return false;
};

const buildBlinky = (energy) => {
    if (energy < 200) {
        return [];
    }
    else if (energy < 1000) {
        return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE], { sorted: true }));
    }
    else {
        return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE, MOVE, HEAL], { sorted: true }));
    }
};

class DefendRemoteMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            blinkies: new MultiCreepSpawner('b', this.missionData.office, {
                role: MinionTypes.BLINKY,
                budget: Budget.ESSENTIAL,
                builds: energy => buildBlinky(energy),
                count: current => {
                    if (this.missionData.targetRoom &&
                        totalCreepStats(findHostileCreeps(this.missionData.targetRoom)).score > totalCreepStats(current).score) {
                        return 1; // need more defenders
                    }
                    return 0; // our heuristic is higher
                }
            })
        };
        this.priority = 12;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a;
        const { blinkies } = creeps;
        // If work is done, clear target
        if (data.targetRoom &&
            !(Memory.rooms[data.targetRoom].invaderCore ||
                Memory.rooms[data.targetRoom].lastHostileSeen === Memory.rooms[data.targetRoom].scanned)) {
            delete data.targetRoom;
        }
        // If no target, pick one
        if (!data.targetRoom) {
            for (const room of activeFranchises(data.office).flatMap(({ source }) => franchiseDefenseRooms(data.office, source))) {
                if (Memory.rooms[room].invaderCore || Memory.rooms[room].lastHostileSeen === Memory.rooms[room].scanned) {
                    // Hostile minions or invader core detected
                    data.targetRoom = room;
                }
            }
        }
        // console.log('defending remote', data.targetRoom);
        for (const creep of blinkies) {
            // Try to heal
            if (creep.hits < creep.hitsMax) {
                creep.heal(creep);
            }
            if (!data.targetRoom)
                return; // nothing to do
            // Go to room
            if (creep.pos.roomName !== data.targetRoom) {
                main_26(creep, { pos: new RoomPosition(25, 25, data.targetRoom), range: 20 });
            }
            // Clear room
            const target = (_a = findClosestHostileCreepByRange(creep.pos)) !== null && _a !== void 0 ? _a : findInvaderStructures(data.targetRoom)[0];
            blinkyKill(creep, target);
        }
    }
}

const guardKill = (creep, target) => {
    if (target) {
        main_26(creep, { pos: target.pos, range: 1 });
        return creep.attack(target) === OK;
    }
    return false;
};

class KillCoreMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            guard: new CreepSpawner('g', this.missionData.office, {
                role: MinionTypes.GUARD,
                budget: Budget.EFFICIENCY,
                builds: energy => buildGuard(energy)
            })
        };
        this.priority = 9.5;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    assembled() {
        return this.creeps.guard.spawned;
    }
    run(creeps, missions, data) {
        var _a;
        const { guard } = creeps;
        if (this.creeps.guard.died) {
            this.status = MissionStatus.DONE;
            return;
        }
        // If work is done, clear target
        if (data.targetRoom && !Memory.rooms[data.targetRoom].invaderCore) {
            delete data.targetRoom;
        }
        // If no target, pick one
        if (!data.targetRoom) {
            for (const t of (_a = Memory.offices[data.office].territories) !== null && _a !== void 0 ? _a : []) {
                if (Memory.rooms[t].invaderCore) {
                    // Invader core detected
                    data.targetRoom = t;
                    break;
                }
            }
        }
        if (!guard)
            return;
        runStates({
            [States.DEFEND]: (data, guard) => {
                if (!data.targetRoom)
                    return States.RECYCLE; // nothing to do
                // Go to room
                if (guard.pos.roomName !== data.targetRoom) {
                    main_26(guard, { pos: new RoomPosition(25, 25, data.targetRoom), range: 20 });
                    return States.DEFEND;
                }
                // Clear room
                const target = findInvaderStructures(data.targetRoom)[0];
                guardKill(guard, target);
                return States.DEFEND;
            },
            [States.RECYCLE]: (data, guard) => {
                if (data.targetRoom)
                    return States.DEFEND;
                recycle(data, guard);
                return States.RECYCLE;
            }
        }, this.missionData, guard);
    }
}

class DefenseCoordinationMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.missions = {
            defendOffice: new MultiMissionSpawner(DefendOfficeMission, current => {
                if (rcl(this.missionData.office) < 4)
                    return []; // until we have ramparts, we'll rely mostly on rangers
                if (findAcquireTarget() === this.missionData.office)
                    return []; // if we're acquiring, parent office will defend
                if (current.some(m => !m.assembled()))
                    return []; // re-evaluate after finishing this duo
                const hostileScore = totalCreepStats(findHostileCreeps(this.missionData.office)).score;
                const allyScore = current.map(m => m.score()).reduce(sum, 0);
                if (hostileScore > allyScore) {
                    return [this.missionData];
                }
                return [];
            }),
            defendRemotes: new MissionSpawner(DefendRemoteMission, () => this.missionData),
            coreKiller: new MultiMissionSpawner(KillCoreMission, current => {
                if (current.some(m => !m.assembled()))
                    return []; // re-evaluate after finishing current missions
                const cores = franchisesByOffice(this.missionData.office)
                    .map(({ room }) => room)
                    .filter(room => Memory.rooms[room].invaderCore);
                if (current.length >= cores.length)
                    return [];
                const newCores = cores.filter(room => !current.some(m => m.missionData.targetRoom === room));
                return newCores.map(targetRoom => (Object.assign(Object.assign({}, this.missionData), { targetRoom })));
            })
        };
        this.priority = 20;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) { }
}

const buildResearch = (energy, maxWorkParts = 15) => {
    if (energy < 250 || maxWorkParts <= 0) {
        return [];
    }
    else {
        // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
        let workParts = Math.max(1, Math.min(Math.floor(maxWorkParts), Math.floor((energy * 10) / 13 / 100)));
        let carryParts = Math.max(1, Math.min(3, Math.floor((energy * 1) / 13 / 50)));
        let moveParts = Math.max(1, Math.min(6, Math.floor((energy * 2) / 13 / 50)));
        // console.log(energy, maxWorkParts, workParts)
        const body = [].concat(Array(workParts).fill(WORK), Array(carryParts).fill(CARRY), Array(moveParts).fill(MOVE));
        const tiers = [3, 2, 1, 0];
        // any level of boosts, depending on availability
        return tiers.map(tier => {
            const boosts = tier > 0 ? [{ type: BOOSTS_BY_INTENT.UPGRADE[tier - 1], count: workParts }] : [];
            return { body, boosts, tier, cost: buildCost(body, boosts) };
        });
    }
};

const getEnergyFromStorage = profiler.registerFN((creep, office, limit, ignoreSpawn = false) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0)
        return BehaviorResult.SUCCESS;
    const { headquarters, library } = (_a = roomPlans(office)) !== null && _a !== void 0 ? _a : {};
    const storage = headquarters === null || headquarters === void 0 ? void 0 : headquarters.storage.structure;
    const containers = (_d = (_c = (_b = roomPlans(office)) === null || _b === void 0 ? void 0 : _b.fastfiller) === null || _c === void 0 ? void 0 : _c.containers.map(c => c.structure)) !== null && _d !== void 0 ? _d : [];
    if (library === null || library === void 0 ? void 0 : library.container.structure)
        containers.unshift(library.container.structure);
    const container = (_e = getClosestByRange(creep.pos, containers.filter((c) => !!(c === null || c === void 0 ? void 0 : c.store[RESOURCE_ENERGY])))) !== null && _e !== void 0 ? _e : containers[0];
    const spawn = getPrimarySpawn(office);
    const withdrawLimit = limit !== null && limit !== void 0 ? limit : (_f = Game.rooms[office]) === null || _f === void 0 ? void 0 : _f.energyCapacityAvailable;
    let target = undefined;
    if (((_g = storage === null || storage === void 0 ? void 0 : storage.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _g !== void 0 ? _g : 0) > withdrawLimit) {
        target = storage;
    }
    else if (containers.reduce((sum, c) => { var _a; return sum + ((_a = c === null || c === void 0 ? void 0 : c.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _a !== void 0 ? _a : 0); }, 0) > withdrawLimit) {
        target = container;
    }
    else if (!storage && !container && !ignoreSpawn && ((_h = spawn === null || spawn === void 0 ? void 0 : spawn.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _h !== void 0 ? _h : 0) >= 300) {
        target = spawn;
    }
    if (!target) {
        return BehaviorResult.FAILURE;
    }
    if (creep.name.startsWith('ENGINEER'))
        Game.map.visual.line(creep.pos, target.pos, { color: '#00ffff' });
    main_26(creep, { pos: target.pos, range: 1 });
    if (creep.withdraw(target, RESOURCE_ENERGY) === OK) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
}, 'getEnergyFromStorage');

class UpgradeMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            upgraders: new MultiCreepSpawner('h', this.missionData.office, {
                role: MinionTypes.RESEARCH,
                budget: Budget.SURPLUS,
                builds: energy => bestTierAvailable(this.missionData.office, buildResearch(energy)),
                count: current => {
                    var _a, _b;
                    if (rcl(this.missionData.office) < 2 &&
                        ((_b = (_a = Game.rooms[this.missionData.office].controller) === null || _a === void 0 ? void 0 : _a.ticksToDowngrade) !== null && _b !== void 0 ? _b : Infinity) > 3000)
                        return 0; // engineers will upgrade
                    if (new EngineerQueue(this.missionData.office).analysis().energyRemaining > 1500)
                        return 0; // don't upgrade while construction to do
                    if (rcl(this.missionData.office) === 8 && current.length) {
                        return 0; // maintain one upgrader at RCL8
                    }
                    return 1; // spawn as many as we can use
                }
            })
        };
        this.priority = 5;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    capacity() {
        return this.creeps.upgraders.resolved.map(c => c.store.getCapacity()).reduce(sum, 0);
    }
    needsSupplementalEnergy() {
        return this.capacity() > LINK_CAPACITY / 2;
    }
    run(creeps, missions, data) {
        var _a, _b, _c;
        const { upgraders } = creeps;
        this.estimatedEnergyRemaining = upgraders
            .map(creep => {
            var _a;
            return creep.body.filter(p => p.type === WORK).length *
                Math.min(estimateMissionInterval(data.office), (_a = creep.ticksToLive) !== null && _a !== void 0 ? _a : CREEP_LIFE_TIME);
        })
            .reduce(sum, 0);
        for (const creep of upgraders) {
            if (this.needsSupplementalEnergy()) {
                CreepsThatNeedEnergy.set(this.missionData.office, (_a = CreepsThatNeedEnergy.get(this.missionData.office)) !== null && _a !== void 0 ? _a : new Set());
                (_b = CreepsThatNeedEnergy.get(this.missionData.office)) === null || _b === void 0 ? void 0 : _b.add(creep.name);
            }
            else {
                (_c = CreepsThatNeedEnergy.get(this.missionData.office)) === null || _c === void 0 ? void 0 : _c.delete(creep.name);
            }
            runStates({
                [States.GET_BOOSTED]: getBoosted(States.WORKING),
                [States.WORKING]: (mission, creep) => {
                    var _a, _b, _c, _d, _e;
                    let energyUsed = UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER * creep.body.filter(p => p.type === WORK).length;
                    const controller = (_a = Game.rooms[mission.office]) === null || _a === void 0 ? void 0 : _a.controller;
                    if (!controller)
                        throw new Error(`No controller for upgrader ${creep.name} (${creep.pos})`);
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) >
                        creep.store.getCapacity(RESOURCE_ENERGY) / 2 + energyUsed) {
                        // Try to share energy with other creeps
                        const nearby = upgraders.find(u => u !== creep &&
                            u.pos.isNearTo(creep) &&
                            u.store.getUsedCapacity(RESOURCE_ENERGY) < u.store.getCapacity(RESOURCE_ENERGY) / 2 &&
                            u.pos.getRangeTo(controller.pos) < creep.pos.getRangeTo(controller.pos));
                        if (nearby)
                            creep.transfer(nearby, RESOURCE_ENERGY, Math.min(nearby.store.getFreeCapacity(RESOURCE_ENERGY), creep.store.getCapacity(RESOURCE_ENERGY) / 2));
                        // Move out of the way of other upgraders if needed
                        const range = 3;
                        main_26(creep, { pos: controller.pos, range });
                    }
                    else {
                        // try to get more energy
                        const container = (_c = (_b = roomPlans(mission.office)) === null || _b === void 0 ? void 0 : _b.library) === null || _c === void 0 ? void 0 : _c.container.structure;
                        const link = (_e = (_d = roomPlans(mission.office)) === null || _d === void 0 ? void 0 : _d.library) === null || _e === void 0 ? void 0 : _e.link.structure;
                        if (link && link.store[RESOURCE_ENERGY]) {
                            main_26(creep, { pos: link.pos, range: 1 });
                            if (creep.withdraw(link, RESOURCE_ENERGY) === OK) {
                                link.store[RESOURCE_ENERGY] = Math.max(0, link.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity());
                            }
                        }
                        else if (container) {
                            if (container.store[RESOURCE_ENERGY]) {
                                main_26(creep, { pos: container.pos, range: 1 });
                                if (creep.withdraw(container, RESOURCE_ENERGY) === OK) {
                                    container.store[RESOURCE_ENERGY] = Math.max(0, container.store[RESOURCE_ENERGY] - creep.store.getFreeCapacity());
                                }
                            }
                            else {
                                main_26(creep, { pos: container.pos, range: 3 }); // wait for energy
                            }
                        }
                        else if (!link && !container) {
                            if (getEnergyFromStorage(creep, mission.office) === BehaviorResult.SUCCESS) {
                                return States.WORKING;
                            }
                        }
                    }
                    // do upgrades
                    const result = creep.upgradeController(controller);
                    if (result === OK) {
                        if (rcl(mission.office) === 8)
                            energyUsed = Math.min(15, energyUsed);
                        this.recordEnergy(energyUsed);
                    }
                    return States.WORKING;
                }
            }, this.missionData, creep);
        }
    }
}

class EmergencyUpgradeMission extends UpgradeMission {
    constructor() {
        super(...arguments);
        this.creeps = {
            upgraders: new MultiCreepSpawner('h', this.missionData.office, {
                role: MinionTypes.RESEARCH,
                budget: Budget.ESSENTIAL,
                builds: energy => buildResearch(energy),
                count: current => {
                    if (!this.emergency() || current.length)
                        return 0;
                    return 1;
                }
            })
        };
        this.priority = 15;
    }
    emergency() {
        var _a, _b;
        return ((_b = (_a = Game.rooms[this.missionData.office].controller) === null || _a === void 0 ? void 0 : _a.ticksToDowngrade) !== null && _b !== void 0 ? _b : 0) < 3000;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        super.run(creeps, missions, data);
        if (!this.emergency() && !creeps.upgraders.length) {
            this.status = MissionStatus.DONE;
        }
    }
}

const buildAuditor = () => {
    return unboosted([MOVE]);
};

let patrols = new Map();
const getPatrolRoute = profiler.registerFN((office) => {
    if (!patrols.has(office)) {
        patrols.set(office, generatePatrolRoute(office));
    }
    return patrols.get(office);
}, 'getPatrolRoute');
/**
 * Generates a naive patrol route sorted by proximity to the central room
 */
const generatePatrolRoute = (office) => {
    var _a, _b;
    // console.log('generating patrol route for', office)
    let surveyRadius = (((_b = (_a = Game.rooms[office]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.level) !== 8) ? 5 : 20;
    let rooms = calculateNearbyRooms(office, surveyRadius, false).sort((a, b) => Game.map.getRoomLinearDistance(a, office) - Game.map.getRoomLinearDistance(b, office));
    return rooms;
};

class ExploreMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            explorer: new CreepSpawner('x', this.missionData.office, {
                role: MinionTypes.AUDITOR,
                budget: Budget.ESSENTIAL,
                builds: energy => buildAuditor(),
                respawn: () => true
            })
        };
        this.priority = 15;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a, _b;
        var _c, _d;
        const { explorer } = creeps;
        if (!explorer)
            return;
        // Select a target
        if (!this.missionData.exploreTarget && Game.cpu.bucket > 1000) {
            // Ignore aggression on scouts
            explorer.notifyWhenAttacked(false);
            let rooms = getPatrolRoute(this.missionData.office).map(room => {
                var _a;
                return ({
                    name: room,
                    scanned: (_a = Memory.rooms[room]) === null || _a === void 0 ? void 0 : _a.scanned
                });
            });
            if (!rooms.length)
                return;
            const bestMatch = rooms.reduce((last, match) => {
                var _a, _b;
                // Ignore rooms we've already scanned for now
                if (last === undefined)
                    return match;
                if (((_a = match.scanned) !== null && _a !== void 0 ? _a : 0) >= ((_b = last.scanned) !== null && _b !== void 0 ? _b : 0)) {
                    return last;
                }
                return match;
            });
            this.missionData.exploreTarget = bestMatch === null || bestMatch === void 0 ? void 0 : bestMatch.name;
            // logCpu('select a target');
        }
        // Do work
        if (this.missionData.exploreTarget) {
            if (!Game.rooms[this.missionData.exploreTarget]) {
                if (main_26(explorer, {
                    pos: new RoomPosition(25, 25, this.missionData.exploreTarget),
                    range: 20
                }, {
                    sourceKeeperRoomCost: 2
                }) !== OK) {
                    // console.log('Failed to path', explorer.pos, this.missionData.exploreTarget);
                    (_a = (_c = Memory.rooms)[_d = this.missionData.exploreTarget]) !== null && _a !== void 0 ? _a : (_c[_d] = { officesInRange: '' }); // Unable to path
                    Memory.rooms[this.missionData.exploreTarget].scanned = Game.time;
                    delete this.missionData.exploreTarget;
                    // logCpu('failed move to target room');
                    return;
                }
                // logCpu('move to target room');
            }
            else {
                const controller = Game.rooms[this.missionData.exploreTarget].controller;
                if (explorer.pos.roomName === this.missionData.exploreTarget &&
                    controller &&
                    ((_b = controller.sign) === null || _b === void 0 ? void 0 : _b.username) !== 'LordGreywether') {
                    // Room is visible, creep is in room
                    // In room, sign controller
                    const result = signRoom(explorer, this.missionData.exploreTarget);
                    // logCpu('signing room');
                    if (result === BehaviorResult.INPROGRESS)
                        return;
                    // otherwise, successful or no path found
                }
                delete this.missionData.exploreTarget;
                return;
            }
        }
    }
}

const buildClerk = (energy, maxSegments = 50, mobile = false) => {
    return unboosted(buildFromSegment(energy, [CARRY], { maxSegments, suffix: mobile ? [MOVE] : [] }));
};

const fastfillerSpawner = (office, id, shouldSpawn = () => true) => new ConditionalCreepSpawner(id, office, {
    role: MinionTypes.CLERK,
    budget: Budget.ESSENTIAL,
    builds: energy => buildClerk(energy, (SPAWN_ENERGY_CAPACITY + EXTENSION_ENERGY_CAPACITY[rcl(office)]) / CARRY_CAPACITY, true // getSpawns(office).length !== 3 // fixed-pos fastfillers don't spawn correctly consistently
    ),
    shouldSpawn: () => hasEnergyIncome(office) && shouldSpawn()
});
class FastfillerMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            topLeft: fastfillerSpawner(this.missionData.office, 'a'),
            topRight: fastfillerSpawner(this.missionData.office, 'b'),
            bottomLeft: fastfillerSpawner(this.missionData.office, 'c', () => rcl(this.missionData.office) > 2),
            bottomRight: fastfillerSpawner(this.missionData.office, 'd', () => rcl(this.missionData.office) > 2)
        };
        this.priority = 15;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        if (!this.missionData.refillSquares.topLeft) {
            this.missionData.refillSquares = refillSquares(this.missionData.office);
        }
        if (!this.missionData.refillSquares.topLeft)
            return;
        const { topLeft, topRight, bottomLeft, bottomRight } = creeps;
        const plan = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.fastfiller;
        const structures = {
            topLeft: {
                spawn: (_b = plan === null || plan === void 0 ? void 0 : plan.spawns[0]) === null || _b === void 0 ? void 0 : _b.structure,
                container: (_c = plan === null || plan === void 0 ? void 0 : plan.containers[0]) === null || _c === void 0 ? void 0 : _c.structure,
                oppositeContainer: (_d = plan === null || plan === void 0 ? void 0 : plan.containers[1]) === null || _d === void 0 ? void 0 : _d.structure,
                extensions: [1, 2, 3, 6].map(i => { var _a; return (_a = plan === null || plan === void 0 ? void 0 : plan.extensions[i]) === null || _a === void 0 ? void 0 : _a.structure; }),
                centerExtension: (_e = plan === null || plan === void 0 ? void 0 : plan.extensions[0]) === null || _e === void 0 ? void 0 : _e.structure
            },
            bottomLeft: {
                spawn: (_f = plan === null || plan === void 0 ? void 0 : plan.spawns[2]) === null || _f === void 0 ? void 0 : _f.structure,
                container: (_g = plan === null || plan === void 0 ? void 0 : plan.containers[0]) === null || _g === void 0 ? void 0 : _g.structure,
                oppositeContainer: (_h = plan === null || plan === void 0 ? void 0 : plan.containers[1]) === null || _h === void 0 ? void 0 : _h.structure,
                extensions: [9, 11, 12, 6].map(i => { var _a; return (_a = plan === null || plan === void 0 ? void 0 : plan.extensions[i]) === null || _a === void 0 ? void 0 : _a.structure; }),
                centerExtension: (_j = plan === null || plan === void 0 ? void 0 : plan.extensions[8]) === null || _j === void 0 ? void 0 : _j.structure
            },
            topRight: {
                spawn: (_k = plan === null || plan === void 0 ? void 0 : plan.spawns[1]) === null || _k === void 0 ? void 0 : _k.structure,
                container: (_l = plan === null || plan === void 0 ? void 0 : plan.containers[1]) === null || _l === void 0 ? void 0 : _l.structure,
                oppositeContainer: (_m = plan === null || plan === void 0 ? void 0 : plan.containers[0]) === null || _m === void 0 ? void 0 : _m.structure,
                extensions: [4, 5, 3, 7].map(i => { var _a; return (_a = plan === null || plan === void 0 ? void 0 : plan.extensions[i]) === null || _a === void 0 ? void 0 : _a.structure; }),
                centerExtension: (_o = plan === null || plan === void 0 ? void 0 : plan.extensions[0]) === null || _o === void 0 ? void 0 : _o.structure
            },
            bottomRight: {
                spawn: (_p = plan === null || plan === void 0 ? void 0 : plan.spawns[2]) === null || _p === void 0 ? void 0 : _p.structure,
                container: (_q = plan === null || plan === void 0 ? void 0 : plan.containers[1]) === null || _q === void 0 ? void 0 : _q.structure,
                oppositeContainer: (_r = plan === null || plan === void 0 ? void 0 : plan.containers[0]) === null || _r === void 0 ? void 0 : _r.structure,
                extensions: [13, 14, 10, 7].map(i => { var _a; return (_a = plan === null || plan === void 0 ? void 0 : plan.extensions[i]) === null || _a === void 0 ? void 0 : _a.structure; }),
                centerExtension: (_s = plan === null || plan === void 0 ? void 0 : plan.extensions[8]) === null || _s === void 0 ? void 0 : _s.structure
            }
        };
        const link = plan === null || plan === void 0 ? void 0 : plan.link.structure;
        const positions = [
            { creep: topLeft, pos: unpackPos(data.refillSquares.topLeft), structures: structures.topLeft },
            { creep: topRight, pos: unpackPos(data.refillSquares.topRight), structures: structures.topRight },
            { creep: bottomLeft, pos: unpackPos(data.refillSquares.bottomLeft), structures: structures.bottomLeft },
            { creep: bottomRight, pos: unpackPos(data.refillSquares.bottomRight), structures: structures.bottomRight }
        ];
        const shouldTransfer = (s) => s && s.store[RESOURCE_ENERGY] < s.store.getCapacity(RESOURCE_ENERGY);
        for (const { creep, pos, structures } of positions) {
            if (!creep)
                continue;
            if (creep)
                main_26(creep, { pos, range: 0 }, { roomCallback: defaultRoomCallback({ ignoreFastfiller: true }) }); // even if already there, this will prevent shoving
            if (!creep.pos.isEqualTo(pos))
                continue; // wait to get to position
            // do any adjacent structures need energy?
            const adjacentStructuresNeedEnergy = shouldTransfer(structures.spawn) ||
                structures.extensions.some(shouldTransfer) ||
                shouldTransfer(structures.centerExtension);
            const adjacentContainerNeedsEnergy = shouldTransfer(structures.container);
            const thisSideEnergy = (_u = (_t = structures.container) === null || _t === void 0 ? void 0 : _t.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _u !== void 0 ? _u : 0;
            const oppositeEnergy = (_w = (_v = structures.oppositeContainer) === null || _v === void 0 ? void 0 : _v.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _w !== void 0 ? _w : 0;
            const transferFromOpposite = adjacentStructuresNeedEnergy && thisSideEnergy < oppositeEnergy - SPAWN_ENERGY_CAPACITY;
            if (!adjacentStructuresNeedEnergy && !adjacentContainerNeedsEnergy)
                continue;
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
                // Look for source
                let source;
                if (link === null || link === void 0 ? void 0 : link.store[RESOURCE_ENERGY]) {
                    source = link;
                }
                else if (((_x = structures.centerExtension) === null || _x === void 0 ? void 0 : _x.store[RESOURCE_ENERGY]) && transferFromOpposite) {
                    source = structures.centerExtension;
                }
                else if (((_y = structures.container) === null || _y === void 0 ? void 0 : _y.store[RESOURCE_ENERGY]) && adjacentStructuresNeedEnergy) {
                    source = structures.container;
                }
                if (source) {
                    const amount = Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), source.store[RESOURCE_ENERGY]);
                    creep.withdraw(source, RESOURCE_ENERGY, amount);
                    viz(creep.pos.roomName).line(creep.pos, source.pos, { color: 'red' });
                    source.store[RESOURCE_ENERGY] -= amount;
                }
            }
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                let destination = [
                    structures.spawn,
                    ...structures.extensions,
                    !transferFromOpposite ? structures.centerExtension : undefined
                ].find(shouldTransfer);
                if (destination) {
                    creep.transfer(destination, RESOURCE_ENERGY);
                    viz(creep.pos.roomName).line(creep.pos, destination.pos, { color: 'green' });
                    destination.store[RESOURCE_ENERGY] = Math.min(destination.store.getCapacity(RESOURCE_ENERGY), destination.store[RESOURCE_ENERGY] + creep.store.getFreeCapacity(RESOURCE_ENERGY));
                }
            }
        }
    }
}

class HQLogisticsMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            clerk: new ConditionalCreepSpawner('x', this.missionData.office, {
                role: MinionTypes.CLERK,
                budget: Budget.ESSENTIAL,
                builds: energy => buildClerk(energy, undefined, true),
                shouldSpawn: () => hasEnergyIncome(this.missionData.office)
            })
        };
        this.priority = 15;
        this.setPriority();
    }
    static fromId(id) {
        return super.fromId(id);
    }
    onStart() {
        super.onStart();
    }
    setPriority() {
        var _a, _b;
        const plans = roomPlans(this.missionData.office);
        if (((_a = plans === null || plans === void 0 ? void 0 : plans.headquarters) === null || _a === void 0 ? void 0 : _a.link.structure) && ((_b = plans.fastfiller) === null || _b === void 0 ? void 0 : _b.link.structure)) {
            this.priority = 15; // key to keeping fastfiller running
        }
        else {
            this.priority = 9; // keeps upgrading going
        }
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.setPriority();
        const { clerk } = creeps;
        if (!clerk)
            return;
        // Priorities:
        // Link -> Storage
        // Storage <-> Terminal (energy)
        // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE
        const pos = getHeadquarterLogisticsLocation(data.office);
        if (!pos)
            return;
        main_26(clerk, { pos, range: 0 }, { roomCallback: defaultRoomCallback({ ignoreHQLogistics: true }) });
        if (!clerk.pos.isEqualTo(pos))
            return;
        // Check HQ state
        const hq = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.headquarters;
        const fastfiller = (_b = roomPlans(data.office)) === null || _b === void 0 ? void 0 : _b.fastfiller;
        const library = (_c = roomPlans(data.office)) === null || _c === void 0 ? void 0 : _c.library;
        if (!hq)
            return;
        let creepEnergy = clerk.store.getUsedCapacity(RESOURCE_ENERGY);
        const terminal = hq.terminal.structure;
        const storage = hq.storage.structure;
        const link = hq.link.structure;
        const extension = hq.extension.structure;
        const powerSpawn = hq.powerSpawn.structure;
        const terminalAmountNeeded = terminal ? 30000 - terminal.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
        const extensionAmountNeeded = extension ? extension.store.getFreeCapacity(RESOURCE_ENERGY) : 0;
        const powerSpawnAmountNeeded = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) : 0;
        const linkAmountAvailable = (_d = link === null || link === void 0 ? void 0 : link.store.getUsedCapacity(RESOURCE_ENERGY)) !== null && _d !== void 0 ? _d : 0;
        const destinationLinkFreeSpace = ((_f = (_e = fastfiller === null || fastfiller === void 0 ? void 0 : fastfiller.link.structure) === null || _e === void 0 ? void 0 : _e.store.getFreeCapacity(RESOURCE_ENERGY)) !== null && _f !== void 0 ? _f : 0) >
            LINK_CAPACITY / 2 ||
            ((_h = (_g = library === null || library === void 0 ? void 0 : library.link.structure) === null || _g === void 0 ? void 0 : _g.store.getFreeCapacity(RESOURCE_ENERGY)) !== null && _h !== void 0 ? _h : 0) > LINK_CAPACITY / 2;
        const linkAmountToTransfer = destinationLinkFreeSpace ? LINK_CAPACITY - linkAmountAvailable : -linkAmountAvailable;
        let withdraw = false;
        let transfer = false;
        const powerSpawnPowerNeeded = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_POWER) : 0;
        // Emergency provision for over-full Storage
        if (storage && storage.store.getFreeCapacity() < 5000) {
            !withdraw && clerk.withdraw(storage, RESOURCE_ENERGY);
            withdraw = true;
            if (clerk.drop(RESOURCE_ENERGY) === OK) {
                this.recordEnergy(clerk.store.getUsedCapacity(RESOURCE_ENERGY));
            }
            return;
        }
        // First, try to balance link
        if (link && linkAmountToTransfer < 0) {
            !withdraw &&
                clerk.withdraw(link, RESOURCE_ENERGY, Math.min(clerk.store.getFreeCapacity(), Math.abs(linkAmountToTransfer)));
            withdraw = true;
            creepEnergy += Math.abs(linkAmountToTransfer);
            // console.log(clerk.name, 'withdrawing', linkAmountAvailable, 'from link')
        }
        else if (link && linkAmountToTransfer > 0) {
            !transfer &&
                clerk.transfer(link, RESOURCE_ENERGY, Math.min(clerk.store.getUsedCapacity(RESOURCE_ENERGY), Math.abs(linkAmountToTransfer)));
            transfer = true;
            creepEnergy -= Math.abs(linkAmountToTransfer);
        }
        if (terminal && terminalAmountNeeded) {
            if (terminalAmountNeeded > 0) {
                const amount = Math.min(terminalAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
                !transfer && clerk.transfer(terminal, RESOURCE_ENERGY, amount);
                transfer = true;
                creepEnergy -= amount;
                // console.log(clerk.name, 'transferring', amount, 'to terminal')
            }
            else if (terminalAmountNeeded < 0) {
                const amount = Math.min(-terminalAmountNeeded, clerk.store.getFreeCapacity(RESOURCE_ENERGY));
                !withdraw && clerk.withdraw(terminal, RESOURCE_ENERGY, amount);
                withdraw = true;
                creepEnergy += amount;
            }
        }
        if (extension && extensionAmountNeeded && extensionAmountNeeded > 0) {
            const amount = Math.min(extensionAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
            !transfer && clerk.transfer(extension, RESOURCE_ENERGY, amount);
            transfer = true;
            creepEnergy -= amount;
            // console.log(clerk.name, 'transferring', amount, 'to extension')
        }
        // Power spawn
        if (powerSpawn && powerSpawnPowerNeeded > 50 && (terminal === null || terminal === void 0 ? void 0 : terminal.store.getUsedCapacity(RESOURCE_POWER))) {
            const amountToWithdraw = Math.min(powerSpawnPowerNeeded - clerk.store.getUsedCapacity(RESOURCE_POWER), terminal.store.getUsedCapacity(RESOURCE_POWER), clerk.store.getFreeCapacity(RESOURCE_POWER));
            if (amountToWithdraw) {
                !withdraw && clerk.withdraw(terminal, RESOURCE_POWER, amountToWithdraw);
                withdraw = true;
            }
            if (clerk.store.getUsedCapacity(RESOURCE_POWER)) {
                !transfer && clerk.transfer(powerSpawn, RESOURCE_POWER);
                transfer = true;
            }
        }
        if (powerSpawn && powerSpawnAmountNeeded && powerSpawnAmountNeeded > 0) {
            const amount = Math.min(powerSpawnAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
            !transfer && clerk.transfer(powerSpawn, RESOURCE_ENERGY, amount);
            transfer = true;
            creepEnergy -= amount;
            // console.log(clerk.name, 'transferring', amount, 'to extension')
        }
        if (storage && creepEnergy < clerk.store.getCapacity() / 2) {
            !withdraw && clerk.withdraw(storage, RESOURCE_ENERGY);
            withdraw = true;
            // console.log(clerk.name, 'withdrawing extra from storage')
        }
        else if (storage && creepEnergy > clerk.store.getCapacity() / 2) {
            const amount = creepEnergy - clerk.store.getCapacity() / 2;
            !transfer && clerk.transfer(storage, RESOURCE_ENERGY, amount);
            transfer = true;
            // console.log(clerk.name, 'transferring', amount, 'to storage')
        }
    }
}

const getResourcesFromMineContainer = profiler.registerFN((creep, office) => {
    var _a;
    // Default to specified franchise
    const plan = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.mine;
    const container = plan === null || plan === void 0 ? void 0 : plan.container.structure;
    if (!plan || !container)
        return BehaviorResult.FAILURE;
    if ((resourcesNearPos(container.pos).length === 0 && container.store.getUsedCapacity() === 0) ||
        creep.store.getFreeCapacity() === 0) {
        return BehaviorResult.SUCCESS; // Mine container drained
    }
    else {
        // First, pick up from container
        const resourceType = Object.keys(container.store)[0];
        if (resourceType && container.store.getUsedCapacity(resourceType) > 0) {
            main_26(creep, { pos: container.pos, range: 1 });
            creep.withdraw(container, resourceType);
        }
        else {
            // Otherwise, pick up loose resources
            const res = resourcesNearPos(plan.extractor.pos, 1).shift();
            if (res) {
                main_26(creep, { pos: res.pos, range: 1 });
                creep.pickup(res);
            }
        }
    }
    return BehaviorResult.INPROGRESS;
}, 'getResourcesFromMineContainer');

const buildForeman = (energy, maxTier = 3) => {
    const tiers = [3, 2, 1, 0].filter(tier => tier <= maxTier);
    if (energy < 550) {
        return [];
    }
    else {
        // Maintain 4-1 WORK-MOVE ratio
        const body = buildFromSegment(energy, [WORK, WORK, WORK, WORK, MOVE]);
        const count = body.filter(p => p === WORK).length;
        // boost, when available
        return tiers.map(tier => {
            const boosts = tier > 0 ? [{ type: BOOSTS_BY_INTENT.UPGRADE[tier - 1], count }] : [];
            return {
                body,
                boosts,
                tier,
                cost: buildCost(body, boosts)
            };
        });
    }
};

class MineMission extends MissionImplementation {
    constructor(missionData, id) {
        var _a;
        super(missionData, id);
        this.missionData = missionData;
        this.budget = Budget.SURPLUS;
        this.creeps = {
            miner: new CreepSpawner('m', this.missionData.office, {
                role: MinionTypes.FOREMAN,
                builds: energy => bestTierAvailable(this.missionData.office, buildForeman(energy))
            }),
            hauler: new CreepSpawner('h', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                builds: energy => buildAccountant(energy)
            })
        };
        this.priority = 7;
        const energy = Game.rooms[this.missionData.office].energyCapacityAvailable;
        (_a = this.estimatedEnergyRemaining) !== null && _a !== void 0 ? _a : (this.estimatedEnergyRemaining = maxBuildCost(buildForeman(energy)) + maxBuildCost(buildAccountant(energy)));
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a;
        const { miner, hauler } = creeps;
        if (this.creeps.miner.died && this.creeps.hauler.died) {
            this.status = MissionStatus.DONE;
        }
        const plan = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.mine;
        const mine = byId(data.mineral);
        const extractor = plan === null || plan === void 0 ? void 0 : plan.extractor.structure;
        if (!plan || !mine || !extractor) {
            this.status = MissionStatus.DONE;
            return;
        }
        if (miner) {
            runStates({
                [States.GET_BOOSTED]: getBoosted(States.WORKING),
                [States.WORKING]: (data, miner) => {
                    if (mine.mineralAmount === 0)
                        return States.RECYCLE;
                    // Always work from container position
                    main_26(miner, { pos: plan.container.pos, range: 0 });
                    if (miner.pos.isEqualTo(plan.container.pos)) {
                        miner.harvest(mine);
                    }
                    return States.WORKING;
                },
                [States.RECYCLE]: recycle
            }, this.missionData, miner);
        }
        if (hauler) {
            runStates({
                [States.WITHDRAW]: (data, hauler) => {
                    if (getResourcesFromMineContainer(hauler, data.office) === BehaviorResult.SUCCESS) {
                        if (!miner && hauler.store.getUsedCapacity() === 0) {
                            // all done
                            return States.RECYCLE;
                        }
                        return States.DEPOSIT;
                    }
                    return States.WITHDRAW;
                },
                [States.DEPOSIT]: (data, hauler) => {
                    var _a, _b;
                    if (hauler.store.getUsedCapacity() === 0) {
                        return States.WITHDRAW;
                    }
                    const terminal = (_b = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal;
                    const res = Object.keys(hauler.store)[0];
                    if (!res) {
                        return States.WITHDRAW;
                    }
                    if (!terminal)
                        return States.DEPOSIT;
                    if (terminal.structure && terminal.structure.store.getFreeCapacity() > 100000) {
                        main_26(hauler, { pos: terminal.pos, range: 1 });
                        hauler.transfer(terminal.structure, res);
                    }
                    else {
                        hauler.drop(res);
                    }
                    return States.DEPOSIT;
                },
                [States.RECYCLE]: recycle
            }, this.missionData, hauler);
        }
    }
}

class PlunderMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            haulers: new MultiCreepSpawner('h', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                budget: Budget.SURPLUS,
                builds: energy => buildAccountant(energy),
                count: current => {
                    var _a, _b;
                    const capacity = (_b = (_a = Memory.rooms[this.missionData.targetRoom].plunder) === null || _a === void 0 ? void 0 : _a.capacity) !== null && _b !== void 0 ? _b : 0;
                    if (capacity > current.map(c => c.store.getCapacity()).reduce(sum, 0)) {
                        return 1; // more haulers needed
                    }
                    return 0; // we are at capacity
                }
            })
        };
        this.priority = 5;
        let distance = getRangeTo(new RoomPosition(25, 25, missionData.office), new RoomPosition(25, 25, missionData.targetRoom));
        if (distance) {
            // Increase priority for closer targets, up to 1 point for closer than 50 squares
            // Round priority to two places
            this.priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
        }
    }
    static fromId(id) {
        return super.fromId(id);
    }
    onStart() {
        super.onStart();
        console.log('[PowerBankMission] started targeting', this.missionData.targetRoom);
    }
    onEnd() {
        super.onEnd();
        console.log('[PlunderMission] finished for', this.missionData.targetRoom);
    }
    run(creeps, missions, data) {
        var _a, _b, _c;
        var _d, _e;
        const { haulers } = creeps;
        (_a = data.assignments) !== null && _a !== void 0 ? _a : (data.assignments = {});
        const plunder = (_b = Memory.rooms[data.targetRoom]) === null || _b === void 0 ? void 0 : _b.plunder;
        console.log('office', data.office, 'targetRoom', data.targetRoom, 'plunder', JSON.stringify(plunder));
        if (!plunder && haulers.length === 0) {
            this.status = MissionStatus.DONE;
        }
        const { resources } = plunder !== null && plunder !== void 0 ? plunder : {};
        for (const creep of haulers) {
            (_c = (_d = data.assignments)[_e = creep.name]) !== null && _c !== void 0 ? _c : (_d[_e] = {});
            runStates({
                [States.WITHDRAW]: (assignment, creep) => {
                    var _a, _b;
                    if (creep.store.getFreeCapacity() === 0) {
                        if (plunder)
                            plunder.capacity -= creep.store.getUsedCapacity();
                        return States.DEPOSIT;
                    }
                    if (creep.pos.roomName !== data.targetRoom) {
                        main_26(creep, { pos: new RoomPosition(25, 25, data.targetRoom), range: 20 });
                        return States.WITHDRAW;
                    }
                    (_a = assignment.plunderTarget) !== null && _a !== void 0 ? _a : (assignment.plunderTarget = (_b = Game.rooms[data.targetRoom].find(FIND_HOSTILE_STRUCTURES, {
                        filter: s => 'store' in s &&
                            s.structureType !== STRUCTURE_NUKER &&
                            Object.keys(s.store).some(k => resources === null || resources === void 0 ? void 0 : resources.includes(k))
                    })[0]) === null || _b === void 0 ? void 0 : _b.id);
                    if (!assignment.plunderTarget) {
                        if (plunder)
                            plunder.capacity -= creep.store.getUsedCapacity();
                        return States.DEPOSIT;
                    }
                    const target = byId(assignment.plunderTarget);
                    const targetResource = target &&
                        Object.keys(target.store).find(k => resources === null || resources === void 0 ? void 0 : resources.includes(k));
                    if (!targetResource) {
                        delete assignment.plunderTarget;
                    }
                    else {
                        if (creep.withdraw(target, targetResource) === ERR_NOT_IN_RANGE) {
                            main_26(creep, { pos: target.pos, range: 1 });
                            const opportunityTarget = creep.pos
                                .findInRange(FIND_HOSTILE_STRUCTURES, 1)
                                .find(s => 'store' in s && Object.keys(s.store).length);
                            if (opportunityTarget) {
                                const opportunityResource = Object.keys(opportunityTarget.store).find(k => resources === null || resources === void 0 ? void 0 : resources.includes(k));
                                if (opportunityResource) {
                                    creep.withdraw(opportunityTarget, opportunityResource);
                                }
                                else {
                                    delete assignment.plunderTarget;
                                }
                            }
                            return States.WITHDRAW;
                        }
                        else {
                            // withdrew successfully, or another error
                            setArrived(creep);
                        }
                    }
                    return States.WITHDRAW;
                },
                [States.DEPOSIT]: (assignment, creep) => {
                    var _a, _b, _c, _d, _e;
                    if (creep.store.getUsedCapacity() === 0) {
                        if (!creep.memory.arrived || ((_a = creep.ticksToLive) !== null && _a !== void 0 ? _a : CREEP_LIFE_TIME) > creep.memory.arrived) {
                            return States.WITHDRAW;
                        }
                        else {
                            recycle(data, creep);
                        }
                    }
                    const terminal = (_c = (_b = roomPlans(data.office)) === null || _b === void 0 ? void 0 : _b.headquarters) === null || _c === void 0 ? void 0 : _c.terminal.structure;
                    const storage = (_e = (_d = roomPlans(data.office)) === null || _d === void 0 ? void 0 : _d.headquarters) === null || _e === void 0 ? void 0 : _e.storage.structure;
                    const nonEnergyResource = Object.keys(creep.store).find(c => c !== RESOURCE_ENERGY);
                    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) &&
                        storage &&
                        creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        main_26(creep, storage.pos);
                        return States.DEPOSIT;
                    }
                    else if (nonEnergyResource) {
                        if (terminal && creep.transfer(terminal, nonEnergyResource) === ERR_NOT_IN_RANGE) {
                            main_26(creep, { pos: terminal.pos, range: 1 });
                            return States.DEPOSIT;
                        }
                        else if (storage && creep.transfer(storage, nonEnergyResource) === ERR_NOT_IN_RANGE) {
                            main_26(creep, { pos: storage.pos, range: 1 });
                            return States.DEPOSIT;
                        }
                        else if (!terminal && !storage) {
                            creep.drop(nonEnergyResource);
                        }
                    }
                    return States.DEPOSIT;
                }
            }, data.assignments[creep.name], creep);
        }
    }
}

class PowerBankMission extends MissionImplementation {
    constructor(missionData, id) {
        var _a, _b, _c;
        super(missionData, id);
        this.missionData = missionData;
        this.budget = Budget.SURPLUS;
        this.creeps = {
            haulers: new MultiCreepSpawner('h', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                builds: energy => buildAccountant(energy, 25, false, false),
                count: fixedCount(() => {
                    var _a, _b;
                    // wait to spawn until duos are about to crack the bank
                    if (!this.willBreachIn(750)) {
                        return 0;
                    }
                    // spawn enough to haul all the power in one trip
                    return Math.ceil(((_b = (_a = this.report()) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : 0) / (25 * CARRY_CAPACITY));
                })
            }, { onSpawn: creep => this.recordCreepEnergy(creep) })
        };
        this.missions = {
            duos: new MultiMissionSpawner(PowerBankDuoMission, current => {
                var _a, _b, _c, _d;
                const duosCount = (_b = (_a = this.report()) === null || _a === void 0 ? void 0 : _a.duoCount) !== null && _b !== void 0 ? _b : 1; // if boosted, only needs one
                if (current.length >= ((_d = (_c = this.report()) === null || _c === void 0 ? void 0 : _c.adjacentSquares) !== null && _d !== void 0 ? _d : 0) ||
                    current.some(d => !d.assembled()) ||
                    current.length >= duosCount) {
                    return []; // enough missions already
                }
                const analysis = PowerBankDuoMission.costAnalysis(this.missionData.office, this.report());
                // console.log(JSON.stringify(analysis));
                if (analysis.bestTier === undefined) {
                    return []; // no viable builds
                }
                return [Object.assign(Object.assign({}, this.missionData), { boostTier: analysis.bestTier })];
            }, mission => {
                var _a;
                this.recordMissionEnergy(mission);
                this.missionData.duosSpawned = ((_a = this.missionData.duosSpawned) !== null && _a !== void 0 ? _a : 0) + 1;
            })
        };
        this.priority = 6;
        // calculate energy needed for mission
        const powerCost = (_a = this.report()) === null || _a === void 0 ? void 0 : _a.powerCost;
        const amount = (_b = this.report()) === null || _b === void 0 ? void 0 : _b.amount;
        if (powerCost && amount) {
            (_c = this.estimatedEnergyRemaining) !== null && _c !== void 0 ? _c : (this.estimatedEnergyRemaining = powerCost * amount);
            missionData.powerToRetrieve = amount;
        }
        else {
            console.log('Unable to fetch report for powerbank mission', unpackPos(missionData.powerBankPos));
            this.status = MissionStatus.DONE;
        }
    }
    static fromId(id) {
        return super.fromId(id);
    }
    onStart() {
        super.onStart();
        console.log('[PowerBankMission] started targeting', unpackPos(this.missionData.powerBankPos));
    }
    onEnd() {
        var _a;
        super.onEnd();
        console.log('[PowerBankMission] finished in', unpackPos(this.missionData.powerBankPos));
        if (this.missionData.powerToRetrieve) {
            const retrieved = (_a = this.missionData.powerRetrieved) !== null && _a !== void 0 ? _a : 0;
            const percent = (retrieved / this.missionData.powerToRetrieve) * 100;
            console.log(`[PowerBankMission] retrieved ${retrieved} of ${this.missionData.powerToRetrieve} (${percent}%)`);
        }
    }
    report() {
        return Memory.offices[this.missionData.office].powerbanks.find(p => p.id === this.missionData.powerBank);
    }
    willBreachIn(ticks) {
        var _a, _b;
        const hits = (_b = (_a = this.report()) === null || _a === void 0 ? void 0 : _a.hits) !== null && _b !== void 0 ? _b : 0;
        const damage = this.missions.duos.resolved.map(m => m.actualDamageRemaining(ticks)).reduce(sum, 0);
        return damage >= hits;
    }
    run(creeps, missions, data) {
        var _a, _b, _c, _d, _e;
        const { haulers } = creeps;
        // short circuit
        if (((_b = (_a = this.report()) === null || _a === void 0 ? void 0 : _a.expires) !== null && _b !== void 0 ? _b : 0) - Game.time < 1800 && ((_c = this.report()) === null || _c === void 0 ? void 0 : _c.hits) === POWER_BANK_HITS) {
            // less than 1800 ticks to decay and no damage done yet, abandon
            this.status = MissionStatus.DONE;
            return;
        }
        if (!this.report() && !haulers.length) {
            this.status = MissionStatus.DONE;
        }
        const powerBankPos = unpackPos(data.powerBankPos);
        const powerBankRuin = Game.rooms[powerBankPos.roomName]
            ? powerBankPos.lookFor(LOOK_RUINS).find(s => s.structure.structureType === STRUCTURE_POWER_BANK)
            : undefined;
        const powerBankResources = Game.rooms[powerBankPos.roomName]
            ? powerBankPos.lookFor(LOOK_RESOURCES).find(s => s.resourceType === RESOURCE_POWER)
            : undefined;
        const terminal = (_e = (_d = roomPlans(data.office)) === null || _d === void 0 ? void 0 : _d.headquarters) === null || _e === void 0 ? void 0 : _e.terminal.structure;
        for (const hauler of haulers) {
            runStates({
                [States.WITHDRAW]: (mission, creep) => {
                    var _a;
                    if (creep.store.getUsedCapacity(RESOURCE_POWER) ||
                        (Game.rooms[powerBankPos.roomName] &&
                            !byId((_a = this.report()) === null || _a === void 0 ? void 0 : _a.id) &&
                            !powerBankRuin &&
                            !Game.rooms[powerBankPos.roomName].find(FIND_DROPPED_RESOURCES, { filter: RESOURCE_POWER }).length)) {
                        return States.DEPOSIT;
                    }
                    if (powerBankRuin) {
                        main_26(creep, powerBankRuin);
                        creep.withdraw(powerBankRuin, RESOURCE_POWER);
                    }
                    else if (powerBankResources) {
                        main_26(creep, powerBankResources);
                        creep.pickup(powerBankResources);
                    }
                    else {
                        main_26(creep, { pos: powerBankPos, range: 3 }, { visualizePathStyle: {} });
                    }
                    Game.map.visual.line(creep.pos, powerBankPos);
                    return States.WITHDRAW;
                },
                [States.DEPOSIT]: (mission, creep) => {
                    var _a;
                    if (!creep.store.getUsedCapacity(RESOURCE_POWER) || !terminal)
                        return States.RECYCLE;
                    main_26(creep, terminal);
                    const result = creep.transfer(terminal, RESOURCE_POWER);
                    if (result === OK) {
                        (_a = data.powerRetrieved) !== null && _a !== void 0 ? _a : (data.powerRetrieved = 0);
                        data.powerRetrieved += Math.min(creep.store.getUsedCapacity(RESOURCE_POWER), terminal.store.getFreeCapacity(RESOURCE_POWER));
                    }
                    return States.DEPOSIT;
                },
                [States.RECYCLE]: recycle
            }, this.missionData, hauler);
        }
    }
}

const buildMarketer = (energy) => {
    if (energy < 650) {
        return [];
    }
    else {
        return unboosted(buildFromSegment(energy, [CLAIM, MOVE], { maxSegments: 5 }));
    }
};

class ReserveMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            marketers: new MultiCreepSpawner('m', this.missionData.office, {
                role: MinionTypes.MARKETER,
                budget: Budget.ECONOMY,
                builds: energy => buildMarketer(energy),
                count: current => {
                    var _a, _b;
                    if (Game.rooms[this.missionData.office].energyCapacityAvailable < 650)
                        return 0;
                    const targets = (_b = (_a = this.missionData.reserveTargets) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
                    if (current.filter(prespawnByArrived).length < targets)
                        return 1;
                    return 0;
                },
                estimatedCpuPerTick: 1.5
            })
        };
        this.priority = 9;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a;
        const { marketers } = creeps;
        data.reserveTargets = [
            ...new Set(activeFranchises(data.office, 1)
                .filter(({ source }) => !franchiseIsThreatened(data.office, source))
                .map(({ room }) => room)
                .filter(room => room !== data.office))
        ].filter(room => { var _a, _b; return Memory.rooms[room].reserver !== 'LordGreywether' || ((_b = (_a = Memory.rooms[room]) === null || _a === void 0 ? void 0 : _a.reservation) !== null && _b !== void 0 ? _b : 0) < 3000; });
        (_a = data.assignments) !== null && _a !== void 0 ? _a : (data.assignments = {});
        // remove no longer valid assignments
        const assigned = [];
        const unassignedCreeps = new Set(marketers.map(c => c.name));
        for (const assignment in data.assignments) {
            if (!Game.creeps[assignment]) {
                delete data.assignments[assignment];
            }
            else if (!assigned.includes(data.assignments[assignment])) {
                unassignedCreeps.delete(assignment);
                if (prespawnByArrived(Game.creeps[assignment]))
                    assigned.push(data.assignments[assignment]);
            }
        }
        // create new assignments
        for (const target of data.reserveTargets) {
            if (assigned.includes(target))
                continue;
            for (const name of unassignedCreeps) {
                const creep = Game.creeps[name];
                if (!creep.ticksToLive || creep.ticksToLive <= getRangeTo(creep.pos, new RoomPosition(25, 25, target)))
                    continue;
                // assign creep
                data.assignments[name] = target;
                unassignedCreeps.delete(name);
                assigned.push(target);
                break;
            }
        }
        for (const creep of marketers) {
            const target = data.assignments[creep.name];
            if (!target)
                continue;
            // Reserve target
            const controllerPos = controllerPosition(target);
            if (!controllerPos)
                continue;
            if (creep.pos.getRangeTo(controllerPos) <= 2) {
                // Set arrived timestamp when in range
                setArrived(creep);
            }
            // Move to controller
            main_26(creep, { pos: controllerPos, range: 1 });
            if (creep.pos.inRangeTo(controllerPos, 1)) {
                // Reserve controller
                const controller = Game.rooms[target].controller;
                if (controller) {
                    creep.reserveController(controller);
                }
                signRoom(creep, target);
            }
        }
    }
}

const deposit = (order) => ({ office }, creep) => {
    var _a, _b;
    const terminal = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure;
    if (!terminal)
        return States.DEPOSIT;
    if (creep.store.getUsedCapacity() === 0) {
        return States.WITHDRAW;
    }
    const toDeposit = Object.keys(creep.store)[0];
    if (!toDeposit) {
        // Nothing further to deposit
        return States.WITHDRAW;
    }
    main_26(creep, { pos: terminal.pos, range: 1 });
    creep.transfer(terminal, toDeposit);
    if (order && toDeposit === order.output) {
        // Decrement output from the lab order
        order.amount -= creep.store.getUsedCapacity(toDeposit);
    }
    return States.DEPOSIT;
};

const emptyLabs = ({ waitForReaction, labs }, creep) => {
    const threshold = waitForReaction ? 100 : 0;
    const target = labs.find(l => l.mineralType !== null && l.store.getUsedCapacity(l.mineralType) > threshold);
    const resource = target === null || target === void 0 ? void 0 : target.mineralType;
    if ((!waitForReaction && !resource) || creep.store.getFreeCapacity() === 0) {
        return States.DEPOSIT;
    }
    else if (!resource) {
        return States.EMPTY_LABS; // wait for reaction to collect more
    }
    main_26(creep, { pos: target.pos, range: 1 });
    creep.withdraw(target, resource);
    return States.EMPTY_LABS;
};

const fillLabs = ({ fillOrders }, creep) => {
    for (const [lab, resource, amount] of fillOrders) {
        const hasAmount = creep.store.getUsedCapacity(resource);
        if (hasAmount) {
            main_26(creep, lab);
            creep.transfer(lab, resource, Math.min(amount, hasAmount, lab.store.getFreeCapacity(resource)));
            return States.FILL_LABS;
        }
    }
    return States.EMPTY_LABS; // nothing left to fill
};

const withdrawResourcesFromTerminal = ({ office, withdrawResources }, creep) => {
    var _a, _b;
    const terminal = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure;
    if (!terminal)
        return States.WITHDRAW;
    main_26(creep, { pos: terminal.pos, range: 1 });
    if (creep.pos.inRangeTo(terminal, 1)) {
        if (creep.store.getFreeCapacity() > 0) {
            for (const [resource, needed] of withdrawResources) {
                if (creep.store.getUsedCapacity(resource) >= needed || !terminal.store.getUsedCapacity(resource))
                    continue;
                // Need to get some of this resource
                creep.withdraw(terminal, resource, Math.min(needed, creep.store.getFreeCapacity(), terminal.store.getUsedCapacity(resource)));
                return States.WITHDRAW;
            }
            // No more resources to get
        }
        return States.FILL_LABS;
    }
    return States.WITHDRAW;
};

function ingredientsNeededForLabOrder(office, order, scientists) {
    // In Process ingredients are in Scientists' inventories or input labs
    // In Process products are in Scientists' inventories or output labs
    const { inputs, outputs } = getLabs(office);
    const product = scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.output), 0) +
        outputs.reduce((sum, c) => { var _a, _b; return sum + ((_b = (_a = c.structure) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity(order.output)) !== null && _b !== void 0 ? _b : 0); }, 0);
    const ingredient1 = scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.ingredient1), 0) +
        inputs.reduce((sum, c) => { var _a, _b; return sum + ((_b = (_a = c.structure) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity(order.ingredient1)) !== null && _b !== void 0 ? _b : 0); }, 0);
    const ingredient2 = scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.ingredient2), 0) +
        inputs.reduce((sum, c) => { var _a, _b; return sum + ((_b = (_a = c.structure) === null || _a === void 0 ? void 0 : _a.store.getUsedCapacity(order.ingredient2)) !== null && _b !== void 0 ? _b : 0); }, 0);
    const target = order.amount - product;
    const roundToNextHighest = (increment, value) => Math.ceil(value / increment) * increment;
    return {
        ingredient1: Math.max(0, roundToNextHighest(5, target - ingredient1)),
        ingredient2: Math.max(0, roundToNextHighest(5, target - ingredient2))
    };
}

function labsShouldBeEmptied(office) {
    var _a;
    const order = (_a = Memory.offices[office].lab.orders) === null || _a === void 0 ? void 0 : _a.find(o => o.amount > 0);
    const { inputs, outputs } = getLabs(office);
    const [lab1, lab2] = inputs.map(s => s.structure);
    // if no order, and there are resources in labs, then labs should be emptied
    if (!order && [...inputs, ...outputs].some(l => { var _a; return (_a = l.structure) === null || _a === void 0 ? void 0 : _a.mineralType; })) {
        return true;
    }
    else if (!order) {
        return false;
    }
    // Return true if input labs have foreign ingredients, or output labs have an old product
    return (((lab1 === null || lab1 === void 0 ? void 0 : lab1.mineralType) && (lab1 === null || lab1 === void 0 ? void 0 : lab1.mineralType) !== order.ingredient1) ||
        ((lab2 === null || lab2 === void 0 ? void 0 : lab2.mineralType) && (lab2 === null || lab2 === void 0 ? void 0 : lab2.mineralType) !== order.ingredient2) ||
        outputs.some(l => { var _a, _b; return ((_a = l.structure) === null || _a === void 0 ? void 0 : _a.mineralType) && ((_b = l.structure) === null || _b === void 0 ? void 0 : _b.mineralType) !== order.output; }));
}

let enabled = undefined;
const marketEnabled = () => {
    if (enabled === undefined)
        enabled = !!allMarketOrders().length;
    return enabled;
};
const allMarketOrders = memoizeByTick(() => '', () => Game.market.getAllOrders());

/**
 * Decrements availableResources if it can pull from there instead of submitting an order
 */
function getOrderForIngredient(ingredient, amount, availableResources) {
    const existing = availableResources.get(ingredient);
    if (ingredient in RESOURCE_INGREDIENTS) {
        // Check for existing resources
        let reserved = 0;
        if (existing) {
            reserved = Math.min(amount, existing);
            availableResources.set(ingredient, existing - reserved);
        }
        if (amount - reserved === 0)
            return; // No need for an order, we have what we need
        return {
            ingredient1: RESOURCE_INGREDIENTS[ingredient][0],
            ingredient2: RESOURCE_INGREDIENTS[ingredient][1],
            amount: amount - reserved,
            output: ingredient
        };
    }
    else {
        if (!marketEnabled() && !existing) {
            throw new Error('Not enough of ingredient');
        }
    }
    return;
}
function getAvailableResourcesFromTerminal(terminal) {
    const availableResources = new Map();
    for (let resource in terminal.store) {
        availableResources.set(resource, terminal.store.getUsedCapacity(resource));
    }
    return availableResources;
}
function getLabOrderDependencies(order, availableResources) {
    const ingredients = [
        getOrderForIngredient(order.ingredient1, order.amount, availableResources),
        getOrderForIngredient(order.ingredient2, order.amount, availableResources)
    ].filter(o => o !== undefined);
    return ingredients.flatMap(o => getLabOrderDependencies(o, availableResources)).concat(ingredients);
}
function getLabOrders(ingredient, amount, terminal) {
    const available = getAvailableResourcesFromTerminal(terminal);
    // Don't count existing quantity of this ingredient
    available.set(ingredient, 0);
    const target = getOrderForIngredient(ingredient, amount, available);
    if (target) {
        return getLabOrderDependencies(target, available).concat(target);
    }
    else {
        return [];
    }
}

class ScienceMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.creeps = {
            scientist: new ConditionalCreepSpawner('s', this.missionData.office, {
                role: MinionTypes.ACCOUNTANT,
                budget: Budget.EFFICIENCY,
                builds: energy => buildAccountant(energy, 25, true, false),
                shouldSpawn: () => Boolean(Memory.offices[this.missionData.office].lab.orders.length !== 0 ||
                    Memory.offices[this.missionData.office].lab.boosts.length !== 0)
            })
        };
        this.priority = 9;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        var _a, _b, _c;
        const { scientist } = creeps;
        if (!scientist)
            return;
        registerScientists(data.office, [scientist]);
        const terminal = (_b = (_a = roomPlans(data.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure;
        if (!terminal)
            return;
        const order = Memory.offices[data.office].lab.orders.find(o => o.amount > 0);
        const boosting = shouldHandleBoosts(data.office);
        // if (boosting) console.log('boosting');
        if (((_c = scientist.ticksToLive) !== null && _c !== void 0 ? _c : 1500) < 200) {
            scientist.memory.runState = States.RECYCLE;
        }
        else if ((boosting && boostLabsToEmpty(data.office).length > 0) ||
            (!boosting && labsShouldBeEmptied(data.office) && scientist.store.getUsedCapacity() === 0)) {
            scientist.memory.runState = States.EMPTY_LABS;
        }
        else if (!scientist.memory.runState) {
            scientist.memory.runState = States.DEPOSIT;
        }
        runStates({
            [States.DEPOSIT]: deposit(order),
            [States.WITHDRAW]: (data, creep) => {
                if (boosting) {
                    const withdrawResources = boostLabsToFill(data.office)
                        .map(lab => boostsNeededForLab(data.office, lab.id))
                        .filter((request) => Boolean(request[0] && request[1]));
                    return withdrawResourcesFromTerminal({ office: data.office, withdrawResources }, creep);
                }
                else if (order) {
                    const { ingredient1, ingredient2 } = ingredientsNeededForLabOrder(data.office, order, []);
                    if (ingredient1 + ingredient2 === 0 &&
                        creep.store.getUsedCapacity(order.ingredient1) + creep.store.getUsedCapacity(order.ingredient2) === 0) {
                        // No more ingredients needed; just empty labs of product
                        return States.EMPTY_LABS;
                    }
                    const ingredientQuantity = (i) => Math.min(Math.floor(creep.store.getCapacity() / 2), i);
                    const target1 = Math.min(Math.max(0, ingredientQuantity(ingredient1) - creep.store.getUsedCapacity(order.ingredient1)), creep.store.getFreeCapacity());
                    const target2 = Math.min(Math.max(0, ingredientQuantity(ingredient2) - creep.store.getUsedCapacity(order.ingredient2)), creep.store.getFreeCapacity());
                    if (target1 > terminal.store.getUsedCapacity(order.ingredient1) ||
                        target2 > terminal.store.getUsedCapacity(order.ingredient2)) {
                        // not enough resources in terminal - recalculate lab orders
                        Memory.offices[data.office].lab.orders = getLabOrderDependencies(order, getAvailableResourcesFromTerminal(terminal)).concat(order);
                    }
                    const withdrawResources = [
                        [order.ingredient1, target1],
                        [order.ingredient2, target2]
                    ].filter((request) => Boolean(request[0] && request[1]));
                    return withdrawResourcesFromTerminal({ office: data.office, withdrawResources }, creep);
                }
                return States.WITHDRAW;
            },
            [States.EMPTY_LABS]: (data, creep) => {
                if (boosting) {
                    return emptyLabs(Object.assign(Object.assign({}, data), { labs: boostLabsToEmpty(data.office) }), creep);
                }
                else {
                    const { inputs } = getLabs(data.office);
                    const [lab1, lab2] = inputs.map(s => s.structure);
                    // reaction is ongoing, let it pile up before emptying
                    const waitForReaction = lab1 &&
                        lab1.mineralType === (order === null || order === void 0 ? void 0 : order.ingredient1) &&
                        lab1.store.getUsedCapacity(lab1.mineralType) > 5 &&
                        lab2 &&
                        lab2.mineralType === (order === null || order === void 0 ? void 0 : order.ingredient2) &&
                        lab2.store.getUsedCapacity(lab2.mineralType) > 5;
                    return emptyLabs(Object.assign(Object.assign({}, data), { labs: reactionLabsToEmpty(data.office), waitForReaction }), creep);
                }
            },
            [States.FILL_LABS]: (data, creep) => {
                if (boosting) {
                    const fillOrders = boostLabsToFill(data.office)
                        .map(lab => {
                        const [resource, amount] = boostsNeededForLab(data.office, lab.id);
                        return [lab, resource, amount];
                    })
                        .filter((order) => Boolean(order[1] && order[2]));
                    return fillLabs({
                        fillOrders
                    }, creep);
                }
                else if (order) {
                    // console.log(creep.name, 'filling');
                    const { inputs } = getLabs(data.office);
                    const [lab1, lab2] = inputs.map(s => s.structure);
                    const { ingredient1, ingredient2 } = ingredientsNeededForLabOrder(data.office, order, []);
                    return fillLabs({
                        fillOrders: [
                            [lab1, order.ingredient1, ingredient1],
                            [lab2, order.ingredient2, ingredient2]
                        ].filter((o) => Boolean(o[0]))
                    }, creep);
                }
                return States.FILL_LABS;
            },
            [States.RECYCLE]: (data, creep) => {
                if (!terminal || creep.store.getUsedCapacity() === 0) {
                    // Go to spawn and recycle
                    return recycle(data, creep);
                }
                else if (terminal) {
                    // deposit resources first
                    main_26(creep, { pos: terminal.pos, range: 1 });
                    const toDeposit = Object.keys(creep.store)[0];
                    toDeposit && creep.transfer(terminal, toDeposit);
                }
                return States.RECYCLE;
            }
        }, this.missionData, scientist);
    }
}

class MainOfficeMission extends MissionImplementation {
    constructor(missionData, id) {
        super(missionData, id);
        this.missionData = missionData;
        this.missions = {
            harvest: new MultiMissionSpawner(HarvestMission, current => {
                const franchises = new Set(franchisesByOffice(this.missionData.office).map(({ source }) => source));
                for (const mission of current) {
                    franchises.delete(mission.missionData.source);
                }
                return [...franchises].map(source => (Object.assign({ source }, this.missionData)));
            }),
            logistics: new MissionSpawner(LogisticsMission, () => (Object.assign({}, this.missionData))),
            explore: new MissionSpawner(ExploreMission, () => (Object.assign({}, this.missionData))),
            fastfiller: new ConditionalMissionSpawner(FastfillerMission, () => (Object.assign(Object.assign({}, this.missionData), { refillSquares: refillSquares(this.missionData.office) })), () => {
                var _a, _b;
                return Boolean(((_b = (_a = roomPlans(this.missionData.office)) === null || _a === void 0 ? void 0 : _a.fastfiller) === null || _b === void 0 ? void 0 : _b.containers.some(e => e.structure)) &&
                    hasEnergyIncome(this.missionData.office));
            }),
            engineer: new MissionSpawner(EngineerMission, () => (Object.assign({}, this.missionData))),
            reserve: new MissionSpawner(ReserveMission, () => (Object.assign({}, this.missionData))),
            cleanup: new MissionSpawner(CleanupMission, () => (Object.assign({}, this.missionData))),
            hqLogistics: new ConditionalMissionSpawner(HQLogisticsMission, () => (Object.assign({}, this.missionData)), () => { var _a, _b; return Boolean((_b = (_a = roomPlans(this.missionData.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.link.structure); }),
            upgrade: new MissionSpawner(UpgradeMission, () => (Object.assign({}, this.missionData))),
            emergencyUpgrade: new ConditionalMissionSpawner(EmergencyUpgradeMission, () => (Object.assign({}, this.missionData)), () => Game.rooms[this.missionData.office].controller.ticksToDowngrade < 3000),
            science: new ConditionalMissionSpawner(ScienceMission, () => (Object.assign({}, this.missionData)), () => { var _a, _b; return Boolean(((_b = (_a = roomPlans(this.missionData.office)) === null || _a === void 0 ? void 0 : _a.labs) === null || _b === void 0 ? void 0 : _b.labs.filter(s => s.structure).length)); }),
            defense: new MissionSpawner(DefenseCoordinationMission, () => (Object.assign({}, this.missionData))),
            mining: new ConditionalMissionSpawner(MineMission, () => (Object.assign({ mineral: mineralId(this.missionData.office) }, this.missionData)), () => {
                var _a, _b, _c;
                return Boolean(((_a = byId(mineralId(this.missionData.office))) === null || _a === void 0 ? void 0 : _a.mineralAmount) &&
                    ((_c = (_b = roomPlans(this.missionData.office)) === null || _b === void 0 ? void 0 : _b.mine) === null || _c === void 0 ? void 0 : _c.extractor.structure));
            }),
            powerBanks: new MultiMissionSpawner(PowerBankMission, current => {
                if (current.length || rcl(this.missionData.office) < 8 || !FEATURES.POWER)
                    return []; // only one powerbank mission per office at a time
                const powerbank = Memory.offices[this.missionData.office].powerbanks
                    .filter(r => r.distance &&
                    r.distance < 550 &&
                    r.powerCost &&
                    r.powerCost < buyMarketPrice(RESOURCE_POWER) &&
                    r.hits === POWER_BANK_HITS &&
                    r.expires - Game.time > 3000)
                    .reduce(min(r => { var _a; return (_a = r.powerCost) !== null && _a !== void 0 ? _a : Infinity; }), undefined);
                if (!powerbank)
                    return [];
                return [Object.assign(Object.assign({}, this.missionData), { powerBank: powerbank.id, powerBankPos: powerbank.pos })];
            }),
            plunder: new MultiMissionSpawner(PlunderMission, current => {
                var _a, _b;
                if (current.length || !((_b = (_a = roomPlans(this.missionData.office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure))
                    return []; // only one plunder mission per office
                const targetRoom = calculateNearbyRooms(this.missionData.office, 3, false).find(r => { var _a, _b; return (_b = (_a = Memory.rooms[r]) === null || _a === void 0 ? void 0 : _a.plunder) === null || _b === void 0 ? void 0 : _b.resources.length; });
                if (!targetRoom)
                    return [];
                return [Object.assign(Object.assign({}, this.missionData), { targetRoom })];
            }),
            acquire: new MultiMissionSpawner(AcquireMission, current => {
                if (current.length)
                    return [];
                const targetOffice = findAcquireTarget();
                if (targetOffice && officeShouldAcquireTarget(this.missionData.office)) {
                    return [Object.assign(Object.assign({}, this.missionData), { targetOffice })];
                }
                return [];
            })
        };
        this.priority = 20;
    }
    static fromId(id) {
        return super.fromId(id);
    }
    run(creeps, missions, data) {
        if (!Game.rooms[data.office]) {
            this.status = MissionStatus.DONE;
        }
        return;
    }
}

let initializedCreeps = false;
const officeMissions = new Map();
function initializeOfficeMissions() {
    var _a;
    for (const office in Memory.offices) {
        if (((_a = Memory.roomPlans[office]) === null || _a === void 0 ? void 0 : _a.complete) && !officeMissions.has(office)) {
            const mission = new MainOfficeMission({ office }, Memory.offices[office].missionId);
            mission.init();
            Memory.offices[office].missionId = mission.id;
            officeMissions.set(office, mission);
        }
    }
    if (!initializedCreeps) {
        initializedCreeps = true;
        // register creeps
        for (let creep in Game.creeps) {
            const mission = missionById(Game.creeps[creep].memory.missionId.split('|')[0]);
            mission === null || mission === void 0 ? void 0 : mission.register(Game.creeps[creep]);
        }
    }
}

function runMissions() {
    var _a;
    initializeOfficeMissions();
    // debugCPU('Initializing missions');
    for (const mission of allMissions()) {
        try {
            mission.execute();
        }
        catch (e) {
            console.log(`Error in mission ${mission.constructor.name} in room ${mission.missionData.office}: ${e}`);
        }
        // debugCPU(mission.constructor.name + ' ' + mission.missionData.office);
    }
    (_a = Memory.missionReports) !== null && _a !== void 0 ? _a : (Memory.missionReports = []);
    Memory.missionReports = Memory.missionReports.filter(r => r.finished > Game.time - MISSION_HISTORY_LIMIT);
}
function spawnMissions() {
    var _a;
    var _b;
    const orders = {};
    const officesToSpawn = Object.keys(Memory.offices).filter(o => getSpawns(o).some(s => s && !s.spawning));
    for (const mission of allMissions()) {
        try {
            (_a = orders[_b = mission.missionData.office]) !== null && _a !== void 0 ? _a : (orders[_b] = {
                orders: [],
                energyAllocated: 0,
                cpuAllocated: 0
            });
            if (officesToSpawn.includes(mission.missionData.office)) {
                for (const order of mission.spawn()) {
                    orders[order.office].orders.push(order);
                }
            }
            orders[mission.missionData.office].cpuAllocated += mission.cpuRemaining();
            orders[mission.missionData.office].energyAllocated += mission.energyRemaining();
        }
        catch (e) {
            console.log(`Error spawning for mission ${mission.constructor.name} in room ${mission.missionData.office}: ${e}`);
        }
    }
    return orders;
}

function runMissionControl() {
    const before = Game.cpu.getUsed();
    updateMissionEnergyAvailable();
    registerCreeps();
    executeMissions();
    recordMissionCpu(Math.max(0, Game.cpu.getUsed() - before));
    debugCPU('executeMissions');
    allocateMissions();
    debugCPU('allocateMissions');
    vacateSpawns();
}
function executeMissions() {
    runMissions();
}
const spawnRequests = new Map();
function allocateMissions() {
    var _a, _b, _c, _d, _e;
    const orders = spawnMissions();
    // Calculate already-allocated resources
    for (const office in Memory.offices) {
        // Should have no more STARTING missions than active spawns
        let availableSpawns = getSpawns(office).filter(s => !s.spawning).length;
        if (!availableSpawns)
            continue;
        const requests = (_b = (_a = orders[office]) === null || _a === void 0 ? void 0 : _a.orders) !== null && _b !== void 0 ? _b : [];
        const remaining = {
            cpu: missionCpuAvailable() - ((_d = (_c = orders[office]) === null || _c === void 0 ? void 0 : _c.cpuAllocated) !== null && _d !== void 0 ? _d : 0),
            energy: (_e = MissionEnergyAvailable[office]) !== null && _e !== void 0 ? _e : 0
        };
        spawnRequests.set(office, requests);
        const priorities = [...new Set(requests.map(o => o.priority))].sort((a, b) => b - a);
        // loop through priorities, highest to lowest
        priorities: for (const priority of priorities) {
            if (!availableSpawns)
                break;
            const missions = requests.filter(o => o.priority === priority);
            while (missions.length) {
                if (!availableSpawns)
                    break;
                if (remaining.cpu <= 0)
                    break;
                const order = missions.shift();
                if (!order)
                    break;
                // Mission can start
                const result = spawnOrder(office, order, remaining);
                if (result) {
                    if (!result.spawned)
                        break priorities; // valid build, wait for energy
                    availableSpawns -= 1;
                    remaining.cpu -= result.estimate.cpu;
                    remaining.energy -= result.estimate.energy;
                }
            }
        }
    }
}

var AcquireReport = () => {
    var _a, _b;
    const target = findAcquireTarget();
    for (let room in Memory.rooms) {
        if (Memory.rooms[room].eligibleForOffice) {
            Game.map.visual.text('Eligible', new RoomPosition(25, 5, room), { fontSize: 3 });
        }
        if (Memory.rooms[room].owner || Memory.rooms[room].reserver) {
            Game.map.visual.text((_a = Memory.rooms[room].owner) !== null && _a !== void 0 ? _a : Memory.rooms[room].reserver, new RoomPosition(25, 8, room), {
                fontSize: 3
            });
        }
        if ((_b = Memory.roomPlans[room]) === null || _b === void 0 ? void 0 : _b.office) {
            Game.map.visual.text('Planned', new RoomPosition(25, 14, room), { fontSize: 3 });
        }
        Game.map.visual.text('Min distance: ' +
            Math.min(...Object.keys(Memory.offices)
                .filter(office => office !== room)
                .map(office => Game.map.getRoomLinearDistance(office, room))), new RoomPosition(25, 17, room), { fontSize: 3 });
        if (acquireTargetIsValid(room)) {
            Game.map.visual.text('Valid Target', new RoomPosition(25, 20, room), { fontSize: 3 });
        }
    }
    if (!target)
        return;
    Game.map.visual.rect(new RoomPosition(1, 1, target), 48, 48, {
        fill: '#00ff00',
        stroke: 'transparent',
        opacity: 0.5
    });
    Game.map.visual.text('Threat level: ' + roomThreatLevel(target).toFixed(0), new RoomPosition(5, 5, target), {
        fontSize: 4,
        align: 'left'
    });
    for (let room in Memory.offices) {
        if (officeShouldClaimAcquireTarget(room)) {
            Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {
                color: '#00ff00',
                width: 1,
                lineStyle: 'solid',
                opacity: 0.5
            });
        }
        else if (officeShouldSupportAcquireTarget(room)) {
            Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {
                color: '#00ff00',
                width: 1,
                lineStyle: 'dashed',
                opacity: 0.5
            });
        }
    }
};

var FacilitiesReport = () => {
    for (let room in Memory.offices) {
        const queue = new EngineerQueue(room);
        const visited = new Map();
        const structureTypes = [];
        const workToDo = queue
            .allWorkQueue()
            .slice()
            .sort((a, b) => (a.structureType === STRUCTURE_RAMPART ? -1 : 0) - (b.structureType === STRUCTURE_RAMPART ? -1 : 0));
        workToDo.forEach(s => {
            var _a, _b, _c;
            if (visited.get(s))
                console.log('Duplicate planned structure', s.pos);
            visited.set(s, true);
            if (!structureTypes.includes(s.structureType))
                structureTypes.push(s.structureType);
            if (!s.structure) {
                s.visualize();
            }
            else {
                viz(s.pos.roomName).rect(s.pos.x - 1, s.pos.y - 1, 2, 2, {
                    stroke: 'yellow',
                    fill: 'transparent',
                    lineStyle: 'dashed'
                });
                const rcl = (_c = (_b = (_a = Game.rooms[s.pos.roomName]) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.level) !== null && _c !== void 0 ? _c : 0;
                const maxHits = BARRIER_TYPES.includes(s.structureType) ? BARRIER_LEVEL[rcl] : s.structure.hitsMax;
                viz(s.pos.roomName).text(`${((100 * s.structure.hits) / maxHits).toFixed(1)}%`, s.pos.x, s.pos.y);
            }
        });
        const analysis = queue.analysis();
        const data = [
            ...structureTypes.map(t => ['', '', t]),
            ['---', '---', '---'],
            [analysis.count, analysis.energyRemaining, '']
        ];
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 40,
                    height: Math.min(48, 1 + data.length * 1.4),
                    widget: main_9({
                        data: main_10({
                            config: { headers: ['Count', 'Cost', 'Types'] },
                            data
                        })
                    })
                }
            ],
            config: { room }
        });
    }
};

var MilestonesReport = () => {
    var _a, _b, _c, _d, _e, _f;
    for (let room in Memory.offices) {
        const rclMilestones = Memory.rooms[room].rclMilestones;
        if (!rclMilestones)
            continue;
        const rclMilestonesTable = [];
        for (let i = 1; i <= 8; i++) {
            rclMilestonesTable.push([
                i,
                (_b = (rclMilestones[i] - ((_a = rclMilestones[i - 1]) !== null && _a !== void 0 ? _a : rclMilestones[1]))) !== null && _b !== void 0 ? _b : '',
                (_c = (rclMilestones[i] - rclMilestones[1])) !== null && _c !== void 0 ? _c : '',
            ]);
        }
        const gclMilestones = Memory.stats.gclMilestones;
        if (!gclMilestones)
            continue;
        const gclMilestonesTable = [];
        for (let i = 1; i <= Object.keys(gclMilestones).length; i++) {
            gclMilestonesTable.push([
                i,
                (_e = (gclMilestones[i] - ((_d = gclMilestones[i - 1]) !== null && _d !== void 0 ? _d : gclMilestones[1]))) !== null && _e !== void 0 ? _e : '',
                (_f = (gclMilestones[i] - gclMilestones[1])) !== null && _f !== void 0 ? _f : '',
            ]);
        }
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 15,
                    height: 21,
                    widget: main_9({ data: main_10({
                            config: { headers: ['Level', 'From Previous', 'From First'], label: 'GCL' },
                            data: gclMilestonesTable
                        }) })
                },
                {
                    pos: { x: 17, y: 1 },
                    width: 15,
                    height: 11,
                    widget: main_9({ data: main_10({
                            config: { headers: ['Level', 'From Previous', 'From First'], label: 'RCL' },
                            data: rclMilestonesTable
                        }) })
                },
            ],
            config: { room }
        });
    }
};

var RoomPlanningReport = (visualizeRoom) => {
    var _a, _b, _c, _d, _e, _f;
    for (let room in Memory.roomPlans) {
        if (visualizeRoom === room) {
            plannedOfficeStructuresByRcl(room, 8)
                .sort((a, b) => (a.structureType === STRUCTURE_RAMPART ? -1 : 0) - (b.structureType === STRUCTURE_RAMPART ? -1 : 0))
                .forEach(s => {
                s.visualize();
            });
            viz(room).connectRoads();
            (_b = (_a = roomPlans(room)) === null || _a === void 0 ? void 0 : _a.fastfiller) === null || _b === void 0 ? void 0 : _b.extensions.forEach((s, i) => {
                viz(room).text(i.toFixed(0), s.pos.x, s.pos.y + 0.2);
            });
            for (const { source } of activeFranchises(room)) {
                Game.map.visual.poly(franchisePath(room, source), { stroke: '#ffffff', fill: 'transparent' });
            }
        }
        const franchise1pos = (_d = (_c = roomPlans(room)) === null || _c === void 0 ? void 0 : _c.franchise1) === null || _d === void 0 ? void 0 : _d.container.pos;
        if (franchise1pos)
            viz(room).text('Franchise1', franchise1pos.x, franchise1pos.y);
        const franchise2pos = (_f = (_e = roomPlans(room)) === null || _e === void 0 ? void 0 : _e.franchise2) === null || _f === void 0 ? void 0 : _f.container.pos;
        if (franchise2pos)
            viz(room).text('Franchise2', franchise2pos.x, franchise2pos.y);
        if (sourceIds(room).length !== 2)
            continue; // skip rooms with only one source
        const fill = Memory.roomPlans[room].office
            ? '#00aa00'
            : Memory.roomPlans[room].headquarters
                ? '#aaaa00'
                : '#333333';
        Game.map.visual.rect(new RoomPosition(1, 1, room), 48, 48, { fill, stroke: 'transparent', opacity: 0.3 });
        [
            'fastfiller',
            'headquarters',
            'franchise1',
            'franchise2',
            'mine',
            'library',
            'labs',
            'extensions',
            'perimeter',
            'backfill'
        ].forEach((plan, index) => {
            if (Memory.roomPlans[room][plan] === undefined)
                return;
            Game.map.visual.text(`${plan}: ${Memory.roomPlans[room][plan] !== null ? '✓' : '✗'}`, new RoomPosition(2, 4 * index + 4, room), { fontSize: 3, align: 'left' });
        });
        Game.map.visual.text((scoreAcquireTarget(room) * 100).toFixed(0), new RoomPosition(35, 25, room), { fontSize: 5 });
    }
};

const missionEnergyAvailable = (office) => {
    // Energy in storage/production - room energy deficit = total energy available for budgeting
    // energyInProduction(office, estimateMissionInterval(office))
    let energy = Math.max(roomEnergyAvailable(office), energyInProduction(office)) -
        (Game.rooms[office].energyCapacityAvailable - Game.rooms[office].energyAvailable);
    return energy;
};

const missionsStatsTable = (room) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const missionStats = {};
    let totalEnergy = 0;
    for (const report of Memory.missionReports.filter(r => r.office === room)) {
        const stats = (_a = missionStats[report.type]) !== null && _a !== void 0 ? _a : {
            cpu: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
            energy: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
            totals: { cpu: 0, energy: 0 },
            count: 0
        };
        missionStats[report.type] = stats;
        stats.cpu.min = Math.min(stats.cpu.min, report.cpuUsed);
        stats.energy.min = Math.min(stats.energy.min, report.energyUsed);
        stats.cpu.max = Math.max(stats.cpu.max, report.cpuUsed);
        stats.energy.max = Math.max(stats.energy.max, report.energyUsed);
        stats.cpu.sum += report.cpuUsed;
        stats.energy.sum += report.energyUsed;
        stats.totals.cpu += report.cpuUsed;
        stats.totals.energy += report.energyUsed;
        stats.count += 1;
        totalEnergy += report.energyUsed;
    }
    for (const reportType in missionStats) {
        const stats = missionStats[reportType];
        stats.cpu.avg = stats.cpu.sum / stats.count;
        stats.energy.avg = stats.energy.sum / stats.count;
    }
    let table = [];
    for (let type in missionStats) {
        table.push([
            type,
            `${(_b = missionStats[type].cpu.min.toFixed(2)) !== null && _b !== void 0 ? _b : '--'}% / ${(_c = missionStats[type].cpu.avg.toFixed(2)) !== null && _c !== void 0 ? _c : '--'}% / ${(_d = missionStats[type].cpu.max.toFixed(2)) !== null && _d !== void 0 ? _d : '--'}%`,
            `${(_e = missionStats[type].energy.min.toFixed(0)) !== null && _e !== void 0 ? _e : '--'} / ${(_f = missionStats[type].energy.avg.toFixed(0)) !== null && _f !== void 0 ? _f : '--'} / ${(_g = missionStats[type].energy.max.toFixed(0)) !== null && _g !== void 0 ? _g : '--'}`,
            `${((((_h = missionStats[type].totals.energy) !== null && _h !== void 0 ? _h : 0) * 100) / totalEnergy).toFixed(2)}%`
        ]);
    }
    table.push(['--', '--', '--', '--']);
    table.push([
        'Available',
        missionCpuAvailable().toFixed(2),
        missionEnergyAvailable(room),
        `${totalEnergy} (${(totalEnergy / MISSION_HISTORY_LIMIT).toFixed(0)}/t)`
    ]);
    return table;
};
var EstimatesReport = () => {
    var _a;
    for (const room in (_a = Memory.offices) !== null && _a !== void 0 ? _a : []) {
        const missionsStats = missionsStatsTable(room);
        const missionsStatsHeight = Math.min(24, missionsStats.length * 1.5);
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: missionsStatsHeight,
                    widget: main_9({
                        data: main_10({
                            config: {
                                headers: [
                                    'Mission',
                                    'Surplus CPU (min/avg/max)',
                                    'Energy Used (min/avg/max)',
                                    'Efficiency',
                                    'Total Energy'
                                ]
                            },
                            data: missionsStats
                        })
                    })
                }
            ],
            config: { room }
        });
    }
};

var FranchiseReport = () => {
    var _a, _b, _c, _d, _e;
    for (const office in Memory.offices) {
        for (const franchise of franchisesByOffice(office)) {
            let sourcePos = posById(franchise.source);
            let storagePos = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.storage.pos;
            let disabled = !franchiseActive(office, franchise.source);
            const { scores } = Memory.offices[office].franchises[franchise.source];
            const { perTick, isValid } = HarvestLedger.get(office, franchise.source);
            if (sourcePos && storagePos) {
                Game.map.visual.line(sourcePos, storagePos, {
                    color: disabled ? '#cccccc' : '#ffff00',
                    lineStyle: disabled ? 'dashed' : 'solid'
                });
                const order = sourceIds(franchise.room).indexOf(franchise.source);
                const startY = Math.min(39 - 10 * order, sourcePos.y);
                Game.map.visual.text(((_d = (_c = getFranchiseDistance(office, franchise.source)) === null || _c === void 0 ? void 0 : _c.toFixed(0)) !== null && _d !== void 0 ? _d : '--') +
                    '🦶 ' +
                    (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) +
                    '⚡', new RoomPosition(Math.max(0, sourcePos.x), startY + 4, sourcePos.roomName), { fontSize: 4 });
                if (!disabled) {
                    // `${assigned}⛏ ${byId(franchise.source)?.energy.toFixed(0) ?? '--'}⚡ ${franchiseEnergyAvailable(
                    //   franchise.source
                    // ).toFixed(0)}📦 ${perTick.toFixed(2)}${isValid ? '' : '?'}`;
                    Game.map.visual.text(`${franchiseEnergyAvailable(franchise.source).toFixed(0)}📦 ${perTick.toFixed(2)}${isValid ? '' : '?'}⚡`, new RoomPosition(Math.max(0, sourcePos.x), startY + 10, sourcePos.roomName), { fontSize: 4 });
                }
            }
            let source = byId(franchise.source);
            if (!source)
                continue;
            const assignedLogistics = activeMissions(office)
                .filter(isMission(LogisticsMission))
                .map(m => { var _a; return (_a = m.assignedLogisticsCapacity().withdrawAssignments.get(source.id)) !== null && _a !== void 0 ? _a : 0; })
                .reduce(sum, 0);
            // console.log(source.pos, assignedLogistics);
            main_3({
                widgets: [
                    {
                        pos: {
                            x: source.pos.x - 5,
                            y: source.pos.y - 2.5
                        },
                        width: 2,
                        height: 5,
                        widget: main_1({
                            data: {
                                value: (_e = source.ticksToRegeneration) !== null && _e !== void 0 ? _e : 0,
                                maxValue: ENERGY_REGEN_TIME
                            },
                            config: {
                                style: {
                                    stroke: 'white',
                                    fill: 'white'
                                }
                            }
                        })
                    },
                    {
                        pos: {
                            x: source.pos.x - 2.5,
                            y: source.pos.y - 2.5
                        },
                        width: 2,
                        height: 5,
                        widget: main_1({
                            data: {
                                value: source.energy,
                                maxValue: source.energyCapacity
                            },
                            config: {
                                style: {
                                    stroke: 'green',
                                    fill: 'green'
                                }
                            }
                        })
                    },
                    {
                        pos: {
                            x: source.pos.x + 0.5,
                            y: source.pos.y - 2.5
                        },
                        width: 2,
                        height: 5,
                        widget: main_1({
                            data: {
                                value: franchiseEnergyAvailable(source.id),
                                maxValue: CONTAINER_CAPACITY
                            },
                            config: {
                                style: {
                                    stroke: 'yellow',
                                    fill: 'yellow'
                                }
                            }
                        })
                    },
                    {
                        pos: {
                            x: source.pos.x + 3,
                            y: source.pos.y - 2.5
                        },
                        width: 2,
                        height: 5,
                        widget: main_1({
                            data: {
                                value: assignedLogistics !== null && assignedLogistics !== void 0 ? assignedLogistics : 0,
                                maxValue: CONTAINER_CAPACITY
                            },
                            config: {
                                style: {
                                    stroke: 'blue',
                                    fill: 'blue'
                                }
                            }
                        })
                    },
                    {
                        pos: {
                            x: source.pos.x - 5.5,
                            y: source.pos.y + 2
                        },
                        width: 7,
                        height: 1,
                        widget: main_6({
                            data: `Value: ${isValid ? '' : '(calculating)'} ${perTick.toFixed(2)}`,
                            config: {
                                style: {
                                    color: 'white'
                                }
                            }
                        })
                    }
                ],
                config: { room: source.pos.roomName }
            });
        }
    }
};

const boostQuotas = (office) => {
    return [
        ...BOOSTS_BY_INTENT.TOUGH,
        ...BOOSTS_BY_INTENT.ATTACK,
        ...BOOSTS_BY_INTENT.MOVE,
        ...BOOSTS_BY_INTENT.HEAL,
        ...BOOSTS_BY_INTENT.HARVEST,
        ...BOOSTS_BY_INTENT.UPGRADE
    ]
        .map(boost => ({
        boost,
        amount: 30 * 50
    }))
        .sort((a, b) => a.boost.length - b.boost.length); // sort T1 boosts to the front of the queue
};

var LabsReport = () => {
    for (let office in Memory.offices) {
        if (Memory.offices[office].lab.orders.length === 0) {
            Game.map.visual.text('offline', new RoomPosition(25, 25, office), { fontSize: 5 });
            continue;
        }
        // queue
        Game.map.visual.rect(new RoomPosition(0, 0, office), 50, 50, { fill: '#000000', opacity: 0.7 });
        Memory.offices[office].lab.orders.slice(0, 6).forEach((order, i) => {
            Game.map.visual.text(order.ingredient1, new RoomPosition(7, 7 * (i + 1), office), {
                fontSize: 7,
                color: RES_COLORS[order.ingredient1]
            });
            Game.map.visual.text(order.ingredient2, new RoomPosition(17, 7 * (i + 1), office), {
                fontSize: 7,
                color: RES_COLORS[order.ingredient2]
            });
            Game.map.visual.text('=>', new RoomPosition(25, 7 * (i + 1), office), { fontSize: 7 });
            Game.map.visual.text(order.output, new RoomPosition(37, 7 * (i + 1), office), {
                fontSize: 7,
                color: RES_COLORS[order.output]
            });
        });
        const { boosts, inputs, outputs } = getLabs(office);
        [...boosts, ...inputs, ...outputs].forEach(({ structure }) => (structure === null || structure === void 0 ? void 0 : structure.mineralType) && viz(office).resource(structure.mineralType, structure.pos.x, structure.pos.y));
        // Labs
        // detail view
        main_3({
            config: { room: office },
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 25,
                    height: 10,
                    widget: main_9({
                        data: main_10({
                            config: {
                                headers: ['Ingredient1', 'Ingredient2', 'Output', 'Amount']
                            },
                            data: Memory.offices[office].lab.orders.map(order => [
                                order.ingredient1,
                                order.ingredient2,
                                order.output,
                                order.amount
                            ])
                        })
                    })
                },
                {
                    pos: { x: 1, y: 12 },
                    width: 25,
                    height: 10,
                    widget: main_9({
                        data: main_10({
                            config: {
                                headers: ['Creep', 'Boosts']
                            },
                            data: Memory.offices[office].lab.boosts.map(order => [
                                order.name,
                                order.boosts.map(b => `${b.type}x${b.count}`).join(', ')
                            ])
                        })
                    })
                }
            ]
        });
        // quotas
        main_3({
            config: { room: office },
            widgets: [
                {
                    pos: { x: 27, y: 1 },
                    width: 21,
                    height: 47,
                    widget: main_9({
                        data: main_5({
                            config: {
                                columns: 6,
                                rows: 7
                            },
                            data: boostQuotas().map(({ boost, amount }) => main_1({
                                data: { maxValue: amount, value: boostsAvailable(office, boost, true, true) },
                                config: { label: boost, style: { fill: RES_COLORS[boost], stroke: RES_COLORS[boost] } }
                            }))
                        })
                    })
                }
            ]
        });
    }
};

var MarketReport = (opts = {}) => {
    const orders = Game.market.getAllOrders(opts.filter);
    const buyOrders = [];
    const sellOrders = [];
    for (let o of orders) {
        if (o.type === ORDER_BUY && buyOrders.length < 45) {
            buyOrders.push(o);
        }
        else if (o.type === ORDER_SELL && sellOrders.length < 45) {
            sellOrders.push(o);
        }
        if (buyOrders.length >= 45 && sellOrders.length >= 45)
            break;
    }
    const sortOrders = (a, b) => {
        if (a.resourceType > b.resourceType) {
            return 1;
        }
        else if (a.resourceType < b.resourceType) {
            return -1;
        }
        else {
            if (a.type > b.type) {
                return 1;
            }
            else if (a.type < b.type) {
                return -1;
            }
            else {
                if (a.type === ORDER_BUY) {
                    return b.price - a.price;
                }
                else {
                    return a.price - b.price;
                }
            }
        }
    };
    buyOrders.sort(sortOrders);
    sellOrders.sort(sortOrders);
    main_3({
        widgets: [
            {
                pos: { x: 1, y: 1 },
                width: 23,
                height: 2,
                widget: main_9({ data: main_6({ data: 'Buy Orders' }) })
            },
            {
                pos: { x: 25, y: 1 },
                width: 23,
                height: 2,
                widget: main_9({ data: main_6({ data: 'Sell Orders' }) })
            },
            {
                pos: { x: 1, y: 3 },
                width: 23,
                height: 45,
                widget: main_9({
                    data: main_10({
                        data: buyOrders.map(o => {
                            var _a;
                            return [
                                o.resourceType,
                                (_a = o.roomName) !== null && _a !== void 0 ? _a : '--',
                                o.remainingAmount + ' / ' + o.amount,
                                o.price.toLocaleString('en-US')
                            ];
                        }),
                        config: {
                            headers: ['Order', 'Room', 'Amount', 'Price']
                        }
                    })
                })
            },
            {
                pos: { x: 25, y: 3 },
                width: 23,
                height: 45,
                widget: main_9({
                    data: main_10({
                        data: sellOrders.map(o => {
                            var _a;
                            return [
                                o.resourceType,
                                (_a = o.roomName) !== null && _a !== void 0 ? _a : '--',
                                o.remainingAmount + ' / ' + o.amount,
                                o.price.toLocaleString('en-US')
                            ];
                        }),
                        config: {
                            headers: ['Order', 'Room', 'Amount', 'Price']
                        }
                    })
                })
            }
        ]
    });
};

const buildMissionsTable = (room, missions) => {
    var _a;
    let estimatedCPU = 0;
    let estimatedEnergy = 0;
    let actualCPU = 0;
    let actualEnergy = 0;
    let cpuDelta = 0;
    let creepCount = 0;
    let missionsList = new Map();
    for (let mission of missions) {
        const key = `${mission.id}`;
        const entry = (_a = missionsList.get(key)) !== null && _a !== void 0 ? _a : {
            count: 0,
            priority: mission.priority,
            status: mission.status,
            type: mission.toString(),
            actual: {
                cpu: 0,
                energy: 0,
                cpuPerCreep: 0
            },
            estimate: {
                cpu: 0,
                energy: 0,
                cpuPerCreep: 0
            }
        };
        entry.count += mission.creepCount();
        entry.actual.cpu += mission.cpuUsed();
        entry.actual.energy += mission.energyUsed();
        entry.actual.cpuPerCreep = mission.actualCpuPerCreep();
        entry.estimate.cpu += mission.cpuRemaining();
        entry.estimate.energy += mission.energyRemaining();
        entry.estimate.cpuPerCreep = mission.estimatedCpuPerCreep();
        missionsList.set(key, entry);
    }
    let table = [];
    const sortedMissionsList = [...missionsList.values()].sort((a, b) => b.priority - a.priority);
    for (let o of sortedMissionsList) {
        if (table.length < 19)
            table.push([
                `${o.type} (${o.count})`,
                o.priority.toFixed(2),
                o.status,
                `${o.estimate.cpu.toFixed(2)}`,
                `${o.estimate.energy.toFixed(0)}`,
                `${((o.actual.cpuPerCreep - o.estimate.cpuPerCreep) * o.count).toFixed(2)} (${(o.actual.cpuPerCreep - o.estimate.cpuPerCreep).toFixed(2)})`
            ]);
        estimatedCPU += o.estimate.cpu;
        estimatedEnergy += o.estimate.energy;
        actualCPU += Math.min(o.estimate.cpu, o.actual.cpu);
        actualEnergy += Math.min(o.estimate.energy, o.actual.energy);
        cpuDelta = o.actual.cpuPerCreep - o.estimate.cpuPerCreep;
        creepCount += o.count;
        // if (cpuDelta * o.count > 1) console.log(o.type, cpuDelta.toFixed(2), o.count, (cpuDelta * o.count).toFixed(2));
    }
    table.push(['---', '---', '---', '---', '---', '---']);
    table.push(['Remaining', '', '', `${estimatedCPU.toFixed(2)}`, `${estimatedEnergy}`, '']);
    table.push(['Available', '', Game.time, missionCpuAvailable().toFixed(2), missionEnergyAvailable(room), '']);
    table.push(['Accuracy', '', '', '', '', cpuDelta.toFixed(2)]);
    // console.log(room, cpuDelta, cpuDelta * creepCount);
    return table;
};
var MissionsReport = () => {
    var _a;
    for (const room in (_a = Memory.offices) !== null && _a !== void 0 ? _a : []) {
        const active = buildMissionsTable(room, activeMissions(room));
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: Math.min(24, active.length * 1.5),
                    widget: main_9({
                        data: main_10({
                            config: { headers: ['Mission', 'Priority', 'Status', 'CPU', 'Energy', 'Actual/Est'] },
                            data: active
                        })
                    })
                }
            ],
            config: { room }
        });
    }
};

// Show current priority: building, repairing, filling storage, upgrading, acquiring
// Show secondary activities: mining, labs/boosting
// Summarize economy state: franchise income, total budgets
// Show RCL meter
// Show this on the world map
var OfficeReport = () => {
    for (let office in Memory.offices) {
        Game.map.visual.text(rcl(office).toString(), new RoomPosition(25, 25, office));
        const meterProgress = Game.rooms[office].controller.progress / Game.rooms[office].controller.progressTotal;
        `${(meterProgress * 100).toFixed(0)}%`;
        for (const mission of activeMissions(office)) {
        }
        continue;
    }
};

var PowerReport = () => {
    var _a, _b, _c, _d;
    const minPowerPrice = buyMarketPrice(RESOURCE_POWER);
    const minEnergyPrice = buyMarketPrice(RESOURCE_ENERGY);
    const powerEnergyPrice = minPowerPrice / minEnergyPrice;
    for (const office in Memory.offices) {
        const data = Memory.offices[office].powerbanks
            .filter(r => r.distance && r.distance < 550)
            .map(report => {
            var _a, _b, _c, _d, _e, _f;
            const bankPos = unpackPos(report.pos);
            Game.map.visual.rect(new RoomPosition(0, 0, bankPos.roomName), 50, 50, {
                stroke: '#ff0000',
                strokeWidth: 4,
                fill: 'transparent'
            });
            Game.map.visual.text(report.amount.toFixed(0) + '✹', new RoomPosition(5, 10, bankPos.roomName), {
                fontSize: 10,
                align: 'left'
            });
            Game.map.visual.text((report.expires - Game.time).toFixed(0) + '⏰', new RoomPosition(5, 20, bankPos.roomName), { fontSize: 10, align: 'left' });
            Game.map.visual.text(((report.hits / POWER_BANK_HITS) * 100).toFixed(2) + '%', new RoomPosition(5, 30, bankPos.roomName), { fontSize: 10, align: 'left' });
            // time to crack
            if (Game.rooms[bankPos.roomName]) {
                const totalAttack = totalCreepPower(bankPos.findInRange(FIND_CREEPS, 1)).attack;
                const timeToCrack = report.hits / totalAttack;
                viz(bankPos.roomName).text(`${Math.ceil(timeToCrack).toFixed(0)} ✹`, new RoomPosition(bankPos.x, bankPos.y - 1, bankPos.roomName));
            }
            return [
                `${bankPos}`,
                report.amount,
                report.expires - Game.time,
                `${((100 * ((_a = report.hits) !== null && _a !== void 0 ? _a : POWER_BANK_HITS)) / POWER_BANK_HITS).toFixed(2)}%`,
                (_b = report.distance) !== null && _b !== void 0 ? _b : '--',
                `${(_c = report.duoCount) !== null && _c !== void 0 ? _c : '--'}/${(_d = report.duoSpeed) !== null && _d !== void 0 ? _d : '--'}`,
                ((_f = (_e = report.powerCost) === null || _e === void 0 ? void 0 : _e.toFixed(2)) !== null && _f !== void 0 ? _f : '--') + (report.powerCost && report.powerCost < powerEnergyPrice ? ' ✓' : '')
            ];
        });
        data.sort((a, b) => (a[4] === b[4] ? 0 : a[4] < b[4] ? -1 : 1));
        data.push(['--', '--', '--', '--', '--', '--', '--']);
        data.push([
            '--',
            'Energy (cr)',
            minEnergyPrice.toFixed(2),
            'Power (cr)',
            minPowerPrice.toFixed(2),
            'Power (energy)',
            (minPowerPrice / minEnergyPrice).toFixed()
        ]);
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: 2 + Math.min(48, data.length * 1.5),
                    widget: main_9({
                        data: main_10({
                            config: {
                                headers: ['Power Bank', 'Amount', 'Expires', 'Hits', 'Distance', 'Duo Count/Speed', 'Power (energy)']
                            },
                            data
                        })
                    })
                }
            ],
            config: { room: office }
        });
        // powerbank missions
        const missionData = [];
        for (const mission of allMissions()) {
            if (mission instanceof PowerBankMission) {
                const bankPos = unpackPos(mission.missionData.powerBankPos);
                Game.map.visual.line(new RoomPosition(25, 25, office), bankPos, { color: '#ff0000', width: 2 });
                const ticksToDecay = ((_b = (_a = mission.report()) === null || _a === void 0 ? void 0 : _a.expires) !== null && _b !== void 0 ? _b : Game.time) - Game.time;
                missionData.push([
                    `${bankPos}`,
                    mission.missions.duos.resolved.length,
                    `${((_d = (_c = mission.report()) === null || _c === void 0 ? void 0 : _c.hits) !== null && _d !== void 0 ? _d : 0) -
                        mission.missions.duos.resolved.map(d => d.actualDamageRemaining()).reduce(sum, 0)}`,
                    '' + ticksToDecay + ' ' + (mission.willBreachIn(ticksToDecay) ? 'Yes' : 'No'),
                    mission.creeps.haulers.resolved.length
                ]);
            }
        }
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 4 + Math.min(48, data.length * 1.5) },
                    width: 47,
                    height: 2 + Math.min(48, missionData.length * 1.5),
                    widget: main_9({
                        data: main_10({
                            config: {
                                headers: ['Power Bank', 'Duos', 'Damage Remaining', 'Breaching?', 'Haulers']
                            },
                            data: missionData
                        })
                    })
                }
            ],
            config: { room: office }
        });
    }
};

var RemotesReport = () => {
    visualizeHarassmentZones();
    for (const office in Memory.offices) {
        let actualLogisticsCapacity = 0;
        const activeMissionsBySource = activeMissions(office).reduce((obj, mission) => {
            if (isMission(LogisticsMission)(mission) && isStatus(MissionStatus.RUNNING)(mission))
                actualLogisticsCapacity += mission.capacity();
            if (!(mission instanceof HarvestMission))
                return obj;
            obj[mission.missionData.source] = mission;
            return obj;
        }, {});
        const totals = {
            harvested: 0,
            hauling: 0,
            value: 0,
            capacity: 0
        };
        const data = franchisesByOffice(office).map(franchise => {
            var _a, _b, _c, _d, _e, _f, _g;
            let sourcePos = posById(franchise.source);
            const mission = activeMissionsBySource[franchise.source];
            let assigned = (_a = mission === null || mission === void 0 ? void 0 : mission.creeps.harvesters.resolved.length) !== null && _a !== void 0 ? _a : 0;
            let estimatedCapacity = (_b = mission === null || mission === void 0 ? void 0 : mission.haulingCapacityNeeded()) !== null && _b !== void 0 ? _b : 0;
            let disabled = !mission || (mission === null || mission === void 0 ? void 0 : mission.disabled());
            Game.map.visual.text(franchiseEnergyAvailable(franchise.source).toFixed(0) + (disabled ? ' N' : ' Y'), sourcePos, { fontSize: 5 });
            const { perTick, isValid } = HarvestLedger.get(office, franchise.source);
            const { scores, lastActive } = (_c = Memory.offices[office].franchises[franchise.source]) !== null && _c !== void 0 ? _c : {};
            const perTickAverage = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            const assignedLogistics = activeMissions(office)
                .filter(isMission(LogisticsMission))
                .map(m => { var _a; return (_a = m.assignedLogisticsCapacity().withdrawAssignments.get(franchise.source)) !== null && _a !== void 0 ? _a : 0; })
                .reduce(sum, 0);
            const harvested = franchiseEnergyAvailable(franchise.source);
            const hauling = assignedLogistics;
            totals.harvested += harvested;
            totals.hauling += hauling;
            totals.value += perTick;
            totals.capacity += estimatedCapacity;
            return [
                `${sourcePos}${disabled ? '' : ' ✓'}`,
                (_d = mission === null || mission === void 0 ? void 0 : mission.missionData.distance) !== null && _d !== void 0 ? _d : Infinity,
                assigned.toFixed(0),
                lastActive ? (lastActive - Game.time).toFixed(0) : '--',
                estimatedCapacity.toFixed(0),
                (_f = (_e = byId(franchise.source)) === null || _e === void 0 ? void 0 : _e.energy.toFixed(0)) !== null && _f !== void 0 ? _f : '--',
                harvested.toFixed(0),
                hauling.toFixed(0),
                `${perTick.toFixed(2)}${isValid ? '' : '?'} (${perTickAverage.toFixed(2)}/${(_g = scores === null || scores === void 0 ? void 0 : scores.length) !== null && _g !== void 0 ? _g : '?'})`
            ];
        });
        data.sort((a, b) => a[1] - b[1]);
        data.push(['--', '--', '--', '--', '--', '--', '--', '--', '--']);
        data.push([
            '',
            '',
            '',
            '',
            `${totals.capacity.toFixed(0)}/${actualLogisticsCapacity.toFixed(0)}`,
            '',
            totals.harvested.toFixed(0),
            totals.hauling.toFixed(0),
            totals.value.toFixed(0)
        ]);
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: 2 + Math.min(48, data.length * 1.5),
                    widget: main_9({
                        data: main_10({
                            config: {
                                headers: [
                                    'Franchise',
                                    'Distance',
                                    'Assigned',
                                    'Active',
                                    'Capacity',
                                    'Energy',
                                    'Harvested',
                                    'Hauling',
                                    'Value'
                                ]
                            },
                            data
                        })
                    })
                }
            ],
            config: { room: office }
        });
    }
};

var SpawnReport = () => {
    var _a, _b, _c;
    for (const room in (_a = Memory.offices) !== null && _a !== void 0 ? _a : []) {
        let table = [];
        const data = ((_b = spawnRequests.get(room)) !== null && _b !== void 0 ? _b : []).sort((a, b) => b.priority - a.priority);
        const energy = missionEnergyAvailable(room) -
            activeMissions(room)
                .map(m => m.energyRemaining())
                .reduce(sum, 0);
        for (let s of data) {
            const mission = (_c = missionById(s.memory.missionId.split('|')[0])) === null || _c === void 0 ? void 0 : _c.constructor.name;
            table.push([
                mission,
                s.name,
                s.memory.role,
                s.priority,
                s.budget,
                s.builds.length,
                s.builds
                    .map(build => (energy - s.estimate(build).energy - getBudgetAdjustment(s.office, s.budget)).toFixed(0))
                    .join('/')
            ]);
        }
        main_3({
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 48,
                    height: 2 + Math.min(48, table.length * 1.5),
                    widget: main_9({
                        data: main_10({
                            config: { headers: ['Mission', 'Minion', 'Role', 'Priority', 'Budget', 'Builds', 'Energy'] },
                            data: table
                        })
                    })
                }
            ],
            config: { room }
        });
    }
};

function officeResourceSurplus(office) {
    var _a, _b, _c;
    const totals = new Map();
    const plan = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters;
    for (let [resource, amount] of Object.entries(Memory.offices[office].resourceQuotas)) {
        if (resource === undefined || amount === undefined)
            continue;
        totals.set(resource, -amount + ((_c = (_b = plan === null || plan === void 0 ? void 0 : plan.terminal.structure) === null || _b === void 0 ? void 0 : _b.store.getUsedCapacity(resource)) !== null && _c !== void 0 ? _c : 0));
    }
    return totals;
}

var TerminalsReport = () => {
    for (let office in Memory.offices) {
        const surpluses = officeResourceSurplus(office);
        let rows = 0;
        for (let [resource, amount] of surpluses) {
            const length = (25 * (amount / 5000));
            let color = (amount >= 0) ? '#00ff00' : '#ff0000';
            Game.map.visual.rect(new RoomPosition(25, rows * 5, office), Math.min(25, length), 5, { stroke: color, fill: color });
            Game.map.visual.text(resource, new RoomPosition(25, rows * 5 + 2, office), { fontSize: 4 });
            rows += 1;
            if (rows >= 10)
                break;
        }
    }
};

const colors = {
    [ThreatLevel.FRIENDLY]: '#00ff00',
    [ThreatLevel.OWNED]: '#ff0000',
    [ThreatLevel.REMOTE]: '#0000ff',
    [ThreatLevel.UNOWNED]: '#ffff00',
    [ThreatLevel.NONE]: '#333333',
    [ThreatLevel.UNKNOWN]: '#333333',
    [ThreatLevel.MIDNIGHT]: '#000000'
};
var TerritoriesReport = () => {
    var _a;
    for (let room in Memory.rooms) {
        const [threatLevel, hostileScore] = (_a = Memory.rooms[room].threatLevel) !== null && _a !== void 0 ? _a : [ThreatLevel.UNKNOWN, 0];
        Game.map.visual.rect(new RoomPosition(5, 5, room), 43, 43, {
            fill: 'transparent',
            stroke: colors[threatLevel],
            strokeWidth: 5,
            opacity: 0.5
        });
        Game.map.visual.text(threatLevel, new RoomPosition(25, 45, room), { fontSize: 5 });
        Game.map.visual.text(hostileScore.toFixed(0), new RoomPosition(25, 25, room), { fontSize: 10 });
    }
    for (let office in Memory.offices) {
        const territories = getTerritoriesByOffice(office);
        const allTerritories = calculateNearbyRooms(office, TERRITORY_RADIUS, false).filter(t => { var _a; return !isSourceKeeperRoom(t) && ((_a = Memory.rooms[t]) === null || _a === void 0 ? void 0 : _a.office) === office && !Memory.offices[t]; });
        territories.forEach(territory => {
            Game.map.visual.line(new RoomPosition(25, 25, office), new RoomPosition(25, 25, territory), {
                color: '#ffffff',
                width: 3
            });
        });
        // Patrol route
        // getPatrolRoute(office).forEach((room, index) => {
        //     Game.map.visual.text(index.toFixed(0), new RoomPosition(25, 25, room), { fontSize: 3 })
        // })
        main_3({
            config: { room: office },
            widgets: [
                {
                    pos: { x: 1, y: 1 },
                    width: 47,
                    height: 47,
                    widget: main_9({
                        data: main_10({
                            data: allTerritories.map(t => {
                                const sources = sourceIds(t);
                                if (!sources)
                                    return [t, '--'];
                                return [t + (territories.includes(t) ? ' ✓' : ''), sources.length];
                            }),
                            config: {
                                headers: ['Territory', 'Sources']
                            }
                        })
                    })
                }
            ]
        });
    }
};

const allReports = {};
let activeReport = '';
let reportOpts = undefined;
const register = (key, runner) => {
    allReports[key] = runner;
};
const run = profiler.registerFN(() => {
    var _a;
    // const start = Game.cpu.getUsed();
    (_a = allReports[activeReport]) === null || _a === void 0 ? void 0 : _a.call(allReports, reportOpts);
    // console.log('Ran report', activeReport, 'with', Game.cpu.getUsed() - start, 'cpu')
}, 'runReports');
global.d = (key, opts) => {
    activeReport = key;
    reportOpts = opts;
    if (!(key in allReports)) {
        console.log('Reports: ', Object.keys(allReports));
    }
};
register('planning', RoomPlanningReport);
register('facilities', FacilitiesReport);
register('acquire', AcquireReport);
register('milestones', MilestonesReport);
register('territories', TerritoriesReport);
register('terminals', TerminalsReport);
register('labs', LabsReport);
register('market', MarketReport);
register('office', OfficeReport);
register('missions', MissionsReport);
register('spawns', SpawnReport);
register('franchise', FranchiseReport);
register('estimates', EstimatesReport);
register('remotes', RemotesReport);
register('power', PowerReport);
global.d('spawns');

function flowfields(room, pointsOfInterest, obstacles) {
    const flowfields = {};
    for (const poi in pointsOfInterest) {
        flowfields[poi] = dijkstraMap(room, pointsOfInterest[poi].map(p => new RoomPosition(p.x, p.y, room)), obstacles);
    }
    return flowfields;
}
const dijkstraMap = memoize((room, source, obstacles, useTerrainCost = true) => `${room}_${source}_${useTerrainCost}`, (room, source, obstacles = new PathFinder.CostMatrix(), useTerrainCost = true) => {
    const frontier = source.slice();
    const terrain = Game.map.getRoomTerrain(room);
    const cm = new PathFinder.CostMatrix();
    while (frontier.length) {
        const current = frontier.shift();
        for (const next of calculateNearbyPositions(current, 1)) {
            if (terrain.get(next.x, next.y) === TERRAIN_MASK_WALL ||
                obstacles.get(next.x, next.y) === 255 ||
                source.some(s => s.isEqualTo(next)))
                continue;
            const nextCost = cm.get(current.x, current.y) + (useTerrainCost ? terrainCostAt(next) : 1);
            if (cm.get(next.x, next.y) === 0 || cm.get(next.x, next.y) > nextCost) {
                frontier.push(next);
                cm.set(next.x, next.y, nextCost);
            }
        }
    }
    return cm;
});

/**
 * To fit rectangular stamps
 */
function distanceTransform(room, visualize = false, initialCM = getCostMatrix(room, false, { roomPlan: true, ignoreStructures: true, terrain: true }), rect = {
    x1: 0,
    y1: 0,
    x2: 49,
    y2: 49
}) {
    // Use a costMatrix to record distances
    const distanceCM = new PathFinder.CostMatrix();
    for (let x = Math.max(rect.x1 - 1, 0); x <= Math.min(rect.x2 + 1, 49); x += 1) {
        for (let y = Math.max(rect.y1 - 1, 0); y <= Math.min(rect.y2 + 1, 49); y += 1) {
            distanceCM.set(x, y, initialCM.get(x, y) === 255 ? 0 : 255);
        }
    }
    // Loop through the xs and ys inside the bounds
    for (let x = rect.x1; x <= rect.x2; x += 1) {
        for (let y = rect.y1; y <= rect.y2; y += 1) {
            distanceCM.set(x, y, Math.min(Math.min(distanceCM.get(x, y - 1), distanceCM.get(x - 1, y), distanceCM.get(x - 1, y - 1), distanceCM.get(x + 1, y - 1), distanceCM.get(x - 1, y + 1)) + 1, distanceCM.get(x, y)));
        }
    }
    // Loop through the xs and ys inside the bounds
    for (let x = rect.x2; x >= rect.x1; x -= 1) {
        for (let y = rect.y2; y >= rect.y1; y -= 1) {
            distanceCM.set(x, y, Math.min(Math.min(distanceCM.get(x, y + 1), distanceCM.get(x + 1, y), distanceCM.get(x + 1, y + 1), distanceCM.get(x + 1, y - 1), distanceCM.get(x - 1, y + 1)) + 1, distanceCM.get(x, y)));
        }
    }
    if (visualize) {
        // Loop through the xs and ys inside the bounds
        for (let x = rect.x1; x <= rect.x2; x += 1) {
            for (let y = rect.y1; y <= rect.y2; y += 1) {
                viz(room).rect(x - 0.5, y - 0.5, 1, 1, {
                    fill: `hsl(${200}${distanceCM.get(x, y) * 10}, 100%, 60%)`,
                    opacity: 0.4
                });
            }
        }
    }
    return distanceCM;
}
/**
 * To fit diamond stamps
 */
function diamondDistanceTransform(room, visualize = false, initialCM = getCostMatrix(room, false, { roomPlan: true, ignoreStructures: true, terrain: true }), rect = {
    x1: 0,
    y1: 0,
    x2: 49,
    y2: 49
}) {
    // Use a costMatrix to record distances
    const distanceCM = new PathFinder.CostMatrix();
    for (let x = rect.x1; x <= rect.x2; x += 1) {
        for (let y = rect.y1; y <= rect.y2; y += 1) {
            distanceCM.set(x, y, initialCM.get(x, y) === 255 ? 0 : 255);
        }
    }
    // Loop through the xs and ys inside the bounds
    for (let x = rect.x1; x <= rect.x2; x += 1) {
        for (let y = rect.y1; y <= rect.y2; y += 1) {
            distanceCM.set(x, y, Math.min(Math.min(distanceCM.get(x, y - 1), distanceCM.get(x - 1, y)) + 1, distanceCM.get(x, y)));
        }
    }
    // Loop through the xs and ys inside the bounds
    for (let x = rect.x2; x >= rect.x1; x -= 1) {
        for (let y = rect.y2; y >= rect.y1; y -= 1) {
            distanceCM.set(x, y, Math.min(Math.min(distanceCM.get(x, y + 1), distanceCM.get(x + 1, y)) + 1, distanceCM.get(x, y)));
        }
    }
    if (visualize) {
        // Loop through the xs and ys inside the bounds
        for (let x = rect.x1; x <= rect.x2; x += 1) {
            for (let y = rect.y1; y <= rect.y2; y += 1) {
                viz(room).rect(x - 0.5, y - 0.5, 1, 1, {
                    fill: `hsl(${200}${distanceCM.get(x, y) * 10}, 100%, 60%)`,
                    opacity: 0.4
                });
            }
        }
    }
    return distanceCM;
}

function fitStamp(room, stamp, costMatrix, diamond = false) {
    var _a;
    // pin stamp if initial spawn
    if (stamp.some(s => s.includes(STRUCTURE_SPAWN))) {
        const initialSpawn = (_a = Game.rooms[room]) === null || _a === void 0 ? void 0 : _a.find(FIND_MY_SPAWNS)[0];
        if (initialSpawn) {
            for (let y = 0; y < stamp.length; y++) {
                for (let x = 0; x < stamp[y].length; x++) {
                    if (stamp[y][x] === STRUCTURE_SPAWN) {
                        return [{ x: initialSpawn.pos.x - x, y: initialSpawn.pos.y - y }];
                    }
                }
            }
        }
    }
    const minMargin = 3; // do not put stamps closer than 3 squares to the edge of the room
    const dt = (diamond ? diamondDistanceTransform : distanceTransform)(room, false, costMatrix);
    const squares = [];
    const offset = Math.floor(stamp.length / 2);
    forEverySquareInRoom((x, y) => {
        const topLeft = { x: x - offset, y: y - offset };
        const bottomRight = { x: x + offset, y: y + offset };
        if (topLeft.x <= minMargin ||
            topLeft.y <= minMargin ||
            bottomRight.x + minMargin >= 50 ||
            bottomRight.y + minMargin >= 50)
            return;
        if (x > offset && y > offset && x + offset < 50 && y + offset < 50 && dt.get(x, y) > offset) {
            squares.push({ x: x - offset, y: y - offset });
        }
    });
    return squares;
}
function applyStamp(stamp, topLeft, costMatrix) {
    const cm = costMatrix.clone();
    stamp.forEach((row, y) => {
        row.forEach((cell, x) => {
            cm.set(topLeft.x + x, topLeft.y + y, Math.max(cell === undefined || cell === STRUCTURE_ROAD ? 0 : 255, cm.get(topLeft.x + x, topLeft.y + y)));
        });
    });
    return cm;
}

// prettier-ignore
const EXTENSION_STAMP = [
    [undefined, undefined, STRUCTURE_ROAD, undefined, undefined],
    [undefined, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, undefined],
    [STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
    [undefined, STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_ROAD, undefined],
    [undefined, undefined, STRUCTURE_ROAD, undefined, undefined],
];
// prettier-ignore
const HQ_STAMP = [
    [undefined, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, undefined],
    [STRUCTURE_ROAD, STRUCTURE_STORAGE, STRUCTURE_NUKER, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
    [undefined, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_LINK, STRUCTURE_ROAD],
    [STRUCTURE_ROAD, STRUCTURE_TERMINAL, STRUCTURE_FACTORY, STRUCTURE_POWER_SPAWN, STRUCTURE_ROAD],
    [undefined, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, undefined],
];
// prettier-ignore
const LABS_STAMP = [
    [undefined, undefined, STRUCTURE_ROAD, STRUCTURE_ROAD, undefined, undefined],
    [undefined, STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD, undefined],
    [STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD],
    [STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_ROAD],
    [undefined, STRUCTURE_ROAD, STRUCTURE_LAB, STRUCTURE_LAB, STRUCTURE_ROAD, undefined],
    [undefined, undefined, STRUCTURE_ROAD, STRUCTURE_ROAD, undefined, undefined],
];
const LABS_STAMP_ORDER = [
    [2, 3],
    [3, 2],
    [3, 4],
    [2, 4],
    [4, 3],
    [4, 2],
    [1, 2],
    [1, 3],
    [2, 1],
    [3, 1]
];
// prettier-ignore
const FASTFILLER_STAMP = [
    [undefined, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, undefined],
    [STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
    [STRUCTURE_ROAD, STRUCTURE_SPAWN, undefined, STRUCTURE_EXTENSION, undefined, STRUCTURE_SPAWN, STRUCTURE_ROAD],
    [STRUCTURE_ROAD, STRUCTURE_CONTAINER, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_EXTENSION, STRUCTURE_CONTAINER, STRUCTURE_ROAD],
    [STRUCTURE_ROAD, STRUCTURE_EXTENSION, undefined, STRUCTURE_EXTENSION, undefined, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
    [STRUCTURE_ROAD, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_EXTENSION, STRUCTURE_ROAD],
    [undefined, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, STRUCTURE_ROAD, undefined],
];
const FASTFILLER_STAMP_SPAWN_ORDER = [
    [1, 2],
    [5, 2],
    [3, 5]
];

const planExtensions = (roomName) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const plan = {
        extensions: [],
        roads: [],
        ramparts: []
    };
    const extensionsPlaced = ((_c = (_b = (_a = roomPlans(roomName)) === null || _a === void 0 ? void 0 : _a.fastfiller) === null || _b === void 0 ? void 0 : _b.extensions.length) !== null && _c !== void 0 ? _c : 0) +
        ((_f = (_e = (_d = roomPlans(roomName)) === null || _d === void 0 ? void 0 : _d.franchise1) === null || _e === void 0 ? void 0 : _e.extensions.length) !== null && _f !== void 0 ? _f : 0) +
        ((_j = (_h = (_g = roomPlans(roomName)) === null || _g === void 0 ? void 0 : _g.franchise2) === null || _h === void 0 ? void 0 : _h.extensions.length) !== null && _j !== void 0 ? _j : 0) +
        1;
    const extensionsRemaining = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8] - extensionsPlaced;
    const stampCount = Math.floor(extensionsRemaining / 5);
    if (stampCount <= 0)
        return validateExtensionsPlan(plan);
    let cm = getCostMatrix(roomName, false, { roomPlan: true, terrain: true });
    const anchor = (_l = (_k = roomPlans(roomName)) === null || _k === void 0 ? void 0 : _k.headquarters) === null || _l === void 0 ? void 0 : _l.storage.pos;
    if (!anchor)
        throw new Error('Unable to plan extensions without headquarters as origin');
    const flowfield = dijkstraMap(roomName, [anchor], cm.clone(), false);
    const stampPositions = [];
    for (let i = 0; i < stampCount; i++) {
        const squares = fitStamp(roomName, EXTENSION_STAMP, cm, true);
        if (!squares.length)
            break;
        const best = squares.reduce((a, b) => (flowfield.get(a.x + 2, a.y + 2) < flowfield.get(b.x + 2, b.y + 2) ? a : b));
        stampPositions.push(best);
        cm = applyStamp(EXTENSION_STAMP, best, cm);
    }
    stampPositions.forEach(({ x, y }) => viz(roomName).poly([
        [x - 0.5, y + 2],
        [x + 2, y - 0.5],
        [x + 4.5, y + 2],
        [x + 2, y + 4.5],
        [x - 0.5, y + 2]
    ], { stroke: 'red', fill: 'transparent' }));
    for (const pos of stampPositions) {
        EXTENSION_STAMP.forEach((row, y) => {
            row.forEach((cell, x) => {
                var _a, _b;
                if (cell === STRUCTURE_EXTENSION) {
                    (_a = plan.extensions) === null || _a === void 0 ? void 0 : _a.push(new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, roomName), STRUCTURE_EXTENSION));
                }
                if (cell === STRUCTURE_ROAD) {
                    (_b = plan.roads) === null || _b === void 0 ? void 0 : _b.push(new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, roomName), STRUCTURE_ROAD));
                }
            });
        });
    }
    // plan.ramparts = outlineExtensions(roomName, plan.extensions)
    //     .filter(pos => isPositionWalkable(pos, true))
    //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));
    return validateExtensionsPlan(plan);
};

const EMPTY_ID = '                        ';
const planFranchise = (sourceId) => {
    const plan = {
        sourceId,
        link: undefined,
        container: undefined,
        extensions: [],
        ramparts: []
    };
    let sourcePos = posById(sourceId);
    if (!sourcePos)
        throw new Error(`No source pos cached for ${sourceId}`);
    // Calculate from scratch
    let controllerPos = posById(Memory.rooms[sourcePos.roomName].controllerId);
    if (!controllerPos)
        throw new Error('No known controller in room, unable to compute plan');
    const cm = getCostMatrix(sourcePos.roomName, false, { roomPlan: true, terrain: true, ignoreFranchises: true });
    // console.log('Found spawn', spawn)
    // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
    let route = PathFinder.search(sourcePos, { pos: controllerPos, range: 1 }, { roomCallback: room => getCostMatrix(room, false, { roomPlan: true, ignoreFranchises: true }) });
    if (route.incomplete) {
        // console.log(JSON.stringify(route));
        throw new Error('Unable to calculate path between source and controller');
    }
    const containerPos = route.path.length
        ? route.path[0]
        : calculateAdjacentPositions(sourcePos).find(pos => cm.get(pos.x, pos.y) !== 255 && pos.x > 1 && pos.x < 48 && pos.y > 1 && pos.y < 48);
    if (!containerPos)
        throw new Error('Unable to place container');
    plan.container = new PlannedStructure(containerPos, STRUCTURE_CONTAINER);
    // console.log('container', plan.container.pos)
    // 2. The Franchise link will be adjacent to the container, but not on the path to the Controller,
    // and not too close to an edge (to make room for exit ramparts, if needed)
    let adjacents = calculateAdjacentPositions(plan.container.pos).filter(pos => cm.get(pos.x, pos.y) !== 255 &&
        (route.path[1] ? !pos.isEqualTo(route.path[1]) : pos.getRangeTo(controllerPos) > 1) &&
        pos.x > 1 &&
        pos.x < 48 &&
        pos.y > 1 &&
        pos.y < 48);
    let linkPos = adjacents.shift();
    if (!linkPos)
        throw new Error('Not enough space to place a Franchise');
    plan.link = new PlannedStructure(linkPos, STRUCTURE_LINK);
    plan.extensions = adjacents.map(p => new PlannedStructure(p, STRUCTURE_EXTENSION));
    // plan.ramparts = calculateAdjacentPositions(plan.spawn.pos)
    //     .filter(pos => (
    //         isPositionWalkable(pos, true, true) &&
    //         !pos.isEqualTo(plan.link!.pos) &&
    //         !pos.isEqualTo(plan.container!.pos)
    //     ))
    //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));
    // plan.ramparts.push(new PlannedStructure(plan.spawn.pos, STRUCTURE_RAMPART))
    // plan.ramparts.push(new PlannedStructure(plan.link.pos, STRUCTURE_RAMPART))
    // plan.ramparts.push(new PlannedStructure(plan.container.pos, STRUCTURE_RAMPART))
    return validateFranchisePlan(plan);
};

const costMatrixFromRoomPlan = (room) => {
    const plan = new PathFinder.CostMatrix;
    for (const s of plannedOfficeStructuresByRcl(room, 8)) {
        if (OBSTACLE_OBJECT_TYPES.includes(s.structureType)) {
            plan.set(s.pos.x, s.pos.y, 255);
        }
    }
    return plan;
};

const planMine = (room) => {
    const mineralPos = mineralPosition(room);
    if (!mineralPos)
        throw new Error('No known mineral in room, unable to compute plan');
    const plan = {
        extractor: undefined,
        container: undefined,
    };
    // Calculate from scratch
    let controllerPos = controllerPosition(room);
    if (!controllerPos)
        throw new Error('No known controller in room, unable to compute plan');
    // 1. The Mine containers will be at the first position of the path between the Mineral and the Controller.
    let route = PathFinder.search(mineralPos, { pos: controllerPos, range: 1 }, {
        maxRooms: 1,
        roomCallback: (roomName) => {
            if (roomName !== room)
                return false;
            return costMatrixFromRoomPlan(roomName);
        }
    });
    if (route.incomplete)
        throw new Error('Unable to calculate path between source and controller');
    plan.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);
    // 2. The Mineral extractor will be on the mineral itself
    plan.extractor = new PlannedStructure(mineralPos, STRUCTURE_EXTRACTOR);
    return validateMinePlan(plan);
};

/**
 * Posted 10 may 2018 by @saruss
 *
 * Code for calculating the minCut in a room, written by Saruss
 * adapted (for Typescript by Chobobobo , is it somewhere?)
 * some readability added by Chobobobo @typescript was included here
 * (15Aug2019) Updated Game.map.getTerrainAt to Game.map.getRoomTerrain method -Shibdib
 */

 const UNWALKABLE = -1;
 const NORMAL = 0;
 const PROTECTED = 1;
 const TO_EXIT = 2;
 const EXIT = 3;


 /**
  * An Array with Terrain information: -1 not usable, 2 Sink (Leads to Exit)
  */
 function room_2d_array(roomname,bounds={x1:0,y1:0,x2:49,y2:49}) {
     let room_2d=Array(50).fill(0).map( x=>Array(50).fill(UNWALKABLE)); // Array for room tiles
     let i=bounds.x1;const imax=bounds.x2;
     let j=bounds.y1;const jmax=bounds.y2;
     const terrain = Game.map.getRoomTerrain(roomname);
     for (;i<=imax;i++) {
         j=bounds.y1;
         for(;j<=jmax;j++) {
             if (terrain.get(i,j) !== TERRAIN_MASK_WALL){
                 room_2d[i][j]=NORMAL; // mark unwalkable
                 if (i===bounds.x1 || j===bounds.y1 || i===bounds.x2 || j===bounds.y2)
                     room_2d[i][j]=TO_EXIT; // Sink Tiles mark from given bounds
                 if (i===0 || j===0 || i===49 || j===49)
                     room_2d[i][j]=EXIT; // Exit Tiles mark

             }
         }
     }

     /* OLD CODE
     let terrain_array=room.lookForAtArea(LOOK_TERRAIN,0,0,49,49,true);
     if (terrain_array.length == 0) {
         console.log('get_room_array in room_layout, look-at-for-Area Fehler');
     }
     let terrain='';
     let x_pos=0;
     let y_pos=0;
     let i=0;const imax=terrain_array.length;
     for (;i<imax;i++) { // Filling array with terrain information
         terrain=terrain_array[i];
         x_pos=terrain.x;
         y_pos=terrain.y;
         if (terrain.terrain==='wall') {
             room_2d[x_pos][y_pos]=-1; // mark unwalkable
         } else {
             if (x_pos===0 || y_pos===0 ||x_pos===49 || y_pos===49)
                 room_2d[x_pos][y_pos]=3; // Exit Tiles mark
         }
     }
     ENDE OLD CODE */

     // Marks tiles Near Exits for sink- where you cannot build wall/rampart
     let y=1;const max=49;
     for(;y<max;y++) {
         if (room_2d[0][y-1]===EXIT) room_2d[1][y]=TO_EXIT;
         if (room_2d[0][y]===EXIT) room_2d[1][y]=TO_EXIT;
         if (room_2d[0][y+1]===EXIT) room_2d[1][y]=TO_EXIT;
         if (room_2d[49][y-1]===EXIT) room_2d[48][y]=TO_EXIT;
         if (room_2d[49][y]===EXIT) room_2d[48][y]=TO_EXIT;
         if (room_2d[49][y+1]===EXIT) room_2d[48][y]=TO_EXIT;
     }
     let x=1;
     for(;x<max;x++) {
         if (room_2d[x-1][0]===EXIT) room_2d[x][1]=TO_EXIT;
         if (room_2d[x][0]===EXIT) room_2d[x][1]=TO_EXIT;
         if (room_2d[x+1][0]===EXIT) room_2d[x][1]=TO_EXIT;
         if (room_2d[x-1][49]===EXIT) room_2d[x][48]=TO_EXIT;
         if (room_2d[x][49]===EXIT) room_2d[x][48]=TO_EXIT;
         if (room_2d[x+1][49]===EXIT) room_2d[x][48]=TO_EXIT;
     }
     // mark Border Tiles as not usable
     y=1;
     for(;y<max;y++) {
         room_2d[0][y]==UNWALKABLE;
         room_2d[49][y]==UNWALKABLE;
     }
     x=1;
     for(;x<max;x++) {
         room_2d[x][0]==UNWALKABLE;
         room_2d[x][49]==UNWALKABLE;
     }
     return room_2d;
 }

 function Graph(menge_v) {
     this.v=menge_v; // Vertex count
     this.level=Array(menge_v);
     this.edges=Array(menge_v).fill(0).map( x=>[]); // Array: for every vertex an edge Array mit {v,r,c,f} vertex_to,res_edge,capacity,flow
     this.New_edge=function(u,v,c) { // Adds new edge from u to v
         this.edges[u].push({v: v, r: this.edges[v].length, c:c, f:0}); // Normal forward Edge
         this.edges[v].push({v: u, r: this.edges[u].length-1, c:0, f:0}); // reverse Edge for Residal Graph
     };
     this.Bfs=function(s, t) { // calculates Level Graph and if theres a path from s to t
         if (t>=this.v)
             return false;
         this.level.fill(-1); // reset old levels
         this.level[s]=0;
         let q=[]; // queue with s as starting point
         q.push(s);
         let u=0;
         let edge=null;
         while (q.length) {
             u=q.splice(0,1)[0];
             let i=0;const imax=this.edges[u].length;
             for (;i<imax;i++) {
                 edge=this.edges[u][i];
                 if (this.level[edge.v] < 0 && edge.f < edge.c) {
                     this.level[edge.v] = this.level[u] + 1;
                     q.push(edge.v);
                 }
             }
         }
         return this.level[t] >= 0; // return if theres a path to t -> no level, no path!
     };
     // DFS like: send flow at along path from s->t recursivly while increasing the level of the visited vertices by one
     // u vertex, f flow on path, t =Sink , c Array, c[i] saves the count of edges explored from vertex i
     this.Dfsflow = function(u,f,t,c) {
         if (u===t) // Sink reached , aboard recursion
             return f;
         let edge=null;
         let flow_till_here=0;
         let flow_to_t=0;
         while (c[u] < this.edges[u].length) { // Visit all edges of the vertex  one after the other
             edge=this.edges[u][c[u]];
             if (this.level[edge.v] === this.level[u]+1 && edge.f < edge.c) { // Edge leads to Vertex with a level one higher, and has flow left
                 flow_till_here=Math.min(f,edge.c-edge.f);
                 flow_to_t=this.Dfsflow(edge.v,flow_till_here,t,c);
                 if (flow_to_t > 0 ) {
                     edge.f+=flow_to_t; // Add Flow to current edge
                     this.edges[edge.v][edge.r].f-=flow_to_t; // subtract from reverse Edge -> Residual Graph neg. Flow to use backward direction of BFS/DFS
                     return flow_to_t;
                 }
             }
             c[u]++;
         }
         return 0;
     };
     this.Bfsthecut=function(s) { // breadth-first-search which uses the level array to mark the vertices reachable from s
         let e_in_cut=[];
         this.level.fill(-1);
         this.level[s]=1;
         let q=[];
         q.push(s);
         let u=0;
         let edge=null;
         while (q.length) {
             u=q.splice(0,1)[0];
             let i=0;const imax=this.edges[u].length;
             for (;i<imax;i++) {
                 edge=this.edges[u][i];
                 if ( edge.f < edge.c ) {
                     if (this.level[edge.v] < 1) {
                         this.level[edge.v] =  1;
                         q.push(edge.v);
                     }
                 }
                 if (edge.f===edge.c && edge.c>0) { // blocking edge -> could be in min cut
                     edge.u=u;
                     e_in_cut.push(edge);
                 }
             }
         }
         let min_cut=[];
         let i=0;const imax=e_in_cut.length;
         for (;i<imax;i++) {
             if (this.level[e_in_cut[i].v] === -1) // Only edges which are blocking and lead to from s unreachable vertices are in the min cut
                 min_cut.push(e_in_cut[i].u);
         }
         return min_cut;
     };
     this.Calcmincut= function(s,t) { // calculates min-cut graph (Dinic Algorithm)
         if (s==t)
             return -1;
         let returnvalue=0;
         let count=[];
         let flow=0;
         while (this.Bfs(s,t)===true) {
             count=Array(this.v+1).fill(0);
             flow=0;
             do {
                 flow=this.Dfsflow(s,Number.MAX_VALUE,t,count);
                 if (flow > 0 )
                     returnvalue+=flow;
             } while (flow)
         }
         return returnvalue;
     };
 }
 var util_mincut={
     // Function to create Source, Sink, Tiles arrays: takes a rectangle-Array as input for Tiles that are to Protect
     // rects have top-left/bot_right Coordinates {x1,y1,x2,y2}
     create_graph: function(roomname,rect,bounds) {
         let room_array=room_2d_array(roomname,bounds); // An Array with Terrain information: -1 not usable, 2 Sink (Leads to Exit)
         // For all Rectangles, set edges as source (to protect area) and area as unused
         let r=null;
         let j=0;const jmax=rect.length;
         // Check bounds
         if (bounds.x1 >= bounds.x2 || bounds.y1 >= bounds.y2 ||
             bounds.x1 < 0 || bounds.y1 < 0 || bounds.x2 > 49 || bounds.y2 > 49)
             return console.log('ERROR: Invalid bounds', JSON.stringify(bounds));
         for (;j<jmax;j++) {
             r=rect[j];
             // Test sizes of rectangles
             if (r.x1 >= r.x2 || r.y1 >= r.y2) {
                 return console.log('ERROR: Rectangle Nr.',j, JSON.stringify(r), 'invalid.');
             } else if (r.x1 < bounds.x1 || r.x2 > bounds.x2 || r.y1 < bounds.y1 || r.y2 > bounds.y2) {
                 return console.log('ERROR: Rectangle Nr.',j, JSON.stringify(r), 'out of bounds:', JSON.stringify(bounds));
             }

             let x=r.x1;const maxx=r.x2+1;
             let y=r.y1;const maxy=r.y2+1;
             for (;x<maxx;x++) {
                 y=r.y1;
                 for (;y<maxy;y++) {
                     if (x===r.x1 || x===r.x2 || y===r.y1 || y===r.y2) {
                         if (room_array[x][y]===NORMAL)
                             room_array[x][y]=PROTECTED;
                     } else
                         room_array[x][y]=UNWALKABLE;
                 }
             }

         }
         // ********************** Visualisierung
         {
             let visual=new RoomVisual(roomname);
             let x=0;let y=0;const max=50;
             for (;x<max;x++) {
                 y=0;
                 for (;y<max;y++) {
                     if ( room_array[x][y] === UNWALKABLE )
                         visual.circle(x,y,{radius: 0.5, fill:'#111166',opacity: 0.3});
                     else if ( room_array[x][y] === NORMAL)
                         visual.circle(x,y,{radius: 0.5, fill:'#e8e863',opacity: 0.3});
                     else if ( room_array[x][y] === PROTECTED)
                         visual.circle(x,y,{radius: 0.5, fill:'#75e863',opacity: 0.3});
                     else if ( room_array[x][y] === TO_EXIT)
                         visual.circle(x,y,{radius: 0.5, fill:'#b063e8',opacity: 0.3});
                 }
             }
         }

         // initialise graph
         // possible 2*50*50 +2 (st) Vertices (Walls etc set to unused later)
         let g=new Graph(2*50*50+2);
         let infini=Number.MAX_VALUE;
         let surr=[[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]];
         // per Tile (0 in Array) top + bot with edge of c=1 from top to bott  (use every tile once!)
         // infini edge from bot to top vertices of adjacent tiles if they not protected (array =1) (no reverse edges in normal graph)
         // per prot. Tile (1 in array) Edge from source to this tile with infini cap.
         // per exit Tile (2in array) Edge to sink with infini cap.
         // source is at  pos 2*50*50, sink at 2*50*50+1 as first tile is 0,0 => pos 0
         // top vertices <-> x,y : v=y*50+x   and x= v % 50  y=v/50 (math.floor?)
         // bot vertices <-> top + 2500
         let source=2*50*50;
         let sink=2*50*50+1;
         let top=0;
         let bot=0;
         let dx=0;
         let dy=0;
         let x=1;let y=1;const max=49;
         for (;x<max;x++) {
             y=1;
             for (;y<max;y++) {
                 top=y*50+x;
                 bot=top+2500;
                 if (room_array[x][y] === NORMAL) { // normal Tile
                     g.New_edge(top,bot, 1 );
                     for (let i=0;i<8;i++) {
                         dx=x+surr[i][0];
                         dy=y+surr[i][1];
                         if (room_array[dx][dy] === NORMAL || room_array[dx][dy] === TO_EXIT )
                             g.New_edge(bot,dy*50+dx,infini);
                     }
                 } else if (room_array[x][y] === PROTECTED ) { // protected Tile
                     g.New_edge(source,top, infini );
                     g.New_edge(top,bot, 1 );
                     for (let i=0;i<8;i++) {
                         dx=x+surr[i][0];
                         dy=y+surr[i][1];
                         if (room_array[dx][dy] === NORMAL || room_array[dx][dy] === TO_EXIT)
                             g.New_edge(bot,dy*50+dx,infini);
                     }
                 } else if (room_array[x][y] === TO_EXIT) { // near Exit
                     g.New_edge(top,sink, infini );
                 }
             }
         } // graph finished
         return g;
     },
     delete_tiles_to_dead_ends: function(roomname,cut_tiles_array) { // Removes unneccary cut-tiles if bounds are set to include some 	dead ends
         // Get Terrain and set all cut-tiles as unwalkable
         let room_array=room_2d_array(roomname);
         for (let i=cut_tiles_array.length-1;i>=0;i--) {
             room_array[cut_tiles_array[i].x][cut_tiles_array[i].y]=UNWALKABLE;
         }
         // Floodfill from exits: save exit tiles in array and do a bfs-like search
         let unvisited_pos=[];
         let y=0;const max=49;
         for(;y<max;y++) {
             if (room_array[1][y]===TO_EXIT) unvisited_pos.push(50*y+1);
             if (room_array[48][y]===TO_EXIT) unvisited_pos.push(50*y+48);
         }
         let x=0;
         for(;x<max;x++) {
             if (room_array[x][1]===TO_EXIT) unvisited_pos.push(50+x);
             if (room_array[x][48]===TO_EXIT) unvisited_pos.push(2400+x); // 50*48=2400
         }
         // Iterate over all unvisited TO_EXIT- Tiles and mark neigbours as TO_EXIT tiles, if walkable (NORMAL), and add to unvisited
         let surr=[[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]];
         let index,dx,dy;
         while (unvisited_pos.length > 0) {
             index=unvisited_pos.pop();
             x=index % 50;
             y=Math.floor(index/50);
             for (let i=0;i<8;i++) {
                 dx=x+surr[i][0];
                 dy=y+surr[i][1];
                 if (room_array[dx][dy] === NORMAL ) {
                     unvisited_pos.push(50*dy+dx);
                     room_array[dx][dy] = TO_EXIT;
                 }
             }
         }
         // Remove min-Cut-Tile if there is no TO-EXIT  surrounding it
         let leads_to_exit=false;
         for (let i=cut_tiles_array.length-1;i>=0;i--) {
             leads_to_exit=false;
             x=cut_tiles_array[i].x;
             y=cut_tiles_array[i].y;
             for (let i=0;i<8;i++) {
                 dx=x+surr[i][0];
                 dy=y+surr[i][1];
                 if (room_array[dx][dy] === TO_EXIT ) {
                     leads_to_exit=true;
                 }
             }
             if (!leads_to_exit) {
                 cut_tiles_array.splice(i,1);
             }
         }
     },
     // Function for user: calculate min cut tiles from room, rect[]
     GetCutTiles: function(roomname, rect, bounds={x1:0,y1:0,x2:49,y2:49}, verbose=false) {
         let graph=util_mincut.create_graph(roomname, rect, bounds);
         let source=2*50*50; // Position Source / Sink in Room-Graph
         let sink=2*50*50+1;
         let count=graph.Calcmincut(source,sink);
         if (verbose) console.log('NUmber of Tiles in Cut:',count);
         let positions=[];
         if (count > 0) {
             let cut_edges=graph.Bfsthecut(source);
             // Get Positions from Edge
             let u,x,y;
             let i=0;const imax=cut_edges.length;
             for (;i<imax;i++) {
                 u=cut_edges[i];// x= v % 50  y=v/50 (math.floor?)
                 x=u % 50;
                 y=Math.floor(u/50);
                 positions.push({"x":x,"y":y});
             }
         }
         // if bounds are given,
         // try to dectect islands of walkable tiles, which are not conntected to the exits, and delete them from the cut-tiles
         let whole_room=(bounds.x1==0 && bounds.y1==0 && bounds.x2==49 && bounds.y2==49);
         if (positions.length > 0 && !whole_room)
             util_mincut.delete_tiles_to_dead_ends(roomname,positions);
         // Visualise Result
         if (positions.length > 0) {
             let visual=new RoomVisual(roomname);
             for (let i=positions.length-1;i>=0;i--) {
                 visual.circle(positions[i].x,positions[i].y,{radius: 0.5, fill:'#ff7722',opacity: 0.9});
             }
         }
         return positions;
     },
     // Example function: demonstrates how to get a min cut with 2 rectangles, which define a "to protect" area
     test: function(roomname) {
         //let room=Game.rooms[roomname];
         //if (!room)
         //    return 'O noes, no room';
         let cpu=Game.cpu.getUsed();
         // Rectangle Array, the Rectangles will be protected by the returned tiles
         let rect_array=[];
         rect_array.push({x1: 20, y1: 6, x2:28, y2: 27});
         rect_array.push({x1: 29, y1: 13, x2:34, y2: 16});
         // Boundary Array for Maximum Range
         let bounds={x1: 0, y1: 0, x2:49, y2: 49};
         // Get Min cut
         let positions=util_mincut.GetCutTiles(roomname,rect_array,bounds); // Positions is an array where to build walls/ramparts
         // Test output
         console.log('Positions returned',positions.length);
         cpu=Game.cpu.getUsed()-cpu;
         console.log('Needed',cpu,' cpu time');
         return 'Finished';
     },

 };

 var mincut =  util_mincut;

const getBoundingRect = (...args) => {
    const rect = {
        x1: 50,
        y1: 50,
        x2: 0,
        y2: 0
    };
    for (let s of args) {
        rect.x1 = Math.min(s.pos.x, rect.x1);
        rect.y1 = Math.min(s.pos.y, rect.y1);
        rect.x2 = Math.max(s.pos.x, rect.x2);
        rect.y2 = Math.max(s.pos.y, rect.y2);
    }
    return padBoundingRect(rect);
};
const padBoundingRect = (rect, buffer = 2) => {
    return {
        x1: Math.max(rect.x1 - buffer, 2),
        y1: Math.max(rect.y1 - buffer, 2),
        x2: Math.min(rect.x2 + buffer, 47),
        y2: Math.min(rect.y2 + buffer, 47)
    };
};
const planPerimeter = (room) => {
    const roomPlan = roomPlans(room);
    if (!(roomPlan === null || roomPlan === void 0 ? void 0 : roomPlan.backfill) ||
        !(roomPlan === null || roomPlan === void 0 ? void 0 : roomPlan.fastfiller) ||
        !roomPlan.library ||
        !(roomPlan === null || roomPlan === void 0 ? void 0 : roomPlan.labs) ||
        !(roomPlan === null || roomPlan === void 0 ? void 0 : roomPlan.extensions) ||
        !roomPlan.franchise1 ||
        !roomPlan.franchise2)
        throw new Error('No Office structures found to plot perimeter');
    const plan = {
        ramparts: mincut
            .GetCutTiles(room, [
            getBoundingRect(...roomPlan.backfill.towers),
            getBoundingRect(...roomPlan.fastfiller.extensions),
            getBoundingRect(...roomPlan.extensions.extensions),
            getBoundingRect(...roomPlan.labs.labs),
            getBoundingRect(roomPlan.library.container, roomPlan.library.link),
            getBoundingRect(roomPlan.franchise1.container, roomPlan.franchise1.link, ...roomPlan.franchise1.extensions),
            getBoundingRect(roomPlan.franchise2.container, roomPlan.franchise2.link, ...roomPlan.franchise1.extensions)
        ])
            .map(pos => new PlannedStructure(new RoomPosition(pos.x, pos.y, room), STRUCTURE_RAMPART))
    };
    return validatePerimeterPlan(plan);
};

const planBackfill = (roomName) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const plan = {
        extensions: [],
        towers: [],
        ramparts: [],
        observer: undefined
    };
    const extensionsPlaced = ((_c = (_b = (_a = roomPlans(roomName)) === null || _a === void 0 ? void 0 : _a.fastfiller) === null || _b === void 0 ? void 0 : _b.extensions.length) !== null && _c !== void 0 ? _c : 0) +
        ((_f = (_e = (_d = roomPlans(roomName)) === null || _d === void 0 ? void 0 : _d.franchise1) === null || _e === void 0 ? void 0 : _e.extensions.length) !== null && _f !== void 0 ? _f : 0) +
        ((_j = (_h = (_g = roomPlans(roomName)) === null || _g === void 0 ? void 0 : _g.franchise2) === null || _h === void 0 ? void 0 : _h.extensions.length) !== null && _j !== void 0 ? _j : 0) +
        ((_m = (_l = (_k = roomPlans(roomName)) === null || _k === void 0 ? void 0 : _k.extensions) === null || _l === void 0 ? void 0 : _l.extensions.length) !== null && _m !== void 0 ? _m : 0) +
        1;
    let extensionsRemaining = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][8] - extensionsPlaced;
    let towersRemaining = CONTROLLER_STRUCTURES[STRUCTURE_TOWER][8];
    let cm = getCostMatrix(roomName, false, { roomPlanAllStructures: true, terrain: true });
    const anchor = (_p = (_o = roomPlans(roomName)) === null || _o === void 0 ? void 0 : _o.headquarters) === null || _p === void 0 ? void 0 : _p.storage.pos;
    if (!anchor)
        throw new Error('Unable to plan extensions without headquarters as origin');
    // const flowfield = dijkstraMap(roomName, [anchor], cm.clone());
    const viablePositions = plannedOfficeStructuresByRcl(roomName, 8)
        .filter(s => s.structureType === STRUCTURE_ROAD)
        .sort(sortByDistanceTo(anchor));
    const usedSquares = viablePositions.map(s => s.pos); // start by eliminating all roads
    loop: for (const pos of viablePositions) {
        const placeableSquares = calculateAdjacentPositions(pos.pos).filter(({ x, y }) => cm.get(x, y) !== 255);
        viz(roomName).circle(pos.pos, { radius: 1.5, stroke: 'yellow', fill: 'transparent' });
        for (const square of placeableSquares) {
            if (usedSquares.some(p => p.isEqualTo(square)))
                continue;
            usedSquares.push(square);
            viz(roomName).circle(square, { radius: 0.5, stroke: 'yellow', fill: 'transparent' });
            if (towersRemaining) {
                (_q = plan.towers) === null || _q === void 0 ? void 0 : _q.push(new PlannedStructure(square, STRUCTURE_TOWER));
                towersRemaining -= 1;
            }
            else if (extensionsRemaining > 0) {
                (_r = plan.extensions) === null || _r === void 0 ? void 0 : _r.push(new PlannedStructure(square, STRUCTURE_EXTENSION));
                extensionsRemaining -= 1;
            }
            else if (!plan.observer) {
                plan.observer = new PlannedStructure(square, STRUCTURE_OBSERVER);
            }
            else {
                break loop;
            }
        }
    }
    // plan.ramparts = outlineBackfill(roomName, plan.extensions)
    //     .filter(pos => isPositionWalkable(pos, true))
    //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));
    return validateBackfillPlan(plan);
};

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function serializeFranchisePlan(plan) {
    if (!plan)
        throw new Error('Undefined FranchisePlan, cannot serialize');
    const { sourceId } = plan, structures = __rest(plan, ["sourceId"]);
    return sourceId + EMPTY_ID.slice(sourceId.length) + serializePlannedStructures(Object.values(structures).flat());
}

// high score wins
const scorePos = (pos) => calculateNearbyPositions(pos, 2, false).filter(pos => isPositionWalkable(pos, true, true)).length;
const planLibrary = (roomName) => {
    const plan = {
        container: undefined,
        link: undefined
    };
    const controller = controllerPosition(roomName);
    if (!controller)
        throw new Error('Unable to plan Library without controller');
    plan.walls = adjacentWalkablePositions(controller, true).map(pos => new PlannedStructure(pos, STRUCTURE_WALL));
    const viableSquares = calculateNearbyPositions(controller, 2, false).filter(p => isPositionWalkable(p, true, true));
    const containerPos = viableSquares.reduce((a, b) => (scorePos(a) >= scorePos(b) ? a : b));
    const linkPos = adjacentWalkablePositions(containerPos, true)
        .filter(p => getRangeTo(p, controller) === 2)
        .reduce((a, b) => (scorePos(a) >= scorePos(b) ? a : b));
    if (containerPos) {
        plan.container = new PlannedStructure(containerPos, STRUCTURE_CONTAINER);
        viz(roomName).circle(containerPos, { fill: 'transparent', stroke: 'yellow', radius: 0.5 });
    }
    if (linkPos) {
        plan.link = new PlannedStructure(linkPos, STRUCTURE_LINK);
        viz(roomName).circle(linkPos, { fill: 'transparent', stroke: 'green', radius: 0.5 });
    }
    return validateLibraryPlan(plan);
};

const planRoads = (office) => {
    var _a, _b, _c, _d, _e, _f;
    const roads = new Set();
    const cm = getCostMatrix(office, false, { roomPlan: true });
    const plans = roomPlans(office);
    if (!plans)
        throw new Error('No office structures to route between');
    const storage = (_a = plans.headquarters) === null || _a === void 0 ? void 0 : _a.storage.pos;
    const franchise1 = (_b = plans.franchise1) === null || _b === void 0 ? void 0 : _b.container.pos;
    const franchise2 = (_c = plans.franchise2) === null || _c === void 0 ? void 0 : _c.container.pos;
    const mine = (_d = plans.mine) === null || _d === void 0 ? void 0 : _d.container.pos;
    const labs = (_e = plans.labs) === null || _e === void 0 ? void 0 : _e.roads[0].pos;
    const library = (_f = plans.library) === null || _f === void 0 ? void 0 : _f.container.pos;
    // Road from each Franchise
    if (storage && franchise1) {
        const route = PathFinder.search(franchise1, { pos: storage, range: 1 }, {
            roomCallback: room => (room === office ? cm : false),
            maxRooms: 1
        });
        if (route.incomplete)
            throw new Error('Unable to path between franchise1 and storage');
        for (let pos of route.path) {
            roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
            if (cm.get(pos.x, pos.y) !== 255)
                cm.set(pos.x, pos.y, 1);
        }
    }
    if (storage && franchise2) {
        const route = PathFinder.search(franchise2, { pos: storage, range: 1 }, {
            roomCallback: room => (room === office ? cm : false),
            maxRooms: 1
        });
        if (route.incomplete)
            throw new Error('Unable to path between franchise2 and storage');
        for (let pos of route.path) {
            roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
            if (cm.get(pos.x, pos.y) !== 255)
                cm.set(pos.x, pos.y, 1);
        }
    }
    // Road from labs
    if (storage && labs) {
        const route = PathFinder.search(labs, { pos: storage, range: 1 }, {
            roomCallback: room => (room === office ? cm : false),
            maxRooms: 1
        });
        if (route.incomplete)
            throw new Error('Unable to path between labs and storage');
        for (let pos of route.path) {
            roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
            if (cm.get(pos.x, pos.y) !== 255)
                cm.set(pos.x, pos.y, 1);
        }
    }
    // Road from mine
    if (storage && mine) {
        const route = PathFinder.search(mine, { pos: storage, range: 1 }, {
            roomCallback: room => (room === office ? cm : false),
            maxRooms: 1
        });
        if (route.incomplete)
            throw new Error('Unable to path between mine and storage');
        for (let pos of route.path) {
            roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
            if (cm.get(pos.x, pos.y) !== 255)
                cm.set(pos.x, pos.y, 1);
        }
    }
    // Road from mine
    if (storage && library) {
        const route = PathFinder.search(library, { pos: storage, range: 1 }, {
            roomCallback: room => (room === office ? cm : false),
            maxRooms: 1
        });
        if (route.incomplete)
            throw new Error('Unable to path between library and storage');
        for (let pos of route.path) {
            roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
            if (cm.get(pos.x, pos.y) !== 255)
                cm.set(pos.x, pos.y, 1);
        }
    }
    const plan = {
        roads: Array.from(roads)
    };
    return validateRoadsPlan(plan);
};

const avoidBorders = () => {
    const borders = [0, 1, 48, 49];
    const cm = new PathFinder.CostMatrix();
    for (const x of borders) {
        for (let y = 0; y < 50; y++) {
            cm.set(x, y, 255);
        }
    }
    for (const y of borders) {
        for (let x = 2; x < 48; x++) {
            cm.set(x, y, 255);
        }
    }
    return cm;
};
const pointsOfInterest = memoize(room => room, (room) => {
    const controller = controllerPosition(room);
    const [source1, source2] = sourcePositions(room);
    const mineral = mineralPosition(room);
    const exits = roomExits(room);
    if (!controller || !source1 || !source2 || !mineral || !exits) {
        // console.log(
        //   'controller',
        //   !controller,
        //   'source1',
        //   !source1,
        //   'source2',
        //   !source2,
        //   'mineral',
        //   !mineral,
        //   'exits',
        //   !exits
        // );
        throw new Error('Unable to generate flowfields for room');
    }
    const borders = avoidBorders();
    // paths to exits can ignore the border restriction; no other paths should
    // be closer than 2 squares to the border
    return Object.assign(Object.assign({}, flowfields(room, {
        controller: [controller],
        source1: [source1],
        source2: [source2],
        mineral: [mineral]
    }, borders)), flowfields(room, {
        exits
    }));
});

const stamps = [FASTFILLER_STAMP, HQ_STAMP, LABS_STAMP];
const EXIT_WEIGHT = 2;
const CONTROLLER_WEIGHT = 2;
const SOURCE_WEIGHT = 1;
const LABS_FASTFILLER_WEIGHT = 1;
const LABS_HQ_WEIGHT = 10;
const HQ_FASTFILLER_WEIGHT = 2;
const TOP_N_LAYOUTS = 7;
/**
 * Lower score is better
 */
const scoreLayout = memoize((room, layout) => room + packCoordList(layout), (room, layout) => {
    const flowfields = pointsOfInterest(room);
    if (layout.length === 0)
        return Infinity; // no stamps laid out!
    const [fastFillerPos, hqPos, labsPos] = layout.map((p, i) => {
        const offset = 0; // Math.floor(stamps[i].length / 2);
        return { x: p.x - offset, y: p.y - offset };
    });
    let score = 0;
    if (fastFillerPos) {
        score += flowfields.controller.get(fastFillerPos.x, fastFillerPos.y) * CONTROLLER_WEIGHT;
        score += flowfields.source1.get(fastFillerPos.x, fastFillerPos.y) * SOURCE_WEIGHT;
        score += flowfields.source1.get(fastFillerPos.x, fastFillerPos.y) * SOURCE_WEIGHT;
        score += (50 - flowfields.exits.get(fastFillerPos.x, fastFillerPos.y)) * EXIT_WEIGHT;
    }
    if (hqPos) {
        score += flowfields.controller.get(hqPos.x, hqPos.y) * CONTROLLER_WEIGHT;
        score += flowfields.source1.get(hqPos.x, hqPos.y) * SOURCE_WEIGHT;
        score += flowfields.source1.get(hqPos.x, hqPos.y) * SOURCE_WEIGHT;
        score += (50 - flowfields.exits.get(hqPos.x, hqPos.y)) * EXIT_WEIGHT;
    }
    if (labsPos) {
        score += (50 - flowfields.exits.get(labsPos.x, labsPos.y)) * EXIT_WEIGHT;
    }
    if (hqPos && fastFillerPos) {
        score +=
            Math.max(Math.abs(hqPos.x - fastFillerPos.x), Math.abs(hqPos.y - fastFillerPos.y)) * HQ_FASTFILLER_WEIGHT;
    }
    if (labsPos && fastFillerPos) {
        score +=
            Math.max(Math.abs(labsPos.x - fastFillerPos.x), Math.abs(labsPos.y - fastFillerPos.y)) * LABS_FASTFILLER_WEIGHT;
    }
    if (hqPos && labsPos) {
        score += Math.max(Math.abs(hqPos.x - labsPos.x), Math.abs(hqPos.y - labsPos.y)) * LABS_HQ_WEIGHT;
    }
    return score;
});
let layoutsCache = new Map();
function calculateLayout(room) {
    if (layoutsCache.has(room)) {
        return {
            layout: layoutsCache.get(room),
            stamps
        };
    }
    Game.cpu.getUsed();
    const cm = getCostMatrix(room, false, { ignoreStructures: true, terrain: true });
    // possibilities will be an array of possible positions, e.g. [[0, 1], [10, 15]]
    // each new stamp iterated over will extend the array, e.g. [[0, 1], [10, 15], [17, 20]]
    // but it may also eliminate some items from consideration
    let possibilities = [];
    for (const stamp of stamps) {
        // console.log('possibilities.length', possibilities.length);
        // console.log('stamp', stamp.length);
        const newPossibilities = [];
        if (possibilities.length === 0) {
            newPossibilities.push(...fitStamp(room, stamp, cm).map(pos => [pos]));
        }
        else {
            possibilities.forEach(stampPositions => {
                const combinedCm = stampPositions.reduce((cm, pos, i) => applyStamp(stamps[i], pos, cm), cm);
                fitStamp(room, stamp, combinedCm).forEach(pos => {
                    newPossibilities.push([...stampPositions, pos]);
                });
            });
        }
        possibilities = newPossibilities
            .sort((a, b) => scoreLayout(room, a) - scoreLayout(room, b))
            .slice(0, TOP_N_LAYOUTS);
    }
    if (possibilities.length === 0)
        throw new Error('No possible layouts found');
    layoutsCache.set(room, possibilities[0]);
    // console.log('Layout planned in', Game.cpu.getUsed() - start, 'ms');
    return { layout: possibilities[0], stamps };
}
function planMainStamps(room) {
    var _a;
    if (!Memory.rooms[room])
        throw new Error('No data cached for planning room');
    let sources = (_a = Memory.rooms[room].sourceIds) !== null && _a !== void 0 ? _a : [];
    if (sources.length < 2)
        throw new Error('Expected two sources for headquarters planning');
    const { layout, stamps } = calculateLayout(room);
    const hq = {
        nuker: undefined,
        link: undefined,
        factory: undefined,
        powerSpawn: undefined,
        storage: undefined,
        terminal: undefined,
        extension: undefined,
        roads: []
    };
    const fastfiller = {
        extensions: [],
        spawns: [],
        roads: [],
        containers: [],
        link: undefined
    };
    const labs = {
        labs: [],
        roads: []
    };
    layout.forEach((pos, i) => {
        var _a, _b, _c;
        if (stamps[i] === FASTFILLER_STAMP) {
            fastfiller.spawns = FASTFILLER_STAMP_SPAWN_ORDER.map(([x, y]) => new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, room), STRUCTURE_SPAWN));
            for (let y = 0; y < stamps[i].length; y++) {
                for (let x = 0; x < stamps[i][0].length; x++) {
                    const cell = stamps[i][y][x];
                    const p = new RoomPosition(pos.x + x, pos.y + y, room);
                    if (cell === STRUCTURE_EXTENSION) {
                        (_a = fastfiller.extensions) === null || _a === void 0 ? void 0 : _a.push(new PlannedStructure(p, STRUCTURE_EXTENSION));
                    }
                    if (cell === STRUCTURE_CONTAINER) {
                        (_b = fastfiller.containers) === null || _b === void 0 ? void 0 : _b.push(new PlannedStructure(p, STRUCTURE_CONTAINER));
                    }
                    if (cell === STRUCTURE_LINK) {
                        fastfiller.link = new PlannedStructure(p, STRUCTURE_LINK);
                    }
                    if (cell === STRUCTURE_ROAD) {
                        (_c = fastfiller.roads) === null || _c === void 0 ? void 0 : _c.push(new PlannedStructure(p, STRUCTURE_ROAD));
                    }
                }
            }
        }
        else if (stamps[i] === HQ_STAMP) {
            stamps[i].forEach((row, y) => {
                row.forEach((cell, x) => {
                    var _a;
                    let p = new RoomPosition(pos.x + x, pos.y + y, room);
                    if (cell === STRUCTURE_POWER_SPAWN) {
                        hq.powerSpawn = new PlannedStructure(p, STRUCTURE_POWER_SPAWN);
                    }
                    if (cell === STRUCTURE_FACTORY) {
                        hq.factory = new PlannedStructure(p, STRUCTURE_FACTORY);
                    }
                    if (cell === STRUCTURE_LINK) {
                        hq.link = new PlannedStructure(p, STRUCTURE_LINK);
                    }
                    if (cell === STRUCTURE_STORAGE) {
                        hq.storage = new PlannedStructure(p, STRUCTURE_STORAGE);
                    }
                    if (cell === STRUCTURE_TERMINAL) {
                        hq.terminal = new PlannedStructure(p, STRUCTURE_TERMINAL);
                    }
                    if (cell === STRUCTURE_ROAD) {
                        (_a = hq.roads) === null || _a === void 0 ? void 0 : _a.push(new PlannedStructure(p, STRUCTURE_ROAD));
                    }
                    if (cell === STRUCTURE_NUKER) {
                        hq.nuker = new PlannedStructure(p, STRUCTURE_NUKER);
                    }
                    if (cell === STRUCTURE_EXTENSION) {
                        hq.extension = new PlannedStructure(p, STRUCTURE_EXTENSION);
                    }
                });
            });
        }
        else if (stamps[i] === LABS_STAMP) {
            labs.labs = LABS_STAMP_ORDER.map(([x, y]) => new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, room), STRUCTURE_LAB));
            stamps[i].forEach((row, y) => {
                row.forEach((cell, x) => {
                    var _a;
                    let p = new RoomPosition(pos.x + x, pos.y + y, room);
                    if (cell === STRUCTURE_ROAD) {
                        (_a = labs.roads) === null || _a === void 0 ? void 0 : _a.push(new PlannedStructure(p, STRUCTURE_ROAD));
                    }
                });
            });
        }
    });
    // make sure middle extensions get built in the right order
    fastfiller.extensions = [].concat(fastfiller.extensions[5], // [0]
    fastfiller.extensions.slice(0, 5), // [1-5]
    fastfiller.extensions.slice(6, 8), // [6-7]
    fastfiller.extensions[9], // [8]
    fastfiller.extensions.slice(8, 9), // [9]
    fastfiller.extensions.slice(10) // [10-14]
    );
    return {
        hq: validateHeadquartersPlan(hq),
        labs: validateLabsPlan(labs),
        fastfiller: validateFastfillerPlan(fastfiller)
    };
}

const roomSectionPlanner = (room, plan, planner, serializer) => () => {
    if (Memory.roomPlans[room][plan] === undefined) {
        try {
            const plannedSection = planner(room);
            Memory.roomPlans[room][plan] = serializer(plannedSection);
        }
        catch (e) {
            // console.log(`Error planning ${plan} for ${room}: ${e}`);
            // console.log((e as any).stack);
            Memory.roomPlans[room][plan] = null;
        }
    }
};
const mainStampsPlanner = (room, planner, serializer) => () => {
    if (Memory.roomPlans[room].headquarters === undefined ||
        Memory.roomPlans[room].labs === undefined ||
        Memory.roomPlans[room].fastfiller === undefined) {
        try {
            const { hq, labs, fastfiller } = planner(room);
            if (!hq)
                throw new Error('No hq plan');
            if (!labs)
                throw new Error('No labs plan');
            if (!fastfiller)
                throw new Error('No fastfiller plan');
            Memory.roomPlans[room].headquarters = serializer(hq);
            Memory.roomPlans[room].labs = serializer(labs);
            Memory.roomPlans[room].fastfiller = serializer(fastfiller);
        }
        catch (e) {
            // console.log(`Error planning stamps for ${room}: ${e}`);
            Memory.roomPlans[room].headquarters = null;
            Memory.roomPlans[room].labs = null;
            Memory.roomPlans[room].fastfiller = null;
        }
    }
};
const serializePlan = (plan) => {
    if (!plan)
        throw new Error('Undefined plan, cannot serialize');
    return serializePlannedStructures(Object.values(plan !== null && plan !== void 0 ? plan : {}).flat());
};
const generateRoomPlans = (roomName) => {
    var _a, _b;
    var _c;
    (_a = Memory.roomPlans) !== null && _a !== void 0 ? _a : (Memory.roomPlans = {});
    (_b = (_c = Memory.roomPlans)[roomName]) !== null && _b !== void 0 ? _b : (_c[roomName] = {
        complete: false
    });
    if (Memory.roomPlans[roomName].complete)
        return;
    const controllerPos = controllerPosition(roomName);
    // Franchises are sorted in order of distance to controller
    const franchiseSources = sourceIds(roomName).sort((a, b) => posById(a).getRangeTo(controllerPos) - posById(b).getRangeTo(controllerPos));
    const [franchise1, franchise2] = franchiseSources;
    const steps = [
        roomSectionPlanner(roomName, 'franchise1', () => planFranchise(franchise1), serializeFranchisePlan),
        roomSectionPlanner(roomName, 'franchise2', () => planFranchise(franchise2), serializeFranchisePlan),
        roomSectionPlanner(roomName, 'mine', planMine, serializePlan),
        roomSectionPlanner(roomName, 'library', planLibrary, serializePlan),
        mainStampsPlanner(roomName, planMainStamps, serializePlan),
        roomSectionPlanner(roomName, 'extensions', planExtensions, serializePlan),
        roomSectionPlanner(roomName, 'roads', planRoads, serializePlan),
        roomSectionPlanner(roomName, 'backfill', planBackfill, serializePlan),
        roomSectionPlanner(roomName, 'perimeter', planPerimeter, serializePlan)
    ];
    const start = Game.cpu.getUsed();
    for (let step of steps) {
        step();
        const used = Game.cpu.getUsed() - start;
        if (used > 10) {
            return; // continue planning next time
        }
    }
    Memory.roomPlans[roomName].complete = true;
    Memory.roomPlans[roomName].office =
        Memory.rooms[roomName].eligibleForOffice &&
            Memory.roomPlans[roomName].headquarters !== null &&
            Memory.roomPlans[roomName].franchise1 !== null &&
            Memory.roomPlans[roomName].franchise2 !== null &&
            Memory.roomPlans[roomName].mine !== null &&
            Memory.roomPlans[roomName].labs !== null &&
            Memory.roomPlans[roomName].extensions !== null &&
            Memory.roomPlans[roomName].perimeter !== null &&
            Memory.roomPlans[roomName].fastfiller !== null &&
            Memory.roomPlans[roomName].backfill !== null &&
            Memory.roomPlans[roomName].library !== null &&
            Memory.roomPlans[roomName].roads !== null;
};

const planRooms = profiler.registerFN(() => {
    var _a, _b;
    let start = Game.cpu.getUsed();
    if (Game.cpu.bucket < 500)
        return; // Don't do room planning at low bucket levels
    (_a = Memory.roomPlans) !== null && _a !== void 0 ? _a : (Memory.roomPlans = {});
    for (let room in Memory.rooms) {
        if ((_b = Memory.roomPlans[room]) === null || _b === void 0 ? void 0 : _b.complete)
            continue; // Already planned
        if (!Memory.rooms[room].controllerId)
            continue; // No controller or room hasn't been properly scanned yet
        if (Game.cpu.getUsed() - start <= 5) {
            generateRoomPlans(room);
        }
    }
}, 'planRooms');

const displayBucket = () => {
    main_3({
        widgets: [
            {
                pos: { x: 44, y: 46 },
                width: 6,
                height: 4,
                widget: main_4({
                    data: {
                        value: Game.cpu.bucket / 10000
                    },
                    config: {
                        label: Game.cpu.bucket.toString(),
                        textStyle: { font: '0.7' },
                        foregroundStyle: { stroke: '#44ff44' }
                    }
                })
            }
        ]
    });
};
const displaySpawn = () => {
    var _a;
    for (const office in Memory.offices) {
        if (!((_a = heapMetrics[office]) === null || _a === void 0 ? void 0 : _a.spawnEfficiency))
            continue;
        const spawnEfficiency = main_8.avg(heapMetrics[office].spawnEfficiency);
        main_3({
            widgets: [
                {
                    pos: { x: 32, y: 46 },
                    width: 6,
                    height: 4,
                    widget: main_4({
                        data: {
                            value: spawnEfficiency
                        },
                        config: {
                            label: `${(spawnEfficiency * 100).toFixed(0)}%`,
                            textStyle: { font: '0.7' },
                            foregroundStyle: { stroke: '#ffff44' }
                        }
                    })
                }
            ],
            config: { room: office }
        });
    }
};
const displayGcl = () => {
    main_3({
        widgets: [
            {
                pos: { x: 38, y: 46 },
                width: 6,
                height: 4,
                widget: main_4({
                    data: {
                        value: Game.gcl.progress / Game.gcl.progressTotal
                    },
                    config: {
                        label: Game.gcl.level.toFixed(),
                        textStyle: { font: '1' },
                        foregroundStyle: { stroke: '#00ffff' }
                    }
                })
            }
        ]
    });
};
const displayGpl = () => {
    main_3({
        widgets: [
            {
                pos: { x: 24, y: 46 },
                width: 6,
                height: 4,
                widget: main_4({
                    data: {
                        value: Game.gpl.progress / Game.gpl.progressTotal
                    },
                    config: {
                        label: Game.gpl.level.toFixed(),
                        textStyle: { font: '1' },
                        foregroundStyle: { stroke: '#ff0000' }
                    }
                })
            }
        ]
    });
};

function runLabLogic(roomName) {
    var _a, _b, _c, _d;
    // Set boosting labs for all queued resources
    const newBoostingLabs = (_a = Memory.offices[roomName].lab.boostingLabs.filter(({ resource }) => Memory.offices[roomName].lab.boosts.some(o => o.boosts.some(b => b.type === resource)))) !== null && _a !== void 0 ? _a : [];
    set_boosting_labs: for (const order of Memory.offices[roomName].lab.boosts) {
        if (((_b = Memory.creeps[order.name]) === null || _b === void 0 ? void 0 : _b.runState) !== States.GET_BOOSTED) {
            // either undefined, if creep is dead, or something else, if state changed
            // either way, scrap the boost order
            Memory.offices[roomName].lab.boosts = Memory.offices[roomName].lab.boosts.filter(o => o.name !== order.name);
            continue;
        }
        if ((_c = Game.creeps[order.name]) === null || _c === void 0 ? void 0 : _c.spawning)
            continue; // creep is not dead, so is still spawning
        for (let boost of order.boosts) {
            const boostingLab = newBoostingLabs.find(l => l.resource === boost.type);
            if (boostingLab && !newBoostingLabs.includes(boostingLab)) {
                newBoostingLabs.push(boostingLab);
            }
            else if (!newBoostingLabs.some(l => l.resource === boost.type)) {
                // dedicate an available lab
                const labs = getLabs(roomName);
                const availableLab = labs.inputs
                    .concat(labs.outputs)
                    .filter(l => l.structureId && !newBoostingLabs.some(bl => bl.id === l.structureId))
                    .slice(-1)[0];
                if (!availableLab)
                    break set_boosting_labs;
                newBoostingLabs.push({
                    id: availableLab.structureId,
                    resource: boost.type
                });
            }
        }
    }
    Memory.offices[roomName].lab.boostingLabs = newBoostingLabs;
    // Run reaction orders
    const order = Memory.offices[roomName].lab.orders[0];
    if (!order)
        return;
    const { inputs, outputs } = getLabs(roomName);
    const [lab1, lab2] = inputs.map(s => s.structure);
    if (!(lab1 === null || lab1 === void 0 ? void 0 : lab1.store.getUsedCapacity(order.ingredient1)) || !(lab2 === null || lab2 === void 0 ? void 0 : lab2.store.getUsedCapacity(order.ingredient2)))
        return;
    for (let lab of outputs) {
        const result = (_d = lab.structure) === null || _d === void 0 ? void 0 : _d.runReaction(lab1, lab2);
        if (result === OK)
            break;
        // if (result !== undefined) console.log('lab result:', result);
    }
}

function planLabOrders(office) {
    var _a, _b;
    // Prune completed orders
    const terminal = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure;
    if (!terminal)
        return;
    // Maintain quotas
    if (Memory.offices[office].lab.orders.some(o => o.amount <= 0)) {
        Memory.offices[office].lab.orders = []; // reset after each lab order is completed
    }
    if (Memory.offices[office].lab.orders.length === 0) {
        for (const { boost, amount } of boostQuotas()) {
            const difference = amount - terminal.store.getUsedCapacity(boost);
            if (difference > 0) {
                try {
                    Memory.offices[office].lab.orders.push(...getLabOrders(boost, difference, terminal));
                    break;
                }
                catch (_c) {
                    // No market and not enough ingredients
                    continue;
                }
            }
        }
    }
}

const runLabs = () => {
    for (let office in Memory.offices) {
        planLabOrders(office);
        runLabLogic(office);
    }
};

const capacity = (link) => { var _a, _b; return Math.max(0, ((_a = link === null || link === void 0 ? void 0 : link.store.getCapacity(RESOURCE_ENERGY)) !== null && _a !== void 0 ? _a : 0) - ((_b = link === null || link === void 0 ? void 0 : link.store[RESOURCE_ENERGY]) !== null && _b !== void 0 ? _b : 0)); };
const runLinks = () => {
    var _a, _b, _c, _d, _e;
    for (let office in Memory.offices) {
        const plan = roomPlans(office);
        const hqlink = (_a = plan === null || plan === void 0 ? void 0 : plan.headquarters) === null || _a === void 0 ? void 0 : _a.link.structure;
        const franchise1link = (_b = plan === null || plan === void 0 ? void 0 : plan.franchise1) === null || _b === void 0 ? void 0 : _b.link.structure;
        const franchise2link = (_c = plan === null || plan === void 0 ? void 0 : plan.franchise2) === null || _c === void 0 ? void 0 : _c.link.structure;
        const fastfillerlink = (_d = plan === null || plan === void 0 ? void 0 : plan.fastfiller) === null || _d === void 0 ? void 0 : _d.link.structure;
        const librarylink = (_e = plan === null || plan === void 0 ? void 0 : plan.library) === null || _e === void 0 ? void 0 : _e.link.structure;
        const destinations = [fastfillerlink, librarylink, hqlink]
            .filter((l) => capacity(l) > LINK_CAPACITY / 2)
            .sort((a, b) => capacity(a) - capacity(b));
        for (const source of [franchise1link, franchise2link, hqlink]) {
            if ((source === null || source === void 0 ? void 0 : source.store[RESOURCE_ENERGY]) && !source.cooldown) {
                const destination = destinations.filter(d => d !== source).shift();
                if (destination) {
                    if (source.transferEnergy(destination) === OK) {
                        const transfer = Math.min(source.store[RESOURCE_ENERGY], capacity(destination));
                        source.store[RESOURCE_ENERGY] -= transfer;
                        destination.store[RESOURCE_ENERGY] += transfer * 0.97;
                        if (capacity(destination))
                            destinations.unshift(destination);
                    }
                }
            }
        }
    }
};

const runObserver = () => {
    var _a, _b;
    for (const office in Memory.offices) {
        const observer = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.backfill) === null || _b === void 0 ? void 0 : _b.observer.structure;
        if (!observer)
            continue;
        const observerTargets = calculateNearbyRooms(office, 10, false).filter(r => isHighway(r));
        if (!observerTargets.length)
            continue;
        const bestTarget = observerTargets.reduce((best, current) => {
            var _a, _b;
            if (!((_a = Memory.rooms[best]) === null || _a === void 0 ? void 0 : _a.scanned))
                return best;
            if (!((_b = Memory.rooms[current]) === null || _b === void 0 ? void 0 : _b.scanned))
                return current;
            if (Memory.rooms[best].scanned > Memory.rooms[current].scanned)
                return current;
            return best;
        });
        visualize(observer.pos, bestTarget);
        observer.observeRoom(bestTarget);
    }
};
const visualize = (origin, target) => {
    const targetCoords = roomNameToCoords(target);
    const originCoords = roomNameToCoords(origin.roomName);
    let corner1, corner2;
    if (targetCoords.wx > originCoords.wx) {
        if (targetCoords.wy < originCoords.wy) {
            corner1 = new RoomPosition(0, 49, target);
            corner2 = new RoomPosition(49, 0, target);
        }
        else if (targetCoords.wy > originCoords.wy) {
            corner1 = new RoomPosition(0, 0, target);
            corner2 = new RoomPosition(49, 49, target);
        }
        else {
            corner1 = new RoomPosition(49, 0, target);
            corner2 = new RoomPosition(49, 49, target);
        }
    }
    else if (targetCoords.wx < originCoords.wx) {
        if (targetCoords.wy < originCoords.wy) {
            corner1 = new RoomPosition(0, 0, target);
            corner2 = new RoomPosition(49, 49, target);
        }
        else if (targetCoords.wy > originCoords.wy) {
            corner1 = new RoomPosition(0, 49, target);
            corner2 = new RoomPosition(49, 0, target);
        }
        else {
            corner1 = new RoomPosition(0, 0, target);
            corner2 = new RoomPosition(0, 49, target);
        }
    }
    else {
        if (targetCoords.wy < originCoords.wy) {
            corner1 = new RoomPosition(0, 49, target);
            corner2 = new RoomPosition(49, 49, target);
        }
        else {
            corner1 = new RoomPosition(0, 0, target);
            corner2 = new RoomPosition(49, 0, target);
        }
    }
    Game.map.visual.rect(new RoomPosition(0, 0, target), 50, 50, { stroke: '#ffffff', fill: 'transparent' });
    Game.map.visual.poly([corner1, origin, corner2], { stroke: '#ffffff', fill: 'transparent' });
};

const runPowerSpawn = () => {
    var _a, _b;
    for (const office in Memory.offices) {
        const powerSpawn = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.powerSpawn.structure;
        powerSpawn === null || powerSpawn === void 0 ? void 0 : powerSpawn.processPower();
    }
};

const findAlliedCreeps = (room) => {
    if (!Game.rooms[room])
        return [];
    // Return hostile creeps, if they are whitelisted
    return Game.rooms[room].find(FIND_HOSTILE_CREEPS, { filter: creep => WHITELIST.includes(creep.owner.username) });
};

const rampartState = new Map();
const runRamparts = () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    for (const room in Memory.offices) {
        rampartState.set(room, (_c = (_b = (_a = roomPlans(room)) === null || _a === void 0 ? void 0 : _a.perimeter) === null || _b === void 0 ? void 0 : _b.ramparts.some(r => { var _a; return (_a = r.structure) === null || _a === void 0 ? void 0 : _a.isPublic; })) !== null && _c !== void 0 ? _c : false);
        if (findHostileCreeps(room).length) {
            if (rampartState.get(room))
                (_e = (_d = roomPlans(room)) === null || _d === void 0 ? void 0 : _d.perimeter) === null || _e === void 0 ? void 0 : _e.ramparts.forEach(r => { var _a; return (_a = r.structure) === null || _a === void 0 ? void 0 : _a.setPublic(false); });
        }
        else if (findAlliedCreeps(room).length) {
            if (!rampartState.get(room))
                (_g = (_f = roomPlans(room)) === null || _f === void 0 ? void 0 : _f.perimeter) === null || _g === void 0 ? void 0 : _g.ramparts.forEach(r => { var _a; return (_a = r.structure) === null || _a === void 0 ? void 0 : _a.setPublic(true); });
        }
        // auto safe mode if ramparts are broken and we have hostile creeps or no tower
        if (rampartsAreBroken(room) &&
            !((_h = Game.rooms[room].controller) === null || _h === void 0 ? void 0 : _h.safeMode) &&
            ((_j = Game.rooms[room].controller) === null || _j === void 0 ? void 0 : _j.safeModeAvailable) &&
            (totalCreepStats(findHostileCreeps(room)).score > 30 || ((_l = (_k = roomPlans(room)) === null || _k === void 0 ? void 0 : _k.backfill) === null || _l === void 0 ? void 0 : _l.towers.every(t => !t.survey())))) {
            (_m = Game.rooms[room].controller) === null || _m === void 0 ? void 0 : _m.activateSafeMode();
        }
    }
};

function terminalBalance(office, resource) {
    var _a, _b, _c, _d;
    return (_d = (_c = (_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure) === null || _c === void 0 ? void 0 : _c.store.getUsedCapacity(resource)) !== null && _d !== void 0 ? _d : 0;
}

const TERMINAL_SEND_THRESHOLD = 100;
const runTerminal = () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const maxDeficits = new Map();
    const maxSurpluses = new Map();
    const terminalsUsed = new Set();
    for (let office in Memory.offices) {
        if (!((_b = (_a = roomPlans(office)) === null || _a === void 0 ? void 0 : _a.headquarters) === null || _b === void 0 ? void 0 : _b.terminal.structure))
            continue;
        const surpluses = officeResourceSurplus(office);
        for (let [resource, amount] of surpluses) {
            if (((_d = (_c = maxDeficits.get(resource)) === null || _c === void 0 ? void 0 : _c[1]) !== null && _d !== void 0 ? _d : 0) > amount) {
                maxDeficits.set(resource, [office, amount]);
            }
            if (((_f = (_e = maxSurpluses.get(resource)) === null || _e === void 0 ? void 0 : _e[1]) !== null && _f !== void 0 ? _f : 0) < amount) {
                maxSurpluses.set(resource, [office, amount]);
            }
        }
    }
    for (let [resource, [office, amount]] of maxSurpluses) {
        const terminal = (_h = (_g = roomPlans(office)) === null || _g === void 0 ? void 0 : _g.headquarters) === null || _h === void 0 ? void 0 : _h.terminal.structure;
        if (terminalsUsed.has(office) || !terminal || (terminal === null || terminal === void 0 ? void 0 : terminal.cooldown))
            continue; // Already sent resources this tick
        // if (resource === RESOURCE_ENERGY && rcl(office) !== 8) continue; // Surplus energy should go to upgrading this room
        const [targetOffice, targetAmount] = (_j = maxDeficits.get(resource)) !== null && _j !== void 0 ? _j : [];
        if (targetOffice && targetAmount && Math.abs(targetAmount) > TERMINAL_SEND_THRESHOLD) {
            // Office should transfer resource to targetOffice
            const transferAmount = Math.min(Math.abs(amount), Math.abs(targetAmount));
            if (transferAmount > TERMINAL_SEND_THRESHOLD) {
                Game.market.calcTransactionCost(transferAmount, office, targetOffice);
                const result = terminal.send(resource, transferAmount, targetOffice, 'BalancingResources');
                if (result === OK) {
                    terminalsUsed.add(office);
                }
            }
        }
        else if (resource !== RESOURCE_ENERGY && amount > TERMINAL_SEND_THRESHOLD) {
            // Do not sell surplus energy
            const order = _.max(allMarketOrders().filter(o => o.resourceType === resource && o.type === ORDER_BUY && o.amount > 0), o => o.price);
            if (order) {
                order.roomName ? Game.market.calcTransactionCost(Math.min(Math.abs(amount), order.amount), office, order.roomName) : 0;
                Game.market.deal(order.id, Math.min(amount, order.amount), office);
            }
        }
    }
    for (let [resource, [office, amount]] of maxDeficits) {
        const terminal = (_l = (_k = roomPlans(office)) === null || _k === void 0 ? void 0 : _k.headquarters) === null || _l === void 0 ? void 0 : _l.terminal.structure;
        if (terminalsUsed.has(office) || !terminal || (terminal === null || terminal === void 0 ? void 0 : terminal.cooldown))
            continue; // Already sent resources this tick
        if (resource === RESOURCE_ENERGY)
            continue; // don't buy energy
        const [targetOffice] = (_m = maxSurpluses.get(resource)) !== null && _m !== void 0 ? _m : [];
        if (!targetOffice && Math.abs(amount) > TERMINAL_SEND_THRESHOLD) {
            // No surplus of this product available, buy it on the market
            const order = _.min(allMarketOrders().filter(o => o.resourceType === resource && o.type === ORDER_SELL && o.amount > 0 && o.price < Game.market.credits), o => o.price);
            if (order) {
                const cost = order.roomName ? Game.market.calcTransactionCost(Math.min(Math.abs(amount), order.amount), office, order.roomName) : 0;
                // Don't execute trades for more than 1/10th of energy in Terminal
                // TODO replace this with budget for trades
                if (cost < terminalBalance(office, RESOURCE_ENERGY) / 10) {
                    Game.market.deal(order.id, Math.min(Math.abs(amount), order.amount), office);
                }
            }
        }
    }
};

/**
 * Based on https://github.com/screeps/engine/blob/master/src/processor/intents/towers/attack.js#L32
 */
const towerDamage = (tower, pos) => {
    if (!tower || !pos)
        return 0;
    const range = Math.min(TOWER_FALLOFF_RANGE, tower.pos.getRangeTo(pos));
    let amount = TOWER_POWER_ATTACK;
    if (range > TOWER_OPTIMAL_RANGE) {
        amount -= amount * TOWER_FALLOFF * (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
    }
    return amount;
};

const runTowers = () => {
    var _a, _b;
    for (let office in Memory.offices) {
        const plan = roomPlans(office);
        if (!(plan === null || plan === void 0 ? void 0 : plan.backfill) || !Game.rooms[office])
            return;
        // Count active towers
        // Select the target that will take the most damage
        const targets = findHostileCreeps(office);
        let priorityTarget = undefined;
        let bestDamage = 0;
        for (let target of targets) {
            const damage = plan.backfill.towers.reduce((sum, t) => sum + towerDamage(t.structure, target.pos), 0);
            const exitRange = (_b = (_a = target.pos.findClosestByRange(FIND_EXIT)) === null || _a === void 0 ? void 0 : _a.getRangeTo(target)) !== null && _b !== void 0 ? _b : 50;
            const selfHeal = target.getActiveBodyparts(HEAL) * HEAL_POWER;
            const allyHeal = findHostileCreepsInRange(target.pos, RANGED_HEAL_RANGE).reduce((sum, ally) => {
                return (sum +
                    ally.getActiveBodyparts(HEAL) * (ally.pos.inRangeTo(target.pos, HEAL_RANGE) ? HEAL_POWER : RANGED_HEAL_POWER));
            }, 0);
            const netDamage = exitRange > 2 ? damage - (selfHeal + allyHeal) : 0; // Assume creeps within range of an exit will escape for healing
            if (netDamage > bestDamage) {
                priorityTarget = target;
                bestDamage = netDamage;
            }
        }
        // Attack the target, if found
        if (priorityTarget) {
            for (let t of plan.backfill.towers) {
                if (!t.structure)
                    continue;
                t.structure.attack(priorityTarget);
            }
        }
    }
};

const runStructures = () => {
    runTowers();
    runLinks();
    runTerminal();
    runLabs();
    runObserver();
    runPowerSpawn();
    runRamparts();
};

function cleanUpCreeps() {
    if (Game.time % 10 !== 0)
        return;
    for (const k in Memory.creeps) {
        if (!Game.creeps[k]) {
            delete Memory.creeps[k];
        }
    }
}

let done = false;
/**
 * Initializes first spawn for autoplacement in private servers
 */
function initializeSpawn() {
    var _a, _b;
    if (done)
        return;
    const offices = Object.keys(Memory.offices);
    if (offices.length === 1 && !getSpawns(offices[0]).length)
        if (((_b = (_a = roomPlans(offices[0])) === null || _a === void 0 ? void 0 : _a.fastfiller) === null || _b === void 0 ? void 0 : _b.spawns[0].pos.createConstructionSite(STRUCTURE_SPAWN)) === OK) {
            // place initial spawn site
            done = true;
        }
}

const DEBUG_IN_MEMORY = true;
const gameLoop = () => {
    main_28();
    cleanUpCreeps();
    cleanMissions();
    displayBucket();
    displayGcl();
    displayGpl();
    displaySpawn();
    resetDebugCPU(DEBUG_IN_MEMORY);
    debugCPU('gameLoop setup');
    runScheduled();
    debugCPU('Scheduled tasks');
    // Cache data where needed
    runIntel();
    debugCPU('runIntel');
    // Office loop
    // logCpuStart()
    runMissionControl();
    debugCPU('Missions');
    purgeOrphanedMissions();
    main_29({ visualize: false });
    debugCPU('Traffic Management');
    runStructures();
    debugCPU('Structures');
    planRooms();
    debugCPU('planRooms');
    recordMetrics();
    run();
    // Setup first spawn if needed
    initializeSpawn();
    debugCPU('metrics');
    recordOverhead();
    // roomPlans('W12S3')?.perimeter?.ramparts.forEach(r =>
    //   viz(r.pos.roomName).circle(r.pos.x, r.pos.y, { radius: 0.5, fill: r.structure ? 'green' : 'red' })
    // );
    // if (Game.time % 100 === 0) reportAccuracyLedger();
    // if (Game.time % 100 === 0) reportLogisticsLedger();
    // if (Game.time % 100 === 0) reportHarvestLedger();
    if (Game.time % 100 === 0) {
        const memorySize = JSON.stringify(Memory).length;
        if (memorySize > 1000000) {
            console.log('Memory approaching dangerous levels:', memorySize);
            console.log(Object.keys(Memory)
                .map(k => `Memory.${k}: ${JSON.stringify(Memory[k]).length}`)
                .join('\n'));
        }
    }
};

// initialize
try {
    console.log('Global reset detected. Build time', new Date(JSON.parse('1676063030148')));
}
catch (_a) {
    // Ignore
}
global.purge = () => {
    Memory.flags = {};
    Memory.rooms = {};
    Memory.creeps = {};
    Memory.powerCreeps = {};
    Memory.offices = {};
    Memory.roomPlans = {};
    Memory.positions = {};
    Memory.stats = {
        time: Game.time,
        gcl: {
            progress: Game.gcl.progress,
            progressTotal: Game.gcl.progressTotal,
            level: Game.gcl.level
        },
        cpu: {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Game.cpu.getUsed(),
            heap: 0
        },
        creepCount: Object.keys(Game.creeps).length,
        officeCount: Object.keys(Memory.offices).length,
        profiling: {},
        offices: {}
    };
};
// If respawning, wipe memory clean
onRespawn(global.purge);
// profiler.enable()
const loop = () => {
    if (Game.cpu.bucket < 500) {
        console.log(`Waiting for bucket to reach 200 (currently ${Game.cpu.bucket})`);
        for (const k in Memory.stats.profiling) {
            console.log('-', k, Memory.stats.profiling[k]);
        }
        return; // If the bucket gets really low, let it rebuild
    }
    MemHack.pretick();
    // ErrorMapper.wrapLoop(mainLoop)();
    profiler.wrap(gameLoop);
};

exports.loop = loop;
//# sourceMappingURL=main.js.map
