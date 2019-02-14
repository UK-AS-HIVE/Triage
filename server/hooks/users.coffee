if Npm.require('cluster').isMaster
  Meteor.users.after.update (userId, doc, fieldNames, modifier) ->
    #console.log "users.after.update", userId, fieldNames, modifier
    if _.contains fieldNames, 'autoAssociateUserIds'
      addedUserIds = _.difference doc.autoAssociateUserIds, @previous.autoAssociateUserIds
      console.log "added: ", addedUserIds
      addedBy = Meteor.users.findOne(userId)
      _.each addedUserIds, (addedId) ->
        added = Meteor.users.findOne(addedId)
        dashboardHref = Meteor.absoluteUrl("/my/dashboard")
        Email.send
          from: Meteor.settings.email?.fromEmail || "triagebot@as.uky.edu"
          bcc: added.mail
          subject: "User #{addedBy.username} has selected to share tickets with you"
          html: """
                <p>@#{addedBy.username} (#{addedBy.displayName}) has selected to share tickets with you.  In the future,
                you will be automatically associated with any tickets submitted by
                @#{addedBy.username}.</p>
                <p>If you wish to remove yourself, you can do so by
                <a href=\"#{dashboardHref}\">updating your preferences</a>.</p>
                """
