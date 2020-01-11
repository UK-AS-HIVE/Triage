import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Tracker } from "meteor/tracker";

import { moment } from 'meteor/mrt:moment';

export const tickDeps = new Tracker.Dependency();

Meteor.setInterval(function() {
  return tickDeps.changed();
}, 1000);

export function fromNowReactive(date) {
  tickDeps.depend();
  return moment(date).fromNow();
};

Template.timeFromNow.helpers({
  parsedTime: function() {
    return fromNowReactive(this.date);
  },
  fullTime: function() {
    return moment(this.date).format('MMMM Do YYYY, h:mm:ss a');
  }
});

Template.timestampFormatter.helpers({
  formattedTimestamp: function() {
    return moment(this.date).format('lll');
  }
});

Template.dateFormatter.helpers({
  formattedDate: function() {
    return moment(this.date).format('YYYY-MM-DD');
  }
});

