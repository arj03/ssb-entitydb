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

        pull(
            db.onTypeChange("t"),
            through(data => {
                t.equal(data.content.values.b, 3, "Got correct changes");
                t.equal(data.content.values.c, 1, "Got correct changes");
            }),
            pull.log() // don't swallow console.log
        );

        pull(
            db.onEntityChange("t", 1),
            through(data => {
                t.equal(data.content.values.b, 3, "Got correct changes");
                t.equal(data.content.values.c, 1, "Got correct changes");
            }),
            pull.log() // don't swallow console.log
        );

        pull(
            db.onChange(),
            through(data => {
                t.equal(data.value.content.values.b, 3, "Got correct changes");
                t.equal(data.value.content.values.c, 1, "Got correct changes");
                t.end();
            }),
            pull.log() // don't swallow console.log
        );
        
        db.write("t", 1, {b:3, c:1}, null, () => {
            sbot.close();
        });
    });
});
