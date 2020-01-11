import { Meteor } from "meteor/meteor";

import { TicketFlags, QueueBadgeCounts } from "./collections";

Meteor.methods({
  'setFlag': function(userId, ticketId, k, v) {
    return TicketFlags.upsert({
      userId: userId,
      ticketId: ticketId,
      k: k
    }, {
      $set: {
        v: v
      }
    });
  },
  'removeFlag': function(userId, ticketId, k) {
    return TicketFlags.remove({
      userId: userId,
      ticketId: ticketId,
      k: k
    });
  },
  'clearQueueBadge': function(queueName) {
    return QueueBadgeCounts.update({
      queueName: queueName,
      userId: this.userId
    }, {
      $set: {
        count: 0
      }
    });
  }
});

