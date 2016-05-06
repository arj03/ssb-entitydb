var tape = require('tape');
var pull = require('pull-stream');
var through = require('pull-through');
var ssbKeys = require('ssb-keys');
var multicb = require('multicb');

var createSbot = require('scuttlebot')
        .use(require('scuttlebot/plugins/master'));

var lib = require('../entitydb.js');

tape('write', function (t) {

    var keys = ssbKeys.generate();

    var sbot = createSbot({
        temp: 'test-entitydb-onchange',
        keys: keys
    });

    var db = lib.entityDB("test", sbot);

    var done = multicb();
    var value = {b:3, c:1};

    pull(
        db.onTypeChange("t"),
        through(data => {
            t.deepEqual(data.content.values, value, "Got correct changes");
            done();
        }),
        pull.log() // don't swallow console.log
    );

    pull(
        db.onEntityChange("t", 1),
        through(data => {
            t.deepEqual(data.content.values, value, "Got correct changes");
            done();
        }),
        pull.log() // don't swallow console.log
    );

    pull(
        db.onChange(),
        through(data => {
            t.deepEqual(data.value.content.values, value, "Got correct changes");
            done();
        }),
        pull.log() // don't swallow console.log
    );

    done(() => {
        t.end();
        sbot.close();
    });

    db.write("t", 1, value, null);
});
