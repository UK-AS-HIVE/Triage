Template.ticketNoteArea.helpers
  changelog: ->
    items = Changelog.find {ticketId: @_id}, {sort: timestamp: 1}
    { items: items, count: items.count() }
    
  queueMember: ->
    _.contains Queues.findOne({name: @queueName})?.memberIds, Meteor.userId()

Template.ticketChangelogItem.helpers
  internalNoteClass: ->
    if @internal then 'internal-note'
  changeIsType: (type) ->
    @type is type
  fieldIs: (field) ->
    @field is field
  note: ->
    if this.type is "note" then return true else return false
  file: ->
    FileRegistry.findOne {_id: this.valueOf()}
  noteParagraph: ->
    @message.split('\n')

Template.ticketChangelogItem.events
  'click a[data-action=showAttachmentModal]': (e, tpl) ->
    Iron.query.set 'attachmentId', @valueOf()

Template.ticketInfoPanels.onCreated ->
  @associateUserError = new ReactiveVar ""

Template.ticketInfoPanels.onRendered ->
  doc = @find 'div[name=attachments]'
  doc.ondragover = (e) ->
    @className = 'hover'
    e.preventDefault()
    false


  doc.ondragend = (e) ->
    @className = ''
    e.preventDefault()
    false

  data = @data

  doc.ondrop = (e) ->
    e.preventDefault()
    for item in e.dataTransfer.items
      entry = item.webkitGetAsEntry()
      traverse = (item, path) ->
        path = path || ''
        if item.isFile
          item.file (file) ->
            FileRegistry.upload file, (fileId) ->
              Tickets.update data._id, {$addToSet: {attachmentIds: fileId}}
              Meteor.call 'setFlag', Meteor.userId(), data._id, 'attachment', true
        else if item.isDirectory
          item.createReader().readEntries (entries) ->
            traverse entry, path + item.name + '/' for entry in entries
      traverse entry, ''
    false

Template.ticketInfoPanels.helpers
  queueMember: ->
    _.contains Queues.findOne({name: @queueName})?.memberIds, Meteor.userId()
  file: ->
    FileRegistry.findOne {_id: this.valueOf()}
  associateUserError: ->
    Template.instance().associateUserError.get()

Template.removeAttachmentModal.helpers
  attachment: -> FileRegistry.findOne(@attachmentId)
  ticket: -> Tickets.findOne(@ticketId)

Template.removeAttachmentModal.events
  'click button[data-action=removeAttachment]': (e, tpl) ->
    Tickets.update @ticketId, {$pull: {attachmentIds: @attachmentId}}
    $('#removeAttachmentModal').modal('hide')

  'show.bs.modal': (e, tpl) ->
    zIndex = 1040 + ( 10 * $('.modal:visible').length)
    $(e.target).css('z-index', zIndex)
    setTimeout ->
      $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack')
    , 0

  'hidden.bs.modal': (e, tpl) ->
    Blaze.remove tpl.view
    if $('.modal:visible').length
      $('body').addClass('modal-open')


Template.ticketInfoPanels.events
  'click a[data-action=showAttachmentModal]': (e, tpl) ->
    Iron.query.set 'attachmentId', @valueOf()
  'click a[data-action=removeAttachment]': (e, tpl) ->
    data = { attachmentId: this.valueOf(), ticketId: tpl.data._id }
    Blaze.renderWithData(Template['removeAttachmentModal'], data, $('body').get(0))
    $('#removeAttachmentModal').modal('show')

  'keyup input[name=addTag]': (e, tpl) ->
    if e.which is 13
      val = $(e.target).val()?.split(' ')
      val = _.filter val, (x) -> x.length > 0
      Tickets.update tpl.data._id, { $addToSet: { tags: $each: val } }
      $(e.target).val('')

  'autocompleteselect input[name=addTag]': (e, tpl, doc) ->
    Tickets.update tpl.data._id, { $addToSet: { tags: doc.name } }
    $(e.target).val('')

  'keyup input[name=associateUser]': (e, tpl) ->
    if e.which is 13 and $(e.target).val().length
      id = Meteor.call 'checkUsername', $(e.target).val(), (err, res) ->
        if res
          associateUser tpl, res
          $(e.target).val('')
        else
          tpl.associateUserError.set 'User not found.'
          setTimeout ->
            tpl.associateUserError.set null
          , 3000

  'autocompleteselect input[name=associateUser]': (e, tpl, doc) ->
    associateUser tpl, doc._id
    $(e.target).val('')

  ### Uploading files. ###
  'click a[data-action=uploadFile]': (e, tpl) ->
    Media.pickLocalFile (fileId) ->
      console.log "Uploaded a file, got _id: ", fileId
      Tickets.update tpl.data._id, {$addToSet: {attachmentIds: fileId}}
      Meteor.call 'setFlag', Meteor.userId(), tpl.data._id, 'attachment', true
  'click a[data-action=takePicture]': (e, tpl) ->
    Media.capturePhoto (fileId) ->
      console.log "Uploaded a file, got _id: ", fileId
      Tickets.update tpl.data._id, {$addToSet: {attachmentIds: fileId}}
      Meteor.call 'setFlag', Meteor.userId(), tpl.data._id, 'attachment', true

