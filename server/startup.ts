import {Meteor} from 'meteor/meteor';

import {Facets} from 'meteor/hive:facets';

import {Queues, Tickets, Changelog, TicketFlags} from '/lib/collections';

Meteor.startup(function() {
  Tickets._ensureIndex({
    "$**": "text"
  });
  Changelog._ensureIndex({
    ticketId: 1
  });
  TicketFlags._ensureIndex({
    ticketId: 1,
    userId: 1
  });
  Meteor.settings.queues.forEach(function(x) {
    return Queues.upsert({
      name: x.name
    }, {
      $set: {
        securityGroups: x.securityGroups,
        settings: x.settings
      }
    });
  });
  Facets._ensureIndex({
    collection: 1,
    facetString: 1
  });
  Facets.configure(Tickets, {
    tags: [String],
    status: String,
    associatedUserIds: [String]
  });
});