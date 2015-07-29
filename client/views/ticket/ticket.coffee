Template.ticket.helpers
  queueMember: ->
    _.contains Queues.findOne({name: @queueName})?.memberIds, Meteor.userId()
  ticket: ->
    ticket = Tickets.findOne {ticketNumber: Session.get('ticketNumber')}
    Session.set 'queueName', ticket?.queueName
    return ticket
  bodyParagraph: ->
    @body.split('\n')
  changelog: ->
    Changelog.find {ticketId: this._id}, {sort: timestamp: 1}

Template.ticket.rendered = () ->
  if Tickets.findOne()
    Meteor.call 'removeFlag', Meteor.userId(), Tickets.findOne()._id, 'unread'
