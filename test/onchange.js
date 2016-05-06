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

    pull(
        db.onTypeChange("t"),
        through(data => {
            t.equal(data.content.values.b, 3, "Got correct changes");
            t.equal(data.content.values.c, 1, "Got correct changes");
            done();
        }),
        pull.log() // don't swallow console.log
    );

    pull(
        db.onEntityChange("t", 1),
        through(data => {
            t.equal(data.content.values.b, 3, "Got correct changes");
            t.equal(data.content.values.c, 1, "Got correct changes");
            done();
        }),
        pull.log() // don't swallow console.log
    );

    pull(
        db.onChange(),
        through(data => {
            t.equal(data.value.content.values.b, 3, "Got correct changes");
            t.equal(data.value.content.values.c, 1, "Got correct changes");
            done();
        }),
        pull.log() // don't swallow console.log
    );

    done(() => t.end());

    db.write("t", 1, {b:3, c:1}, null, () => {
        sbot.close();
    });
});
