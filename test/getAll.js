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
                     { type: "t", id: 1, values: {a:0, b:1} }], () => {
            pull
            (
                db.getAll("t"),
                pull.collect((err, data) => {
                    t.equal(data.length, 2, "two messages inserted into database");
                })
            );

            pull
            (
                db.getAll("t2"),
                pull.collect((err, data) => {
                    t.equal(data.length, 0, "namespaces work in getAll");
                })
            );

            pull
            (
                db.getAllById("t", 1),
                pull.collect((err, data) => {
                    t.equal(data.length, 2, "two messages with id 1 in database");
                })
            );

            pull
            (
                db.getAllById("t", 2),
                pull.collect((err, data) => {
                    t.equal(data.length, 0, "no messages with id 2 in database");
                })
            );

            pull
            (
                db.getAllById("t2", 1),
                pull.collect((err, data) => {
                    t.equal(data.length, 0, "namespaces work in getAllById");
                    t.end();
                })
            );

            sbot.close();
        });
    });
});
