Meteor.startup ->
  Tickets._ensureIndex
    "$**": "text"

  Changelog._ensureIndex
    ticketId: 1

  TicketFlags._ensureIndex
    ticketId: 1
    userId: 1

  Meteor.settings.queues.forEach (x) ->
    setter =
      securityGroups: x.securityGroups
    if x.settings?
      Object.keys(x.settings).forEach (k) ->
        setter["settings.#{k}"] = x.settings[k]
    console.log "updating settings for #{x.name}", setter
    Queues.upsert { name: x.name }, { $set: setter }
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

