Template.manageQueue.onCreated ->
  queueName = Session.get 'queueName'

  @unsavedChanges = new ReactiveVar false

  @localQueue = new Mongo.Collection null
  @localQueue.attachSchema Queues.simpleSchema()

  @localQueueObserver = @localQueue.find({}).observe
    changed: =>
      @unsavedChanges.set true

  @autorun =>
    realQueueData = Queues.findOne {name: Session.get 'queueName'}
    if realQueueData
      console.log 'setting queue data', realQueueData
      @localQueue.upsert {name: queueName},
        $set:
          _.omit Queues.findOne({name: queueName}), '_id'
      @unsavedChanges.set false

  @addMemberError = new ReactiveVar null
  @addManagerError = new ReactiveVar null

  @extraFields = new ReactiveVar []
  Meteor.call 'getPotentialExtraFields', Session.get('queueName'), (err, res) =>
    if res
      @extraFields.set res.concat('tags')

Template.manageQueue.onDestroyed ->
  @localQueueObserver.stop()

Template.manageQueue.helpers
  queueName: -> Session.get 'queueName'
  queue: ->
    Queues.findOne({name: Session.get 'queueName'})
  unsavedChanges: ->
    Template.instance().unsavedChanges.get()
  extraColumns: ->
    Template.instance().extraFields.get()
  labelFor: (value) ->
    Tickets.simpleSchema()._schema[value]?.label || value
  checkedIf: (extraColumnName) ->
    if Template.instance().localQueue.findOne({name: Session.get 'queueName'})?.settings?.extraColumns.indexOf(extraColumnName) > -1
      "checked"
    #if Queues.findOne({name: Session.get 'queueName'})?.settings?.extraColumns.indexOf(extraColumnName) > -1
    #  "checked"
  queueName: -> Session.get 'queueName'
  hostname: ->
    window.location.hostname
  memberIds: ->
    Template.instance().localQueue.findOne()?.memberIds || []
    #Template.instance().memberIds.get()
  addMemberError: -> Template.instance().addMemberError.get()
  onRemoveMember: ->
    tpl = Template.instance()
    (e2, tpl2) ->
      tpl.localQueue.update {},
        $pull:
          memberIds: tpl2.data.userId
      #ids = _.without (tpl.localQueue.findOne()?.memberIds.get() || []), tpl2.data.userId
      #tpl.memberIds.set ids
  managerIds: ->
    Template.instance().localQueue.findOne()?.managerIds || []
    #Template.instance().managerIds.get()
  addManagerError: -> Template.instance().addManagerError.get()
  onRemoveManager: ->
    tpl = Template.instance()
    (e2, tpl2) ->
      tpl.localQueue.update {},
        $pull:
          managerIds: tpl2.data.userId
      #ids = _.without tpl.managerIds.get(), tpl2.data.userId
      #tpl.managerIds.set ids
  settings: -> Template.instance().localQueue.findOne()?.settings || {}


mkAutocompleteHandler = (addUserFunction, errorReactiveVar) ->
  (e, tpl) ->
    if e.which is 13 and $(e.target).val().length
      id = Meteor.call 'checkUsername', $(e.target).val(), (err, res) ->
        if res
          addUserFunction.apply @, [tpl, res]
          $(e.target).val('')
        else
          tpl[errorReactiveVar].set 'User not found.'
          setTimeout ->
            tpl[errorReactiveVar].set null
          , 3000

addMember = (tpl, memberId) ->
  tpl.localQueue.update {},
    $addToSet:
      memberIds: memberId
  #currentMemberIds = tpl.memberIds.get()
  #if currentMemberIds.indexOf memberId == -1
  #  currentMemberIds.push memberId
  #  currentMemberIds = _.uniq currentMemberIds
  #  console.log currentMemberIds
  #  tpl.memberIds.set currentMemberIds
 
addManager = (tpl, userId) ->
  tpl.localQueue.update {},
    $addToSet:
      managerIds: userId
  #ids = tpl.managerIds.get()
  #if ids.indexOf userId == -1
  #  ids.push userId
  #  ids = _.uniq ids
  #  console.log ids
  #  tpl.managerIds.set ids

Template.manageQueue.events
  'change input[class=extra-column-checkbox][type=checkbox]': (e, tpl) ->
    checkedInputs = tpl.$('input[type=checkbox]:checked')
    checkedValues = _.map(checkedInputs, (e) -> $(e).data('value'))
    tpl.localQueue.update {},
      $set:
        'settings.extraColumns': checkedValues
  'keyup input[name=addMember]': mkAutocompleteHandler(addMember, 'addMemberError')
  'autocompleteselect input[name=addMember]': (e, tpl, doc) ->
    addMember tpl, doc._id
    $(e.target).val('')
  'keyup input[name=addManager]': mkAutocompleteHandler(addManager, 'addManagerError')
  'autocompleteselect input[name=addManager]': (e, tpl, doc) ->
    addManager tpl, doc._id
    $(e.target).val('')
  'change input[name=email-ingestion-prefix]': (e, tpl) ->
    settings = tpl.localQueue.findOne({}).settings || {}
    settings.emailIngestionPrefix = $(e.target).val()
    console.log 'changed email ingestion prefix, settings: ', settings
    tpl.localQueue.update {},
      $set:
        settings: settings
        #'settings.emailIngestionPrefix': $(e.target).val()
  'click button[name=btn-save]': (e, tpl) ->
    if tpl.unsavedChanges.get()
      Queues.update Queues.findOne({name: Session.get('queueName')})._id,
        $set:
          _.omit tpl.localQueue.findOne({}), '_id'
      #Meteor.call 'updateQueueSettings', Session.get('queueName'), tpl.localQueue.findOne({}).settings, (err, res) ->
      #  if res
      #    tpl.unsavedChanges.set false
