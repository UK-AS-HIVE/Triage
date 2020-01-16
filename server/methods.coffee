Meteor.methods
  checkUsername: (username) ->
    # If our user is already in Meteor.users, refresh their information.
    # If not, query LDAP and insert into Meteor.users if a match is found.
    user = Meteor.users.findOne {username: username.toLowerCase()}
    if user?
      Meteor.call 'refreshUserInformation', username.toLowerCase()
      return user._id
    else
      client = LDAP.createClient Meteor.settings.ldap.serverUrl
      LDAP.bind client, Meteor.settings.ldapDummy.username, Meteor.settings.ldapDummy.password
      userObj = LDAP.search client, username
      unless userObj?
        return false
      else
        return userId = Meteor.users.insert(userObj)

  refreshUserInformation: (username) ->
    if Meteor.settings.ldap?.debugMode then return
    client = LDAP.createClient Meteor.settings.ldap.serverUrl
    LDAP.bind client, Meteor.settings.ldapDummy.username, Meteor.settings.ldapDummy.password
    userObj = LDAP.search client, username
    if userObj
      Meteor.users.update { username: username.toLowerCase() }, { $set: userObj }

  closeSilently: (ticketId) ->
    ticket = Tickets.findOne(ticketId)
    if Queues.findOne { name: ticket.queueName, memberIds: @userId }
      d = new Date()
      Tickets.direct.update ticketId, { $set: {
        status: 'Closed'
        timeToClose: (d - ticket.submittedTimestamp) / 1000 # Amount of time to ticket close, in seconds.
        closedTimestamp: d
        closedByUserId: @userId
        closedByUsername: Meteor.users.findOne(@userId).username
        lastUpdated: new Date()
      } }

      Changelog.direct.insert
        ticketId: ticketId
        timestamp: new Date()
        authorId: @userId
        authorName: Meteor.users.findOne(@userId)?.username
        type: 'field'
        field: 'status'
        oldValue: ticket.status
        newValue: 'Closed'
