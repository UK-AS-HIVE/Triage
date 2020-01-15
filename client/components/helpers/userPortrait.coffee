Template.userPortrait.helpers
  user: -> Meteor.users.findOne @userId
  online: ->
    if @fadeIfOffline
      if Meteor.users.findOne(@userId).status?.idle or not Meteor.users.findOne(@userId).status?.online
        return "offline"

Template.userPortrait.events
  'click a[data-action=removeUser]': (e, tpl) ->
    e.stopPropagation()
    if typeof tpl.data.onRemoveUser == "function"
      console.log 'custom onRemoveUser handler in userPortrait'
      tpl.data.onRemoveUser.apply @, arguments
    else
      ticketId = Template.parentData(2)._id
      Tickets.update {_id: ticketId}, {$pull: {associatedUserIds: this.userId}}

Template.userPortrait.rendered = ->
  this.$('img').error ->
    $(this).attr('src', 'http://www.as.uky.edu/sites/all/themes/bartikmod/images/missingpic.png')
