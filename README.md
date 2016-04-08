# SSB entity DB

An entity database for [Scuttlebot applications](https://github.com/ssbc/scuttlebot).

## About

This interface lets you focus on writing applications, instead of
working with the SSB log. The entities can be written or changes by
any node, and then replicated on the mesh network. It works just like
any Eventually-Consistent database (CouchDB, or Riak), but it's global
and p2p.

The database consists of two modes. A write mode in which values are
appended to the local database. And a reader mode which reads all logs
in a current namespace and writes a log with merged values. This
seperation is inspired by CQRS.

Multiple users may update the database without locking.

#### Conflicts

If two users update a value at the same time, then both values will be kept.
This is technically a "conflict", though you may wish to keep all values.
You can resolve the conflict by writing a new value.

#### Entities

Entities consists of the following fields:

Type: The type of the entity

Id: A unique identifier for the entity. Two entities with the same id
and type are considered the same.

Metadata: Dictionary of system specific metadata such as a list of
latest sequence number for nodes, an application specific which could
include things such as timestamps and usernames. Please note that
these application specific attributes are only used for debugging, as
opposed to system specific. Sequence number of nodes should only
include the nodes participating in the name space. And should prune
old inactive nodes.

Values: For values we differentiate between write mode and read modes.
Write can never have conflicts as they are local and as such is just a
dictionary of attribute to value mappings. Read modes on the other
hand potentially be in conflict if two nodes write to the same
attribute without seeing each other changes (see metadata). In this
case attribute values becomes a list of objects with the following
attributes: { value: <v1>, node: <nodeid>, sequence: <node-sequence> }.

#### Deletes

The api has no specific delete operation. Delete should be implemented
as an attribute on the entity. It is the job of the reader to
interpret this in an application specific way. The default
implementation will treat `n` concurrent updates with a delete among
them as a delete.

## API

 - `entitydb()`
 - `db.write()`
 - `db.get()`
 - `db.batch()`
 - `db.createReadStream()`
 - `db.on("change")`
 - `db.on("change:<type>,<id>")`

---

### entitydb(namespace, [options])

Creates and returns a new database instance.

#### namespace

The `namespace` string is required.

Reads and writes will be scoped to the namespace, making it easier to
avoid accidental key collisions.

---

### db.write(entity, [options], cb)

Write an entity to the log.

---

### db.get(type, id, [options], cb)

Get the entity with a given type and id.

---

### db.batch(array, [options], cb)

Complete a sequence of write operations.

---

### db.createReadStream([options])

Read sequentially from the database.

Options maybe include `type` and `id`. These are indexed.

---

### db.on("change")

Emitted when any entity is written/updated.

---

### db.on("change:{type}")

Emitted when any entity of `type` is written/updated.

---

### db.on("change:{type},{id}")

Emitted when the entity with `id` of `type` is written/updated.
