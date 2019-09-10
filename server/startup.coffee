Meteor.startup ->
  Tickets._ensureIndex
    "$**": "text"

  Changelog._ensureIndex
    ticketId: 1

  TicketFlags._ensureIndex
    ticketId: 1
    userId: 1

  Meteor.settings.queues.forEach (x) ->
    Queues.upsert { name: x.name }, { $set: { securityGroups: x.securityGroups, settings: x.settings } }
    queueAdminIds = _.compact x.admins.map (queueAdmin) ->
      Meteor.users.findOne({username: queueAdmin})?._id
    console.log "adding queue managers for #{x.name}", queueAdminIds
    Queues.update { name: x.name },
      $addToSet:
        managerIds:
          $each: queueAdminIds

  Facets._ensureIndex
    collection: 1
    facetString: 1

  Facets.configure Tickets,
    tags: [String]
    status: String
    associatedUserIds: [String]

