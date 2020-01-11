import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";

Template.navbar.helpers({
  siteTitle: function() {
    return Meteor.settings["public"].siteTitle;
  }
});

Template.navbar.events({
  'click a[id=logout]': function() {
    return Meteor.logout();
  }
});
