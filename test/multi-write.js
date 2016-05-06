var tape = require('tape');
var multicb = require('multicb');
var pull = require('pull-stream');
var through = require('pull-through');
var ssbKeys = require('ssb-keys');
var u = require('scuttlebot/test/util');

var createSbot = require('scuttlebot')
        .use(require('scuttlebot/plugins/master'))
        .use(require('scuttlebot/plugins/gossip'))
        .use(require('scuttlebot/plugins/friends'))
        .use(require('scuttlebot/plugins/replicate'));

var lib = require('../entitydb.js');

function awaitGossip(sbot, sbot2, cb) {
  sbot2.latestSequence(sbot2.id, function (err, seq) {
      if (err) return cb(err);
      pull(
          sbot.createHistoryStream(sbot2.id, seq.sequence, true),
          pull.drain(function (msg) {
              cb();
              return false;
          })
      );
  });
};

tape('multi-write', function (t) {

    var pub = createSbot({
        temp: 'test-entitydb-multi-write-pub', timeout: 200,
        allowPrivate: true,
        keys: ssbKeys.generate()
    });

    var alice = createSbot({
        temp: 'test-entitydb-multi-write-alice', timeout: 200,
        allowPrivate: true,
        keys: ssbKeys.generate(),
        seeds: [pub.getAddress()]
    });

    var bob = createSbot({
        temp: 'test-entitydb-multi-write-bob', timeout: 200,
        allowPrivate: true,
        keys: ssbKeys.generate(),
        seeds: [pub.getAddress()]
    });

    console.log("alice is: " + alice.id);
    console.log("bob is: " + bob.id);

    t.test('alice and bob follow each other', function (t) {
        t.plan(1);
        var done = multicb();
        pub.publish(u.follow(alice.id), done());
        pub.publish(u.follow(bob.id), done());
        alice.publish(u.follow(bob.id), done());
        bob.publish(u.follow(alice.id), done());
        done(function (err, res) {
            t.error(err, 'published follows');
        });
    });

    var aliceDB = lib.entityDB("test", alice);
    var bobDB = lib.entityDB("test", bob);

    t.test('alice writes an entity', function (t) {
        aliceDB.write("t", 1, {a:0, b:1}, null, () => {
            awaitGossip(bob, alice, () => {
                pull(
                    bob.messagesByType({ type: "entity:test:t", fillCache: true, keys: false }),
                    pull.collect((err, data) => {
                        t.equal(data.length, 1, "one message inserted into database");
                        t.end();
                    })
                );
            });
        });
    });

    // non-conflict write
    t.test('bob updates alices entity', function (t) {
        bobDB.write("t", 1, {a:1, b:1}, null, () => {
            awaitGossip(alice, bob, () => {
                aliceDB.get("t", 1, entity => {
                    t.deepEqual(entity, {a:1, b:1});
                    t.end();
                });
            });
        });
    });

    t.test('close the sbots', function (t) {
        pub.close(null, function (err) {
            t.error(err, 'closed pub');
        });
        alice.close(null, function (err) {
            t.error(err, 'closed alice sbot');
        });
        bob.close(null, function (err) {
            t.error(err, 'closed bob sbot');
        });
        t.end();
    });
});
