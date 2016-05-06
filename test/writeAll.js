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
        temp: 'test-entitydb-writeall',
        keys: keys
    });

    var db = lib.entityDB("test", sbot);
    var data = [{ type: "t", id: 1, values: {b:3, c:1} },
                { type: "t", id: 2, values: {a:0, b:1} }];

    db.writeAll(data, () => {
        pull(
            sbot.messagesByType({ type: "entity:test:t", fillCache: true, keys: false }),
            pull.collect((err, dbData) => {
                t.equal(dbData.length, 2, "two messages inserted into database");
                t.end();
                sbot.close();
            })
        );
    });
});
