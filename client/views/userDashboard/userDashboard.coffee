Template.userDashboard.helpers
  queue: ->
    _.map Queues.find({memberIds: Meteor.userId()}).fetch(), (q) ->
      _.extend q,
        selected: if Meteor.user().defaultQueue is q.name then 'selected'

  notificationSettings: ->
    Meteor.user()?.notificationSettings

  saved: -> Template.instance().saved.get()
  user: -> Meteor.user()
  autoAssociatedUserIds: -> Template.instance().autoAssociatedUserIds.get()
  onRemoveUser: ->
    tpl = Template.instance()
    (e2, tpl2) ->
      aauids = _.without tpl.autoAssociatedUserIds.get(), tpl2.data.userId
      tpl.autoAssociatedUserIds.set aauids
  autoAssociatedByUserIds: -> Template.instance().autoAssociatedByUserIds.get()
  onRemoveAutoAssociatedByUser: ->
    tpl = Template.instance()
    (e2, tpl2) ->
      aabuids = _.without tpl.autoAssociatedByUserIds.get(), tpl2.data.userId
      tpl.autoAssociatedByUserIds.set aabuids
      removed = tpl.autoAssociatedByUserIdsToRemove.get()
      removed.push tpl2.data.userId
      tpl.autoAssociatedByUserIdsToRemove.set removed

Template.userDashboard.events
  'click button[data-action=submit]': (e, tpl) ->
    defaultQueue = tpl.$('select[name=defaultQueue]').val()
    notificationSettings = {}
    _.each tpl.$('input[type=checkbox]'), (i) ->
      if $(i).is(':checked')
        notificationSettings[i.name] = true
      else
        notificationSettings[i.name] = false

    Meteor.users.update Meteor.userId(), { $set:{
      defaultQueue: defaultQueue,
      notificationSettings: notificationSettings,
      autoAssociateUserIds: tpl.autoAssociatedUserIds.get()
    } },
      (err, res) ->
        if res then tpl.saved.set true

    Meteor.call 'removeUserFromAutoAssociation', tpl.autoAssociatedByUserIdsToRemove.get()
  'keyup input[name=assignUser]': (e, tpl) ->
    if e.which is 13 and $(e.target).val().length
      console.log 'keyup, checking username', $(e.target).val()
      id = Meteor.call 'checkUsername', $(e.target).val(), (err, res) ->
        if res
          addAutoAssociatedUser tpl, res
          $(e.target).val('')
        else
          tpl.associateUserError.set 'User not found.'
          setTimeout ->
            tpl.associateUserError.set null
          , 3000

  'autocompleteselect input[name=assignUser]': (e, tpl, doc) ->
    addAutoAssociatedUser tpl, doc._id
    $(e.target).val('')


  'click a[data-action=removeUser]': (e, tpl) ->
    # override event handler from userPortrait template
    console.log 'clicking removeUser in userDashboard'
    e.stopPropagation()
    return false

addAutoAssociatedUser = (tpl, associatedUserId) ->
  currentAutoAssociated = tpl.autoAssociatedUserIds.get()
  if currentAutoAssociated.indexOf associatedUserId == -1
    currentAutoAssociated.push associatedUserId
    currentAutoAssociated = _.uniq currentAutoAssociated
    tpl.autoAssociatedUserIds.set currentAutoAssociated

Template.userDashboard.rendered = () ->
  tpl = @
  tpl.find('#saved-message')._uihooks =
    insertElement: (node, next) ->
      $(node).hide().insertBefore(next).fadeIn(100).delay(3000).fadeOut 500, () ->
        @remove()
        tpl.saved.set false

Template.userDashboard.onCreated ->
  @saved = new ReactiveVar(false)
  console.log Meteor.user()
  @autoAssociatedUserIds = new ReactiveVar(Meteor.user().autoAssociateUserIds || [])
  @autoAssociatedByUserIds = new ReactiveVar(
    Meteor.users
      .find({autoAssociateUserIds: {$in: [Meteor.userId()] }})
      .map (u) -> u._id
  )
  @autoAssociatedByUserIdsToRemove = new ReactiveVar([])

Template.settingsCheckbox.helpers
  checked: ->
    if @setting then "checked"
