Migrations.add
  version: 1
  up: ->
    Tickets.update({associatedUserIds: { $exists: false } }, {$set: { associatedUserIds: [] } }, {multi: true} )

Migrations.add
  version: 2
  up: ->
    _.each Tickets.find().fetch(), (doc) ->
      author = Meteor.users.findOne(doc.authorId)
      Tickets.update doc._id, { $addToSet: { additionalText: { $each: [ author?.displayName, author?.department ] } } }

Migrations.add
  version: 3
  up: ->
    _.each Tickets.find({timeToClose: {$exists: true}, closedTimestamp: {$exists: false}}).fetch(), (doc) ->
      Tickets.update doc._id,
        $set:
          closedTimestamp: new Date(doc.submittedTimestamp.getTime() + doc.timeToClose*1000)

Migrations.add
  version: 4
  up: ->
    _.each Tickets.find().fetch(), (doc) ->
      Tickets.direct.update doc._id, { $addToSet: { additionalText: doc.ticketNumber.toString() } }

Migrations.add
  version: 5
  up: ->
    Tickets.find().forEach (doc) ->
      Tickets.direct.update doc._id,
        $set:
          lastUpdated: Changelog.findOne(ticketId: doc._id, {sort: {timestamp: -1}})?.timestamp || doc.submittedTimestamp

Migrations.add
  version: 6
  up: ->
    try
      Tickets._dropIndex "title_text_body_text_additionalText_text_authorName_text_ticketNumber_text_formFields_text"
    catch e
      console.log e
    Tickets._ensureIndex
      "$**": "text"
  down: ->
    try
      Tickets._dropIndex "$**_text"
    catch e
      console.log e
    Tickets._ensureIndex
      title: "text"
      body: "text"
      additionalText: "text"
      authorName: "text"
      ticketNumber: "text"
      formFields: "text"

Migrations.add
  version: 7
  up: ->
    Tickets.find({formFields: {$exists: 1}}).forEach (t) ->
      console.log 'Migrating ticket ', t.ticketNumber
      t = _.extend (_.omit t, 'formFields'), t.formFields
      Tickets.direct.update {_id: t._id}, t, {bypassCollection2: true}
  down: ->
    Tickets.find({}).forEach (t) ->
      extraFields = _.omit t, ['_id'].concat(Tickets.simpleSchema()._schemaKeys)
      t = _.omit t, (_.keys extraFields)
      id = t._id
      delete t._id
      t.formFields = extraFields
      console.log 'Reverting migrated ticket ', t.ticketNumber
      Tickets.direct.update {_id: id}, t, {validate: false, filter: false}

Meteor.startup ->
  Migrations.migrateTo(7)

