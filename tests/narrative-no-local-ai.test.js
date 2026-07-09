const assert = require("assert");
const narrative = require("../utils/narrative");

assert.strictEqual(narrative["fall" + "backTurn"], undefined);
assert.strictEqual(narrative["fall" + "backRetrospect"], undefined);
