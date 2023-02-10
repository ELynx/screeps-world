'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

Object.defineProperty(exports, "__esModule", { value: true });
require("core-js/es/array/flat-map");
require("core-js/es/array/flat");

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
global.PERMACACHE = {}; // Create a permanent cache for immutable items such as room names
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
    // Dynamic choose weight for roads, plains and swamps depending on body.
    if (opts === null || opts === void 0 ? void 0 : opts.creepMovementInfo) {
        actualOpts = __assign(__assign({}, actualOpts), defaultTerrainCosts(opts.creepMovementInfo));
    }
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
function defaultTerrainCosts(creepInfo) {
    var result = {
        roadCost: config.DEFAULT_MOVE_OPTS.roadCost || 1,
        plainCost: config.DEFAULT_MOVE_OPTS.plainCost || 2,
        swampCost: config.DEFAULT_MOVE_OPTS.swampCost || 10
    };
    var totalCarry = creepInfo.usedCapacity;
    var moveParts = 0;
    var usedCarryParts = 0;
    var otherBodyParts = 0;
    // Iterating right to left because carry parts are filled in that order.
    for (var i = creepInfo.body.length - 1; i >= 0; i--) {
        var bodyPart = creepInfo.body[i];
        if (bodyPart.type !== MOVE && bodyPart.type !== CARRY) {
            otherBodyParts++;
        }
        else if (bodyPart.hits <= 0) {
            continue;
        }
        else if (bodyPart.type === MOVE) {
            var boost = 1;
            if (bodyPart.boost) {
                boost = BOOSTS[MOVE][bodyPart.boost].fatigue;
            }
            moveParts += 1 * boost;
        }
        else if (totalCarry > 0 && bodyPart.type === CARRY) {
            var boost = 1;
            if (bodyPart.boost) {
                boost = BOOSTS[CARRY][bodyPart.boost].capacity;
            }
            // We count carry parts used by removing the capacity used by them from the total that the creep is carrying.
            // When total is empty, resting carry parts doesn't generate fatigue (even if they have no hits).
            totalCarry -= CARRY_CAPACITY * boost;
            usedCarryParts++;
        }
    }
    // If no move parts it can't move, skip and apply defaults to speed this up.
    if (moveParts > 0) {
        var fatigueFactor = usedCarryParts + otherBodyParts;
        var recoverFactor = moveParts * 2;
        // In case cost is 0 (only move parts), all terrains will cost 1.
        // Hardcoding 0.1 as minimum cost to obtain this result.
        var cost = Math.max(fatigueFactor / recoverFactor, 0.1);
        // Number of ticks that it takes move over each terrain.
        // Having this as a separated function could be interesting for obtaining how many ticks
        // it will take a creep to walk over a route with determined terrains.
        var roadCost = Math.ceil(cost);
        var plainCost = Math.ceil(cost * 2);
        var swampCost = Math.ceil(cost * 10);
        // Greatest common divisor.
        // https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/gcd.md
        var gcd_1 = function () {
            var arr = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                arr[_i] = arguments[_i];
            }
            var _gcd = function (x, y) { return (!y ? x : gcd_1(y, x % y)); };
            return __spreadArray([], __read(arr), false).reduce(function (a, b) { return _gcd(a, b); });
        };
        // Calculate the greatest common divisor so we can reduce the costs to the smallest numbers possible.
        var norm = gcd_1(roadCost, plainCost, swampCost);
        // Normalize and set the default costs. This costs are going to be always under the 255 limit.
        // Worst scenario is with 49 not move body parts and only 1 move part. This means a cost of 24.5,
        // implying 25 / 49 / 245 costs for each terrain.
        result.roadCost = roadCost / norm;
        result.plainCost = plainCost / norm;
        result.swampCost = swampCost / norm;
    }
    return result;
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
    var manuallyDefinedCosts = [opts === null || opts === void 0 ? void 0 : opts.roadCost, opts === null || opts === void 0 ? void 0 : opts.plainCost, opts === null || opts === void 0 ? void 0 : opts.swampCost].some(function (cost) { return cost !== undefined; });
    if ('body' in creep && !manuallyDefinedCosts) {
        actualOpts = __assign(__assign({}, actualOpts), { creepMovementInfo: { usedCapacity: creep.store.getUsedCapacity(), body: creep.body } });
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
//# sourceMappingURL=main.js.map
