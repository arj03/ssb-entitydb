#!/usr/bin/env node

var pull = require('pull-stream');
var through = require('pull-through');

var lib = require('./entitydb.js');

require('ssb-client')((err, sbot) => {
    if (err) throw err;

    lib.entityDB("test", sbot, db => {

        pull(
            //db.onChange(),
            //db.onTypeChange("t"),
            db.onEntityChange("t", 1),
            through(data => {
                console.log("got data change", data);
            }),
            pull.log() // don't swallow console.log
        );

        db.write("t", 1, {b:3, c:1}, null, () => {
            console.log("done");
        });
    });

    return;

    console.time("add");

    var running = [];

    for (var i = 0; i < 10000; ++i)
        running.push({ type: 't', id: 1, values: { a: i, b: 2*i }});

    db.writeAll(running, function(err) {
        if (err) throw err;

        console.timeEnd("add");
        sbot.close();
    });

    return;

    console.time("read");
    db.get("t", 1, entity => {
        console.log(entity);
        console.timeEnd("read");
        sbot.close();
    });

    return;

    /*
    db.write("t", 1, {b:3, c:1}, null, () => {
    });
     */

    db.getAll("t", 1, entityVersions => {
        entityVersions.forEach(entity => {
            console.log(entity);
        });
        sbot.close();
    });
});
