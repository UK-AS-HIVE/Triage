Template.ticketRow.events
  'click .ticket-row': (e) ->
    unless _.contains($(e.target)[0].classList, 'dropdown-toggle')
      Iron.query.set 'ticket', @ticketNumber

  'click .dropdown-menu[name=statusMenu]': (e, tpl) ->
    e.stopPropagation()

  'click .dropdown-menu[name=statusMenu] a': (e, tpl) ->
    unless @status is $(e.target).html()
      Tickets.update @_id, { $set: { status: $(e.target).html() } }
    tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle')

  'autocompleteselect input[name=customStatus]': (e, tpl, doc) ->
    Tickets.update tpl.data._id, { $set: { status: doc.name } }
    $(e.target).val("")
    tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle')
  
  'keyup input[name=customStatus]': (e, tpl) ->
    if e.which is 13
      Tickets.update tpl.data._id, { $set: { status: $(e.target).val() } }
      $(e.target).val("")
      tpl.$('.dropdown-toggle[name=statusButton]').dropdown('toggle')



Template.ticketRow.rendered = ->
  $('form[name=ticketForm]').submit (e) -> e.preventDefault()

Template.ticketRow.helpers
  queueMember: ->
    _.contains Queues.findOne({name: @queueName}).memberIds, Meteor.userId()
  changelog: ->
    Changelog.find {ticketId: @_id}, {sort: timestamp: 1}
  unread: ->
    TicketFlags.findOne({userId: Meteor.userId(), ticketId: @_id, k: 'unread'})?.v
  repliedTo: ->
    TicketFlags.findOne({userId: Meteor.userId(), ticketId: @_id, k: 'replied'})
  hasBeenUpdated: ->
    @lastUpdated?.getTime() != @submittedTimestamp?.getTime()
  hasAttachment: ->
    @attachmentIds?.length > 0
  noteCount: ->
    Counts.get("#{@_id}-noteCount") || null
  author: ->
    Meteor.users.findOne({_id: @authorId})
  printableFormFields: ->
    fields = _.map @formFields, (v, k) -> {k: k, v: v}
    _.filter fields, (f) -> !!f.v
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
  extraColumns: ->
    Queues.findOne({name:Session.get('queueName')})?.settings?.extraColumns
  getTicketValue: (c) -> @[c]
