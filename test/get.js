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
        temp: 'test-entitydb-get',
        keys: keys
    });

    var db = lib.entityDB("test", sbot);
    db.write("t", 1, {b:3, c:1}, null, () => {
        db.get("t", 1, values => {
            t.deepEqual(values, {b:3, c:1}, "Correct values stored");

            db.write("t", 1, {a:1, c:3}, null, () => {
                db.get("t", 1, values => {
                    t.deepEqual(values, {a:1, c:3}, "Correct values stored");
                    t.end();
                });
            });
        });
        sbot.close();
    });
});
