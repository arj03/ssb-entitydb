#!/usr/bin/env node

require('ssb-client')(function (err, sbot) {
    if (err) throw err;

    var running = [];
    console.time("add");

    for (var i = 0; i < 10000; ++i)
        running.push({ type: 'entity', id: 1, values: { a: i, b: 2*i }});

    running.forEach(msg => {
        sbot.publish(msg, function(err) {
            if (err) throw err;

            running.pop();
            if (running.length == 0) {
                console.timeEnd("add");
                sbot.close();
            }
        });
    });
});
