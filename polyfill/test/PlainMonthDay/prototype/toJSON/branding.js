// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plainmonthday.prototype.tojson
features: [Symbol]
---*/

const toJSON = Temporal.PlainMonthDay.prototype.toJSON;

assert.sameValue(typeof toJSON, "function");

assert.throws(TypeError, () => toJSON.call(undefined), "undefined");
assert.throws(TypeError, () => toJSON.call(null), "null");
assert.throws(TypeError, () => toJSON.call(true), "true");
assert.throws(TypeError, () => toJSON.call(""), "empty string");
assert.throws(TypeError, () => toJSON.call(Symbol()), "symbol");
assert.throws(TypeError, () => toJSON.call(1), "1");
assert.throws(TypeError, () => toJSON.call({}), "plain object");
assert.throws(TypeError, () => toJSON.call(Temporal.PlainMonthDay), "Temporal.PlainMonthDay");
assert.throws(TypeError, () => toJSON.call(Temporal.PlainMonthDay.prototype), "Temporal.PlainMonthDay.prototype");