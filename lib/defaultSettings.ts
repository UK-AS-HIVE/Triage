import {Meteor} from 'meteor/meteor';
import _ from 'underscore';

Meteor.startup(function() {
  if (Meteor.settings == null) {
    Meteor.settings = {public: {}}
  }
  return Meteor.settings["public"] = _.extend({
    siteTitle: "Triage",
    reopenAllowedTimespan: 7 * 24 * 60 * 60,
    pageLimitDefault: 20,
    pageLimitIncrement: 20
  }, Meteor.settings["public"]);
});
