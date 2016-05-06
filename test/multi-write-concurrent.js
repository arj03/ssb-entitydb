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
        temp: 'test-entitydb-multi-write-conflict-pub', timeout: 200,
        allowPrivate: true,
        keys: ssbKeys.generate()
    });

    var alice = createSbot({
        temp: 'test-entitydb-multi-write-conflict-alice', timeout: 200,
        allowPrivate: true,
        keys: ssbKeys.generate(),
        seeds: [pub.getAddress()]
    });

    var bob = createSbot({
        temp: 'test-entitydb-multi-write-conflict-bob', timeout: 200,
        allowPrivate: true,
        keys: ssbKeys.generate(),
        seeds: [pub.getAddress()]
    });

    var charlie = createSbot({
        temp: 'test-entitydb-multi-write-conflict-charlie', timeout: 200,
        allowPrivate: true,
        keys: ssbKeys.generate(),
        seeds: [pub.getAddress()]
    });

    console.log("alice is: " + alice.id);
    console.log("bob is: " + bob.id);
    console.log("charlie is: " + charlie.id);

    var aliceDB = lib.entityDB("test", alice),
        bobDB = lib.entityDB("test", bob),
        charlieDB = lib.entityDB("test", charlie);

    var aliceValue = Object.freeze({a:0, b:1}),
        bobValue = Object.freeze({a:1, b:1}),
        charlieValue = Object.freeze({a:1, b:2, c:3});

    t.test('alice writes an entity', function (t) {
        aliceDB.write("t", 1, aliceValue, null, () => {
            aliceDB.get("t", 1, entity => {
                t.deepEqual(entity, aliceValue, "values stored correctly");
                t.end();
            });
        });
    });

    t.test('bob writes an conflicting value', function (t) {
        bobDB.write("t", 1, bobValue, null, () => {
            bobDB.get("t", 1, entity => {
                t.deepEqual(entity, bobValue, "values stored correctly");
                t.end();
            });
        });
    });

    t.test('alice, bob and charlie follow each other', function (t) {
        t.plan(1);
        var done = multicb();

        pub.publish(u.follow(alice.id), done());
        pub.publish(u.follow(bob.id), done());
        pub.publish(u.follow(charlie.id), done());

        alice.publish(u.follow(bob.id), done());
        alice.publish(u.follow(charlie.id), done());

        bob.publish(u.follow(alice.id), done());
        bob.publish(u.follow(charlie.id), done());

        charlie.publish(u.follow(alice.id), done());
        charlie.publish(u.follow(bob.id), done());

        done(function (err, res) {
            t.error(err, 'published follows');
        });
    });

    t.test('get conflicting values', function (t) {
        awaitGossip(bob, alice, () => {
            bobDB.get("t", 1, entity => {
                t.equal(entity.length, 2, "2 versions available");

                if (entity[0].node == alice.id)
                    t.deepEqual(entity[0].values, aliceValue);
                else
                    t.deepEqual(entity[0].values, bobValue);

                if (entity[1].node == alice.id)
                    t.deepEqual(entity[1].values, aliceValue);
                else
                    t.deepEqual(entity[1].values, bobValue);

                console.log("bob v1: " + JSON.stringify(entity[0]));
                console.log("bob v2: " + JSON.stringify(entity[1]));

                awaitGossip(alice, bob, () => {
                    aliceDB.get("t", 1, entity => {

                        console.log(entity);

                        t.equal(entity.length, 2, "2 versions available");

                        if (entity[0].node == alice.id)
                            t.deepEqual(entity[0].values, aliceValue);
                        else
                            t.deepEqual(entity[0].values, bobValue);

                        if (entity[1].node == alice.id)
                            t.deepEqual(entity[1].values, aliceValue);
                        else
                            t.deepEqual(entity[1].values, bobValue);

                        console.log("alice v1: " + JSON.stringify(entity[0]));
                        console.log("alice v2: " + JSON.stringify(entity[1]));

                        awaitGossip(charlie, bob, () => {
                            charlieDB.write("t", 1, charlieValue, null, () => {
                                charlieDB.get("t", 1, entity => {
                                    t.deepEqual(entity, charlieValue, "resolving a conflict");

                                    awaitGossip(alice, charlie, () => {
                                        aliceDB.get("t", 1, entity => {
                                            t.deepEqual(entity, charlieValue, "alice agrees that conflict is resolved");
                                            awaitGossip(bob, charlie, () => {
                                                bobDB.get("t", 1, entity => {
                                                    t.deepEqual(entity, charlieValue, "bob agrees that conflict is resolved");
                                                    t.end();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    t.test('close the sbots', function (t) {
        t.plan(4);
        pub.close(null, function (err) {
            t.error(err, 'closed pub');
        });
        alice.close(null, function (err) {
            t.error(err, 'closed alice sbot');
        });
        bob.close(null, function (err) {
            t.error(err, 'closed bob sbot');
        });
        charlie.close(null, function (err) {
            t.error(err, 'closed pub');
        });
    });
});