associateUser = (tpl, associatedUserId) ->
  queueMember = Queues.findOne({name: tpl.data.queueName, memberIds: Meteor.userId()})
  associatedQueueMember = Queues.findOne({name: tpl.data.queueName, memberIds: associatedUserId})
  if queueMember or !associatedQueueMember
    Tickets.update tpl.data._id, { $addToSet: { associatedUserIds: associatedUserId } }
  else
    tpl.associateUserError.set 'You do not have permission to associate this user.'
    setTimeout ->
      tpl.associateUserError.set null
    , 3000

Template.ticketNoteInput.helpers
  allowStatusChange: ->
    if Tickets.findOne(@ticketId).status isnt "Closed"
      return true
    else
      sinceClose = (Date.now() - Tickets.findOne(@ticketId).closedTimestamp)/1000
      max = Meteor.settings?.public?.reopenAllowedTimespan
      return sinceClose < max
  closed: -> Tickets.findOne(@ticketId).status is "Closed"
  beta: -> Meteor.settings.public.beta
  status: -> Tickets.findOne(@ticketId).status
  statusSettings: ->
    {
      position: "bottom"
      limit: 5
      rules: [
        collection: Statuses
        field: 'name'
        template: Template.statusPill
        noMatchTemplate: Template.noMatchStatusPill
      ]
    }

Template.ticketNoteInput.events
  'click button[name=addNote]': (e, tpl) ->
    addNote e, tpl, false, false

  'click button[name=addNoteAdmin]': (e, tpl) ->
    addNote e, tpl, true, false

  'click button[name=addInternalNote]': (e, tpl) ->
    addNote e, tpl, true, true

  'click button[name=addNoteAndReOpen]': (e, tpl) ->
    if tpl.$('textarea[name=newNote]').val().trim().length > 0
      addNote e, tpl, true, false
    Tickets.update tpl.data.ticketId, { $set: {status: 'Open'} }

  'click button[name=addNoteAndClose]': (e, tpl) ->
    if tpl.$('textarea[name=newNote]').val().trim().length > 0
      addNote e, tpl, true, false
    Tickets.update tpl.data.ticketId, { $set: {status: 'Closed'} }

  'click button[name=closeSilently]': (e, tpl) ->
    Meteor.call 'closeSilently', tpl.data.ticketId

  'input textarea[name=newNote]': (e, tpl) ->
    if $(e.target).val() is ""
      tpl.$('button[name=addNoteAndReOpen]').text("Re-Open Ticket")
      tpl.$('button[name=addNoteAndClose]').text("Close Ticket")
    else
      tpl.$('button[name=addNoteAndReOpen]').text('Add Note and Re-Open')
      tpl.$('button[name=addNoteAndClose]').text('Add Note and Close')

  'click .dropdown-menu[name=statusMenu]': (e, tpl) ->
    e.stopPropagation()

  'click .dropdown-menu[name=statusMenu] a': (e, tpl) ->
    ticket = Tickets.findOne(@ticketId)
    unless ticket.status is $(e.target).html()
      Tickets.update @ticketId, {$set: {status: $(e.target).html()}}
    tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle')
  
  'autocompleteselect input[name=customStatus]': (e, tpl, doc) ->
    Tickets.update tpl.data.ticketId, { $set: { status: doc.name } }
    $(e.target).val("")
    tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle')

  'keyup input[name=customStatus]': (e, tpl) ->
    if e.which is 13
      Tickets.update tpl.data.ticketId, { $set: { status: $(e.target).val() } }
      $(e.target).val("")
      tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle')


  ### Uploading files. ###
  'click a[data-action=uploadFile]': (e, tpl) ->
    Media.pickLocalFile (fileId) ->
      console.log "Uploaded a file, got _id: ", fileId
      Tickets.update @ticketId, {$addToSet: {attachmentIds: fileId}}
      Meteor.call 'setFlag', Meteor.userId(), @ticketId, 'attachment', true

 
