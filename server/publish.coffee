Meteor.publishComposite 'tickets', (filter, sortBy, sortDirection, offset, limit) ->
  sort = {}
  sort[sortBy] = sortDirection
  if offset < 0 then offset = 0
  if Filter.verifyFilterObject filter, _.pluck(Queues.find({memberIds: @userId}).fetch(), 'name'), @userId
    mongoFilter = Filter.toMongoSelector filter
    [ticketSet, facets] = Tickets.findWithFacets(mongoFilter, {sort: sort, limit: limit, skip: offset})
    ticketSet = _.pluck ticketSet.fetch(), '_id'
  else
    ticketSet = []
  {
    find: () ->
      Counts.publish(this, 'ticketCount', Tickets.find(mongoFilter), { noReady: true })

      Tickets.find { _id: { $in: ticketSet } },
        sort: sort
        fields:
          emailMessageIDs: 0
          additionalText: 0
          extraFieldOrder: 0
    children: [
      {
        find: (ticket) ->
          filter = { ticketId: ticket._id, type: "note" }
          if not Queues.findOne({name: ticket.queueName, memberIds: @userId})? then _.extend filter, { internal: { $ne: true } }
          Counts.publish(this, "#{ticket._id}-noteCount", Changelog.find(filter))
          TicketFlags.find { ticketId: ticket._id, userId: @userId }
      },
      {
        find: ->
          facets
      }
    ]
  }

Meteor.publishComposite 'newTickets', (filter, time) ->
  if Filter.verifyFilterObject filter, _.pluck(Queues.find({memberIds: @userId}).fetch(), 'name'), @userId
    mongoFilter = Filter.toMongoSelector filter
    _.extend mongoFilter, { submittedTimestamp: { $gt: time } }
  {
    find: () ->
      Tickets.find mongoFilter,
        sort:
          submittedTimestamp: -1
        fields:
          emailMessageIDs: 0
          additionalText: 0
          extraFieldOrder: 0
    children: [
      {
        find: (ticket) ->
          Counts.publish(this, "#{ticket._id}-noteCount", Changelog.find({ticketId: ticket._id, type: "note"}))
          TicketFlags.find { ticketId: ticket._id, userId: @userId }
      }
    ]
  }

Meteor.publishComposite 'ticketSet', (ticketSet) ->
  {
    find: () ->
      if not ticketSet then return
      queues = _.pluck Queues.find({memberIds: @userId}).fetch(), 'name'
      Tickets.find {
        _id: { $in: ticketSet },
        $or: [
          { associatedUserIds: @userId },
          { authorId: @userId },
          { queueName: { $in: queues } }
        ] },
        {sort: {submittedTimestamp: -1}}
    children: [
      {
        find: (ticket) ->
          Counts.publish(this, "#{ticket._id}-noteCount", Changelog.find({ticketId: ticket._id, type: "note"}))
          TicketFlags.find { ticketId: ticket._id, userId: @userId }
      }
    ]
  }



Meteor.publishComposite 'ticket', (ticketNumber) ->
  {
    find: () ->
      username = Meteor.users.findOne(@userId).username
      queues = _.pluck Queues.find({memberIds: @userId}).fetch(), 'name'
      return Tickets.find
        ticketNumber: ticketNumber,
        $or: [
          { associatedUserIds: @userId },
          { authorId: @userId },
          { authorName: username },
          { queueName: { $in: queues } }
        ]

    children: [
      {
        find: (ticket) ->
          filter = { ticketId: ticket._id }
          if not Queues.findOne({name: ticket.queueName, memberIds: @userId})? then _.extend filter, { internal: { $ne: true } }
          Changelog.find filter
      },
      {
        find: (ticket) ->
          TicketFlags.find { ticketId: ticket._id, userId: @userId }
      },
      {
        find: (ticket) ->
          if ticket.attachmentIds?.length > 0
            FileRegistry.find { _id: { $in: ticket.attachmentIds } }
      }
    ]
  }

Meteor.publish 'userData', ->
  Meteor.users.find { _id: @userId }

Meteor.publish 'allUserData', ->
  if @userId
    Meteor.users.find {}, { fields: { '_id': 1, 'username': 1, 'mail': 1, 'displayName': 1, 'department': 1, 'physicalDeliveryOfficeName': 1, 'status.online': 1, 'status.idle': 1 } }

Meteor.publish 'queueNames', ->
  if @userId
    Queues.find {}, { fields: { 'name': 1, 'memberIds': 1, 'stats': 1 } }

Meteor.publish 'queueDetails', (queueName) ->
  if @userId
    Queues.find name: queueName

Meteor.publish 'tags', ->
  if @userId
    Tags.find {}, { fields: { 'name': 1 }, sort: { lastUse: -1 }, limit: 100 }

Meteor.publish 'statuses', ->
  if @userId
    Statuses.find {}, { fields: { 'name': 1 }, sort: { lastUse: -1 }, limit: 100 }

Meteor.publish 'queueCounts', ->
  QueueBadgeCounts.find { userId: @userId }

Meteor.publish 'unattachedFiles', (fileIds) ->
  # Only return the files if they're not associated with a ticket yet for some security.
  unless Tickets.findOne { attachmentIds: {$in: fileIds } }
    return FileRegistry.find { _id: {$in: fileIds } }

Meteor.publish 'file', (fileId) ->
  queues = _.pluck Queues.find({memberIds: @userId}).fetch(), 'name'
  username = Meteor.users.findOne(@userId).username
  if Tickets.findOne { attachmentIds: fileId , $or: [
    { associatedUserIds: @userId },
    { authorId: @userId },
    { authorName: username },
    { queueName: { $in: queues } }
  ] }
    return FileRegistry.find { _id: fileId }
