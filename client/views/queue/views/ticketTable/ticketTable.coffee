limit = Meteor.settings?.public?.limitDefault || 20
offsetIncrement = Meteor.settings?.public?.offsetIncrement || 20

Template.ticketTable.onCreated ->
  @ticketOrder = new ReactiveVar []

  updateTicketOrder = =>
    queueName = Session.get('queueName') || _.pluck Queues.find().fetch(), 'name'
    filter = {
      queueName: queueName
      status: Iron.query.get 'status'
      tag: Iron.query.get 'tag'
      user: Iron.query.get 'user'
      associatedUser: Iron.query.get 'associatedUser'
    }
    mongoFilter = Filter.toMongoSelector filter
    sort = {}
    sort[Session.get 'sortBy'] = Session.get 'sortDirection'
    @ticketOrder.set Tickets.find(mongoFilter, {sort: sort}).map (t) -> t._id

  debouncedUpdateTicketOrder = _.debounce updateTicketOrder, 0

  @observeHandle = Tickets.find({}).observe
    added: -> debouncedUpdateTicketOrder()
    removed: -> debouncedUpdateTicketOrder()

  @autorun updateTicketOrder

Template.ticketTable.onDestroyed ->
  @observeHandle.stop()

Template.ticketTable.helpers
  search: ->
    Iron.query.get('search')? or Iron.query.get('status')? or Iron.query.get('tag')? or Iron.query.get('user')?
  ready: ->
    Session.get 'ready'
  firstVisibleTicket: ->
    if Tickets.find().count() is 0 then 0 else Session.get('offset') + 1
  lastVisibleTicket: ->
    if Session.get('ready')
      Math.min Session.get('offset') + Tickets.find().count(), Counts.get('ticketCount')
    else
      Math.min Session.get('offset') + offsetIncrement, Counts.get('ticketCount')
  lastDisabled: ->
    if Session.get('offset') is 0 then "disabled"
  nextDisabled: ->
    if (Session.get('offset') + offsetIncrement + 1) > Counts.get('ticketCount') then "disabled"
  tickets: ->
    Template.instance().ticketOrder.get().map (ticketId) ->
      Tickets.findOne ticketId
  noTickets: ->
    Tickets.find().count() is 0
  clientCount: ->
    Tickets.find().count()
  columns: ->
      ticketNumber: '#'
      title: 'Subject'
      requester: 'Requester'
      associatedUserIds: 'Associated'
      status: 'Status'
      lastUpdated: 'Updated'
      submittedTimestamp: 'Submitted'

Template.ticketTable_columnHeading.helpers
  columnWidth: (column) ->
    colWidth = 'col-md-' +
      if column == 'title'
        4
      else if column == 'requester' or column == 'associated'
        2
      else
        1
    colHiddenXS =
      if column == 'lastUpdated' or column == 'submittedTimestamp'
        'hidden-xs'
      else
        ''
    colWidth + ' ' + colHiddenXS
  sortByIs: (columnName) -> columnName == Session.get 'sortBy'
  sortDirectionIs: (sortDir) -> sortDir == Session.get 'sortDirection'
  labelFor: (value) ->
    Tickets.simpleSchema()._schema[value]?.label || value

Template.ticketTable_columnHeading.events
  'click .field-table-heading': (e, tpl) ->
    console.log 'click', @, arguments
    sortBy = Session.get 'sortBy'
    if sortBy == @name
      sortDirection = Session.get 'sortDirection'
      Session.set 'sortDirection', -1*sortDirection
    else
      Session.set 'sortBy', @name

Template.ticketTable.events
  'click button[data-action=nextPage]': (e, tpl) ->
    start = Number(Iron.query.get('start')) || 0
    if (start + offsetIncrement) < Counts.get('ticketCount')
      Session.set 'newTicketSet', []
      Iron.query.set 'start', start + offsetIncrement
  'click button[data-action=lastPage]': (e, tpl) ->
    start = Number(Iron.query.get('start')) || 0
    Iron.query.set 'start', Math.max start - offsetIncrement, 0
    Session.set 'newTicketSet', []

  'click a[data-action=clearSearch]': (e, tpl) ->
    e.stopPropagation()
    Iron.query.set 'search', ''
    Iron.query.set 'tag', ''
    Iron.query.set 'status', ''
    Iron.query.set 'user', ''
    Iron.query.set 'start', ''
