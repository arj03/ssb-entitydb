var pull = require('pull-stream');

var self = module.exports = {

    state: {
    },

    sbot: null,
    namespace: "",
    serverMetadata: {}, // FIXME

    entityDB: function(namespace, sbot, options)
    {
        if (!namespace) throw "Missing namespace";
        if (!sbot) throw "Missing sbot";

        self.namespace = namespace;
        self.sbot = sbot;
        return self;
    },

    write: function(type, id, values, metadata, cb)
    {
        var mergedMetadata = Object.assign(self.serverMetadata, metadata);

        self.sbot.publish({ type: 'entity:' + self.namespace + ":" + type,
                            id: id, metadata: mergedMetadata, values: values }, cb);
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
            self.sbot.messagesByType({ type: 'entity:' + self.namespace + ":" + type, fillCache: true, keys: false }),
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

    getAll: function(type, id, cb)
    {
        pull(
            self.sbot.messagesByType({ type: 'entity:' + self.namespace + ":" + type, fillCache: true, keys: false }),
            pull.collect((err, log) => {
                if (err) throw err;

                var values = [];

                log.forEach(msg => {
                    if (msg.content.id == id)
                        values.push(msg.content);
                });

                cb(values);
            })
        );
    }

    /*
    createReadStream([options])
    on("change")
    on("change:{type}")
    on("change:{type},{id}")
    */
};