addNote = (e, tpl, admin, internal) ->
  # Adds notes given the event and template.
  # Admin flag will result in parsing for status.
  # Other notes will be parsed for tags and associated users.
  # Internal flag will add an internal note.
  unless admin then internal = false
  ticket = Tickets.findOne(tpl.data.ticketId)
  body = tpl.$('textarea[name=newNote]').val()
  hashtags = Parsers.getTags body
  users = Parsers.getUserIds body

  if users?.length > 0
    unless admin
      users = _.filter users, (u) ->
        !Queues.findOne({name: ticket.queueName, memberIds: u})?
    Tickets.update tpl.data.ticketId, {$addToSet: {associatedUserIds: $each: users}}

  if hashtags?.length > 0
    Tickets.update tpl.data.ticketId, {$addToSet: {tags: $each: hashtags}}

  if admin
    status = Parsers.getStatuses body
    if status?.length > 0
      Tickets.update tpl.data.ticketId, {$set: {status: status[0]}} #If multiple results, just use the first.

  if body
    Changelog.insert
      ticketId: tpl.data.ticketId
      timestamp: new Date()
      authorId: Meteor.userId()
      authorName: Meteor.user().username
      internal: internal
      type: "note"
      message: body

  Meteor.call 'setFlag', Meteor.userId(), tpl.data.ticketId, 'replied', true

  tpl.$('textarea[name=newNote]').val('')

  tpl.$('button[name=addNoteAndReOpen]').text("Re-Open Ticket")
  tpl.$('button[name=addNoteAndClose]').text("Close Ticket")
  
Template.ticketTag.events
  'click a[data-action=removeTag]': (e, tpl) ->
    e.preventDefault()
    ticketId = Template.parentData(1)._id
    Tickets.update {_id: ticketId}, {$pull: {tags: this.valueOf()}}
  
  'click a[data-action=addTagFilter]': (e, tpl) ->
    e.preventDefault()
    value = this.valueOf()
    filter = Iron.query.get('tag')?.split(',') || []
    unless filter.indexOf(value) > -1
      filter.push(value)
    Iron.query.set 'tag', filter.join()

Template.ticketHeadingPanels.helpers
  queueMember: ->
    _.contains Queues.findOne({name: @queueName})?.memberIds, Meteor.userId()
  submittedByOther: ->
    @submittedByUserId and @authorId isnt @submittedByUserId
  author: ->
    Meteor.users.findOne {_id: @authorId}

Template.ticketHeadingPanels.events
  'click a[name="changeQueue"]': (e, tpl) ->
    Blaze.renderWithData Template.sendToAnotherQueueModal, { ticketId: @_id }, $('body').get(0)
    $('#sendToAnotherQueueModal').modal('show')

Template.formFieldsPanel.onCreated ->
  this.panelIsCollapsed = new ReactiveVar(true)

Template.formFieldsPanel.helpers
  collapsed: -> Template.instance().panelIsCollapsed.get()
  extraFields: ->
    _.omit @, '_id', Tickets.simpleSchema()._schemaKeys

Template.formFieldsPanel.events
  'show.bs.collapse': (e, tpl) ->
    tpl.panelIsCollapsed.set false

  'hide.bs.collapse': (e, tpl) ->
    tpl.panelIsCollapsed.set true
