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

    lib.entityDB("test", sbot, db => {
        db.write("t", 1, {b:3, c:1}, null, () => {
            db.get("t", 1, values => {
                t.equal(values.b, 3, "Correct values stored");
                t.equal(values.c, 1, "Correct values stored");

                db.write("t", 1, {a:1, c:3}, null, () => {
                    db.get("t", 1, values => {
                        t.equal(values.a, 1, "Correct values stored");
                        t.equal(values.c, 3, "Correct values stored");
                        t.equal(values.b, undefined, "Last writer wins");
                        t.end();
                    });
                });
            });
            sbot.close();
        });
    });
});
