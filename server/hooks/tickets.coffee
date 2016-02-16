if Npm.require('cluster').isMaster

  Tickets.before.insert (userId, doc) ->
    # Update tag and status collections for autocomplete.
    now = new Date()
    doc.tags?.forEach (x) ->
      Tags.upsert { name: x }, { $set: { lastUse: now } }

    Statuses.upsert { name: doc.status }, { $set: { lastUse: now } }

    # Update queue new counts.
    QueueBadgeCounts.update { queueName: doc.queueName, userId: { $ne: userId } }, { $inc: { count: 1 } }, { multi: true }

    # Set the ticket number, store the ticket submitter, server-side timestamp, notify author.
    doc = prepareTicket userId, doc
    notifyTicketAuthor userId, doc
    notifyAssociatedUsers doc
    
    # Add ticketNumber and author's displayName and department to the text index.
    author = Meteor.users.findOne(doc.authorId)
    Job.push new TextAggregateJob
      ticketId: doc._id
      text: [ author?.displayName, author?.department, doc.ticketNumber?.toString() ]

    if doc.attachmentIds
      text = []
      _.each doc.attachmentIds, (id) ->
        text.push(FileRegistry.findOne(id).filename)
      Job.push new TextAggregateJob
        ticketId: doc._id
        text: text

  Tickets.before.update (userId, doc, fieldNames, modifier, options) ->
    _.each fieldNames, (fn) ->

      if fn is 'attachmentIds' and modifier.$addToSet?.attachmentIds
        id = modifier.$addToSet.attachmentIds
        console.log FileRegistry.findOne(id).filename
        Job.push new TextAggregateJob
          ticketId: doc._id
          text: [FileRegistry.findOne(id).filename]

      if fn is 'status' and modifier.$set.status is 'Closed'
        d = new Date()
        Tickets.direct.update doc._id, { $set: {
          timeToClose: (d - doc.submittedTimestamp) / 1000 # Amount of time to ticket close, in seconds.
          closedTimestamp: d
          closedByUserId:  userId
          closedByUsername: Meteor.users.findOne(userId).username
        } }

      getEventMessagesFromUpdate userId, doc, fn, modifier

  # Flag ticket as unread for associated users when it's updated
  Tickets.after.update (userId, doc, fieldNames, modifier, options) ->
    if doc.authorId != userId
      TicketFlags.upsert {userId: doc.authorId, ticketId: doc._id, k: 'unread'},
        $set:
          v: true
    _.each doc.associatedUserIds, (u) ->
      if u != userId
        TicketFlags.upsert {userId: u, ticketId: doc._id, k: 'unread'},
          $set:
            v: true

notifyTicketAuthor = (userId, doc) ->
  author = Meteor.users.findOne(doc.authorId)
  if author?.notificationSettings?.submitted
    title = escape(doc.title)
    body = escape(doc.body)
    subject = "Triage ticket ##{doc.ticketNumber} submitted: #{title}"
    message = "You submitted ticket ##{doc.ticketNumber} with body:<br>#{body}"
    queue = Queues.findOne({name: doc.queueName})
    if (doc.submissionData?.method is "Form" and queue.settings?.notifyOnAPISubmit) or !(doc.submissionData?.method is "Form")
      Job.push new NotificationJob
        ticketId: doc._id
        bcc: author.mail
        subject: subject
        html: message

notifyAssociatedUsers = (doc) ->
  recipients = []
  _.each doc.associatedUserIds, (u) ->
    user = Meteor.users.findOne(u)
    if user.notificationSettings?.associatedWithTicket
      recipients.push(user.mail)
  if recipients.length
    subject = "You have been associated with Triage ticket ##{doc.ticketNumber}: #{escape(doc.title)}"
    message = "You are now associated with ticket ##{doc.ticketNumber}.<br>
    The original ticket body was:<br>#{escape(doc.body)}"
    Job.push new NotificationJob
      ticketId: doc._id
      bcc: recipients
      subject: subject
      html: message


prepareTicket = (userId, doc) ->
  #Record of 'true' submitter.
  d = doc
  if userId then d.submittedByUserId = userId

  #Sequential ticket numbering.
  max = Tickets.findOne({}, {sort:{ticketNumber:-1}})?.ticketNumber || 0
  d.ticketNumber = max + 1

  #Server-side timestamping.
  now = new Date()
  d.submittedTimestamp = now

  return d

