import { Template } from "meteor/templating";
import { Session } from "meteor/session";

import { Queues } from "/lib/collections";

Template.queueSummary.helpers({
  data: function() {
    var d;
    d = Queues.findOne({
      name: Session.get('queueName')
    });
    return d;
  },
  plural: function(count, singular, plural) {
    if (count === 1) {
      return singular;
    } else {
      return plural;
    }
  },
  elapsed: function(s) {
    var days, hours, minutes, months, seconds, weeks;
    minutes = (s / 60) | 0;
    seconds = s - 60 * minutes;
    if (minutes < 60) {
      return minutes + " minutes";
    }
    hours = (minutes / 60) | 0;
    minutes -= 60 * hours;
    if (hours < 24) {
      return hours + ' hours';
    }
    days = (hours / 24) | 0;
    hours -= 24 * days;
    if (days < 7) {
      return days + ' days, ' + hours + ' hours';
    }
    weeks = (days / 7) | 0;
    days -= 7 * weeks;
    if (weeks < 4) {
      return weeks + ' weeks, ' + days + ' days';
    }
    months = (weeks / 4) | 0;
    weeks -= 4 * months;
    return months + ' months, ' + weeks + ' weeks';
  }
});