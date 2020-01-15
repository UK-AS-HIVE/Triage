Meteor.subscribe 'userData'
Meteor.subscribe 'allUserData'
Meteor.subscribe 'queueNames'
Meteor.subscribe 'tags'
Meteor.subscribe 'queueCounts'
Meteor.subscribe 'statuses'

Meteor.autorun ->
  Meteor.subscribe 'queueDetails', Session.get 'queueName'
