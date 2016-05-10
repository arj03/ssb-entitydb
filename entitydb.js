var pull = require('pull-stream');
var through = require('pull-through');
var multicb = require('multicb');

module.exports = {

    getType: function(type)
    {
        return 'entity:' + this.namespace + ":" + type;
    },

    sbot: null,
    myId: "",
    latestTimestamp: 0,
    latestSeq: 0,
    namespace: "",
    serverMetadata: {},

    entityDB: function(namespace, sbot, cb)
    {
        if (!namespace) throw "Missing namespace";
        if (!sbot) throw "Missing sbot";

        var self = Object.create(this);

        self.namespace = namespace;
        self.sbot = sbot;
        self.myId = sbot.id;

        pull(
            self.sbot.createLogStream({ live: true }),
            through(data => {
                if (data.sync)
                    return;

                if (data.value.author == self.myId)
                {
                    self.latestTimestamp = data.value.timestamp;
                    self.latestSeq = data.value.sequence;
                    console.log(self.myId + ", latest seq: " + self.latestSeq);
                }
                else if (data.value.content.type.indexOf("entity:" + self.namespace) != -1 &&
                         data.value.author != self.myId)
                {
                    console.log(self.myId + ": updating metadata on ", data.value.author + ", seq: " + data.value.sequence);
                    self.serverMetadata[data.value.author] = data.value.sequence;
                }
            }),
            pull.log() // don't swallow console.log
        );

        return self;
    },

    write: function(type, id, values, metadata, cb)
    {
        var mergedMetadata = Object.assign(this.serverMetadata, metadata);

        this.sbot.publish({ type: this.getType(type), id: id, metadata: mergedMetadata, values: values }, cb);
    },

    writeAll: function(array, cb)
    {
        var done = multicb();

        array.forEach(entity => {
            this.write(entity.type, entity.id, entity.values, entity.metadata, done());
        });

        done(cb);
    },

    get: function(type, id, cb)
    {
        pull(
            this.getAllById(type, id),
            pull.collect((err, log) => {
                if (err) throw err;

                var entity = [];

                log.forEach(msg => {
                    if (entity.length == 0)
                    {
                        entity.push({ node: msg.author,
                                      sequence: msg.sequence,
                                      values: msg.content.values });
                    }
                    else if (entity.length == 1 && entity[0].node == msg.author)
                    {
                        entity[0].sequence = msg.sequence;
                        entity[0].values = msg.content.values;
                    }
                    else // potential conflicts
                    {
                        var allGood = true;
                        entity.forEach(e => {
                            if ((msg.content.metadata[e.node] || 0) < e.sequence)
                                allGood = false;
                        });

                        if (allGood)
                            entity = [];

                        entity.push({ node: msg.author,
                                      sequence: msg.sequence,
                                      values: msg.content.values });
                    }
                });

                if (entity.length == 1)
                    cb(entity[0].values);
                else
                    cb(entity);
            })
        );
    },

    getAllById: function(type, id)
    {
        return pull(
            this.getAll(type),
            pull.filter(data => data.content.id == id)
        );
    },

    getAll: function(type)
    {
        return this.sbot.messagesByType({ type: this.getType(type), fillCache: true, keys: false });
    },

    onChange()
    {
        return pull(
            this.sbot.createHistoryStream({ live: true, id: this.myId, seq: this.latestSeq + 1 }),
            pull.filter(data => data.value.content.type.indexOf("entity:" + this.namespace) != -1)
        );
    },

    onOwnTypeChange(type)
    {
        return pull(
            this.sbot.createHistoryStream({ live: true, id: this.myId, seq: this.latestSeq + 1 }),
            pull.filter(data =>  {
                return (data.value.content.type.indexOf("entity:" + this.namespace) != -1 &&
                        data.value.author == self.myId);
            })
        );
    },

    onOwnEntityChange(type, id)
    {
        return pull(
            this.onOwnTypeChange(type),
            pull.filter(data => data.content.id == id)
        );
    },

    onAllTypeChange(type)
    {
        return this.sbot.messagesByType({ live: true, type: this.getType(type), gt: this.latestTimestamp,
                                          fillCache: true, keys: false });
    },

    onAllEntityChange(type, id)
    {
        return pull(
            this.onAllTypeChange(type),
            pull.filter(data => data.content.id == id)
        );
    }
};