getEventMessagesFromUpdate = (userId, doc, fn, modifier) ->
  user = Meteor.users.findOne(userId)
  author = Meteor.users.findOne(doc.authorId)
  title = escape(doc.title)
  body = escape(doc.body)
  switch fn
    when 'queueName'
      type = "field"
      oldValue = doc.queueName
      newValue = modifier.$set.queueName

    when 'tags'
      type = "field"
      if modifier.$addToSet?.tags?
        tags = _.difference modifier.$addToSet.tags.$each, doc.tags
        unless tags.length is 0
          newValue = "#{tags}"
          _.each tags, (x) ->
            Tags.upsert { name: x }, { $set: { lastUse: new Date() } }

      if modifier.$pull?.tags?
        oldValue = "#{modifier.$pull.tags}" #in case its an array.

    when 'status'
      oldStatus = escape(doc.status)
      newStatus = escape(modifier.$set.status)
      unless oldStatus is newStatus
        Statuses.upsert { name: newStatus }, { $set: { lastUse: new Date() } }
        type = "field"
        oldValue = oldStatus
        newValue = newStatus
        subject = "User #{user.username} changed status for Triage ticket ##{doc.ticketNumber}: #{title}"
        emailBody ="<strong>User #{user.username} changed status for ticket ##{doc.ticketNumber} from
          #{oldStatus} to #{newStatus}.</strong><br>
          The original ticket body was:<br>
          #{body}"

        recipients = []
        if author.notificationSettings?.authorStatusChanged
          recipients.push(author.mail)

        _.each doc.associatedUserIds, (a) ->
          aUser = Meteor.users.findOne(a)
          if aUser.notificationSettings?.associatedStatusChanged
            recipients.push(aUser.mail)


    when 'associatedUserIds'
      type = "field"
      recipients = []
      subject = "You have been associated with Triage ticket ##{doc.ticketNumber}: #{title}"
      emailBody = "You are now associated with ticket ##{doc.ticketNumber}.<br>
      The original ticket body was:<br>#{body}"
      if modifier.$addToSet?.associatedUserIds?.$each?
        associatedUsers = _.map _.difference(modifier.$addToSet.associatedUserIds.$each, doc.associatedUserIds), (x) ->
          u = Meteor.users.findOne({_id: x})
          if u.notificationSettings.associatedWithTicket
            recipients.push u.mail
          return u.username
        unless associatedUsers.length is 0
          newValue = "#{associatedUsers}"
      else if modifier.$addToSet?.associatedUserIds?
        unless _.contains doc.associatedUserIds, modifier.$addToSet.associatedUserIds
          u = Meteor.users.findOne(modifier.$addToSet.associatedUserIds)
          if u.notificationSettings.associatedWithTicket
            recipients.push u.mail
          newValue = "#{u.username}"
      else if modifier.$pull?.associatedUserIds?
        associatedUser = Meteor.users.findOne({_id: modifier.$pull.associatedUserIds}).username
        oldValue = "#{associatedUser}"

    when 'attachmentIds'
      type = "attachment"
      if modifier.$addToSet?.attachmentIds
        file = FileRegistry.findOne modifier.$addToSet.attachmentIds
        otherId = file._id
        newValue = file.filename
        subject = "User #{user.username} added an attachment to Triage ticket ##{doc.ticketNumber}: #{title}"
        emailBody = "Attachment #{file.filename} added to ticket #{doc.ticketNumber}.
          The original ticket body was:<br>#{body}"

        recipients = []
        if author.notificationSettings?.authorAttachment
          recipients.push(author.mail)

        _.each doc.associatedUserIds, (a) ->
          aUser = Meteor.users.findOne(a)
          if aUser.notificationSettings?.associatedAttachment
            recipients.push(aUser.mail)

      else if modifier.$pull?.attachmentIds
        file = FileRegistry.findOne modifier.$pull.attachmentIds
        otherId = file._id
        oldValue = file.filename
        changelog = "removed attached file #{file.filename}"

  if (oldValue or newValue)
    Changelog.direct.insert
      ticketId: doc._id
      timestamp: new Date()
      authorId: user._id
      authorName: user.username
      type: type
      field: fn
      oldValue: oldValue
      newValue: newValue
      otherId: otherId

  if emailBody and (recipients.length > 0)
    Job.push new NotificationJob
      bcc: _.uniq(recipients)
      ticketId: doc._id
      subject: subject
      html: emailBody
