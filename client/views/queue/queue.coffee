limit = Meteor.settings?.public?.limitDefault || 20
offsetIncrement = Meteor.settings?.public?.offsetIncrement || 20

Template.queue.helpers
  beta: ->
    Meteor.settings.public.beta
  ready: ->
    Session.get 'ready'
  connected: ->
    Meteor.status().connected
  members: ->
    Queues.findOne({name: Session.get('queueName')})?.memberIds
  shouldShowTicketButtons: ->
    # Member of at least one queue, or no submission URL set.
    Queues.findOne({memberIds: Meteor.userId()}) or !Meteor.settings.public.ticketSubmissionUrl
  queueName: ->
    Session.get 'queueName'
  addingTicket: ->
    Session.get 'addingTicket'
  pseudoqueue: ->
    Session.get('pseudoQueue') in ['globalQueue', 'userQueue']
  queues: ->
    Queues.find()
  selected: ->
    if Session.get('pseudoQueue')
      if @name is Meteor.user().defaultQueue then "selected"
    else
      if @name is Session.get('queueName') then "selected"
  submissionUrl: ->
    Meteor.settings.public.ticketSubmissionUrl
  isQueueManager: ->
    managerIds = Queues.findOne({name: Session.get('queueName')})?.managerIds
    managerIds? and managerIds.indexOf(Meteor.userId()) > -1

Template.queue.events
  'click button[data-action=showNewTicketModal]': (e, tpl) ->
    Blaze.render Template.newTicketModal, $('body').get(0)
    $('#newTicketModal').modal('show')

  'click button[data-action=openQuickAdd]': (e, tpl) ->
    Session.set 'addingTicket', !Session.get('addingTicket')

  'keyup input[name=newTicket]': (e, tpl) ->
    if e.which is 13
      submitQuickAddTicket tpl

  'keyup input[name=newTicketStatus]': (e, tpl) ->
    if e.which is 13
      submitQuickAddTicket tpl

  'click button[name=quickAddTicket]': (e, tpl) ->
    submitQuickAddTicket tpl

submitQuickAddTicket = (tpl) ->
  tpl.$('.has-error').removeClass('has-error')
  body = tpl.$('input[name=newTicket]').val()
  if body is "" then tpl.$('input[name=newTicket]').closest('div').addClass('has-error')
  status = tpl.$('input[name=newTicketStatus]').val()
  if status is "" then tpl.$('input[name=newTicketStatus]').closest('div').addClass('has-error')
  queue = tpl.$('select[name=queue]')?.val() || Session.get('queueName')
  tags = Parsers.getTags body
  users = Parsers.getUserIds body
  if tpl.$('.has-error').length is 0
    Tickets.insert
      title: body
      body: body
      tags: tags
      associatedUserIds: users
      queueName: queue
      authorId: Meteor.userId()
      authorName: Meteor.user().username
      status: status
      submittedTimestamp: new Date()
      submissionData:
        method: "Web"

    tpl.$('input[name=newTicket]').val('')


Template.queue.rendered = ->
  Session.set 'newTicketSet', []
  @subscribe 'queueNames'

  @autorun ->
    # Render ticketModal on query parameter change.
    ticketParam = Iron.query.get('ticket')
    if ticketParam
      Meteor.subscribe 'ticket', Number(ticketParam)
      ticket = Tickets.findOne({ ticketNumber: Number(ticketParam) })

    if ticket and not $('#ticketModal').length
      Blaze.renderWithData Template.ticketModal, { ticketId: ticket._id }, $('body').get(0)
      $('#ticketModal').modal('show')
    else if not ticket
      # In case we navigate with the back button.
      $('#ticketModal').modal('hide')

  @autorun ->
    # Render attachment modal on query parameter change.
    attachmentParam = Iron.query.get('attachmentId')
    if attachmentParam and not $('#attachmentModal').length
      Meteor.subscribe 'file', attachmentParam
      file = FileRegistry.findOne(attachmentParam)
      if file
        Blaze.renderWithData Template.attachmentModal, { attachmentId: attachmentParam }, $('body').get(0)
        $('#attachmentModal').modal('show')
      else
        $('#attachmentModal').modal('hide')

    else if not attachmentParam
      # Navigating with back button or clearing query param manually should close the modal.
      $('#attachmentModal').modal('hide')
      

  @autorun ->
    # When queueName changes, reset the new set of tickets to an empty array.
    Session.get('queueName')
    Session.set 'newTicketSet', []

  @autorun ->
    # Highlighting of search terms.
    if Iron.query.get('search') and Session.get('ready')
      Meteor.setTimeout ->
        $('td').unhighlight()
        $('td').highlight(Iron.query.get('search')?.split(','))
      , 500

  @autorun ->
    renderedTime = new Date()
    queueName = Session.get('queueName') || _.pluck Queues.find().fetch(), 'name'
    filter = {
      queueName: queueName
      search: Iron.query.get 'search'
      status: Iron.query.get 'status'
      tag: Iron.query.get 'tag'
      user: Iron.query.get 'user'
      associatedUser: Iron.query.get 'associatedUser'
    }
    if Session.get('pseudoQueue') is 'userQueue'
      filter.userId = Meteor.userId()
    
    mongoFilter = Filter.toMongoSelector filter
    #_.extend mongoFilter, {submittedTimestamp: {$gt: renderedTime}}
    Tickets.find(mongoFilter).observe
      added: (ticket) ->
        if Session.get('offset') < 1
          Session.set 'newTicketSet', (_.uniq(Session.get('newTicketSet')?.concat(ticket._id)) || [ticket._id])
    Meteor.subscribe 'ticketSet', Session.get 'newTicketSet'
