var pull = require('pull-stream');
var through = require('pull-through');

var self = module.exports = {

    getType: function(type)
    {
        return 'entity:' + self.namespace + ":" + type;
    },

    sbot: null,
    myId: "",
    latestTimestamp: 0,
    latestSeq: 0,
    namespace: "",
    serverMetadata: {}, // FIXME

    entityDB: function(namespace, sbot, cb)
    {
        if (!namespace) throw "Missing namespace";
        if (!sbot) throw "Missing sbot";

        self.namespace = namespace;
        self.sbot = sbot;
        sbot.whoami((err, info) => {
            if (err) throw err;

            self.myId = info.id;

            self.sbot.latestSequence(self.myId, (err, info) => {
                if (info != undefined) { // empty db
                    self.latestTimestamp = info.ts;
                    self.latestSeq = info.sequence;

                    console.log("latest seq: " + self.latestSeq);
                }

                pull(
                    self.onChange(),
                    through(data => {
                        self.latestTimestamp = data.value.timestamp;
                        self.latestSeq = data.value.sequence;
                        console.log("latest seq: " + self.latestSeq);
                    }),
                    pull.log() // don't swallow console.log
                );

                cb(self);
            });
        });
    },

    write: function(type, id, values, metadata, cb)
    {
        var mergedMetadata = Object.assign(self.serverMetadata, metadata);

        self.sbot.publish({ type: self.getType(type), id: id, metadata: mergedMetadata, values: values }, cb);
    },

    writeAll: function(array, cb)
    {
        var running = [];

        array.forEach(entity => {
            running.push(entity);
            self.write(entity.type, entity.id, entity.values, entity.metadata, err => {
                if (err) throw err;

                running.pop();
                if (running.length == 0)
                    cb();
            });
        });
    },

    get: function(type, id, cb)
    {
        pull(
            self.sbot.messagesByType({ type: self.getType(type), fillCache: true, keys: false }),
            pull.collect((err, log) => {
                if (err) throw err;

                var entity = {};

                log.forEach(msg => {
                    if (msg.content.id == id)
                        entity = Object.assign(entity, msg.content.values);
                });

                cb(entity);
            })
        );
    },

    getAllById: function(type, id)
    {
        return pull(
            self.getAll(type),
            pull.filter(data => data.content.id == id)
        );
    },

    getAll: function(type)
    {
        return self.sbot.messagesByType({ type: self.getType(type), fillCache: true, keys: false });
    },

    onChange()
    {
        return self.sbot.createHistoryStream({ live: true, id: self.myId, seq: self.latestSeq + 1 });
    },

    onTypeChange(type)
    {
        return self.sbot.messagesByType({ live: true, type: self.getType(type), gt: self.latestTimestamp,
                                          fillCache: true, keys: false });
    },

    onEntityChange(type, id)
    {
        return pull(
            self.onTypeChange(type),
            pull.filter(data => data.content.id == id)
        );
    }
};
