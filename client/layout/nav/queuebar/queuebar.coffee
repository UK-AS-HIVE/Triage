Template.queuebar.helpers
  queue: ->
    #Use fetch so we get a null result if the user has access to no queues.
    _.map Queues.find({memberIds: Meteor.userId()}).fetch(), (q) ->
      _.extend q, {count: QueueBadgeCounts.findOne({queueName: q.name, userId: Meteor.userId()})?.count}
  active: ->
    if this.name is Session.get("queueName")
      return "active"
    else
      return null
  encodeURIComponent: (s) -> encodeURIComponent s
  globalClass: ->
    if Session.get('pseudoQueue') is 'globalQueue' then return 'active'
  userClass: ->
    if Session.get('pseudoQueue') is 'userQueue' then return 'active'

Template.queuebar.events
  'click a': (e, tpl) ->
    if (e.target.name is Session.get('queueName')) and QueueBadgeCounts.findOne({queueName: Session.get('queueName')}).count > 0
      Meteor.call 'clearQueueBadge', Session.get('queueName')
    if tpl.$('.collapse').hasClass('in') and $(window).width() < 769
      tpl.$('.collapse').collapse('hide')
