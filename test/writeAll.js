var tape = require('tape');
var pull = require('pull-stream');
var through = require('pull-through');
var ssbKeys = require('ssb-keys');

var createSbot = require('scuttlebot')
        .use(require('scuttlebot/plugins/master'));

var lib = require('../entitydb.js');

tape('write', function (t) {

    var keys = ssbKeys.generate();

    var sbot = createSbot({
        temp: 'test-entitydb-write',
        keys: keys
    });

    lib.entityDB("test", sbot, db => {
        db.writeAll([{ type: "t", id: 1, values: {b:3, c:1} },
                     { type: "t", id: 2, values: {a:0, b:1} }], () => {
            pull(
                sbot.messagesByType({ type: "entity:test:t", fillCache: true, keys: false }),
                pull.collect((err, data) => {
                    t.equal(data.length, 2, "two messages inserted into database");
                    t.end();
                })
            );
            sbot.close();
        });
    });
});
