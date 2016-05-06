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

    var db = lib.entityDB("test", sbot);
    db.write("t", 1, {b:3, c:1}, null, () => {
        pull(
            sbot.messagesByType({ type: "entity:test:t", fillCache: true, keys: false }),
            pull.collect((err, data) => {
                t.deepEqual(data.content.values, {b:3, c:1}, "message correctly stored in database");
                t.end();
            })
        );
        sbot.close();
    });
});
