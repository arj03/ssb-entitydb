# SSB entity DB

An entity database for [Scuttlebot applications](https://github.com/ssbc/scuttlebot).

## About

This interface lets you focus on writing applications, instead of
working with the SSB log. The entities can be written or changed by
any node, and these are replicated on the mesh network. It works just
like any eventually consistent database (CouchDB, or Riak), but it's
global and p2p.

The database consists of two modes. A write mode in which values are
appended to the local database. And a reader mode which reads all logs
in a current namespace and writes a log with merged values. This
seperation is inspired by CQRS.

Multiple users may update the database without locking.

#### Conflicts

If two users update a value at the same time, then both values will be kept.
This is technically a "conflict", though you may wish to keep all values.
Anyone can resolve the conflict by writing a new value.

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
include the nodes participating in the namespace. And should prune
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

 - `entityDB()`
 - `db.write()`
 - `db.writeAll()`
 - `db.get()`
 - `db.getAllById()`
 - `db.getAll()`
 - `db.onChange()`
 - `db.onTypeChange()`
 - `db.onEntityChange()`

---

### entityDB(namespace, [options])

Creates and returns a new database instance.

#### namespace

The `namespace` string is required.

Reads and writes will be scoped to the namespace, making it easier to
avoid accidental key collisions.

---

### db.write(type, id, values, metadata, cb)

Write an entity to the log.

---

### db.writeAll(array, [options], cb)

Complete a sequence of write operations. Array must consist of objects
with `type`, `id`, `type` and optional `metadata`.

---

### db.get(type, id, cb)

Gets the latest version (values) of an entity with a given `type` and
`id`.

---

### db.getAllById(type, id)

Streams all versions of an entity with a given `type` and `id`. Please note
this returns objects with values and metadata as opposed to get which
only returns values.

---

### db.getAll(type)

Returns as stream of sequential messages of a given `type` from the database.

---

### db.onChange()

Returns a stream of changes on all types.

---

### db.onTypeChange(type)

Returns a stream of changes on specific `type`

---

### db.onEntityChange(type, id)

Returns a stream of changes on specific `id` with `type`.
